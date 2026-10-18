# DEEMO paper — remaining corrections

Reviewed on **October 17, 2026**, against the live Google Doc's three tabs and the code on `dev` at `f0cfc4d`.

- [Paper: 4B - KIMBERLY'S GROUP](https://docs.google.com/document/d/1wo1wCeRczqvbuCvJUu_7qI7KM1lQhJoNaYa5tWcyjqQ/edit)
- [Chapter 1](https://docs.google.com/document/d/1wo1wCeRczqvbuCvJUu_7qI7KM1lQhJoNaYa5tWcyjqQ/edit?tab=t.0)
- [Chapter 2](https://docs.google.com/document/d/1wo1wCeRczqvbuCvJUu_7qI7KM1lQhJoNaYa5tWcyjqQ/edit?tab=t.9sx4vpdoel6s)
- [Chapter 3](https://docs.google.com/document/d/1wo1wCeRczqvbuCvJUu_7qI7KM1lQhJoNaYa5tWcyjqQ/edit?tab=t.wv0yg3jyhmi5)

Only open work is listed. Quoted replacement paragraphs are ready to paste. Changes already made in the paper were excluded. This review did not edit the Google Doc.

## 1. Finish the remaining course-profiling descriptions

- [ ] **Chapter 1 → Scope and Delimitation:** replace the clause beginning “an Adaptive Domain Profiling engine that tailors the AI panel's questions to the project domain the student selects” with:

  > an Adaptive Domain Profiling engine that uses the manuscript's detected academic field to select suitable panelists and tailor questioning. The student's course serves as a fallback when the manuscript field is unavailable. For BSIT and BSCS studies, an additional IT field further guides questioning.

- [ ] **Chapter 3 → Operational Definition → Adaptive Domain Profiling:** the definition still says the domain is selected “at upload and before each session.” Replace the definition with:

  > **Adaptive Domain Profiling.** Refers to tailoring the panel's composition, questioning focus, and scoring feedback to the manuscript's academic field. The system detects the field during manuscript analysis and allows the student to correct it before confirmation. When no manuscript field is available, the student's course, collected during onboarding and editable in Profile, serves as the fallback. For BSIT and BSCS studies, an additional IT field further guides the panel's questions.

- [ ] **Chapter 3 → System Function → Onboarding and Consent:** append:

  > After consent, the student selects their course in a one-time survey. The course can later be changed in Profile and is used to profile the panel when the manuscript has no identified academic field.

- [ ] **Chapter 3 → Home Dashboard, History and Profile:** add “course” to the Profile settings described in the final sentence.

Evidence: [course categories](../server/src/modules/identity/domain/course.ts), [panel profiling](../server/src/modules/practice/domain/panel.ts), [field-first selection](../server/src/modules/practice/application/live-token.ts), [onboarding gates](../client/mobile/Deemo/src/app/_layout.tsx).

## 2. Correct the remaining daily-limit contradiction

- [ ] **Chapter 3 → System Overview:** it still says “two sessions a day” for Free and “ten sessions a day” for Premium. Replace those phrases with **“five sessions per Philippine calendar day”** and **“unlimited practice sessions”**, respectively.

Chapter 1's Conceptual Framework and Table 2's `session_count` values have already been corrected; preserve those edits.

Evidence: [plan limits](../server/src/modules/identity/domain/plan.ts).

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

  > RS is the weighted rubric score, CF is the coverage factor, and CP is the consistency penalty. Only verified contradictions contribute to the penalty. **Changed 2026-10-18 (agenda sessions, branch `feat/agenda-sessions`): there is no question count and no chosen session length.** The panel works through a fixed agenda built from the manuscript for the defense stage (e.g. Pre-Oral: problem and objectives, scope and limitations, system/study design, tools and implementation, research design, sampling, instruments, data analysis; a topic with nothing in the manuscript to stand on is left out). The app lets it end only when every agenda topic has been asked and answered, so the follow-up limit (0–3 per topic) is what bounds a session; a safety cap (Free 30 minutes, Premium 60) stops a runaway one. An agenda topic counts as answered when its main question or a related follow-up gets at least three words containing letters or digits. Coverage has no minimum floor; a gap only happens when the time cap or the student ends the session first, and the report lists those topics as "Not reached". Sessions without a substantive answer are marked Not scored and excluded from readiness trends. In the default rubric, delivery is excluded when no spoken answers can be measured. Update F5a ("question count / target duration") and the session-flow description in Chapter 3 to match.

  Use the unrounded RS in the final calculation; round the final readiness score. For the default weights and levels `[4, 3, 4, 3, 3]`, full coverage and one HIGH plus one MEDIUM contradiction give RS = 61.25, CP = 7, and readiness = **54**.

- [ ] **Chapter 1 → Scope and Delimitation:** replace “to ensure that every mock defense session receives a complete evaluation” with:

  > to ensure that each session has an applicable evaluation rubric; sessions without substantive answers are marked Not scored.

- [ ] **Chapter 3 → Scoring and Defense Performance Analytics:** replace “Gemini rates each rubric criterion” with “Gemini rates the applicable AI-judged rubric criteria.” This avoids implying that Gemini also calculates the default delivery level.

Evidence: [score arithmetic and delivery](../server/src/modules/scoring/domain/scoring.ts), [coverage, custom rubric and unscored reports](../server/src/modules/scoring/domain/session.ts).

## 4. Add the missing dictionary fields and fix descriptions

- [ ] **Table 2 — users:** add the `course` row.
- [ ] **Table 4 — analyses:** add the `field` row.

| Field Name | Description | Data Type | Length | Constraints | Possible Values |
|---|---|---|---|---|---|
| course | Student's course selected during onboarding and editable in Profile; add to users | VARCHAR | 40 | Nullable | Supported course category |
| field | Manuscript's academic field, detected during analysis and editable in the summary; add to analyses | VARCHAR | 40 | Nullable | Supported course category |

Supported course categories: **BSIT, BSCS, Engineering, Maritime, Education, Nursing & Health, Business & Accountancy, Hospitality & Tourism, Criminology, Psychology & Social Sciences, Other**. These categories are validated by the application; the columns themselves are nullable VARCHAR fields.

- [ ] **Table 2 introduction:** replace “Email, name and verification are copied from Firebase on each request” with:

  > Email, verification status, and sign-in provider are synchronized from Firebase. The name is initially copied from Firebase when absent; subsequent name changes made in DEEMO update both records.

- [ ] **Table 3 — projects.domain:** description → “IT field associated with the manuscript; General is used for non-computing studies.” Possible Values → “Web/Mobile App, Networking & Security, Data & AI, IoT/Hardware, Information Systems, General.”
- [ ] **Table 7 — sessions.domain:** replace “One of the five domains” with the same six values.
- [ ] **Table 4 — analyses.features:** description → “Main features or outputs described by the study.”
- [ ] **Table 4 — analyses.unsure:** add `field` to the possible field names.
- [ ] **Table 8 — session_turns.panelist:** clarify the values as “0 = Reyes (Chair), 1 = Santos (field expert), 2 = Cruz (Methodology).” These are persona identifiers, not speaking-order positions.

Keep the current Length convention: maximum characters for VARCHAR, Variable for unbounded text, and N/A for the other types. Do not convert it to storage bytes.

Evidence: [Prisma schema](../server/prisma/schema.prisma), [name synchronization](../server/src/modules/identity/domain/account.ts), [saved panelist identifiers](../client/mobile/Deemo/src/hooks/use-sessions.ts).

## 5. Add the eighteenth database table

- [ ] **After Table 18:** insert the following as **Table 19. admin_actions**. Table numbering starts at 2 because Chapter 2 already contains Table 1, System Feature Analysis.

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

Action identifiers used by the application: `premium_on`, `premium_off`, `sign_in_disabled`, `sign_in_enabled`, `account_deleted`, `daily_reset`, `session_rescored`, `admin_granted`, `admin_revoked`. The database stores these in VARCHAR, not an ENUM.

Evidence: [AdminAction schema](../server/prisma/schema.prisma), [admin actions](../server/src/modules/admin/application/actions.ts).

## 6. Qualify data export and deletion; describe the admin interface

- [ ] Correct the absolute “all data” claims in **Chapter 1 Scope**, **Chapter 2 PostgreSQL and Prisma**, **Chapter 3 Objective 11**, **the ERD paragraph**, and **Data Download and Deletion**.

  Suggested Data Download and Deletion replacement:

  > **Data Download and Deletion.** From Profile, the student can download their account settings, accessible projects, and practice sessions with their reports as a JSON file. Account deletion removes the Firebase sign-in account and the student-owned application records, including manuscript analyses, rubrics, sessions, and reports. Administrative audit records are retained separately and may contain copied account identifiers and email addresses. These audit records are not included in the current Profile data export.

  Suggested Objective 11 replacement:

  > Let students export their account and practice data and delete their account and student-owned application records, with separately retained administrative audit records disclosed in the privacy notice.

  Suggested ERD paragraph replacement:

  > The ERD shows DEEMO's PostgreSQL database. Student-owned projects, analyses, rubrics, sessions, reports, and group memberships use cascading relationships for deletion. Administrative audit records have no foreign keys to student accounts and remain after account deletion.

- [ ] Add **Administrative Management** under Chapter 3 System Function:

  > **Administrative Management.** Authorized administrators use a separate web interface to manage accounts and simulated Premium access, reset daily practice counts, and retry failed or stalled scoring. Administrative actions are recorded in an audit log. The interface does not display students' transcripts, answers, or manuscript analysis content.

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
- [ ] **Chapter 2 → opening of Review of Related Literature and Studies:** change `Inc..` to `Inc.`.
- [ ] **Chapter 1 → Problem and Its Background:** add the missing period after the sentence ending “realistic defense rehearsal”.
- [ ] **Chapter 1 → Definition of Terms:** separate Bounded Adaptive Follow-Up Mechanism from the Artificial Intelligence paragraph so it has its own term entry.

## 13. Update the diagrams and close the stale audit finding

The current DFD, ERD and both flowchart images are byte-identical to the images visually inspected in the previous review. They are the expanded drawings, not the obsolete five-table ERD. Their embedded content has not yet incorporated the newer features below. Page fit and legibility at printed size still need a final layout check.

- [ ] **Figure 3 / ERD source:** add `users.course`, `analyses.field`, and `admin_actions`. Keep `admin_actions` separate from user deletion cascades; there are no foreign keys for its copied identifiers. Regenerate the PNG and replace the embedded ERD.
- [ ] **DFD:** update the profiling inputs to include course and detected manuscript field. If Figure 2 is intended to represent the entire system, add the admin actor/process and audit store; otherwise explicitly label it as the student application DFD and document the admin flow separately.
- [ ] **Flowchart A:** include the course survey and the detected-field review; remove domain selection from the upload step.
- [ ] **Flowchart B:** remove the Coach/Panel setup choice and account for sequential panelist handover. Update the stage-context and missing-results branches where relevant.
- [ ] Regenerate source diagrams in `docs/diagrams/src/` before replacing images. The checked-in ERD generator also lacks the new database fields/table; re-inserting its existing PNG alone does not fix the issue.
- [ ] **Online audit document → Audit tab:** replace the obsolete “old five-table ERD” finding with these current remaining items. The online audit was read but not edited in this pass.

Sources: [diagram generators](diagrams/src/), [current schema](../server/prisma/schema.prisma), [existing audit document](https://docs.google.com/document/d/1S4Bs0Yh6OZN3985GOpH3FHEX3uhIGe8Bqm_eks3dhpg/edit).
