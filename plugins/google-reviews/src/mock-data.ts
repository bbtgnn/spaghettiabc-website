/** Fixture reviews for Dev mock sync — >5 items so pagination behaves like GBP. */

export const MOCK_ACCOUNT_ID = "dev-account";
export const MOCK_LOCATION_ID = "dev-location";
export const MOCK_MAPS_URI =
	"https://www.google.com/maps/search/?api=1&query=Spaghetti+ABC+Flavia+Giordano";

export type MockGbpReview = {
	name: string;
	reviewId: string;
	starRating: "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE";
	comment: string;
	createTime: string;
	updateTime: string;
	reviewer: {
		displayName: string;
		profilePhotoUrl?: string;
		isAnonymous?: boolean;
	};
};

const AVATARS = [
	"https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&h=128&fit=crop&crop=face",
	"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=128&h=128&fit=crop&crop=face",
	"https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=128&h=128&fit=crop&crop=face",
	"https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=128&h=128&fit=crop&crop=face",
	"https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=128&h=128&fit=crop&crop=face",
	"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop&crop=face",
] as const;

type Seed = {
	id: string;
	author: string;
	stars: MockGbpReview["starRating"];
	comment: string;
	daysAgo: number;
	avatar?: number | null;
};

const SEEDS: Seed[] = [
	{
		id: "mock-chiara",
		author: "Chiara R.",
		stars: "FIVE",
		comment:
			"Un’esperienza bellissima: Flavia ci ha fatto conoscere la Puglia attraverso i sapori, con calma e competenza. Consigliatissima!",
		daysAgo: 12,
		avatar: 0,
	},
	{
		id: "mock-marco",
		author: "Marco D.",
		stars: "FIVE",
		comment:
			"Tour impeccabile. Prodotti locali, storie vere e una guida che sa davvero di cosa parla. Torneremo senz’altro.",
		daysAgo: 28,
		avatar: 1,
	},
	{
		id: "mock-elena",
		author: "Elena B.",
		stars: "FIVE",
		comment:
			"Atmosfera familiare e contenuti di qualità. Si sente la cura in ogni dettaglio, dal mercato alla tavola.",
		daysAgo: 45,
		avatar: 2,
	},
	{
		id: "mock-luca",
		author: "Luca P.",
		stars: "FOUR",
		comment:
			"Non è turismo di massa: è un viaggio guloso e intelligente. Vorremmo solo che durasse più a lungo!",
		daysAgo: 60,
		avatar: 3,
	},
	{
		id: "mock-sofia",
		author: "Sofia M.",
		stars: "FIVE",
		comment:
			"Flavia racconta la Puglia con grazia e precisione. Ogni assaggio ha una storia: ce ne siamo innamorati.",
		daysAgo: 75,
		avatar: 4,
	},
	{
		id: "mock-andrea",
		author: "Andrea T.",
		stars: "FIVE",
		comment:
			"Organizzazione perfetta e prodotti scelti con cura. Ideale per chi vuole capire il territorio, non solo fotografarlo.",
		daysAgo: 90,
		avatar: 5,
	},
	{
		id: "mock-giulia",
		author: "Giulia N.",
		stars: "FIVE",
		comment:
			"Dal forno al frantoio, ogni tappa aveva senso. Flavia sa tenere il gruppo e lasciare spazio alle domande.",
		daysAgo: 110,
		avatar: 0,
	},
	{
		id: "mock-paolo",
		author: "Paolo S.",
		stars: "FOUR",
		comment:
			"Bella giornata, cibo eccellente. Unico neo: avrei voluto più tempo al mercato. Comunque da ripetere.",
		daysAgo: 130,
		avatar: 1,
	},
	{
		id: "mock-anonymous",
		author: "Anonimo",
		stars: "FIVE",
		comment: "Esperienza autentica, niente pacchetto turistico. Grazie Flavia!",
		daysAgo: 150,
		avatar: null,
	},
	{
		id: "mock-marta",
		author: "Marta F.",
		stars: "FIVE",
		comment:
			"Abbiamo prenotato per un compleanno: atmosfere intime, storie di produttori, e un pranzo che ricordiamo ancora.",
		daysAgo: 180,
		avatar: 2,
	},
	{
		id: "mock-davide",
		author: "Davide L.",
		stars: "THREE",
		comment:
			"Interessante e ben condotto. Aspettative altissime dopo le altre recensioni: per noi è stato molto buono, non straordinario.",
		daysAgo: 200,
		avatar: 3,
	},
	{
		id: "mock-irene",
		author: "Irene C.",
		stars: "FIVE",
		comment:
			"Consiglio Spaghetti ABC a chiunque voglia la Puglia vera. Flavia è una guida rara: competente e calorosa.",
		daysAgo: 220,
		avatar: 4,
	},
];

function daysAgoIso(days: number): string {
	const d = new Date();
	d.setUTCDate(d.getUTCDate() - days);
	return d.toISOString();
}

export const MOCK_REVIEWS: MockGbpReview[] = SEEDS.map((seed) => {
	const parent = `accounts/${MOCK_ACCOUNT_ID}/locations/${MOCK_LOCATION_ID}`;
	const when = daysAgoIso(seed.daysAgo);
	const anonymous = seed.avatar === null;
	return {
		name: `${parent}/reviews/${seed.id}`,
		reviewId: seed.id,
		starRating: seed.stars,
		comment: seed.comment,
		createTime: when,
		updateTime: when,
		reviewer: {
			displayName: seed.author,
			isAnonymous: anonymous,
			profilePhotoUrl:
				anonymous || seed.avatar == null ? undefined : AVATARS[seed.avatar],
		},
	};
});

export const MOCK_AVERAGE_RATING = 4.8;
export const MOCK_TOTAL_REVIEW_COUNT = 48;

/** Simulate GBP pageSize=50 pagination (here pageSize=5 so multi-page is visible in logs/dev). */
export const MOCK_PAGE_SIZE = 5;

export function mockReviewPages(pageSize = MOCK_PAGE_SIZE): MockGbpReview[][] {
	const pages: MockGbpReview[][] = [];
	for (let i = 0; i < MOCK_REVIEWS.length; i += pageSize) {
		pages.push(MOCK_REVIEWS.slice(i, i + pageSize));
	}
	return pages;
}
