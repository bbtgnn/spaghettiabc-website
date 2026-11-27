# Prenotazione via an embedded Calendly

A Tour is booked as a Calendly request, not bought; payment happens off-site (SumUp) after the request ([#15](https://github.com/bbtgnn/spaghettiabc-website/issues/15), [#22](https://github.com/bbtgnn/spaghettiabc-website/issues/22), [#24](https://github.com/bbtgnn/spaghettiabc-website/issues/24)).

**Decision:**

- The Scheda Tour embeds Calendly directly in its booking column.
- The effective URL is the Tour's `calendly_url` when it is non-empty, else the default on Impostazioni sito, else no embed. With a default set, every Tour without its own URL is bookable; there is no per-tour opt-out until a real case needs one.
- The embed server-renders a plain `<iframe>`, so booking works without JavaScript; a component script then swaps in the Calendly widget for sizing and theming. Loading Calendly twice is an accepted cost.

**Rejected:**

- A cart, checkout, or on-site payment.
- A sheet dialog opened from a «Prenota» button, and an inline embed below the gallery. Both were built and compared on the real Scheda; the embed in the column won.
- A framework island for the embed.
