# Single-entry collections

The homepage, the Formazione landing, and Impostazioni sito each need exactly one editable record, but EmDash has no single-entry content type (checked on 1.4 and still absent in the 1.6 docs), and its Site Settings are a fixed set (General, Social, SEO) that cannot hold a repeater like the FAQ or a field like the default Calendly URL.

**Decision:** model each one as a non-routable collection holding one entry per locale under a fixed slug: `homepage` / `home`, `training` / `training`, `site_globals` / `site`. Pages read the entry by that slug and fail soft when it is missing. The site title and tagline stay in EmDash Site Settings.

**Rejected:** storing these values in Site Settings, which has no custom fields.

**Consequences:** nothing stops an editor from creating a second entry in these collections; the site ignores it.
