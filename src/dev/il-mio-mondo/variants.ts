export const IL_MIO_MONDO_VARIANTS = [
	{
		id: "a" as const,
		title: "Variante A — Striscia editoriale",
		desc: "Tre colonne uguali stile magazine (stack su mobile); Post Instagram → Articolo Substack → Ricetta selezionata.",
		href: "/_dev/il-mio-mondo/a",
	},
	{
		id: "b" as const,
		title: "Variante B — Instagram dominante",
		desc: "Post Instagram in primo piano; Articolo Substack e Ricetta selezionata in stack secondario.",
		href: "/_dev/il-mio-mondo/b",
	},
	{
		id: "c" as const,
		title: "Variante C — Rail orizzontale",
		desc: "Tre pannelli in scroll orizzontale con gerarchia tipografica forte.",
		href: "/_dev/il-mio-mondo/c",
	},
] as const;

export type IlMioMondoVariantId = (typeof IL_MIO_MONDO_VARIANTS)[number]["id"];

export const IL_MIO_MONDO_VIEWPORTS = [
	{ id: "desktop" as const, label: "Desktop · 1280" },
	{ id: "mobile" as const, label: "Mobile · 390" },
] as const;

export function getIlMioMondoVariant(id: string | undefined) {
	return IL_MIO_MONDO_VARIANTS.find((variant) => variant.id === id) ?? null;
}
