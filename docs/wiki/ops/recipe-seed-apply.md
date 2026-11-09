# Recipe seed apply (live data.db)

## Sources

- Status: [Issue #16 status](./issue-16-status.md)
- Prior pattern: [Homepage Dicono schema migration](./homepage-dicono-schema-migration.md)
- Seed: `seed/seed.json` (79 recipes / 19 `recipe_category` terms)

## When

2026-11-09 — Track A live DB align for [#16](https://github.com/bbtgnn/spaghettiabc-website/issues/16).

## Backup

`backups/emdash-recipes-20261109/`

- `data.db`, `data.db-wal`, `data.db-shm`
- `export-seed.json` — `npx emdash export-seed --with-content=all -d data.db`

## Commands run

```bash
# 1) Schema only (collection + taxonomy + menu; no content wipe)
npx emdash seed seed/seed.json -d data.db --no-content --on-conflict=update
# → Collections: 1 created (recipes), 6 updated; Fields: 3 created; Taxonomies: 1 created (0 terms); Menus: 4 items

# 2) Content (no collection filter in CLI; update conflict mode)
npx emdash seed seed/seed.json -d data.db --on-conflict=update
# → Content: 79 created, 13 updated; Taxonomies: 23 terms; Media: 82 created, 19 skipped
```

`--skip-media` was **not** needed. Recipe `$media.url` downloads from `https://spaghettiabc.com/wp-content/...` succeeded.

## Smoke (2026-11-09)

- `npx emdash content list recipes` → **79** published items
- `GET http://localhost:4321/recipes` → **200**
- `GET http://localhost:4321/recipes/agnolotti-plin-tomato-potatoes` → **200**
- `GET http://localhost:4321/recipes/zucchini-ricotta-caper-pie` → **200**

Dev server (`bun run dev` on `:4321`) stayed up during seed; no SQLite lock errors. After direct DB schema writes, if Astro module runner acts odd, restart `bun run dev` (same caveat as Dicono migration).

## Caveats

- Seed CLI has no `--collection` filter; full seed with `--on-conflict=update` is the least-destructive content path (updates overlapping entries; does not delete other collections).
- One recipe still has no featured image in seed/WXR: `malloreddus-artichokes-dried-tomatoes`.
- Goal / issue not marked complete — Track B `/_dev` Sezione Il mio mondo still open/deferred.
