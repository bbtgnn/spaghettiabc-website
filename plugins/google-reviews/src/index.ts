import {
	definePlugin,
	definePluginRoute,
	type PluginDescriptor,
	type StorageCollection,
} from "emdash";
import { syncGoogleReviews } from "./business-profile";
import {
	isTruthySetting,
	reviewStorageId,
	type FeaturedResponse,
	type ListResponse,
	type LocationSummary,
	type StoredReview,
	type SyncMeta,
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

async function listFeaturedReviews(
	reviews: StorageCollection<StoredReview>,
): Promise<StoredReview[]> {
	const items: StoredReview[] = [];
	let cursor: string | undefined;
	do {
		const page = await reviews.query({
			where: { featured: true },
			orderBy: { updateTime: "desc" },
			limit: 100,
			cursor,
		});
		items.push(...page.items.map((item) => item.data));
		cursor = page.hasMore ? page.cursor : undefined;
	} while (cursor);
	return items;
}

export function googleReviewsPlugin(): PluginDescriptor {
	return {
		id: PLUGIN_ID,
		version: "1.1.0",
		format: "native",
		entrypoint: "@spaghettiabc/google-reviews",
		adminEntry: "@spaghettiabc/google-reviews/admin",
	};
}

export function createPlugin() {
	return definePlugin({
		id: PLUGIN_ID,
		version: "1.1.0",
		capabilities: ["network:request"],
		allowedHosts: ["oauth2.googleapis.com", "mybusiness.googleapis.com"],
		storage: {
			reviews: {
				indexes: ["accountId", "locationId", "featured", "syncedAt", "updateTime"],
			},
		},
		admin: {
			entry: "@spaghettiabc/google-reviews/admin",
			settingsSchema: {
				oauthClientId: {
					type: "string",
					label: "OAuth Client ID",
					description:
						"Client ID dell’app Google Cloud (OAuth) con accesso Business Profile.",
				},
				oauthClientSecret: {
					type: "secret",
					label: "OAuth Client Secret",
					description: "Client secret dell’app OAuth. Richiede EMDASH_ENCRYPTION_KEY.",
				},
				refreshToken: {
					type: "secret",
					label: "OAuth refresh token",
					description:
						"Refresh token con scope https://www.googleapis.com/auth/business.manage e access_type=offline (es. da OAuth Playground).",
				},
				accountId: {
					type: "string",
					label: "Account ID",
					description:
						"ID account Business Profile (solo numeri, oppure accounts/123).",
				},
				locationId: {
					type: "string",
					label: "Location ID",
					description:
						"ID location verificata (solo id, oppure locations/456). Sync pagina tutte le recensioni.",
				},
				mapsUri: {
					type: "url",
					label: "URL profilo Google Maps",
					description:
						"Link pubblico «Vedi su Google» in homepage (opzionale; GBP non fornisce URL per singola recensione).",
				},
				devMockSync: {
					type: "boolean",
					label: "Dev mock sync",
					description:
						"Se attivo, «Sincronizza ora» carica 12 recensioni fixture (paginazione simulata) senza OAuth/API. Solo per sviluppo: spegni in produzione.",
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
					const [
						meta,
						devMockSync,
						oauthClientId,
						oauthClientSecret,
						refreshToken,
						accountId,
						locationId,
						mapsUri,
						items,
					] = await Promise.all([
						readMeta(ctx.kv),
						ctx.settings.get("devMockSync"),
						ctx.settings.get<string>("oauthClientId"),
						ctx.settings.get<string>("oauthClientSecret"),
						ctx.settings.get<string>("refreshToken"),
						ctx.settings.get<string>("accountId"),
						ctx.settings.get<string>("locationId"),
						ctx.settings.get<string>("mapsUri"),
						listStoredReviews(reviewsStore),
					]);
					return {
						place: meta.place ?? null,
						meta,
						reviews: items.map((item) => item.data),
						configured: {
							devMockSync: isTruthySetting(devMockSync),
							hasClientId: Boolean(oauthClientId?.trim()),
							hasClientSecret: Boolean(oauthClientSecret),
							hasRefreshToken: Boolean(refreshToken),
							accountId: accountId?.trim() || null,
							locationId: locationId?.trim() || null,
							mapsUri: mapsUri?.trim() || null,
						},
					};
				},
			},
			sync: definePluginRoute({
				methods: ["POST"],
				permission: "plugins:manage",
				request: { body: "none" },
				handler: async (ctx) => {
					const devMockSync = isTruthySetting(await ctx.settings.get("devMockSync"));
					if (!devMockSync && !ctx.http) {
						return {
							ok: false,
							error: "HTTP client non disponibile (capability network:request).",
						};
					}
					const reviewsStore = ctx.storage.reviews as StorageCollection<StoredReview>;
					const result = await syncGoogleReviews({
						settings: ctx.settings,
						http: ctx.http ?? {
							fetch: async () => {
								throw new Error("HTTP non disponibile in mock sync");
							},
						},
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
						source: result.source,
					};
				},
			}),
			feature: definePluginRoute({
				methods: ["POST"],
				permission: "plugins:manage",
				request: { body: "json" },
				handler: async (ctx) => {
					const input = ctx.input as { name?: unknown; featured?: unknown } | null;
					const name = typeof input?.name === "string" ? input.name : "";
					const featured = input?.featured === true;
					if (!name) {
						return { ok: false, error: "name mancante" };
					}

					const reviewsStore = ctx.storage.reviews as StorageCollection<StoredReview>;
					const id = reviewStorageId(name);
					const existing = await reviewsStore.get(id);
					if (!existing) {
						return { ok: false, error: "Recensione non trovata. Esegui prima Sync." };
					}

					const next: StoredReview = { ...existing, featured };
					await reviewsStore.put(id, next);
					return { ok: true, review: next };
				},
			}),
			"edit-text": definePluginRoute({
				methods: ["POST"],
				permission: "plugins:manage",
				request: { body: "json" },
				handler: async (ctx) => {
					const input = ctx.input as {
						name?: unknown;
						text?: unknown;
						restore?: unknown;
					} | null;
					const name = typeof input?.name === "string" ? input.name : "";
					if (!name) {
						return { ok: false, error: "name mancante" };
					}

					const reviewsStore = ctx.storage.reviews as StorageCollection<StoredReview>;
					const id = reviewStorageId(name);
					const existing = await reviewsStore.get(id);
					if (!existing) {
						return { ok: false, error: "Recensione non trovata. Esegui prima Sync." };
					}

					const originalText = existing.originalText ?? existing.text ?? "";
					const restore = input?.restore === true;
					const text = restore
						? originalText
						: typeof input?.text === "string"
							? input.text.trim()
							: null;
					if (text === null) {
						return { ok: false, error: "text mancante" };
					}

					const textEdited = text !== originalText;
					const next: StoredReview = {
						...existing,
						originalText,
						text,
						textEdited: textEdited || undefined,
					};
					await reviewsStore.put(id, next);
					return { ok: true, review: next };
				},
			}),
			featured: {
				public: true,
				methods: ["GET"],
				cacheControl: "public, max-age=60, stale-while-revalidate=300",
				handler: async (ctx): Promise<FeaturedResponse> => {
					const reviewsStore = ctx.storage.reviews as StorageCollection<StoredReview>;
					const meta = await readMeta(ctx.kv);
					// Drain all featured pages so admin “Mostra in homepage” matches the home list.
					const reviews = await listFeaturedReviews(reviewsStore);
					return {
						place: (meta.place as LocationSummary | null | undefined) ?? null,
						reviews,
					};
				},
			},
		},
	});
}

export default createPlugin;
