import type { HttpAccess, LogAccess, SettingsAccess, StorageCollection } from "emdash";
import type { LocationSummary, StoredReview } from "./types";
import {
	isTruthySetting,
	locationParent,
	normalizeAccountId,
	normalizeLocationId,
	reviewStorageId,
	starRatingToNumber,
} from "./types";
import {
	MOCK_ACCOUNT_ID,
	MOCK_AVERAGE_RATING,
	MOCK_LOCATION_ID,
	MOCK_MAPS_URI,
	MOCK_TOTAL_REVIEW_COUNT,
	mockReviewPages,
	type MockGbpReview,
} from "./mock-data";

type GbpReviewer = {
	displayName?: string;
	profilePhotoUrl?: string;
	isAnonymous?: boolean;
};

type GbpReview = {
	name?: string;
	reviewId?: string;
	starRating?: string;
	comment?: string;
	createTime?: string;
	updateTime?: string;
	reviewer?: GbpReviewer;
};

type ListReviewsResponse = {
	reviews?: GbpReview[];
	averageRating?: number;
	totalReviewCount?: number;
	nextPageToken?: string;
};

type TokenResponse = {
	access_token?: string;
	error?: string;
	error_description?: string;
};

export type SyncResult =
	| {
			ok: true;
			place: LocationSummary;
			upserted: number;
			reviews: StoredReview[];
			source: "live" | "mock";
	  }
	| {
			ok: false;
			error: string;
	  };

type SyncDeps = {
	settings: SettingsAccess;
	http: HttpAccess;
	log: LogAccess;
	reviews: StorageCollection<StoredReview>;
	kv: {
		get<T>(key: string): Promise<T | null>;
		set(key: string, value: unknown): Promise<void>;
	};
};

async function getAccessToken(
	http: HttpAccess,
	clientId: string,
	clientSecret: string,
	refreshToken: string,
): Promise<{ ok: true; accessToken: string } | { ok: false; error: string }> {
	const body = new URLSearchParams({
		client_id: clientId,
		client_secret: clientSecret,
		refresh_token: refreshToken,
		grant_type: "refresh_token",
	});

	const response = await http.fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: body.toString(),
	});

	const data = (await response.json().catch(() => ({}))) as TokenResponse;
	if (!response.ok || !data.access_token) {
		const detail =
			data.error_description || data.error || `HTTP ${response.status}`;
		return {
			ok: false,
			error: `OAuth refresh fallito: ${detail}. Controlla client ID/secret e refresh token.`,
		};
	}
	return { ok: true, accessToken: data.access_token };
}

async function fetchAllReviews(
	http: HttpAccess,
	accessToken: string,
	parent: string,
): Promise<
	| {
			ok: true;
			reviews: GbpReview[];
			averageRating?: number;
			totalReviewCount?: number;
	  }
	| { ok: false; error: string; status?: number; body?: string }
> {
	const collected: GbpReview[] = [];
	let pageToken: string | undefined;
	let averageRating: number | undefined;
	let totalReviewCount: number | undefined;

	do {
		const url = new URL(
			`https://mybusiness.googleapis.com/v4/${parent}/reviews`,
		);
		url.searchParams.set("pageSize", "50");
		url.searchParams.set("orderBy", "updateTime desc");
		if (pageToken) url.searchParams.set("pageToken", pageToken);

		const response = await http.fetch(url.toString(), {
			method: "GET",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				Accept: "application/json",
			},
		});

		if (!response.ok) {
			const body = await response.text().catch(() => "");
			return {
				ok: false,
				error: `Business Profile API ha risposto ${response.status}`,
				status: response.status,
				body: body.slice(0, 500),
			};
		}

		const data = (await response.json()) as ListReviewsResponse;
		if (typeof data.averageRating === "number") {
			averageRating = data.averageRating;
		}
		if (typeof data.totalReviewCount === "number") {
			totalReviewCount = data.totalReviewCount;
		}
		collected.push(...(data.reviews ?? []));
		pageToken = data.nextPageToken || undefined;
	} while (pageToken);

	return { ok: true, reviews: collected, averageRating, totalReviewCount };
}

/** Same pagination loop as live, but over fixtures (pageSize 5 → multiple pages). */
async function fetchAllMockReviews(
	log: LogAccess,
): Promise<{
	reviews: GbpReview[];
	averageRating: number;
	totalReviewCount: number;
}> {
	const pages = mockReviewPages();
	const collected: GbpReview[] = [];

	for (let i = 0; i < pages.length; i++) {
		// Small delay so admin “Sync in corso…” is visible and feels like network I/O.
		await new Promise((resolve) => setTimeout(resolve, 120));
		const page = pages[i] ?? [];
		collected.push(...(page as MockGbpReview[]));
		log.info("Mock Business Profile reviews page", {
			page: i + 1,
			pages: pages.length,
			pageSize: page.length,
		});
	}

	return {
		reviews: collected,
		averageRating: MOCK_AVERAGE_RATING,
		totalReviewCount: MOCK_TOTAL_REVIEW_COUNT,
	};
}

async function listAllStored(
	reviews: StorageCollection<StoredReview>,
): Promise<Array<{ id: string; data: StoredReview }>> {
	const items: Array<{ id: string; data: StoredReview }> = [];
	let cursor: string | undefined;
	do {
		const page = await reviews.query({
			orderBy: { syncedAt: "desc" },
			limit: 100,
			cursor,
		});
		items.push(...page.items);
		cursor = page.hasMore ? page.cursor : undefined;
	} while (cursor);
	return items;
}

async function persistReviews(
	deps: SyncDeps,
	listed: {
		reviews: GbpReview[];
		averageRating?: number;
		totalReviewCount?: number;
	},
	place: LocationSummary,
	mapsUri: string | undefined,
	source: "live" | "mock",
): Promise<SyncResult> {
	const syncedAt = new Date().toISOString();
	const upserted: StoredReview[] = [];
	const keepIds = new Set<string>();

	for (const review of listed.reviews) {
		if (!review.name) continue;
		const id = reviewStorageId(review.name);
		keepIds.add(id);
		const existing = await deps.reviews.get(id);
		const anonymous = review.reviewer?.isAnonymous === true;
		const originalText = (review.comment ?? "").trim();
		// Migrate rows missing originalText: treat prior text as the old original.
		const priorOriginal = existing?.originalText ?? existing?.text ?? "";
		const wasEdited = Boolean(
			existing &&
				(existing.textEdited === true || existing.text !== priorOriginal),
		);
		const text = wasEdited && existing ? existing.text : originalText;
		const textEdited = text !== originalText;
		const stored: StoredReview = {
			name: review.name,
			reviewId: review.reviewId ?? id,
			accountId: place.accountId,
			locationId: place.locationId,
			rating: starRatingToNumber(review.starRating),
			text,
			originalText,
			textEdited: textEdited || undefined,
			createTime: review.createTime,
			updateTime: review.updateTime,
			authorName: anonymous
				? "Utente Google"
				: review.reviewer?.displayName?.trim() || "Utente Google",
			authorPhotoUri: anonymous ? undefined : review.reviewer?.profilePhotoUrl,
			mapsUri,
			featured: existing?.featured ?? false,
			syncedAt,
		};
		await deps.reviews.put(id, stored);
		upserted.push(stored);
	}

	const existing = await listAllStored(deps.reviews);
	for (const item of existing) {
		if (!keepIds.has(item.id)) {
			await deps.reviews.delete(item.id);
		}
	}

	await deps.kv.set("meta", {
		lastSyncAt: syncedAt,
		lastSyncError: null,
		place,
		reviewCount: upserted.length,
		source,
	});

	deps.log.info("Synced Google reviews", {
		source,
		accountId: place.accountId,
		locationId: place.locationId,
		count: upserted.length,
		totalReviewCount: listed.totalReviewCount,
	});

	return { ok: true, place, upserted: upserted.length, reviews: upserted, source };
}

export async function syncGoogleReviews(deps: SyncDeps): Promise<SyncResult> {
	const devMockSync = isTruthySetting(await deps.settings.get("devMockSync"));
	const mapsUriSetting =
		(await deps.settings.get<string>("mapsUri"))?.trim() || undefined;

	if (devMockSync) {
		const listed = await fetchAllMockReviews(deps.log);
		const mapsUri = mapsUriSetting || MOCK_MAPS_URI;
		const place: LocationSummary = {
			accountId: MOCK_ACCOUNT_ID,
			locationId: MOCK_LOCATION_ID,
			rating: listed.averageRating,
			userRatingCount: listed.totalReviewCount,
			googleMapsUri: mapsUri,
		};
		return persistReviews(deps, listed, place, mapsUri, "mock");
	}

	const clientId = (await deps.settings.get<string>("oauthClientId"))?.trim();
	const clientSecret = await deps.settings.get<string>("oauthClientSecret");
	const refreshToken = await deps.settings.get<string>("refreshToken");
	const accountIdRaw = (await deps.settings.get<string>("accountId"))?.trim();
	const locationIdRaw = (await deps.settings.get<string>("locationId"))?.trim();

	if (!clientId) {
		return { ok: false, error: "Imposta OAuth Client ID nelle impostazioni del plugin." };
	}
	if (!clientSecret) {
		return {
			ok: false,
			error: "Imposta OAuth Client Secret nelle impostazioni del plugin.",
		};
	}
	if (!refreshToken) {
		return {
			ok: false,
			error:
				"Imposta il refresh token OAuth (scope business.manage, access_type=offline).",
		};
	}
	if (!accountIdRaw) {
		return { ok: false, error: "Imposta Account ID del Business Profile." };
	}
	if (!locationIdRaw) {
		return { ok: false, error: "Imposta Location ID del Business Profile." };
	}

	const accountId = normalizeAccountId(accountIdRaw);
	const locationId = normalizeLocationId(locationIdRaw);
	const parent = locationParent(accountId, locationId);

	const token = await getAccessToken(
		deps.http,
		clientId,
		clientSecret,
		refreshToken,
	);
	if (!token.ok) {
		await deps.kv.set("meta", {
			lastSyncAt: new Date().toISOString(),
			lastSyncError: token.error,
			place: null,
			reviewCount: 0,
			source: "live",
		});
		return token;
	}

	const listed = await fetchAllReviews(deps.http, token.accessToken, parent);
	if (!listed.ok) {
		deps.log.error("Business Profile reviews.list failed", {
			status: listed.status,
			body: listed.body,
			parent,
		});
		await deps.kv.set("meta", {
			lastSyncAt: new Date().toISOString(),
			lastSyncError: listed.error,
			place: null,
			reviewCount: 0,
			source: "live",
		});
		return {
			ok: false,
			error: `${listed.error}. Controlla Account/Location ID, OAuth e accesso API Business Profile.`,
		};
	}

	const place: LocationSummary = {
		accountId,
		locationId,
		rating: listed.averageRating,
		userRatingCount: listed.totalReviewCount,
		googleMapsUri: mapsUriSetting,
	};

	return persistReviews(deps, listed, place, mapsUriSetting, "live");
}
