import type { LogAccess, StorageCollection } from "emdash";
import type { GbpReviewLike } from "./reviews-source.ts";
import {
	reviewStorageId,
	starRatingToNumber,
	type LocationSummary,
	type StoredReview,
	type SyncMeta,
} from "./types.ts";

type KvAccess = {
	get<T>(key: string): Promise<T | null>;
	set(key: string, value: unknown): Promise<void>;
};

export type CatalogMutationResult =
	| { ok: true; review: StoredReview }
	| { ok: false; error: string };

export type ReplaceFromSyncInput = {
	reviews: GbpReviewLike[];
	place: LocationSummary;
	mapsUri?: string;
	source: "live" | "mock";
	totalReviewCount?: number;
};

export type ReplaceFromSyncResult = {
	upserted: number;
	reviews: StoredReview[];
};

export type ReviewsCatalog = {
	listAll(): Promise<StoredReview[]>;
	listFeatured(): Promise<StoredReview[]>;
	readMeta(): Promise<SyncMeta>;
	setFeatured(name: string, featured: boolean): Promise<CatalogMutationResult>;
	setDisplayText(name: string, text: string): Promise<CatalogMutationResult>;
	restoreText(name: string): Promise<CatalogMutationResult>;
	replaceFromSync(input: ReplaceFromSyncInput): Promise<ReplaceFromSyncResult>;
	recordSyncFailure(error: string, source: "live" | "mock"): Promise<void>;
};

type CatalogDeps = {
	reviews: StorageCollection<StoredReview>;
	kv: KvAccess;
	log?: LogAccess;
};

async function queryAll(
	reviews: StorageCollection<StoredReview>,
	options: {
		where?: Record<string, unknown>;
		orderBy: Record<string, "asc" | "desc">;
	},
): Promise<Array<{ id: string; data: StoredReview }>> {
	const items: Array<{ id: string; data: StoredReview }> = [];
	let cursor: string | undefined;
	do {
		const page = await reviews.query({
			...options,
			limit: 100,
			cursor,
		});
		items.push(...page.items);
		cursor = page.hasMore ? page.cursor : undefined;
	} while (cursor);
	return items;
}

function applyDisplayText(
	existing: StoredReview,
	text: string,
): StoredReview {
	const originalText = existing.originalText ?? existing.text ?? "";
	const textEdited = text !== originalText;
	return {
		...existing,
		originalText,
		text,
		textEdited: textEdited || undefined,
	};
}

export function createReviewsCatalog(deps: CatalogDeps): ReviewsCatalog {
	const { reviews, kv, log } = deps;

	return {
		async listAll() {
			const items = await queryAll(reviews, {
				orderBy: { syncedAt: "desc" },
			});
			return items.map((item) => item.data);
		},

		async listFeatured() {
			const items = await queryAll(reviews, {
				where: { featured: true },
				orderBy: { updateTime: "desc" },
			});
			return items.map((item) => item.data);
		},

		async readMeta() {
			return (await kv.get<SyncMeta>("meta")) ?? {};
		},

		async setFeatured(name, featured) {
			if (!name) return { ok: false, error: "name mancante" };
			const id = reviewStorageId(name);
			const existing = await reviews.get(id);
			if (!existing) {
				return { ok: false, error: "Recensione non trovata. Esegui prima Sync." };
			}
			const next: StoredReview = { ...existing, featured };
			await reviews.put(id, next);
			return { ok: true, review: next };
		},

		async setDisplayText(name, text) {
			if (!name) return { ok: false, error: "name mancante" };
			const id = reviewStorageId(name);
			const existing = await reviews.get(id);
			if (!existing) {
				return { ok: false, error: "Recensione non trovata. Esegui prima Sync." };
			}
			const next = applyDisplayText(existing, text.trim());
			await reviews.put(id, next);
			return { ok: true, review: next };
		},

		async restoreText(name) {
			if (!name) return { ok: false, error: "name mancante" };
			const id = reviewStorageId(name);
			const existing = await reviews.get(id);
			if (!existing) {
				return { ok: false, error: "Recensione non trovata. Esegui prima Sync." };
			}
			const originalText = existing.originalText ?? existing.text ?? "";
			const next = applyDisplayText(existing, originalText);
			await reviews.put(id, next);
			return { ok: true, review: next };
		},

		async replaceFromSync(input) {
			const syncedAt = new Date().toISOString();
			const upserted: StoredReview[] = [];
			const keepIds = new Set<string>();

			for (const review of input.reviews) {
				if (!review.name) continue;
				const id = reviewStorageId(review.name);
				keepIds.add(id);
				const existing = await reviews.get(id);
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
					accountId: input.place.accountId,
					locationId: input.place.locationId,
					rating: starRatingToNumber(review.starRating),
					text,
					originalText,
					textEdited: textEdited || undefined,
					createTime: review.createTime,
					updateTime: review.updateTime,
					authorName: anonymous
						? "Utente Google"
						: review.reviewer?.displayName?.trim() || "Utente Google",
					authorPhotoUri: anonymous
						? undefined
						: review.reviewer?.profilePhotoUrl,
					mapsUri: input.mapsUri,
					featured: existing?.featured ?? false,
					syncedAt,
				};
				await reviews.put(id, stored);
				upserted.push(stored);
			}

			const existing = await queryAll(reviews, {
				orderBy: { syncedAt: "desc" },
			});
			for (const item of existing) {
				if (!keepIds.has(item.id)) {
					await reviews.delete(item.id);
				}
			}

			await kv.set("meta", {
				lastSyncAt: syncedAt,
				lastSyncError: null,
				place: input.place,
				reviewCount: upserted.length,
				source: input.source,
			} satisfies SyncMeta);

			log?.info("Synced Google reviews", {
				source: input.source,
				accountId: input.place.accountId,
				locationId: input.place.locationId,
				count: upserted.length,
				totalReviewCount: input.totalReviewCount,
			});

			return { upserted: upserted.length, reviews: upserted };
		},

		async recordSyncFailure(error, source) {
			await kv.set("meta", {
				lastSyncAt: new Date().toISOString(),
				lastSyncError: error,
				place: null,
				reviewCount: 0,
				source,
			} satisfies SyncMeta);
		},
	};
}
