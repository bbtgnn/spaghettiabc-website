# Spaghetti ABC

The website of Flavia Giordano: her food Tours in Puglia, her Libro, and her Formazione offer for companies. English by default, Italian under `/it/`. Built on [EmDash](https://docs.emdashcms.com/) and Astro; Flavia edits everything in the EmDash admin.

## Quickstart

Node is pinned in [`mise.toml`](mise.toml); use npm.

```bash
npm ci
npm run dev
```

Every `npm run dev` wipes and reseeds the local SQLite database and uploads from [`seed/seed.json`](seed/seed.json), so local content is disposable. The site runs on `http://localhost:4321` (in a Cursor worktree, on the `PORT` set in `.env.local`). Sign in to the admin without a passkey through `/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin`.

## Further reading

- [`AGENTS.md`](AGENTS.md): how to work in this repo, for people and agents.
- [`docs/site-structure.md`](docs/site-structure.md): where each part of the site lives, and the gotchas.
- [`docs/adr/`](docs/adr/README.md): why the site is built this way.
- [`GLOSSARY.md`](GLOSSARY.md): the domain terms (Tour, Scheda Tour, Edizione, …).
- [`DEPLOY.md`](DEPLOY.md): staging on Cloudflare Workers, D1, and R2.
