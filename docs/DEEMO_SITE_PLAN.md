# DEEMO public marketing site — `client/web/site`

## Context

DEEMO has an app (`client/mobile/Deemo`, Operate), an internal admin (`client/web/admin`, Operate), and a slide deck for the capstone defense itself (`client/web/presentation`, Persuade but presenter-driven, academic framing, not for a general visitor). There is no public page that explains what DEEMO is and how it works to someone who just found it. This builds that: a single, visitor-driven **Persuade** surface, in the app's own established visual world (warm paper, dusk indigo, Bricolage Grotesque / DM Sans / DM Mono, the owl mascot), built fun and interactive rather than a stack of static feature-grid sections.

**World status:** established, not new (`PRODUCT.md` already pins it; the user confirmed "same design system as the app"). This is the "create a whole surface inside an established world" case — the palette/type/component language stay fixed; only the surface's structure and interactions are invented.

**Decisions already made (via question tool):**
- **CTA:** a direct "Download the APK" button. No public release APK exists yet (handoff: "ship a release build" is still a pending user action) — the button reads from one empty-by-default `DOWNLOAD_URL` constant; empty shows an honest "Android app — release coming soon" state instead of a dead link, and the user flips it live the day a signed APK is hosted somewhere.
- **Visual content:** no real student data, ever. Every app-screen mockup is recreated with fictional demo data, the same way `client/web/presentation` already recreates screens (`js/screens.js`) rather than using real screenshots.
- **Scope:** one long page, anchored sections, no router.
- **Signature interaction:** "Build your panel" — the visitor picks a course from chips in the hero, and the panel reassembles live beneath it (the right field-expert panelist, title and focus) using the **same real logic** the app just shipped (course profiling, course-adapted panel, manuscript-field detection). This is proof, not a mockup: the lineup math is pure functions, portable as-is.

## Reused material (don't rebuild what already exists)

`client/web/presentation` already ported DEEMO's design system to plain web once. Reuse it directly rather than re-deriving:

- **`client/web/presentation/styles.css`** — CSS custom properties mirroring `colors.ts`/`theme.ts` exactly (confirmed: same hex values, `--blob`, `--ease-out`, radius scale, font stacks). Copy as the new project's starting token sheet; extend, don't replace.
- **`client/web/presentation/js/deemo.js`** — a vanilla SVG/JS port of the mascot (`client/mobile/Deemo/src/components/deemo/index.tsx`), moods driven by template strings, blink/wave in CSS `@keyframes`, mood transitions via GSAP. Reuse directly for the mascot on this site (same moods: `idle`, `cheering`, `reading`, `encouraging`, `waving`, `sleepy`, `nervous`).
- **`client/web/presentation/assets/deemo-mark.svg`** — ready-made polished mark/favicon source.
- **Panel faces, not yet ported:** `client/mobile/Deemo/src/components/panel-face/{index.tsx,parts.ts,personas.ts}` are flat-bust SVGs (paths + persona fills) — port them to a vanilla SVG module the same way `deemo.js` ported the mascot (same precedent, not done yet). Needed for the "Build your panel" demo so the panelists look like the real app's panel, not a text list.
- **Panel logic, port the pure functions, not the server:** from `server/src/modules/practice/domain/panel.ts` (`PERSONAS`, `FIELD_EXPERT`, `COURSE_FOCUS`, `DOMAIN_FOCUS`, `PRIORITY`/`lineup`) and `server/src/modules/identity/domain/course.ts` (`COURSES`, `COMPUTING`). These are pure, data-only — copy them into one `src/panel-data.ts` module on the site (no server call, no API, fully static and instant). Keep a comment noting the source files so a future change to the real lineup can be mirrored here, the same discipline already used between the server and the app for `COURSES`/`DOMAINS`.
- **`client/web/presentation/js/phone.js`** (three.js 3D phone) — optional, not required for this scope (no scrollytelling session was chosen); skip unless a later pass wants a hero phone render.

## Stack

**Vite + TypeScript, no framework** (not Next.js). Reasoning: this is a static, backend-less, single-page, motion-heavy surface — the same category as `presentation`, which deliberately stayed framework-free. A page built mostly of custom SVG/DOM animation gets no benefit from React/Next here and it would mean rewriting the reusable `deemo.js`/`styles.css` assets instead of reusing them. `admin`'s Next.js choice was for Operate (tables, auth, forms); this surface has none of that.

- **Build:** Vite (TypeScript, no JSX) — dev server, HMR, production bundling, asset hashing. `presentation` has no build step at all (hand-maintained vendor files); Vite is a small, justified step up since this project is bigger and will want bundling/minification for a public launch page.
- **Motion:** GSAP (already vendored in `presentation/vendor/`, and this environment has multiple GSAP skills installed — gsap-core, gsap-scrolltrigger, gsap-timeline, gsap-react not needed). Use `gsap` + `ScrollTrigger` from npm (not vendored copies) since Vite handles bundling.
- **No UI framework, no component library.** Hand-built DOM/SVG, consistent with the app's "no stock component inside a committed form" rule and with `presentation`'s precedent.
- **Package manager:** bun, per repo convention. `bunx create vite@latest . -- --template vanilla-ts`, then strip the template boilerplate.
- **Skills to load during build** (already installed, use them): `gsap-core`, `gsap-scrolltrigger`, `gsap-timeline`, `gsap-utils` for the motion work; `modern-web-guidance` before writing HTML/CSS (current platform APIs: view transitions, scroll-driven animations, `:has()`, container queries — avoid stale patterns); `ui-ux-pro-max` / `frontend-patterns` as general craft references. `impeccable` (this skill) governs the overall design process and finish review.

## Project layout — `client/web/site/`

```
site/
├── index.html                 # the one page; sections as <section id="...">
├── src/
│   ├── main.ts                 # entry: wires up all sections
│   ├── tokens.css              # ported from presentation/styles.css, extended
│   ├── base.css                # resets, layout primitives
│   ├── deemo.ts                 # ported from presentation/js/deemo.js (mascot)
│   ├── panel-face.ts             # NEW: ported from app's panel-face/{parts,personas}.ts
│   ├── panel-data.ts              # NEW: ported pure data — COURSES, FIELD_EXPERT, COURSE_FOCUS, lineup()
│   ├── sections/
│   │   ├── hero.ts                 # headline + "Build your panel" interactive demo
│   │   ├── how-it-works.ts          # upload → analyze → set up → live session → report, animated steps
│   │   ├── features.ts               # feature cards incl. a small live "consistency checker" text-input demo
│   │   ├── scope.ts                   # "What DEEMO is / isn't" — honest, quiet, text-forward
│   │   ├── plans.ts                    # Free vs Premium, short, no fake pricing-SaaS grid
│   │   ├── faq.ts                       # accordion
│   │   └── footer.ts                     # mascot sign-off + download CTA + links
│   └── utils/
│       ├── reveal.ts              # IntersectionObserver + GSAP scroll reveals, shared by sections
│       └── motion-pref.ts          # prefers-reduced-motion gate (mirrors the app's useReducedMotion discipline)
├── public/
│   ├── favicon.svg                 # from deemo-mark.svg
│   └── og-image.png                 # generated once, for link previews
├── package.json, tsconfig.json, vite.config.ts
└── README.md
```

## Section plan (why each one earns its place — no generic grid-of-cards wall)

1. **Hero.** Headline: *"Practice your capstone defense with an AI panel that has actually read your paper."* (the app's own tagline, verified in `docs/DEEMO_Mobile_App_Plan.md`). Deemo mascot (`waving`/`encouraging`), course chips (`COURSES` from `panel-data.ts`). Picking a chip live-reassembles three panel-face cards below with the real title/role/focus for that course (`lineup()` + `FIELD_EXPERT`/`COURSE_FOCUS`) — e.g. picking "Nursing & Health" swaps in "Dr. Santos · Clinical." This is the signature interaction and sits in the first viewport, not buried below a fold.
2. **How a session works.** Five steps (Upload → Document Logic Analysis summary → Set up the panel → Live session → Readiness report), each revealed on scroll with a small recreated-UI mockup (fictional data) rather than a plain numbered list — motion earns the explanation instead of decorating it.
3. **Features, with one more live proof.** Short cards for Document Logic Analysis, Adaptive Domain Profiling (links back to the hero demo), Live Verbal Consistency Checker, Bounded Follow-Up, Readiness Analytics. The consistency checker gets a tiny real interaction: a text input where typing a contradicting fact against a fixed fictional manuscript line triggers the app's actual amber flag treatment — cheap to build, genuinely demonstrates the feature rather than describing it.
4. **What DEEMO is / isn't.** Quiet, honest, text-led: practice only, no official academic weight, Android + English only, requires internet, not fact-checking or plagiarism detection — straight from the plan's Out of Scope list (§5) and the deck's "It is / It isn't" slide. This is the uninventable-claims guardrail made visible, and it reads as credibility, not a disclaimer dump.
5. **Free vs Premium.** One compact comparison (five sessions a day vs unlimited, one panelist vs three, 10 vs 25 minutes, etc. — current numbers from `identity/domain/plan.ts`), described as what the app offers, not a SaaS pricing page (no real payments exist — never imply a checkout).
6. **FAQ.** Accordion: "Does this replace my real panel?", "Is my data private?" (ties to privacy: no audio stored, Gemini paid tier, RA 10173), "Which courses does it support?" (the general-course story), "Is it free?"
7. **Footer / download.** Deemo mascot sign-off, the APK CTA (or its honest "coming soon" state), a link back to the presentation deck and the GitHub repo.

## Deployment

**Vercel**, consistent with `admin`'s hosting (same account, same DX, trivial custom-domain assignment) — this is a static Vite build, so Vercel's static/edge hosting is a direct fit; no server runtime needed. `client/web/presentation`'s GitHub Pages route is a valid alternative if the user would rather avoid another Vercel project, but Vercel keeps deploy, preview-per-PR and domain management consistent with the rest of `client/web/`. Domain: the user's call (e.g. the root `deemo-ai.com`, leaving `admin.`/`api.` as the subdomains already in use) — not decided here, flagged as a step in Verification.

Add a `.claude/launch.json` entry (`"site"`, `bun run --cwd=client/web/site dev`, Vite's default port) for local preview, matching the existing `admin`/`presentation` entries.

## Not doing

- **No CMS, no blog, no multi-locale** — out of scope per the app itself (English only).
- **No real payment/checkout UI** — Premium is simulated in the app; the site must not imply real billing.
- **No account system, no email capture backend** — the chosen CTA is a direct download link, not a signup; add a mailing-list step later only if asked.
- **No 3D phone mockup (`phone.js`) in this pass** — not required by the chosen signature interaction; worth a later pass if the hero wants more spectacle.
- **No changes to the app, server or admin** — this is additive only.

## Verification

1. **Build and typecheck:** `cd client/web/site && bunx tsc --noEmit && bun run build`.
2. **Local preview:** `preview_start` with the new `.claude/launch.json` `"site"` config; confirm the hero demo actually re-renders panel cards per course (not just a static screenshot), the consistency-checker input triggers the amber flag, and the FAQ accordion opens/closes.
3. **Screenshots:** one batched round, desktop (1440) and mobile (390) via the Browser pane, per the `impeccable` finish flow; a second round only if the first shows material gaps.
4. **Reduced motion:** toggle `prefers-reduced-motion` and confirm the mascot and reveals hold still instead of breaking (mirrors the app's own rule).
5. **Design detector:** `impeccable detect --json` over the new files (this harness has no live design hook on web) before calling it finished.
6. **Docs:** add `client/web/site` to root `AGENTS.md`'s Layout list and `docs/HANDOFF.md` (what it is, how to preview, that the download CTA needs a real APK URL set before it's truly done). A surface brief and `DESIGN.md` entry get written at finish, per the impeccable flow, from the built result — not authored up front.
7. **Open item for the user:** publish a signed release APK (EAS) and set `DOWNLOAD_URL`; pick the final domain.
