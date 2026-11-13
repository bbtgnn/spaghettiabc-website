# Color palette preview (DEV)

## Sources

- GitHub issue [#12](https://github.com/bbtgnn/spaghettiabc-website/issues/12) — color palette preview
- Related: [Font pairing preview](./font-pairing-preview.md) (DEV picker lifecycle, issue [#9](https://github.com/bbtgnn/spaghettiabc-website/issues/9))
- Related: [Chiara / working style](../preferences/chiara.md)

This page records **what was agreed**. Palette terms stay out of `GLOSSARY.md` — design-system vocabulary, not domain language.

## Agreed approach

### Lifecycle

DEV-only primary color preview, same lifecycle as the font pairing picker: preview and persist in development; locking a palette into production `:root` is a **later explicit step**, outside [#12](https://github.com/bbtgnn/spaghettiabc-website/issues/12) scope.

### Unit = Palette

One named **Palette** remaps both brand tokens together site-wide:

- bright → `--accent`
- dark → `--title`

Surfaces, ink, and muted tokens stay fixed. Only brand tokens are remapped.

### Catalog (three Palettes) — revised 2026-11-13

Walnut / brown removed. Default preview = pomodoro (red). Blu Pascali brightened.

| Id | Label | Accent (bright) | Title (dark) |
| --- | --- | --- | --- |
| `pomodoro` | Rosso pomodoro (**default**) | `#c43c2c` | `#8f2418` |
| `pascali` | Blu Pascali | `#0A6DE4` | `#0855B0` |
| `bottiglia` | Verde bottiglia | `#2f6b4f` | `#1e4a36` |

### Contrast / ink

`--accent-ink` stays `#ffffff` for all Palettes.

### DEV preview UI (revised 2026-11-13)

- Shared `DevPreviewDock` bottom-right with fonts
- **Primario** — one global swatch row (3 options)
- **Testo** — base ink select: `cool` (`#101010` / muted `#5a5a56`) or `warm` (near-muted warmer `#4a433c` / muted `#6e6860`)
- Sets `html[data-palette]` + `html[data-ink]` and CSS variables on `html`
- Persist: `spaghettiabc-color-palette`, `spaghettiabc-ink`
- FOUC: head inline script applies stored palette + ink before paint

### Production lock

Not in [#12](https://github.com/bbtgnn/spaghettiabc-website/issues/12). Prod `theme.css` may still use walnut tokens until an explicit lock.

## Working-tree note (2026-11-13)

On branch `feat/color-palette-preview-only` (#25):

- `src/components/DevPreviewDock.astro`
- `src/components/ColorPalettePicker.astro`
- `src/styles/color-palettes-preview.css`
- `src/layouts/Base.astro` (DEV import + FOUC + dock)
