# Homepage + Tours schema

## Sources

- Handoff: `C:\Users\utente\AppData\Local\Temp\spaghettiabc-website-handoff.md` (2026-10-23)
- Commits on `feature/homepage-tours-schema`: `0cc887a` (content model), `c93c6d2` (visual templates)
- Domain terms: [`GLOSSARY.md`](../../../GLOSSARY.md)
- Related: [Libro CMS model](./libro-cms-model.md)

## Decisions (2026-10-23, prior thread)

On 2026-10-23 the prior session established:

1. Collection **`homepage`** — `routable: false`, entry id `home`.
2. Collection **`tours`** — list `/tours`, detail `/tours/[slug]`.
3. **Sezione Tour** on homepage: section chrome (`tour_title`, `tour_subtitle`, `tour_cta_label`) + `featured_tours` multi-reference; CTA URL fixed to `/tours`.
4. Visual direction: cool Mediterranean (navy/sea/lemon); Fraunces + Manrope; not cream/terracotta/purple.
5. Site `lang="it"`; menu Home · Tour · About.

As of `spaghettiabc-website@c93c6d2`, templates lived in `src/pages/index.astro`, `src/pages/tours/*`, `src/styles/theme.css`, `src/components/TourTeaser.astro`.
