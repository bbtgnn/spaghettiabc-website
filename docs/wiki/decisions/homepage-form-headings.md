# Homepage form headings (CMS editor)

## Sources

- GitHub issue [#5](https://github.com/bbtgnn/spaghettiabc-website/issues/5) — form separators/titles in the CMS editor
- Grilling session with Chiara, 2026-10-28
- Domain terms: [`GLOSSARY.md`](../../../GLOSSARY.md) (unchanged — no new glossary entries for form chrome)

## Scope (2026-10-28)

**In scope:** issue #5 only — visual section headings and thin rules in the Homepage entry editor so content editors (Flavia) can scan the form by block.

**Out of scope:**

- Admin branding / chrome outside the Homepage form
- Issue #3 (logos)
- Issue #4 (Google reviews)

## Audience (2026-10-28)

Primary reader: **content editors** (Flavia), not developers.

## Terminology (2026-10-28)

- **Form headings** are editor-only labels. They are **not** the public-site **[Sezione Tour]**, **[Sezione Libro]**, etc. defined in [`GLOSSARY.md`](../../../GLOSSARY.md).
- Heading **titles** in the admin use short names only: **Hero**, **Tour**, **Libro**, **Formazione**, **Collaborazioni**, **Newsletter** — the word “Sezione” is omitted on purpose.

## Product decisions (2026-10-28)

1. **v1 collection:** `homepage` only (no other collections in v1).
2. **Visual:** static title + thin horizontal rule; **not** collapsible. Functional v1; visual polish deferred.
3. **Data model:** keep the existing flat homepage field list. Do **not** reshape groups with Field Kit object-form or block fields.
4. **EmDash Portable Text “Sections”** (library blocks) are unrelated — do **not** use them for form chrome.
5. **Mechanics:** boolean marker fields `form_heading_*` with `widget: "form-headings:heading"`, rendered by a **native React field widget** plugin (`form-headings`). Public site templates **ignore** marker fields (no reads, no layout impact).
6. **Italian labels** on real content fields per the homepage field map in `seed/seed.json` (images → Immagine, titles → Titolo, etc.).

## Heading map (2026-10-28)

| Marker slug | Form heading title | Precedes (content fields) |
| --- | --- | --- |
| `form_heading_hero` | Hero | `hero_*` |
| `form_heading_tour` | Tour | `tour_*`, `featured_tours` |
| `form_heading_book` | Libro | `book_*` |
| `form_heading_training` | Formazione | `training_*` |
| `form_heading_collaborations` | Collaborazioni | `collaborations_*` |
| `form_heading_newsletter` | Newsletter | `newsletter_*` |

Markers: `type: boolean`, `required: false`, `defaultValue: false`. The widget displays `label` as the heading; it does not expose a toggle.

## Local schema on an existing database (2026-10-28)

Bundled seed (`seed/seed.json`, path from `package.json` → `emdash.seed`) applies automatically when the SQLite DB is **empty** on first dev request (`bun dev`).

For a **non-empty** local `data.db`, preferred non-destructive path used on 2026-10-28:

```bash
bunx emdash seed seed/seed.json --no-content --on-conflict=update
```

That run created the six `form_heading_*` fields and refreshed labels/widgets. EmDash seed **append** new fields at the end of `sort_order`; it does **not** interleave them to match `seed.json` order. Chiara then saw all headings at the bottom of the Homepage editor.

**Field order fix (2026-10-28):** set `_emdash_fields.sort_order` to the homepage field array order in `seed/seed.json` via `bun scripts/reorder-homepage-fields.mjs` (local SQLite helper; content untouched). Reload the Homepage entry in admin after running it.

Do not run destructive seed/import flows against a DB that holds content you need unless you have exported backup (`bunx emdash export-seed` per [EmDash CLI skill](../../../.agents/skills/emdash-cli/SKILL.md)).
