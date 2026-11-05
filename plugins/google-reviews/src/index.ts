import { definePlugin, type PluginDescriptor, type StorageCollection } from "emdash";
import { syncGoogleReviews } from "./places";
import type {
	FeaturedResponse,
	ListResponse,
	PlaceSummary,
	StoredReview,
	SyncMeta,
} from "./types";

const PLUGIN_ID = "google-reviews";

async function readMeta(kv: {
	get<T>(key: string): Promise<T | null>;
}): Promise<SyncMeta> {
	return (await kv.get<SyncMeta>("meta")) ?? {};
}

async function listStoredReviews(
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

export function googleReviewsPlugin(): PluginDescriptor {
	return {
		id: PLUGIN_ID,
		version: "1.0.0",
		entrypoint: "@spaghettiabc/google-reviews",
		adminEntry: "@spaghettiabc/google-reviews/admin",
	};
}

export function createPlugin() {
	return definePlugin({
		id: PLUGIN_ID,
		version: "1.0.0",
		capabilities: ["network:request"],
		allowedHosts: ["places.googleapis.com"],
		storage: {
			reviews: {
				indexes: ["placeId", "featured", "syncedAt", "publishTime"],
			},
		},
		admin: {
			entry: "@spaghettiabc/google-reviews/admin",
			settingsSchema: {
				apiKey: {
					type: "secret",
					label: "Google Places API key",
					description:
						"Chiave API di Google Maps Platform con Places API (New) abilitata. Serve billing Google attivo.",
				},
				placeId: {
					type: "string",
					label: "Place ID",
					description:
						"Place ID dell’attività Spaghetti ABC su Google Maps (es. ChIJ…). Max 5 recensioni per sync.",
				},
			},
			pages: [
				{
					path: "/sync",
					label: "Recensioni Google",
					icon: "star",
					group: "Content",
				},
			],
		},
		routes: {
			list: {
				methods: ["GET"],
				permission: "plugins:manage",
				handler: async (ctx): Promise<ListResponse> => {
					const reviewsStore = ctx.storage.reviews as StorageCollection<StoredReview>;
					const [meta, apiKey, placeId, items] = await Promise.all([
						readMeta(ctx.kv),
						ctx.settings.get<string>("apiKey"),
						ctx.settings.get<string>("placeId"),
						listStoredReviews(reviewsStore),
					]);
					return {
						place: meta.place ?? null,
						meta,
						reviews: items.map((item) => item.data),
						configured: {
							hasApiKey: Boolean(apiKey),
							placeId: placeId?.trim() || null,
						},
					};
				},
			},
			sync: {
				methods: ["POST"],
				permission: "plugins:manage",
				handler: async (ctx) => {
					if (!ctx.http) {
						return { ok: false, error: "HTTP client non disponibile (capability network:request)." };
					}
					const reviewsStore = ctx.storage.reviews as StorageCollection<StoredReview>;
					const result = await syncGoogleReviews({
						settings: ctx.settings,
						http: ctx.http,
						log: ctx.log,
						reviews: reviewsStore,
						kv: ctx.kv,
					});
					if (!result.ok) return result;

					const items = await listStoredReviews(reviewsStore);
					const meta = await readMeta(ctx.kv);
					return {
						ok: true,
						upserted: result.upserted,
						place: result.place,
						meta,
						reviews: items.map((item) => item.data),
					};
				},
			},
			feature: {
				methods: ["POST"],
				permission: "plugins:manage",
				handler: async (ctx) => {
					const input = ctx.input as { name?: unknown; featured?: unknown } | null;
					const name = typeof input?.name === "string" ? input.name : "";
					const featured = input?.featured === true;
					if (!name) {
						return { ok: false, error: "name mancante" };
					}

					const reviewsStore = ctx.storage.reviews as StorageCollection<StoredReview>;
					const items = await listStoredReviews(reviewsStore);
					const match = items.find((item) => item.data.name === name);
					if (!match) {
						return { ok: false, error: "Recensione non trovata. Esegui prima Sync." };
					}

					const next: StoredReview = { ...match.data, featured };
					await reviewsStore.put(match.id, next);
					return { ok: true, review: next };
				},
			},
			featured: {
				public: true,
				methods: ["GET"],
				cacheControl: "public, max-age=60, stale-while-revalidate=300",
				handler: async (ctx): Promise<FeaturedResponse> => {
					const reviewsStore = ctx.storage.reviews as StorageCollection<StoredReview>;
					const meta = await readMeta(ctx.kv);
					const page = await reviewsStore.query({
						where: { featured: true },
						orderBy: { publishTime: "desc" },
						limit: 20,
					});
					const reviews = page.items
						.map((item) => item.data)
						.filter((review) => review.text.length > 0);
					return {
						place: (meta.place as PlaceSummary | null | undefined) ?? null,
						reviews,
					};
				},
			},
		},
	});
}

export default createPlugin;
