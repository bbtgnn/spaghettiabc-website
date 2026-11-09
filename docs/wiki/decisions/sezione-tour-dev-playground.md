# Sezione Tour — playground `/_dev` (#14)

## Sources

- GitHub issue [#14](https://github.com/bbtgnn/spaghettiabc-website/issues/14) — feat: sezione tour
- Pattern reference: [#13](https://github.com/bbtgnn/spaghettiabc-website/issues/13) — `/_dev/hero`, prod 404
- Grill with Chiara (2026-11-09), confirmed end-to-end before implementation
- Related: [Homepage + Tours schema](./homepage-tours-schema.md), [Sezione Dicono di me](./dicono-di-me-section.md), [`GLOSSARY.md`](../../../GLOSSARY.md)

This page records **what was agreed**, not whether the playground has shipped.

## Scope (2026-11-09)

Agreed with Chiara 2026-11-09: deliverable for #14 is **only** the experimental route `/_dev/sezione-tour` (3 layout variants × desktop + mobile frames). Production homepage Sezione Tour and Catalogo Tour stay unchanged until a variant wins.

Catalogo Tour layout ideas in #14 (horizontal featured cards, optional reviews) are **out of this playground**.

## Data (2026-11-09)

- Live homepage CMS: `featured_tours` + `google_reviews` (no hard-coded fixtures).
- Two large tours = **first two** of `featured_tours`; remaining entries = small rail via existing `TourTeaser`.
- No new CMS “primo piano” field; no new glossary term — still **Tour in evidenza** / `featured_tours`.

## Reviews vs domain (2026-11-09)

Compact review rail in the mock is a **UI experiment** only. **Recensione Google** ownership stays with **Sezione Dicono di me**. Strip shows review cards only (stars, short quote, author, avatar) — not Punteggio Google or Loghi partner.

## Playground UX (2026-11-09)

- Originally: three variants on one page; each shows desktop (~1280 max) and mobile (~390) frames with internal scroll.
- **Review layout (same day):** frames **stack vertically** by default so both stay on-screen for stakeholder review; side-by-side only from ~1720px viewport width up (was always row + horizontal page scroll, which hid mobile on typical laptops).
- **One page per variant (same day, later):** Chiara preferred separate pages for boss review. Hub `/_dev/sezione-tour` links to `/_dev/sezione-tour/a|b|c`; each variant page shows only that layout’s desktop + mobile frames, with A/B/C switcher. Supersedes “all three on one page”.
- Frames contain the section only (head + tours + reviews) — no SiteHeader.
- Section head matches current Sezione Tour: CMS title/subtitle + CTA to `/tours`.
- Large pair: 50/50 on desktop frame, stacked in mobile frame.
- Reviews: always horizontal rail.
- Small rail reuses `TourTeaser`; large cards + compact reviews = playground-local markup/CSS.
- New code stays under `/_dev` (reuse of existing teaser/rail classes ok); no production `theme.css` / homepage / catalog edits for this ticket.

## Variant directions (2026-11-09)

| Id | Direction |
| --- | --- |
| A | Literal issue sketch — 2 large + small rail + compact review rail |
| B | Two horizontal “catalog-like” cards + rail + reviews more integrated in the block |
| C | Asymmetric — first tour dominant, second secondary + rail + reviews |

Variante C: dominant = first `featured_tours` entry, secondary = second.

## Prod gating (2026-11-09)

Same spirit as #13: `/_dev/*` must **404 in production**. Agreed mechanism: page returns 404 when `!import.meta.env.DEV`. Prefer a **reusable** helper so #13 (`/_dev/hero`) can share it.

## Explicit non-goals (2026-11-09)

- Shipping a production Sezione Tour redesign
- Catalogo Tour redesign or catalog variants on this route
- Moving Recensioni Google out of Sezione Dicono di me in the domain model
- Glossary changes

## Implementation note (2026-11-09)

Subagent shipped the playground in the working tree on 2026-11-09 (uncommitted; not locked to a git SHA). Public URL `/_dev/sezione-tour` verified HTTP 200 on the local DEV server that day.

**Astro routing constraint:** Astro ignores `src/pages` paths whose names start with `_`, so `src/pages/_dev/…` cannot host the route. Files live under `src/dev/sezione-tour/` (`index.astro`, `[variant].astro`, `variants.ts` + `devPlaygrounds()` `injectRoute`) while the public paths stay `/_dev/sezione-tour` and `/_dev/sezione-tour/[variant]`. Helper: `src/utils/dev-only.ts` (`gateDevOnly`). Related paths: `src/components/_dev/*`, `src/styles/_dev/sezione-tour-playground.css`, `Base.astro` `hideHeader` for frame isolation.

Reuse for [#13](https://github.com/bbtgnn/spaghettiabc-website/issues/13): add another `injectRoute` in `devPlaygrounds()` + call `gateDevOnly` on the page.

**Types:** On 2026-11-09, after regen, playground/`gateDevOnly` typed clean; remaining `astro check` errors were pre-existing `index.astro` vs live DB (see [EmDash types paths](../ops/emdash-types-paths.md) — live DB vs seed drift).
