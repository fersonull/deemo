# DEEMO — Task list

What's built and what's left, traced to `DEEMO_Mobile_App_Plan.md` (F = feature, S = screen, § = section) and `DEEMO_Plan_Addendum.md` (Q = decision). Updated 2026-10-10. Tick items as they land on `dev`.

## Blocker

- [ ] **Gemini paid tier.** The API key is on the free tier (`generate_content_free_tier_requests`, 20 requests/day per model). It runs out during normal testing, and free-tier inputs may be reviewed by humans, which the plan forbids for unpublished manuscripts and student transcripts (addendum Q9, CLAUDE.md scope guards). Enable billing on the key's Google Cloud project and set billing alerts. *Owner: you.* (Backup Flash models now keep analysis and scoring running when one model's quota runs out, but that doesn't fix the privacy issue.)

## Must do before the 40-student evaluation

- [ ] **Deploy the server** to a public host and point the app at it (`EXPO_PUBLIC_API_URL`). Build a release APK with EAS Build. Add the release and Play signing SHA-1/SHA-256 to Firebase, then re-download `google-services.json` (Google sign-in). Today the app only reaches `localhost` through `adb reverse`.
- [ ] **Session time limit** (§9.4, F13). The panel doesn't know the clock, so a 10-minute session can run long. The app ends the session when time is up and asks the panel for a closing line.
- [ ] **Daily session cap** (addendum Q1, §16 cost control): 2 sessions/day free, 10 premium, enforced on the server at `POST /live/token`.
- [ ] **Recover a session** after the app is backgrounded or the connection drops, and keep the transcript so far (§16 reliability, connectivity).
- [ ] **Latency logging** (addendum B6): log "student stops speaking → first panel audio" per turn, for Chapter 4 (ISO 25010 performance efficiency).
- [ ] **Accuracy and integration tests** (§18.1):
  - [ ] Consistency-checker precision/recall with scripted correct and contradicting answers (supports SO5).
  - [ ] Extraction accuracy on 5–10 real manuscripts.
  - [ ] Upload → analysis → session → report integration test.
  - [ ] Device testing on a low-end and a mid-range Android phone in a noisy room.

## Planned features not built yet

- [x] **Group projects** (addendum Q10): leader uploads once and gets a 6-character join code; members share the analysis and rubric; sessions stay private; optional "Share with group" feeds the Home **Group readiness** card; optional per-member focus area. A joined project counts as the free tier's one manuscript.
- [x] **PDF export** (F16, addendum Q2), Premium: results blocks 1–7 printed on the phone (`expo-print`) and sent through the share sheet. Results actions follow the prototype (Practice again, Share with group, Export PDF).
- [ ] **Read-only share link** (addendum Q2, optional; not in the prototype): one report, expires after 7 days. Skipped for now; the PDF covers sending results to the adviser.
- [x] **Practice weak topics** (prototype results screen, primary action): the same setup again, aimed at the report's weak criteria, contradictions and fixes. The app sends only the session id (`weakFrom`); the server builds the focus from the stored report.
- [x] **Rubric upload** (F3, S-08): a panel's own rubric (PDF/DOCX/photo) becomes the whole rubric, replacing the five defaults: its own criteria, weights from its points, level anchors from its descriptors. Criteria needing the paper or a live demo are listed but not scored. Saved on the project (shared with the group); "Back to the default rubric" undoes it.
- [x] **Download my data** (§17 user rights): Profile row, `GET /me/export` as one JSON file through the share sheet.
- [x] **Follow-up limit and difficulty in setup** (F5a, S-09): None–3 follow-ups per topic, Easy/Standard/Hard.
- [ ] **Dark mode** (§16 usability; the design's "dark for sessions") and **panel voice speed** (S-15, Profile).
- [x] **Loading states**: a Fetching illustration when opening an existing report or manuscript summary, and skeletons for Home (last score, recent), History, Projects and Setup's manuscript row.
- [x] **Pull to refresh** on Home, History and Projects.
- [ ] **Remaining animations** (from the animation review):
  - [ ] Manuscript summary cards enter with a short stagger (40 ms, first 6 cards).
  - [ ] Paused overlay fades in and out (200 / 150 ms).
  - [ ] Reconnecting banner fades in and the content below glides instead of jumping.
  - [ ] Report's "Question by question" rows and transcript expand smoothly; chevron rotates.
  - [ ] Button press feedback (scale 0.97); needs a feel check on a phone.

## Documentation (manuscript, not code)

- [ ] **Chapter 3, readiness formula.** The app now uses: level points = (level − 1) / 4; coverage = answered ÷ planned with no floor, counting only real answers (the panel closing early doesn't count against the student); unmeasurable delivery drops out of the weights; sessions with no answer aren't scored. The addendum's worked example becomes 54 (was 62).
- [ ] **Chapter 3, feature list:** add Group Project Sharing (Q10).
- [ ] **Chapter 3, rubric:** the five criteria are the default; a panel's uploaded rubric replaces them (its criteria and weights; written-paper and demo criteria aren't scored in practice). The readiness formula is unchanged: weighted levels × coverage − consistency penalty.
- [ ] **Delimitations:** simulated payments, no adviser dashboard (Q1, Q2).
- [ ] **Privacy notice / Chapter 3:** name OpenAI as the backup processor for analysis, rubric reading and scoring (only for students who agreed to consent 2026-10.2), alongside Google. The live voice panel stays Gemini-only.
- [ ] **Breach-response procedure:** notify affected users and the NPC within 72 hours (§17, Q9).

## Housekeeping

- [x] Register agent-device MCP in Codex using the existing global installation; verify initialization and tool discovery (59 tools).
- [ ] Stray local branch `setup-firebase-auth` (not created during this work): delete if unused.

## Done

| Plan item | What's built |
|---|---|
| S-01 Splash, S-02 Onboarding, S-03 Consent (F19) | Consent with age confirmation, recorded on the account with its version |
| S-04 Sign in (F17) | Firebase Auth: email/password, account creation, password reset, Google sign-in (Credential Manager); stays signed in |
| S-05 Home | Greeting, last readiness score, Start practice, recent sessions |
| S-06 Upload, S-07 Analysis summary (F1, F2) | PDF/DOCX up to 20 MB, file type checked by content, non-manuscripts rejected; editable summary and key facts; raw file never stored |
| S-08 Rubric (F3, default only) | Five default criteria, adjustable weights |
| S-09 Setup (F4, F5, F5a) | Domain, stage, panelists, length, Coach/Panel feedback, manuscript, scoring |
| S-10 Live session (F6–F13, F13a) | Gemini Live voice panel through an ephemeral token; adaptive questions from the manuscript; follow-up limit enforced in code; question-type chips; live transcript; contradiction flags; answer timing; pause/resume; reconnect; up to 3 personas, one voice; typed-answer fallback; noise gate and platform noise suppression |
| S-11 Paused | Pause overlay, timers frozen |
| Model fallback | Analysis and scoring try gemini-3.8 → 3.7 → 3.6 → 3.5 Flash; each report and analysis records which model answered |
| S-12 Report (F14) | Readiness score with its formula, top fixes, verified contradictions, rubric breakdown, response times, per-question feedback and stronger answers, transcript; Premium gating |
| S-13 History (F15) | Readiness trend chart, stage filters |
| S-14 Subscription (F18) | Simulated Premium (demo upgrade); free-tier limits enforced on the server |
| S-15 Settings / Privacy | Profile: plan, typed-answer setting, Delete my data (account and all data), sign out |
| §13 Data model, §17 access | Firestore per user (`users/{uid}`), server-only access, ID tokens checked on every request (revocation included) |
