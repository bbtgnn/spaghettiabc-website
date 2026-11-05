# Spaghetti ABC wiki

Tribal knowledge for agents and future sessions. Historical record — date or cite commits; do not describe “current” code without a date beside it.

## Decisions

- [Libro CMS model](./decisions/libro-cms-model.md) — collection `book`, Sezione Libro duplicata in homepage, URL `/puglia-the-book` (2026-10-23)
- [Formazione CMS model](./decisions/formazione-cms-model.md) — collection `training`, Sezione Formazione duplicata, URL `/training` (2026-10-23)
- [Collaborazioni CMS model](./decisions/collaborazioni-cms-model.md) — collection `collaborations`, loghi sulla landing; testimonianze superseded 2026-11-05, URL `/collaborazioni` (2026-10-23 / 2026-11-05)
- [Homepage hero + Recensioni Google](./decisions/homepage-hero-google-reviews.md) — hero copy + `seed/media/homepage-hero.jpg`; `google_reviews` on homepage; Testimonianza removed (2026-11-05)
- [Newsletter homepage section](./decisions/newsletter-homepage-section.md) — UI-only iscrizione in home, no collection/provider (2026-10-23)
- [Homepage + Tours schema](./decisions/homepage-tours-schema.md) — first CMS slice before Libro (2026-10-23)
- [Homepage form headings](./decisions/homepage-form-headings.md) — CMS editor section titles for Homepage only ([#5](https://github.com/bbtgnn/spaghettiabc-website/issues/5), 2026-10-28)
- [Font pairing preview](./decisions/font-pairing-preview.md) — DEV matrix Body×Display + UI (Come testo / Tsukimi / Fira Sans); Archivo out, Cormorant in Display; serif UI larger + normal tracking (2026-11-05); supersedes 2026-11-04 four-option select ([#9](https://github.com/bbtgnn/spaghettiabc-website/issues/9))

## Operations

- [EmDash types paths](./ops/emdash-types-paths.md) — `emdash-env.d.ts` vs `.emdash/types.ts` (2026-10-23)
- [Homepage chrome + landing lists](./ops/homepage-chrome-landing-lists.md) — logos on landing; Recensioni Google exception on homepage (2026-10-23 / 2026-11-05)
- [Collaborazioni logos ingest](./ops/collaborazioni-logos-ingest.md) — 6 partner webps; GitHub raw `$media` URLs; homepage hero upload ritual (2026-10-28 / 2026-11-05; loopback SSRF noted 2026-10-23)

## Domain language

- Glossary (canonical terms): [`GLOSSARY.md`](../../GLOSSARY.md) at repo root

## Preferences

- [Chiara / working style](./preferences/chiara.md)
