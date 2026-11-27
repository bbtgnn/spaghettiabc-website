import * as React from "react";
import {
	Badge,
	Banner,
	Button,
	Collapsible,
	Empty,
	LayerCard,
	Loader,
	Text,
	Textarea,
	useKumoToastManager,
} from "@cloudflare/kumo";
import {
	ArrowClockwise,
	ArrowCounterClockwise,
	CaretDown,
	ChatCircle,
	Check,
	HouseSimple,
	PencilSimple,
	Plus,
	Trash,
	X,
	type Icon,
} from "@phosphor-icons/react";
import type { PluginAdminExports } from "emdash";
import {
	getDraftText,
	initialReviewCardsState,
	isCardBusy,
	isEditingCard,
	isFeaturingCard,
	isMutateLocked,
	isRestoringCard,
	isSavingCard,
	transition,
	type ReviewCardsEvent,
	type ReviewCardsState,
} from "./review-card-machine";
import {
	patchReviewInList,
	syncPageController,
} from "./sync-page-controller";
import type { ListResponse, StoredReview } from "./types";

const HOME_SECTION_ID = "recensioni-in-home";
const JUST_ADDED_CLASS = "gr-just-added";
/** Height transition classes from Kumo DefaultPanel, without the left-border accent.
 * `-m-1` + inner `p-1` keep LayerCard rings/shadows inside the overflow clip box
 * without visibly indenting cards vs the page column. */
const COLLAPSIBLE_PANEL_CLASS =
	"-m-1 h-[var(--collapsible-panel-height)] overflow-hidden transition-[height,opacity] duration-100 ease-out data-ending-style:h-0 data-ending-style:opacity-0 data-starting-style:h-0 data-starting-style:opacity-0 [&[hidden]:not([hidden='until-found'])]:hidden";
const COLLAPSIBLE_PANEL_BODY_CLASS = "space-y-3 p-1";
/** Score + home + altre: equal py, hairline only between sections. */
const SYNC_SECTION_CLASS =
	"space-y-3 border-t border-kumo-hairline py-6";
/** Own trigger: Kumo DefaultTrigger wraps the label in a bare span that keeps
 * text-base line-height, so the injected caret centers against a taller box than
 * the icon+title row. Rotation also never applies in admin (utility lives in
 * node_modules, outside Tailwind content scan). */
const SECTION_TRIGGER_CLASS =
	"m-0 flex cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-base font-medium leading-none text-kumo-default shadow-none select-none";

function stars(rating: number): string {
	const n = Math.max(0, Math.min(5, Math.round(rating)));
	return "★".repeat(n) + "☆".repeat(5 - n);
}

function SectionTrigger({
	icon: Icon,
	children,
}: {
	icon: Icon;
	children: React.ReactNode;
}) {
	return (
		<Collapsible.Trigger className={SECTION_TRIGGER_CLASS}>
			<Icon size={18} weight="regular" aria-hidden className="size-[18px] shrink-0" />
			{children}
			<CaretDown
				aria-hidden
				size={12}
				weight="bold"
				className="gr-section-caret block size-3 shrink-0 origin-center transition-transform duration-100 ease-out"
			/>
		</Collapsible.Trigger>
	);
}

function isTextEdited(review: StoredReview): boolean {
	const original = review.originalText ?? review.text;
	return review.text !== original;
}

function useReviewCardsMachine() {
	const [state, dispatch] = React.useReducer(
		transition,
		initialReviewCardsState,
	);
	const stateRef = React.useRef(state);
	stateRef.current = state;

	/** Apply event only if the transition is legal; sync ref for same-tick guards. */
	function accept(event: ReviewCardsEvent): ReviewCardsState | null {
		const next = transition(stateRef.current, event);
		if (next === stateRef.current) return null;
		stateRef.current = next;
		dispatch(event);
		return next;
	}

	return { state, accept };
}

type ReviewCardProps = {
	review: StoredReview;
	cards: ReviewCardsState;
	featureAction: "add" | "remove";
	accept: (event: ReviewCardsEvent) => ReviewCardsState | null;
	onToggleFeatured: (featured: boolean) => void;
	onSaveText: () => void;
	onRestoreText: () => void;
};

function ReviewCard({
	review,
	cards,
	featureAction,
	accept,
	onToggleFeatured,
	onSaveText,
	onRestoreText,
}: ReviewCardProps) {
	const edited = isTextEdited(review);
	const featured = featureAction === "remove";
	const editing = isEditingCard(cards, review.name);
	const savingText = isSavingCard(cards, review.name);
	const featurePending = isFeaturingCard(cards, review.name);
	const restorePending = isRestoringCard(cards, review.name);
	const busy = isCardBusy(cards, review.name);
	const mutateLocked = isMutateLocked(cards, review.name);
	const draftText = getDraftText(cards, review.name, review.text);

	return (
		<LayerCard>
			<LayerCard.Secondary className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex min-w-0 items-center gap-2">
					{review.authorPhotoUri ? (
						<img
							src={review.authorPhotoUri}
							alt=""
							width={28}
							height={28}
							className="size-7 shrink-0 rounded-full object-cover"
						/>
					) : null}
					<div className="min-w-0">
						<Text as="p" DANGEROUS_className="truncate font-medium">
							{review.authorName}
						</Text>
						{review.updateTime ? (
							<Text variant="secondary" size="sm">
								{new Date(review.updateTime).toLocaleDateString("it-IT")}
							</Text>
						) : null}
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{edited ? (
						<>
							<Badge variant="warning">testo modificato</Badge>
							<Button
								type="button"
								variant="secondary"
								size="sm"
								icon={ArrowCounterClockwise}
								disabled={mutateLocked}
								loading={restorePending}
								onClick={onRestoreText}
							>
								Ripristina
							</Button>
						</>
					) : null}
					{!editing ? (
						<Button
							type="button"
							variant="secondary"
							size="sm"
							icon={PencilSimple}
							disabled={busy}
							onClick={() =>
								accept({
									type: "START_EDIT",
									name: review.name,
									text: review.text,
								})
							}
						>
							Modifica
						</Button>
					) : null}
					<Button
						type="button"
						variant="secondary"
						size="sm"
						icon={featured ? Trash : Plus}
						disabled={mutateLocked}
						loading={featurePending}
						aria-pressed={featured}
						onClick={() => onToggleFeatured(!featured)}
					>
						{featured ? "Rimuovi" : "Aggiungi"}
					</Button>
				</div>
			</LayerCard.Secondary>
			<LayerCard.Primary className="flex flex-col gap-3">
				<Text
					size="sm"
					DANGEROUS_className="tracking-widest text-kumo-warning"
					aria-label={`${review.rating} su 5`}
				>
					{stars(review.rating)}
				</Text>

				{editing ? (
					<div className="flex flex-col gap-3">
						<Textarea
							aria-label="Testo mostrato"
							value={draftText}
							rows={5}
							disabled={savingText}
							onValueChange={(value) =>
								accept({ type: "DRAFT_CHANGE", text: value })
							}
							className="w-full"
						/>
						<div className="flex flex-wrap gap-2">
							<Button
								type="button"
								variant="secondary"
								size="sm"
								icon={Check}
								disabled={savingText}
								loading={savingText}
								onClick={onSaveText}
							>
								{savingText ? "Salvataggio…" : "Salva"}
							</Button>
							<Button
								type="button"
								variant="secondary"
								size="sm"
								icon={X}
								disabled={savingText}
								onClick={() => accept({ type: "CANCEL_EDIT" })}
							>
								Annulla
							</Button>
						</div>
					</div>
				) : (
					<Text>{review.text || "(senza testo)"}</Text>
				)}
			</LayerCard.Primary>
		</LayerCard>
	);
}

function SyncPage() {
	const toast = useKumoToastManager();
	const { state: cards, accept } = useReviewCardsMachine();
	const [loading, setLoading] = React.useState(true);
	const [syncing, setSyncing] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [data, setData] = React.useState<ListResponse | null>(null);
	const [scrollToFeaturedName, setScrollToFeaturedName] = React.useState<
		string | null
	>(null);
	const [justAddedName, setJustAddedName] = React.useState<string | null>(null);
	const [homeOpen, setHomeOpen] = React.useState(true);
	const dataRef = React.useRef(data);
	dataRef.current = data;

	function showError(message: string) {
		setError(message);
		toast.add({ title: message, variant: "error", timeout: 5000 });
	}

	function showNotice(message: string) {
		setError(null);
		toast.add({ title: message, variant: "success", timeout: 4000 });
	}

	const load = React.useCallback(async () => {
		setError(null);
		const outcome = await syncPageController.load();
		if (outcome.status === "ok") {
			setData(outcome.data);
		} else {
			setError(outcome.message);
		}
		setLoading(false);
	}, []);

	React.useEffect(() => {
		void load();
	}, [load]);

	React.useLayoutEffect(() => {
		if (!scrollToFeaturedName) return;
		const section = document.getElementById(HOME_SECTION_ID);
		const card = section?.querySelector(
			`[data-review-name="${CSS.escape(scrollToFeaturedName)}"]`,
		);
		const target = (card as HTMLElement | null) ?? section;
		target?.scrollIntoView({ behavior: "smooth", block: "start" });
		setScrollToFeaturedName(null);
	}, [scrollToFeaturedName, data?.reviews]);

	React.useEffect(() => {
		if (!justAddedName) return;
		const timeout = window.setTimeout(() => {
			setJustAddedName((current) =>
				current === justAddedName ? null : current,
			);
		}, 1400);
		return () => window.clearTimeout(timeout);
	}, [justAddedName]);

	async function onSync() {
		setSyncing(true);
		setError(null);
		const outcome = await syncPageController.sync(accept, dataRef.current);
		if (outcome.status === "ok") {
			setData(outcome.data);
			showNotice(outcome.notice);
		} else {
			if (outcome.data) setData(outcome.data);
			showError(outcome.message);
		}
		setSyncing(false);
	}

	async function onToggleFeatured(review: StoredReview, featured: boolean) {
		setError(null);
		const outcome = await syncPageController.toggleFeatured(
			review,
			featured,
			accept,
		);
		if (outcome.status === "rejected") return;
		if (outcome.status === "ok") {
			setData((prev) =>
				prev
					? patchReviewInList(prev, outcome.name, { featured: outcome.featured })
					: prev,
			);
			if (outcome.openHome) {
				setHomeOpen(true);
				setJustAddedName(outcome.name);
				setScrollToFeaturedName(outcome.name);
			}
			return;
		}
		showError(outcome.message);
	}

	async function onSaveText(review: StoredReview) {
		setError(null);
		const outcome = await syncPageController.saveText(review, accept);
		if (outcome.status === "rejected" || outcome.status === "abandoned") return;
		if (outcome.status === "ok") {
			setData((prev) =>
				prev ? patchReviewInList(prev, outcome.name, outcome.patch) : prev,
			);
			showNotice(outcome.notice);
			return;
		}
		showError(outcome.message);
	}

	async function onRestoreText(review: StoredReview) {
		setError(null);
		const outcome = await syncPageController.restoreText(review, accept);
		if (outcome.status === "rejected") return;
		if (outcome.status === "ok") {
			setData((prev) =>
				prev ? patchReviewInList(prev, outcome.name, outcome.patch) : prev,
			);
			showNotice(outcome.notice);
			return;
		}
		showError(outcome.message);
	}

	const meta = data?.meta;
	const reviews = data?.reviews ?? [];
	const featuredReviews = reviews.filter((r) => r.featured);
	const otherReviews = reviews.filter((r) => !r.featured);
	const featuredCount = featuredReviews.length;
	const configured = data?.configured;
	const mockOn = Boolean(configured?.devMockSync);
	const liveReady =
		configured?.hasClientId &&
		configured?.hasClientSecret &&
		configured?.hasRefreshToken &&
		configured?.accountId &&
		configured?.locationId;
	const ready = mockOn || liveReady;
	const placeSummary = meta?.place ?? data?.place ?? null;
	const placeRating =
		typeof placeSummary?.rating === "number" ? placeSummary.rating : null;
	const placeReviewCount =
		typeof placeSummary?.userRatingCount === "number"
			? placeSummary.userRatingCount
			: null;
	const showScoreCard = placeRating !== null || placeReviewCount !== null;

	return (
		<section className="mx-auto flex max-w-3xl flex-col gap-6 py-2 pb-8">
			<style>{`
				@keyframes gr-just-added-ring {
					0%, 40% { box-shadow: 0 0 0 2px color-mix(in oklab, CanvasText 45%, transparent); }
					100% { box-shadow: 0 0 0 2px transparent; }
				}
				.${JUST_ADDED_CLASS} {
					animation: gr-just-added-ring 1.25s ease-out forwards;
				}
				/* Admin Tailwind does not scan plugin/node_modules for Kumo's
				 * [[data-panel-open]_&]:rotate-180, so rotate the caret here. */
				[data-kumo-part="trigger"][data-panel-open] svg.gr-section-caret {
					transform: rotate(180deg);
				}
			`}</style>
			<header className="flex flex-wrap items-start justify-between gap-4">
				<div className="max-w-prose space-y-2">
					<Text as="h1" variant="heading" size="lg">
						Recensioni Google
					</Text>
					<Text variant="secondary" size="sm">
						Sincronizza le recensioni, poi usa «Aggiungi» per metterle in
						homepage. Quelle in «Recensioni in home» alimentano lo strip in
						Sezione Tour (non il repeater CMS). Puoi modificare il testo
						mostrato senza perdere l’originale Google.
					</Text>
				</div>
				<Button
					type="button"
					variant="secondary"
					icon={ArrowClockwise}
					loading={syncing}
					onClick={() => void onSync()}
					disabled={syncing || loading}
				>
					{syncing ? "Sync in corso…" : "Sincronizza ora"}
				</Button>
			</header>

			{mockOn && (
				<Banner
					variant="alert"
					title="Dev mock sync attivo"
					description="Nessun OAuth/API. «Sincronizza ora» carica 12 fixture in pagine da 5 (come GBP). Spegni l’opzione in Settings prima della produzione."
				/>
			)}

			{error && (
				<Banner variant="error" title="Errore" description={error} role="alert" />
			)}

			<div className="flex flex-col">
				<section className={SYNC_SECTION_CLASS}>
					{showScoreCard ? (
						<LayerCard className="max-w-sm">
							<LayerCard.Primary>
								{/* Primary is flex-col; row layout lives on this child. */}
								<div className="flex flex-row items-start gap-5">
									<p className="m-0 p-0 text-sm leading-none text-kumo-subtle">
										Punteggio Google
									</p>
									<div className="flex flex-col gap-0">
										<Text
											as="p"
											size="lg"
											DANGEROUS_className="font-semibold tabular-nums leading-none"
										>
											{placeRating !== null ? placeRating.toFixed(1) : "—"}
										</Text>
										{placeRating !== null ? (
											<Text
												size="sm"
												DANGEROUS_className="tracking-widest text-kumo-warning"
												aria-label={`${placeRating} su 5`}
											>
												{stars(placeRating)}
											</Text>
										) : null}
									</div>
									<div className="flex flex-col gap-0">
										<Text
											as="p"
											size="lg"
											DANGEROUS_className="font-semibold tabular-nums leading-none"
										>
											{placeReviewCount !== null ? placeReviewCount : "—"}
										</Text>
										<Text variant="secondary" size="sm">
											recensioni
										</Text>
									</div>
								</div>
							</LayerCard.Primary>
						</LayerCard>
					) : null}
					{!ready && (
						<Banner
							variant="error"
							title="Configurazione incompleta"
							description="Attiva Dev mock sync, oppure imposta client, refresh token, account e location in Plugins → google-reviews → Settings."
						/>
					)}
					{meta?.lastSyncAt && (
						<Text variant="secondary" size="sm">
							Ultima sync: {new Date(meta.lastSyncAt).toLocaleString("it-IT")}
							{typeof meta.reviewCount === "number" && (
								<> · {meta.reviewCount} in cache</>
							)}
							{featuredCount > 0 && <> · {featuredCount} in homepage</>}
						</Text>
					)}
					{meta?.lastSyncError && (
						<Banner
							variant="error"
							title="Ultimo errore sync"
							description={meta.lastSyncError}
						/>
					)}
				</section>

				{loading ? (
					<section className={`${SYNC_SECTION_CLASS} flex justify-center`}>
						<Loader />
					</section>
				) : reviews.length === 0 ? (
					<section className={SYNC_SECTION_CLASS}>
						<Empty
							size="sm"
							title={
								mockOn
									? "Nessuna recensione in cache. Premi Sincronizza ora per caricare le fixture mock."
									: "Nessuna recensione in cache. Completa le impostazioni e sincronizza."
							}
						/>
					</section>
				) : (
					<>
						<section
							id={HOME_SECTION_ID}
							className={`${SYNC_SECTION_CLASS} scroll-mt-48`}
						>
							<Collapsible.Root
								className="flex flex-col gap-5"
								open={homeOpen}
								onOpenChange={setHomeOpen}
							>
								<SectionTrigger icon={HouseSimple}>
									{`Recensioni in home (${featuredReviews.length})`}
								</SectionTrigger>
								<Collapsible.Panel
									keepMounted
									className={COLLAPSIBLE_PANEL_CLASS}
								>
									<div className={COLLAPSIBLE_PANEL_BODY_CLASS}>
										{featuredReviews.length === 0 ? (
											<Empty
												size="sm"
												title="Nessuna. Usa «Aggiungi» nella lista sotto."
											/>
										) : (
											<ul className="m-0 flex list-none flex-col gap-3 p-0">
												{featuredReviews.map((review) => {
													const justAdded = justAddedName === review.name;
													return (
														<li
															key={review.name}
															data-review-name={review.name}
															className={`scroll-mt-48 rounded-lg${justAdded ? ` ${JUST_ADDED_CLASS}` : ""}`}
														>
															<ReviewCard
																review={review}
																cards={cards}
																accept={accept}
																featureAction="remove"
																onToggleFeatured={(featured) =>
																	void onToggleFeatured(review, featured)
																}
																onSaveText={() => void onSaveText(review)}
																onRestoreText={() =>
																	void onRestoreText(review)
																}
															/>
														</li>
													);
												})}
											</ul>
										)}
									</div>
								</Collapsible.Panel>
							</Collapsible.Root>
						</section>

						<section className={SYNC_SECTION_CLASS}>
							<Collapsible.Root className="flex flex-col gap-5" defaultOpen>
								<SectionTrigger icon={ChatCircle}>
									{`Altre recensioni (${otherReviews.length})`}
								</SectionTrigger>
								<Collapsible.Panel className={COLLAPSIBLE_PANEL_CLASS}>
									<div className={COLLAPSIBLE_PANEL_BODY_CLASS}>
										{otherReviews.length === 0 ? (
											<Empty
												size="sm"
												title="Tutte le recensioni sono già in homepage."
											/>
										) : (
											<ul className="m-0 flex list-none flex-col gap-3 p-0">
												{otherReviews.map((review) => (
													<li key={review.name}>
														<ReviewCard
															review={review}
															cards={cards}
															accept={accept}
															featureAction="add"
															onToggleFeatured={(featured) =>
																void onToggleFeatured(review, featured)
															}
															onSaveText={() => void onSaveText(review)}
															onRestoreText={() => void onRestoreText(review)}
														/>
													</li>
												))}
											</ul>
										)}
									</div>
								</Collapsible.Panel>
							</Collapsible.Root>
						</section>
					</>
				)}
			</div>
		</section>
	);
}

export const pages: PluginAdminExports["pages"] = {
	"/sync": SyncPage,
};
