import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	initialReviewCardsState,
	transition,
	type ReviewCardsEvent,
	type ReviewCardsState,
} from "./review-card-machine.ts";
import {
	createSyncPageController,
	patchReviewInList,
	type SyncPageFetch,
} from "./sync-page-controller.ts";
import type { ListResponse, StoredReview } from "./types.ts";

function jsonOk(data: unknown): Response {
	return new Response(JSON.stringify({ success: true, data }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}

function jsonErr(status: number, message: string): Response {
	return new Response(
		JSON.stringify({ success: false, error: { code: "ERR", message } }),
		{ status, headers: { "Content-Type": "application/json" } },
	);
}

function sampleReview(overrides: Partial<StoredReview> = {}): StoredReview {
	return {
		name: "accounts/a/locations/l/reviews/r1",
		reviewId: "r1",
		accountId: "a",
		locationId: "l",
		rating: 5,
		text: "Ottimo",
		originalText: "Ottimo",
		authorName: "Maria",
		featured: false,
		syncedAt: "2026-01-01T00:00:00Z",
		...overrides,
	};
}

function sampleList(reviews: StoredReview[] = [sampleReview()]): ListResponse {
	return {
		place: { accountId: "a", locationId: "l", rating: 4.8, userRatingCount: 10 },
		meta: { lastSyncAt: "2026-01-01T00:00:00Z", reviewCount: reviews.length },
		reviews,
		configured: {
			devMockSync: true,
			hasClientId: true,
			hasClientSecret: true,
			hasRefreshToken: true,
			accountId: "a",
			locationId: "l",
			mapsUri: null,
		},
	};
}

function makeAccept(initial = initialReviewCardsState) {
	let state = initial;
	return {
		get state() {
			return state;
		},
		accept(event: ReviewCardsEvent): ReviewCardsState | null {
			const next = transition(state, event);
			if (next === state) return null;
			state = next;
			return next;
		},
	};
}

describe("patchReviewInList", () => {
	it("patches one review by name", () => {
		const list = sampleList([
			sampleReview({ name: "a", featured: false }),
			sampleReview({ name: "b", featured: false }),
		]);
		const next = patchReviewInList(list, "a", { featured: true });
		assert.equal(next.reviews[0]!.featured, true);
		assert.equal(next.reviews[1]!.featured, false);
		assert.equal(list.reviews[0]!.featured, false);
	});
});

describe("createSyncPageController", () => {
	it("load returns list data", async () => {
		const list = sampleList();
		const fetch: SyncPageFetch = async (input) => {
			assert.match(String(input), /\/list$/);
			return jsonOk(list);
		};
		const controller = createSyncPageController({ fetch });
		const outcome = await controller.load();
		assert.equal(outcome.status, "ok");
		if (outcome.status === "ok") {
			assert.equal(outcome.data.reviews.length, 1);
		}
	});

	it("sync merges reviews and resets edit via accept", async () => {
		const previous = sampleList();
		const synced = sampleList([
			sampleReview({ name: "accounts/a/locations/l/reviews/r2", text: "Nuova" }),
		]);
		const fetch: SyncPageFetch = async (input, init) => {
			assert.match(String(input), /\/sync$/);
			assert.equal(init?.method, "POST");
			return jsonOk({
				ok: true,
				upserted: 1,
				source: "mock",
				reviews: synced.reviews,
				place: synced.place,
				meta: synced.meta,
			});
		};
		const cards = makeAccept(
			transition(initialReviewCardsState, {
				type: "START_EDIT",
				name: previous.reviews[0]!.name,
				text: "draft",
			}),
		);
		assert.equal(cards.state.edit.status, "editing");

		const controller = createSyncPageController({ fetch });
		const outcome = await controller.sync(cards.accept, previous);
		assert.equal(outcome.status, "ok");
		if (outcome.status === "ok") {
			assert.match(outcome.notice, /Sync mock/);
			assert.equal(outcome.data.reviews[0]!.text, "Nuova");
		}
		assert.equal(cards.state.edit.status, "idle");
	});

	it("toggleFeatured rejects illegal machine transition", async () => {
		const review = sampleReview();
		let fetched = false;
		const fetch: SyncPageFetch = async () => {
			fetched = true;
			return jsonOk({});
		};
		const cards = makeAccept(
			transition(initialReviewCardsState, {
				type: "TOGGLE_FEATURE",
				name: "other",
			}),
		);
		const controller = createSyncPageController({ fetch });
		const outcome = await controller.toggleFeatured(review, true, cards.accept);
		assert.equal(outcome.status, "rejected");
		assert.equal(fetched, false);
	});

	it("toggleFeatured patches featured and opens home", async () => {
		const review = sampleReview();
		const fetch: SyncPageFetch = async (input) => {
			assert.match(String(input), /\/feature$/);
			return jsonOk({});
		};
		const cards = makeAccept();
		const controller = createSyncPageController({ fetch });
		const outcome = await controller.toggleFeatured(review, true, cards.accept);
		assert.deepEqual(outcome, {
			status: "ok",
			name: review.name,
			featured: true,
			openHome: true,
		});
		assert.equal(cards.state.pending.status, "idle");
	});

	it("saveText returns patch and notice", async () => {
		const review = sampleReview({ text: "Ottimo", originalText: "Ottimo" });
		const saved = sampleReview({
			text: "Modificato",
			originalText: "Ottimo",
			textEdited: true,
		});
		const fetch: SyncPageFetch = async (input, init) => {
			assert.match(String(input), /\/edit-text$/);
			const body = JSON.parse(String(init?.body));
			assert.equal(body.text, "Modificato");
			return jsonOk({ review: saved });
		};
		const cards = makeAccept(
			transition(initialReviewCardsState, {
				type: "START_EDIT",
				name: review.name,
				text: "Modificato",
			}),
		);
		const controller = createSyncPageController({ fetch });
		const outcome = await controller.saveText(review, cards.accept);
		assert.equal(outcome.status, "ok");
		if (outcome.status === "ok") {
			assert.equal(outcome.notice, "Testo aggiornato.");
			assert.equal(outcome.patch.text, "Modificato");
			assert.equal(outcome.patch.textEdited, true);
		}
		assert.equal(cards.state.edit.status, "idle");
	});

	it("saveText surfaces API errors and restores editing", async () => {
		const review = sampleReview();
		const fetch: SyncPageFetch = async () => jsonErr(500, "salvataggio fallito");
		const cards = makeAccept(
			transition(initialReviewCardsState, {
				type: "START_EDIT",
				name: review.name,
				text: "x",
			}),
		);
		const controller = createSyncPageController({ fetch });
		const outcome = await controller.saveText(review, cards.accept);
		assert.equal(outcome.status, "error");
		if (outcome.status === "error") {
			assert.equal(outcome.message, "salvataggio fallito");
		}
		assert.equal(cards.state.edit.status, "editing");
	});

	it("restoreText restores original text", async () => {
		const review = sampleReview({
			text: "Modificato",
			originalText: "Originale",
			textEdited: true,
		});
		const fetch: SyncPageFetch = async (input, init) => {
			assert.match(String(input), /\/edit-text$/);
			const body = JSON.parse(String(init?.body));
			assert.equal(body.restore, true);
			return jsonOk({
				review: sampleReview({
					text: "Originale",
					originalText: "Originale",
				}),
			});
		};
		const cards = makeAccept();
		const controller = createSyncPageController({ fetch });
		const outcome = await controller.restoreText(review, cards.accept);
		assert.equal(outcome.status, "ok");
		if (outcome.status === "ok") {
			assert.equal(outcome.notice, "Testo originale ripristinato.");
			assert.equal(outcome.patch.text, "Originale");
		}
	});
});
