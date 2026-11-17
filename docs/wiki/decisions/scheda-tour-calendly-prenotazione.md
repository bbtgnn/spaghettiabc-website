# Scheda Tour — Prenotazione Calendly (#15)

## Sources

- Issue: [bbtgnn/spaghettiabc-website#15](https://github.com/bbtgnn/spaghettiabc-website/issues/15)
- Follow-up: [bbtgnn/spaghettiabc-website#24](https://github.com/bbtgnn/spaghettiabc-website/issues/24) — dedicated module + progressive enhancement (2026-11-16)
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

## Decision update (2026-11-16) — global fallback (#22)

Grill session 2026-11-16 (Chiara): Q1–Q11 accepted as recommended. Issue: [#22](https://github.com/bbtgnn/spaghettiabc-website/issues/22). Depends on `site_globals` from [#23](https://github.com/bbtgnn/spaghettiabc-website/issues/23).

1. **Effective URL** — Tour `calendly_url` if non-empty after trim; else `site_globals` / `site` `calendly_url`; else no embed / «Prenotazione non disponibile».
2. **No per-tour opt-out** in #22 — with a global URL set, an empty Tour field means Prenotazione is on (inherits). Disabling booking on one Tour while global exists is out of scope until a real case appears.
3. **Field** — same slug `calendly_url` on `site_globals`; admin label «URL Calendly predefinito».
4. **Visual edit** on Scheda Tour always targets the Tour field (override). Global default is edited only in Impostazioni sito.
5. **Resolution** via a small shared helper; missing `site` entry → treat global as empty (fail soft).
6. **Seed** — tailored-tour URL on `site`; Polignano keeps override; other Tours leave `calendly_url` empty.
7. **#15 point 3 superseded** for empty Tour URL: empty no longer means “no Prenotazione” when a global fallback is set.

## Decision update (2026-11-16) — progressive enhancement (#24)

On 2026-11-16 Chiara accepted the grill for [bbtgnn/spaghettiabc-website#24](https://github.com/bbtgnn/spaghettiabc-website/issues/24) (Calendly embed: dedicated module + progressive enhancement):

1. **No React/Svelte island** for the embed — keep public Scheda Tour free of framework islands.
2. Extract client logic to `src/scripts/calendly-embed.ts`.
3. From `CalendlyEmbed.astro` use a processed Astro script import: `<script>import "../scripts/calendly-embed.ts";</script>` (no `is:inline` on the module).
4. **Progressive enhancement:** SSR a real `<iframe src={embedUrl}>` usable without JS (~700px fixed height; inner scroll OK).
5. **With JS:** keep the SSR iframe visible until enhance is ready, then replace with `Calendly.initInlineWidget` plus existing height / phase / animejs behaviour (`resize:false`, phases, spinner rules, live color tokens).
6. Accept possible **double Calendly load** (SSR iframe, then widget).
7. Keep `window.__spaghettiBootCalendly` + MutationObserver for `data-palette` / `data-ink` force reboot (DEV).
8. FAQ accordion script on Scheda Tour: **do not** extract or move in this issue.
9. **Out of scope:** global fallback URL (#22), seed/CMS field changes, adding Svelte/Preact.
