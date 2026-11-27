# Libro is presented through its Edizioni

The Libro is Flavia's work on Puglian food, and it exists in more than one Edizione (international and special), each with its own cover, copy, and place to buy it ([#42](https://github.com/bbtgnn/spaghettiabc-website/issues/42)).

**Decision:** the Libro has no CMS entry and no page of its own. Each Edizione is an entry in `libri`, with no parent entry, and has a Scheda Edizione at `/books/[slug]`; its `subtitle` names the Edizione. There is no hub page: the homepage Sezione Libro is the only listing, and it shows the Edizioni the editor picks, in order, through `featured_books`. The buy CTA appears only on the Scheda Edizione.

**Rejected:**

- One canonical Libro entry at `/puglia-the-book`, with the homepage duplicating its copy (the first model, retired by #42).
- A `/puglia-the-book` hub listing the Edizioni, built and then dropped in #42.
- An `edition` select field as a discriminator; `subtitle` already labels the Edizione.
- Loading every published Edizione on the homepage, replaced by the editor's ordered pick.
- A buy CTA on the homepage teasers.
