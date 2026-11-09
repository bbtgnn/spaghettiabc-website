# Color palette preview (DEV)

## Sources

- GitHub issue [#12](https://github.com/bbtgnn/spaghettiabc-website/issues/12) — color palette preview
- Grilling with Chiara: agreed 2026-11-09
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
- Control: row of 4 swatches (bright + dark visible on each) — not a `<select>`, not a matrix
- New twin component `ColorPalettePicker.astro` (mirror FontPairingPicker styles; no shared `DevPicker` extract this round)

### Wiring

- Attribute: `html[data-palette]`
- DEV CSS preview overrides for remapped brand tokens
- Persist via `localStorage` key `spaghettiabc-color-palette`
- Early script in `Base.astro` (same pattern as font pairing)
- Default: `walnut`

### Production lock

Not in [#12](https://github.com/bbtgnn/spaghettiabc-website/issues/12). Locking a chosen Palette into `theme.css` `:root` for prod is a later explicit decision/step.

### Glossary

No `GLOSSARY.md` update — Palette / swatch ids are design-system terms, not site domain language.

## Working-tree note (2026-11-09)

Subagent implemented the DEV palette preview on branch `feat/color-palette-preview` in worktree `color-palette-10c2486a` on 2026-11-09 (uncommitted; base HEAD `38dd9cd746c5cc89388f241d5a5de1b16bf41d6c`). Paths:

- `src/components/ColorPalettePicker.astro`
- `src/styles/color-palettes-preview.css`
- `src/layouts/Base.astro` (DEV import + FOUC script + mount)
- `docs/wiki/decisions/color-palette-preview.md` + `docs/wiki/index.md`
