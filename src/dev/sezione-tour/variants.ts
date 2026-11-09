export const SEZIONE_TOUR_VARIANTS = [
	{
		id: "a" as const,
		title: "Variante A — Due grandi + rail",
		desc: "Coppia 50/50 (stack su mobile), rail dei teaser, poi recensioni compatte.",
		href: "/_dev/sezione-tour/a",
	},
	{
		id: "b" as const,
		title: "Variante B — Schede orizzontali",
		desc: "Due card immagine/testo affiancati, recensioni integrate, poi il rail.",
		href: "/_dev/sezione-tour/b",
	},
	{
		id: "c" as const,
		title: "Variante C — Asimmetrica",
		desc: "Primo tour dominante, secondo secondario, rail e recensioni in coda.",
		href: "/_dev/sezione-tour/c",
	},
] as const;

export type SezioneTourVariantId = (typeof SEZIONE_TOUR_VARIANTS)[number]["id"];

export const SEZIONE_TOUR_VIEWPORTS = [
	{ id: "desktop" as const, label: "Desktop · 1280" },
	{ id: "mobile" as const, label: "Mobile · 390" },
] as const;

export function getSezioneTourVariant(id: string | undefined) {
	return SEZIONE_TOUR_VARIANTS.find((variant) => variant.id === id) ?? null;
}
