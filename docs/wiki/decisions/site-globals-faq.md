# Impostazioni sito — FAQ globale (#23)

## Sources

- Issue: [#23](https://github.com/bbtgnn/spaghettiabc-website/issues/23)
- Related: [Scheda Tour Calendly / Prenotazione](./scheda-tour-calendly-prenotazione.md)
- Glossary: [`GLOSSARY.md`](../../../GLOSSARY.md) — **Impostazioni sito**

## Decisions (2026-11-16)

1. Non-routable collection `site_globals` (admin **Impostazioni sito**), fake-singleton entry `site` — same pattern as `homepage`/`home`, `book`/`puglia-the-book`, `training`/`training`.
2. Shared FAQ (`question` / `answer` repeater) lives on `site`, not on Tours. Scheda Tour reads it via `getEmDashEntry("site_globals", "site")`; empty → hide Domande frequenti. Visual edit targets `site_globals` FAQ.
3. Missing `site` fails soft (empty FAQ).
4. Per-tour `calendly_url` behavior unchanged in #23 (empty Tour URL → no embed). Global Calendly fallback is [#22](https://github.com/bbtgnn/spaghettiabc-website/issues/22).

## Follow-on (#22) — Calendly predefinito

On the stacked `#22` branch: `calendly_url` («URL Calendly predefinito») on the same `site` entry; Scheda Tour effective URL = Tour override (trim) else global else empty. Details: [Scheda Tour Calendly / Prenotazione](./scheda-tour-calendly-prenotazione.md) (2026-11-16 update).
