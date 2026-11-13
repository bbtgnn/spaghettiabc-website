# Issue #15 status (CoS)

## Sources

- [Decision: Scheda Tour Calendly](../decisions/scheda-tour-calendly-prenotazione.md)
- Issue [#15](https://github.com/bbtgnn/spaghettiabc-website/issues/15)

## Timeline

- **2026-11-10** — Grill closed (Q1–Q15). Chiara: «proviamo entrambe» → implement sheet + inline compare on Scheda Tour.
- **2026-11-10** — Working branch at start of CoS was `feat/il-mio-mondo-recipes` @ `5cf3785` (unrelated to #15). First `feat/calendly-prenotazione` mistakenly forked from recipes; recreated from `origin/main` @ `38dd9cd`. Recipes WIP stashed as `wip-before-calendly-branch`.
- **2026-11-10** — Implementation on `feat/calendly-prenotazione`: field `calendly_url`, Scheda Tour sheet/inline via `?prenota=`, seed URL on Polignano only.
- **2026-11-10** — Live local DB: schema field added; Polignano `calendly_url` set. WIP was briefly displaced by a branch switch onto #16 (`stash` / checkout race); restored onto `feat/calendly-prenotazione`. Dev server restarted for browser verify.
- **2026-11-10** — Env improvement note: keep #15 and #16 on separate checkouts; stash messages alone are not enough when untracked files collide.

## Implementation checklist (agent)

1. Schema: Tour field for Calendly URL (seed + types); Polignano seed entry only.
2. Scheda Tour (`src/pages/tours/[slug].astro` + small components as needed): «Prenota», sheet dialog, inline block, `?prenota=` switch.
3. Update `AGENTS.md` Scheda bullet if it still says unwired Add to cart (dated claim after commit).
4. Smoke: Polignano with/without query; a tour without URL shows no CTA.

## Env notes

- Prefer not stacking #15 on the recipes branch; isolate branch to reduce merge noise with #16.

## Browser verify claim (2026-11-10)

Local smoke on `feat/calendly-prenotazione` @ working tree (uncommitted WIP) + live DB Polignano `calendly_url=https://calendly.com/spaghettiabc/polignano-sensory-food-tour`. Dev: `http://127.0.0.1:4321`.

| Check | Result | Notes |
| --- | --- | --- |
| 1. Polignano default sheet | **PASS** | «Prenota» CTA; sheet `role=dialog` `aria-modal=true`; Calendly iframe boots; Escape closes + restores focus; close control works (JS). Screenshot: sheet open with embed + cookie banner. |
| 2. `?prenota=inline` | **PASS** | Inline `#prenota-calendly` below `.scheda-tour__split`; «Prenota» is scroll link → `#prenota-calendly`; embed 700px. Screenshot: inline Calendly visible. |
| 3. Bari (no URL) | **PASS** | `/tours/bari-food-tour`: no Prenota, no embed/sheet (`calendly=0`). |

Non-blocking notes: sheet body + Calendly iframe → double scrollbars; intended move-focus-to-close on open not reliably observed; automation click on X intercepted once (page scroll / hit-testing), Escape/programmatic close OK. No product code changed during verify.

## Decision lock (2026-11-11)

Chiara: embed Calendly **in `.scheda-tour__info`**. Sheet / `?prenota=` compare removed on `feat/calendly-prenotazione`. Preview: http://localhost:4321/tours/polignano-food-tour
