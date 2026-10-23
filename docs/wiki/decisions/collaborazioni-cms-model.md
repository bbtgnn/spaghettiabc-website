# Collaborazioni CMS model

## Sources

- Grilling session with Chiara, 2026-10-23 (Q1–Q8, confirmed “sì”)
- Domain terms: [`GLOSSARY.md`](../../../GLOSSARY.md)
- Pattern contrast: [Libro CMS model](./libro-cms-model.md), [Formazione CMS model](./formazione-cms-model.md)
- Related pattern: [Homepage chrome + landing lists](../ops/homepage-chrome-landing-lists.md)

## Decisions (2026-10-23)

On 2026-10-23 Chiara locked:

1. **One Collaborazioni landing** — not a catalog of progetti yet.
2. **CTA to on-site page** with fixed URL.
3. Canonical name **Collaborazioni** (not “Credibilità” / “Progetti” as the entity name).
4. **Logos + testimonianze live only on the landing** (single source). Homepage **fetches** that entry for the lists. Homepage still owns `collaborations_title`, `collaborations_subtitle`, `collaborations_cta_label` (Libro-style chrome).
5. URL **`/collaborazioni`**; collection slug **`collaborations`**; entry id **`collaborazioni`**.
6. Landing fields: `title`, `subtitle`, `excerpt`, `content`; repeaters `logos` (`logo` image + optional `name`), `testimonials` (`author`, optional `role_or_company`, `quote`, `rating`), `gallery` (project photos).
7. **Four** invented IT testimonianze in seed, all 5 stars; UI as testimonianze (not “Google verified”); fictional author names until real ones provided.
8. Partner **logo zip** to be supplied by Chiara — placeholders until ingested.

## Implementation snapshot (2026-10-23, pre-commit)

On 2026-10-23 [Implement Collaborazioni CMS](0d2c3913-be80-4027-b0b5-4f852c8659e7) reported: collection `collaborations`, homepage chrome, `/collaborazioni` + section on `/` returning 200; Unsplash logo placeholders at first.

Later same day [Swap collab logos](8400d159-50c9-4ba2-b936-9ae2648299ae) linked all six zip logos in the DB via `emdash media upload` (loopback `$media` blocked by EmDash). See [Collaborazioni logos ingest](../ops/collaborazioni-logos-ingest.md).

## Explicitly out of scope (2026-10-23)

- Per-project case-study entries
- Claiming Google as review source
- Menu item (unless added later)
