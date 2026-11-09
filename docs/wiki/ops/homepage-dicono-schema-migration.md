# Homepage Dicono schema migration

## Sources

- Decision: [Sezione Dicono di me](../decisions/dicono-di-me-section.md) (2026-11-06)
- Drift note: [EmDash types paths](./emdash-types-paths.md) (2026-11-09)
- Seed target: `seed/seed.json` homepage fields

## When / why (2026-11-09)

Live `data.db` still had Collaborazioni homepage chrome (`collaborations_*`) and a thin `google_reviews` repeater (author/quote/rating only). Seed + glossary already defined **Sezione Dicono di me**. Types regenerated from the live schema, so `astro check` failed on Homepage field names until the DB was aligned.

## Backup

`backups/emdash-homepage-20261109-2021/`

On 2026-11-09, after the migration, `backups/` was added to `.gitignore` so local DB dumps are not committed by accident.

- `data.db` (+ `-wal` / `-shm`)
- `export-seed.json` (`npx emdash export-seed --with-content=all -d data.db`)
- `homepage-home.json`, `collaborations-collaborazioni.json`, `schema-collaborations.json`

## Approach

1. **Schema (surgical via seed, no content wipe):**  
   `npx emdash seed seed/seed.json -d data.db --no-content --on-conflict=update`  
   Created 7 homepage fields (`form_heading_dicono`, `dicono_title`, `dicono_subtitle`, `partner_logos`, `google_score`, `google_review_count`, `google_profile_url`) and updated `google_reviews` subFields to include `avatar` + `review_url`. Did **not** remove obsolete fields or the `collaborations` collection by itself. Live hero/tour/book/training/newsletter values stayed intact.
2. **Content map** (`npx emdash content update homepage home`):

   | From (live) | To |
   | --- | --- |
   | `collaborations_title` (= Collaborazioni) | `dicono_title` → **Dicono di me** |
   | `collaborations_subtitle` | `dicono_subtitle` (preserved live text) |
   | `collaborations_cta_label` | dropped (no CTA in Dicono model) |
   | collaborations entry `logos` | `partner_logos` `{ logo, name }` (6 live media ids) |
   | `google_reviews` quotes/ratings | preserved (incl. Luca P. ★4); added seed demo `avatar` + `review_url` |
   | (absent live) | `google_score` 5 / `google_review_count` 48 / `google_profile_url` from seed |

3. **Cleanup:** removed fields `form_heading_collaborations`, `collaborations_title`, `collaborations_subtitle`, `collaborations_cta_label`; soft-deleted `collaborazioni` entry then `npx emdash schema delete collaborations --force`.
4. **Types / check:** `npx emdash types` + `/_emdash/api/typegen`; `npx astro check` → **0 errors** (1 hint elsewhere). Smoke: `/` and `/_dev/sezione-tour` → 200; Dicono section rendered.

## Notes / pitfalls

- Schema CLI `add-field` cannot create `repeater` / `url` types; seed `--no-content --on-conflict=update` was the practical way to add complex fields without overwriting content.
- Seeding the DB while the Astro Vite runner was mid-request left the module runner closed; restart `npm run dev` before content writes after direct DB schema changes.
- `schema delete` needs the collection empty (or soft-delete content first); use `--force` to skip the TTY confirm.
