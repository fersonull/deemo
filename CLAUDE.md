# DEEMO

Voice-based AI mock panel for BSIT capstone defense practice (Title / Pre-Oral / Final). The AI panel reads the student's manuscript, asks questions out loud, flags contradictions, and scores against a rubric.

Specs: `docs/DEEMO_Mobile_App_Plan.md`. `docs/DEEMO_Plan_Addendum.md` **overrides §10–14** (AI pipeline, architecture, stack, API) and answers the open questions — read it first for anything live-session related.

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

## App conventions (Expo plugin)

- `src/app/` is routes only. Everything else goes in sibling folders under `src/`.
- `src/components/` — reusable UI, kebab-case files, one named export each; a big component becomes a folder with `index.tsx`.
- `src/screens/<name>/` — screen bodies that route files render; private sub-components stay in that folder.
- `src/hooks/`, `src/utils/` (tests next to the file: `x.test.ts`), `src/theme.ts`, `src/constants.ts`.
- `src/live/`: the live-session engine. The pure `reducer.ts` consumes events shaped like Gemini Live messages and tool calls (`types.ts`). `MockEngine` plays a scripted defense through the `LiveEngine` interface, and the real Gemini engine will implement the same interface. Tests: `bun test src`.
- `StyleSheet.create` at the bottom of the component file. Import via `@/*` (→ `src/*`).
- Platform splits: `.android.tsx` / `.web.tsx` with a default file always present.
- Never hand-edit `android/` / `ios/`; configure via `app.json` and config plugins.
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
- Tokens: `client/mobile/Deemo/src/theme.ts`. Use these values; don't hardcode colors. The palette is light only so far, with a warm paper background and a "dusk" indigo primary. Amber marks contradictions. Never use red during a session.
- Fonts: Bricolage Grotesque, DM Sans, DM Mono. Icons: Material Symbols Rounded (ligatures, regular + filled). They are embedded at build time through the `expo-font` plugin in `app.json` (Android font families), so use `fonts.*` from `theme.ts` together with `fontWeight`. Adding a weight means adding it to `app.json` and rebuilding.
