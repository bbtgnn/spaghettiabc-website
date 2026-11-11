# Scheda Tour — Prenotazione Calendly (#15)

## Sources

- Issue: [bbtgnn/spaghettiabc-website#15](https://github.com/bbtgnn/spaghettiabc-website/issues/15)
- Grill session 2026-11-10 (Chiara): Q1–Q15 accepted as recommended
- Domain: [`GLOSSARY.md`](../../../GLOSSARY.md) — **Prenotazione**, **Scheda Tour** (updated same day)
- Related schema history: [Homepage + Tours schema](./homepage-tours-schema.md)

## Decisions (2026-11-10)

On 2026-11-10 Chiara confirmed via grilling:

1. **Try both UI variants, then lock one** — not a permanent dual CMS layout.
2. Primary action is **Prenotazione** (Calendly request), not cart / «Acquista» / «Add to cart». Payment stays off-site (SumUp), out of this issue.
3. **Per-Tour Calendly URL** in CMS; empty URL → no Prenota CTA, no sheet, no inline embed.
4. Temporary compare switch: query `?prenota=sheet` | `?prenota=inline` on `/tours/{slug}`; **default = sheet** when param missing.
5. CTA copy **«Prenota»**. Sheet: opens accessible dialog (from right desktop / from bottom mobile) with header (tour title + close). Inline: embed **full width below** the gallery+info split; «Prenota» **scrolls** to the embed.
6. Embed sizing from issue snippet: `min-width: 320px`, `height: 700px`.
7. Seed sample URL only on the Polignano tour; other tours stay without URL.
8. No permanent CMS field for sheet vs inline — only the Calendly URL field. FAQ copy rewrite out of scope for #15.
9. When a winner is chosen later: remove query switch; keep a single presentation.

## Explicit non-goals (2026-11-10)

- Real cart / checkout / SumUp integration
- FAQ seed rewrites
- CMS layout enum for prenotazione presentation
- `/_dev` playground for this compare (query on real Scheda instead)

## Decision update (2026-11-11)

On 2026-11-11 Chiara chose **Calendly embed directly in `.scheda-tour__info`** (sticky info column). Sheet vs `?prenota=inline` compare is **superseded**; query switch removed. Empty `calendly_url` still means no prenotazione UI.
