# Bilingual site on EmDash locales

The site serves English-speaking visitors first and Italian ones second, with every page and entry available in both ([#41](https://github.com/bbtgnn/spaghettiabc-website/issues/41)).

**Decision:**

- Translations use EmDash's native locales: one entry per locale, paired by a translation group. Each field is either per-locale or shared, set once in the seed.
- English is the default and unprefixed; Italian lives under `/it/`. Each locale has its own slugs.
- When an entry is missing in the requested locale, the page falls back to EN, then IT, in code. Content is seeded fully in both locales; the fallback is a safety net.
- UI chrome strings live in a code dictionary, not the CMS.
- The language switcher jumps to the paired entry, else to that locale's homepage. There is no Accept-Language or geo detection.
- Static path segments (`/tours`, `/books`, `/training`) stay English in both locales until [#49](https://github.com/bbtgnn/spaghettiabc-website/issues/49).

**Rejected:**

- `_en` / `_it` duplicate fields on one entry.
- Prefixing both locales (`prefixDefaultLocale`): it makes `/_emdash/admin` return 404.
- Astro's `fallback` routing, which redirected every `/it/` URL to English instead of rendering Italian with per-entry fallback.
