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

`docs/DEEMO_DESIGN_SYSTEM.md` points to a claude.ai/design prototype (`DEEMO Prototype.dc.html` + `support.js`). Importing it requires the `claude_design` MCP and `/design-login`.
