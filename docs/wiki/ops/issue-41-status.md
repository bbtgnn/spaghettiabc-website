# Issue #41 status (CoS)

## Sources

- Issue [#41](https://github.com/bbtgnn/spaghettiabc-website/issues/41)
- [Decision: Full IT/EN i18n](../decisions/i18n-it-en.md) (grill closed 2026-11-26)
- [EmDash + Astro i18n enablement](./emdash-i18n-enablement.md) (Wave file order + risks)
- Glossary: [`GLOSSARY.md`](../../../GLOSSARY.md) — **Locale**
- Branch: `feat/41-full-i18n`

## Timeline

- **2026-11-26** — Grill closed on `feat/41-full-i18n`. Chiara locked EN default, IT secondary, prefixed URLs, EmDash locales, field matrix, and out-of-scope blog collections. Recorded in [i18n-it-en](../decisions/i18n-it-en.md).
- **2026-11-26** — Research / enablement notes written in [emdash-i18n-enablement](./emdash-i18n-enablement.md) (pre-implementation baseline @ `59a8b3c`).
- **2026-11-26** — **Wave 1 landed** (config + UI chrome + `lang` + language switcher; no seed / query rewiring). Files:
  - `astro.config.mjs` — Astro `i18n` (`defaultLocale: en`, `locales: [en, it]`, `prefixDefaultLocale` + `redirectToDefaultLocale`; Astro `fallback` is `it → en` only — defaultLocale cannot be a fallback key)
  - `src/i18n/ui.ts` — typed EN/IT UI chrome dictionary
  - `src/utils/i18n.ts` — `t()`, `localePath()`, prefix-swap / content path helpers (`astro:i18n`)
  - `src/layouts/Base.astro` — `lang` from `Astro.currentLocale`; skip-link via dict; menu fetch with `{ locale }`
  - `src/components/SiteHeader.astro` — UI dict; locale-prefixed brand/menu hrefs; IT|EN switcher
  - `src/pages/404.astro` — locale-aware copy + home link
  - See [enablement Wave 1](./emdash-i18n-enablement.md#implementation-waves-file-touch-list)
- **2026-11-26** — **Wave 2 landed** (bilingual seed + locale-aware queries + hardcoded href sweep for in-scope surfaces). Files touched summary:
  - `seed/seed.json` — `defaultLocale: en`; EN canonical + IT `translationOf` for tours (16 rows), homepage, `libri`, `training`, `site_globals`; per-locale `primary` menus (`/en/...`, `/it/...`); shared settings title / EN tagline
  - Bilingual content lives in `seed/seed.json` only (Wave 2 one-shot generator removed after apply)
  - `src/utils/i18n.ts` — `contentLocaleChain`, `getEmDashEntryWithFallback` (requested → EN → IT)
  - `src/i18n/ui.ts` — catalog / scheda / newsletter / empty-state chrome keys
  - Pages: `index`, `tours/index`, `tours/[slug]`, `puglia-the-book`, `training` — `{ locale }` queries, `content` → Base, `localePath` hrefs
  - Components: `SezioneTour`, `TourLargeCard`, `CompactReviewRail`, `SchedaTourHeroPrenotaSplit`, `CalendlyEmbed`
  - Wiki: this file + [enablement](./emdash-i18n-enablement.md) site-settings note
- **2026-11-26** — **Wave 3 verify + polish** — see Wave 3 section (routing folders, drop Astro URL fallback, seed Wrangler D1, orphan homepage fix, `entrySlug`).

## Implementation checklist (agent)

1. Astro i18n; EN unprefixed + `/it/...` for in-scope routes (both-prefixed `/en/...` reverted for EmDash admin). — **Done**; see EN unprefix section + **AGENTS.md**.
2. EmDash locale config + translation groups; per-locale slugs; fallback chain requested → EN → IT. — **Done** (seed + `getEmDashEntryWithFallback`). Astro URL `fallback` removed in Wave 3 (it 302’d IT→EN); entry fallback stays query-side only.
3. `src/i18n/ui.ts` (or equivalent) for chrome strings; primary menu + site settings per locale. — **UI dict + per-locale menus done**; site settings stay shared (see workaround below).
4. Seed full EN + IT for: tours, homepage, `libri`, `training`, `site_globals`, menus. — **Done**.
5. `SiteHeader` language switcher (paired entry or locale home). — **Done**; in-scope pages pass `content` so `getTranslations` can resolve paired slugs.
6. Update `GLOSSARY.md` / wiki (done 2026-11-26); do not expand scope to posts/pages/taxonomies.

## Blockers / notes (2026-11-26)

- Prior wiki assumed Italian-only site language ([Chiara preferences](../preferences/chiara.md)); superseded for #41 by EN-default bilingual model.
- **`getSiteSettings` workaround (Wave 2):** EmDash 1.6.0 has no locale parameter. Seed keeps shared brand `title` / EN `tagline` in `settings`. Per-locale marketing copy lives on `homepage` (and other collections). Do not invent a locale-scoped settings API. See [enablement](./emdash-i18n-enablement.md#open-risks-and-unknowns).
- **Astro vs content fallback:** Do **not** set Astro `fallback: { it: "en" }` — it redirected IT URLs to EN (Wave 3). Content fallback is `getEmDashEntryWithFallback` only.
- **`npm run seed` vs Wrangler D1:** CLI seed defaults to `./data.db`. Local `bun dev` reads Miniflare D1 under `.wrangler/state/v3/d1/...`. Seed the runtime DB with `emdash seed … --database <wrangler-sqlite>` (dev stopped), or wipe + reboot.

## Wave 3 verify (2026-11-26)

### Fixes landed this wave

- **Astro locale page folders** — Wave 3 used `prefixDefaultLocale` + `en/`/`it/` twins (later **superseded**; see EN unprefix section).
- **Removed Astro `fallback: { it: "en" }`** — was 302’ing all `/it/*` → `/en/*`.
- **`entrySlug()`** — strip leading `en/`/`it/` from EmDash entry ids before `localePath` (fixes `/en/tours/en/...` double prefix).
- **Seeded Wrangler D1** via `emdash seed --database <miniflare sqlite>` (dev stopped); omitted `calendly_url` `translatable: false` so upsert could apply on existing schema.
- **Deleted orphan** `ec_homepage` row (`id=home`, `slug=null`) that shadowed slug `home` lookups (IT hero stayed EN until removed).
- Docs: `AGENTS.md` i18n note + locale paths; `GLOSSARY.md` Locale/Libro/Catalogo/Scheda URL notes.

### Checklist (local, dated 2026-11-26) — after D1 seed + orphan delete

| Check | Result | Notes |
| ----- | ------ | ----- |
| `/` → `/en/` | **Pass** | 302 |
| `/en/` vs `/it/` distinct CMS + chrome | **Pass** | EN hero “Beyond the Plate”; IT “oltre il piatto”; `lang` + chrome match locale |
| `/en/tours` vs `/it/tours` | **Pass** | Catalog chrome + IT tour slugs |
| Scheda EN + IT | **Pass** | EN `polignano-food-tour`; IT `tour-enogastronomico-polignano` |
| Switcher → paired slug | **Pass** | EN scheda IT link → `/it/tours/tour-enogastronomico-polignano/` |
| `/en|it/puglia-the-book`, `/en|it/training` | **Pass** | Training titles distinct; Libro title shared “Puglia” by seed |
| FAQ + Calendly on scheda | **Pass** | Both locales |
| Tour card hrefs (no double locale) | **Pass** | After `entrySlug` |
| Shared-field `translatable: false` matrix | **In seed** | See ADR field matrix + `seed/seed.json`; apply with wipe + seed on existing DBs |

### Wipe for schema flags

Stop `dev`, `npm run wipe:local`, then seed/`bun dev` so `translatable: false` fields (Calendly, featured refs, Google metrics, etc.) apply on a fresh DB.

## EN unprefix + locale page sync (post–Wave 3)

Both-prefixed `/en/...` + `prefixDefaultLocale` broke EmDash admin → **reverted**. Current shape:

- EN unprefixed at root; IT under `/it/...` (no `prefixDefaultLocale`).
- In-scope pages live in root `src/pages/`; `src/pages/it/**` is generated by `npm run sync:locale-pages` (`scripts/sync-locale-pages.mjs` allowlist). **Do not hand-edit `it/`** — see **AGENTS.md** i18n rule.
- Static segment translation deferred: [#49](https://github.com/bbtgnn/spaghettiabc-website/issues/49).

## Remaining gaps (post–Wave 3)

- Wipe + seed so locked `translatable: false` flags apply on local/staging DBs.
- Optional `<link rel="alternate" hreflang>` polish (EmDash already emits some on scheda).
- Out-of-scope blog routes (`posts`, `pages`, `category`, `tag`) still monolingual — decide redirect or exclusion before launch.
- Editorial polish of IT/EN copy beyond seed placeholders.
- Document for agents: prefer `emdash seed --database <wrangler D1 sqlite>` when verifying local `bun dev` (or wipe + reboot).
- [#49](https://github.com/bbtgnn/spaghettiabc-website/issues/49) — localized static URL segments.

## Image gap fix (2026-11-26)

**Symptom:** Tour images OK; homepage hero / book / partner logos / libro cover empty on `/en/` and `/it/` (homepage training image also missing).

**Root cause:** Under Cloudflare/`workerd`, seed `$media.file` fails with `File path must be a file: URL` → fields stored as `null` (tours/reviews using `$media.url` download + R2 upload fine). Seed also omitted homepage `training_image`. Secondary pitfall: CLI `emdash seed --database <miniflare sqlite>` can write D1 media rows via LocalStorage without Miniflare R2 blobs.

**Fix:** In `seed/seed.json`, convert homepage/libro `$media.file` refs to `$media.url` (raw GitHub `main/seed/media/...`, per-locale alts kept) and add EN+IT `training_image` URL. Wipe local D1+R2 (`npm run wipe:local` with `dev` stopped) and reboot so auto-seed uploads into R2. Prefer URL `$media` for Workers-local seed; avoid D1-only CLI seed when checking images.
