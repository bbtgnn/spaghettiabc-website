# Sezione Tour layout (ex `/_dev` playground) (#14)

## Sources

- GitHub issue [#14](https://github.com/bbtgnn/spaghettiabc-website/issues/14)
- Playground grill + decisions 2026-11-09 / 2026-11-13
- Related: [Homepage + Tours schema](./homepage-tours-schema.md), [Sezione Dicono di me](./dicono-di-me-section.md), [`GLOSSARY.md`](../../../GLOSSARY.md)

## Outcome (2026-11-13)

**Variante D** won and shipped on the production homepage Sezione Tour. The DEV playground (`/_dev/sezione-tour`, hub + A–D, `injectRoute`, `gateDevOnly`) was **removed** the same day.

Production shape:

- Asymmetric highlight: first `featured_tours` entry horizontal (image | copy) on ≥768px; second stacked; shared row height
- Remaining tours: horizontal `.tour-rail--compact` of compact cards (thumb + title, same card chrome)
- Compact flat review strip with Punteggio Google + edge fade masks
- Components: `SezioneTour.astro`, `TourLargeCard.astro`, `CompactReviewRail.astro`; styles in `theme.css`

Recensioni Google in this strip remain a homepage UI surface; domain ownership of Recensione Google / Punteggio Google stays with **Sezione Dicono di me** (logos + full proof block still below).

## Historical playground notes (2026-11-09)

Deliverable for #14 was originally a DEV-only playground with variants A/B/C (later D). Catalogo Tour redesign stayed out of scope. Data = live homepage `featured_tours` + Google fields; no new CMS “primo piano” field.
