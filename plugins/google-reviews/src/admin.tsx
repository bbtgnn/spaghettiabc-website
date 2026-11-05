import * as React from "react";
import { apiFetch, getErrorMessage, isRecord } from "emdash/plugin-utils";
import type { ListResponse, StoredReview, SyncMeta } from "./types";

const PLUGIN_API = "/_emdash/api/plugins/google-reviews";

function stars(rating: number): string {
	const n = Math.max(0, Math.min(5, Math.round(rating)));
	return "★".repeat(n) + "☆".repeat(5 - n);
}

function SyncPage() {
	const [loading, setLoading] = React.useState(true);
	const [syncing, setSyncing] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [notice, setNotice] = React.useState<string | null>(null);
	const [data, setData] = React.useState<ListResponse | null>(null);
	const [pendingName, setPendingName] = React.useState<string | null>(null);

	const load = React.useCallback(async () => {
		setError(null);
		try {
			const res = await apiFetch(`${PLUGIN_API}/list`);
			if (!res.ok) {
				setError(await getErrorMessage(res, "Impossibile caricare le recensioni"));
				return;
			}
			const body: unknown = await res.json();
			const payload = isRecord(body) && isRecord(body.data) ? body.data : body;
			setData(payload as ListResponse);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Errore di rete");
		} finally {
			setLoading(false);
		}
	}, []);

	React.useEffect(() => {
		void load();
	}, [load]);

	async function onSync() {
		setSyncing(true);
		setError(null);
		setNotice(null);
		try {
			const res = await apiFetch(`${PLUGIN_API}/sync`, { method: "POST" });
			if (!res.ok) {
				setError(await getErrorMessage(res, "Sync fallita"));
				return;
			}
			const body: unknown = await res.json();
			const payload = isRecord(body) && "data" in body ? body.data : body;
			if (isRecord(payload) && payload.ok === false) {
				setError(typeof payload.error === "string" ? payload.error : "Sync fallita");
				await load();
				return;
			}
			if (isRecord(payload) && Array.isArray(payload.reviews)) {
				setData((prev) => ({
					place: (payload.place as ListResponse["place"]) ?? prev?.place ?? null,
					meta: (payload.meta as SyncMeta) ?? prev?.meta ?? {},
					reviews: payload.reviews as StoredReview[],
					configured: prev?.configured ?? { hasApiKey: true, placeId: null },
				}));
				setNotice(
					`Sync completata: ${String(payload.upserted ?? payload.reviews.length)} recensioni aggiornate.`,
				);
			} else {
				await load();
				setNotice("Sync completata.");
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Errore di rete");
		} finally {
			setSyncing(false);
		}
	}

	async function onToggleFeatured(review: StoredReview, featured: boolean) {
		setPendingName(review.name);
		setError(null);
		try {
			const res = await apiFetch(`${PLUGIN_API}/feature`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: review.name, featured }),
			});
			if (!res.ok) {
				setError(await getErrorMessage(res, "Impossibile aggiornare"));
				return;
			}
			setData((prev) => {
				if (!prev) return prev;
				return {
					...prev,
					reviews: prev.reviews.map((item) =>
						item.name === review.name ? { ...item, featured } : item,
					),
				};
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Errore di rete");
		} finally {
			setPendingName(null);
		}
	}

	const meta = data?.meta;
	const reviews = data?.reviews ?? [];

	return (
		<div className="gr-admin">
			<header className="gr-admin__header">
				<div>
					<h1 className="gr-admin__title">Recensioni Google</h1>
					<p className="gr-admin__lede">
						Sincronizza fino a 5 recensioni dal Place ID configurato, poi scegli quali
						mostrare in homepage.
					</p>
				</div>
				<button
					type="button"
					className="gr-admin__btn"
					onClick={() => void onSync()}
					disabled={syncing || loading}
				>
					{syncing ? "Sync in corso…" : "Sincronizza ora"}
				</button>
			</header>

			<section className="gr-admin__panel">
				<h2 className="gr-admin__h2">Configurazione</h2>
				<p className="gr-admin__meta">
					API key:{" "}
					<strong>{data?.configured.hasApiKey ? "impostata" : "mancante"}</strong>
					{" · "}
					Place ID:{" "}
					<strong>{data?.configured.placeId ?? "mancante"}</strong>
				</p>
				<p className="gr-admin__hint">
					Imposta chiave e Place ID in{" "}
					<em>Plugins → google-reviews → Settings</em>. Serve Places API (New) e
					billing Google.
				</p>
				{meta?.place?.displayName && (
					<p className="gr-admin__meta">
						Attività: <strong>{meta.place.displayName}</strong>
						{typeof meta.place.rating === "number" && (
							<>
								{" "}
								· {meta.place.rating.toFixed(1)}★
								{typeof meta.place.userRatingCount === "number" && (
									<> ({meta.place.userRatingCount} recensioni)</>
								)}
							</>
						)}
					</p>
				)}
				{meta?.lastSyncAt && (
					<p className="gr-admin__meta">
						Ultima sync: {new Date(meta.lastSyncAt).toLocaleString("it-IT")}
					</p>
				)}
				{meta?.lastSyncError && (
					<p className="gr-admin__error">Ultimo errore sync: {meta.lastSyncError}</p>
				)}
			</section>

			{error && <p className="gr-admin__error" role="alert">{error}</p>}
			{notice && <p className="gr-admin__notice">{notice}</p>}

			<section className="gr-admin__panel">
				<h2 className="gr-admin__h2">Recensioni sincronizzate</h2>
				{loading ? (
					<p className="gr-admin__meta">Caricamento…</p>
				) : reviews.length === 0 ? (
					<p className="gr-admin__meta">
						Nessuna recensione in cache. Configura Place ID e API key, poi sincronizza.
					</p>
				) : (
					<ul className="gr-admin__list">
						{reviews.map((review) => (
							<li key={review.name} className="gr-admin__item">
								<label className="gr-admin__check">
									<input
										type="checkbox"
										checked={review.featured}
										disabled={pendingName === review.name}
										onChange={(event) =>
											void onToggleFeatured(review, event.target.checked)
										}
									/>
									<span>Mostra in homepage</span>
								</label>
								<p className="gr-admin__rating" aria-label={`${review.rating} su 5`}>
									{stars(review.rating)}
								</p>
								<p className="gr-admin__quote">{review.text || "(senza testo)"}</p>
								<p className="gr-admin__author">
									{review.authorPhotoUri && (
										<img
											src={review.authorPhotoUri}
											alt=""
											width={28}
											height={28}
											className="gr-admin__avatar"
										/>
									)}
									<span>{review.authorName}</span>
									{review.relativePublishTimeDescription && (
										<span className="gr-admin__when">
											{review.relativePublishTimeDescription}
										</span>
									)}
								</p>
							</li>
						))}
					</ul>
				)}
			</section>

			<style>{`
				.gr-admin {
					display: grid;
					gap: 1.5rem;
					max-width: 48rem;
					padding: 0.5rem 0 2rem;
					color: inherit;
				}
				.gr-admin__header {
					display: flex;
					flex-wrap: wrap;
					align-items: start;
					justify-content: space-between;
					gap: 1rem;
				}
				.gr-admin__title {
					margin: 0;
					font-size: 1.5rem;
					font-weight: 600;
				}
				.gr-admin__lede {
					margin: 0.5rem 0 0;
					opacity: 0.8;
					max-width: 40ch;
				}
				.gr-admin__btn {
					appearance: none;
					border: 1px solid currentColor;
					background: transparent;
					color: inherit;
					padding: 0.55rem 0.9rem;
					font: inherit;
					font-weight: 600;
					cursor: pointer;
				}
				.gr-admin__btn:disabled {
					opacity: 0.5;
					cursor: not-allowed;
				}
				.gr-admin__panel {
					border-top: 1px solid rgba(255,255,255,0.18);
					padding-top: 1rem;
					display: grid;
					gap: 0.65rem;
				}
				.gr-admin__h2 {
					margin: 0;
					font-size: 1rem;
					font-weight: 600;
				}
				.gr-admin__meta,
				.gr-admin__hint {
					margin: 0;
					opacity: 0.8;
					font-size: 0.9rem;
				}
				.gr-admin__error {
					margin: 0;
					color: #f5a8a8;
				}
				.gr-admin__notice {
					margin: 0;
					color: #b7e0c0;
				}
				.gr-admin__list {
					margin: 0.5rem 0 0;
					padding: 0;
					list-style: none;
					display: grid;
					gap: 1rem;
				}
				.gr-admin__item {
					display: grid;
					gap: 0.5rem;
					padding-top: 0.85rem;
					border-top: 1px solid rgba(255,255,255,0.12);
				}
				.gr-admin__check {
					display: inline-flex;
					align-items: center;
					gap: 0.5rem;
					font-size: 0.85rem;
					font-weight: 600;
				}
				.gr-admin__rating {
					margin: 0;
					letter-spacing: 0.08em;
					color: #f0c674;
				}
				.gr-admin__quote {
					margin: 0;
					line-height: 1.45;
				}
				.gr-admin__author {
					margin: 0;
					display: flex;
					align-items: center;
					gap: 0.55rem;
					font-size: 0.85rem;
					opacity: 0.85;
				}
				.gr-admin__avatar {
					border-radius: 999px;
					object-fit: cover;
				}
				.gr-admin__when {
					opacity: 0.7;
				}
			`}</style>
		</div>
	);
}

export const pages = {
	"/sync": SyncPage,
};
