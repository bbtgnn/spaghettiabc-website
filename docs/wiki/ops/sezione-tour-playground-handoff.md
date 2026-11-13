# Handoff: Sezione Tour DEV playground (#14)

**Date:** 2026-11-13  
**Audience:** next agent/session implementing the playground-only PR  
**Do not implement color palettes here** — that is [#25](https://github.com/bbtgnn/spaghettiabc-website/pull/25) (#12).

## Why this handoff exists

PRs [#17](https://github.com/bbtgnn/spaghettiabc-website/pull/17) and [#20](https://github.com/bbtgnn/spaghettiabc-website/pull/20) currently **overlap**:

| PR | Branch → base | What it mixes |
| --- | --- | --- |
| [#17](https://github.com/bbtgnn/spaghettiabc-website/pull/17) | `feat/color-palette-preview` → `main` | DEV multi-slot color palettes (**#12**) **plus** initial Sezione Tour playground (**#14**) |
| [#20](https://github.com/bbtgnn/spaghettiabc-website/pull/20) | `feat/sezione-tour-playground` → `feat/color-palette-preview` | Hub + `/a` `/b` `/c`, stacked desktop/mobile frames (playground UX polish on top of #17) |

Maintainers are **splitting** that work:

1. **Color palette DEV only** — [#25](https://github.com/bbtgnn/spaghettiabc-website/pull/25) (`feat/color-palette-preview-only` → `main`). Controls live in a **shared `DevPreviewDock` with the font switch** (not the old bottom-left twin panel from #17).
2. **Sezione Tour playground only** — **this** handoff ([#26](https://github.com/bbtgnn/spaghettiabc-website/pull/26) docs) / later code PR for [#14](https://github.com/bbtgnn/spaghettiabc-website/issues/14).

**Do not** merge or reopen #17/#20 as the base. Extract/rebuild playground work cleanly from latest `main` (plus [#25](https://github.com/bbtgnn/spaghettiabc-website/pull/25) once merged, if still open rebase onto that tip).

---

## 1. Goal (done = playground-only PR)

Ship issue [#14](https://github.com/bbtgnn/spaghettiabc-website/issues/14) **playground deliverable only**:

- DEV routes under `/_dev/sezione-tour` with **hub + three variant pages** (`/a`, `/b`, `/c`).
- Each variant page shows **desktop (~1280) + mobile (~390) frames**, stacked by default.
- Frames render **section-only** mocks (head + tours + compact review rail) from **live homepage CMS** (`featured_tours` + `google_reviews`).
- `/_dev/*` **404 outside DEV** (same spirit as [#13](https://github.com/bbtgnn/spaghettiabc-website/issues/13)).
- Port/recreate the agreed wiki decision page so tribal knowledge stays in-repo.

Production homepage Sezione Tour and Catalogo Tour stay **unchanged** until a variant wins.

---

## 2. Out of scope

- Color palettes / `ColorPalettePicker` / `paletteSlot` / FOUC palette scripts (**#12**).
- Production Sezione Tour or Catalogo Tour redesign (issue #14 also sketches Catalogo featured horizontal cards — **not** this playground).
- Reusing #17/#20 as merge base; do not “finish” those PRs as-is.
- Moving Recensioni Google out of Sezione Dicono di me in the domain model.
- Glossary changes.
- Hero playground [#13](https://github.com/bbtgnn/spaghettiabc-website/issues/13) — only share the `injectRoute` + `gateDevOnly` pattern.

---

## 3. Suggested branch strategy

1. Start from **latest `origin/main`**. If the color-only PR has already merged, branch from that tip instead.
2. Create a **fresh** branch, e.g. `feat/sezione-tour-playground` (force-recreate / new name if the old remote branch still points at the stacked #20 tip — do not continue that history blindly).
3. Port playground files from tip of `origin/feat/sezione-tour-playground` (SHA `50b5fb1` as of 2026-11-13 fetch) by **file copy / selective checkout**, not by merging #17/#20.
4. Touch `Base.astro` only for playground needs (`hideHeader`). Leave color dock work to the color PR; if both land, rebase and resolve that one seam carefully.
5. After the new playground PR is open: **close or supersede** old [#17](https://github.com/bbtgnn/spaghettiabc-website/pull/17) / [#20](https://github.com/bbtgnn/spaghettiabc-website/pull/20) with a comment pointing at [#25](https://github.com/bbtgnn/spaghettiabc-website/pull/25) (color) + the new playground PR. Do not ask reviewers to land the mixed stack.

**Cherry-pick warning:** `3509150` mixes palette + playground. Prefer reading the playground file tree at `origin/feat/sezione-tour-playground` over cherry-picking that commit. Safe-to-read playground-only commits on top of the mixed base: `6690b62` (frame stack), `50b5fb1` (hub + `/a|/b|/c`).

---

## 4. Files to port / recreate vs ignore

### Port (playground-only) — take tip of `origin/feat/sezione-tour-playground`

| Path | Role |
| --- | --- |
| `src/dev/integration.ts` | `devPlaygrounds()` Astro integration + `injectRoute` |
| `src/dev/sezione-tour/index.astro` | Hub |
| `src/dev/sezione-tour/[variant].astro` | Variant page (A/B/C) |
| `src/dev/sezione-tour/variants.ts` | Variant metadata + viewports |
| `src/components/_dev/SezioneTourMock.astro` | Section mock (variants A/B/C) |
| `src/components/_dev/TourLargeCard.astro` | Large featured card |
| `src/components/_dev/CompactReviewRail.astro` | Compact review strip |
| `src/styles/_dev/sezione-tour-playground.css` | Hub, frames, mock layouts |
| `src/utils/dev-only.ts` | `gateDevOnly` → rewrite `/404` when `!import.meta.env.DEV` |
| `docs/wiki/decisions/sezione-tour-dev-playground.md` | Agreed decisions (port + keep dated) |
| `astro.config.mjs` | **Only** import + `devPlaygrounds()` in `integrations` |
| `src/layouts/Base.astro` | **Only** optional `hideHeader` prop (skip SiteHeader when true) |
| `docs/wiki/index.md` | Link decision + this ops handoff (merge carefully with color PR edits) |

On #17 the playground lived as a single `src/dev/sezione-tour.astro`; #20 deleted that in favor of the hub + `[variant]` tree — **use the #20 shape**.

### Ignore (color / Dicono / unrelated from #17)

| Path | Why |
| --- | --- |
| `src/components/ColorPalettePicker.astro` | #12 |
| `src/styles/color-palettes-preview.css` | #12 |
| `docs/wiki/decisions/color-palette-preview.md` | #12 (and note: #17 UI placement is superseded by “same dock as fonts”) |
| `docs/wiki/ops/homepage-dicono-schema-migration.md` | DB migration notes, not playground |
| `emdash-env.d.ts` diffs on #17 | Dicono / types drift — not playground |
| `src/pages/index.astro` + other pages’ `paletteSlot` | #12 |
| `src/components/SiteHeader.astro` `data-palette-slot="chrome"` | #12 |
| `.gitignore` `backups/` (if only for migration dumps) | unrelated to #14 |
| Wiki tweaks that only document Dicono live-DB alignment | unrelated |

### Reuse from `main` (already shipped)

- `FontPairingPicker.astro` + DEV gating in `Base.astro` — pattern for DEV-only UI; playground does **not** need to change the font picker.
- `TourTeaser.astro` + `.tour-rail` in `theme.css` — small rail inside mocks.
- `src/pages/404.astro` — target of `gateDevOnly` rewrite.

---

## 5. Architecture notes

### Why `src/dev` + `injectRoute`

Astro **skips** `src/pages` paths whose segment names start with `_`. So `src/pages/_dev/…` cannot host `/_dev/…`.

Agreed pattern (2026-11-09):

- Source files under `src/dev/sezione-tour/…`
- Public URLs still `/_dev/sezione-tour` and `/_dev/sezione-tour/[variant]`
- `devPlaygrounds()` in `astro.config.mjs` calls `injectRoute` for both patterns
- Every playground page starts with `gateDevOnly(Astro)` from `src/utils/dev-only.ts`

Same integration is the intended home for a future `#13` `/_dev/hero` route.

### Hub vs variants

- **Hub** `/_dev/sezione-tour` — lists A/B/C cards; no frames.
- **Variant** `/_dev/sezione-tour/{a|b|c}` — one layout; A/B/C switcher; desktop + mobile frames.
- Invalid `[variant]` → rewrite `/404`.

### Frame stacking CSS

- Default: `.pg__frames` **column** so desktop + mobile both stay on-screen on typical laptop widths (~1100px).
- Side-by-side only from **`min-width: 1720px`**.
- Layout inside mocks is driven by `.pg-sezione--desktop|mobile`, not by resizing the browser to 390px.
- Wheel passthrough script on the variant page scrolls the frame viewport when interacting with horizontal rails (avoids trapping vs Base’s rail handler).

### Mock data vs live CMS

- **Live** homepage entry: `getEmDashEntry("homepage", "home", { references: { featured_tours: true } })`.
- Large pair = **first two** `featured_tours`; remainder → small `TourTeaser` rail.
- Reviews = homepage `google_reviews` (compact UI experiment only — domain ownership stays Sezione Dicono di me).
- No hard-coded fixtures; no new CMS “primo piano” field.
- `Base` with `hideHeader` so frames are section-only (no SiteHeader).

### Variant directions (locked)

| Id | Direction |
| --- | --- |
| A | Literal issue sketch — 2 large + small rail + compact review rail |
| B | Two horizontal “catalog-like” cards + reviews more integrated + rail |
| C | Asymmetric — first tour dominant, second secondary + rail + reviews |

---

## 6. Domain vocabulary

Cite [`GLOSSARY.md`](../../../GLOSSARY.md):

- **Tour** — guided food experience in one Puglia town (or special format); not multi-stop Italy travel.
- **Catalogo Tour** — `/tours` listing; **not** this playground and not the homepage block.
- **Scheda Tour** — `/tours/{slug}` detail.
- **Sezione Tour** — homepage block that lists Tour in evidenza and links to Catalogo Tour. The playground experiments on **this** block only.
- **Recensione Google** / **Punteggio Google** / **Sezione Dicono di me** — reviews in the mock are a **UI experiment**; domain home of Recensioni Google remains Dicono di me (no Punteggio / Loghi in the compact strip).

---

## 7. Acceptance / test plan

With `bun dev`:

- [ ] `http://localhost:4321/_dev/sezione-tour` — hub lists A/B/C
- [ ] `/_dev/sezione-tour/a`, `/b`, `/c` — each shows only that variant; desktop + mobile frames
- [ ] A/B/C switcher on variant pages
- [ ] ~1100px browser width: **no** horizontal page scroll required to see the mobile frame
- [ ] Frames use live `featured_tours` / `google_reviews`; section head uses CMS title/subtitle/CTA
- [ ] Production homepage `/` Sezione Tour **unchanged**
- [ ] `bun run build` (or preview / non-DEV): `/_dev/sezione-tour` and `/_dev/sezione-tour/a` → **404** (rewrite to site 404)
- [ ] Font pairing picker still works on normal pages; playground pages use `hideHeader`

---

## 8. Known decisions already made (do not re-litigate)

From grill + [decision wiki on PR branches](https://github.com/bbtgnn/spaghettiabc-website/blob/feat/sezione-tour-playground/docs/wiki/decisions/sezione-tour-dev-playground.md) (2026-11-09):

1. **#14 deliverable = DEV playground only**; production Sezione/Catalogo wait for a winning variant.
2. **Catalogo Tour** ideas in the issue are **out** of this route.
3. Data = live homepage CMS; first two featured = large; rest = rail; no new glossary/CMS field.
4. Compact review rail = UI experiment; Recensioni stay owned by Sezione Dicono di me.
5. Frames = section only, no SiteHeader; large pair 50/50 desktop / stacked mobile; reviews always horizontal rail.
6. **One page per variant** (hub + `/a|/b|/c`) — supersedes “all three on one page”.
7. Frames **stack** by default; side-by-side only ~1720px+.
8. Prod gating via `!import.meta.env.DEV` + reusable `gateDevOnly`; `injectRoute` because Astro ignores `pages/_…`.
9. New markup/CSS under `_dev` / `src/dev`; reuse `TourTeaser` / `.tour-rail` ok; **no** production `theme.css` / homepage / catalog edits for this ticket.

---

## 9. Open questions / risks

| Risk | Notes |
| --- | --- |
| **Shared `Base.astro`** | Playground needs `hideHeader`. [#25](https://github.com/bbtgnn/spaghettiabc-website/pull/25) also edits `Base` (`DevPreviewDock`, FOUC palette script, `paletteSlot`). Prefer merge #25 first, then rebase playground; conflict likely but small. |
| **Color dock redesign** | [#25](https://github.com/bbtgnn/spaghettiabc-website/pull/25) puts palettes in a shared **`DevPreviewDock` with fonts** (supersedes #17 bottom-left `ColorPalettePicker` panel). Playground should not reintroduce that picker or depend on #17’s panel layout. |
| **`/_dev` + palettes** | Color wiki already marks `/_dev` playgrounds out of scope for dedicated palette slots — keep it that way unless product asks otherwise. |
| **Old remote branches** | `origin/feat/color-palette-preview` / `origin/feat/sezione-tour-playground` remain the **reference** file tree; do not merge them into the new PR. |
| **CMS empty states** | Variant page already handles missing homepage entry; ensure local DB has `featured_tours` + reviews for a fair review. |
| **#17 extras** | Do not drag Dicono migration / `emdash-env.d.ts` / `.gitignore backups/` into the playground PR. |
| **Closing #17/#20** | Point reviewers at [#25](https://github.com/bbtgnn/spaghettiabc-website/pull/25) + the new playground PR so they are not left with three competing stacks. |

---

## 10. Sources

| Kind | URL / SHA |
| --- | --- |
| Issue #14 | https://github.com/bbtgnn/spaghettiabc-website/issues/14 |
| Issue #13 (pattern) | https://github.com/bbtgnn/spaghettiabc-website/issues/13 |
| PR #25 (color-only; preferred base after merge) | https://github.com/bbtgnn/spaghettiabc-website/pull/25 — `feat/color-palette-preview-only` |
| PR #26 (this handoff docs) | https://github.com/bbtgnn/spaghettiabc-website/pull/26 — `docs/sezione-tour-playground-handoff` |
| PR #17 (mixed; do not merge as-is) | https://github.com/bbtgnn/spaghettiabc-website/pull/17 — `feat/color-palette-preview` @ `087c00b` |
| PR #20 (playground UX on #17) | https://github.com/bbtgnn/spaghettiabc-website/pull/20 — tip `50b5fb1` |
| Mixed commit (palette + playground) | `3509150` — read for playground files only; do not cherry-pick whole |
| Frame stack | `6690b62` |
| Hub + `/a|/b|/c` | `50b5fb1` |
| Decision wiki (on PR branches; may be absent on `main`) | `docs/wiki/decisions/sezione-tour-dev-playground.md` @ `feat/sezione-tour-playground` |
| Font DEV pattern on `main` | `src/components/FontPairingPicker.astro`, `Base.astro` `isDev` gating |
| Glossary | `GLOSSARY.md` (Tour / Catalogo Tour / Sezione Tour / Recensione Google) |
| Repo | https://github.com/bbtgnn/spaghettiabc-website |

**Reference checkout tip (2026-11-13 fetch):** `origin/feat/sezione-tour-playground` = `50b5fb1a1e45624c211adb8f701d0816e33e4397`.
