# Architecture decision records

Decisions behind the shape of the site and the CMS, in the short form: record _that_ a decision was made and _why_. The current shape lives in the code, mapped by [`docs/site-structure.md`](../site-structure.md); domain terms are in [`GLOSSARY.md`](../../GLOSSARY.md).

## Template

```md
# {Short title of the decision}

{1–3 sentences: context, decision, why.}
```

An ADR may be a single paragraph. Add a section only when it earns its place:

- **Decision** when the context paragraph needs the choice stated on its own
- **Rejected** when the alternatives are worth remembering, so nobody proposes them again
- **Consequences** when a non-obvious downstream effect needs calling out
- **Status** (`proposed` | `accepted` | `superseded by ADR-NNNN`) when a decision is revisited

When a decision changes, rewrite the ADR to the current decision and link the ADR that changed it. Keep no "Later:" history blocks; git holds the history.

## Numbering

Filenames are `NNNN-slug.md`. Scan this directory for the highest `NNNN` and increment by one.

## When to add an ADR

All three must hold:

1. **Hard to reverse**: changing it later has a meaningful cost.
2. **Surprising without context**: a future reader will wonder why the code looks this way.
3. **Real trade-off**: there were genuine alternatives, picked for stated reasons.

Keep the choice, the boundary, the reason, and the rejected alternatives that matter. Leave field inventories, file paths, and task lists to the code, and runbooks to `DEPLOY.md`.

## Index

- [0001 — Single-entry collections](0001-single-entry-collections.md)
- [0002 — Libro is presented through its Edizioni](0002-libro-edizioni.md)
- [0003 — Formazione is one landing](0003-formazione-landing.md)
- [0004 — Social proof lives on the homepage](0004-homepage-social-proof.md)
- [0005 — Prenotazione via an embedded Calendly](0005-prenotazione-calendly.md)
- [0006 — Form headings are marker fields](0006-form-headings.md)
- [0007 — Bilingual site on EmDash locales](0007-bilingual-site.md)
- [0008 — Recensioni Google via Business Profile plugin](0008-google-reviews-plugin.md)
- [0009 — Node for local dev, Workers for production](0009-node-dev-workers-prod.md)
