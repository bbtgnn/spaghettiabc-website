# Node for local dev, Workers for production

Local authoring needs a filesystem so `$media.file` in the seed can resolve book covers, newsletter art, and logos ([#47](https://github.com/bbtgnn/spaghettiabc-website/issues/47)). Cloudflare's `workerd` has no such filesystem at seed time, so local `astro dev` runs on Node + SQLite + local uploads, while `astro build` / deploy target Cloudflare Workers + D1 + R2. Node is only the tooling runtime (build, CLI, CI); production behaviour is decided by `workerd` via `wrangler.jsonc` (`compatibility_date`, `nodejs_compat`), not by the Node pin in `mise.toml`.

**Decision:** keep Node + SQLite for day-to-day local work. Before merging changes that touch the Worker runtime, bindings, or media paths, run `npm run check:workerd` (`astro build` + `astro preview` in `workerd`). Seeded D1 for that preview is deferred.

**Rejected:** switching local `astro dev` to the Cloudflare adapter for full `workerd` parity. That would force the nine seed images onto URLs (R2 or GitHub), which reopens the "asset must be on `main` before a branch can seed it" problem ([#42](https://github.com/bbtgnn/spaghettiabc-website/issues/42)).
