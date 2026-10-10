# DEEMO — Handoff

Read this first when picking up the project. It says where things stand right now, what changed recently and what to do next. **Update it with every change** (CLAUDE.md workflow rule). The full backlog is `docs/TASKS.md`; conventions and architecture are in `CLAUDE.md`.

_Last updated: 2026-10-10_

## Current state

- **Branch:** `dev` is the integration branch and has everything below; no feature branch is open. (If `feat/pdf-export` still exists, its merge was waiting on the user's GPG passphrase: merge it into `dev`, delete the branch.)
- **App:** Expo SDK 57 dev build on the user's Android phone (`ai.deemo.app`), Metro on the PC. The last native rebuild includes Firebase, Google sign-in, the document picker and the VoiceCommunication mic patch. The latest rebuild adds print and sharing (`expo-print`, `expo-sharing`).
- **Server:** `server/`, `bun run dev` on :3000. The phone reaches it through the user's Cloudflare tunnel (`https://api.deemo-ai.com/api` → localhost:3000), set in `client/mobile/Deemo/.env.local` (`EXPO_PUBLIC_API_URL`, gitignored). Without that file the app falls back to `http://localhost:3000` over `adb reverse tcp:3000 tcp:3000`. The server strips the tunnel's `/api` prefix.
- **Data:** Firebase project with Auth (email/password, Google) and Firestore (`users/{uid}` plus `projects` and `sessions` subcollections, and top-level `groups/{code}`). Only the server reads and writes Firestore.
- **AI:** Gemini Live (`gemini-3.8-live`) for the panel. Flash models with a fallback chain for analysis and scoring (`FLASH_MODELS` in `server/src/analysis.ts`).
- **Codex tooling:** agent-device MCP is registered in the user's Codex config (59 tools). `AGENTS.md` (a copy of CLAUDE.md for Codex) and `.codex/config.toml` are committed; keep AGENTS.md in step when CLAUDE.md changes.

## Next task

**Practice weak topics** (prototype results screen; `docs/TASKS.md` → Planned features). In the prototype it's the results screen's primary button, above "Practice again". It starts a session aimed at that report's weak criteria and fixes.
- The app sends only the session id (e.g. `weakFrom: <sessionId>` in the setup). The server reads the stored report and builds the focus text (lowest-level criteria plus the top fixes), then injects it into the panel prompt the same way as the group focus area (`server/src/panel.ts`, a JSON string, treated as a topic preference only). Never take prompt text from the app.
- Mint the token with the same project, mode and weights as the original session. Free-tier limits still apply.
- Results UI: the primary "Practice weak topics" button, then "Practice again" and "Share with group" side by side (sand, 50 high), then the outlined "Export PDF" (prototype layout). Hide the button for unscored sessions.
- No native rebuild. Small enough for `dev`, or `feat/weak-topics` if it touches the token route a lot.

After that: remaining animations → panel voice speed and dark mode. The read-only share link (addendum Q2, optional) is skipped unless the user asks.

## Recent changes (newest first)

| When | What | Where |
|---|---|---|
| 2026-10-10 | **Pull to refresh** on Home, History and Projects (`usePullRefresh`, Screen's `onRefresh`): Android's spinner in dusk while the lists reload. Not yet checked on the phone. | `dev` |
| 2026-10-10 | **Loading states**: `Fetching` (a page floating out of the blob, fades in after 300 ms so quick loads skip it) when opening a report from Recent/History or a manuscript summary; `Skeleton` + `Skeleton.Bone` (the real layout's shapes, breathing together, still with reduce motion) on Home's last score and recent sessions, History, Projects and Setup's manuscript row. Home no longer flashes "Add your manuscript" before the lists arrive. Not yet checked on the phone. | `dev` |
| 2026-10-10 | **PDF export and Download my data**: results actions match the prototype (Practice again, Share with group sheet, Export PDF). Export PDF (Premium) prints results blocks 1–7 on the phone from `src/utils/report-html.ts` (tested, all text escaped) and shares the file; Free sees a lock and the upsell. Profile "Download my data" shares `GET /me/export` as JSON (own sessions only; covered by the group integration test). Colors moved to `src/colors.ts` (re-exported by theme) so the PDF builder stays plain TS. Needs a native rebuild (`expo-print`, `expo-sharing`). | `feat/pdf-export` → `dev`; device-tested by the user |
| 2026-10-10 | **Group projects** (addendum Q10; started by Codex, finished and device-tested by Claude): leader taps "Create a group code" on the analysis screen for a 6-character code; members use Projects → "Join with a code" and see the shared project as `group-{code}` (analysis and rubric read-only; only the leader edits). Sessions stay private; "Share with group" puts the member's latest scored session on Home's **Group readiness** card. Optional per-member focus area steers the panel prompt. Free tier: a joined project counts as the one manuscript (checked in a transaction). Join attempts are rate-limited; deleting the account or the project removes memberships. Opt-in integration test: `DEEMO_GROUP_INTEGRATION=1 bun test tests` in `server/`. | `codex/group-projects` → `dev` |
| 2026-10-10 | **Codex device tooling:** registered agent-device MCP; initialization and 59-tool discovery verified. Existing installation reused; no app changes. | User Codex config; docs uncommitted |
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
- **Changing `.env.local`** needs a Metro restart with a clear cache (`bun start -c`); `EXPO_PUBLIC_*` values are baked in when the bundle is built.
- **adb over Wi-Fi:** when the phone reconnects (new port), `adb reverse` is lost and the app silently can't reach the server ("Getting the panel ready…"). Rerun `adb reverse tcp:3000 tcp:3000`.
- **Line endings:** many files are CRLF on disk. Scripted string replacements must normalize `\r\n` first, or use the Edit tool.
- **Testing on the device:** use throwaway Firebase accounts (`*@deemo.test`) and delete them afterwards (`recursiveDelete` on `users/{uid}`, then `deleteUser`). Don't change the user's own account settings; one stray tap once switched off "Allow typed answers".
- **Group integration test** (`server/tests/groups.integration.test.ts`) talks to the real Firebase project; it only runs with `DEEMO_GROUP_INTEGRATION=1` and cleans up its own `*@deemo.test` accounts.
- **Previewing the PDF without the phone:** render `reportHtml()` to an HTML file and print it with headless Chrome (`chrome --headless=new --no-pdf-header-footer --print-to-pdf=out.pdf file:///…`). Android's WebView prints the same way.
- **Waits:** new work the server is doing (reading a manuscript, scoring) uses `Working` (steps and a progress bar); opening something that already exists uses `Fetching`; a list loading for the first time uses `Skeleton` with bones shaped like its rows.
- **Rules:** never commit on `main`; never run native rebuilds (tell the user); risky work goes on its own branch and is merged into `dev` after testing (CLAUDE.md).
