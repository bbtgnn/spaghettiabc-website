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

| Surface | Per locale | Shared across locales |
| ------- | ------------ | --------------------- |
| **Tour** | `title`, `excerpt`, `destination`, `duration`, `group_size`, `language`, `included`, `price`, `content`; image `alt` per locale | Media files, `calendly_url`, structural refs |
| **Homepage** | Section titles, subtitles, CTAs, placeholders; image alts | Google review **quote + author** (original language, not re-translated); partner logo **files + brand names**; Google score / count / URL; `featured_tours` refs resolve to **same-locale** tour entries |
| **Libro** (`libri`) + **Formazione** (`training`) | `title`, `subtitle`, `excerpt`, `content`; cover alts per locale | Cover image files |
| **Impostazioni sito** (`site_globals` / `site`) | FAQ `question` / `answer` per locale | `calendly_url` |
| **Navigation + site settings** | Primary menu labels and **localized paths**; site `title` / `tagline` per locale | — |

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