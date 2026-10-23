# Homepage chrome + landing lists

## Sources

- [Collaborazioni CMS model](../decisions/collaborazioni-cms-model.md) (2026-10-23)
- Contrast: [Libro](../decisions/libro-cms-model.md), [Formazione](../decisions/formazione-cms-model.md)

## Pattern (decided 2026-10-23)

When a homepage section needs **lists** (logos, testimonials, etc.):

- Put the lists on the **landing collection entry** (single editor surface).
- Keep section **title / subtitle / CTA label** on the **homepage** entry (marketing chrome), like Libro/Formazione.
- Homepage template **fetches** the canonical landing by fixed id (no reference field) to render the lists.
- CTA href stays a **fixed** path (e.g. `/collaborazioni`).

Do **not** duplicate repeater lists onto `homepage` — that was rejected for Collaborazioni on 2026-10-23.
