# Form headings are marker fields

The Homepage editor is one long form, and Flavia needs section titles to find her way through it ([#5](https://github.com/bbtgnn/spaghettiabc-website/issues/5)). EmDash has no form-heading field type.

**Decision:** each heading is a boolean marker field (`form_heading_*`) whose widget, from the `form-headings` plugin, renders its label as a title and exposes no toggle. The homepage field list stays flat; public templates never read the markers.

**Rejected:** grouping fields into object or block fields (reshapes the data and every query for an editor-only concern); EmDash Sections (Portable Text library blocks, unrelated to the form); collapsible groups.

**Consequences:** headings are ordinary fields, so a new homepage field must sit after its heading in the seed's field order, and seeding a database that already has content appends new fields at the end of the form.
