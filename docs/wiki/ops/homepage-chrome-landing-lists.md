# Homepage chrome + landing lists

## Sources

- [Collaborazioni CMS model](../decisions/collaborazioni-cms-model.md) (2026-10-23)
- Contrast: [Libro](../decisions/libro-cms-model.md), [Formazione](../decisions/formazione-cms-model.md)

## Pattern (decided 2026-10-23)

When a homepage section needs **lists** that belong to a landing (e.g. partner logos):

- Put those lists on the **landing collection entry** (single editor surface).
- Keep section **title / subtitle / CTA label** on the **homepage** entry (marketing chrome), like Libro/Formazione.
- Homepage template **fetches** the canonical landing by fixed id (no reference field) to render the lists.
- CTA href stays a **fixed** path (e.g. `/collaborazioni`).

Do **not** duplicate landing-owned repeater lists onto `homepage` — that was rejected for Collaborazioni logos on 2026-10-23.

## Exception — Recensioni Google (2026-11-05)

On 2026-11-05 Chiara moved quote-style reviews **onto the homepage** as `google_reviews` (and removed Collaborazioni `testimonials`). Logos still follow the 2026-10-23 landing-list pattern; reviews do not. See [Homepage hero + Recensioni Google](../decisions/homepage-hero-google-reviews.md).

## Supersession — Collaborazioni logos (2026-11-06)

On 2026-11-06 the Collaborazioni landing was removed. Partner logos moved onto the homepage as `partner_logos` under **Sezione Dicono di me**. The 2026-10-23 “do not duplicate landing lists onto homepage” rule **no longer applies** to that section — there is no landing. Libro/Formazione still follow the chrome + landing-list pattern above. See [Sezione Dicono di me](../decisions/dicono-di-me-section.md).
