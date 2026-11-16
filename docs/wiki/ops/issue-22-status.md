# Issue #22 status (CoS)

## Sources

- Issue [#22](https://github.com/bbtgnn/spaghettiabc-website/issues/22)
- Depends on [#23](https://github.com/bbtgnn/spaghettiabc-website/issues/23) (`site_globals`)
- Related [#24](https://github.com/bbtgnn/spaghettiabc-website/issues/24) (Calendly PE — out of scope)
- [Decision: Scheda Tour Calendly](../decisions/scheda-tour-calendly-prenotazione.md) (2026-11-16 update)
- [Decision: Impostazioni sito FAQ (+ Calendly in #22)](../decisions/site-globals-faq.md)
- Glossary: [`GLOSSARY.md`](../../../GLOSSARY.md) — **Prenotazione**, **Impostazioni sito**

## Timeline

- **2026-11-16** — Grill closed (Q1–Q11). Chiara: ok to all recommended answers. Worktree `feat/global-calendly-fallback` from `main` @ `ed102e8` (`WORKTREE_ID=issue-22-calendly-a86f2520`).
- **2026-11-16** — Domain: **Prenotazione** glossary updated for Tour override → Impostazioni sito fallback. Wiki decision doc updated; #15 “empty Tour URL = no Prenotazione” superseded when global is set.
- **2026-11-16** — Gate: implementation of #22 requires `site_globals` from #23 (not yet in repo as of `ed102e8`). CoS awaiting Chiara on sequencing (#23 first vs same branch).
- **2026-11-16** — Explore [Assess #23 gate](bc677e40-3aeb-4c18-8432-aa964196fdc7): confirmed `site_globals` absent in seed/schema/`src` at `ed102e8`. Fake-singleton mirrors: `homepage`/`home`, `book`/`puglia-the-book`, `training`/`training` (`routable: false` + `getEmDashEntry`). Ordered #23→#22 vs combined: two re-seeds vs larger blast radius / harder bisect.
- **2026-11-16** — Chiara chose **combined**: one branch / one PR for #23 + #22 (`feat/global-calendly-fallback`).
- **2026-11-16** — Implementation landed on `feat/global-calendly-fallback` @ `5b5ab73` ([Implement #23+#22](078d1de9-ff1a-4274-97f3-b9ad42f41864)): `site_globals`/`site` with FAQ + `calendly_url`; helper `resolveTourCalendlyUrl`; tour FAQ removed; Polignano override kept.
- **2026-11-16** — PR opened: [#27](https://github.com/bbtgnn/spaghettiabc-website/pull/27) (`5b5ab73` + docs note `4689b16`).
- **2026-11-16** — Chiara approved **split** into stacked PRs: `#23` on `feat/site-globals-faq` → `main`, then `#22` on `feat/calendly-global-fallback` (base `feat/site-globals-faq`). Combined PR #27 closed in favor of the stack. Backup: `refs/backup/pre-split-combined` → `7cf0cbc`.
- **2026-11-16** — Stack open: [#28](https://github.com/bbtgnn/spaghettiabc-website/pull/28) (#23 FAQ) then [#29](https://github.com/bbtgnn/spaghettiabc-website/pull/29) (#22 Calendly) ([Split PR](c2e3408e-7b94-4b63-8fdd-d182b6cb20c5)).

## Grilled decisions (2026-11-16)

1. Field `calendly_url` on `site_globals` / `site`; admin label «URL Calendly predefinito».
2. Effective URL = Tour non-empty (trim) else global else empty.
3. No per-tour opt-out in #22.
4. Visual edit on Scheda → Tour field only; global only from Impostazioni sito.
5. Shared helper; missing `site` → empty global (fail soft).
6. Seed: tailored-tour on `site`; Polignano override; other Tours empty URL.
7. After / with #23; no temporary Settings workaround.

## Implementation checklist (agent)

1. ~~Add `calendly_url` to `site_globals` schema + seed on entry `site`.~~
2. ~~Helper resolve Tour → global → empty; wire `tours/[slug].astro`.~~
3. ~~Clear duplicate Tour URLs in seed (keep Polignano).~~
4. ~~Soft-fail if `site` missing; keep visual edit on Tour field.~~
5. Smoke: Tour with override; Tour inheriting global; both empty; missing `site`.
