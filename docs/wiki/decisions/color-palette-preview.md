# Color palette preview (DEV)

## Sources

- GitHub issue [#12](https://github.com/bbtgnn/spaghettiabc-website/issues/12) — color palette preview
- Grilling with Chiara: agreed 2026-11-09 (single-page wiring), multi-slot grill 2026-11-09
- Related: [Font pairing preview](./font-pairing-preview.md) (DEV picker lifecycle, issue [#9](https://github.com/bbtgnn/spaghettiabc-website/issues/9))
- Related: [Chiara / working style](../preferences/chiara.md)

This page records **what was agreed**, not whether the palette UI has shipped. Code baseline cited below is HEAD `38dd9cd746c5cc89388f241d5a5de1b16bf41d6c` at worktree create (2026-11-09). Palette terms stay out of `GLOSSARY.md` — design-system vocabulary, not domain language.

## Agreed approach (2026-11-09)

### Lifecycle

DEV-only color palette preview, same lifecycle as the font pairing picker ([#9](https://github.com/bbtgnn/spaghettiabc-website/issues/9) / [font-pairing-preview](./font-pairing-preview.md)): preview and persist in development; locking a palette into production `:root` is a **later explicit step**, outside [#12](https://github.com/bbtgnn/spaghettiabc-website/issues/12) scope. Issue #12 = preview only.

### Unit = Palette

One named **Palette** is a hue family that remaps both brand tokens together:

- bright → `--accent`
- dark → `--title`

Surfaces, ink, and muted tokens stay fixed cool greys. Only brand tokens are remapped.

### Catalog (four Palettes)

Walnut is kept as the 4th Palette and the default baseline. «Marino» is a synonym of Pascali, not a fifth option.

| Id | Label | Accent (bright) | Title (dark) |
| --- | --- | --- | --- |
| `walnut` | Walnut | `#8a5322` | `#6b3f18` |
| `pomodoro` | Rosso pomodoro | `#c43c2c` | `#8f2418` |
| `pascali` | Blu Pascali | `#2f5f8a` | `#1e3f5c` |
| `bottiglia` | Verde bottiglia | `#2f6b4f` | `#1e4a36` |

Seed hex values are **provisional**. Walnut accent/title match the existing tokens at `38dd9cd746c5cc89388f241d5a5de1b16bf41d6c`.

### Contrast / ink

`--accent-ink` stays `#ffffff` for all Palettes. If a bright fails contrast, adjust the bright hex — do **not** introduce dark-on-accent ink.

### DEV preview UI

- Separate DEV panel from `FontPairingPicker`, same visual style
- Placement: bottom-left (fonts stay bottom-right)
- Control: contextual rows — one row per `data-palette-slot` present on the page; each row has Italian label + 4 swatches (bright + dark) — not a `<select>`, not a matrix
- Always include `chrome` when SiteHeader is present
- New twin component `ColorPalettePicker.astro` (mirror FontPairingPicker styles; no shared `DevPicker` extract this round)
- Collapse behavior kept

### Multi-slot wiring (grill 2026-11-09)

Slots are independent; each remaps `--accent` / `--title` / `--accent-ink` on its subtree via CSS variables.

| Slot id | Where | Label (IT) |
| --- | --- | --- |
| `chrome` | SiteHeader root | Chrome |
| `hero` | Homepage hero section | Hero |
| `sezione-tour` | Homepage Sezione Tour | Sezione Tour |
| `sezione-libro` | Homepage Sezione Libro | Sezione Libro |
| `sezione-formazione` | Homepage Sezione Formazione | Sezione Formazione |
| `sezione-dicono` | Homepage Sezione Dicono di me | Sezione Dicono di me |
| `sezione-newsletter` | Homepage Sezione Newsletter | Sezione Newsletter |
| `page-tours` | Catalogo Tour `<main>` | Catalogo Tour |
| `page-tour` | Scheda Tour `<main>` | Scheda Tour |
| `page-book` | Libro `<main>` | Libro |
| `page-training` | Formazione `<main>` | Formazione |
| `page-posts` | Posts index `<main>` | Posts |
| `page-post` | Post detail `<main>` | Post |
| `page-cms` | CMS page `[slug]` `<main>` | Pagina |

Markup: `data-palette-slot="<id>"` + default `data-palette="walnut"` (JS overwrites from storage).

- CSS: `[data-palette="walnut|pomodoro|pascali|bottiglia"]` in `color-palettes-preview.css` (not `html[data-palette]` only)
- Persist: `localStorage` key `spaghettiabc-palette-<slotId>` (supersedes single key `spaghettiabc-color-palette`)
- FOUC: head inline script injects `<style id="palette-fouc">` from all `spaghettiabc-palette-*` keys before paint
- `Base.astro` optional prop `paletteSlot` sets attributes on `<main>` for non-home templates
- Out of scope for dedicated slots: 404, admin, `/_dev` playgrounds

### Production lock

Not in [#12](https://github.com/bbtgnn/spaghettiabc-website/issues/12). Locking a chosen Palette into `theme.css` `:root` for prod is a later explicit decision/step.

### Glossary

No `GLOSSARY.md` update — Palette / swatch ids are design-system terms, not site domain language.

## Working-tree note (2026-11-09)

Subagent implemented the DEV palette preview on branch `feat/color-palette-preview` (uncommitted; base HEAD `38dd9cd746c5cc89388f241d5a5de1b16bf41d6c`), then multi-slot wiring per grill. Paths:

- `src/components/ColorPalettePicker.astro`
- `src/styles/color-palettes-preview.css`
- `src/layouts/Base.astro` (DEV import + FOUC style + `paletteSlot` on main + mount)
- `src/components/SiteHeader.astro` (`chrome` slot)
- Homepage sections + listed page templates
- `docs/wiki/decisions/color-palette-preview.md` + `docs/wiki/index.md`
