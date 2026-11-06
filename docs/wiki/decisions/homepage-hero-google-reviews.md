# Homepage hero + Recensioni Google

## Sources

- Settled design decisions with Chiara, 2026-11-05
- Domain terms: [`GLOSSARY.md`](../../../GLOSSARY.md) (**Recensione Google**, **Sezione Collaborazioni**)
- Supersedes testimonials claims in [Collaborazioni CMS model](./collaborazioni-cms-model.md) (2026-10-23)
- Related ops: [Collaborazioni logos ingest](../ops/collaborazioni-logos-ingest.md) (hero media wiring; loopback `$media` rejected)

## Decisions (2026-11-05)

On 2026-11-05 Chiara locked:

1. **Homepage hero copy** — `hero_title`: `Puglia: Beyond the Plate`; `hero_subtitle`: `Culinary Experiences Curated by Flavia Giordano`.
2. **Hero image** — source file from Chiara (newsletter/ingredient cover). Committed as `seed/media/homepage-hero.jpg`. Seed `$media` must **not** use loopback (`127.0.0.1`); EmDash seeder rejects non-public IPs. Approach used: keep a working remote Unsplash placeholder in `seed/seed.json` for fresh seed, then after reset overwrite via `npx emdash media upload seed/media/homepage-hero.jpg …` and link on the homepage entry. Once the file is on a public GitHub raw URL for the branch, seed may point there instead.
3. **Remove Testimonianza** — drop `testimonials` from the `collaborations` schema and seed content; remove rendering from `/` and `/collaborazioni`. Glossary term **Testimonianza** retired.
4. **Recensioni Google on homepage** — new repeater `google_reviews` (admin label **Recensioni Google**) on the `homepage` collection, under the Collaborazioni form heading. Subfields: `author` (string, required), `quote` (text, required), `rating` (number). Source of truth is the homepage entry — **not** the Collaborazioni landing. Seed ships 3–4 Italian demo placeholders. Homepage Sezione Collaborazioni reuses the existing `.quote-list` UI where testimonials used to render.
5. Broken Unsplash `photo-1556910103-…` (404) for training/collaborazioni gallery placeholders replaced with working `photo-1556911220-…`.

## Explicitly out of scope (2026-11-05)

- Live Google Business / Places API sync
- Verified-badge UI chrome beyond the existing quote-list rating display
- Moving partner logos onto the homepage entry *(reversed 2026-11-06 — see [Sezione Dicono di me](./dicono-di-me-section.md))*
