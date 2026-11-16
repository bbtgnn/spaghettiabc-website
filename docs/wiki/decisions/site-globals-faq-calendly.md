# Impostazioni sito — FAQ globale + Calendly predefinito (#23 / #22)

## Sources

- Issues: [#23](https://github.com/bbtgnn/spaghettiabc-website/issues/23), [#22](https://github.com/bbtgnn/spaghettiabc-website/issues/22)
- Related: [Scheda Tour Calendly / Prenotazione](./scheda-tour-calendly-prenotazione.md)
- Glossary: [`GLOSSARY.md`](../../../GLOSSARY.md) — **Impostazioni sito**, **Prenotazione**

## Decisions (2026-11-16)

1. Non-routable collection `site_globals` (admin **Impostazioni sito**), fake-singleton entry `site` — same pattern as `homepage`/`home`, `book`/`puglia-the-book`, `training`/`training`.
2. Shared FAQ (`question` / `answer` repeater) lives on `site`, not on Tours. Scheda Tour reads it via `getEmDashEntry("site_globals", "site")`; empty → hide Domande frequenti. Visual edit targets `site_globals` FAQ.
3. Global `calendly_url` (admin **URL Calendly predefinito**) is the fallback when a Tour override is empty after trim. Effective URL resolution is shared; visual edit on Scheda always targets the Tour field.
4. Missing `site` fails soft (empty FAQ / empty global URL).
