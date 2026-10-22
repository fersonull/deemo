# DEEMO: public site

One scrolling page plus a privacy page, built on a single idea: a defense panel holds **note slips** of questions. DEEMO writes them from your manuscript, deals them to the right panelists, reads them aloud and scores the answers. The slips are the only thing that travels on the page. It uses the app's design system (paper, ink, dusk, Bricolage Grotesque, DM Sans, DM Mono, Deemo and the panel faces). Direction contract: `.impeccable/surfaces/client-web-site.md` (repo root).

```bash
bun install
bun run dev      # http://localhost:5056
bun run build    # typecheck + production build to dist/ (the landing page and /privacy)
```

Vite + TypeScript, no framework. GSAP (ScrollTrigger, SplitText) for motion, three.js for the hero's slip stack.

- `index.html`: all page content, readable without JavaScript. `privacy/index.html`: the privacy page, served at `/privacy` (a dev-server rewrite in `vite.config.ts`, `cleanUrls` in `vercel.json`).
- `src/nav.ts`: the nav on both pages hides while scrolling down and returns on scroll up (ScrollTrigger direction; `:focus-within` keeps it visible for keyboard users).
- `src/content.ts`: the download URL (GitHub Releases), the hero slips, the sample rubric levels and score, each with its source in the app or server.
- `src/hero/`: the three.js slip stack (`stack.ts`; drag or flick the top slip, or press Next question) and the canvas that draws each slip face (`slip-face.ts`). It loads lazily after first paint; without WebGL the flat DOM slip stays and Next question cycles it.
- `src/scenes/`: the scroll scenes. `reads.ts` (manuscript lines lift into slips, pinned on wide screens), `live.ts` (the spoken exchange and the amber contradiction slip), `panel.ts` (course chips re-seat the field expert).
- `src/tokens.css` · `base.css` · `sections.css`: tokens, the shared `.slip` and button styles, section layout.
- Reduced motion: no pins, no scrubs, every scene shows its end state, and the stack swaps slips without animation.

**Keep in step with the real app** (no shared import on purpose; this project has no server dependency):
- `src/panel-data.ts` ← `server/src/modules/practice/domain/panel.ts` + `server/src/modules/identity/domain/course.ts`
- `src/panel-face.ts` ← `client/mobile/Deemo/src/components/panel-face/`
- `src/deemo.ts` ← `client/mobile/Deemo/src/components/deemo/`
- `src/tokens.css` ← `client/mobile/Deemo/src/colors.ts`
- `src/content.ts` sample slips and score ← `SAMPLE_ANALYSIS` (`server/src/modules/practice/domain/agenda.ts`) and `server/src/modules/scoring/domain/scoring.ts`; plan limits in the Plans section of `index.html` ← `server/src/modules/identity/domain/plan.ts`; Premium perks ← `client/mobile/Deemo/src/screens/premium/index.tsx`.
