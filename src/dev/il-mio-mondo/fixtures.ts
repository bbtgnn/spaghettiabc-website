/**
 * Playground-only fixtures for Post Instagram + Articolo Substack.
 * Homepage CMS fields for these slots are deferred until a variant wins.
 */

export const SECTION_CHROME = {
	title: "Il mio mondo",
	subtitle:
		"Tra reel, newsletter e ricette: tre pezzi scelti da Flavia, non un feed aggregato.",
	ctaLabel: "Tutte le ricette",
	ctaHref: "/recipes",
} as const;

export const INSTAGRAM_FIXTURE = {
	caption:
		"Orecchiette fatte a mano sul balcone di Bari Vecchia — farina, semola, e un po’ di pazienza.",
	url: "https://www.instagram.com/spaghettiabc/",
	image: {
		src: "https://spaghettiabc.com/wp-content/uploads/2023/04/agnolotti-del-plin.png",
		alt: "Orecchiette fresche su un tagliere di legno",
	},
} as const;

export const SUBSTACK_FIXTURE = {
	title: "Why I still make pasta by hand",
	excerpt:
		"A short note from the Substack: slow dough, Sunday light, and why the table always comes first.",
	url: "https://spaghettiabc.substack.com/",
	image: {
		src: "https://spaghettiabc.com/wp-content/uploads/2023/04/arancini-riso.png",
		alt: "Hands shaping fresh pasta dough",
	},
} as const;
