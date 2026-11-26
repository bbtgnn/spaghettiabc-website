# Issue #42 status (CoS)

## Sources

- Issue [#42](https://github.com/bbtgnn/spaghettiabc-website/issues/42)
- [Decision: Books / Edizioni CMS model](../decisions/books-editions-cms-model.md) (2026-11-26)
- Supersedes parts of [Libro CMS model](../decisions/libro-cms-model.md) (2026-10-23)
- Glossary: [`GLOSSARY.md`](../../../GLOSSARY.md) — **Libro**, **Edizione**, **Sezione Libro**, **Pagina Libri**, **Scheda Edizione**

## Timeline

- **2026-11-26** — Grill closed with Chiara. Locked: Libro = work/title; Edizioni first-class (`libri`); Pagina Libri `/puglia-the-book`; Scheda Edizione `/puglia-the-book/{slug}`; Sezione Libro loads published editions (not chrome book image/CTA); shop/price out of scope; main-line branch, unprefixed URLs; no primary-menu Libro link.
- **2026-11-26** — Wiki ingest: decision page + supersession notes.
- **2026-11-26** — Implementation on branch `feat/42-books-section-editions` (uncommitted at write time): `edition` select on `libri`; seed `international` + `special`; hub `src/pages/puglia-the-book/index.astro`; scheda `[slug].astro`; homepage Sezione loads published `libri`. Local verify needs `wipe:local` after stopping `bun dev`.
- **2026-11-26 (handoff from wrong chat — #41 “[seconda lingua]”)** — Chiara asked for edition covers above Sezione Libro teasers. Markup already had `book-editions__cover`; DB covers were null because Cloudflare seed rejects `$media.file` (“File path must be a file: URL”). Fix: pushed webp assets in commit `a0a4936`; seed covers use `$media.url` → raw GitHub on `feat/42-books-section-editions`; wipe + re-seed so covers render. **Still uncommitted:** seed URL change + rest of #42 WIP. Resume in chat **CoS #42 books editions**.
- **2026-11-26 (resume CoS #42)** — Verified locally after wipe/reseed: `/` Sezione Libro has two cover `<img>` via `/_emdash/api/media/file/…`; hub + `/puglia-the-book/international|special` all 200. Acceptance of #42 met in WIP; not committed/PR’d yet. After merge to `main`, point seed `$media.url` raw links from branch path → `main` (same pattern as partner logos).
- **2026-11-26** — New cover webps pushed in `b6f4822`. After wipe, auto-seed can leave content empty; open `/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin` once so content+media apply. Confirmed new media IDs on homepage.
