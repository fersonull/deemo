# DEEMO — Handoff

Read this first when picking up the project. It says where things stand right now, what changed recently and what to do next. **Update it with every change** (CLAUDE.md workflow rule). The full backlog is `docs/TASKS.md`; conventions and architecture are in `CLAUDE.md`.

_Last updated: 2026-10-10_

## Current state

- **Branch:** `dev` is the integration branch and has everything below; no feature branch is open. (If `feat/session-options` still exists with staged changes, its commit was waiting on the user's GPG passphrase: commit it, merge into `dev`, delete the branch.)
- **App:** Expo SDK 57 dev build on the user's Android phone (`ai.deemo.app`), Metro on the PC. The last native rebuild includes Firebase, Google sign-in, the document picker and the VoiceCommunication mic patch. Nothing since then needs a rebuild.
- **Server:** `server/`, `bun run dev` on :3000. The phone reaches it through `adb reverse tcp:3000 tcp:3000`.
- **Data:** Firebase project with Auth (email/password, Google) and Firestore (`users/{uid}` plus `projects` and `sessions` subcollections). Only the server reads and writes Firestore.
- **AI:** Gemini Live (`gemini-3.8-live`) for the panel. Flash models with a fallback chain for analysis and scoring (`FLASH_MODELS` in `server/src/analysis.ts`).

## Next task

**Group projects** (addendum Q10; `docs/TASKS.md` → Planned features). The leader uploads the manuscript once and gets a 6-character join code; members join with the code and share the project's analysis (and rubric weights). Each member's sessions stay private; an optional "Share with group" toggle shows their latest score on a **Group readiness** card on Home (design: `docs/design` prototype, Home and Projects "Join with a code"). Optional per-member focus area that the panel prompt weights questions toward.
- Data model: a top-level `groups/{code}` doc (projectId, ownerUid, members) or members referencing the owner's project; the server must check membership before serving a shared project or minting a token for it. Free tier: a joined project counts as the one manuscript (decide and note it).
- Server routes: create code, join by code, leave, list members' shared scores. App: Projects "Join with a code" sheet, shared-project row (ring, per the design), Home card, setup focus area.
- Branch: `feat/group-projects`. No native rebuild expected.

After that, from `docs/TASKS.md`: PDF export + share link + Download my data (**one native rebuild** for printing and sharing modules) → remaining animations → panel voice speed and dark mode.

## Recent changes (newest first)

| When | What | Where |
|---|---|---|
| 2026-10-10 | **Rubric upload**: "Use your panel's rubric" on the rubric screen (PDF, DOCX, JPG, PNG). `POST /rubric/map` checks it's a defense rubric, Flash maps each criterion onto the five (written-paper criteria are left out), `toFiveSteps` rounds weights to the editor's 5% steps; nothing is stored, the student reviews and taps Use. The document picker is now imported statically (lazy import broke under Metro). | `feat/rubric-upload` → `dev` |
| 2026-10-10 | **Follow-ups per topic** (None–3, default 2) and **Difficulty** (Easy/Standard/Hard) in setup. The limit lives in live state (`followUpLimit`); difficulty only changes the panel prompt, saved on the session and shown in the report header. | `feat/session-options` → `dev` |
| 2026-10-10 | **Backup Flash models**: 3.8 → 3.7 → 3.6 → 3.5. Rate limit, quota cap, overload or retired model moves to the next one; a bad key stops at once. Reports and analyses record the model. | `d9246e5` |
| 2026-10-10 | **Task list** traced to the plan. | `docs/TASKS.md`, `f7738e1` |
| 2026-10-10 | **Stricter scoring**: level points (level − 1) / 4, no coverage floor, only real answers count, unmeasured delivery drops out, no-answer sessions are "Not scored", strict judge prompt. Gemini 429 shows a "busy" message. | `47ef6b7` |
| 2026-10-10 | **Results wait and reveal**: shared `Working` component (scoring, results, manuscript reading); report enters in two beats; `easeOut` token; `riseIn` helper. | `b5f731f` |
| 2026-10-10 | **Home dashboard** (last score, recent sessions) and **History trend chart** with stage filters. | `f4c90b0` |
| 2026-10-10 | **Profile**: plan card, typed-answer setting, Delete my data (`DELETE /me` removes Firestore data and the Auth account); token revocation checked on every request. | `b03c519` |
| 2026-10-10 | **Firebase**: sign-in (email, Google), per-user Firestore, free-tier limits enforced on the server. | `f36e7ad` |

Older history: `git log dev`.

## Gotchas

- **Gemini free tier:** the key is on the free tier: 20 Flash requests/day per model, and inputs may be human-reviewed. The fallback chain stretches the cap but doesn't fix privacy. **Paid tier is the open blocker** (user action).
- **GPG signing:** commits are signed and the passphrase prompt opens on the user's desktop. When it times out, leave the changes staged on the feature branch and give the user the commit command. Never use `--no-gpg-sign`.
- **adb over Wi-Fi:** when the phone reconnects (new port), `adb reverse` is lost and the app silently can't reach the server ("Getting the panel ready…"). Rerun `adb reverse tcp:3000 tcp:3000`.
- **Line endings:** many files are CRLF on disk. Scripted string replacements must normalize `\r\n` first, or use the Edit tool.
- **Testing on the device:** use throwaway Firebase accounts (`*@deemo.test`) and delete them afterwards (`recursiveDelete` on `users/{uid}`, then `deleteUser`). Don't change the user's own account settings; one stray tap once switched off "Allow typed answers".
- **Rules:** never commit on `main`; never run native rebuilds (tell the user); risky work goes on its own branch and is merged into `dev` after testing (CLAUDE.md).
