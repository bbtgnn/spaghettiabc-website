/**
 * Sync-page orchestration: plugin HTTP + review-card-machine accept/SAVE epochs.
 * Returns outcomes for the presentational admin UI; machine stays pure.
 */

import { apiFetch as defaultApiFetch, isRecord, parseApiResponse } from "emdash/plugin-utils";
import type { ReviewCardsEvent, ReviewCardsState } from "./review-card-machine.ts";
import {
	isDisplayTextEdited,
	originalDisplayText,
	textEditedFlag,
	type ListResponse,
	type StoredReview,
	type SyncMeta,
} from "./types.ts";

const PLUGIN_API = "/_emdash/api/plugins/google-reviews";

export type SyncPageFetch = (
	input: string | URL | Request,
	init?: RequestInit,
) => Promise<Response>;

/** Apply a legal machine event; null when the transition is a no-op. */
export type CardsAccept = (event: ReviewCardsEvent) => ReviewCardsState | null;

type SyncPayload = {
	ok?: boolean;
	error?: string;
	upserted?: number;
	place?: ListResponse["place"];
	meta?: SyncMeta;
	reviews?: StoredReview[];
	source?: "live" | "mock";
};

type EditPayload = {
	ok?: boolean;
	error?: string;
	review?: StoredReview;
};

export type LoadOutcome =
	| { status: "ok"; data: ListResponse }
	| { status: "error"; message: string };

export type SyncOutcome =
	| { status: "ok"; data: ListResponse; notice: string }
	| { status: "error"; message: string; data?: ListResponse };

export type ToggleFeaturedOutcome =
	| { status: "rejected" }
	| { status: "ok"; name: string; featured: boolean; openHome: boolean }
	| { status: "error"; message: string };

export type SaveTextOutcome =
	| { status: "rejected" }
	| { status: "abandoned" }
	| { status: "ok"; name: string; patch: Partial<StoredReview>; notice: string }
	| { status: "error"; message: string };

export type RestoreTextOutcome =
	| { status: "rejected" }
	| { status: "ok"; name: string; patch: Partial<StoredReview>; notice: string }
	| { status: "error"; message: string };

export type SyncPageController = {
	load(): Promise<LoadOutcome>;
	sync(accept: CardsAccept, previous: ListResponse | null): Promise<SyncOutcome>;
	toggleFeatured(
		review: StoredReview,
		featured: boolean,
		accept: CardsAccept,
	): Promise<ToggleFeaturedOutcome>;
	saveText(review: StoredReview, accept: CardsAccept): Promise<SaveTextOutcome>;
	restoreText(
		review: StoredReview,
		accept: CardsAccept,
	): Promise<RestoreTextOutcome>;
};

function networkMessage(err: unknown): string {
	return err instanceof Error ? err.message : "Errore di rete";
}

function patchFromEditPayload(
	payload: EditPayload,
	fallback: Partial<StoredReview>,
): Partial<StoredReview> {
	if (isRecord(payload) && isRecord(payload.review)) {
		const saved = payload.review as StoredReview;
		return {
			...saved,
			textEdited: textEditedFlag(saved.textEdited === true),
		};
	}
	return fallback;
}

/** Immutable review patch inside a list response. */
export function patchReviewInList(
	data: ListResponse,
	name: string,
	patch: Partial<StoredReview>,
): ListResponse {
	return {
		...data,
		reviews: data.reviews.map((item) =>
			item.name === name ? { ...item, ...patch } : item,
		),
	};
}

function mergeSyncPayload(
	payload: SyncPayload,
	previous: ListResponse | null,
): ListResponse {
	const source = payload.source === "mock" ? "mock" : "live";
	return {
		place: payload.place ?? previous?.place ?? null,
		meta: payload.meta ?? previous?.meta ?? {},
		reviews: payload.reviews as StoredReview[],
		configured: previous?.configured ?? {
			devMockSync: source === "mock",
			hasClientId: true,
			hasClientSecret: true,
			hasRefreshToken: true,
			accountId: null,
			locationId: null,
			mapsUri: null,
		},
	};
}

function syncNotice(payload: SyncPayload, reviews: StoredReview[]): string {
	const source = payload.source === "mock" ? "mock" : "live";
	const count = String(payload.upserted ?? reviews.length);
	return source === "mock"
		? `Sync mock: ${count} recensioni fixture in cache (paginazione simulata).`
		: `Sync completata: ${count} recensioni in cache.`;
}

export function createSyncPageController(
	deps: { fetch?: SyncPageFetch } = {},
): SyncPageController {
	const fetch = deps.fetch ?? defaultApiFetch;

	async function load(): Promise<LoadOutcome> {
		try {
			const res = await fetch(`${PLUGIN_API}/list`);
			const data = await parseApiResponse<ListResponse>(
				res,
				"Impossibile caricare le recensioni",
			);
			return { status: "ok", data };
		} catch (err) {
			return { status: "error", message: networkMessage(err) };
		}
	}

	async function sync(
		accept: CardsAccept,
		previous: ListResponse | null,
	): Promise<SyncOutcome> {
		accept({ type: "RESET_EDIT" });
		try {
			const res = await fetch(`${PLUGIN_API}/sync`, { method: "POST" });
			const payload = await parseApiResponse<SyncPayload>(res, "Sync fallita");
			if (payload.ok === false) {
				const message =
					typeof payload.error === "string" ? payload.error : "Sync fallita";
				const reloaded = await load();
				return {
					status: "error",
					message,
					...(reloaded.status === "ok" ? { data: reloaded.data } : {}),
				};
			}
			if (Array.isArray(payload.reviews)) {
				const data = mergeSyncPayload(payload, previous);
				return {
					status: "ok",
					data,
					notice: syncNotice(payload, payload.reviews),
				};
			}
			const reloaded = await load();
			if (reloaded.status === "ok") {
				return {
					status: "ok",
					data: reloaded.data,
					notice: "Sync completata.",
				};
			}
			return { status: "error", message: reloaded.message };
		} catch (err) {
			return { status: "error", message: networkMessage(err) };
		}
	}

	async function toggleFeatured(
		review: StoredReview,
		featured: boolean,
		accept: CardsAccept,
	): Promise<ToggleFeaturedOutcome> {
		if (!accept({ type: "TOGGLE_FEATURE", name: review.name })) {
			return { status: "rejected" };
		}
		try {
			const res = await fetch(`${PLUGIN_API}/feature`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: review.name, featured }),
			});
			await parseApiResponse(res, "Impossibile aggiornare");
			accept({ type: "FEATURE_OK" });
			return {
				status: "ok",
				name: review.name,
				featured,
				openHome: featured,
			};
		} catch (err) {
			accept({ type: "FEATURE_ERR" });
			return { status: "error", message: networkMessage(err) };
		}
	}

	async function saveText(
		review: StoredReview,
		accept: CardsAccept,
	): Promise<SaveTextOutcome> {
		const next = accept({ type: "SAVE" });
		if (
			!next ||
			next.edit.status !== "saving" ||
			next.edit.name !== review.name
		) {
			return { status: "rejected" };
		}
		const draftText = next.edit.draftText;
		const epoch = next.edit.epoch;
		try {
			const res = await fetch(`${PLUGIN_API}/edit-text`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: review.name, text: draftText }),
			});
			const payload = await parseApiResponse<EditPayload>(
				res,
				"Impossibile salvare il testo",
			);
			// Skip patch/toast if sync RESET_EDIT (or a newer save) abandoned this epoch.
			if (!accept({ type: "SAVE_OK", epoch })) {
				return { status: "abandoned" };
			}
			const trimmed = draftText.trim();
			const patch = patchFromEditPayload(payload, {
				text: trimmed,
				textEdited: textEditedFlag(
					isDisplayTextEdited({ ...review, text: trimmed }),
				),
			});
			return {
				status: "ok",
				name: review.name,
				patch,
				notice: "Testo aggiornato.",
			};
		} catch (err) {
			if (!accept({ type: "SAVE_ERR", epoch })) {
				return { status: "abandoned" };
			}
			return { status: "error", message: networkMessage(err) };
		}
	}

	async function restoreText(
		review: StoredReview,
		accept: CardsAccept,
	): Promise<RestoreTextOutcome> {
		if (!accept({ type: "RESTORE", name: review.name })) {
			return { status: "rejected" };
		}
		try {
			const res = await fetch(`${PLUGIN_API}/edit-text`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: review.name, restore: true }),
			});
			const payload = await parseApiResponse<EditPayload>(
				res,
				"Impossibile ripristinare",
			);
			const patch = patchFromEditPayload(payload, {
				text: originalDisplayText(review),
				textEdited: undefined,
			});
			accept({ type: "RESTORE_OK" });
			return {
				status: "ok",
				name: review.name,
				patch,
				notice: "Testo originale ripristinato.",
			};
		} catch (err) {
			accept({ type: "RESTORE_ERR" });
			return { status: "error", message: networkMessage(err) };
		}
	}

	return { load, sync, toggleFeatured, saveText, restoreText };
}

/** Default controller wired to EmDash `apiFetch`. */
export const syncPageController = createSyncPageController();
