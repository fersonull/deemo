# DEEMO site v2 — scroll-driven 3D phone, new layout, smart navbar, no fade-ups

## Context

The first site (`client/web/site`, commit `b17862a`) works, but the user wants:
1. **A three.js 3D phone mockup that follows the visitor's smooth scrolling.**
2. **A redesigned layout**, built around that phone.
3. **A navbar that hides on scroll down and comes back on scroll up.**
4. **No "AI slop" fade-upward entrance animations.** Every `[data-reveal]` fade-and-rise goes.

**Already built in `client/web/presentation`, reused here:**
- `js/phone.js`: the 3D phone, about 340 lines. It's a three.js model (dusk glass back, ink frame, screen, wordmark), with a soft contact shadow, idle bob, pointer tilt and pixel-sharp screen textures. `targetFor(el)` maps a DOM rect to a world position, scale and pose, and `setScreen(id)` crossfades the screen.
- `js/screens.js`: the screens drawn in Canvas 2D at 360×760 — `splash`, `projects`, `analysis`, `setup`, `session`, `flag` (animated) and `results`, all with fictional data.

In the deck the phone flies between slides with GSAP timelines. Here it **scrubs with scroll** instead.

**Unchanged:** the content, the real panel logic (`panel-data.ts`, `panel-face.ts`), the Deemo mascot (`deemo.ts`), the tokens, Vite + TypeScript, and the `DOWNLOAD_URL` honesty.

## Motion model (replaces every fade-up)

- **Smooth scroll:** Lenis (npm `lenis`), driven by GSAP's ticker and synced to `ScrollTrigger.update`. With `prefers-reduced-motion` there's no Lenis, just native scroll.
- **The phone is the motion.** A fixed full-viewport WebGL canvas sits behind the content (`pointer-events: none`). Each chapter has a `.phone-slot` with `data-screen`, `data-pose` and optional `data-spin`.
  - **Every frame:** take the slot centers relative to the viewport center, find the two slots on either side, and lerp position, scale and rotation between their `targetFor()` targets, eased with smoothstep.
  - **Result:** the phone glides continuously as you scroll and stops wherever you stop. There are no timed flights.
  - **Screen swaps:** the screen changes when the nearest slot changes, using the existing `setScreen` crossfade.
  - **Slight lag:** the phone trails the scroll a little (critically damped, around 0.12 per frame), so it reads as physical.
  - **Banking:** the phone leans by scroll velocity (the deck's `lean` group, now fed by Lenis velocity instead of flight direction).
- **Text never animates in.** It's simply there. The one state change is the active chapter: its kicker number fills ink and the others stay muted. That's a color transition on the currently-in-view chapter, not a reveal.
- **Kept (these respond to the visitor, they aren't entrance motion):**
  - the panel-demo card reshuffle when a course chip is picked
  - Deemo's mood hop
  - FAQ open and close
- **Removed:** `utils/reveal.ts`, every `data-reveal` attribute, and the `[data-reveal]` CSS.
- **Reduced motion:** the phone snaps to the nearest slot's pose, with no lag, bob, lean or spin.

## Layout redesign — "the phone is the guide"

The page becomes a scroll story with the phone pinned in the composition, instead of stacked boxes.

1. **Hero (100svh)**
   - **Left:** the oversized headline (the existing tagline), the lede and the two CTAs.
   - **Right:** the phone, large (about 70vh tall), turned in the `hero` pose, showing `splash`.
   - **Deemo** sits low at the phone's base, waving, with its speech bubble.
2. **Chapters:** a 12-column grid. Copy sits in columns 1–5 and the phone's slot occupies columns 7–12, sticky in feel because the slots line up down the page. Each chapter is about 90–110svh tall so the phone has distance to travel.

   | # | Chapter | Phone screen | Pose | Live element in the copy column |
   |---|---|---|---|---|
   | 01 | Upload your manuscript | `projects` | `left` | — |
   | 02 | DEEMO reads it (Document Logic Analysis, field detection) | `analysis` | `front` | — |
   | 03 | A panel built for your field | `setup` | `right` + one spin on entry | **"Build your panel" demo** (course chips, real lineup, panel faces) |
   | 04 | Asked out loud | `session` (animated) | `front` | **Bounded follow-ups** and **question types** as small labels |
   | 05 | Contradictions, caught | `flag` (animated) | `left` | **Consistency-checker input demo** (amber flag) |
   | 06 | Your readiness report | `results` | `hero` | — |

   On the right edge of the viewport, a thin vertical **chapter rail** (01–06, mono numerals). The active numeral fills; clicking one jumps there through Lenis `scrollTo`.
3. **The phone leaves.** After chapter 06 there's no slot, so the phone exits bottom-right (the deck's existing "no slot" target). The rest of the page is full width:
   - **"What DEEMO is / isn't":** a two-column ink band (paper text on ink), a deliberate color shift so the page ends with rhythm rather than more cards.
   - **Free vs Premium:** the existing cards, side by side.
   - **FAQ:** the existing `<details>` items.
   - **Footer CTA:** Deemo cheering, "Ready to face the panel?" and the honest download state.
4. **Mobile (under 820px)**
   - **Hero:** the phone sits fixed in the upper part of the viewport (about 46svh tall).
   - **Chapters:** each slot is a 52svh spacer above its copy, so the phone visibly rides between chapters on a single column.
   - **Chapter rail:** hidden.
   - **Lenis:** off on touch. Native momentum feels right there, and ScrollTrigger still drives the phone.
   - **Copy:** gets a paper backing (`background: var(--paper)` with padding) so text stays readable when the phone passes behind it.

## Navbar: hide on scroll down, show on scroll up

- Same floating ink pill. It reads `direction` from Lenis (or the native scroll delta when Lenis is off):
  - **Scrolling down past 80px:** add `.nav--hidden` (`transform: translate(-50%, calc(-100% - 24px))`, 280ms ease-out).
  - **Any scroll up, or within 80px of the top:** remove it.
- A 6px dead zone stops it flickering on trackpads. Keyboard focus inside the nav always shows it (`:focus-within`).
- Nav links go through `lenis.scrollTo(target, { offset: -24 })`.

## Files

**New** (ported from `client/web/presentation/js/`; three and gsap now come from npm imports instead of vendor and global):
- **`src/three/phone.ts`:** a port of `phone.js`.
  - **Replace `goTo` flights** with `follow(slots: HTMLElement[])`, which stores the slots, and a per-frame `update(viewportCenterY, velocity)` that does the interpolation and lag described above.
  - **Keep as they are:** `buildModel`, `targetFor`, `sharpen`, the shadow, the bob and the pointer tilt.
  - **Imports:** `RoomEnvironment` from `three/examples/jsm/environments/RoomEnvironment.js`.
  - **Failure:** throws if WebGL is unavailable. The caller hides the canvas and shows a static CSS fallback: the deck's `deemo-mark` in a phone-shaped blob.
- **`src/three/screens.ts`:** a near-verbatim port of `screens.js`. TypeScript types for `ctx` and the draw table. Its `deemo-mark.svg` path changes to `/deemo-mark.svg`.
- **`src/scroll.ts`:** Lenis setup, the GSAP ticker hookup, `ScrollTrigger` sync, a direction and velocity emitter for the nav and the phone, and the reduced-motion bypass.
- **`src/sections/chapters.ts`:** builds the chapter rail and sets the active-chapter state (an IntersectionObserver around the viewport middle, a class toggle only).

**Rewritten:**
- **`index.html`:** new structure. Hero, six `<article class="chapter">` elements each with `.chapter__copy` and `.phone-slot[data-screen][data-pose]`, the ink scope band, plans, FAQ and footer. A `<canvas class="phone-canvas">` and the `<nav class="chapter-rail">`.
- **`src/sections.css`:** the new grid, chapter, rail, ink band and mobile rules. All `[data-reveal]` rules are removed.
- **`src/base.css`:**
  - drop the `[data-reveal]` block and `html { scroll-behavior: smooth }` (Lenis owns scrolling)
  - add `.nav--hidden`
- **`src/main.ts`:** init order: fonts ready → `scroll.ts` → `phone.ts` with the slots → sections. Remove `initReveal` and `stagger`.
- **`src/sections/how-it-works.ts`:** deleted. The chapters replace the step list; its copy moves into the chapter articles.
- **`src/sections/hero.ts`:** the panel demo mounts inside chapter 03's copy column instead of the hero. The hero keeps Deemo only.
- **`src/sections/features.ts`:** reduced to the consistency demo (mounted in chapter 05) and the bounded-follow-up and question-type labels (chapter 04). The feature grid is gone; its claims live in the chapters.

**Unchanged:** `panel-data.ts`, `panel-face.ts`, `deemo.ts`, `tokens.css`, `scope.ts` (rendered into the ink band), `plans.ts`, `faq.ts`, `footer.ts`, `utils/motion-pref.ts`.

**Deleted:** `src/utils/reveal.ts`.

**Dependencies:** `bun add three lenis` and `bun add -d @types/three`. GSAP's ScrollTrigger is already in the `gsap` package.

## Performance guardrails

- **Render loop:**
  - The renderer only draws when something changed: the scroll position, the lag still settling, the pointer, or an animated screen.
  - It pauses when the tab is hidden, as the deck already does.
- **Pixel ratio** is capped at 2. Only the showing screen's texture redraws, at about 30 fps for `session` and `flag` (existing behavior).
- **Loading:** three, the phone and the screens load via dynamic `import()` after first paint, so the hero text is interactive immediately.

## Not doing

- Real app screenshots (the screens stay fictional, as decided before).
- A pinned or scroll-jacked section that hijacks the wheel. Lenis smooths native scroll and never locks it.
- Fade, rise or stagger entrance effects anywhere.
- Server, app or admin changes.

## Verification

1. **Build:**
   ```bash
   cd client/web/site && bunx tsc --noEmit && bun run build
   ```
   The build must succeed. Check the bundle size: three should load in its own lazy chunk.
2. **Desktop preview at 1440×900** (`site` launch config):
   - The phone sits in the hero pose with `splash`.
   - Scrolling glides it through all six chapter slots with matching screens, a spin on chapter 03, and banking with speed.
   - After chapter 06 it exits bottom-right.
   - The chapter rail tracks and its numerals jump.
   - The course chips still rebuild the panel, and the consistency demo still flags.
3. **Navbar:** it hides after scrolling down 200px, reappears on a small scroll up, and is always visible at the top.
4. **No fade-ups:** grep for `data-reveal` and `reveal` returns nothing. A slow scroll shows text static from its first pixel.
5. **Mobile at 375×812:** the phone rides between chapters, copy is readable over it, the rail is hidden, and native scroll works.
6. **Reduced motion (emulated):** no Lenis, and the phone snaps per slot without lag, bob or spin.
7. **No WebGL** (canvas creation forced to fail): the fallback mark shows and the page still works.
8. **Detector:** `impeccable detect --json` over `client/web/site` before finishing.
9. **Docs:** update the `docs/HANDOFF.md` row and gotchas: three copies of the phone now exist (deck and site); Lenis owns scrolling; there are no reveal animations by design. Commit on `dev`.
