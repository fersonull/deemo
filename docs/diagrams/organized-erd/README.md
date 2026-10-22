# DEEMO ERD (document-ready)

[Preview](index.html) · [Vector SVG](DEEMO-ERD-organized.svg) · [High-resolution PNG](DEEMO-ERD-organized.png)

All 22 tables, every field and all 24 relationships from `../src/erd.mjs`, laid out to stay readable when pasted into a document at page width.

- **Compact layout:** six columns (notices, users, projects, sessions, the report and its parts), 5150 × 2848 instead of the earlier 6600 × 3200. The main chain users → projects → sessions → reports shares one row.
- **Large, bold type:** 40 px table names, 30 px bold fields (keys extra bold), 26 px types, 28 px bold relationship labels, 3.4 px lines and larger crow's feet.
- **Clean connectors:** straight lines wherever two tables line up, otherwise one lane with two bends; labels sit on the segment into the table they describe. The generator checks that every line is attached, none runs through a table, and none cross or share a segment.
- `admin_actions` and `rate_limit_counters` (grey) have no foreign keys, so they stay unconnected. The dashed line is the logical project reference on sessions (no FK).

Use the SVG when the document accepts it (sharp at any size); otherwise the PNG (10300 × 5696).

## Regenerate

From this folder:

```bash
node src/generate.mjs
"C:/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --hide-scrollbars --force-device-scale-factor=2 --window-size=5150,2848 --screenshot="DEEMO-ERD-organized.png" "file:///C:/Deemo.ai/docs/diagrams/organized-erd/DEEMO-ERD-organized.svg"
```

`generate.mjs` reuses `../src/lib.mjs`; its data snapshot (`src/data.mjs`) must match `../src/erd.mjs` (checked). Positions and routes are derived from table sizes, so re-check the routes after a schema change. `src/export.mjs` (Playwright text checks) still works if Playwright is available.
