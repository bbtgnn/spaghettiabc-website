import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { StorageCollection } from "emdash";
import { createReviewsCatalog } from "./reviews-catalog.ts";
import type { StoredReview, SyncMeta } from "./types.ts";

function createMemoryStore(): StorageCollection<StoredReview> {
	const rows = new Map<string, StoredReview>();

	return {
		async get(id) {
			return rows.get(id) ?? null;
		},
		async put(id, data) {
			rows.set(id, data);
		},
		async delete(id) {
			return rows.delete(id);
		},
		async exists(id) {
			return rows.has(id);
		},
		async getVersioned() {
			return null;
		},
		async compareAndSet() {
			return { ok: false as const, current: null };
		},
		async compareAndDelete() {
			return { ok: false as const };
		},
		async getMany(ids) {
			return ids.map((id) => ({ id, data: rows.get(id)! })).filter((x) => x.data);
		},
		async putMany(items) {
			for (const item of items) rows.set(item.id, item.data);
		},
		async deleteMany(ids) {
			let n = 0;
			for (const id of ids) if (rows.delete(id)) n++;
			return n;
		},
		async count(where) {
			if (!where) return rows.size;
			return [...rows.values()].filter((row) =>
				Object.entries(where).every(([k, v]) => (row as Record<string, unknown>)[k] === v),
			).length;
		},
		async updateIf() {
			return { applied: false, data: null };
		},
		async query(options = {}) {
			let items = [...rows.entries()].map(([id, data]) => ({ id, data }));
			if (options.where) {
				items = items.filter((item) =>
					Object.entries(options.where!).every(
						([k, v]) => (item.data as Record<string, unknown>)[k] === v,
					),
				);
			}
			const orderBy = options.orderBy ?? {};
			const [[field, dir] = ["syncedAt", "desc"]] = Object.entries(orderBy);
			items.sort((a, b) => {
				const av = String((a.data as Record<string, unknown>)[field] ?? "");
				const bv = String((b.data as Record<string, unknown>)[field] ?? "");
				return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
			});
			const limit = options.limit ?? 100;
			const start = options.cursor ? Number(options.cursor) : 0;
			const slice = items.slice(start, start + limit);
			const next = start + limit;
			return {
				items: slice,
				cursor: next < items.length ? String(next) : undefined,
				hasMore: next < items.length,
			};
		},
	} as StorageCollection<StoredReview>;
}

function createMemoryKv() {
	const data = new Map<string, unknown>();
	return {
		async get<T>(key: string): Promise<T | null> {
			return (data.get(key) as T | undefined) ?? null;
		},
		async set(key: string, value: unknown) {
			data.set(key, value);
		},
		raw: data,
	};
}

function sampleGbp(name: string, comment: string) {
	return {
		name,
		reviewId: name.split("/").pop()!,
		starRating: "FIVE" as const,
		comment,
		createTime: "2024-01-01T00:00:00.000Z",
		updateTime: "2024-01-02T00:00:00.000Z",
		reviewer: { displayName: "Ada" },
	};
}

describe("ReviewsCatalog.replaceFromSync", () => {
	it("preserves featured and edited display text across sync", async () => {
		const store = createMemoryStore();
		const kv = createMemoryKv();
		const catalog = createReviewsCatalog({ reviews: store, kv });

		const name = "accounts/a/locations/l/reviews/r1";
		await catalog.replaceFromSync({
			reviews: [sampleGbp(name, "Original from Google")],
			place: { accountId: "a", locationId: "l" },
			mapsUri: "https://maps.example",
			source: "mock",
			totalReviewCount: 1,
		});

		await catalog.setFeatured(name, true);
		await catalog.setDisplayText(name, "Edited for homepage");

		await catalog.replaceFromSync({
			reviews: [sampleGbp(name, "Updated from Google")],
			place: { accountId: "a", locationId: "l", rating: 5, userRatingCount: 2 },
			mapsUri: "https://maps.example",
			source: "mock",
			totalReviewCount: 2,
		});

		const [review] = await catalog.listAll();
		assert.equal(review?.featured, true);
		assert.equal(review?.text, "Edited for homepage");
		assert.equal(review?.originalText, "Updated from Google");
		assert.equal(review?.textEdited, true);

		const featured = await catalog.listFeatured();
		assert.equal(featured.length, 1);

		const meta = await catalog.readMeta();
		assert.equal(meta.reviewCount, 1);
		assert.equal(meta.source, "mock");
		assert.equal(meta.lastSyncError, null);
	});

	it("deletes reviews absent from the sync payload", async () => {
		const store = createMemoryStore();
		const kv = createMemoryKv();
		const catalog = createReviewsCatalog({ reviews: store, kv });

		const keep = "accounts/a/locations/l/reviews/keep";
		const drop = "accounts/a/locations/l/reviews/drop";
		await catalog.replaceFromSync({
			reviews: [sampleGbp(keep, "keep"), sampleGbp(drop, "drop")],
			place: { accountId: "a", locationId: "l" },
			source: "live",
		});
		assert.equal((await catalog.listAll()).length, 2);

		await catalog.replaceFromSync({
			reviews: [sampleGbp(keep, "keep")],
			place: { accountId: "a", locationId: "l" },
			source: "live",
		});
		const left = await catalog.listAll();
		assert.equal(left.length, 1);
		assert.equal(left[0]?.name, keep);
	});
});

describe("ReviewsCatalog text mutations", () => {
	it("setDisplayText / restoreText round-trip", async () => {
		const store = createMemoryStore();
		const kv = createMemoryKv();
		const catalog = createReviewsCatalog({ reviews: store, kv });
		const name = "accounts/a/locations/l/reviews/r2";

		await catalog.replaceFromSync({
			reviews: [sampleGbp(name, "Google text")],
			place: { accountId: "a", locationId: "l" },
			source: "mock",
		});

		const edited = await catalog.setDisplayText(name, "  Custom  ");
		assert.equal(edited.ok, true);
		if (edited.ok) {
			assert.equal(edited.review.text, "Custom");
			assert.equal(edited.review.textEdited, true);
		}

		const restored = await catalog.restoreText(name);
		assert.equal(restored.ok, true);
		if (restored.ok) {
			assert.equal(restored.review.text, "Google text");
			assert.equal(restored.review.textEdited, undefined);
		}
	});

	it("returns not-found for unknown review names", async () => {
		const catalog = createReviewsCatalog({
			reviews: createMemoryStore(),
			kv: createMemoryKv(),
		});
		const result = await catalog.setFeatured("missing", true);
		assert.deepEqual(result, {
			ok: false,
			error: "Recensione non trovata. Esegui prima Sync.",
		});
	});
});

describe("ReviewsCatalog.recordSyncFailure", () => {
	it("writes lastSyncError meta", async () => {
		const kv = createMemoryKv();
		const catalog = createReviewsCatalog({
			reviews: createMemoryStore(),
			kv,
		});
		await catalog.recordSyncFailure("boom", "live");
		const meta = (await kv.get<SyncMeta>("meta"))!;
		assert.equal(meta.lastSyncError, "boom");
		assert.equal(meta.source, "live");
		assert.equal(meta.place, null);
	});
});
