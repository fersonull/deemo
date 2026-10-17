# DEEMO

Voice-based AI mock panel for research defense practice (Title / Pre-Oral / Final), for any course; built and evaluated with 4th-year BSIT capstone students at PMFTCI (the study's population). The AI panel reads the student's manuscript, asks questions out loud, flags contradictions, and scores against a rubric.

Specs: `docs/DEEMO_Mobile_App_Plan.md`. Start here: `docs/HANDOFF.md` (current state, recent changes, next task). Backlog: `docs/TASKS.md`. `docs/DEEMO_Plan_Addendum.md` **overrides §10–14** (AI pipeline, architecture, stack, API) and answers the open questions — read it first for anything live-session related.

## Layout

- `client/mobile/Deemo/` — Expo app (Expo Router, TypeScript). Expo-specific rules: `client/mobile/Deemo/AGENTS.md`.
- `server/` — Bun + Express (TypeScript, run directly by Bun), Prisma 7 + PostgreSQL. Domain-driven: `src/modules/<identity|manuscripts|groups|practice|scoring|admin>/{domain,application,infrastructure,http}`, shared kernel in `src/shared/` (config, prisma, errors, zod `validate`, `rate-limit`, auth, `ai/gemini`), wiring in `src/app.ts`.
- `client/web/admin/` — web admin (Next.js 16 + Tailwind, shadcn preset `b1oVxsfY`, hosted on Vercel): read-only user lookup through the server's `/admin/*` routes (Firebase sign-in with the `admin` custom claim; `server/scripts/set-admin.ts <email>`). Next 16 differs from older versions: read `client/web/admin/AGENTS.md` first.
- `client/web/site/` — public marketing site (Vite + TypeScript, no framework; GSAP), hosted on Vercel: a single scrolling page explaining DEEMO, reusing the app's design system and the Deemo mascot/panel-face SVGs ported to plain web (see `client/web/presentation`, which did this first). Its "Build your panel" hero demo runs the real course→panel lineup logic, copied from `server/src/modules/practice/domain/panel.ts` and `identity/domain/course.ts` into `src/panel-data.ts` — keep them in step.
- `docs/` — product plan, addendum, design pointer.

## Commands

Package manager is **bun** everywhere. Use `bunx`, not `npx`.

```bash
# client/mobile/Deemo
bunx expo install <pkg>     # never `bun add` for app deps — resolves SDK-compatible versions
bunx expo run:android       # dev build (Expo Go can't do raw PCM audio streaming)
bun start                   # Metro, once a dev build is installed
bunx tsc --noEmit && bunx expo lint && bunx expo-doctor

# server
bun run dev                 # watch mode, :3000 (PORT env)
bun run db:migrate          # apply/create migrations (Prisma 7; pinned, v8 is a different toolchain)
bun run db:studio           # browse the database
bunx tsc --noEmit && bun test src
```

Server env: copy `server/.env.example` to `server/.env` (Bun loads it automatically).

Live sessions need the server: `bun run dev` in `server/`, then `adb reverse tcp:3000 tcp:3000` (the app defaults to `http://localhost:3000`; set `EXPO_PUBLIC_API_URL` to use Wi-Fi instead). `EXPO_PUBLIC_LIVE_ENGINE=mock` swaps in the scripted panel for UI work without the server.

Firebase (sign-in only): the app signs in with React Native Firebase Auth (email/password, Google via `react-native-nitro-google-signin`) and sends its ID token as `Authorization: Bearer` (`src/utils/api.ts`). Data: PostgreSQL through Prisma (`server/prisma/schema.prisma`, `DATABASE_URL`); only the server touches it. Every signed-in route runs the gates in `server/src/modules/identity/http/gates.ts` (`protect`: token, verified email, user sync, not being deleted; plus `requireConsent` on AI routes and `requirePremium`). The Firebase user and the `users` row stay in sync: Firebase → row on each request (email, verification, first name), row → Firebase when the name changes (`PATCH /me`) or the account is deleted. Plan limits live in `identity/domain/plan.ts`; the student's course (onboarding survey, `identity/domain/course.ts`) profiles the panel and scoring prompts on the server (`fieldFocus` in `practice/domain/panel.ts`); requests and AI replies are checked with zod; rate limits are counted in Postgres (`shared/rate-limit.ts`). Config files stay out of git: `client/mobile/Deemo/google-services.json`, the service-account key at `FIREBASE_SERVICE_ACCOUNT` and `DATABASE_URL` in `server/.env`.

Analysis: `server/src/modules/manuscripts/application/read-documents.ts` with `server/src/shared/ai/gemini.ts` (`FLASH_MODELS`: a fallback chain, best first; the next model takes over on a rate limit, quota cap, hang or outage, and a struggling model sits out 5 minutes; Flash first, then Flash-Lite; Gemini only; PDF sent as-is, DOCX via `mammoth`); the confirmed analysis replaces the sample paper in the panel prompt when a session sends `projectId`. Scoring: `server/src/modules/scoring/` (`application/sessions.ts` asks Flash for levels and feedback; `domain/scoring.ts` is the readiness math, tested).

## Workflow rules

- **Never commit on `main`.** Work happens on `dev`, so commit there. If the current branch is `main`, leave the changes uncommitted and tell the user; they commit on `main` themselves.
- **Never run native rebuilds** (`expo prebuild`, `expo run:android`, Gradle). When a change needs one, such as a new native module, a config plugin, or an `app.json` plugin or permission change, say so clearly and the user will rebuild. JS-only changes reload through Metro.
- **Update the handoff with every change.** After each piece of work, update `docs/HANDOFF.md`: current state (branch, anything uncommitted), a row in Recent changes (what, where, commit), the next task with enough detail for another agent to start, and new gotchas. Tick the item in `docs/TASKS.md`. Include both in the same commit as the work.
- **Risky work gets its own branch.** A task that might break the app (native modules or config plugins, auth or data-model changes, refactors that touch many files, dependency upgrades) starts on a new branch off `dev` (e.g. `feat/home-dashboard`). Commit there while working; merge into `dev` only after it has been tested and works, then delete the branch. Small, contained changes can go straight onto `dev`.

## App conventions (Expo plugin)

- `src/app/` is routes only. Everything else goes in sibling folders under `src/`.
- `src/components/` — reusable UI, kebab-case files, one named export each; a big component becomes a folder with `index.tsx`.
- `src/screens/<name>/` — screen bodies that route files render; private sub-components stay in that folder.
- `src/hooks/`, `src/utils/` (tests next to the file: `x.test.ts`), `src/theme.ts`, `src/constants.ts`.
- `src/live/`: the live-session engine. The pure `reducer.ts` consumes events shaped like Gemini Live messages and tool calls (`types.ts`). `GeminiEngine` talks to Gemini Live over the token-locked WebSocket (manual turns: the student taps done), and `MockEngine` plays a scripted defense through the same `LiveEngine` interface. The panel prompt, tools and model constant live in `server/src/modules/practice/domain/panel.ts`. Tests: `bun test src`.
- `StyleSheet.create` at the bottom of the component file. Import via `@/*` (→ `src/*`).
- Platform splits: `.android.tsx` / `.web.tsx` with a default file always present.
- Never hand-edit `android/` / `ios/`; configure via `app.json` and config plugins.
- Library fixes go through `bun patch <pkg>` (kept in `patches/`). `react-native-audio-api` is patched so the Android mic uses the VoiceCommunication preset (platform noise suppression and echo cancellation). Re-check the patch when upgrading the library; a patch change needs a native rebuild.
- Create folders when first needed, not ahead of time.

## Architecture rules (from the addendum)

- **No AI keys in the app.** The server mints a Gemini Live **ephemeral token** (locked to model, system prompt, tools) via `POST /live/token`.
- Live session audio goes **phone ⇄ Gemini Live directly** (WSS). The server is never in a conversation turn.
- The server only does auth (Firebase), quotas/tier gating, token minting, manuscript analysis (Flash, before), and scoring (Flash, after).
- Panel features run as Live tool calls handled **on device**: `ask_question`, `flag_inconsistency`, `end_session`. The follow-up limit (default 2) is enforced in the client tool handler, not just the prompt.
- Timers and response-duration tracking run on the client.
- Readiness score arithmetic is done in code (formula in addendum Q4); the LLM only supplies rubric levels plus a justification for each.
- Live model name lives in one config constant. Model names change often, so check them before coding.

## Scope guards

- Android only, English only, online only. No offline mode.
- Raw manuscript files are discarded after text extraction. Raw audio is never stored; keep transcripts only.
- Gemini **paid tier** only (the unpaid tier allows human review of inputs). Users must be 18+ (age confirmation on the consent screen).
- Freemium is simulated (promo code or toggle); there are no real payments.
- Do not build anything in plan §5 Out of Scope: plagiarism, grammar or citation checks, fact-checking, emotion recognition, multilingual support, an adviser dashboard.

## Design

- Source of truth: claude.ai/design project `2fedfea1-9f17-429d-a735-c7b644e092d9` (via the `claude_design` MCP). It also holds `DEEMO Branding.dc.html` and `uploads/DEEMO - UI UX Design Brief.md`, which covers screen specs, live-session states, and accessibility rules.
- Local copy: `docs/design/DEEMO Prototype.dc.html` + `support.js` (open the HTML in a browser). It is reference only; never ship it.
- Tokens: `client/mobile/Deemo/src/theme.ts` (colors live in `src/colors.ts`, re-exported by theme, so plain TS like the PDF report can import them). Use these values; don't hardcode colors. The palette is light only so far, with a warm paper background and a "dusk" indigo primary. Amber marks contradictions. Never use red during a session.
- Fonts: Bricolage Grotesque, DM Sans, DM Mono. Icons: Material Symbols Rounded (ligatures, regular + filled). They are embedded at build time through the `expo-font` plugin in `app.json` (Android font families), so use `fonts.*` from `theme.ts` together with `fontWeight`. Adding a weight means adding it to `app.json` and rebuilding.
