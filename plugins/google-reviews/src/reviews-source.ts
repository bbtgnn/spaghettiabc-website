import type { HttpAccess, LogAccess, SettingsAccess } from "emdash";
import {
	MOCK_ACCOUNT_ID,
	MOCK_AVERAGE_RATING,
	MOCK_LOCATION_ID,
	MOCK_MAPS_URI,
	MOCK_TOTAL_REVIEW_COUNT,
	mockReviewPages,
	type MockGbpReview,
} from "./mock-data.ts";
import {
	isTruthySetting,
	locationParent,
	normalizeAccountId,
	normalizeLocationId,
} from "./types.ts";

export type GbpReviewLike = {
	name?: string;
	reviewId?: string;
	starRating?: string;
	comment?: string;
	createTime?: string;
	updateTime?: string;
	reviewer?: {
		displayName?: string;
		profilePhotoUrl?: string;
		isAnonymous?: boolean;
	};
};

export type ReviewsListResult = {
	reviews: GbpReviewLike[];
	averageRating: number;
	totalReviewCount: number;
};

export type ReviewsSource = {
	kind: "live" | "mock";
	listAll(): Promise<ReviewsListResult>;
};

/** Place fields known before listAll; ratings filled after. */
export type ReviewsSourceContext = {
	accountId: string;
	locationId: string;
	mapsUri?: string;
};

export type ResolveReviewsSourceResult =
	| {
			ok: true;
			source: ReviewsSource;
			context: ReviewsSourceContext;
	  }
	| {
			ok: false;
			error: string;
			/** True when OAuth already ran and failed (admin should see lastSyncError). */
			recordFailure?: boolean;
	  };

type ListReviewsResponse = {
	reviews?: GbpReviewLike[];
	averageRating?: number;
	totalReviewCount?: number;
	nextPageToken?: string;
};

type TokenResponse = {
	access_token?: string;
	error?: string;
	error_description?: string;
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

export function createMockReviewsSource(log?: LogAccess): ReviewsSource {
	return {
		kind: "mock",
		async listAll() {
			const pages = mockReviewPages();
			const collected: GbpReviewLike[] = [];

			for (let i = 0; i < pages.length; i++) {
				// Small delay so admin “Sync in corso…” is visible and feels like network I/O.
				await new Promise((resolve) => setTimeout(resolve, 120));
				const page = pages[i] ?? [];
				collected.push(...(page as MockGbpReview[]));
				log?.info("Mock Business Profile reviews page", {
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
		},
	};
}

export function createLiveGbpSource(
	http: HttpAccess,
	accessToken: string,
	parent: string,
): ReviewsSource {
	return {
		kind: "live",
		async listAll() {
			const collected: GbpReviewLike[] = [];
			let pageToken: string | undefined;
			let averageRating = 0;
			let totalReviewCount = 0;

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
					throw new LiveGbpListError(
						`Business Profile API ha risposto ${response.status}`,
						response.status,
						body.slice(0, 500),
					);
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

			return { reviews: collected, averageRating, totalReviewCount };
		},
	};
}

export class LiveGbpListError extends Error {
	readonly status?: number;
	readonly body?: string;

	constructor(message: string, status?: number, body?: string) {
		super(message);
		this.name = "LiveGbpListError";
		this.status = status;
		this.body = body;
	}
}

/**
 * Pick mock or live adapter from settings. Live path refreshes OAuth once.
 */
export async function resolveReviewsSource(deps: {
	settings: SettingsAccess;
	http: HttpAccess;
	log: LogAccess;
}): Promise<ResolveReviewsSourceResult> {
	const mapsUriSetting =
		(await deps.settings.get<string>("mapsUri"))?.trim() || undefined;
	const devMockSync = isTruthySetting(await deps.settings.get("devMockSync"));

	if (devMockSync) {
		return {
			ok: true,
			source: createMockReviewsSource(deps.log),
			context: {
				accountId: MOCK_ACCOUNT_ID,
				locationId: MOCK_LOCATION_ID,
				mapsUri: mapsUriSetting || MOCK_MAPS_URI,
			},
		};
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
		return { ok: false, error: token.error, recordFailure: true };
	}

	return {
		ok: true,
		source: createLiveGbpSource(deps.http, token.accessToken, parent),
		context: {
			accountId,
			locationId,
			mapsUri: mapsUriSetting,
		},
	};
}
