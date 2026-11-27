# Site structure

Current shape of the public site and the CMS: where each surface lives and the rules that keep it consistent. Domain terms are defined in [`GLOSSARY.md`](../GLOSSARY.md); the reasons behind the shape are in [`docs/adr/`](adr/README.md). When you change a surface, update its section here in the same PR.

## Routes

Every public route exists in English at the root and in Italian under `/it/`.

| Surface | EN path | Page | CMS source |
| --- | --- | --- | --- |
| Homepage | `/` | `src/pages/index.astro` | `homepage` / `home` |
| Catalogo Tour | `/tours` | `src/pages/tours/index.astro` | `tours` + `homepage.featured_tours` |
| Scheda Tour | `/tours/[slug]` | `src/pages/tours/[slug].astro` | `tours` + `site_globals` / `site` |
| Scheda Edizione | `/books/[slug]` | `src/pages/books/[slug].astro` | `libri` |
| Formazione | `/training` | `src/pages/training.astro` | `training` / `training` |
| 404 | — | `src/pages/404.astro` | — |

The admin is at `/_emdash/admin` and is never locale-prefixed.

## Locales

- English is the default locale and unprefixed; Italian lives under `/it/`. Astro's `i18n` block in `astro.config.mjs` configures this; EmDash reads it from there.
- `src/pages/it/**` contains generated one-line stubs that render the root page. `scripts/sync-locale-pages.mjs` owns the allowlist; `predev` and `prebuild` both run it.
- Site-facing locale code lives in `src/i18n/`: `ui.ts` holds the UI chrome dictionary (button labels, aria text, empty states) and `utils.ts` holds the helpers. Build tooling that only runs from npm scripts stays in `scripts/`.
- Queries pass the locale explicitly. Use `getEmDashEntryWithFallback` for entries (requested locale → EN → IT), `localePath()` for internal links, and `entrySlug()` to strip locale folders from EmDash ids before building a URL. Astro's own `fallback` setting stays unset because it redirected every `/it/` URL to English.
- Each locale has its own slugs for the same entry (for example `polignano-food-tour` / `tour-enogastronomico-polignano`); EmDash translation groups pair them. The language switcher in `SiteHeader.astro` uses `getTranslations` to jump to the paired entry, falling back to that locale's homepage.
- EmDash site settings (`title`, `tagline`) are shared across locales; EmDash 1.6 has no per-locale settings. Per-locale marketing copy lives on `homepage`.
- The `primary` menu is seeded once per locale, with locale-prefixed URLs.

## Shell and chrome

- `src/layouts/Base.astro` wires EmDash (head, menus, page contributions), sets `<html lang>`, and imports `src/styles/theme.css`. Pages pass `content` to `Base` so the switcher and plugins know which entry is shown.
- The header and the mobile menu live in `src/components/SiteHeader.astro` (EmDash `primary` menu plus the language switcher; no cart). Keep them out of `Base.astro`.
- `src/styles/theme.css` holds the tokens, type scale, controls, shared layouts (`.tour-grid`, `.tour-highlight`, `.tour-rail--compact`, `.review-rail`), site chrome, and motion. The site shell is `--shell: 80rem` (1280px).
- Production type: Display Fraunces, Body Source Serif 4, UI Fira Sans (`data-font-ui-case="sans"`, uppercase). With a serif UI face, UI text switches to sentence case through `::first-letter`, so those elements must not be flex containers. Nav links always use the body face.
- Production colour is still the original walnut tokens in `:root`. In dev, `DevPreviewDock.astro` previews font pairings and palettes (pomodoro by default) and stores choices in `localStorage` (`spaghettiabc-*` keys); nothing is locked into production yet.

## Homepage

Sections in order, all driven by the single `homepage` entry. Admin form headings group the fields (see [CMS](#cms)).

1. **Hero** — `hero_*`; CTAs to the Catalogo Tour and to `#libro`.
2. **Sezione Tour** (`SezioneTour.astro`) — `tour_*` + `featured_tours`. The first two featured tours form an equal vertical highlight pair (`TourLargeCard`), the rest a compact rail, followed by the review strip (`CompactReviewRail.astro`) with Punteggio Google and Recensioni Google.
3. **Sezione Libro** (`#libro`) — `book_title`, `book_subtitle`, `featured_books` (ordered references to `libri`), `book_cta_label`. Teasers link to the Scheda Edizione; there is no Libro hub page and no buy CTA here.
4. **Sezione Formazione** — its own `training_title` / `training_subtitle` / `training_image` / `training_cta_label`, linking to `/training`. It does not read the Formazione entry.
5. **Sezione Dicono di me** — `dicono_*` + `partner_logos` (`PartnerLogoMarquee.astro`). Logos only; the Google proof renders in Sezione Tour.
6. **Sezione Newsletter** — `newsletter_*`. UI only: the form validates and shows a message client-side and sends nothing. No consent checkbox until a real provider exists.

## Tours

- **Catalogo Tour** — intro copy from the UI dictionary, then the highlight pair (`TourLargeCard`, first two in `featured_tours` order) and the remaining tours as `TourLargeCard` in `.tour-grid`. Tour order follows `featured_tours`, then any extras. `.tour-grid` and `.tour-highlight` live in `theme.css`; don't redefine them page-locally.
- **Scheda Tour** (`SchedaTourHeroPrenotaSplit.astro`) — tall hero, then body | booking column (separate bordered specs and Calendly cards); no related tours. Below 768px the order is intro → booking → body (`copycol` is `display: contents` with flex `order`). From 768px the intro is full width, then a centered `| copycol (≤65ch) | book (≤400px) |`.
- **Prenotazione** — the effective Calendly URL is the tour's `calendly_url` (trimmed), else `site_globals.calendly_url`, else no embed (`src/utils/resolve-tour-calendly-url.ts`). Visual editing on the Scheda targets the tour field. `CalendlyEmbed.astro` server-renders a real `<iframe>`; `src/scripts/calendly-embed.ts` then swaps in the Calendly widget.
- **Domande frequenti** — read from `site_globals` / `site` `faq`; hidden when empty.

## Libro

- Collection `libri`, one entry per Edizione (`international`, `special`), no parent Libro entry. Fields: `title`, `subtitle`, `cover`, optional `buy_url` / `buy_label`, `content`.
- **Scheda Edizione** — cover as the hero object, then edition copy, buy CTA, and description; the back link goes to the locale's `/#libro`. The buy CTA appears only here.

## Formazione

A single `training` entry rendered at `/training`; fields `title`, `subtitle`, `cover`, `excerpt`, `content`. Individual percorsi are copy inside the page, not entries.

## CMS

- **Collections:** `homepage`, `tours`, `libri`, `training`, `site_globals` (admin label «Impostazioni sito»). `homepage`, `training`, and `site_globals` are non-routable, single-entry collections with fixed ids `home`, `training`, `site`.
- **Form headings** (`plugins/form-headings`) — boolean fields named `form_heading_*` with `widget: "form-headings:heading"` render as section titles in the Homepage editor (Hero, Tour, Libro, Formazione, Dicono di me, Newsletter — no "Sezione" prefix). Public templates ignore them. A new homepage field goes after its heading in the seed's field array.
- **Layout consigliato** (`plugins/layout-consigliato`) — an admin page with a switch that applies the recommended editor layout (hides unused nav entries and editor panels for Flavia).
- **Hidden admin areas** — `astro.config.mjs` hides Calendar, Media, Comments, Widgets, Sections, Bylines, and Import from the admin nav.
- **Types** — `emdash-env.d.ts` regenerates when the dev server starts. `npx emdash types` writes `.emdash/types.ts` (git-ignored), not the root file.

## Seed and local data

- `seed/seed.json` holds the schema and the full EN + IT demo content; it is also the source of truth for every field's `translatable` flag.
- `npm run dev` runs `predev`: sync the `it/` pages, `wipe:local`, then `seed`. Local data is disposable; edit the seed, not the database.
- Order matters: `libri` comes before `homepage` in `content` so `featured_books` references resolve. Reference fields hold one selection per translation group, so seed the same `$ref`s on both locales.
- Seed images are `$media.url` links to `seed/media/` on `main` in GitHub, so a new image only seeds once it is on `main`. The seeder rejects `$media.url` pointing at loopback or private IPs.
- On a database that already has content (staging D1), seeding appends new fields at the end of the editor's field order, and flipping `translatable` on an existing field needs a wipe and reseed. Export first with `npx emdash export-seed` before anything destructive.
