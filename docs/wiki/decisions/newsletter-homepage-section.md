# Newsletter homepage section

## Sources

- Grilling session with Chiara, 2026-10-23 (Q1–Q7, confirmed “sì”)
- Domain terms: [`GLOSSARY.md`](../../../GLOSSARY.md)

## Decisions (2026-10-23)

On 2026-10-23 Chiara locked:

1. **Homepage section only** — no `/newsletter` route, no `newsletter` collection.
2. **UI-only subscribe** — email field + button; no Mailchimp/Brevo/EmDash subscriber store yet.
3. Canonical name **Newsletter**.
4. Homepage CMS fields: `newsletter_title`, `newsletter_subtitle`, `newsletter_button_label`, `newsletter_email_placeholder`.
5. Submit: client `preventDefault` + soft IT message that signup is coming (no data sent).
6. **No privacy checkbox** until a real data processor exists (small honesty note under the form OK).
7. Placement: **after Collaborazioni**, near page end.

## Implementation snapshot (2026-10-23, pre-commit)

On 2026-10-23 [Implement newsletter section](06bc2c66-519b-4768-9aad-6fc34d396ead) reported: four homepage fields seeded, Newsletter block after Collaborazioni on `/` (HTTP 200), preventDefault + honesty note, no provider / no `/newsletter` route.

## Explicitly out of scope (2026-10-23)

- Provider integration / API keys
- Storing emails in EmDash
- Dedicated newsletter landing page
- Fake GDPR consent checkbox
