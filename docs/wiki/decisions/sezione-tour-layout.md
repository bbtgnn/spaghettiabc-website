# Sezione Tour layout (#14)

## Sources

- GitHub issue [#14](https://github.com/bbtgnn/spaghettiabc-website/issues/14)
- Playground grill + decisions 2026-11-09 / 2026-11-13; equal-pair simplify 2026-11-17
- Related: [Homepage + Tours schema](./homepage-tours-schema.md), [Sezione Dicono di me](./dicono-di-me-section.md), [`GLOSSARY.md`](../../../GLOSSARY.md)

## Outcome

Production homepage Sezione Tour (DEV `/_dev` playground removed 2026-11-13):

- Equal vertical highlight pair: first two `featured_tours` as matching stacked cards (shared row height on ≥768px)
- Remaining tours: horizontal `.tour-rail--compact` of compact cards (thumb + title)
- Compact review strip with Punteggio Google + edge fade masks
- Components: `SezioneTour.astro`, `TourLargeCard.astro`, `CompactReviewRail.astro`; styles in `theme.css`

Recensioni Google in this strip are a homepage UI surface; domain ownership of Recensione Google / Punteggio Google stays with **Sezione Dicono di me**.

Data = live homepage `featured_tours` + Google fields; no CMS “primo piano” field. Catalogo Tour redesign stays out of scope for #14.
