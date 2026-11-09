# Research: hero `/_dev` playground reuse (#13)

Dated claims: **2026-11-09**. Scope: research only — no implementation. Sources: issue [#13](https://github.com/bbtgnn/spaghettiabc-website/issues/13), [`docs/wiki/decisions/sezione-tour-dev-playground.md`](../decisions/sezione-tour-dev-playground.md), playground + homepage code.

**Decision page (grill):** [`../decisions/hero-dev-playground.md`](../decisions/hero-dev-playground.md) — Round 1+2 settled same day; several “open questions” below are **superseded** by that page.

## 1. How `/_dev/sezione-tour` is wired (2026-11-09)

- **Files:** `src/dev/sezione-tour/index.astro` (hub), `[variant].astro`, `variants.ts` — not under `src/pages/`.
- **Inject:** `devPlaygrounds()` in `src/dev/integration.ts` calls `injectRoute` for `/_dev/sezione-tour` and `/_dev/sezione-tour/[variant]`; registered from `astro.config.mjs`.
- **Gate:** every playground page calls `gateDevOnly(Astro)` from `src/utils/dev-only.ts` first; non-DEV → rewrite `/404` with status 404.
- **Hub vs variant:** hub lists A/B/C cards; variant page loads live homepage CMS data, renders one layout’s **desktop (~1280) + mobile (~390)** frames via `SEZIONE_TOUR_VIEWPORTS`, with A/B/C switcher.
- **Frame chrome:** `src/styles/_dev/sezione-tour-playground.css` (`.pg`, `.pg-frame`, `.pg__frames`); mock in `src/components/_dev/SezioneTourMock.astro` (+ helpers).
- **`hideHeader`:** both hub and variant pass `hideHeader` to `Base.astro` so SiteHeader is omitted inside frames.

## 2. Production homepage hero today (2026-11-09)

In `src/pages/index.astro` (when `homepage`/`home` exists):

| Piece | Detail |
| --- | --- |
| Fields | `hero_title`, `hero_subtitle`, `hero_image`; primary CTA uses `tour_cta_label` → `/tours` |
| Markup | `<section class="shell hero" data-palette-slot="hero" data-palette="walnut">` → `.hero__copy` + optional `.hero__figure` |
| Type | `h1.type-hero`, `p.type-lead.hero__lede`, `.hero__actions` |
| CTAs | `btn btn-primary` (CMS tour label); hard-coded `btn btn-outline` “Il libro” → `/puglia-the-book` (not `book_cta_label`) |
| Image | `emdash/ui` `<Image>` inside `.hero__frame` > `.parallax`; caption = site title + “Puglia · Italia” |
| CSS | page-local `<style>` in `index.astro` (grid split ≥900px, aspect ratios 4/3 → 8/7) |

Seed (`seed/seed.json`) also defines `book_cta_label`, unused by the hero markup today.

## 3. GLOSSARY.md — Hero / Sezione Hero (2026-11-09)

**Absent at research time.** No **Hero** or **Sezione Hero** entry then. Only adjacent mention: Scheda Tour “senza hero overlay” (layout note, not a domain term).

**Superseded same day:** Round 1 grill added **Sezione Hero** to [`GLOSSARY.md`](../../../GLOSSARY.md); see [hero-dev-playground.md](../decisions/hero-dev-playground.md).

## 4. Astro `_` path constraint (2026-11-09)

Astro ignores `src/pages` segments starting with `_`, so `src/pages/_dev/…` never becomes a route. Public URLs stay `/_dev/…` via `injectRoute` + files under `src/dev/` (see decision note + `src/dev/integration.ts` comment).

## 5. Reuse checklist for #13 (copy vs invent)

**Copy / extend**

- [x] Another `injectRoute` pair in `devPlaygrounds()` → `/_dev/hero` + `/_dev/hero/[variant]` — **done 2026-11-09** (uncommitted; see [hero-dev-playground.md](../decisions/hero-dev-playground.md) Implementation note)
- [x] `gateDevOnly` on every hero playground page — **done 2026-11-09**
- [x] Hub + one-page-per-variant pattern (`variants.ts`, switcher, viewport frames) — **done 2026-11-09**
- [x] `Base` + `hideHeader`; playground CSS under `src/styles/_dev/`; mocks under `src/components/_dev/` — **done 2026-11-09** (`HeroMock.astro`, `hero-playground.css`, shared `playground-chrome.css`)
- [x] Live homepage fields for baseline variant (not hard-coded fixtures), unless grill says otherwise — **done 2026-11-09**
- [x] Prod 404 spirit already agreed in sezione-tour decision for #13 — **done 2026-11-09** (`gateDevOnly`)

**Invent**

- [x] Hero-specific variant IDs/titles/mock markup + CSS (do not ship into prod `theme.css` / `index.astro`) — **done 2026-11-09**
- [x] Variant count + standard vs experimental — **superseded 2026-11-09:** 6 = 3+3; directions in decision page Round 2
- [ ] Whether secondary CTA stays hard-coded “Il libro” or uses `book_cta_label` (still open for implementers; prod hero + `HeroMock` hard-code “Il libro”)

## 6. Issue #13 text contradiction

Issue body (2026-11-09): “cinque varianti … (**tre** standard, **tre** … sperimentali)” (= six, not five).

**Superseded 2026-11-09:** Chiara Round 1 — “cinque” was a slip; ship **6** (3+3). See [hero-dev-playground.md](../decisions/hero-dev-playground.md).

## Open questions for grill (remaining after Round 1–2)

Settled elsewhere: 5 vs 6; hub+variant; live CMS; **Sezione Hero** glossary; A–F directions; content budget; motion; Round 3 go-ahead / slug letters `a`–`f`; shared frame CSS → `playground-chrome.css` (2026-11-09 Implementation note).

Still useful for implementers (not blocking product grill):

- Second CTA: keep hard-coded “Il libro” or wire `book_cta_label`?
