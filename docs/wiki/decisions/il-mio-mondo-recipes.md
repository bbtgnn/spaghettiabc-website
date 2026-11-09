# Ricette + Sezione Il mio mondo (#16)

## Sources

- GitHub issue [#16](https://github.com/bbtgnn/spaghettiabc-website/issues/16) — feat: "il mio mondo"
- Grill with docs + domain modeling with Chiara (2026-11-09), confirmed end-to-end before implementation
- WordPress WXR export: chat attachment `spaghettiabc-export-wordpress.xml` (export 2026-10-29, base `https://spaghettiabc.com`)
- Pattern references: [Sezione Dicono di me](./dicono-di-me-section.md) (CMS-first snapshots), [Sezione Tour `/_dev` playground](./sezione-tour-dev-playground.md) (#14)
- Domain terms: [`GLOSSARY.md`](../../../GLOSSARY.md) (**Ricetta**, **Catalogo Ricette**, **Scheda Ricetta**, **Categoria ricetta**, **Sezione Il mio mondo**, **Post Instagram**, **Articolo Substack**, **Ricetta selezionata**)

This page records **what was agreed**, not whether code has shipped.

## Split deliverable (2026-11-09)

1. **Production now** — **Ricetta** collection, **Catalogo Ricette** (`/recipes`), **Scheda Ricetta** (`/recipes/{slug}`), primary-menu voice **Ricette**, seed from WXR (~79 published WP `post`s).
2. **Playground only** — **Sezione Il mio mondo** layout experiments on `/_dev` (reuse #14 shell / prod-404 gating). Production homepage does **not** gain the section until a variant wins.
3. **Deferred** — SEO redirects from old WP `/{slug}/` → `/recipes/{slug}`; live Instagram/Substack APIs; structured ingredient/time fields; local media ingest into EmDash storage.

## Ricetta / Catalogo (2026-11-09)

1. **First-class CMS content** — dedicated collection (not EmDash `posts`). `posts` stays untouched and unused for recipes.
2. **Schema v1 (slim)** — title, featured image, Portable Text body. Ingredients / time / servings stay in prose (WP had no structured recipe meta; body was WPBakery HTML).
3. **Language** — English only in v1 (matches WP channel). No separate IT fields; bilingual blocks inside some bodies are import noise, not a bilingual model.
4. **Categoria ricetta** — dedicated taxonomy from WP categories (Pasta, Baking, seasons, diet labels, …); distinct from blog `category` / `tag`.
5. **Import scope** — all published WP `post`s → Ricetta; ignore pages, attachments, menus, drafts, theme assets. Strip shortcodes / newsletter footers as needed during conversion.
6. **Media v1** — remote URLs on `spaghettiabc.com/wp-content/...` (same spirit as partner logo remote URLs); download into EmDash storage later.
7. **Nav** — primary menu item **Ricette** → `/recipes`.

## Sezione Il mio mondo (2026-11-09)

1. **Job** — curated three-slot showcase, fixed order: **Post Instagram** → **Articolo Substack** → **Ricetta selezionata**. Not an aggregated feed.
2. **CMS-first** — Instagram and Substack are curated snapshots (no live sync), same boundary as **Recensione Google**.
3. **Snapshot fields** — Post Instagram: image + short caption + URL. Articolo Substack: title + excerpt + URL + optional image. Ricetta selezionata: single homepage reference to one Ricetta.
4. **Chrome** — section title/subtitle (CMS) + CTA fixed to Catalogo Ricette `/recipes` (Tour-section pattern).
5. **Homepage order (when promoted)** — after **Sezione Formazione**, before **Sezione Dicono di me**.
6. **Layout** — playful / experimental; explore on `/_dev` first, then promote the winning variant to production homepage (and only then wire homepage CMS fields for the section if not already stubbed for the playground).

## Explicit non-goals (2026-11-09)

- Live Instagram or Substack integration
- Using or replacing the EmDash `posts` collection for recipes
- Structured recipe schema (ingredients repeater, cook time fields) in v1
- Local media ingest in v1
- Old-URL redirects in #16
- Shipping Sezione Il mio mondo on the production homepage in the same beat as Catalogo/Schede

## Implementation — Track B playground (2026-11-09)

Subagent shipped the `/_dev` playground in the working tree on 2026-11-09 (uncommitted; not locked to a git SHA). Shared shell: [`/_dev/*` playgrounds](./_dev-playgrounds.md).

**Routes:** hub `/_dev/il-mio-mondo` + variants `/_dev/il-mio-mondo/a|b|c` via `devPlaygrounds()` `injectRoute`. Files under `src/dev/il-mio-mondo/` (`index.astro`, `[variant].astro`, `variants.ts`, `fixtures.ts`). Every page calls `gateDevOnly`.

**UI:** `src/components/_dev/IlMioMondoMock.astro`; CSS `src/styles/_dev/il-mio-mondo-playground.css` (imports shared `playground-chrome.css`). Frames use `Base` `hideHeader`. Instagram + Substack = playground fixtures; Ricetta selezionata = first published recipe with `featured_image` from `getEmDashCollection("recipes")`. Production homepage untouched.
