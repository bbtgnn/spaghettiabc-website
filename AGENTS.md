# AGENTS.md

Spaghetti ABC is Flavia Giordano's site (Tour, Libro, Formazione) built on EmDash + Astro, in English (default) and Italian. Local dev runs on Node + SQLite + local uploads; staging and production run on Cloudflare Workers + D1 + R2.

## People

- **Giovanni** — tech lead and main developer. Owns architecture, toolchain, hosting, schema shape, and public URLs.
- **Chiara** — designer, second in charge. Works directly in code; drives product decisions through grilling sessions.
- **Flavia** — the site owner and content editor. Works only in the EmDash admin.

## Working here

- **Refactor, don't patch.** Before fixing or extending behaviour, judge whether the code you're touching fits the change. Special cases, flags threaded through layers, duplicated logic, or a fix that lands far from its cause mean the seam is wrong: refactor it as part of the change, and say what moved and why in your summary or PR. Keep one source of truth — shared layout lives in `src/styles/theme.css` and shared components, not page-local copies.
- **Propose ADR-worthy changes first.** Toolchain, hosting, schema shape, public URLs, or anything that contradicts an ADR in `docs/adr/`: propose it to Giovanni with the trade-off and wait for a decision. Record the outcome as an ADR.
- **Comments are _why_, never _what_.** Keep a comment only when deleting it would lose intent, a constraint, or a gotcha the code cannot express.
- **Titles:** commits, PRs, and issues use [Conventional Commits](https://www.conventionalcommits.org/): `type(optional-scope): imperative summary`.
- **Commits:** only when asked. Partition the dirty tree by independent _why_ (separately reviewable or revertable), one commit per concern, each leaving the tree buildable. Leave unrelated dirty work untouched.
- **Branches:** one branch and PR per GitHub issue; the PR title ends with `(#N)`. In a Cursor worktree, the dev server port is `PORT` in `.env.local`.
- **Toolchain:** npm only; Node is pinned in `mise.toml`.
- **EmDash APIs:** verify against the EmDash docs MCP (`search_docs`) rather than memory.
- **Locales:** pages live in root `src/pages/`; `src/pages/it/**` is generated. After adding, removing, or renaming a page, update the allowlist in `scripts/sync-locale-pages.mjs` and run `npm run sync:locale-pages`.
- **Fields:** on every field you add or change, decide whether it is per-locale copy (`translatable`, the default) or shared across EN/IT (`translatable: false` — URLs, metrics, form headings, references). Set it in `seed/seed.json`; the admin does not expose it.
- **Public pages** are server-rendered and work without JavaScript; add behaviour with a component `<script>`. When a component needs real client state, use a lazily hydrated React island (`client:visible` / `client:idle`). React is already a dependency; add no other UI framework.
- **Local data:** `npm run dev` regenerates the `it/` pages, wipes, and reseeds `data.db` + `uploads/` on every start. Stop dev before running `npm run seed` or `npm run wipe:local`.

## Source guidance

- **Naming a domain concept** → [`GLOSSARY.md`](GLOSSARY.md).
- **Editing a page, section, component, or CMS collection** → [`docs/site-structure.md`](docs/site-structure.md).
- **Why something is built this way, or before reversing it** → [`docs/adr/`](docs/adr/README.md).
- **Schema, seed, queries, Portable Text, menus** → `building-emdash-site` skill (`.agents/skills/`).
- **The `plugins/` packages** → `creating-plugins` skill.
- **EmDash CLI (content, media, types, export)** → `emdash-cli` skill.
- **Staging, deploy, D1 migrations** → [`DEPLOY.md`](DEPLOY.md).

## Invariants

- `src/live.config.ts` is EmDash boilerplate; leave it as is.
- Astro `i18n.routing.prefixDefaultLocale` stays off: it makes `/_emdash/admin` return 404.
