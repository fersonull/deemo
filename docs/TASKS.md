# DEEMO — Task list

What's built and what's left, traced to `DEEMO_Mobile_App_Plan.md` (F = feature, S = screen, § = section) and `DEEMO_Plan_Addendum.md` (Q = decision). Updated 2026-10-10. Checked items marked pending are implemented/tested on a feature branch and still need user verification and merging into `dev`.

## Blocker

- [ ] **Gemini paid tier.** The API key is on the free tier (`generate_content_free_tier_requests`, 20 requests/day per model). It runs out during normal testing, and free-tier inputs may be reviewed by humans, which the plan forbids for unpublished manuscripts and student transcripts (addendum Q9, CLAUDE.md scope guards). Enable billing on the key's Google Cloud project and set billing alerts. *Owner: you.* (Backup Flash models now keep analysis and scoring running when one model's quota runs out, but that doesn't fix the privacy issue.)

## Must do before the 40-student evaluation

- [ ] **Deploy the server** to a public host and point the app at it (`EXPO_PUBLIC_API_URL`). Build a release APK with EAS Build. Add the release and Play signing SHA-1/SHA-256 to Firebase, then re-download `google-services.json` (Google sign-in). Today the app only reaches `localhost` through `adb reverse`.
- [x] **Session time limit** (§9.4, F13): app clamps the active timer to the selected duration, preserves the final answer and asks for a closing line; stops within 8 seconds even if Gemini stays silent. Paused/reconnecting time is excluded. **Pending:** uncommitted on `codex/session-rules`; phone verification and user commit/merge.
- [x] **Daily session cap** (addendum Q1, §16 cost control): 2 starts/day Free, 10 Premium at `POST /live/token`, enforced with Firestore transactions; Manila midnight reset, idempotent retries/resumption, failed-mint refunds and an actionable cap error. Unit and real Firebase/fake-Gemini integration checks pass. **Pending:** uncommitted on `codex/session-rules`; phone verification and user commit/merge.
- [ ] **Recover a session** after the app is backgrounded or the connection drops, and keep the transcript so far (§16 reliability, connectivity).
- [ ] **Latency logging** (addendum B6): log "student stops speaking → first panel audio" per turn, for Chapter 4 (ISO 25010 performance efficiency).
- [ ] **Accuracy and integration tests** (§18.1):
  - [ ] Consistency-checker precision/recall with scripted correct and contradicting answers (supports SO5).
  - [ ] Extraction accuracy on 5–10 real manuscripts.
  - [ ] Upload → analysis → session → report integration test.
  - [ ] Device testing on a low-end and a mid-range Android phone in a noisy room.

## Planned features not built yet

- [x] **Panel-defense presentation deck** (not in the plan doc; requested directly): static HTML/CSS/JS slide deck at `client/web/presentation/` for presenting DEEMO to the capstone panel, themed with the app's design tokens, deployed to GitHub Pages via `.github/workflows/deploy-presentation.yml`. Chapter II/III competitor and market slides are placeholders pending the group's actual paper text.
- [x] **Deck redesign: "the deck is a defense"**: each slide is a panel question with the answer underneath, a session HUD (elapsed time + Title/Pre-Oral/Final track), 14 slides in varied layouts.
- [x] **Deck rebuild with three.js + GSAP**: 1920×1080 stage, one 3D phone that flies between slides and changes screens (canvas-drawn app screens), vendored libraries for offline presenting.
- [x] **Deck: compact slides + Chapter II data**: no timer/mode HUD or panelist labels, slide-3-style compact content, target market/technologies/comparison from the paper.
- [x] **Deck: group-voice headings + Deemo narrator** (the owl, one mood and line per slide).
- [x] **Deck: portrait layouts for phones** (720-wide stage, one-column slides).
- [x] **Deck: mouse wheel moves through the slide 10 steps.**
- [x] **Deck: right click = next, left click = previous.**
- [x] **Deck: bigger slide 10 phone (the step walkthrough is the highlight).**
- [x] **Deck: thank-you close, no status slide, sharper phone screen, phone-view fixes (slides 2, 10, 11).**
- [x] **Group projects** (addendum Q10): leader uploads once and gets a 6-character join code; members share the analysis and rubric; sessions stay private; optional "Share with group" feeds the Home **Group readiness** card; optional per-member focus area. A joined project counts as the free tier's one manuscript.
- [x] **PDF export** (F16, addendum Q2), Premium: results blocks 1–7 printed on the phone (`expo-print`) and sent through the share sheet. Results actions follow the prototype (Practice again, Share with group, Export PDF).
- [ ] **Read-only share link** (addendum Q2, optional; not in the prototype): one report, expires after 7 days. Skipped for now; the PDF covers sending results to the adviser.
- [x] **Practice weak topics** (prototype results screen, primary action): the same setup again, aimed at the report's weak criteria, contradictions and fixes. The app sends only the session id (`weakFrom`); the server builds the focus from the stored report.
- [x] **Rubric upload** (F3, S-08): a panel's own rubric (PDF/DOCX/photo) becomes the whole rubric, replacing the five defaults: its own criteria, weights from its points, level anchors from its descriptors. Criteria needing the paper or a live demo are listed but not scored. Saved on the project (shared with the group); "Back to the default rubric" undoes it.
- [x] **Download my data** (§17 user rights): Profile row, `GET /me/export` as one JSON file through the share sheet.
- [x] **Follow-up limit and difficulty in setup** (F5a, S-09): None–3 follow-ups per topic, Easy/Standard/Hard.
- [x] **Deemo as an owl** (replaces the pebble): every mood, Premium suit and medal, new app icon (needs a native rebuild).
- [x] **Deemo, the guide** (design D1–D5, glasses instead of the sprout; SVG + Reanimated, needs a native rebuild): component, moods and motion; Welcome, Home and History empty states, Projects notes, reading waits.
  - [x] Remaining placements: mic check tip (without earphones), Results note by band, Sleepy on the Home and History offline notes.
- [x] **Email verification after email/password sign-up**: "Check your inbox" screen (auto-check, resend with cooldown, use a different email); the server only serves verified emails.
- [x] **GitHub issues #9, #8, #7**: full-width Domain row in Setup, Upload / Join above the Projects list, project name follows a re-picked file. Committed on `dev`.
- [x] **GitHub issues #3 + #2**: OpenAI backup removed; Gemini chain 3.8 Flash → 3.6 Flash → 3.5 Flash-Lite → 3.1 Flash-Lite. Merged into `dev`; checked in real use.
- [x] **GitHub issues #5, #4**: kept as is (user decision 2026-10-14): the summary stays editable, and members may practice with their own manuscripts.
- [x] **Names for email/password accounts**: name on Create account, editable in Profile, current names on Group readiness. Merged into `dev`, phone-checked.
- [x] **DiceBear avatars** (notionists in brand colors, initials fallback), **saved per account with a picker in Profile**, and a **compact Group readiness** card with member faces. Merged into `dev`, phone-checked.
- [x] **Server on Prisma + PostgreSQL** (Firebase sign-in only), domain modules, zod validation, rate limits, auth gates, two-way user sync, re-consent for accounts without consent. Tested by the user and merged into `dev` (2026-10-15).
- [x] **Audit doc back to PostgreSQL:** data dictionary (Tables 2-18) in the Tables tab and in the paper; Audit tab trimmed to open items; paper text fixes applied (2026-10-15).
- [ ] **Web admin** (`client/web/admin/`, merged into `dev` 2026-10-16): overview, users (+ actions, daily reset), sessions (+ Score again), manuscripts, groups, admins, audit log, Ctrl K palette, shortcuts, theme menu, icon sidebar, server pages. User to apply the migration, set up the Firebase Web app, grant the first admin, test, deploy to Vercel.
- [x] **Panel faces + sequential panel with a voice each**: tested by the user, merged into `dev` (2026-10-16).
- [ ] **Paper figures** (user action): replace Figure 2, Figure 3 and both System Flowchart images with the PNGs in `docs/diagrams/`.
- [ ] **Dark mode** (§16 usability; the design's "dark for sessions") and **panel voice speed** (S-15, Profile).
- [x] **Loading states**: a Fetching illustration when opening an existing report or manuscript summary, and skeletons for Home (last score, recent), History, Projects and Setup's manuscript row.
- [x] **Pull to refresh** on Home, History and Projects.
- [x] **EAS builds pick up a changed server URL** (Metro cache keyed on `EXPO_PUBLIC_*`; EAS build fails without `EXPO_PUBLIC_API_URL`).
- [x] **Preview OTA updates use the preview API environment:** confirmed the served runtime-1.0.0 bundle had localhost; update commands now include `--environment preview --platform android`, preview build environment is explicit, and Metro rejects missing/HTTP release URLs. Three regression tests pass (58 total); TypeScript and lint pass. **Pending:** uncommitted on `preview`; publish a replacement update and verify offline → online recovery on the phone without clearing data.
- [x] **Offline screen** (Home, Projects, History): full-screen sleepy Deemo with Try again, auto-retry on reconnect and the failure reason; API calls retry with a forced sign-in token refresh.
- [x] **History empty states**: Start practice when there's nothing yet, a practice button for an empty stage filter, a retry hint when offline.
- [x] **Home empty state**: "No score yet" card and a three-step "Get started" list for new students.
- [x] **History chart details and empty state**: labelled defense-ready line, tap a point for its score/stage/date, best score; an empty state below two scored sessions.
- [x] **Remaining animations** (from the animation review):
  - [x] Manuscript summary cards enter with a short stagger (40 ms, first 6 cards).
  - [x] Paused overlay fades in and out (200 / 150 ms).
  - [x] Reconnecting banner fades in and the content below glides instead of jumping.
  - [x] Report's "Question by question" rows and transcript expand smoothly; chevron rotates.
  - [x] Button press feedback (scale 0.97); needs a feel check on a phone.

## Documentation (manuscript, not code)

- [ ] **General-purpose scope + course profile (F4)** (after `feat/course-profile` merges): Ch. 1 scope and delimitation (any course accepted; evaluation limited to 4th-year BSIT at PMFTCI), F4 wording (course in onboarding/Profile, IT field for computing courses), Ch. 3 data dictionary and ERD (`users.course`), "features or output" in Document Logic Analysis, Ch. 5 recommendation. Exact text: `docs/COURSE_PROFILE_PLAN.md` §7.
- [ ] **Chapter 3, readiness formula.** The app now uses: level points = (level − 1) / 4; coverage = answered ÷ planned with no floor, counting only real answers (the panel closing early doesn't count against the student); unmeasurable delivery drops out of the weights; sessions with no answer aren't scored. The addendum's worked example becomes 54 (was 62).
- [ ] **Chapter 3, feature list:** add Group Project Sharing (Q10).
- [ ] **Chapter 3, rubric:** the five criteria are the default; a panel's uploaded rubric replaces them (its criteria and weights; written-paper and demo criteria aren't scored in practice). The readiness formula is unchanged: weighted levels × coverage − consistency penalty.
- [ ] **Delimitations:** simulated payments, no adviser dashboard (Q1, Q2).
- [ ] **Privacy notice / Chapter 3:** Google (Gemini) is the only AI processor, for the live panel, analysis, rubric reading and scoring (the OpenAI backup was removed, consent 2026-10.3).
- [ ] **Breach-response procedure:** notify affected users and the NPC within 72 hours (§17, Q9).

## Housekeeping

- [x] Register agent-device MCP in Codex using the existing global installation; verify initialization and tool discovery (59 tools).
- [x] Stray branches cleaned up (user).

## Done

| Plan item | What's built |
|---|---|
| F4 Adaptive Domain Profiling | Course from the onboarding survey (editable in Profile) plus the IT field for BSIT/BSCS projects; steers panel questions and scoring feedback (`fieldFocus`); any course's manuscript accepted (`feat/course-profile`) |
| S-01 Splash, S-02 Onboarding, S-03 Consent (F19) | Consent with age confirmation, recorded on the account with its version |
| S-04 Sign in (F17) | Firebase Auth: email/password, account creation, password reset, Google sign-in (Credential Manager); stays signed in |
| S-05 Home | Greeting, last readiness score, Start practice, recent sessions |
| S-06 Upload, S-07 Analysis summary (F1, F2) | PDF/DOCX up to 20 MB, file type checked by content, non-manuscripts rejected; editable summary and key facts; raw file never stored |
| S-08 Rubric (F3, default only) | Five default criteria, adjustable weights |
| S-09 Setup (F4, F5, F5a) | Domain, stage, panelists, length, Coach/Panel feedback, manuscript, scoring |
| S-10 Live session (F6–F13, F13a) | Gemini Live voice panel through an ephemeral token; adaptive questions from the manuscript; follow-up limit enforced in code; question-type chips; live transcript; contradiction flags; answer timing; pause/resume; reconnect; up to 3 personas, one voice; typed-answer fallback; noise gate and platform noise suppression |
| S-11 Paused | Pause overlay, timers frozen |
| Model fallback | Analysis and scoring try gemini-3.8 Flash → 3.6 Flash → 3.5 Flash-Lite → 3.1 Flash-Lite; each report and analysis records which model answered |
| S-12 Report (F14) | Readiness score with its formula, top fixes, verified contradictions, rubric breakdown, response times, per-question feedback and stronger answers, transcript; Premium gating |
| S-13 History (F15) | Readiness trend chart, stage filters |
| S-14 Subscription (F18) | Simulated Premium (demo upgrade); free-tier limits enforced on the server |
| S-15 Settings / Privacy | Profile: plan, typed-answer setting, Delete my data (account and all data), sign out |
| §13 Data model, §17 access | Firestore per user (`users/{uid}`), server-only access, ID tokens checked on every request (revocation included) |
