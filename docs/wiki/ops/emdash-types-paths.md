# EmDash types paths

## Sources

- Implementation report: agent [Implement book CMS](7a2d5eea-d697-4f1e-9d1b-75414d7443ff), 2026-10-23
- Project rules: [`AGENTS.md`](../../../AGENTS.md)

## Finding (2026-10-23)

On 2026-10-23 the implementer observed:

- `npx emdash types` wrote **`.emdash/types.ts`** (and CLI also touched `.emdash/schema.json`).
- The tracked file that `tsconfig` / the site expects is root **`emdash-env.d.ts`** (per `AGENTS.md`: regenerated on dev server start).
- For the Book work, `emdash-env.d.ts` was **hand-synced** so `Book` and homepage book fields were visible to TypeScript.

`.emdash/` was already treated as untracked / not for commit in the 2026-10-23 handoff.

## Agent pitfall

After schema changes: do not assume CLI output alone updates `emdash-env.d.ts`. Confirm root types include new collections/fields (or run `bun dev` and re-check), especially if only `.emdash/types.ts` changed.
