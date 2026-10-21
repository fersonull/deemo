# Continuous landscape DEEMO ERD

[Preview](index.html) · [Vector SVG](DEEMO-ERD-organized.svg) · [High-resolution PNG](DEEMO-ERD-organized.png)

One continuous table-to-table diagram, with no reference chips, repeated tables or split views. It preserves all 22 tables, every field and all 24 relationships from `../src/erd.mjs`. The related tables form one connected network of 20 tables. `admin_actions` and `rate_limit_counters` remain unconnected because the database defines no foreign-key relationships for them; the diagram does not invent any.

The layout maximizes a wide landscape canvas. Its main row reads **users → projects → sessions → reports from left to right**, with related tables above and below and separate orthogonal routes. Connectors never cross, overlap each other, or pass through a table. Crow's-foot cardinalities and the dashed logical project/session reference are retained.

Text was enlarged within the same canvas: 30 px table names, 26 px bold relationship labels, 24 px field names, 21 px data types and 20 px notes. Dark outlines and local Arial fonts keep it clear. The SVG is 6600 × 3200 (2.06:1 landscape); the PNG is rendered directly at 13200 × 6400 rather than enlarged from an existing image. Use SVG for sharp zooming. Physical text size still depends on how far the entire figure is reduced in a document.

## Checks and regeneration

`routing-checks.json` records the 22-table/24-relationship coverage, connected component, attached endpoints and zero line crossings/shared segments/routes through tables. `text-checks.json` records browser checks for clipped or overlapping labels, labels escaping table boxes and a 20 px minimum font. The generator also verifies that its data snapshot matches the original ERD source and that the main path is aligned from left to right. Original figures and sources remain untouched. This is a layout revision, not a new schema audit or an online-paper edit.

Run from this folder:

```powershell
node src/generate.mjs
# Set NODE_PATH to the existing workspace runtime's node_modules containing Playwright.
# Set CHROME_PATH if Chrome is not installed under ProgramFiles.
node src/export.mjs
```

The generator reuses the existing SVG helper and ELK installation from `../src/` (install that existing package with `bun install` if missing). Node is used because the installed ELK 0.9.3 bundled worker does not load correctly through Bun's CommonJS interop. The PNG export uses the workspace's existing Playwright and installed Chrome. No dependencies or native builds were added.
