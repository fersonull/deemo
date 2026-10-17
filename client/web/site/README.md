# DEEMO — public site

The public marketing site: one scrolling page explaining DEEMO, in the app's own design system. Plan: `docs/DEEMO_SITE_PLAN.md` (repo root).

```bash
bun install
bun run dev      # http://localhost:5056
bun run build    # typecheck + production build to dist/
```

No backend, no router — Vite + TypeScript, same category as `client/web/presentation` (reused directly: see `src/tokens.css`, `src/deemo.ts`).

**Keep in step with the real app** (no shared import on purpose — this project has zero server dependency):
- `src/panel-data.ts` ← `server/src/modules/practice/domain/panel.ts` + `server/src/modules/identity/domain/course.ts`
- `src/panel-face.ts` ← `client/mobile/Deemo/src/components/panel-face/`
- `src/tokens.css` / `src/deemo.ts` ← `client/mobile/Deemo/src/{colors,theme}.ts` / `components/deemo/`

**Before shipping:** set `DOWNLOAD_URL` in `src/sections/footer.ts` once a signed release APK exists (empty shows an honest "coming soon" state instead of a dead link).
