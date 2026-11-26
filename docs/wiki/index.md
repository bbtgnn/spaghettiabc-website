# Spaghetti ABC wiki

Tribal knowledge for agents and future sessions. Historical record — date or cite commits; do not describe “current” code without a date beside it.

## Decisions

- [Libro CMS model](./decisions/libro-cms-model.md) — collection `book` (→ `libri` per #41, 2026-11-26), Sezione Libro duplicata in homepage, URL `/puglia-the-book` (2026-10-23)
- [Formazione CMS model](./decisions/formazione-cms-model.md) — collection `training`, Sezione Formazione duplicata, URL `/training` (2026-10-23)
- [Sezione Dicono di me](./decisions/dicono-di-me-section.md) — homepage logos; Google proof UI moved to Sezione Tour (2026-11-06 / 2026-11-18)
- [Collaborazioni CMS model](./decisions/collaborazioni-cms-model.md) — **superseded 2026-11-06** by Dicono di me; historical landing `collaborations` / `/collaborazioni` (2026-10-23 / 2026-11-05)
- [Homepage hero + Recensioni Google](./decisions/homepage-hero-google-reviews.md) — hero copy + `seed/media/homepage-hero.jpg`; `google_reviews` on homepage; Testimonianza removed (2026-11-05); logos moved 2026-11-06
- [Newsletter homepage section](./decisions/newsletter-homepage-section.md) — UI-only iscrizione in home, no collection/provider (2026-10-23)
- [Homepage + Tours schema](./decisions/homepage-tours-schema.md) — first CMS slice before Libro (2026-10-23)
- [Homepage form headings](./decisions/homepage-form-headings.md) — CMS editor section titles for Homepage only ([#5](https://github.com/bbtgnn/spaghettiabc-website/issues/5), 2026-10-28)
- [Font pairing preview](./decisions/font-pairing-preview.md) — DEV matrix Body×Display + UI (Come testo / Tsukimi / Fira Sans); Archivo out, Cormorant in Display; serif UI larger + normal tracking (2026-11-05); supersedes 2026-11-04 four-option select ([#9](https://github.com/bbtgnn/spaghettiabc-website/issues/9))
- [Color palette preview](./decisions/color-palette-preview.md) — DEV global primary + ink (cool/warm); pomodoro default; Pascali `#0A6DE4` ([#12](https://github.com/bbtgnn/spaghettiabc-website/issues/12), revised 2026-11-13)
- [Scheda Tour Calendly / Prenotazione](./decisions/scheda-tour-calendly-prenotazione.md) — embed in info column (#15); PE module + SSR iframe (#24); global fallback on `site_globals` (#22) (2026-11-10 / 2026-11-11 / 2026-11-16)
- [Impostazioni sito FAQ](./decisions/site-globals-faq.md) — `site_globals`/`site`: FAQ globale (#23) + Calendly predefinito note (#22) (2026-11-16)
- [Sezione Tour layout](./decisions/sezione-tour-layout.md) — `#14`: equal stacked highlight pair + compact rail + review strip (2026-11-13 / 2026-11-17)
- [Full IT/EN i18n](./decisions/i18n-it-en.md) — EmDash locales, EN default, prefixed URLs, field matrix ([#41](https://github.com/bbtgnn/spaghettiabc-website/issues/41), grill 2026-11-26)

## Operations

- [EmDash types paths](./ops/emdash-types-paths.md) — `emdash-env.d.ts` vs `.emdash/types.ts` (2026-10-23)
- [Homepage chrome + landing lists](./ops/homepage-chrome-landing-lists.md) — Libro/Formazione pattern; Collaborazioni logos claim **superseded 2026-11-06** (2026-10-23 / 2026-11-05 / 2026-11-06)
- [Collaborazioni logos ingest](./ops/collaborazioni-logos-ingest.md) — 6 partner webps now seeded on homepage `partner_logos` (2026-10-28 / 2026-11-05 / 2026-11-06; loopback SSRF noted 2026-10-23)
- [Issue #15 status](./ops/issue-15-status.md) — Scheda Tour Calendly delivery notes (2026-11-10 / 2026-11-11)
- [Issue #23 status](./ops/issue-23-status.md) — Impostazioni sito FAQ globale (2026-11-16)
- [Issue #22 status](./ops/issue-22-status.md) — global Calendly fallback; stacked after #23 (2026-11-16)
- [Issue #41 status](./ops/issue-41-status.md) — full IT/EN i18n on `feat/41-full-i18n`; grill closed 2026-11-26; implementation pending
- [EmDash i18n enablement](./ops/emdash-i18n-enablement.md) — Astro + EmDash 1.6.0 APIs, seed pattern, Wave 1/2 file list ([#41](https://github.com/bbtgnn/spaghettiabc-website/issues/41), 2026-11-26)

## Domain language

- Glossary (canonical terms): [`GLOSSARY.md`](../../GLOSSARY.md) at repo root

## Preferences

- [Chiara / working style](./preferences/chiara.md)
