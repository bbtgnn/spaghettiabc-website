export const HERO_VARIANTS = [
	{
		id: "a" as const,
		tipo: "Standard",
		title: "Variante A — Split raffinato",
		desc: "Copia a sinistra, immagine a destra su desktop; stack su mobile.",
		href: "/_dev/hero/a",
	},
	{
		id: "b" as const,
		tipo: "Standard",
		title: "Variante B — Full-bleed",
		desc: "Immagine dominante a tutta larghezza; copia e CTA nel flusso del documento.",
		href: "/_dev/hero/b",
	},
	{
		id: "c" as const,
		tipo: "Standard",
		title: "Variante C — Brand first",
		desc: "Nome del sito come segnale hero; titolo CMS secondario; stessi media.",
		href: "/_dev/hero/c",
	},
	{
		id: "d" as const,
		tipo: "Sperimentale",
		title: "Variante D — Tipografia dominante",
		desc: "Titolo enorme; immagine secondaria o ritagliata.",
		href: "/_dev/hero/d",
	},
	{
		id: "e" as const,
		tipo: "Sperimentale",
		title: "Variante E — Asimmetria forte",
		desc: "L’immagine invade la colonna della copia.",
		href: "/_dev/hero/e",
	},
	{
		id: "f" as const,
		tipo: "Sperimentale",
		title: "Variante F — Stack editoriale",
		desc: "Colonna stretta centrata, stile mobile anche nel frame desktop.",
		href: "/_dev/hero/f",
	},
] as const;

export type HeroVariantId = (typeof HERO_VARIANTS)[number]["id"];

export const HERO_VIEWPORTS = [
	{ id: "desktop" as const, label: "Desktop · 1280" },
	{ id: "mobile" as const, label: "Mobile · 390" },
] as const;

export function getHeroVariant(id: string | undefined) {
	return HERO_VARIANTS.find((variant) => variant.id === id) ?? null;
}
