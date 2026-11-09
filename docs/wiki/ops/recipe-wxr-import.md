# Recipe WXR → seed fragment

## Sources

- Decision: [Ricette + Sezione Il mio mondo](../decisions/il-mio-mondo-recipes.md) (2026-11-09)
- Status: [Issue #16 status](./issue-16-status.md)
- WXR: `import/spaghettiabc-export-wordpress.xml` (export **2026-10-29**; binaries not in file — see `import/README.md`)
- Converter: `scripts/wxr-to-recipes-seed.mjs`
- Output: `seed/generated/recipes-from-wxr.json`

## Re-run

From repo root:

```bash
bun scripts/wxr-to-recipes-seed.mjs
```

Requires the WXR at `import/spaghettiabc-export-wordpress.xml`. Overwrites `seed/generated/recipes-from-wxr.json`.

## Output shape

```json
{
  "taxonomyTerms": [{ "slug": "pasta", "label": "Pasta" }],
  "entries": [
    {
      "id": "recipe-…",
      "slug": "…",
      "status": "published",
      "data": {
        "title": "…",
        "featured_image": {
          "$media": { "url": "https://spaghettiabc.com/…", "alt": "…", "filename": "…" }
        },
        "content": [/* Portable Text blocks */]
      },
      "taxonomies": { "recipe_category": ["pasta"] }
    }
  ],
  "meta": { "recipeCount": 79, "taxonomyTermCount": 19, "…": "…" }
}
```

`recipe_category` is the proposed taxonomy machine name for **Categoria ricetta** (schema agent owns final name + merge into `seed/seed.json`).

## What the converter does (2026-11-09)

- Selects published WP `post` items only (skips drafts, pages, attachments).
- Resolves featured image via `_thumbnail_id` → attachment `wp:attachment_url` (remote).
- Collects WP `category` domain terms; ignores `post_tag`.
- Normalizes slugs to kebab-case.
- Strips WPBakery / Agni shortcodes (`vc_*`, `agni_*`) best-effort.
- Cuts trailing newsletter / Substack CTA blocks when markers match (`Did you like my recipe?`, subscribe copy, substack URL / button).
- Converts remaining HTML/plaintext into Portable Text blocks (`_type: block`, marks for strong/em/links) matching existing seed `content` shape.

## Known counts (2026-11-09 run)

| Metric | Value |
| --- | --- |
| Recipes (published posts) | 79 |
| Categoria ricetta terms | 19 |
| Skipped drafts | 2 (`Laminated pasta test`, `Template`) |
| Missing featured image | 1 (`malloreddus-artichokes-dried-tomatoes`) |

## Known limitations

- ~~**Not merged** into `seed/seed.json`~~ — **merged (2026-11-09)** into `recipe_category.terms` + `content.recipes` (79 / 19); converter `meta` not copied. **Live DB apply still open** (Chiara/CoS gate — do not run `emdash seed apply` / touch `data.db` until then).
- **HTML → PT is best-effort** — WP bodies are mostly newline prose inside `vc_column_text`, not semantic `<p>`/`<h2>` trees. Ingredient lists become one block per line; nested markup beyond strong/em/a is flattened.
- **Shortcode strip is naive** — unknown shortcodes are removed as tags; unusual nested shortcode content may leave noise or drop text.
- **CTA strip is marker-based** — 63 posts matched the common “Did you like…” newsletter block; other footer patterns may remain.
- **Media stays remote** — `$media.url` points at `spaghettiabc.com/wp-content/...`; local EmDash storage ingest is deferred. Seed apply will attempt download when live DB is applied (same SSRF/public-URL rules as other `$media` seeds).
- **No structured recipe fields** — ingredients / time stay in prose (decision v1).
- **English only** — bilingual fragments inside bodies are import noise, not a locale model.
- **Taxonomy key** — schema uses `recipe_category`; merge used that key as-is.
