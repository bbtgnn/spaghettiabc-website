# Libro CMS model

## Sources

- Grilling session with Chiara, 2026-10-23 (Q1–Q10)
- Domain terms: [`GLOSSARY.md`](../../../GLOSSARY.md)
- Implementation report: agent [Implement book CMS](7a2d5eea-d697-4f1e-9d1b-75414d7443ff), 2026-10-23
- Related: [Homepage + Tours schema](./homepage-tours-schema.md)

## Decisions (2026-10-23)

On 2026-10-23 Chiara locked:

1. **Libro is first-class content** (collection), not only a homepage block.
2. **CTA goes to an on-site page** with a fixed path, not an external shop URL (shop deferred).
3. **One canonical Libro** site-wide: entry id `puglia-the-book`. Homepage does **not** use a reference field; it does not load the book entry for the teaser.
4. **Sezione Libro** owns its own `book_title`, `book_subtitle`, `book_image`, `book_cta_label` (intentional duplication vs Libro fields).
5. **Public URL** is `/puglia-the-book` (top-level dedicated Astro route).
6. **Collection slug** is `book` (singular), not `books`.
7. **Book detail page** is undesigned: placeholder fields only (`title`, `subtitle`, `cover`, `excerpt`, `content`); refine later.

## Implementation snapshot

As of `spaghettiabc-website@51eaca3` (2026-10-23): collection `book`, homepage Sezione Libro, `/puglia-the-book`, glossary + wiki landed on `feature/homepage-tours-schema`.

*(Supersedes earlier same-day note that book work was still uncommitted.)*

## Explicitly out of scope (2026-10-23)

- Real visual design of the book page
- External purchase URL / price fields
- Menu item for the book
- Removing starter `posts` / categories / tags
