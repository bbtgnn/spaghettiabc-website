# Formazione CMS model

## Sources

- Grilling session with Chiara, 2026-10-23 (Q1–Q9)
- Domain terms: [`GLOSSARY.md`](../../../GLOSSARY.md)
- Pattern mirror: [Libro CMS model](./libro-cms-model.md)

## Decisions (2026-10-23)

On 2026-10-23 Chiara locked:

1. **Formazione is one landing** for the B2B offer (percorsi/incontri stay as copy inside that page for now — not a catalog).
2. **CTA goes to an on-site page** with a fixed path.
3. **One canonical entry** site-wide: id/slug `training`. Homepage does **not** use a reference field.
4. **Sezione Formazione** owns its own `training_title`, `training_subtitle`, `training_image`, `training_cta_label` (intentional duplication, like Libro).
5. **Public URL** is `/training` (temporary slug; may become Italian later).
6. **Collection slug** is `training` (label admin: Formazione), not `formazione`.
7. **Detail page** is undesigned: placeholder fields `title`, `subtitle`, `cover`, `excerpt`, `content`.

## Implementation snapshot (2026-10-23, pre-commit)

On 2026-10-23 after grilling, code landed on `feature/homepage-tours-schema` (uncommitted at wiki write): `seed/seed.json` collection `training` + homepage `training_*` fields; `src/pages/training.astro`; Sezione Formazione on `index.astro`; `emdash-env.d.ts` hand-synced. Seed applied with `--on-conflict update --skip-media`.

## Explicitly out of scope (2026-10-23)

- Catalog of individual percorsi as separate entries
- Real visual design of the training page
- External booking / contact form fields
- Menu item for Formazione
