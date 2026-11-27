import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	getCardMode,
	getDraftText,
	initialReviewCardsState,
	isCardBusy,
	isMutateLocked,
	transition,
	type ReviewCardsState,
} from "./review-card-machine.ts";

function editing(
	name: string,
	draftText: string,
	base: ReviewCardsState = initialReviewCardsState,
): ReviewCardsState {
	return {
		...base,
		edit: { status: "editing", name, draftText },
	};
}

function saving(
	name: string,
	draftText: string,
	epoch: number,
	base: ReviewCardsState = initialReviewCardsState,
): ReviewCardsState {
	return {
		...base,
		saveEpoch: epoch,
		edit: { status: "saving", name, draftText, epoch },
	};
}

describe("transition happy paths", () => {
	it("START_EDIT → DRAFT_CHANGE → SAVE → SAVE_OK", () => {
		let state = transition(initialReviewCardsState, {
			type: "START_EDIT",
			name: "a",
			text: "hello",
		});
		assert.deepEqual(state.edit, {
			status: "editing",
			name: "a",
			draftText: "hello",
		});

		state = transition(state, { type: "DRAFT_CHANGE", text: "hello!" });
		assert.equal(
			state.edit.status === "editing" ? state.edit.draftText : null,
			"hello!",
		);

		state = transition(state, { type: "SAVE" });
		assert.equal(state.edit.status, "saving");
		assert.equal(state.saveEpoch, 1);
		assert.ok(state.edit.status === "saving" && state.edit.epoch === 1);

		state = transition(state, { type: "SAVE_OK", epoch: 1 });
		assert.deepEqual(state.edit, { status: "idle" });
		assert.equal(state.saveEpoch, 1);
	});

	it("CANCEL_EDIT returns to idle", () => {
		const state = transition(editing("a", "x"), { type: "CANCEL_EDIT" });
		assert.deepEqual(state.edit, { status: "idle" });
	});

	it("RESTORE cycle", () => {
		let state = transition(initialReviewCardsState, {
			type: "RESTORE",
			name: "a",
		});
		assert.deepEqual(state.pending, { status: "restoring", name: "a" });
		state = transition(state, { type: "RESTORE_OK" });
		assert.deepEqual(state.pending, { status: "idle" });
	});

	it("FEATURE cycle", () => {
		let state = transition(initialReviewCardsState, {
			type: "TOGGLE_FEATURE",
			name: "a",
		});
		assert.deepEqual(state.pending, { status: "featuring", name: "a" });
		state = transition(state, { type: "FEATURE_OK" });
		assert.deepEqual(state.pending, { status: "idle" });

		state = transition(state, { type: "TOGGLE_FEATURE", name: "b" });
		state = transition(state, { type: "FEATURE_ERR" });
		assert.deepEqual(state.pending, { status: "idle" });
	});
});

describe("illegal no-ops", () => {
	it("SAVE when idle returns same ref", () => {
		const state = initialReviewCardsState;
		assert.equal(transition(state, { type: "SAVE" }), state);
	});

	it("TOGGLE_FEATURE while pending returns same ref", () => {
		const pending: ReviewCardsState = {
			...initialReviewCardsState,
			pending: { status: "featuring", name: "a" },
		};
		assert.equal(
			transition(pending, { type: "TOGGLE_FEATURE", name: "b" }),
			pending,
		);
		assert.equal(
			transition(pending, { type: "RESTORE", name: "b" }),
			pending,
		);
	});

	it("START_EDIT while saving returns same ref", () => {
		const state = saving("a", "x", 1);
		assert.equal(
			transition(state, { type: "START_EDIT", name: "b", text: "y" }),
			state,
		);
	});

	it("START_EDIT while that card is pending returns same ref", () => {
		const state: ReviewCardsState = {
			...initialReviewCardsState,
			pending: { status: "restoring", name: "a" },
		};
		assert.equal(
			transition(state, { type: "START_EDIT", name: "a", text: "x" }),
			state,
		);
	});

	it("DRAFT_CHANGE / CANCEL_EDIT when not editing no-op", () => {
		const idle = initialReviewCardsState;
		assert.equal(transition(idle, { type: "DRAFT_CHANGE", text: "x" }), idle);
		assert.equal(transition(idle, { type: "CANCEL_EDIT" }), idle);

		const busy = saving("a", "x", 1);
		assert.equal(transition(busy, { type: "DRAFT_CHANGE", text: "y" }), busy);
		assert.equal(transition(busy, { type: "CANCEL_EDIT" }), busy);
	});

	it("SAVE_OK / SAVE_ERR with wrong epoch no-op", () => {
		const state = saving("a", "draft", 2);
		assert.equal(transition(state, { type: "SAVE_OK", epoch: 1 }), state);
		assert.equal(transition(state, { type: "SAVE_ERR", epoch: 1 }), state);
	});

	it("SAVE_OK after RESET_EDIT no-op (abandoned save)", () => {
		const mid = saving("a", "draft", 3);
		const reset = transition(mid, { type: "RESET_EDIT" });
		assert.deepEqual(reset.edit, { status: "idle" });
		assert.equal(reset.saveEpoch, 3);
		assert.equal(transition(reset, { type: "SAVE_OK", epoch: 3 }), reset);
		assert.equal(transition(reset, { type: "SAVE_ERR", epoch: 3 }), reset);
	});

	it("stale SAVE_OK cannot clear a newer save session", () => {
		let state = editing("a", "one");
		state = transition(state, { type: "SAVE" });
		assert.ok(state.edit.status === "saving" && state.edit.epoch === 1);
		state = transition(state, { type: "RESET_EDIT" });
		state = transition(state, {
			type: "START_EDIT",
			name: "a",
			text: "two",
		});
		state = transition(state, { type: "SAVE" });
		assert.ok(state.edit.status === "saving" && state.edit.epoch === 2);

		const afterStale = transition(state, { type: "SAVE_OK", epoch: 1 });
		assert.equal(afterStale, state);
		assert.equal(afterStale.edit.status, "saving");
	});
});

describe("RESTORE_OK clears edit when restoring the editing card", () => {
	it("clears edit for same name", () => {
		const state: ReviewCardsState = {
			...editing("a", "draft"),
			pending: { status: "restoring", name: "a" },
		};
		const next = transition(state, { type: "RESTORE_OK" });
		assert.deepEqual(next.edit, { status: "idle" });
		assert.deepEqual(next.pending, { status: "idle" });
	});

	it("keeps edit for a different card", () => {
		const state: ReviewCardsState = {
			...editing("b", "draft"),
			pending: { status: "restoring", name: "a" },
		};
		const next = transition(state, { type: "RESTORE_OK" });
		assert.deepEqual(next.edit, {
			status: "editing",
			name: "b",
			draftText: "draft",
		});
		assert.deepEqual(next.pending, { status: "idle" });
	});
});

describe("SAVE_ERR returns to editing with draft preserved", () => {
	it("keeps name and draftText", () => {
		const state = saving("a", "kept draft", 4);
		const next = transition(state, { type: "SAVE_ERR", epoch: 4 });
		assert.deepEqual(next.edit, {
			status: "editing",
			name: "a",
			draftText: "kept draft",
		});
	});
});

describe("per-card mutate lock helpers", () => {
	it("locks only the pending / saving card", () => {
		const featuring: ReviewCardsState = {
			...initialReviewCardsState,
			pending: { status: "featuring", name: "a" },
		};
		assert.equal(isMutateLocked(featuring, "a"), true);
		assert.equal(isMutateLocked(featuring, "b"), false);
		assert.equal(isCardBusy(featuring, "a"), true);
		assert.equal(isCardBusy(featuring, "b"), false);

		const midSave = saving("a", "x", 1);
		assert.equal(isMutateLocked(midSave, "a"), true);
		assert.equal(isMutateLocked(midSave, "b"), false);
	});

	it("getCardMode prefers pending over edit on same card", () => {
		const state: ReviewCardsState = {
			...editing("a", "draft"),
			pending: { status: "restoring", name: "a" },
		};
		assert.equal(getCardMode(state, "a"), "restoring");
		assert.equal(getDraftText(state, "a", "fallback"), "draft");
	});
});
