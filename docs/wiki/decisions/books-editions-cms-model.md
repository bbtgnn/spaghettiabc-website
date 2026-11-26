# Books / Edizioni CMS model

## Sources

- Grilling session with Chiara, 2026-11-26 — issue [#42](https://github.com/bbtgnn/spaghettiabc-website/issues/42)
- Domain terms: [`GLOSSARY.md`](../../../GLOSSARY.md)
- Supersedes one-canonical-Libro claims in [Libro CMS model](./libro-cms-model.md) (2026-10-23)
- Related ops: [Homepage chrome + landing lists](../ops/homepage-chrome-landing-lists.md)

## Decisions (2026-11-26)

On 2026-11-26 Chiara locked via grilling on [#42](https://github.com/bbtgnn/spaghettiabc-website/issues/42):

### Domain

1. **Libro** is the work/title (Puglia), not a single public URL or CMS entry.
2. **Edizione** (international + special) is first-class content in the CMS.
3. Work lands on a **main-line branch** (not stacked on [#41](https://github.com/bbtgnn/spaghettiabc-website/issues/41) i18n); **unprefixed** public URLs for now.

### Information architecture

4. **Pagina Libri** hub at `/puglia-the-book` teasers both Edizioni.
5. **Scheda Edizione** at `/puglia-the-book/{slug}`.
6. Hub **intro copy is hardcoded in Astro** (same idea as Catalogo Tour), not CMS-owned hub prose.
7. **Sezione Libro** on the homepage: section **title + optional subtitle** only; loads **all published** `libri` entries as teasers. Not chrome `book_image` / `book_cta_label`. Not Formazione-style duplication of edition body fields onto the homepage.
8. CMS: **two entries** in collection `libri`; **no parent Libro** entry.
9. Seed: migrate `puglia-the-book` → `international`; add `special`; order **international then special**.
10. Slugs: `international`, `special`.
11. Fields: keep existing `title` / `subtitle` / `cover` / `excerpt` / `content`, plus a light discriminator — recommended name `edition` (select: `international` | `special`).
12. **Teaser density**: Sezione = cover + title + link; Hub = cover + title + excerpt + link; Scheda = full.
13. **Visual**: structure / placeholder only (no real design pass in #42).
14. **Menu `primary`**: still **no** Libro link.

## Explicitly out of scope (2026-11-26)

- Shop / price / buy URL fields and purchase flow
- Real visual design of hub or Scheda Edizione
- Menu item for Libro / Edizioni
- Stacking this work on #41 i18n or locale-prefixed URLs
- A parent Libro CMS entry above the two Edizioni

## Supersedes (relative to 2026-10-23 Libro model)

As of the 2026-11-26 grill, these 2026-10-23 claims in [libro-cms-model.md](./libro-cms-model.md) are superseded:

- One canonical Libro entry (`puglia-the-book`) site-wide
- Sezione Libro chrome duplication (`book_image`, `book_cta_label`, etc.) instead of loading Edizioni
- Collection slug `book` (singular) as the published content model
- Treating `/puglia-the-book` as the single Libro detail page rather than Pagina Libri hub
