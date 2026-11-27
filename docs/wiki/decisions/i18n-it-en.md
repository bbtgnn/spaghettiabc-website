# Full IT/EN i18n (#41)

## Sources

- Issue: [#41](https://github.com/bbtgnn/spaghettiabc-website/issues/41)
- Grill session with Chiara, 2026-11-26 (Q1–Qn closed)
- Branch at wiki write: `feat/41-full-i18n` @ `59a8b3c`
- Domain terms: [`GLOSSARY.md`](../../../GLOSSARY.md) — **Locale**, **Libro**, **Tour**
- Related: [Libro CMS model](./libro-cms-model.md) (collection name note 2026-11-26)

## Decisions (2026-11-26)

Chiara closed the grill for full bilingual site content and routing. Implementation had not started in application code as of wiki write time (2026-11-26).

### Platform approach

1. **EmDash native locales** — Astro i18n plus per-entry translation records in the CMS. **Not** duplicate `_en` / `_it` fields on a single entry.
2. **Default locale: EN**; **IT** secondary.
3. **URL prefixes (amended):** EN **unprefixed** (`/`, `/tours`, …); IT under `/it/...`. Both-prefixed `/en/...` + `/it/...` with `prefixDefaultLocale` was **reverted** — it 404’d EmDash `/_emdash/admin`. Do not re-enable `prefixDefaultLocale`. Static segment translation (e.g. `/tours` → `/it/tour`) deferred to [#49](https://github.com/bbtgnn/spaghettiabc-website/issues/49).
4. **No Accept-Language auto-detect** in #41 (explicit locale in path for IT; EN has no prefix).
5. **Content fallback order** when a field is missing in the requested locale: requested locale → EN → IT (safety net, not editorial strategy).

### Domain language

6. **Locale** = site language (`en` | `it`), distinct from the Tour field `language` (spoken language of the experience). See glossary **Locale** (added 2026-11-26).
7. **Independent slugs per locale** for the same logical entry; EmDash translation groups link EN/IT pairs. URLs are locale-local, not shared slug across languages.

### UI chrome vs CMS copy

8. **Language switcher** in `SiteHeader`: if a translation exists for the current entry, switch to the paired entry in the target locale; otherwise land on that locale’s homepage.
9. **UI chrome strings** (nav labels baked into components, buttons, form hints, etc.) live in **code dictionaries** (e.g. `src/i18n/ui.ts`), not in CMS collections.

### Field matrix — translate vs share

Locked in `seed/seed.json` via `translatable: false` on shared fields (default is per-locale). Re-evaluate on every schema/field change — see **AGENTS.md**. Image/gallery fields stay translatable so **alt** can differ; reuse the same media file by convention. Content Types admin does not expose the content-field toggle.

| Surface | Per locale (`translatable` default) | Shared (`translatable: false`) |
| ------- | ------------------------------------- | ------------------------------ |
| **Tour** (`tours`) | `title`, `featured_image`, `excerpt`, `destination`, `duration`, `group_size`, `language`, `included`, `price`, `gallery`, `content` | `calendly_url` |
| **Homepage** | Section titles/subtitles/CTAs/placeholders; `hero_image`, `training_image`; newsletter copy | `form_heading_*`; `featured_tours`, `featured_books` (one selection; seed canonical `$ref`s on both locales; resolve to locale siblings); `partner_logos`; `google_score`, `google_review_count`, `google_profile_url`, `google_reviews` (original language, not re-translated) |
| **Libro** (`libri`) | `title`, `subtitle`, `cover`, `buy_label`, `content` | `buy_url` |
| **Formazione** (`training`) | `title`, `subtitle`, `cover`, `excerpt`, `content` | — |
| **Impostazioni sito** (`site_globals`) | `faq` | `calendly_url` |
| **Navigation + site settings** | Primary menu labels and **localized paths** | Site `title` / `tagline` shared in EmDash 1.6 (no per-locale settings API yet) |

### Seed and editorial

10. Seed **both EN and IT fully** for all in-scope entries; runtime fallback is a safety net, not the content plan.

### Out of scope (#41)

- Collections: `posts`, `pages`, `category`, `tag` (starter blog surface stays monolingual / untouched for this issue).

### Glossary / CMS naming note (2026-11-26)

- Technical collection name for Libro content is **`libri`** (aligned to seed), not `book`. Domain term **Libro** unchanged. See [Libro CMS model](./libro-cms-model.md).

## Explicitly deferred / not in #41

- Accept-Language or geo-based locale detection
- Translating blog posts, static pages, categories, or tags
- Localized **static** path segments (`tours` / `books` / `training` → IT labels) — see [#49](https://github.com/bbtgnn/spaghettiabc-website/issues/49)