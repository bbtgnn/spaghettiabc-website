# Generated seed fragments (issue #16)

## `recipes-from-wxr.json`

Produced by `bun scripts/wxr-to-recipes-seed.mjs` (see [recipe-wxr-import.md](../../docs/wiki/ops/recipe-wxr-import.md)).

```json
{
  "taxonomyTerms": [
    { "slug": "pasta", "label": "Pasta" }
  ],
  "entries": [
    {
      "id": "…",
      "slug": "…",
      "status": "published",
      "data": {
        "title": "…",
        "featured_image": { "$media": { "url": "…", "alt": "…", "filename": "…" } },
        "content": [/* Portable Text */]
      },
      "taxonomies": { "recipe_category": ["pasta"] }
    }
  ],
  "meta": { "recipeCount": 79, "taxonomyTermCount": 19 }
}
```

### Merge steps (when wiring into `seed/seed.json`)

1. Replace `taxonomies[]` entry `name: "recipe_category"` → `terms` with `taxonomyTerms` (or union by slug).
2. Replace `content.recipes` with `entries` from this file (drop the two `*-placeholder` demos).
3. Keep collection schema + menu item in `seed.json` as-is. Do not commit `meta` into the seed.
