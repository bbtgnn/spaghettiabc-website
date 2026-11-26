# Libro CMS model

## Sources

- Grilling session with Chiara, 2026-10-23 (Q1–Q10)
- Domain terms: [`GLOSSARY.md`](../../../GLOSSARY.md)
- Implementation report: agent [Implement book CMS](7a2d5eea-d697-4f1e-9d1b-75414d7443ff), 2026-10-23
- Related: [Homepage + Tours schema](./homepage-tours-schema.md)
- **Superseded in part (2026-11-26)** by [Books / Edizioni CMS model](./books-editions-cms-model.md) — issue [#42](https://github.com/bbtgnn/spaghettiabc-website/issues/42)

## Supersession note (2026-11-26)

On 2026-11-26 Chiara locked [#42](https://github.com/bbtgnn/spaghettiabc-website/issues/42): Libro is the work/title; Edizioni are first-class CMS entries; Pagina Libri hubs teasers; Scheda Edizione is the detail. See [books-editions-cms-model.md](./books-editions-cms-model.md).

Points below marked **superseded 2026-11-26** are historical only; do not treat them as active product rules.

## Decisions (2026-10-23)

On 2026-10-23 Chiara locked:

1. **Libro is first-class content** (collection), not only a homepage block. *(Partially superseded 2026-11-26: the published CMS units are Edizioni in `libri`; Libro remains the domain work, not one entry.)*
2. **CTA goes to an on-site page** with a fixed path, not an external shop URL (shop deferred). *(Still aligned 2026-11-26: shop/price/buy remain out of scope; paths become hub + Scheda Edizione.)*
3. **One canonical Libro** site-wide: entry id `puglia-the-book`. Homepage does **not** use a reference field; it does not load the book entry for the teaser. **Superseded 2026-11-26.**
4. **Sezione Libro** owns its own `book_title`, `book_subtitle`, `book_image`, `book_cta_label` (intentional duplication vs Libro fields). **Superseded 2026-11-26** (title + optional subtitle only; load published Edizioni as teasers).
5. **Public URL** is `/puglia-the-book` (top-level dedicated Astro route). *(Path kept 2026-11-26 as Pagina Libri hub; meaning changed from single Libro detail.)*
6. **Collection slug** is `book` (singular), not `books`. **Superseded 2026-11-26** (collection `libri`, two Edizione entries).
7. **Book detail page** is undesigned: placeholder fields only (`title`, `subtitle`, `cover`, `excerpt`, `content`); refine later. *(Fields retained on Edizioni 2026-11-26 + discriminator; visual still placeholder.)*

## Implementation snapshot

As of `spaghettiabc-website@51eaca3` (2026-10-23): collection `book`, homepage Sezione Libro, `/puglia-the-book`, glossary + wiki landed on `feature/homepage-tours-schema`.

*(Supersedes earlier same-day note that book work was still uncommitted.)*

Wiki decision ingest for #42 (2026-11-26) does **not** claim code has moved to `libri` yet — that is implementation work after the grill.

## Explicitly out of scope (2026-10-23)

- Real visual design of the book page
- External purchase URL / price fields
- Menu item for the book
- Removing starter `posts` / categories / tags
