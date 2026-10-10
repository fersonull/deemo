# DEEMO

Voice-based AI mock panel for BSIT capstone defense practice (Title / Pre-Oral / Final). The AI panel reads the student's manuscript, asks questions out loud, flags contradictions, and scores against a rubric.

Specs: `docs/DEEMO_Mobile_App_Plan.md`. Start here: `docs/HANDOFF.md` (current state, recent changes, next task). Backlog: `docs/TASKS.md`. `docs/DEEMO_Plan_Addendum.md` **overrides §10–14** (AI pipeline, architecture, stack, API) and answers the open questions — read it first for anything live-session related.

## Layout

- `client/mobile/Deemo/` — Expo app (Expo Router, TypeScript). Expo-specific rules: `client/mobile/Deemo/AGENTS.md`.
- `server/` — Bun + Express (TypeScript, run directly by Bun).
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
bunx tsc --noEmit
```

Server env: copy `server/.env.example` to `server/.env` (Bun loads it automatically).

Live sessions need the server: `bun run dev` in `server/`, then `adb reverse tcp:3000 tcp:3000` (the app defaults to `http://localhost:3000`; set `EXPO_PUBLIC_API_URL` to use Wi-Fi instead). `EXPO_PUBLIC_LIVE_ENGINE=mock` swaps in the scripted panel for UI work without the server.

Firebase: the app signs in with React Native Firebase Auth (email/password, Google via `react-native-nitro-google-signin`) and sends its ID token as `Authorization: Bearer` (`src/utils/api.ts`). The server verifies it (`server/src/firebase.ts`) and is the only one touching Firestore: `users/{uid}` (consent, simulated premium) with `projects` and `sessions` subcollections (`server/src/store.ts`). Free-tier limits are enforced on the server. Config files stay out of git: `client/mobile/Deemo/google-services.json` and the service-account key at `FIREBASE_SERVICE_ACCOUNT` in `server/.env`.

Analysis: `server/src/analysis.ts` (`FLASH_MODELS`: a fallback chain, best first; the next model takes over on a rate limit, quota cap, hang or outage, and a struggling model sits out 5 minutes; OpenAI (`OPENAI_API_KEY`, `OPENAI_MODELS`) is the last resort, only for students whose consent is `BACKUP_CONSENT` or later; PDF sent as-is, DOCX via `mammoth`); the confirmed analysis replaces the sample paper in the panel prompt when a session sends `projectId`. Scoring: `server/src/sessions.ts` (Flash for levels and feedback) and `server/src/scoring.ts` (the readiness math, tested).

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
- `src/live/`: the live-session engine. The pure `reducer.ts` consumes events shaped like Gemini Live messages and tool calls (`types.ts`). `GeminiEngine` talks to Gemini Live over the token-locked WebSocket (manual turns: the student taps done), and `MockEngine` plays a scripted defense through the same `LiveEngine` interface. The panel prompt, tools and model constant live in `server/src/panel.ts`. Tests: `bun test src`.
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
