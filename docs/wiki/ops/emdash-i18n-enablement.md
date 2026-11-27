# EmDash + Astro i18n enablement (#41)

Historical research notes for agents implementing full IT/EN bilingual routing and CMS locales. **As of 2026-11-26** on branch `feat/41-full-i18n` at baseline commit [`59a8b3c`](https://github.com/bbtgnn/spaghettiabc-website/commit/59a8b3c72f3387722528e8976c99677a0b12889b): **no application i18n landed yet** (Italian-only chrome, unprefixed URLs, monolingual seed).

## Sources

| Source | Role |
| ------ | ---- |
| [Decision: Full IT/EN i18n](../decisions/i18n-it-en.md) | Product constraints (EN default, prefixed URLs, field matrix, out-of-scope collections) |
| [Issue #41](https://github.com/bbtgnn/spaghettiabc-website/issues/41) | Tracking |
| [Issue #41 status](./issue-41-status.md) | CoS checklist |
| `package.json` | `emdash` **^1.6.0** (resolved **1.6.0** in `node_modules`) |
| `node_modules/emdash/dist/*` | Runtime APIs (EmDash docs MCP was not available in the authoring agent session; package sources used) |
| `.agents/skills/building-emdash-site/references/querying-and-rendering.md` | `getEmDashCollection` / `getEmDashEntry` `locale` option |

## Baseline site shape (pre-i18n @ `59a8b3c`)

- **`astro.config.mjs`** — Cloudflare + `emdash()` integration; **no** `i18n` block.
- **`src/layouts/Base.astro`** — `getSiteSettingsWithCacheHint()`, `getMenuWithCacheHint("primary")` with **no** locale; `<html lang="it">` hardcoded.
- **`src/components/SiteHeader.astro`** — Italian UI chrome (`Principale`, `Apri menu`, …); brand `href="/"`; **no** language switcher.
- **In-scope routes (unprefixed)** — `/`, `/tours`, `/tours/[slug]`, `/puglia-the-book`, `/training`; queries use bare slugs (`home`, `site`, `training`, `puglia-the-book`, tour slugs).
- **`seed/seed.json`** — Single-locale content; no `locale` / `translationOf` on entries or menus.
- **Out of scope (#41)** — `posts`, `pages`, `category`, `tag` (leave monolingual; plan URL behaviour when `/en/...` is live).

## Recommended Astro config (decision-aligned)

EmDash reads Astro’s `i18n` via its integration (`normalizeAstroI18n` in `emdash` 1.6.0) and mirrors it into `virtual:emdash/config` → `setI18nConfig()` in middleware. **Do not** duplicate locale lists in `emdash()` options.

```javascript
// astro.config.mjs — additive block inside defineConfig({ ... })
i18n: {
	defaultLocale: "en",
	locales: ["en", "it"],
	routing: {
		prefixDefaultLocale: true,
		redirectToDefaultLocale: true, // / → /en/
	},
	// Field-level CMS fallback (safety net): requested → EN → IT per decision
	fallback: {
		it: "en",
		en: "it",
	},
},
```

Notes from `emdash` 1.6.0:

- `isI18nEnabled()` is true when **more than one** locale is configured.
- `getFallbackChain(locale)` walks `fallback` then ensures `defaultLocale` is in the chain (`config-Cs_AwWXI.mjs`).
- `prefixDefaultLocale` is copied into EmDash’s `I18nConfig` for menu URLs, sitemap, hreflang, and `localizePath` (internal).

EmDash registers middleware automatically (`emdash/middleware`, including request context). No extra project `src/middleware.ts` is required unless custom logic is needed.

## Passing locale into EmDash queries

### Resolution order (1.6.0)

From `resolveLocale` / `getEmDashEntry` (`query-CslUTGOV.mjs`, `resolve-Z5YK_6ew.mjs`):

1. Explicit option: `getEmDashEntry("tours", slug, { locale: "it" })` or `getEmDashCollection("tours", { locale: "it", ... })`.
2. Else **request context** locale (set from Astro’s `currentLocale` during HTML requests — see middleware `prefetchLayoutData(context.currentLocale)`).
3. Else when i18n is enabled, **`defaultLocale`** for collection/entry reads.

**Recommendation for this site:** In page frontmatter, pass **`locale: Astro.currentLocale`** (or a small helper) on every in-scope `getEmDashEntry` / `getEmDashCollection` / reference hydration until behaviour is verified under dev. Layout chrome should pass locale into `getMenuWithCacheHint("primary")` via the same pattern used by `getMenu(name, { locale })` in `menus-BzjHvAM4.mjs`.

`getSiteSettings` / `getSiteSettingsWithCacheHint` (**1.6.0**): no `locale` parameter on the public API — **see risks** for `title` / `tagline`.

### APIs for routing and switcher

| API | Package export | Use on this site |
| ----- | ---------------- | ---------------- |
| `getTranslations(collection, entry.data.id)` | `emdash` | `SiteHeader` switcher: paired slug per target locale |
| `getHreflangAlternates(collection, id, { siteUrl })` | `emdash` | Optional `<link rel="alternate">` on tour/libro/training/home |
| `getFallbackChain`, `getI18nConfig`, `isI18nEnabled` | `emdash` | Debugging / conditional UI |
| `localizePath` | **Not** re-exported from `emdash` main entry (internal in `resolve-Z5YK_6ew.mjs`) | Prefer **`getRelativeLocaleUrl`** / **`getAbsoluteLocaleUrl`** from `astro:i18n` for hardcoded paths in components |
| `resolveEmDashPath` | `emdash` | Optional dynamic CMS-driven routes; not used in baseline pages |

**Language switcher (decision #8):** On content pages, `Base` already accepts optional `content?: { collection, id, slug }`. Load `getTranslations(content.collection, content.id)`, find the row for the target locale, build URL with `getRelativeLocaleUrl(targetLocale, \`/${collectionSegment}/${slug}\`)` (or collection `urlPattern` + slug). If no translation, link to `getRelativeLocaleUrl(targetLocale, "/")`.

Menus: with i18n enabled, seed **per-locale** `primary` menus; `getMenu` resolves item URLs with locale prefixes when items are content refs (`resolveLocalizedContentRoutePath`). Custom `url` items in seed must be updated to locale-aware paths or replaced with content refs.

## Seed translation pattern (EmDash 1.6.0 `apply.ts`)

Default locale for seed:apply: `getI18nConfig()?.defaultLocale ?? seed.defaultLocale ?? "en"`.

### Content entries

```json
{
	"content": {
		"tours": [
			{
				"id": "seed-tour-polignano-en",
				"slug": "polignano-food-tour",
				"locale": "en",
				"status": "published",
				"data": { "title": "Polignano food tour", "calendly_url": "https://..." }
			},
			{
				"id": "seed-tour-polignano-it",
				"slug": "tour-enogastronomico-polignano",
				"locale": "it",
				"translationOf": "seed-tour-polignano-en",
				"status": "published",
				"data": { "title": "Tour enogastronomico Polignano", "calendly_url": "https://..." }
			}
		]
	}
}
```

Rules:

- **`translationOf`** references the **seed `id`** of the source row (must appear **earlier** in the same collection array or be created in a prior apply pass).
- **`locale`** optional; omitted rows inherit `defaultLocale`.
- **`slug`** may differ per locale (decision: independent slugs per locale).
- **`calendly_url`**, shared media `$media` refs: same file across locales; only translatable fields differ per [field matrix](../decisions/i18n-it-en.md).
- **References** (`featured_tours`, etc.): point at seed ids that resolve to **same-locale** tour rows after translation groups exist; EmDash resolves reference pages by `translation_group` + request locale (`attachReferences` in `query-CslUTGOV.mjs`).

### Singletons

| Collection | Baseline slug @ `59a8b3c` | Wave 2 note |
| ---------- | ------------------------- | ----------- |
| `homepage` | `home` | Two rows (`locale` en/it), same or paired slugs per editorial choice; IT/EN copy for hero/section CTAs |
| `site_globals` | `site` | FAQ translatable; `calendly_url` shared |
| `training` | `training` | Singleton per locale + `translationOf` |
| `libri` | `puglia-the-book` | Independent slugs per locale allowed |

### Menus

```json
{
	"menus": [
		{
			"name": "primary",
			"locale": "en",
			"items": [
				{ "type": "custom", "label": "Home", "url": "/en/" },
				{ "type": "custom", "label": "Tours", "url": "/en/tours" }
			]
		},
		{
			"name": "primary",
			"locale": "it",
			"translationOf": "<seed-id-of-en-primary-menu-if-used>",
			"items": [
				{ "type": "custom", "label": "Home", "url": "/it/" },
				{ "type": "custom", "label": "Tour", "url": "/it/tours" }
			]
		}
	]
}
```

Optional top-level **`"defaultLocale": "en"`** in `seed.json` when applying before Astro i18n virtual config is warm (CLI / CI).

### Site `settings` block

`seed.settings` is applied once via `applySiteSettings` — **not** per-locale in 1.6.0 apply path. Per-locale **site title/tagline** from the decision may require admin/options strategy or storing display copy in `homepage` / globals; verify before seeding.

## UI chrome dictionary (decision #9)

Add **`src/i18n/ui.ts`** (or `src/i18n/ui/en.ts` + `it.ts`) keyed by locale:

- `SiteHeader`: nav aria, menu open/close, mobile dialog labels.
- Shared labels not in CMS: newsletter section, scheda tour “back to catalog” if hardcoded, 404 copy (baseline `404.astro` is English while `Base` claims `lang="it"`).

Import `t(locale, key)` (or similar) from components; **do not** put these strings in EmDash collections.

## Implementation waves (file touch list)

### Wave 1 — config + UI strings + `lang` + switcher (no full seed)

Ordered for minimal breakage:

1. `astro.config.mjs` — `i18n` block above.
2. `src/i18n/ui.ts` — EN/IT chrome strings.
3. `src/i18n/utils.ts` (recommended) — `currentLocale`, `localePath()`, thin wrappers over `astro:i18n`.
4. `src/layouts/Base.astro` — `lang={Astro.currentLocale ?? "en"}`; pass `locale` into menu/settings calls when API supports it; optional `hreflang` hook placeholder.
5. `src/components/SiteHeader.astro` — consume UI dict; `getRelativeLocaleUrl` for brand home; language switcher UI (paired entry when `content` prop + `getTranslations`, else locale home).
6. `src/pages/404.astro` — localized copy + home link via `getRelativeLocaleUrl`.

**Wave 1 does not** update CMS queries or `seed/seed.json`. Expect mixed behaviour until Wave 2: unprefixed hardcoded links in untouched pages/components will 404 or miss locale prefix.

### Wave 2 — queries + seed + hardcoded routes

1. `seed/seed.json` — full EN+IT rows, menus, `translationOf` graph; optional `defaultLocale`.
2. `src/pages/index.astro` — locale-aware queries; localized internal links (`/tours`, `/puglia-the-book`, `/training`).
3. `src/pages/tours/index.astro` — `getEmDashCollection(..., { locale })`.
4. `src/pages/tours/[slug].astro` — entry + `site_globals`; FAQ; Calendly; pass `content` to `Base` for switcher.
5. `src/pages/puglia-the-book.astro` — `libri` entry by locale (slug per locale).
6. `src/pages/training.astro` — singleton by locale.
7. `src/components/SezioneTour.astro`, `TourLargeCard.astro`, `TourTeaser.astro`, `scheda-tour/SchedaTourHeroPrenotaSplit.astro`, `CompactReviewRail.astro` — prefix-aware `href`s.
8. `src/utils/site-identity.ts` — if site title/tagline sourcing changes with locale.
9. `GLOSSARY.md` / wiki — keep aligned (Locale vs tour `language` field).

**Unchanged in #41:** `src/pages/posts/**`, `[slug].astro` (pages), `category/**`, `tag/**` — document whether they remain unprefixed or are excluded from localized routing.

## Open risks and unknowns

1. **Site settings monolingual API** — `getSiteSettings()` has no `locale` in 1.6.0; decision wants per-locale `title` / `tagline`. **Wave 2 workaround (2026-11-26):** keep shared `settings.title` (`Spaghetti ABC`) + EN brand `settings.tagline` (`Travel and tours`); per-locale marketing copy on `homepage` / other collections. Do not invent a locale-scoped settings API. See [issue-41-status](./issue-41-status.md).
2. **Astro vs content fallback** — Astro `fallback: { it: "en" }` cannot express requested → EN → IT (defaultLocale cannot be a fallback key). EmDash `getFallbackChain` follows Astro. Wave 2: `getEmDashEntryWithFallback` in `src/i18n/utils.ts` for entry lookup; seed both locales fully.
3. **Singleton + reference graph** — `homepage` / `site_globals` / `featured_tours` must resolve locale-consistent tour targets; wrong seed order breaks `translationOf` and reference hydration. Wave 2 seed uses same-locale `$ref`s for `featured_tours`.
4. **Hardcoded href sweep** — Wave 2 updated in-scope pages/components to `localePath` / `t()`; out-of-scope blog routes remain unprefixed.
5. **Tour `language` vs site locale** — Same tour row carries spoken-language copy (`language` field) and CMS `locale`; editors and templates must not conflate (see `GLOSSARY.md` **Locale**).
6. **Non-translatable + shared fields** — `calendly_url`, media assets, Google review quotes (decision: not re-translated) must stay identical across translation groups; translatable FAQ/homepage strings must not be edited only on one locale. Wave 2 sets `calendly_url.translatable: false` on tours + site_globals.
7. **Field `translatable` schema flags** — If collections lack correct `translatable` metadata, EmDash may store values in the wrong table; audit collection definitions when enabling i18n (migrations ship with 1.6.0).
8. **Local DB lag** — Existing local D1 may still hold monolingual rows until `npm run seed` / wipe + re-seed.
9. **Blog/posts URL** — Monolingual posts under `/posts` may conflict with “all public routes prefixed”; clarify redirect or exclusion before launch.

## Verification checklist (post-implementation)

- [ ] `/` → `/en/`; `/en/...` and `/it/...` render for home, tours, scheda, libro, training.
- [ ] `getEmDashEntry("homepage", "home", { locale: "it" })` returns IT row when seeded.
- [ ] Switcher jumps to paired slug when translation exists; otherwise locale home.
- [ ] `<html lang>` matches `Astro.currentLocale`.
- [ ] Primary menu labels and URLs match active locale.
- [ ] Scheda Tour Calendly + FAQ still resolve (`site_globals` locale row).
- [ ] `npm run seed` / fresh D1 apply creates full translation graph without `translationOf` warnings in console.

## Related commands

```bash
bun dev
npm run seed   # after seed.json locale pairs exist
npx emdash types
```