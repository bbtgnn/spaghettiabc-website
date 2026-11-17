# Issue #23 status (CoS)

## Sources

- Issue [#23](https://github.com/bbtgnn/spaghettiabc-website/issues/23)
- Follow-on [#22](https://github.com/bbtgnn/spaghettiabc-website/issues/22) (Calendly fallback — separate PR)
- [Decision: Impostazioni sito FAQ](../decisions/site-globals-faq.md)
- Glossary: [`GLOSSARY.md`](../../../GLOSSARY.md) — **Impostazioni sito**

## Timeline

- **2026-11-16** — Combined #23+#22 implementation existed on `feat/global-calendly-fallback` (`5b5ab73`); Chiara approved split into stacked PRs.
- **2026-11-16** — `#23`-only branch `feat/site-globals-faq`: `site_globals`/`site` with FAQ; Tours lose `faq`; Scheda Tour reads global FAQ; Calendly still per-Tour as on `main`.

## Implementation checklist (agent)

1. ~~Add non-routable `site_globals` + entry `site` with FAQ repeater.~~
2. ~~Remove `faq` from tours schema + seed; move FAQ content onto `site`.~~
3. ~~Wire Scheda Tour FAQ from `getEmDashEntry("site_globals","site")`; visual edit → `siteGlobals.edit.faq`; soft-fail if missing.~~
4. ~~Merge cache hints for tour + site_globals.~~
5. ~~Keep tour `calendly_url` values as on `main` (no global fallback yet).~~
