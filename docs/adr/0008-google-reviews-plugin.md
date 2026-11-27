# Recensioni Google sync via Business Profile plugin

Flavia needs more than five Google quotes on Sezione Tour, with control over which appear and how the display text reads. Curating them only on the `homepage` entry and capping at Places’ five-review limit both failed that need.

**Decision:** native EmDash plugin `@spaghettiabc/google-reviews` syncs reviews through Google Business Profile (OAuth + account/location; optional local mock sync), stores them in plugin storage (not a content collection), and exposes admin feature + editable display text. Sezione Tour reads featured reviews and Punteggio Google via `getTourGoogleSocialProof` (`src/utils/tour-google-social-proof.ts`), which calls the plugin’s public `featured` route and keeps homepage CMS `google_*` as an internal fallback only when that route is unavailable.

**Rejected:**

- Paste/fetch of Maps share links ([#4](https://github.com/bbtgnn/spaghettiabc-website/issues/4)).
- Places API (New) as the sync source (max five reviews).
- Writing synced reviews into a content collection.
- Auto-featuring every synced review.
- Showing Google proof in Sezione Dicono di me (logos only).

**Status:** accepted. Supersedes the “nothing is fetched from Google / curated only on homepage” claim in [ADR-0004](0004-homepage-social-proof.md); that ADR’s placement of proof in Sezione Tour (not Collaborazioni) still holds.
