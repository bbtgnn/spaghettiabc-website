/**
 * One-shot transform: monolingual seed → EN canonical + IT translationOf pairs.
 * Run: node scripts/wave2-bilingual-seed.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const seedPath = resolve(root, "seed/seed.json");
const seed = JSON.parse(readFileSync(seedPath, "utf8"));

seed.defaultLocale = "en";
seed.settings = {
	...seed.settings,
	title: "Spaghetti ABC",
	// Shared brand tagline (EN). getSiteSettings has no locale in EmDash 1.6.
	tagline: "Travel and tours",
};

// calendly_url: decision wants translatable:false, but EmDash refuses that
// schema flip on existing local DBs ("requires a manual content migration").
// Apply after wipe:local / fresh D1 — do not set here until local DBs are reset.



function pt(text, keyPrefix) {
	return [
		{
			_type: "block",
			style: "normal",
			children: [{ _type: "span", text, _key: `${keyPrefix}-s` }],
			_key: `${keyPrefix}-b`,
		},
	];
}

function ptBlocks(paragraphs, keyPrefix) {
	return paragraphs.map((text, i) => ({
		_type: "block",
		style: "normal",
		children: [{ _type: "span", text, _key: `${keyPrefix}-s${i}` }],
		_key: `${keyPrefix}-b${i}`,
	}));
}

const tourSpecsEn = {
	duration: "3 hours",
	group_size: "Max 8 people",
	language: "Italian / English",
	included: "5 tastings + drinks",
	price: "€60 / person",
};

const tourSpecsIt = {
	duration: "3 ore",
	group_size: "Max 8 persone",
	language: "Italiano / Inglese",
	included: "5 degustazioni + bevande",
	price: "60 € / persona",
};

/** @type {Array<{enId:string,itId:string,enSlug:string,itSlug:string,en:object,it:object,media:object,calendly?:string}>} */
const tours = [
	{
		enId: "tour-polignano",
		itId: "tour-polignano-it",
		enSlug: "polignano-food-tour",
		itSlug: "tour-enogastronomico-polignano",
		calendly: "https://calendly.com/spaghettiabc/polignano-sensory-food-tour",
		media: {
			url: "https://images.unsplash.com/photo-1697310904924-ec1c03c8ba9b?w=1600&h=1067&fit=crop",
			filename: "polignano-food-tour.jpg",
			altEn: "Aerial view of Polignano a Mare on the sea",
			altIt: "Veduta aerea di Polignano a Mare sul mare",
		},
		en: {
			title: "Polignano food tour",
			excerpt: "Discover Apulian cuisine with all your senses",
			destination: "Polignano a Mare",
			content: [
				"A gastronomic stroll through the heart of Polignano to uncover the typical products of Puglia and its artisan shops, guided by Flavia Giordano, cookbook author, taster, and food educator.",
				"A sensory experience dedicated to those who want to delve into the culture of Apulian food, its agricultural excellences (PDO, DOC, Slow Food presidia), and gastronomic traditions.",
				"From coffee to “caffè speciale”, passing through caciocavallo and mozzarella, traditional breads, and the finest EVO oils from the best local olive mills, artisanal cold cuts, focaccias, preserves, and wines from native grape varieties – the sensory food tour is a roaming masterclass on Apulian cuisine.",
				"Flavia Giordano – who for several years managed the first Italian cooking school in Malmö, Sweden – will also share golden rules and tips with guests on how to shop and choose quality products, as well as recipes and cooking techniques.",
				"As a taster of oil, cheese, and wines, the sensory food tour will be a way to savor Apulian cuisine with all your senses.",
			],
		},
		it: {
			title: "Tour enogastronomico di Polignano",
			excerpt: "Scopri la cucina pugliese con tutti i sensi",
			destination: "Polignano a Mare",
			content: [
				"Una passeggiata gastronomica nel cuore di Polignano per scoprire i prodotti tipici della Puglia e le botteghe artigiane, guidata da Flavia Giordano, autrice di libri di cucina, assaggiatrice ed educatrice alimentare.",
				"Un’esperienza sensoriale dedicata a chi vuole approfondire la cultura del cibo pugliese, le eccellenze agricole (DOP, DOC, Presìdi Slow Food) e le tradizioni gastronomiche.",
				"Dal caffè al “caffè speciale”, passando per caciocavallo e mozzarella, pani tradizionali e i migliori oli EVO dei frantoi locali, salumi artigianali, focacce, conserve e vini di vitigni autoctoni: il sensory food tour è una masterclass itinerante sulla cucina pugliese.",
				"Flavia Giordano – che per diversi anni ha diretto la prima scuola di cucina italiana a Malmö, in Svezia – condividerà anche regole d’oro e consigli su come fare la spesa e scegliere prodotti di qualità, oltre a ricette e tecniche di cucina.",
				"Come assaggiatrice di olio, formaggi e vini, il tour sarà un modo per assaporare la cucina pugliese con tutti i sensi.",
			],
		},
	},
	{
		enId: "tour-bari",
		itId: "tour-bari-it",
		enSlug: "bari-food-tour",
		itSlug: "tour-enogastronomico-bari",
		media: {
			url: "https://upload.wikimedia.org/wikipedia/commons/c/cf/Bari_-_Lungomare_Araldo_di_Crollalanza.jpg",
			filename: "bari-food-tour.jpg",
			altEn: "Bari waterfront",
			altIt: "Lungomare di Bari",
		},
		en: {
			title: "Bari food tour",
			excerpt:
				"Between Bari Vecchia and the markets: focaccia, orecchiette, and street food of the Apulian capital.",
			destination: "Bari",
			content: [
				"Explore the local market stalls and the alleys of Bari Vecchia and taste the best artisanal specialties. An intimate experience for small groups, guided by local experts.",
			],
		},
		it: {
			title: "Tour enogastronomico di Bari",
			excerpt:
				"Tra Bari Vecchia e i mercati: focaccia, orecchiette e street food del capoluogo pugliese.",
			destination: "Bari",
			content: [
				"Esplora i banchi del mercato locale e i vicoli di Bari Vecchia ed assaggia le migliori specialità artigianali. Un’esperienza intima per piccoli gruppi guidata da esperti locali.",
			],
		},
	},
	{
		enId: "tour-ostuni",
		itId: "tour-ostuni-it",
		enSlug: "ostuni-food-tour",
		itSlug: "tour-enogastronomico-ostuni",
		media: {
			url: "https://images.unsplash.com/photo-1634561527613-172d7489214b?w=1600&h=1067&fit=crop",
			filename: "ostuni-food-tour.jpg",
			altEn: "Aerial view of Ostuni and olive groves",
			altIt: "Veduta aerea di Ostuni e degli oliveti",
		},
		en: {
			title: "Ostuni food tour",
			excerpt:
				"In the White City: olives, cheeses, and flavours of the Brindisi countryside among whitewashed alleys.",
			destination: "Ostuni",
			content: [
				"Walk among Ostuni’s white houses and taste specialties of the Brindisi Murgia. An intimate experience for small groups, guided by local experts.",
			],
		},
		it: {
			title: "Tour enogastronomico di Ostuni",
			excerpt:
				"Nella Città Bianca: olive, formaggi e sapori della campagna brindisina tra i vicoli imbiancati.",
			destination: "Ostuni",
			content: [
				"Cammina tra le case bianche di Ostuni e assaggia le specialità della Murgia brindisina. Un’esperienza intima per piccoli gruppi guidata da esperti locali.",
			],
		},
	},
	{
		enId: "tour-altamura",
		itId: "tour-altamura-it",
		enSlug: "altamura-food-tour",
		itSlug: "tour-enogastronomico-altamura",
		media: {
			url: "https://upload.wikimedia.org/wikipedia/commons/9/92/Puglia_Altamura1_tango7174.jpg",
			filename: "altamura-food-tour.jpg",
			altEn: "Cathedral and historic centre of Altamura",
			altIt: "Cattedrale e centro storico di Altamura",
		},
		en: {
			title: "Altamura food tour",
			excerpt:
				"PDO bread, wood-fired ovens, and Murgia flavours in Altamura’s historic centre.",
			destination: "Altamura",
			content: [
				"Discover the historic bakeries and shops of Altamura, the city of PDO bread. An intimate experience for small groups, guided by local experts.",
			],
		},
		it: {
			title: "Tour enogastronomico di Altamura",
			excerpt:
				"Pane DOP, forni a legna e sapori della Murgia nel centro storico di Altamura.",
			destination: "Altamura",
			content: [
				"Scopri i panifici storici e le botteghe di Altamura, città del pane DOP. Un’esperienza intima per piccoli gruppi guidata da esperti locali.",
			],
		},
	},
	{
		enId: "tour-monopoli",
		itId: "tour-monopoli-it",
		enSlug: "monopoli-food-tour",
		itSlug: "tour-enogastronomico-monopoli",
		media: {
			url: "https://images.unsplash.com/photo-1682347641333-b9080bfe7af3?w=1600&h=1067&fit=crop",
			filename: "monopoli-food-tour.jpg",
			altEn: "Aerial view of Monopoli on the sea",
			altIt: "Veduta aerea di Monopoli sul mare",
		},
		en: {
			title: "Monopoli food tour",
			excerpt:
				"From the old harbour to the shops: fish, fritters, and specialties of Monopoli’s historic centre.",
			destination: "Monopoli",
			content: [
				"Explore Monopoli’s alleys and harbour and taste the best artisanal specialties. An intimate experience for small groups, guided by local experts.",
			],
		},
		it: {
			title: "Tour enogastronomico di Monopoli",
			excerpt:
				"Dal porto antico alle botteghe: pesce, fritti e specialità del centro storico di Monopoli.",
			destination: "Monopoli",
			content: [
				"Esplora i vicoli e il porto di Monopoli ed assaggia le migliori specialità artigianali. Un’esperienza intima per piccoli gruppi guidata da esperti locali.",
			],
		},
	},
	{
		enId: "tour-narrative-dinner",
		itId: "tour-narrative-dinner-it",
		enSlug: "narrative-dinner",
		itSlug: "cena-narrata",
		media: {
			url: "https://images.unsplash.com/photo-1672636401322-b909b15b7c57?w=1600&h=1067&fit=crop",
			filename: "narrative-dinner.jpg",
			altEn: "Table with a plate and a glass of wine",
			altIt: "Tavola con piatto e calice di vino",
		},
		en: {
			title: "Narrative dinner",
			excerpt:
				"A storytelling dinner: dishes, stories, and Apulian landscapes at the table, in an intimate evening experience.",
			destination: "Narrative dinner",
			included: "Tasting menu + drinks",
			content: [
				"An evening at the table where every course opens a story about Puglia. An intimate experience for small groups, guided by Flavia.",
			],
		},
		it: {
			title: "Cena narrata",
			excerpt:
				"Una cena raccontata: piatti, storie e paesaggi pugliesi a tavola, in un’esperienza serale intima.",
			destination: "Cena narrata",
			included: "Menù degustazione + bevande",
			content: [
				"Una serata a tavola in cui ogni portata apre un racconto sulla Puglia. Un’esperienza intima per piccoli gruppi, guidata da Flavia.",
			],
		},
	},
	{
		enId: "tour-mice-sensory",
		itId: "tour-mice-sensory-it",
		enSlug: "mice-sensory-food-quiz",
		itSlug: "mice-quiz-sensoriale",
		media: {
			url: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=1600&h=1067&fit=crop",
			filename: "mice-sensory-food-quiz.jpg",
			altEn: "Group at the table during a shared experience",
			altIt: "Gruppo a tavola durante un’esperienza condivisa",
		},
		en: {
			title: "MICE and team building — Sensory food quiz",
			excerpt:
				"A sensory food quiz for teams and corporate groups: taste, storytelling, and collaboration around the table.",
			destination: "MICE & team building",
			included: "Sensory activity + tastings",
			content: [
				"A MICE and team-building format that uses food as a tool for play and listening: sensory quizzes, tastings, and group exchange.",
			],
		},
		it: {
			title: "MICE e team building — Quiz sensoriale",
			excerpt:
				"Quiz sensoriale sul cibo per team e gruppi aziendali: gusto, racconto e collaborazione intorno alla tavola.",
			destination: "MICE & team building",
			included: "Attività sensoriale + degustazioni",
			content: [
				"Un formato MICE e team building che usa il cibo come strumento di gioco e ascolto: quiz sensoriali, assaggi e confronto in gruppo.",
			],
		},
	},
	{
		enId: "tour-customized",
		itId: "tour-customized-it",
		enSlug: "customized-experience",
		itSlug: "esperienza-su-misura",
		media: {
			url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&h=1067&fit=crop",
			filename: "customized-experience.jpg",
			altEn: "Set table for a gastronomic experience",
			altIt: "Tavola apparecchiata per un’esperienza gastronomica",
		},
		en: {
			title: "Customized experience",
			excerpt:
				"A tailored experience around Apulian food: itinerary, pace, and tastings built together with you.",
			destination: "Tailored",
			included: "Custom path and tastings",
			content: [
				"Start from an idea — family, team, international guests — and we build the right format together: places, timing, and flavours of Puglia.",
			],
		},
		it: {
			title: "Esperienza su misura",
			excerpt:
				"Un’esperienza su misura intorno al cibo pugliese: itinerario, ritmo e degustazioni costruiti insieme a te.",
			destination: "Su misura",
			included: "Percorso e degustazioni personalizzati",
			content: [
				"Parti da un’idea — famiglia, team, ospiti internazionali — e costruiamo insieme il formato giusto: luoghi, tempi e sapori della Puglia.",
			],
		},
	},
];

function tourEntry(t, locale) {
	const copy = locale === "en" ? t.en : t.it;
	const specs = locale === "en" ? tourSpecsEn : tourSpecsIt;
	const entry = {
		id: locale === "en" ? t.enId : t.itId,
		slug: locale === "en" ? t.enSlug : t.itSlug,
		locale,
		status: "published",
		data: {
			title: copy.title,
			excerpt: copy.excerpt,
			destination: copy.destination,
			duration: specs.duration,
			group_size: specs.group_size,
			language: specs.language,
			included: copy.included ?? specs.included,
			price: specs.price,
			featured_image: {
				$media: {
					url: t.media.url,
					alt: locale === "en" ? t.media.altEn : t.media.altIt,
					filename: t.media.filename,
				},
			},
			content: ptBlocks(copy.content, `${t.enId}-${locale}`),
		},
	};
	if (t.calendly) entry.data.calendly_url = t.calendly;
	if (locale === "it") entry.translationOf = t.enId;
	return entry;
}

const tourContent = [];
for (const t of tours) {
	tourContent.push(tourEntry(t, "en"));
	tourContent.push(tourEntry(t, "it"));
}

const featuredEn = tours.map((t) => `$ref:${t.enId}`);
const featuredIt = tours.map((t) => `$ref:${t.itId}`);

const partnerLogos = (locale) => [
	{
		name: "Ciccolella",
		logo: {
			$media: {
				file: "media/collaborazioni-logos/logo_ciccolella.webp",
				alt: locale === "en" ? "Ciccolella logo" : "Logo Ciccolella",
				filename: "logo_ciccolella.webp",
			},
		},
	},
	{
		name: "Evolio Expo",
		logo: {
			$media: {
				file: "media/collaborazioni-logos/logo_evolio_expo.webp",
				alt: locale === "en" ? "Evolio Expo logo" : "Logo Evolio Expo",
				filename: "logo_evolio_expo.webp",
			},
		},
	},
	{
		name: "FIOI",
		logo: {
			$media: {
				file: "media/collaborazioni-logos/logo_fioi.webp",
				alt: locale === "en" ? "FIOI logo" : "Logo FIOI",
				filename: "logo_fioi.webp",
			},
		},
	},
	{
		name: "Gambero Rosso",
		logo: {
			$media: {
				file: "media/collaborazioni-logos/logo_gambero_rosso.webp",
				alt: locale === "en" ? "Gambero Rosso logo" : "Logo Gambero Rosso",
				filename: "logo_gambero_rosso.webp",
			},
		},
	},
	{
		name: "Slow Food",
		logo: {
			$media: {
				file: "media/collaborazioni-logos/logo_slow_food.webp",
				alt: locale === "en" ? "Slow Food logo" : "Logo Slow Food",
				filename: "logo_slow_food.webp",
			},
		},
	},
	{
		name: "TEDx",
		logo: {
			$media: {
				file: "media/collaborazioni-logos/logo_tedx.webp",
				alt: locale === "en" ? "TEDx logo" : "Logo TEDx",
				filename: "logo_tedx.webp",
			},
		},
	},
];

/** Shared Google review quotes (decision: not re-translated). */
const googleReviews = [
	{
		author: "Chiara R.",
		quote:
			"Un’esperienza bellissima: Flavia ci ha fatto conoscere la Puglia attraverso i sapori, con calma e competenza. Consigliatissima!",
		rating: 5,
		review_url:
			"https://www.google.com/maps/search/?api=1&query=Spaghetti+ABC+recensione+Chiara",
		avatar: {
			$media: {
				url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&h=128&fit=crop&crop=face",
				alt: "Chiara R. profile photo",
				filename: "review-avatar-chiara.jpg",
			},
		},
	},
	{
		author: "Marco D.",
		quote:
			"Tour impeccabile. Prodotti locali, storie vere e una guida che sa davvero di cosa parla. Torneremo senz’altro.",
		rating: 5,
		review_url:
			"https://www.google.com/maps/search/?api=1&query=Spaghetti+ABC+recensione+Marco",
		avatar: {
			$media: {
				url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=128&h=128&fit=crop&crop=face",
				alt: "Marco D. profile photo",
				filename: "review-avatar-marco.jpg",
			},
		},
	},
	{
		author: "Elena B.",
		quote:
			"Atmosfera familiare e contenuti di qualità. Si sente la cura in ogni dettaglio, dal mercato alla tavola.",
		rating: 5,
		review_url:
			"https://www.google.com/maps/search/?api=1&query=Spaghetti+ABC+recensione+Elena",
		avatar: {
			$media: {
				url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=128&h=128&fit=crop&crop=face",
				alt: "Elena B. profile photo",
				filename: "review-avatar-elena.jpg",
			},
		},
	},
	{
		author: "Luca P.",
		quote:
			"Non è turismo di massa: è un viaggio guloso e intelligente. Vorremmo solo che durasse più a lungo!",
		rating: 5,
		review_url:
			"https://www.google.com/maps/search/?api=1&query=Spaghetti+ABC+recensione+Luca",
		avatar: {
			$media: {
				url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=128&h=128&fit=crop&crop=face",
				alt: "Luca P. profile photo",
				filename: "review-avatar-luca.jpg",
			},
		},
	},
	{
		author: "Sofia M.",
		quote:
			"Flavia racconta la Puglia con grazia e precisione. Ogni assaggio ha una storia: ce ne siamo innamorati.",
		rating: 5,
		review_url:
			"https://www.google.com/maps/search/?api=1&query=Spaghetti+ABC+recensione+Sofia",
		avatar: {
			$media: {
				url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=128&h=128&fit=crop&crop=face",
				alt: "Sofia M. profile photo",
				filename: "review-avatar-sofia.jpg",
			},
		},
	},
];

function homepageData(locale) {
	const isEn = locale === "en";
	return {
		hero_title: isEn ? "Puglia: Beyond the Plate" : "Puglia: oltre il piatto",
		hero_subtitle: isEn
			? "Culinary Experiences Curated by Flavia Giordano"
			: "Esperienze culinarie a cura di Flavia Giordano",
		hero_image: {
			$media: {
				file: "media/cover-newsletter-ingredient.jpg",
				alt: isEn
					? "Ingredients and oil — Spaghetti ABC homepage hero"
					: "Ingredienti e olio — hero homepage Spaghetti ABC",
				filename: "cover-newsletter-ingredient.jpg",
			},
		},
		tour_title: isEn ? "Flavia’s tours" : "I tour di Flavia",
		tour_subtitle: isEn
			? "Guided experiences in one Puglia town, among local flavours and encounters"
			: "Esperienze guidate in un paese della Puglia, tra sapori locali e incontri",
		tour_cta_label: isEn ? "See all tours" : "Vedi tutti i tour",
		featured_tours: isEn ? featuredEn : featuredIt,
		book_title: isEn ? "The book" : "Il libro",
		book_subtitle: isEn
			? "Puglia told through places, flavours, and encounters"
			: "Puglia raccontata attraverso luoghi, sapori e incontri",
		book_cta_label: isEn ? "Discover the book" : "Scopri il libro",
		// Must resolve after content.libri is seeded — keep libri before homepage in seed.content.
		featured_books: isEn
			? ["$ref:international", "$ref:special"]
			: ["$ref:international-it", "$ref:special-it"],
		book_image: {
			$media: {
				file: "media/copertina-libro.jpg",
				alt: isEn ? "Cover of the book Puglia" : "Copertina del libro Puglia",
				filename: "copertina-libro.jpg",
			},
		},
		training_title: isEn ? "Training" : "Formazione",
		training_subtitle: isEn
			? "Paths and meetings for companies and professionals, around food culture"
			: "Percorsi e incontri per aziende e professionisti, intorno alla cultura del cibo",
		training_cta_label: isEn ? "Discover training" : "Scopri la formazione",
		dicono_title: isEn ? "They say about me" : "Dicono di me",
		dicono_subtitle: isEn
			? "Partners and reviews from those who shared table, markets, and stories with Flavia"
			: "Partner e recensioni di chi ha condiviso tavola, mercati e storie con Flavia",
		partner_logos: partnerLogos(locale),
		google_score: 5,
		google_review_count: 48,
		google_profile_url:
			"https://www.google.com/maps/search/?api=1&query=Spaghetti+ABC+Flavia+Giordano",
		google_reviews: googleReviews,
		newsletter_title: "Newsletter",
		newsletter_subtitle: isEn
			? "Seasonal recipes, events, and news — straight from Flavia’s kitchen"
			: "Ricette di stagione, eventi e novità — direttamente dalla cucina di Flavia",
		newsletter_button_label: isEn ? "Subscribe" : "Iscriviti",
		newsletter_email_placeholder: isEn ? "Your email" : "La tua email",
	};
}

// Rebuild content so key order is seed apply order. `libri` must precede
// `homepage` or featured_books $ref: targets are skipped as unresolved.
const existingLibri = seed.content.libri;
seed.content = {
	tours: tourContent,
	libri: existingLibri,
	homepage: [
		{
			id: "home",
			slug: "home",
			locale: "en",
			status: "published",
			data: homepageData("en"),
		},
		{
			id: "home-it",
			slug: "home",
			locale: "it",
			translationOf: "home",
			status: "published",
			data: homepageData("it"),
		},
	],
	training: [
	{
		id: "training",
		slug: "training",
		locale: "en",
		status: "published",
		data: {
			title: "Training for companies",
			subtitle: "Food culture for teams and professionals",
			excerpt:
				"Paths and meetings built around food culture — placeholder to replace.",
			cover: {
				$media: {
					url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&h=1067&fit=crop",
					alt: "Set table, training placeholder",
					filename: "training-cover.jpg",
				},
			},
			content: ptBlocks(
				[
					"This is the Training landing. The text is a placeholder: replace it from the admin with the description of paths for companies and professionals.",
					"Formats, audiences, and contact details will go here.",
				],
				"training-en",
			),
		},
	},
	{
		id: "training-it",
		slug: "training",
		locale: "it",
		translationOf: "training",
		status: "published",
		data: {
			title: "Formazione per aziende",
			subtitle: "Cultura del cibo per team e professionisti",
			excerpt:
				"Percorsi e incontri costruiti intorno alla cultura del cibo — placeholder da sostituire.",
			cover: {
				$media: {
					url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&h=1067&fit=crop",
					alt: "Tavolo apparecchiato, placeholder formazione",
					filename: "training-cover.jpg",
				},
			},
			content: ptBlocks(
				[
					"Questa è la landing Formazione. Il testo è un placeholder: sostituiscilo dall’admin con la descrizione dei percorsi per aziende e professionisti.",
					"Qui andranno formato degli incontri, pubblici di riferimento e modalità di contatto.",
				],
				"training-it",
			),
		},
	},
	],
	site_globals: [
		{
			id: "site",
			slug: "site",
			locale: "en",
			status: "published",
			data: {
				calendly_url: "https://calendly.com/spaghettiabc/tailored-tour",
				faq: [
					{
						question: "What happens if it rains?",
						answer:
							"Our tours run as planned in light rain. In case of severe weather alerts, we will contact you to reschedule or refund.",
					},
					{
						question: "Can I join if I have intolerances or am vegetarian?",
						answer:
							"Absolutely! Note it in the booking form above and we will adapt the tour stops to your dietary needs.",
					},
					{
						question: "How does payment work?",
						answer:
							"Once you send the request on Calendly, you will receive the direct SumUp link to pay and confirm your spots.",
					},
					{
						question: "What is the cancellation policy?",
						answer:
							"Free cancellation and 100% refund up to 48 hours before the tour.",
					},
				],
			},
		},
		{
			id: "site-it",
			slug: "site",
			locale: "it",
			translationOf: "site",
			status: "published",
			data: {
				calendly_url: "https://calendly.com/spaghettiabc/tailored-tour",
				faq: [
					{
						question: "Cosa succede in caso di pioggia?",
						answer:
							"I nostri tour si svolgono regolarmente anche in caso di pioggia leggera. In caso di allerte meteo gravi, ti contatteremo per riprogrammare o rimborsare.",
					},
					{
						question: "Posso partecipare se ho intolleranze o sono vegetariano?",
						answer:
							"Assolutamente sì! Indicalo nel modulo di prenotazione qui sopra e adatteremo le tappe del tour alle tue esigenze alimentari.",
					},
					{
						question: "Come funziona il pagamento?",
						answer:
							"Una volta inviata la richiesta su Calendly, riceverai il link diretto SumUp per saldare e confermare definitivamente i posti.",
					},
					{
						question: "Qual è la politica di cancellazione?",
						answer:
							"Cancellazione gratuita e rimborso al 100% fino a 48 ore prima del tour.",
					},
				],
			},
		},
	],
};

seed.menus = [
	{
		id: "menu-primary-en",
		name: "primary",
		label: "Primary Navigation",
		locale: "en",
		items: [
			{ type: "custom", label: "Home", url: "/" },
			{ type: "custom", label: "Tours", url: "/tours" },
			{ type: "custom", label: "The book", url: "/#libro" },
			{ type: "custom", label: "Training", url: "/training" },
		],
	},
	{
		id: "menu-primary-it",
		name: "primary",
		label: "Navigazione principale",
		locale: "it",
		translationOf: "menu-primary-en",
		items: [
			{ type: "custom", label: "Home", url: "/it/" },
			{ type: "custom", label: "Tour", url: "/it/tours" },
			{ type: "custom", label: "Il libro", url: "/it/#libro" },
			{ type: "custom", label: "Formazione", url: "/it/training" },
		],
	},
];

writeFileSync(seedPath, `${JSON.stringify(seed, null, "\t")}\n`, "utf8");
console.log(
	`Wrote bilingual seed: ${tourContent.length} tours, homepage/libri/training/site_globals + menus`,
);
