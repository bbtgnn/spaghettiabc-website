# Sezione Dicono di me

## Sources

- Grilling + domain modeling with Chiara, 2026-11-06
- Domain terms: [`GLOSSARY.md`](../../../GLOSSARY.md) (**Sezione Dicono di me**, **Logo partner**, **Punteggio Google**, **Recensione Google**)
- Supersedes [Collaborazioni CMS model](./collaborazioni-cms-model.md) (2026-10-23)
- Supersedes logo/landing claims in [Homepage chrome + landing lists](../ops/homepage-chrome-landing-lists.md) (2026-10-23)
- Extends [Homepage hero + Recensioni Google](./homepage-hero-google-reviews.md) (2026-11-05)

## Decisions (2026-11-06)

1. **Rename the homepage block** — public/CMS section is **Dicono di me** (not Collaborazioni / Credibilità / Fiducia). Proof = partner logos + Google reviews.
2. **No Collaborazioni landing** — delete collection `collaborations`, route `/collaborazioni`, gallery/body/progetti content, and the homepage CTA.
3. **Single CMS surface** — section chrome, `partner_logos`, Punteggio Google (`google_score`, `google_review_count`, `google_profile_url`), and `google_reviews` all live on the `homepage` entry.
4. **Recensione Google fields** — `author`, `quote`, `rating` (stars in UI), `avatar`, `review_url`. Still curated CMS content; not a live Google sync.
5. **Layout** — title + subtitle → logo strip → row with Punteggio Google (left) + quote list (right).
6. **Admin heading** — `form_heading_dicono` label **Dicono di me** (replaces `form_heading_collaborations`).
7. **Seed** — title **Dicono di me**; six partner logos (same webps); five Italian demo reviews, all 5★, with placeholder avatars + review URLs; aggregate `5.0` / `48` reviews.

## Explicitly out of scope (2026-11-06)

- Live Google Business / Places API
- Dedicated Collaborazioni (or Credibilità) landing
- Migrating old gallery/progetti media into a new home

## Live DB alignment (2026-11-09)

On 2026-11-09 the running instance (`data.db`) was brought in line with this decision: homepage `dicono_*` / `partner_logos` / Punteggio Google fields + richer `google_reviews`; obsolete `collaborations_*` fields and collection `collaborations` removed. Backup and field map: [Homepage Dicono schema migration](../ops/homepage-dicono-schema-migration.md).
