import type { HttpAccess, LogAccess, SettingsAccess, StorageCollection } from "emdash";
import type { PlaceSummary, StoredReview } from "./types";
import { reviewStorageId } from "./types";

type PlacesReview = {
	name?: string;
	rating?: number;
	text?: { text?: string };
	relativePublishTimeDescription?: string;
	publishTime?: string;
	googleMapsUri?: string;
	authorAttribution?: {
		displayName?: string;
		uri?: string;
		photoUri?: string;
	};
};

type PlaceDetailsResponse = {
	id?: string;
	displayName?: { text?: string };
	rating?: number;
	userRatingCount?: number;
	googleMapsUri?: string;
	reviews?: PlacesReview[];
};

export type SyncResult = {
	ok: true;
	place: PlaceSummary;
	upserted: number;
	reviews: StoredReview[];
} | {
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

export async function syncGoogleReviews(deps: SyncDeps): Promise<SyncResult> {
	const apiKey = await deps.settings.get<string>("apiKey");
	const placeId = (await deps.settings.get<string>("placeId"))?.trim();

	if (!apiKey) {
		return { ok: false, error: "Imposta la Google Places API key nelle impostazioni del plugin." };
	}
	if (!placeId) {
		return { ok: false, error: "Imposta il Place ID nelle impostazioni del plugin." };
	}

	const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
	const response = await deps.http.fetch(url, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
			"X-Goog-Api-Key": apiKey,
			"X-Goog-FieldMask":
				"id,displayName,rating,userRatingCount,googleMapsUri,reviews",
		},
	});

	if (!response.ok) {
		const body = await response.text().catch(() => "");
		deps.log.error("Places API request failed", {
			status: response.status,
			body: body.slice(0, 500),
		});
		await deps.kv.set("meta", {
			lastSyncAt: new Date().toISOString(),
			lastSyncError: `Places API ${response.status}`,
			place: null,
			reviewCount: 0,
		});
		return {
			ok: false,
			error: `Places API ha risposto ${response.status}. Controlla API key, Place ID e billing Google.`,
		};
	}

	const data = (await response.json()) as PlaceDetailsResponse;
	const syncedAt = new Date().toISOString();
	const place: PlaceSummary = {
		placeId: data.id ?? placeId,
		displayName: data.displayName?.text,
		rating: data.rating,
		userRatingCount: data.userRatingCount,
		googleMapsUri: data.googleMapsUri,
	};

	const incoming = data.reviews ?? [];
	const upserted: StoredReview[] = [];

	for (const review of incoming) {
		if (!review.name) continue;
		const id = reviewStorageId(review.name);
		const existing = await deps.reviews.get(id);
		const stored: StoredReview = {
			name: review.name,
			placeId: place.placeId,
			rating: Number(review.rating) || 0,
			text: review.text?.text?.trim() ?? "",
			relativePublishTimeDescription: review.relativePublishTimeDescription,
			publishTime: review.publishTime,
			authorName: review.authorAttribution?.displayName?.trim() || "Utente Google",
			authorUri: review.authorAttribution?.uri,
			authorPhotoUri: review.authorAttribution?.photoUri,
			googleMapsUri: review.googleMapsUri,
			featured: existing?.featured ?? false,
			syncedAt,
		};
		await deps.reviews.put(id, stored);
		upserted.push(stored);
	}

	await deps.kv.set("meta", {
		lastSyncAt: syncedAt,
		lastSyncError: null,
		place,
		reviewCount: upserted.length,
	});

	deps.log.info("Synced Google reviews", {
		placeId: place.placeId,
		count: upserted.length,
	});

	return { ok: true, place, upserted: upserted.length, reviews: upserted };
}
