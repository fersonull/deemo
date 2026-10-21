# DEEMO — Task list

What's built and what's left, traced to `DEEMO_Mobile_App_Plan.md` (F = feature, S = screen, § = section) and `DEEMO_Plan_Addendum.md` (Q = decision). Updated 2026-10-17. Checked items marked pending are implemented/tested on a feature branch and still need user verification and merging into `dev`.

## Blocker

- [x] **Sign-out cleanup (2026-10-21):** the welcome slides show once per phone, consent and the practice setup no longer carry over to the next account, unused template images were removed, and `app.json` is light-only with deduplicated permissions (the `app.json` part needs a rebuild).
- [ ] **Gemini paid tier.** The API key is on the free tier (`generate_content_free_tier_requests`, 20 requests/day per model). It runs out during normal testing, and free-tier inputs may be reviewed by humans, which the plan forbids for unpublished manuscripts and student transcripts (addendum Q9, CLAUDE.md scope guards). Enable billing on the key's Google Cloud project and set billing alerts. *Owner: you.* (Backup Flash models now keep analysis and scoring running when one model's quota runs out, but that doesn't fix the privacy issue.)

## Must do before the 40-student evaluation

- [x] **Deploy the server** (done 2026-10-21): hosted on Render's free tier from `render.yaml` / `server/Dockerfile`. Move to an always-on plan before the 40-student evaluation (free instances sleep after 15 min idle).
- [x] **Session time limit** (§9.4, F13): app clamps the active timer to the selected duration, preserves the final answer and asks for a closing line; stops within 8 seconds even if Gemini stays silent. Paused/reconnecting time is excluded. On `dev`.
- [x] **Daily session cap** (addendum Q1, §16 cost control): 5 starts/day Free, unlimited Premium (counted, not capped) at `POST /live/token`, enforced in serializable Postgres transactions (`live_starts`); Manila midnight reset, idempotent retries/resumption, failed-mint refunds and an actionable cap error. The admin can reset a student's count. On `dev`.
- [ ] **Recover a session** after the app is backgrounded or the connection drops, and keep the transcript so far (§16 reliability, connectivity).
- [ ] **Latency logging** (addendum B6): log "student stops speaking → first panel audio" per turn, for Chapter 4 (ISO 25010 performance efficiency).
- [ ] **Accuracy and integration tests** (§18.1):
  - [ ] Consistency-checker precision/recall with scripted correct and contradicting answers (supports SO5).
  - [ ] Extraction accuracy on 5–10 real manuscripts.
  - [ ] Upload → analysis → session → report integration test.
  - [ ] Device testing on a low-end and a mid-range Android phone in a noisy room.

## Planned features not built yet

- [x] **Notice deletion and popup removal (2026-10-21, `codex/notice-management`):** removed the floating Deemo chat-head popup; kept inbox/counts/push. Admin supports single deletion, selected rows and select-this-page bulk deletion with confirmation and retry handling. Admin-only bounded UUID endpoint deletes notices/receipts/recipients transactionally and retains per-notice audit entries. Cross-server sync and loaded inbox refresh handle removals. 74 server / 108 mobile tests, all relevant types/lints and admin webpack build pass. No migration/native rebuild; live database/admin/phone acceptance pending (`docs/ADMIN_NOTICES.md`).

- [x] **Flat press highlight removed and sign-out confirmation (2026-10-21, `codex/button-depth`):** removed the temporary bold highlight; flat text stays unchanged while pressed, with no scaling/dimming. Layered feedback remains. Profile Sign out opens a confirmation sheet with cancel, busy protection and retry feedback. 106 mobile tests, TypeScript and lint pass; JS only, phone verification pending.

- [x] **Admin notices — implemented on `codex/admin-notices`, not merged:** broadcast or one student, composer preview/search, sent/read history and audit entry; persistent mobile inbox and banners; foreground SSE, held during practice. Unit/type/lint checks and admin webpack build pass. New additive migration not applied; acceptance checks below remain open. Setup: `docs/ADMIN_NOTICES.md`. **User explicitly requested no merge to dev yet.**
- [ ] **Admin notices acceptance:** apply migration in a test environment; verify actual admin/student auth and private audience isolation, broadcast, read persistence, session deferral, reconnect/account switch, pagination and proxy/two-instance delivery on the phone (`docs/ADMIN_NOTICES.md`).
- [x] **Panel-defense presentation deck** (not in the plan doc; requested directly): static HTML/CSS/JS slide deck at `client/web/presentation/` for presenting DEEMO to the capstone panel, themed with the app's design tokens, deployed to GitHub Pages via `.github/workflows/deploy-presentation.yml`. Chapter II/III competitor and market slides are placeholders pending the group's actual paper text.
- [x] **Deck redesign: "the deck is a defense"**: each slide is a panel question with the answer underneath, a session HUD (elapsed time + Title/Pre-Oral/Final track), 14 slides in varied layouts.
- [x] **Deck rebuild with three.js + GSAP**: 1920×1080 stage, one 3D phone that flies between slides and changes screens (canvas-drawn app screens), vendored libraries for offline presenting.
- [x] **Deck: compact slides + Chapter II data**: no timer/mode HUD or panelist labels, slide-3-style compact content, target market/technologies/comparison from the paper.
- [x] **Deck: group-voice headings + Deemo narrator** (the owl, one mood and line per slide).
- [x] **Deck: portrait layouts for phones** (720-wide stage, one-column slides).
- [x] **Deck: practice-only disclaimer (slide 10)**: app icon centered above the DEEMO title, clear professional-replacement disclaimer and a session-screen 3D device below; thank-you moves to slide 11.
- [x] **Deck: technology icons and interactive System Functions**: six icons on Target Technologies; each system function selects its matching screen on the 3D phone, starting with Consent. Click/keyboard/wheel, active description, portrait layout; new Consent/Profile renderers mirrored in the marketing site.
- [x] **Deck: paper-based content and six-section flow**: System Overview → General Objective → Target Market → main Target Technologies (including preserved walkthrough/audio slides) → RRL summary → System Functions. 11 slides including title/disclaimer/thank-you, based on the supplied PPT Google Doc (2026-10-18).
- [x] **Deck: Target Technologies section**: preserve the original slides 10 (session walkthrough) and 11 (audio architecture), grouped after the technology overview as slides 6–7; both preserved in the revised 11-slide deck.
- [x] **Deck: mouse wheel moves through the session walkthrough steps (now slide 6).**
- [x] **Deck: right click = next, left click = previous.**
- [x] **Deck: bigger session walkthrough phone (now slide 6; the walkthrough is the highlight).**
- [x] **Deck: thank-you close, no status slide, sharper phone screen, phone-view fixes (slides 2, 10, 11).**
- [x] **Group projects** (addendum Q10): leader uploads once and gets a 6-character join code; members share the analysis and rubric; sessions stay private; optional "Share with group" feeds the Home **Group readiness** card; optional per-member focus area. A joined project counts as the free tier's one manuscript.
- [x] **PDF export** (F16, addendum Q2), Premium: results blocks 1–7 printed on the phone (`expo-print`) and sent through the share sheet. Results actions follow the prototype (Practice again, Share with group, Export PDF).
- [ ] **Read-only share link** (addendum Q2, optional; not in the prototype): one report, expires after 7 days. Skipped for now; the PDF covers sending results to the adviser.
- [x] **Practice weak topics** (prototype results screen, primary action): the same setup again, aimed at the report's weak criteria, contradictions and fixes. The app sends only the session id (`weakFrom`); the server builds the focus from the stored report.
- [x] **Rubric upload** (F3, S-08): a panel's own rubric (PDF/DOCX/photo) becomes the whole rubric, replacing the five defaults: its own criteria, weights from its points, level anchors from its descriptors. Criteria needing the paper or a live demo are listed but not scored. Saved on the project (shared with the group); "Back to the default rubric" undoes it.
- [x] **Download my data** (§17 user rights): Profile row, `GET /me/export` as one JSON file through the share sheet.
- [x] **Follow-up limit and difficulty in setup** (F5a, S-09): None–3 follow-ups per topic, Easy/Standard/Hard.
- [x] **Agenda sessions** (F5a, F13, branch `feat/agenda-sessions`): no question limit and no length picker. The panel covers a manuscript-based agenda for the stage and may only end when every topic is asked and answered. Difficulty changes depth, not count. Safety cap: Free 30 min, Premium 60. Coverage = agenda topics answered; the report shows "Not reached".
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
- [x] **Web admin** (hosted on Vercel, 2026-10-21) (`client/web/admin/`, merged into `dev` 2026-10-16): overview, users (+ actions, daily reset), sessions (+ Score again), manuscripts, groups, admins, audit log, Ctrl K palette, shortcuts, theme menu, icon sidebar, server pages. User to apply the migration, set up the Firebase Web app, grant the first admin, test, deploy to Vercel.
- [x] **Panel faces + sequential panel with a voice each**: tested by the user, merged into `dev` (2026-10-16).
- [x] **General-purpose scope + course profile** (onboarding survey, Profile course row, IT field only for BSIT/BSCS), **course-adapted panel** (field expert, best-fit seating, Setup preview) and **manuscript-field detection** (FIELD card on the summary). Merged into `dev` 2026-10-17; **phone test pending**.
- [x] **Profile hierarchy + Premium benefits screen**, **Premium avatar medal**, **History sort/filter**, **Home stage icons**, **Home launch spotlight**. On `dev`; **phone check pending**.
- [ ] **Public marketing site** (`client/web/site/`, on `dev`): scroll-following 3D phone, six chapters with live panel and consistency demos, smart navbar. User to build a release APK and set `DOWNLOAD_URL`, pick a domain, deploy to Vercel, add an og-image.
- [x] **Paper figures inserted:** the expanded DFD, PostgreSQL ERD and both flowcharts are in the paper (re-checked Oct 17). Further course/admin/stage updates remain below; the old five-table-ERD finding is obsolete.
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

- [x] **Continuous landscape ERD (2026-10-21):** `docs/diagrams/organized-erd/` preserves all 22 tables/fields and 24 direct relationships in one wide, left-to-right diagram, with no reference chips, duplicated tables or split sheets. Enlarged text: 30 px table names, 26 px relations, 24 px fields, 21 px types and 20 px notes. Geometry checks confirm no crossings/shared segments/table intrusion/detached endpoints; 20 related tables are connected and the two non-FK support tables remain unrelated. All 425 labels pass browser layout checks. SVG, fresh 2× PNG, preview, sources and check records included; original figures and online paper unchanged. Final document/print sizing remains unverified.

- [x] **Apply paper fixes to the requested backup (2026-10-18):** updated https://docs.google.com/document/d/10uUR649kQmj7GXBZc89C3IjWj5ypvtMFwyqOD5X7Woo/edit with the verified Chapter 1–3 replacements, 22 native dictionary tables, four missing fields, revised DFD/ERD/flowcharts and reconciled bibliography. Corrected the Baek research claim and removed a floating diagram/list-numbering layout defect. Diagram sources/canonical PNGs refreshed locally; no app changes, migrations, billing/device verification or branch merge. The original-paper checklist below remains scoped to its own document.

- [x] **Google Doc correction guide:** created https://docs.google.com/document/d/15EqKU-73gaJv5UJPhVK7Dlzwul_0xc7-4uITHIow4Yg/edit with all 49 fixes, exact locations, replacement text and 9 native tables; verified text/table readback (2026-10-18). Original paper/app unchanged.
- [x] **Detailed correction guide:** created `docs/APP_PAPER_FIX_GUIDE.md` with 49 numbered fixes, exact chapter/heading/search locations, paste-ready text, complete missing dictionaries and app/diagram/presentation work locations (2026-10-18). This records the required corrections; it does not apply them.
- [x] **Fresh paper/app comparison and local checklist:** rechecked live Chapters 1–3 on Oct 18 against `preview` (`d5d08c7`) and the revised deck on `dev` (`5319a74`). Updated `docs/PAPER_TODO.md` for agenda sessions/caps, scoring, 22 tables (5 missing dictionaries and 4 fields), notices/push, retained audit data, contradiction challenges and presentation drift. Paper/app/online audit unchanged; the listed corrections remain open.
- [ ] **Apply the remaining paper corrections:** use `docs/PAPER_TODO.md` as the current checklist and `docs/APP_PAPER_FIX_GUIDE.md` for exact locations and replacements (agenda flow/caps, daily limits, profiling remnants, 5 missing tables/4 fields, notices, deletion/export claims, scoring, challenge exception, ISO edition, delimitations, stage filtering, billing, comparison table and references). Re-read before ticking; the group is editing the live paper.
- [ ] **General-purpose scope + course profile (F4):** Ch. 1 cross-course scope and profiling definition are fixed; finish the scope paragraph, Ch. 3 profiling/onboarding/Profile descriptions, dictionary (`users.course`, `analyses.field`) and diagrams. Exact remaining wording: `docs/PAPER_TODO.md` §§1, 4, 13. Ch. 5 is not present in the reviewed document; future text is in `docs/COURSE_PROFILE_PLAN.md` §7.
- [ ] **Refresh diagram sources and embedded figures:** add course/field/agenda and all 22 schema tables, remove Coach/Panel and chosen duration from the flowchart, and represent course onboarding, sequential handover, agenda completion, safety caps, notices and stage filtering. Regenerate first; re-inserting the current PNG alone is insufficient (`docs/PAPER_TODO.md` §13).
- [ ] **Chapter 3, readiness formula.** The app now uses: level points = (level − 1) / 4; coverage = answered ÷ planned with no floor, counting only real answers (the panel closing early doesn't count against the student); unmeasurable delivery drops out of the weights; sessions with no answer aren't scored. The addendum's worked example becomes 54 (was 62).
- [x] **Chapter 3, feature list:** Group Projects and optional score sharing are already described (verified Oct 17).
- [x] **Chapter 3, rubric description:** default five criteria, replacement by an uploaded rubric and exclusion of written-paper/demo criteria are described (verified Oct 17). The numerical formula remains open above.
- [ ] **Delimitations:** simulated payments are already described; add explicit Android/English/18+ limits and no adviser dashboard, and clarify advisers as report recipients (`docs/PAPER_TODO.md` §8).
- [ ] **Privacy notice / Chapter 3:** Google (Gemini) is the only AI processor, for the live panel, analysis, rubric reading and scoring (the OpenAI backup was removed, consent 2026-10.3).
- [ ] **Breach-response procedure:** notify affected users and the NPC within 72 hours (§17, Q9).

## Housekeeping

- [x] **No shared press animation on flat controls (2026-10-21, `codex/button-depth`):** removed scale-down/release and reduced-motion dimming from non-layered controls such as Profile Course. Original caller transforms/opacity and custom callbacks remain; layered 3D buttons keep their press animation. 106 tests, TypeScript, lint and diff checks pass; code-only verification, JS only.

- [x] **Sign out and History depth opt-ins (2026-10-21, `codex/button-depth`):** enabled the layered style for Sign out, History stage chips, sort/filter trigger and sheet options, History session cards and the chart report arrow. Other flat exclusions remain unchanged. Styling only; phone check pending.

- [x] **Main-action-only depth refinement (2026-10-21, `codex/button-depth`):** made shared touchables flat by default. Excluded the auth mode prompt, Defense Path, recent sessions, Group readiness Settings, bottom tabs/Practice, Home Deemo brief and Profile options/edits. Main Button/Start practice and explicit action CTAs opt into depth. Flat scale/reduced-motion feedback and keyboard focus are preserved; regression coverage added. Phone check remains pending; JS only.

- [x] **Shared depth and label rendering follow-up (2026-10-21, `codex/button-depth`):** after the user confirmed blank enabled labels on Consent/Sign-in, removed the nested face wrapper, kept native content directly on `PressableScale` and keyed label color/action changes. Extended the treatment to visible pressable cards, rows, selectors, icons, links and tabs; preserved back arrows, invisible hit zones and shaped controls. 106 tests, types/lint and design scan pass. User explicitly chose code checks only; phone acceptance remains open.

- [x] **Layered button label layout follow-up (2026-10-20):** after the user reported a blank Consent Continue button, replaced absolute face layout with a flex face and margins. Added disabled → enabled layout/label coverage. Native transition verification remains pending on `codex/button-depth`.

- [x] **Button concept revision (2026-10-20):** `docs/design/button-depth-concept-v2.png` uses a flat face over one smooth offset lower layer, per the user's correction. All six states shown; subsequently approved for implementation with unchanged back arrows and text-only loading.

- [x] **Button depth concept image (2026-10-20):** generated `docs/design/button-depth-concept.png` covering default, hover, focus, pressed, loading and disabled for Primary/Secondary/Premium. Image only; user approval required before implementation. Premium remains simulated despite the board's monetization annotation.
- [x] **Button depth implementation (`codex/button-depth`, 2026-10-20):** shared lower-layer surface for primary/secondary/Premium, Start practice and Results actions. Preserved back arrows, taps/disabled semantics, focus/hover and reduced motion; busy actions use ellipsis labels without spinners. Async callers distinguish busy from unavailable. 106 tests, mobile types/lint and detector checks pass; emulator primary/secondary/disabled rendering verified. No native rebuild.
- [ ] **Phone acceptance for layered buttons:** check tap/hold/cancel, reduced motion, larger text, slow saves/uploads, Premium/report actions and unchanged navigation/live-mic feedback before merging the feature branch.

- [x] **Root project README (2026-10-20):** added `README.md` and a branded owl SVG header at `docs/assets/readme-banner.svg`; documented features, plan limits, architecture, setup, development checks, contributing and license. Existing artwork reused; no app changes or publication.

- [x] **GitHub release-notes draft (2026-10-20):** created `docs/RELEASE_NOTES.md`, then shortened it at the user's request to a summary of main features through `34ced95`, Premium demo, companion tools and essential limitations. Draft only; no APK build or GitHub publication.

- [x] **History filter loading feedback (2026-10-19, uncommitted on `preview`):** reuse skeletons while stage/sort/date results catch up; stage summary/chart and counts use placeholders, stale empty messages wait, and filters remain usable. JS only; phone-check rapid changes, initial load and empty stages.

- [x] **Setup focus-area keyboard avoidance (2026-10-19):** reused the Sign-in keyboard-avoidance wrapper around the scrolling Setup form. JS only; included in the user-requested `preview` merge. Phone verification remains pending.

- [x] **Instant settings and filter feedback (2026-10-19, merged into `preview` at the user's request):** optimistic Profile course/typing and group score-sharing updates, rollback/errors, pending-save guards and stale-read/reset protection; no blocking project GET after sharing saves. History controls stay urgent while chart/list filtering catches up. Seven regression tests and isolated hook checks added/run; mobile types/lint pass. JS only.
- [ ] **Verify instant interactions and keyboard avoidance on a phone (`preview`):** focus-area visibility and Save reachability with keyboard open/dismissed/reopened; slow/failing saves and retry for course/typing/sharing (Analysis + Results), stale refresh and sign-out while saving, first-course onboarding gate, and History stage/sort/date controls with a long list. No connected device was available during implementation.

- [x] **Resolve preview → dev merge conflict (2026-10-19):** combined all three HANDOFF conflicts, preserving the 11-slide presentation and paper/agenda-session history; corrected current branch/next steps and staged the resolution. Merge commit remains pending.

- [x] Register agent-device MCP in Codex using the existing global installation; verify initialization and tool discovery (59 tools).
- [x] Stray branches cleaned up (user).

## Done

| Plan item | What's built |
|---|---|
| F4 Adaptive Domain Profiling | Course from the onboarding survey (editable in Profile) plus the IT field for BSIT/BSCS projects; steers panel questions and scoring feedback (`fieldFocus`); any course's manuscript accepted (merged into `dev` 2026-10-17) |
| S-01 Splash, S-02 Onboarding, S-03 Consent (F19) | Consent with age confirmation, recorded on the account with its version |
| S-04 Sign in (F17) | Firebase Auth: email/password, account creation, password reset, Google sign-in (Credential Manager); stays signed in |
| S-05 Home | Greeting, last readiness score, Start practice, recent sessions |
| S-06 Upload, S-07 Analysis summary (F1, F2) | PDF/DOCX up to 20 MB, file type checked by content, non-manuscripts rejected; editable summary and key facts; raw file never stored |
| S-08 Rubric (F3, default only) | Five default criteria, adjustable weights |
| S-09 Setup (F4, F5, F5a) | Domain, stage, panelists, follow-ups, difficulty, Coach/Panel feedback, manuscript, scoring (no length: agenda sessions) |
| S-10 Live session (F6–F13, F13a) | Gemini Live voice panel through an ephemeral token; adaptive questions from the manuscript; follow-up limit enforced in code; question-type chips; live transcript; contradiction flags; answer timing; pause/resume; reconnect; up to 3 personas, one voice; typed-answer fallback; noise gate and platform noise suppression |
| S-11 Paused | Pause overlay, timers frozen |
| Model fallback | Analysis and scoring try gemini-3.8 Flash → 3.6 Flash → 3.5 Flash-Lite → 3.1 Flash-Lite; each report and analysis records which model answered |
| S-12 Report (F14) | Readiness score with its formula, top fixes, verified contradictions, rubric breakdown, response times, per-question feedback and stronger answers, transcript; Premium gating |
| S-13 History (F15) | Readiness trend chart, stage filters |
| S-14 Subscription (F18) | Simulated Premium (demo upgrade); free-tier limits enforced on the server |
| S-15 Settings / Privacy | Profile: plan, typed-answer setting, Delete my data (account and all data), sign out |
| §13 Data model, §17 access | Firestore per user (`users/{uid}`), server-only access, ID tokens checked on every request (revocation included) |
