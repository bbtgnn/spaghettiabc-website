# Site structure

Where each part of the site lives, plus the rules the code cannot show. For detail, read the code these sections point at. Terms are in [`GLOSSARY.md`](../GLOSSARY.md); the reasons behind the shape are in [`docs/adr/`](adr/README.md).

## Map

- **Pages:** `src/pages/`, one per Glossary surface (Homepage, Catalogo Tour, Scheda Tour, Scheda Edizione, Formazione). `src/pages/it/**` is generated.
- **Sections and cards:** `src/components/`.
- **Shell:** `src/layouts/Base.astro`, `src/components/SiteHeader.astro`, and `src/styles/theme.css`, which holds the tokens and every shared layout.
- **Locale helpers and UI strings:** `src/i18n/`.
- **CMS schema and demo content:** `seed/seed.json`. Admin plugins are in `plugins/`; admin nav settings are in `astro.config.mjs`.

## Locales

- Pass the locale to every query. Read entries with `getEmDashEntryWithFallback`, and build links with `localePath()` and `entrySlug()`.
- Pages pass `content` to `Base`, so the language switcher can find the paired entry.
- Site title and tagline are shared across locales, because EmDash 1.6 has no per-locale settings. Copy that differs per locale goes on `homepage`.
- The `primary` menu exists once per locale; add a new item to both.

## Design

The font and palette pickers in `DevPreviewDock.astro` are dev-only previews. Production `theme.css` still uses the original walnut colours; moving a preview choice into production is a separate, explicit step.

## Newsletter

The form validates on the client and sends nothing. Add a consent checkbox together with a real provider.

## Seed

- `libri` comes before `homepage` in `content`, so `featured_books` resolves.
- A reference field holds one selection per translation group: seed the same `$ref`s on both locales.
- Seed images are `$media.url` links to `seed/media/` on GitHub `main`, so a new image seeds only once it is merged. The seeder rejects URLs that point at loopback or private IPs.
- A new homepage field goes right after its `form_heading_*` marker in the field array ([ADR-0006](adr/0006-form-headings.md)).
- On a database that already has content (staging D1), seeding appends new fields at the end of the editor, and flipping `translatable` on an existing field needs a wipe and reseed. Run `npx emdash export-seed` before anything destructive.
- `npx emdash types` writes `.emdash/types.ts`; the root `emdash-env.d.ts` regenerates only when the dev server starts.
