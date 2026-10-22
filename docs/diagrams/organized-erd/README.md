# DEEMO ERD (document-ready)

[Preview](index.html) · [Vector SVG](DEEMO-ERD-organized.svg) · [High-resolution PNG](DEEMO-ERD-organized.png)

All 22 tables, every field and all 24 relationships from `../src/erd.mjs`, laid out to stay readable when pasted into a document at page width.

- **Compact layout:** six columns (notices, users, projects, sessions, the report and its parts), 7880 × 3938 (the earlier figure was 6600 × 3200 with much smaller type). The main chain users → projects → sessions → reports shares one row.
- **Large, bold, dark type:** 54 px table names, 46 px bold fields, 40 px bold types, 46 px bold relationship labels (all near the table-name size), near-black ink, 4.2 px lines and larger crow's feet.
- **Clean connectors:** straight lines wherever two tables line up, otherwise one lane with two bends; labels sit on the segment into the table they describe. The generator checks that every line is attached, none runs through a table, and none cross or share a segment.
- `admin_actions` and `rate_limit_counters` (grey) have no foreign keys, so they stay unconnected. The dashed line is the logical project reference on sessions (no FK).

Use the SVG when the document accepts it (sharp at any size); otherwise the PNG (15760 × 7876, rendered at 2× for sharp edges).

## Regenerate

From this folder:

```bash
node src/generate.mjs
"C:/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --hide-scrollbars --force-device-scale-factor=2 --window-size=7880,3938 --screenshot="DEEMO-ERD-organized.png" "file:///C:/Deemo.ai/docs/diagrams/organized-erd/DEEMO-ERD-organized.svg"
```

Keep the render under Chrome's 16384 px texture limit (scale × width), or it comes out tiled. `generate.mjs` reuses `../src/lib.mjs`; its data snapshot (`src/data.mjs`) must match `../src/erd.mjs` (checked). Positions and routes are derived from table sizes, so re-check the routes after a schema change. `src/export.mjs` (Playwright text checks) still works if Playwright is available.
