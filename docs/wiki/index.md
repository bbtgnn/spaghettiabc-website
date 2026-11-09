# Spaghetti ABC wiki

Tribal knowledge for agents and future sessions. Historical record — date or cite commits; do not describe “current” code without a date beside it.

## Decisions

- [Libro CMS model](./decisions/libro-cms-model.md) — collection `book`, Sezione Libro duplicata in homepage, URL `/puglia-the-book` (2026-10-23)
- [Formazione CMS model](./decisions/formazione-cms-model.md) — collection `training`, Sezione Formazione duplicata, URL `/training` (2026-10-23)
- [Sezione Dicono di me](./decisions/dicono-di-me-section.md) — homepage-only logos + Punteggio/Recensioni Google; Collaborazioni landing removed (2026-11-06); live DB aligned 2026-11-09
- [Collaborazioni CMS model](./decisions/collaborazioni-cms-model.md) — **superseded 2026-11-06** by Dicono di me; historical landing `collaborations` / `/collaborazioni` (2026-10-23 / 2026-11-05)
- [Homepage hero + Recensioni Google](./decisions/homepage-hero-google-reviews.md) — hero copy + `seed/media/homepage-hero.jpg`; `google_reviews` on homepage; Testimonianza removed (2026-11-05); logos moved 2026-11-06
- [Newsletter homepage section](./decisions/newsletter-homepage-section.md) — UI-only iscrizione in home, no collection/provider (2026-10-23)
- [Homepage + Tours schema](./decisions/homepage-tours-schema.md) — first CMS slice before Libro (2026-10-23)
- [Homepage form headings](./decisions/homepage-form-headings.md) — CMS editor section titles for Homepage only ([#5](https://github.com/bbtgnn/spaghettiabc-website/issues/5), 2026-10-28)
- [Font pairing preview](./decisions/font-pairing-preview.md) — DEV matrix Body×Display + UI (Come testo / Tsukimi / Fira Sans); Archivo out, Cormorant in Display; serif UI larger + normal tracking (2026-11-05); supersedes 2026-11-04 four-option select ([#9](https://github.com/bbtgnn/spaghettiabc-website/issues/9))
- [Color palette preview](./decisions/color-palette-preview.md) — DEV multi-slot Palettes (homepage regions + template pages + chrome); per-slot `localStorage`; supersedes 2026-11-09 single `html[data-palette]` ([#12](https://github.com/bbtgnn/spaghettiabc-website/issues/12), revised 2026-11-09)
- [`/_dev/*` playgrounds](./decisions/_dev-playgrounds.md) — shared pattern: `injectRoute` + `src/dev/`, `gateDevOnly`, hub + one-page-per-variant, stacked frames (2026-11-09)
- [Sezione Tour `/_dev` playground](./decisions/sezione-tour-dev-playground.md) — `#14`: hub + `/a|/b|/c` pages; stacked desktop/mobile frames; `injectRoute` + `gateDevOnly` (2026-11-09)
- [Sezione Hero `/_dev` playground](./decisions/hero-dev-playground.md) — `#13` shipped 2026-11-09 (uncommitted): hub `/_dev/hero` + `a`–`f` via `injectRoute`; `HeroMock` + shared `playground-chrome.css`; 6 directions (3 Standard + 3 Sperimentale)

## Operations

- [EmDash types paths](./ops/emdash-types-paths.md) — `emdash-env.d.ts` vs `.emdash/types.ts`; 2026-11-09 drift **addressed** same day via DB migration (2026-10-23 / 2026-11-09)
- [Homepage Dicono schema migration](./ops/homepage-dicono-schema-migration.md) — live DB → Dicono fields; backup path; field map; `collaborations` removed (2026-11-09)
- [Homepage chrome + landing lists](./ops/homepage-chrome-landing-lists.md) — Libro/Formazione pattern; Collaborazioni logos claim **superseded 2026-11-06** (2026-10-23 / 2026-11-05 / 2026-11-06)
- [Collaborazioni logos ingest](./ops/collaborazioni-logos-ingest.md) — 6 partner webps now seeded on homepage `partner_logos` (2026-10-28 / 2026-11-05 / 2026-11-06; loopback SSRF noted 2026-10-23)

## Domain language

- Glossary (canonical terms): [`GLOSSARY.md`](../../GLOSSARY.md) at repo root

## Preferences

- [Chiara / working style](./preferences/chiara.md)
