# Sezione Hero — playground `/_dev` (#13)

## Sources

- GitHub issue [#13](https://github.com/bbtgnn/spaghettiabc-website/issues/13) — feat: homepage hero variants / `/_dev/hero`
- Grill with Chiara (2026-11-09), Rounds 1–3 confirmed
- Research (same day): [2026-11-09-hero-dev-playground-reuse.md](../research/2026-11-09-hero-dev-playground-reuse.md)
- Related: [`/_dev/*` playgrounds](./_dev-playgrounds.md) (shared pattern), [Sezione Tour `/_dev` playground](./sezione-tour-dev-playground.md) (#14 shell to reuse), [Homepage hero + Recensioni Google](./homepage-hero-google-reviews.md), [`GLOSSARY.md`](../../../GLOSSARY.md) (**Sezione Hero**)

This page records **what was agreed**, not whether the playground has shipped.

## Scope (2026-11-09)

Agreed with Chiara 2026-11-09 (Round 1): deliverable for #13 is **only** the experimental route `/_dev/hero`. Production homepage **Sezione Hero** stays untouched until a variant wins.

Issue text that said “cinque” variants was a slip: the count is **6** (3 standard + 3 sperimentali).

## Domain term (2026-11-09)

Canonical name: **Sezione Hero** (see [`GLOSSARY.md`](../../../GLOSSARY.md)). CMS form heading may stay the short label “Hero”.

## Data (2026-11-09)

Live homepage CMS fields: `hero_title`, `hero_subtitle`, `hero_image`, plus existing CTAs. Layout may vary across playground variants; **content does not**.

## Playground UX (2026-11-09)

Reuse the #14 shell ([sezione-tour-dev-playground.md](./sezione-tour-dev-playground.md)):

- Hub `/_dev/hero` → `/_dev/hero/{variant}` (one page per variant)
- Stacked desktop (~1280) + mobile (~390) frames
- Frames contain the section only — no SiteHeader
- Prod gating: `gateDevOnly` → 404 when not DEV
- Astro: `injectRoute` under `src/dev/` (not `src/pages/_dev`, which Astro ignores)

## Round 2 — variant directions (2026-11-09)

Agreed with Chiara 2026-11-09:

- **Standard** = sober evolutions of the current layout (same hierarchy: copy + CTAs + image).
- **Sperimentale** = different composition (image / brand / CTA roles) — still Sezione Hero, not another section.

| Id | Tipo | Direzione |
| --- | --- | --- |
| A | Standard | Refined current split: copy left, image right (desktop); stack on mobile |
| B | Standard | Full-bleed: image as dominant edge-to-edge plane; copy + CTA in document flow (no detached overlays) |
| C | Standard | Brand-first: site name / Spaghetti ABC as hero-level signal; CMS title secondary; same media |
| D | Sperimentale | Typography-dominant: huge title; image secondary / cropped |
| E | Sperimentale | Strong asymmetry: image invades / breaks into the copy column |
| F | Sperimentale | Editorial vertical: narrow centered stack (mobile-like even in the desktop frame) |

**Content budget:** brand (when the variant calls for it), title, subtitle, CTA group (tour + libro), one dominant image — no stats, reviews, chips, or promos in Sezione Hero.

**Motion:** light reveal/parallax OK; variants are judged on **static composition**, not distinct animation sets.

## Round 3 — slugs + go-ahead (2026-11-09)

Agreed with Chiara 2026-11-09 (final go-ahead to implement):

- Hub: `/_dev/hero`
- Variants: `/_dev/hero/a` … `/_dev/hero/f` (slug letters match directions A–F)
- Switcher: A–F with short labels (one letter per direction)

This page still records agreement only; do not treat the playground as shipped until the routes exist in the repo.

## Explicit non-goals (2026-11-09)

- Shipping a production Sezione Hero redesign
- Changing live homepage hero markup/CSS for this ticket
- Hard-coding playground copy or media instead of live CMS fields

## Implementation note (2026-11-09)

Subagent shipped the playground in the working tree on 2026-11-09 (uncommitted; not locked to a git SHA — same status as [Sezione Tour `/_dev`](./sezione-tour-dev-playground.md)). Shared pattern: [`/_dev/*` playgrounds](./_dev-playgrounds.md).

**Routes:** hub `/_dev/hero` + variants `/_dev/hero/a` … `/_dev/hero/f` via `devPlaygrounds()` `injectRoute` in `src/dev/integration.ts`. Files under `src/dev/hero/` (`index.astro`, `[variant].astro`, `variants.ts`). Every page calls `gateDevOnly` (`src/utils/dev-only.ts`).

**UI:** `src/components/_dev/HeroMock.astro`; playground CSS `src/styles/_dev/hero-playground.css`; shared frame chrome extracted to `src/styles/_dev/playground-chrome.css` (sezione-tour CSS now imports it). Frames use `Base` `hideHeader`. Live homepage CMS fields for hero content.

**Checks that day:** smoke hub + `/a` + `/f` → HTTP 200 on local DEV; `astro check` → 0 errors.
