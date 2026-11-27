/**
 * Sync-page interaction FSM for Google review cards.
 *
 * Two orthogonal tracks (edit may target a different card than pending):
 * - edit: idle → editing → saving → idle
 * - pending: idle → featuring|restoring → idle
 *
 * Per-card UI mode prefers pending over edit when both apply to the same
 * name for control disabling; the edit draft UI stays open while restoring
 * the same card (matches prior busy + editing behaviour).
 *
 * Illegal transitions are no-ops. At most one featuring|restoring may run
 * globally (machine invariant); mutate UI locks are per-card only.
 */

export type CardMode =
	| "viewing"
	| "editing"
	| "saving"
	| "restoring"
	| "featuring";

export type ReviewCardsState = {
	edit:
		| { status: "idle" }
		| { status: "editing"; name: string; draftText: string }
		| { status: "saving"; name: string; draftText: string; epoch: number };
	pending:
		| { status: "idle" }
		| { status: "featuring"; name: string }
		| { status: "restoring"; name: string };
	/** Monotonic id for the active/last save session (ignored when not saving). */
	saveEpoch: number;
};

export type ReviewCardsEvent =
	| { type: "START_EDIT"; name: string; text: string }
	| { type: "CANCEL_EDIT" }
	| { type: "DRAFT_CHANGE"; text: string }
	| { type: "SAVE" }
	| { type: "SAVE_OK"; epoch: number }
	| { type: "SAVE_ERR"; epoch: number }
	| { type: "RESTORE"; name: string }
	| { type: "RESTORE_OK" }
	| { type: "RESTORE_ERR" }
	| { type: "TOGGLE_FEATURE"; name: string }
	| { type: "FEATURE_OK" }
	| { type: "FEATURE_ERR" }
	| { type: "RESET_EDIT" };

export const initialReviewCardsState: ReviewCardsState = {
	edit: { status: "idle" },
	pending: { status: "idle" },
	saveEpoch: 0,
};

function isCardPending(state: ReviewCardsState, name: string): boolean {
	return state.pending.status !== "idle" && state.pending.name === name;
}

function isCardSaving(state: ReviewCardsState, name: string): boolean {
	return state.edit.status === "saving" && state.edit.name === name;
}

/** True when this card should disable Modifica (pending/saving on this card). */
export function isCardBusy(state: ReviewCardsState, name: string): boolean {
	return isCardPending(state, name) || isCardSaving(state, name);
}

/**
 * True when Ripristina / Aggiungi / Rimuovi should be disabled on this card.
 * Per-card only (pending or saving on this name); other cards stay clickable
 * while the machine still rejects a second concurrent pending transition.
 */
export function isMutateLocked(state: ReviewCardsState, name: string): boolean {
	return isCardPending(state, name) || isCardSaving(state, name);
}

export function getCardMode(state: ReviewCardsState, name: string): CardMode {
	if (state.pending.status === "featuring" && state.pending.name === name) {
		return "featuring";
	}
	if (state.pending.status === "restoring" && state.pending.name === name) {
		return "restoring";
	}
	if (state.edit.status !== "idle" && state.edit.name === name) {
		return state.edit.status;
	}
	return "viewing";
}

export function getDraftText(
	state: ReviewCardsState,
	name: string,
	fallback: string,
): string {
	if (state.edit.status !== "idle" && state.edit.name === name) {
		return state.edit.draftText;
	}
	return fallback;
}

export function isEditingCard(state: ReviewCardsState, name: string): boolean {
	return state.edit.status !== "idle" && state.edit.name === name;
}

export function isSavingCard(state: ReviewCardsState, name: string): boolean {
	return isCardSaving(state, name);
}

export function isFeaturingCard(state: ReviewCardsState, name: string): boolean {
	return state.pending.status === "featuring" && state.pending.name === name;
}

export function isRestoringCard(state: ReviewCardsState, name: string): boolean {
	return state.pending.status === "restoring" && state.pending.name === name;
}

export function transition(
	state: ReviewCardsState,
	event: ReviewCardsEvent,
): ReviewCardsState {
	switch (event.type) {
		case "START_EDIT": {
			if (isCardBusy(state, event.name)) return state;
			if (state.edit.status === "saving") return state;
			return {
				...state,
				edit: {
					status: "editing",
					name: event.name,
					draftText: event.text,
				},
			};
		}
		case "CANCEL_EDIT": {
			if (state.edit.status !== "editing") return state;
			return { ...state, edit: { status: "idle" } };
		}
		case "DRAFT_CHANGE": {
			if (state.edit.status !== "editing") return state;
			return {
				...state,
				edit: { ...state.edit, draftText: event.text },
			};
		}
		case "SAVE": {
			if (state.edit.status !== "editing") return state;
			const epoch = state.saveEpoch + 1;
			return {
				...state,
				saveEpoch: epoch,
				edit: {
					status: "saving",
					name: state.edit.name,
					draftText: state.edit.draftText,
					epoch,
				},
			};
		}
		case "SAVE_OK": {
			if (state.edit.status !== "saving") return state;
			if (state.edit.epoch !== event.epoch) return state;
			return { ...state, edit: { status: "idle" } };
		}
		case "SAVE_ERR": {
			if (state.edit.status !== "saving") return state;
			if (state.edit.epoch !== event.epoch) return state;
			return {
				...state,
				edit: {
					status: "editing",
					name: state.edit.name,
					draftText: state.edit.draftText,
				},
			};
		}
		case "RESTORE": {
			if (state.pending.status !== "idle") return state;
			if (isCardSaving(state, event.name)) return state;
			return {
				...state,
				pending: { status: "restoring", name: event.name },
			};
		}
		case "RESTORE_OK": {
			if (state.pending.status !== "restoring") return state;
			const name = state.pending.name;
			const clearEdit =
				state.edit.status !== "idle" && state.edit.name === name;
			return {
				...state,
				edit: clearEdit ? { status: "idle" } : state.edit,
				pending: { status: "idle" },
			};
		}
		case "RESTORE_ERR": {
			if (state.pending.status !== "restoring") return state;
			return { ...state, pending: { status: "idle" } };
		}
		case "TOGGLE_FEATURE": {
			if (state.pending.status !== "idle") return state;
			if (isCardBusy(state, event.name)) return state;
			return {
				...state,
				pending: { status: "featuring", name: event.name },
			};
		}
		case "FEATURE_OK":
		case "FEATURE_ERR": {
			if (state.pending.status !== "featuring") return state;
			return { ...state, pending: { status: "idle" } };
		}
		case "RESET_EDIT": {
			// Abandon in-flight save: late SAVE_OK/SAVE_ERR no-op (epoch/status mismatch).
			if (state.edit.status === "idle") return state;
			return { ...state, edit: { status: "idle" } };
		}
		default: {
			const _exhaustive: never = event;
			return _exhaustive;
		}
	}
}
