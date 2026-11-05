# Font pairing preview (DEV)

## Sources

- GitHub issue [#9](https://github.com/bbtgnn/spaghettiabc-website/issues/9) — font pairing preview
- Grilling with Chiara: agreed 2026-11-04, revised 2026-11-05
- Related: [Chiara / working style](../preferences/chiara.md)

This page records **what was agreed**, not whether the matrix UI has shipped.

## Superseded approach (2026-11-04)

Fixed `<select>` with four named pairings:

| Id (approx.) | Display / Body |
| --- | --- |
| attuale | Archivo / Archivo |
| stesso-serif | Source Serif 4 / Source Serif 4 |
| serif-sans | Fraunces / Source Sans 3 |
| due-serif | Cormorant / Source Serif 4 |

Also agreed then: DEV-only picker, fontsource self-host, `localStorage`, roles Display + Body, mono reserved for small labels/eyebrows.

## Revised approach (2026-11-05)

### Roles

Three CSS roles (not two):

1. **Display** — titles and brand
2. **Body** — running text
3. **UI** — one font for nav, CTA/buttons, links, and small labels/eyebrows

Mono is **not** used for visible chrome in this model.

### Catalogs

- **Display:** Newsreader, Fraunces, Lora, Cormorant Garamond
- **Body:** Source Serif 4, Literata
- **UI:** Come testo (match Body), Tsukimi Rounded, Fira Sans

### DEV preview UI

- Matrix: rows = Body, columns = Display
- Separate control for UI font
- Persist via `localStorage`
- Default: Body = Source Serif 4 × Display = Fraunces; UI = Come testo

### Production

Prod baseline (until a later lock): Display = Fraunces, Body = Source Serif 4, UI = body (`--font-ui: var(--font-body)`). Archivo is no longer the locked default.

### UI casing (2026-11-05)

Agreed with Chiara 2026-11-05: casing for chrome that uses `--font-ui` (CTA/`.btn`, labels, text-links, field labels, etc. — not nav) follows the **effective** UI face, not Display/Body titles:

| Effective UI face | How | Result |
| --- | --- | --- |
| **Sans** (`data-font-ui="tsukimi"` or `fira-sans`) | `text-transform: uppercase` | atelier all-caps |
| **Serif** (`data-font-ui="body"` — both body faces are serif) | `lowercase` + `::first-letter { uppercase }` | sentence case (“Compra ora”) |

`data-font-ui-case="serif"|"sans"` on `<html>` is synced from the UI selection (early DEV script + picker). Prod ships `data-font-ui-case="serif"`. Flex was avoided on those hosts (`inline-block` / block) so `::first-letter` actually applies to `.btn`. Display titles and body paragraphs are unchanged. `.site-brand` uses `--font-display` and keeps source casing (`Spaghetti ABC`) — not UI case rules. **Nav exception (2026-11-05):** `.site-nav a` always uses `--font-body` at body size (`1rem`, `-0.006em`) with sentence case — it is not driven by the UI font picker or `--font-ui` metrics.

When Display is Fraunces, title/display weights drop one step (500→400); Body/UI are untouched. Prod baseline is Fraunces, so `:root` in `theme.css` sets `--font-display-weight: 400`. DEV preview overrides: non-Fraunces Display faces (`newsreader` / `lora` / `cormorant`) use display weight 500; `data-font-display="fraunces"` keeps 400. **Brand weight (2026-11-05):** `.site-brand` is one step lighter than the prior brand token — Fraunces/prod `--font-brand-weight: 400`, other Display faces `500` — at `font-size: 1.1875rem` (was `0.9375rem` / brand 500·600). Display heading weights are unchanged except via shared tokens.

### Catalog + UI metrics revision (2026-11-05)

Agreed with Chiara 2026-11-05 (same day, later pass):

- **Archivo removed** from Display, Body, and picker options; `@fontsource-variable/archivo` uninstalled.
- **Cormorant Garamond** re-added to Display (`cormorant`) — the earlier «due serif» title face.
- **Fira Sans** added as a UI sans option (`fira-sans` → `data-font-ui-case="sans"`), alongside Tsukimi and Come testo.
- **Serif UI metrics:** when `data-font-ui-case="serif"`, chrome uses a slightly larger font size and `letter-spacing: normal` (not the wide tracking used for uppercase sans). Driven by `--font-ui-size*` / `--font-ui-tracking*` on `:root` / `html[data-font-ui-case="serif"]` in `theme.css`.

## Working-tree note (2026-11-05)

Subagent implemented the **revised matrix preview** and the same-day catalog/metrics revision in the working tree on 2026-11-05 (uncommitted; not locked to a git SHA). Paths:

- `src/components/FontPairingPicker.astro`
- `src/styles/font-pairings-preview.css`
- `src/styles/theme.css` (`--font-ui`, UI metrics tokens, prod Fraunces + Source Serif 4, `--font-display-weight` / `--font-brand-weight`)
- `src/layouts/Base.astro` (DEV attrs + prod `data-font-ui-case="serif"`)

This supersedes the earlier four-option `<select>` implementation in those same paths (see [Superseded approach](#superseded-approach-2026-11-04)).
