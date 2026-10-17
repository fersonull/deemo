# DEEMO — public site

The public marketing site: one scrolling page explaining DEEMO, in the app's own design system. Plan: `docs/DEEMO_SITE_PLAN.md` (repo root).

```bash
bun install
bun run dev      # http://localhost:5056
bun run build    # typecheck + production build to dist/
```

No backend, no router — Vite + TypeScript + GSAP + three.js + Lenis, same category as `client/web/presentation` (reused directly: `src/tokens.css`, `src/deemo.ts`, and the 3D phone in `src/three/model.ts` + `screens.ts`). The phone follows scroll between `.phone-slot` elements (`src/three/phone.ts`); there are no entrance/reveal animations by design.

**Keep in step with the real app** (no shared import on purpose — this project has zero server dependency):
- `src/panel-data.ts` ← `server/src/modules/practice/domain/panel.ts` + `server/src/modules/identity/domain/course.ts`
- `src/panel-face.ts` ← `client/mobile/Deemo/src/components/panel-face/`
- `src/tokens.css` / `src/deemo.ts` ← `client/mobile/Deemo/src/{colors,theme}.ts` / `components/deemo/`
- `src/three/model.ts` / `src/three/screens.ts` ← `client/web/presentation/js/phone.js` (buildModel) / `screens.js`

**Before shipping:** set `DOWNLOAD_URL` in `src/sections/footer.ts` once a signed release APK exists (empty shows an honest "coming soon" state instead of a dead link).
