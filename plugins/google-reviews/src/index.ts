import {
	definePlugin,
	definePluginRoute,
	type LogAccess,
	type PluginDescriptor,
	type StorageCollection,
} from "emdash";
import { syncGoogleReviews } from "./business-profile.ts";
import { createReviewsCatalog } from "./reviews-catalog.ts";
import {
	isTruthySetting,
	type FeaturedResponse,
	type ListResponse,
	type LocationSummary,
	type StoredReview,
} from "./types.ts";

const PLUGIN_ID = "google-reviews";

function catalogFrom(ctx: {
	storage: { reviews: StorageCollection<unknown> };
	kv: {
		get<T>(key: string): Promise<T | null>;
		set(key: string, value: unknown): Promise<void>;
	};
	log?: LogAccess;
}) {
	return createReviewsCatalog({
		reviews: ctx.storage.reviews as StorageCollection<StoredReview>,
		kv: ctx.kv,
		log: ctx.log,
	});
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
						"Client ID dell’app Google Cloud (OAuth) con accesso Business Profile. Guida: plugins/google-reviews/SETUP.md.",
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
					const catalog = catalogFrom(ctx);
					const [
						meta,
						devMockSync,
						oauthClientId,
						oauthClientSecret,
						refreshToken,
						accountId,
						locationId,
						mapsUri,
						reviews,
					] = await Promise.all([
						catalog.readMeta(),
						ctx.settings.get("devMockSync"),
						ctx.settings.get<string>("oauthClientId"),
						ctx.settings.get<string>("oauthClientSecret"),
						ctx.settings.get<string>("refreshToken"),
						ctx.settings.get<string>("accountId"),
						ctx.settings.get<string>("locationId"),
						ctx.settings.get<string>("mapsUri"),
						catalog.listAll(),
					]);
					return {
						place: meta.place ?? null,
						meta,
						reviews,
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
					const catalog = catalogFrom(ctx);
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
						catalog,
					});
					if (!result.ok) return result;

					const [reviews, meta] = await Promise.all([
						catalog.listAll(),
						catalog.readMeta(),
					]);
					return {
						ok: true,
						upserted: result.upserted,
						place: result.place,
						meta,
						reviews,
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
					return catalogFrom(ctx).setFeatured(name, featured);
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
					const catalog = catalogFrom(ctx);
					if (input?.restore === true) {
						return catalog.restoreText(name);
					}
					if (typeof input?.text !== "string") {
						return { ok: false, error: "text mancante" };
					}
					return catalog.setDisplayText(name, input.text);
				},
			}),
			featured: {
				public: true,
				methods: ["GET"],
				cacheControl: "public, max-age=60, stale-while-revalidate=300",
				handler: async (ctx): Promise<FeaturedResponse> => {
					const catalog = catalogFrom(ctx);
					const [meta, reviews] = await Promise.all([
						catalog.readMeta(),
						catalog.listFeatured(),
					]);
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
