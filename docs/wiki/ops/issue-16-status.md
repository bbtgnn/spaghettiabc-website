# Issue #16 — status (CoS)

## Sources

- Decision: [Ricette + Sezione Il mio mondo](../decisions/il-mio-mondo-recipes.md) (grill confirmed 2026-11-09)
- Issue: [#16](https://github.com/bbtgnn/spaghettiabc-website/issues/16)
- WXR: [`import/spaghettiabc-export-wordpress.xml`](../../../import/spaghettiabc-export-wordpress.xml) (copied 2026-11-09 from chat attachment; export dated 2026-10-29)
- Merge seam: [`seed/generated/README.md`](../../../seed/generated/README.md) — `recipes-from-wxr.json` merged into `seed/seed.json` (2026-11-09)
- Converter ops: [Recipe WXR → seed fragment](./recipe-wxr-import.md)
- Surface agent (2026-11-09): schema + Catalogo/Scheda + nav; WXR merge into seed done (2026-11-09)
- CoS goal (2026-11-09): first-ship objective closed — Track A live + Track B `/_dev` playground; homepage promotion still deferred

## Track A — production Ricette (agreed first)

| Step | Status (date) | Notes |
| --- | --- | --- |
| Copy WXR into repo (`import/`) | **done (2026-11-09)** | `import/spaghettiabc-export-wordpress.xml` + README |
| Schema `recipes` + taxonomy Categoria ricetta | **done (2026-11-09)** | Collection `recipes` (label Ricette/Ricetta); taxonomy `recipe_category` (Categorie ricetta / Categoria ricetta); slim fields title + featured_image + portableText content; urlPattern `/recipes/{slug}` |
| WXR → seed converter | **done (2026-11-09)** | `scripts/wxr-to-recipes-seed.mjs` → `seed/generated/recipes-from-wxr.json` (79 recipes, 19 terms); see [recipe-wxr-import.md](./recipe-wxr-import.md) |
| Merge into `seed/seed.json` | **done (2026-11-09)** | Replaced `recipe_category.terms` (19) + `content.recipes` (79); dropped `*-placeholder` demos; converter `meta` not copied. Missing featured image: `malloreddus-artichokes-dried-tomatoes` |
| Catalogo `/recipes` + Scheda `/recipes/[slug]` | **done (2026-11-09)** | `src/pages/recipes/index.astro` + `[slug].astro` |
| Nav **Ricette** | **done (2026-11-09)** | `primary` menu item after Tour → `/recipes` |
| Seed apply + live DB align | **done (2026-11-09)** | Live `data.db` seeded: schema-only then full content (`--on-conflict=update`); **79** recipes; media from spaghettiabc.com downloaded (no SSRF block). Ops: [Recipe seed apply](./recipe-seed-apply.md). |

## Track B — `/_dev` Sezione Il mio mondo

| Step | Status (date) | Notes |
| --- | --- | --- |
| Playground routes + variants | **done (2026-11-09)** | Hub `/_dev/il-mio-mondo` + `/a|/b|/c`; fixtures IG/Substack + live Ricetta; prod homepage untouched |
| Promote winning variant to homepage | deferred (2026-11-09) | Out of first ship |

## Environment improvements logged (2026-11-09)

- Persist WXR under `import/` so future agents have a stable path.
- Prefer a **repeatable** import script over one-off hand-edited seed blobs for 79 entries.
- After schema land: expect live `data.db` drift vs seed (same class of problem as Dicono 2026-11-09).
- **Merge seam:** `seed/generated/recipes-from-wxr.json` → `seed/seed.json` done (79 recipes / 19 terms); live DB apply **done** — see [Recipe seed apply](./recipe-seed-apply.md).
