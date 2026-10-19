# DEEMO paper — remaining corrections

**Application status (2026-10-18):** the verified paper-text, dictionary, reference and diagram corrections were applied to the separately requested [backup paper](https://docs.google.com/document/d/10uUR649kQmj7GXBZc89C3IjWj5ypvtMFwyqOD5X7Woo/edit). This checklist still refers to the original paper below; its document was not changed. App/privacy-policy, billing/device checks and deck integration remain open. See HANDOFF.md for the application record.

For the separate, step-by-step correction guide with exact placement and complete replacement tables, see [APP_PAPER_FIX_GUIDE.md](C:/Deemo.ai/docs/APP_PAPER_FIX_GUIDE.md).

Rechecked on **October 18, 2026**, against all three live paper tabs and the current app/server source on `preview` at `d5d08c7` (includes agenda sessions and contradiction-challenge handling). The working tree was clean at the start of this review. The revised 11-slide presentation is committed on `dev` at `5319a74`; `preview` contains the older 13-slide deck.

- [Paper: 4B - KIMBERLY'S GROUP](https://docs.google.com/document/d/1wo1wCeRczqvbuCvJUu_7qI7KM1lQhJoNaYa5tWcyjqQ/edit)
- [Chapter 1](https://docs.google.com/document/d/1wo1wCeRczqvbuCvJUu_7qI7KM1lQhJoNaYa5tWcyjqQ/edit?tab=t.0)
- [Chapter 2](https://docs.google.com/document/d/1wo1wCeRczqvbuCvJUu_7qI7KM1lQhJoNaYa5tWcyjqQ/edit?tab=t.9sx4vpdoel6s)
- [Chapter 3](https://docs.google.com/document/d/1wo1wCeRczqvbuCvJUu_7qI7KM1lQhJoNaYa5tWcyjqQ/edit?tab=t.wv0yg3jyhmi5)

Open corrections are below. Replacement paragraphs can be pasted into the paper. This review changes local documentation only; it does not edit the Google Doc or app.

**Verified aligned; preserve these edits:** Firebase sign-in with email verification; PostgreSQL/Prisma data storage; email-account names and editable avatars; optional custom rubric with a built-in default; manuscript-field-first profiling in Chapter 1's definition, Chapter 3's objective and Document Logic Analysis; separate voices and sequential panelists; no on-screen contradiction highlights during practice; simulated Premium; the practice-only/adviser-authority delimitation. Chapter 1's five-per-day/unlimited daily limits and Table 2's `session_count` agree with code, but their duration descriptions elsewhere need the agenda update.

**Highest priority:** agenda-based session flow and safety caps; Chapter 3's daily limits; 5 missing database tables and 4 missing fields; retained audit records; admin notices; the exception for contradiction challenges. Billing, migrations, deployed behavior and phone delivery were not verified in this source review.

## 1. Finish the remaining course-profiling descriptions

- [ ] **Chapter 1 → Scope and Delimitation:** replace the clause beginning “an Adaptive Domain Profiling engine that tailors the AI panel's questions to the project domain the student selects” with:

  > an Adaptive Domain Profiling engine that uses the manuscript's detected academic field to select suitable panelists and tailor questioning. The student's course serves as a fallback when the manuscript field is unavailable. For BSIT and BSCS studies, an additional IT field further guides questioning.

- [ ] **Chapter 3 → Operational Definition → Adaptive Domain Profiling:** the definition still says the domain is selected “at upload and before each session.” Replace the definition with:

  > **Adaptive Domain Profiling.** Refers to tailoring the panel's composition, questioning focus, and scoring feedback to the manuscript's academic field. The system detects the field during manuscript analysis and allows the student to correct it before confirmation. When no manuscript field is available, the student's course, collected during onboarding and editable in Profile, serves as the fallback. For BSIT and BSCS studies, an additional IT field further guides the panel's questions.

- [ ] **Chapter 3 → System Function → Onboarding and Consent:** append:

  > After consent, the student selects their course in a one-time survey. The course can later be changed in Profile and is used to profile the panel when the manuscript has no identified academic field.

- [ ] **Chapter 3 → Home Dashboard, History and Profile:** add “course” to the Profile settings described in the final sentence.

Evidence: [course categories](../server/src/modules/identity/domain/course.ts), [panel profiling](../server/src/modules/practice/domain/panel.ts), [field-first selection](../server/src/modules/practice/application/live-token.ts), [onboarding gates](../client/mobile/Deemo/src/app/_layout.tsx).

## 2. Replace timed sessions with the current agenda flow and plan limits

- [ ] **Chapter 1 → Conceptual Framework; Chapter 3 → System Overview, Objective 12, Freemium Access Tier and Practice Setup:** remove the 10-/25-minute session descriptions and the student's session-length choice. Chapter 3's two Free/ten Premium sessions a day are also stale.

  Use this plan description:

  > Free users can keep one manuscript, including a joined group manuscript, and start up to five practice sessions per Philippine calendar day. Free practice supports Title and Pre-Oral Defense with one panelist. Premium provides unlimited manuscripts and session starts, Final Defense and up to three panelists. Premium is simulated without payment. Session length is not selected by the student: the panel works through a stage-specific agenda derived from the manuscript. A safety cap of 30 minutes for Free or 60 minutes for Premium bounds a runaway session; it is not the target practice duration.

- [ ] **Chapter 3 → Practice Setup / Live Panel Questioning:** add:

  > The student selects the defense stage, panelist count, ordinary follow-up allowance and difficulty. The server builds the questioning agenda from the selected stage and available manuscript content. Each panelist covers the topics assigned to their seat. The app permits the panel to hand over or close only after its required topics have been asked and answered. A student may end early; the safety time cap can also stop the session.

The timer still records elapsed duration. Do not describe it as a selected countdown. Earlier sessions remain compatible through the legacy scoring path.

Evidence: [plan limits](../server/src/modules/identity/domain/plan.ts), [agenda builder](../server/src/modules/practice/domain/agenda.ts), [Setup](../client/mobile/Deemo/src/screens/setup/index.tsx), [session enforcement](../client/mobile/Deemo/src/live/gemini-engine.ts).

## 3. Add the actual readiness calculation and no-answer behavior

- [ ] **Chapter 3 → Scoring and Defense Performance Analytics:** insert the following after the general explanation of scoring:

  > Gemini supplies rubric levels and supporting explanations, while the server performs the numerical readiness calculation. For the default rubric, Confidence and Delivery is calculated in code from response latency, filler frequency, and speaking pace. An uploaded rubric supplies its own scored criteria, which Gemini evaluates using the available answers and measurements. Criteria with no measured level are excluded, and the remaining weights are normalized.

  ```text
  Level Points_i = (Level_i − 1) / 4

  RS = 100 × Σ[(Weight_i / Σ measured weights) × Level Points_i]

  CF = clamp(Answered Agenda Topics / Agenda Topics, 0, 1)

  CP = min(15, 5 × HIGH + 2 × MEDIUM + 0.5 × LOW)

  Readiness Score = round(clamp(RS × CF − CP, 0, 100))
  ```

  > RS is the weighted rubric score, CF is coverage, and CP is the consistency penalty. Only verified contradictions contribute to CP. For agenda sessions, coverage is the number of distinct agenda topics with a substantive answer divided by the number of planned agenda topics. A main answer or follow-up qualifies when it contains at least three words with letters or digits. Coverage has no minimum floor. Topics that never received a main question are listed as Not reached; that is distinct from a topic asked but left unanswered. Sessions with no substantive answers are marked Not scored and excluded from readiness trends. Default delivery is excluded when there is no measurable spoken answer.

  The displayed rubric score is rounded for storage/reporting, but the final readiness calculation uses the unrounded value. The existing legacy coverage path is used for older sessions without an agenda.

  Use the unrounded RS in the final calculation; round the final readiness score. For the default weights and levels `[4, 3, 4, 3, 3]`, full coverage and one HIGH plus one MEDIUM contradiction give RS = 61.25, CP = 7, and readiness = **54**.

- [ ] **Chapter 1 → Scope and Delimitation:** replace “to ensure that every mock defense session receives a complete evaluation” with:

  > to ensure that each session has an applicable evaluation rubric; sessions without substantive answers are marked Not scored.

- [ ] **Chapter 3 → Scoring and Defense Performance Analytics:** replace “Gemini rates each rubric criterion” with “Gemini rates the applicable AI-judged rubric criteria.” This avoids implying that Gemini also calculates the default delivery level.

Evidence: [score arithmetic and delivery](../server/src/modules/scoring/domain/scoring.ts), [coverage, custom rubric and unscored reports](../server/src/modules/scoring/domain/session.ts).

## 4. Add the missing dictionary fields and fix descriptions

- [ ] **Table 2 — users:** add the `course` row.
- [ ] **Table 4 — analyses:** add the `field` row.
- [ ] **Table 7 — sessions:** add `agenda`; **Table 8 — session_turns:** add `topic`.

| Field Name | Description | Data Type | Length | Constraints | Possible Values |
|---|---|---|---|---|---|
| course | Student's course selected during onboarding and editable in Profile; add to users | VARCHAR | 40 | Nullable | Supported course category |
| field | Manuscript's academic field, detected during analysis and editable in the summary; add to analyses | VARCHAR | 40 | Nullable | Supported course category |
| agenda | Stage/manuscript topics planned for this session; add to sessions | JSONB | N/A | Nullable for older sessions | Array of objects containing id and label |
| topic | Agenda-topic identifier associated with this question; add to session_turns | VARCHAR | 60 | Nullable for older sessions | Agenda item ID |

Supported course categories: **BSIT, BSCS, Engineering, Maritime, Education, Nursing & Health, Business & Accountancy, Hospitality & Tourism, Criminology, Psychology & Social Sciences, Other**. These categories are validated by the application; the columns themselves are nullable VARCHAR fields.

- [ ] **Table 3 — projects.domain:** description → “IT field associated with the manuscript; General is used for non-computing studies.” Possible Values → “Web/Mobile App, Networking & Security, Data & AI, IoT/Hardware, Information Systems, General.”
- [ ] **Table 7 — sessions.domain:** replace “One of the five domains” with the same six values.
- [ ] **Table 4 — analyses.features:** description → “Main features or outputs described by the study.”
- [ ] **Table 4 — analyses.unsure:** add `field` to the possible field names.
- [ ] **Table 8 — session_turns.panelist:** clarify the values as “0 = Reyes (Chair), 1 = Santos (field expert), 2 = Cruz (Methodology).” These are persona identifiers, not speaking-order positions.
- [ ] **Table 7 — sessions.minutes:** description → “Safety time cap applied to the session.” Current values → “30 (Free), 60 (Premium); older records may retain their selected duration.”
- [ ] **Table 10 — reports.answered / planned:** describe answered agenda topics and planned agenda topics for current sessions; older records use legacy main-question coverage.
- [ ] **Table 17 — live_starts.expires_at:** clarify “Session safety cap plus 30 minutes,” rather than implying a duration the student chooses.

Keep the current Length convention: maximum characters for VARCHAR, Variable for unbounded text, and N/A for the other types. Do not convert it to storage bytes.

Evidence: [Prisma schema](../server/prisma/schema.prisma), [name synchronization](../server/src/modules/identity/domain/account.ts), [saved panelist identifiers](../client/mobile/Deemo/src/hooks/use-sessions.ts).

## 5. Add the five missing database tables

The current schema contains **22 tables**, while the paper documents **17** (Tables 2–18). Add these five dictionaries, including their actual keys, indexes, nullability and cascades:

| Suggested table number | Missing table | Fields |
|---|---|---|
| 19 | admin_actions | id, admin_id, admin_email, action, target_id, target_email, created_at |
| 20 | notices | id, title, body, target_id, segment, created_by, created_at |
| 21 | notice_reads | user_id, notice_id, read_at |
| 22 | notice_recipients | notice_id, user_id |
| 23 | push_tokens | token, user_id, updated_at |

Numbering starts at 2 because Chapter 2 contains Table 1, System Feature Analysis. Do not treat broadcast notices and retained audit history as wholly owned by a student.

- [ ] **After Table 18:** insert **Table 19. admin_actions**, using the existing specification below, then add the four notice-related tables from the schema.

  > **Table 19. admin_actions:** Records administrative actions for accountability. Administrator and target identifiers are stored without foreign keys so that audit records remain available after an account is deleted.

| Field Name | Description | Data Type | Length | Constraints | Possible Values |
|---|---|---|---|---|---|
| id | Unique audit record identifier | SERIAL (INTEGER) | N/A | PK, auto-increment | Positive integer |
| admin_id | Firebase UID of the administrator | VARCHAR | 128 | Not null; no FK | Firebase UID |
| admin_email | Administrator's email when the action occurred | VARCHAR | 320 | Nullable | Email address |
| action | Administrative action performed | VARCHAR | 40 | Not null | Action identifier |
| target_id | Identifier of the affected account | VARCHAR | 128 | Not null; no FK | Firebase UID |
| target_email | Target's email when the action occurred | VARCHAR | 320 | Nullable | Email address |
| created_at | When the action was recorded | TIMESTAMP(3) | N/A | Not null, default now; indexed | Date and time |

Action identifiers used by the application: `premium_on`, `premium_off`, `sign_in_disabled`, `sign_in_enabled`, `account_deleted`, `daily_reset`, `session_rescored`, `admin_granted`, `admin_revoked`, `notice_sent`. The database stores these in VARCHAR, not an ENUM.

Evidence: [AdminAction schema](../server/prisma/schema.prisma), [admin actions](../server/src/modules/admin/application/actions.ts).

## 6. Qualify data export and deletion; describe the admin interface

- [ ] Correct the absolute “all data” claims in **Chapter 1 Scope**, **Chapter 2 PostgreSQL and Prisma**, **Chapter 3 Objective 11**, **the ERD paragraph**, and **Data Download and Deletion**.

  Suggested Data Download and Deletion replacement:

  > **Data Download and Deletion.** From Profile, the student can download their account settings, accessible projects, practice sessions with their reports, and visible notices with read status as a JSON file. Account deletion removes the Firebase sign-in account and the student-owned application records, including manuscript analyses, rubrics, sessions, and reports. Administrative audit records are retained separately and may contain copied account identifiers and email addresses. These audit records and device push tokens are not included in the current Profile data export. Shared broadcast notices may also remain after a particular recipient deletes their account.

  Suggested Objective 11 replacement:

  > Let students export their account and practice data and delete their account and student-owned application records, with separately retained administrative audit records disclosed in the privacy notice.

  Suggested ERD paragraph replacement:

  > The ERD shows DEEMO's PostgreSQL database. Student-owned projects, analyses, rubrics, sessions, reports, and group memberships use cascading relationships for deletion. Administrative audit records have no foreign keys to student accounts and remain after account deletion.

- [ ] Add **Administrative Management** under Chapter 3 System Function:

  > **Administrative Management.** Authorized administrators use a separate web interface to manage accounts and simulated Premium access, reset daily practice counts, and retry failed or stalled scoring. Administrators can also send broadcast, individual or filtered-audience notices. Administrative actions are recorded in an audit log. The interface does not display students' transcripts, answers, or manuscript analysis content.

- [ ] Define and implement an audit-log retention/deletion policy, then document it in the privacy notice. The current code has no retention cutoff; do not invent a duration in the paper or promise immediate removal of these records.

Evidence: [Profile export and deletion routes](../server/src/modules/identity/http/routes.ts), [account deletion](../server/src/modules/identity/application/accounts.ts), [retained audit records](../server/src/modules/admin/application/actions.ts).

## 7. Correct ISO/IEC 25010 terminology

- [ ] **Chapter 2 → Target Technologies → ISO/IEC 25010:** replace the sentence claiming eight characteristics with:

  > ISO/IEC 25010:2023 defines a product quality model comprising nine characteristics: Functional Suitability, Performance Efficiency, Compatibility, Interaction Capability, Reliability, Security, Maintainability, Flexibility, and Safety. The researchers use this model to structure the evaluation of DEEMO and identify the characteristics and measures applicable to the study.

- [ ] **Chapter 1 → Definition of Terms → ISO/IEC 25010:** specify the 2023 edition and use Interaction Capability instead of treating Usability as the 2023 characteristic name. Align the questionnaire and any later evaluation chapters with the selected edition; explain any characteristics excluded from evaluation.

Source: [ISO/IEC 25010:2023 — official ISO overview](https://www.iso.org/standard/78176.html), which confirms nine characteristics.

## 8. Finish platform, age, language and adviser delimitations

- [ ] **Chapter 1 → Scope and Delimitation:** add:

  > The application is developed and evaluated on Android devices and supports English-language interaction. Participants must be at least 18 years old. A dedicated adviser monitoring dashboard is outside the scope of the study; advisers may instead review reports exported and shared by students.

The online-only limitation is already present. Simulated Premium without payment is already described in the paper; preserve it.

- [ ] **Chapter 1 → Conceptual Framework → Target Market Segment:** clarify the role of faculty/advisers, currently called secondary users:

  > Faculty members and research advisers are secondary beneficiaries who may review reports exported and shared by students; they do not receive a dedicated adviser account or monitoring dashboard.

Evidence: [project scope rules](../AGENTS.md), [age confirmation and onboarding](../client/mobile/Deemo/src/app/_layout.tsx).

## 9. Document the new stage-specific manuscript context

- [ ] **Chapter 3 → Mock Defense Stage Modes / Practice Setup:** add:

  > The panel and scoring process use manuscript context filtered for the selected defense stage. Title Defense uses the introductory material and feasibility, excluding detailed methodology and results. Pre-Oral Defense includes methodology and design but excludes results. Final Defense includes the available results and findings. Chapter-tagged facts beyond the selected stage are omitted; untagged facts are retained. If Final Defense is selected while the manuscript has no results, Setup displays a warning, and the panel is instructed not to ask about findings that are absent from the manuscript.

- [ ] **Chapter 1 → Definition of Terms → Pre-Oral Defense Mode:** replace the current reference to “preliminary findings” with:

  > **Pre-Oral Defense Mode.** Refers to a mock defense stage focused on the study's objectives, related work, methodology, design, sampling, and instruments, excluding results and final findings.

Do not claim perfect automatic chapter isolation: the implementation filters explicit methodology/results sections and chapter-tagged facts; untagged facts remain available.

Evidence: [stage context filtering](../server/src/modules/practice/domain/panel.ts), [scoring context](../server/src/modules/scoring/application/sessions.ts), [Setup warning](../client/mobile/Deemo/src/screens/setup/index.tsx). Added in commit `f0cfc4d` after the earlier checklist.

## 10. Verify the paid-tier statement

- [ ] **Chapter 2 → Google Gemini API:** confirm billing activation for the actual API project. The paper says the paid tier is already in use; the repository still lists activation as a blocker. Billing was not accessible during this review.

  Until activation is confirmed, use requirement wording:

  > DEEMO requires the paid tier of the Gemini API for processing student manuscripts and session content. Paid-tier activation must be verified before evaluation using real student data.

  After activation is confirmed, retain the present-tense description and update the repository blocker accordingly.

## 11. Repair two comparison-table claims

- [ ] **Chapter 2 → Table 1 → Defense Evaluation Rubric → DEEMO:** change **Optional** to **Yes — built-in; custom upload optional**. A rubric is always configured; only uploading a custom one is optional.
- [ ] **Chapter 2 → NotebookLM comparison and Table 1 Voice Interaction:** remove the categorical “without providing speech recognition” / “No” claim. Google's documentation describes voice questions to Audio Overview hosts in interactive mode. Describe that capability and its limits instead of claiming no voice interaction.

  Suggested replacement:

  > NotebookLM supports source-grounded document exploration and Audio Overviews, including interactive voice questions where available. DEEMO instead organizes interaction as a staged defense rehearsal with timed answers, panelist roles, rubric-based readiness scoring, and a saved performance report.

  Table 1's voice cell can read **Limited — interactive Audio Overviews** with a note defining availability and the date reviewed.

Source: [Google's Audio Overview documentation](https://support.google.com/gemininotebook/answer/16212820?hl=en), especially its interactive-mode instructions. Other competitor feature cells were not independently re-verified; date and source them before submission rather than treating this review as a complete competitor audit.

## 12. Complete references and minor text cleanup

- [ ] Add full bibliography entries for the sources cited in Chapter 2 but absent from the supplied reference list: technology documentation and the literature/studies cited there. Check actual author, title, year, publisher and URL/DOI against each source. The current reference list is in Chapter 1; Chapters 2 and 3 do not supply the missing entries.
- [ ] For documentation, cover Google AI for Developers, TypeScript, Expo, React Native, Firebase, PostgreSQL, Prisma, Bun, Express, GitHub and ISO as applicable. Verify the cited Jurafsky and Martin edition/version and Heller source. Do not assign 2025 automatically to undated or continuously updated documentation.
- [ ] Verify the Chapter 2 study references, including Giray, Vergara, Lan, Xu, Wang, Villarino, Goli-Cruz, Chun, Baek and Saeki. This review did not validate their publication details or reported research results.
- [ ] **Chapter 1 → Problem and Its Background:** add the missing period after the sentence ending “realistic defense rehearsal”.
- [ ] **Chapter 1 → Definition of Terms:** separate Bounded Adaptive Follow-Up Mechanism from the Artificial Intelligence paragraph so it has its own term entry.

## 13. Update the diagrams and close the stale audit finding

This pass checked the diagram-generator source, not the embedded figure pixels. Do not carry forward the earlier byte-identical-image claim as a new verification. Update the sources for the current 22-table schema, course/field profiling, notices and agenda sessions, then reinsert and visually check the exported figures in the paper.

- [ ] **Figure 3 / ERD source:** add `users.course`, `analyses.field`, `sessions.agenda`, `session_turns.topic`, and the five missing tables listed in section 5. Keep `admin_actions` separate from user deletion cascades; there are no foreign keys for its copied identifiers. Regenerate the PNG and replace the embedded ERD.
- [ ] **DFD:** update the profiling inputs to include course and detected manuscript field. If Figure 2 is intended to represent the entire system, add the admin actor/process and audit store; otherwise explicitly label it as the student application DFD and document the admin flow separately.
- [ ] **Flowchart A:** include the course survey and the detected-field review; remove domain selection from the upload step.
- [ ] **Flowchart B:** remove the Coach/Panel setup choice and account for sequential panelist handover. Update the stage-context and missing-results branches, agenda completion, early student exit and safety-cap paths. Remove the chosen-duration step.
- [ ] Regenerate source diagrams in `docs/diagrams/src/` before replacing images. The checked-in ERD generator also lacks the new database fields/table; re-inserting its existing PNG alone does not fix the issue.
- [ ] **Online audit document → Audit tab:** replace the obsolete “old five-table ERD” finding with these current remaining items. The online audit was read but not edited in this pass.

Sources: [diagram generators](diagrams/src/), [current schema](../server/prisma/schema.prisma), [existing audit document](https://docs.google.com/document/d/1S4Bs0Yh6OZN3985GOpH3FHEX3uhIGe8Bqm_eks3dhpg/edit).


## 14. Describe notices and the contradiction-challenge exception

- [ ] **Chapter 2 → Firebase / server technologies; Chapter 3 → System Functions:** add notice delivery and its privacy implications:

  > Authorized administrators can send notices to all students, one student or a filtered audience. Notices persist in an inbox with read status. Foreground updates use an authenticated server-sent-events connection; new notices can appear through Deemo while the student is outside practice. In-app delivery is held during microphone check, the live session and scoring. Notices already waiting when the app is opened remain in the inbox instead of producing another floating notice. Firebase Cloud Messaging supports Android notifications while the app is in the background or closed, subject to notification permission and successful token registration.

  This is implemented behavior, not a claim that push delivery has passed a phone test. Verify delivery before evaluation. SSE is for notices; live audio still travels directly between the phone and Gemini Live.

- [ ] **Chapter 1 and Chapter 3 → Bounded Adaptive Follow-Up; Chapter 3 → Live Verbal Consistency Checker:** qualify the limit:

  > The zero-to-three allowance applies to ordinary adaptive follow-ups per topic. A clarification that challenges a flagged contradiction stays on the current question and does not consume that allowance, so it can still occur when the allowance is zero or exhausted. The current question card shows the challenge text. The live transcript does not display contradiction highlights; verified contradictions appear in the post-session report.

Evidence: [notice delivery](../client/mobile/Deemo/src/components/notice-delivery.tsx), [phone notifications](../client/mobile/Deemo/src/hooks/use-push-notices.ts), [push dispatch](../server/src/modules/notices/infrastructure/push.ts), [challenge handling](../client/mobile/Deemo/src/live/gemini-engine.ts), [allowance enforcement](../client/mobile/Deemo/src/live/reducer.ts), [live transcript](../client/mobile/Deemo/src/screens/session/transcript.tsx).

## 15. Bring presentation mockups into line with the app version being demonstrated

- [ ] **Branch alignment:** the revised 11-slide deck is saved on `dev` (`5319a74`). The current `preview` checkout still contains the earlier 13-slide deck. Use the intended deck when presenting; do not infer it disappeared from the repository.
- [ ] **Setup mock screen:** remove the 10/15/20-minute length selector; represent the current setup choices and agenda-based session behavior. Update both `client/web/presentation/js/screens.js` and its marketing-site copy.
- [ ] **Live mock screen:** remove the amber contradiction banner, highlighted transcript and obsolete Coach-mode comment. Show an ordinary clarification question; keep verified contradiction markers in the results mockup.
- [ ] **Example values:** the deck's analysis/report screens use a fictional 30-respondent sample and a score of 70. Label it as illustrative or align the sample to the group's 40-participant study. These are mockups, not actual study results; the in-app built-in sample paper is a separate fictional project too.
- [ ] **RRL / conclusion claims:** present related studies as support for the design, not proof that DEEMO has already improved readiness. In Chapter 2, change “directly strengthens ... and ensures comprehensive readiness” to “aims to support communication, confidence and readiness through repeated practice”; retain measured-effect claims only when supported by the group's evaluation.

Evidence: `git show dev:client/web/presentation/index.html`, current [deck screen renderers](../client/web/presentation/js/screens.js), [current Setup](../client/mobile/Deemo/src/screens/setup/index.tsx), and the paper's Chapter 2 target-market claims.
