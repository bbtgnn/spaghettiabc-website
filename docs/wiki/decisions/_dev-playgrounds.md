# `/_dev/*` playgrounds — shared pattern

## Sources

- Concrete playgrounds: [Sezione Tour `/_dev`](./sezione-tour-dev-playground.md) (#14), [Sezione Hero `/_dev`](./hero-dev-playground.md) (#13)
- Wiring research (same day): [2026-11-09-hero-dev-playground-reuse.md](../research/2026-11-09-hero-dev-playground-reuse.md)

This page records **cross-cutting conventions** settled while building #14 and agreeing #13 (2026-11-09). Per-section variant directions and CMS field choices stay on the feature decision pages — do not invent new product decisions here.

## Public URL vs file path (2026-11-09)

Astro ignores `src/pages` segments whose names start with `_`, so `src/pages/_dev/…` never becomes a route. Public URLs stay `/_dev/…`; route files live under `src/dev/` and are registered with `injectRoute` (via `devPlaygrounds()` in `src/dev/integration.ts`, wired from `astro.config.mjs`).

## Prod gating (2026-11-09)

Every `/_dev/*` page must **404 in production**. Agreed mechanism: call `gateDevOnly` (`src/utils/dev-only.ts`) first; when `!import.meta.env.DEV`, rewrite to `/404` with status 404. Prefer this shared helper over per-page copy-paste.

## Hub + variant pages (2026-11-09)

- Hub at `/_dev/{feature}` lists variants and links to `/_dev/{feature}/{variant}`.
- **One page per variant** for stakeholder review (supersedes stacking all variants on one page — settled on #14 the same day, reused for #13).
- Each variant page shows **stacked** desktop (~1280 max) and mobile (~390) frames by default (side-by-side only on very wide viewports where that was agreed for review).
- Frames contain the section under test only — pass `hideHeader` to `Base.astro` so SiteHeader is omitted.

## Playground-local code (2026-11-09)

- Playground CSS under `src/styles/_dev/`; mocks/helpers under `src/components/_dev/`.
- On 2026-11-09, #13 extracted shared frame chrome to `src/styles/_dev/playground-chrome.css` (hero + sezione-tour sheets import it).
- Reuse of existing prod teaser/rail classes is fine; **no** production `theme.css` / homepage / catalog edits in the playground ticket.
- Live CMS data for content when the feature decision says so — not hard-coded fixtures unless explicitly agreed.

## Adding the next playground (2026-11-09)

Prefer extending reusable helpers (`gateDevOnly`, another `injectRoute` pair in `devPlaygrounds()`, shared frame/hub patterns) over copy-pasting a whole playground tree. Feature-specific variant IDs, mock markup, and CSS sheets are the part that should stay new.
