# DEEMO — paper, app and presentation correction guide

Prepared **October 18, 2026**. This is a correction guide, not a record that the corrections have been applied.

**Sources:** the live paper's three chapters, app/server source on `preview` at `d5d08c7`, and the revised presentation on `dev` at `5319a74`. The current `preview` checkout has the older 13-slide deck; `dev` has the revised 11-slide deck. Use the same app version for the paper, demonstration and presentation mockups.

- [Chapter 1](https://docs.google.com/document/d/1wo1wCeRczqvbuCvJUu_7qI7KM1lQhJoNaYa5tWcyjqQ/edit?tab=t.0)
- [Chapter 2](https://docs.google.com/document/d/1wo1wCeRczqvbuCvJUu_7qI7KM1lQhJoNaYa5tWcyjqQ/edit?tab=t.9sx4vpdoel6s)
- [Chapter 3](https://docs.google.com/document/d/1wo1wCeRczqvbuCvJUu_7qI7KM1lQhJoNaYa5tWcyjqQ/edit?tab=t.wv0yg3jyhmi5)

Use each **Find** phrase inside the specified chapter. Locations use headings and paragraph openings rather than page numbers, which change as the paper is edited. Replace only the indicated sentence, paragraph or cell. Blockquotes below are ready to paste unless explicitly marked as conditional on verification.

The six-section presentation outline, general objective, study population of forty fourth-year BSIT students at PMFTCI, practice-only delimitation, simulated Premium, separate panelist voices, built-in rubric, email verification and editable account name/avatar already match the reviewed implementation. Preserve them. The app supports other courses, but the study's population and findings remain limited to the stated BSIT group.

## 1. Chapter 1

### C1-01 — Scope: replace the old profiling clause

- [ ] **Where:** Scope and Delimitation of the Study → paragraph beginning `The technical development scope`.

**Find:** `an Adaptive Domain Profiling engine that tailors the AI panel's questions to the project domain the student selects` and its parenthesized domain list. Replace that clause with:

> an Adaptive Domain Profiling engine that uses the manuscript's detected academic field to select suitable panelists and tailor questioning, with the student's course serving as the fallback when no manuscript field is available. For BSIT and BSCS studies, an additional IT field further guides questioning

Keep the existing sentence's transition to the three defense modes. The Chapter 1 **Definition of Terms** entry for Adaptive Domain Profiling already describes field-first selection correctly; do not replace it with the older domain-only explanation.

### C1-02 — Scope: remove the promise of a complete score for every session

- [ ] **Where:** Same paragraph as C1-01.

**Find:** `to ensure that every mock defense session receives a complete evaluation`. Replace only that clause with:

> to ensure that each session has an applicable evaluation rubric; sessions without substantive answers are marked Not scored

### C1-03 — Scope: qualify data export/deletion

- [ ] **Where:** Scope and Delimitation → paragraph beginning `The platform also supports Group Projects`.

**Find:** `download or permanently delete all of their stored data`. Replace with:

> download their account, accessible project, session and visible-notice data, or delete their account and student-owned application records, while administrative audit records are retained separately

Use C3-07 for the fuller explanation of these limits. Do not promise an audit-record retention duration before a policy has been chosen and implemented.

### C1-04 — Scope: state Android, English, age and adviser limitations

- [ ] **Where:** Scope and Delimitation → immediately after the paragraph beginning `To ensure the feasibility of the project`, which already limits the study to forty BSIT students and says DEEMO does not replace advisers/panels.

**Insert a new paragraph:**

> The application is developed and evaluated on Android devices and supports English-language interaction. Participants must be at least 18 years old. A dedicated adviser monitoring dashboard is outside the scope of the study; advisers may instead review reports exported and shared by students.

Keep the existing online-only and no-real-payment statements.

### C1-05 — Definitions: Pre-Oral excludes final findings

- [ ] **Where:** Definition of Terms → `Pre-Oral Defense Mode.`

**Replace the whole definition:**

> Pre-Oral Defense Mode. Refers to a mock defense stage focused on the study's objectives, related work, methodology, design, sampling and instruments, excluding results and final findings.

### C1-06 — Definitions: give follow-ups their own entry and document the exception

- [ ] **Where:** Definition of Terms → the paragraph beginning `Artificial Intelligence (AI).`, which currently also contains `Bounded Adaptive Follow-Up Mechanism:`.

**Action:** Split before `Bounded Adaptive Follow-Up Mechanism:`. Keep the AI definition as its own paragraph. Replace the separated follow-up definition with:

> Bounded Adaptive Follow-Up Mechanism. Refers to ordinary adaptive follow-up questions on a topic, limited to zero, one, two or three according to the student's setup, with two as the default. A clarification challenging a flagged contradiction remains on the current question and does not consume the ordinary follow-up allowance. It can therefore occur even when that allowance is zero or exhausted.

This reflects the current contradiction-challenge handling; do not say the selected allowance caps every possible panel question.

### C1-07 — Definitions: identify the ISO edition

- [ ] **Where:** Definition of Terms → `ISO/IEC 25010 Software Quality Model.`

**Replace the definition, if the study adopts the 2023 edition:**

> ISO/IEC 25010 Software Quality Model. Refers to the ISO/IEC 25010:2023 product quality model used to structure the evaluation of DEEMO. The researchers identify the characteristics, subcharacteristics and measures applicable to the system and explain the scope of the evaluation.

Apply C2-01 to Chapter 2 and the questionnaire as well. If the actual instrument follows 2011, identify that edition consistently instead of relabeling a 2011 instrument as 2023.

### C1-08 — Conceptual Framework: correct beneficiaries and plan behavior

- [ ] **Where:** Conceptual Framework → paragraph beginning `System Requirements and Resources include`.

**Find the sentence beginning:** `Target Market Segment identifies`. Replace that sentence with:

> Target Market Segment identifies fourth-year BSIT students preparing for their capstone defense as the primary users. Faculty members and research advisers are secondary beneficiaries who may review reports exported and shared by students; they do not receive a dedicated adviser account or monitoring dashboard.

**Then replace the plan sentences from** `Free users may keep one manuscript` **through** `Premium access is simulated without payment.` **with:**

> Free users may keep one manuscript, including a joined group manuscript, and start up to five practice sessions per Philippine calendar day. Free practice supports Title and Pre-Oral Defense with one panelist. Premium provides unlimited manuscripts and session starts, Final Defense, up to three panelists, detailed analytics and PDF report export. Students do not choose a session length. The panel works through a stage-specific manuscript agenda, with a safety cap of 30 minutes for Free and 60 minutes for Premium. These caps bound a runaway session rather than define its target duration. Premium access is simulated without payment.

### C1-09 — Introduction: finish the incomplete sentence

- [ ] **Where:** Introduction → Problem and Its Background discussion of Javier (2018).

**Find the sentence ending:** `little opportunity for realistic defense rehearsal`. Add its missing final period.

## 2. Chapter 2

### C2-01 — ISO/IEC 25010: correct the edition/characteristic mismatch

- [ ] **Where:** Target Technologies → ISO/IEC 25010 Software Quality Model.

**Find:** `The ISO/IEC 25010:2023 standard establishes eight software quality characteristics`. Replace that sentence with:

> ISO/IEC 25010:2023 defines a product quality model comprising nine characteristics: Functional Suitability, Performance Efficiency, Compatibility, Interaction Capability, Reliability, Security, Maintainability, Flexibility and Safety.

**Replace the following application paragraph beginning** `The researchers adopted ISO/IEC 25010` **with:**

> The researchers use ISO/IEC 25010:2023 to structure the software quality evaluation of DEEMO. The evaluation instrument identifies the applicable characteristics, subcharacteristics and measures, and explains any exclusions. Questionnaire items and reported results use the same edition and terminology.

**Also edit:** the questionnaire's characteristic headings, instrument description, tables of results and later evaluation chapters. Use Interaction Capability and Flexibility when referring to those 2023 characteristics; do not present the eight 2011 names as the 2023 list. This does not mean the study must measure every characteristic without regard to scope.

**Source:** [official ISO/IEC 25010:2023 overview](https://www.iso.org/standard/78176.html), confirming a nine-characteristic product quality model. Edition selection must match the actual evaluation instrument.

### C2-02 — Gemini: make the paid-tier statement conditional until verified

- [ ] **Where:** Target Technologies → Google Gemini API → end of the paragraph beginning `DEEMO uses two kinds of Gemini models`.

**Find:** `DEEMO uses only the paid tier of the Gemini API`. Until billing for the actual API project is verified, replace that final paid-tier sentence with:

> DEEMO requires the paid tier of the Gemini API for processing student manuscripts and session content. Paid-tier activation must be verified before evaluation using real student data.

After verification, the present-tense paid-tier statement can be restored, and the repository's billing blocker must be updated with the verification result. Checking the model names or having a working API key does not establish the billing tier.

### C2-03 — Firebase: add its notification role

- [ ] **Where:** Target Technologies → Firebase → after the DEEMO-specific paragraph beginning `For DEEMO, Firebase Authentication manages`.

**Insert:**

> Firebase Cloud Messaging is also used for Android notice notifications while the application is in the background or closed. Delivery requires notification permission and successful registration of the device's messaging token. Foreground inbox updates use authenticated server-sent events from DEEMO's backend rather than Firebase database synchronization. Application data remains in PostgreSQL.

This describes the implementation, not a completed phone-delivery test. Complete APP-02 before claiming verified delivery.

### C2-04 — PostgreSQL/Prisma: remove absolute deletion/export claims

- [ ] **Where:** Target Technologies → PostgreSQL and Prisma → paragraph beginning `For DEEMO, PostgreSQL stores`.

**Replace the whole paragraph:**

> For DEEMO, PostgreSQL stores account settings, manuscript analyses, rubrics, practice transcripts, reports, groups, administrative audit records and notice-delivery records. Only the backend server accesses the database through Prisma. Account deletion removes the student's account and student-owned application records through the configured cascading relationships. Administrative audit records are retained separately and may contain copied identifiers and email addresses; shared broadcast notices may also remain. Profile exports account settings, accessible projects, practice sessions and visible notices with read status as JSON, but does not include administrative audit records or device push tokens. Manuscripts are processed without retaining the original uploaded file, and raw session audio is not stored.

### C2-05 — Comparison prose: correct the NotebookLM voice claim

- [ ] **Where:** Comparison to Existing Technologies → paragraph beginning `Similarly, Google NotebookLM serves`.

**Replace the sentence beginning** `However, NotebookLM primarily focuses` **and its following DEEMO contrast sentence with:**

> NotebookLM supports source-grounded document exploration and Audio Overviews, including interactive voice questions where available. DEEMO organizes interaction as a staged capstone defense rehearsal with panelist roles, manuscript consistency checking, rubric-based readiness scoring and a saved performance report.

**Source:** [Google's interactive Audio Overview documentation](https://support.google.com/gemininotebook/answer/16212820?hl=en). Date the comparison and state feature availability; do not claim NotebookLM has no voice interaction.

### C2-06 — Table 1: distinguish default rubric from optional upload

- [ ] **Where:** Table 1: System Feature Analysis.

| Exact row | Exact column | Replace with |
|---|---|---|
| Defense Evaluation Rubric | DEEMO | Yes — built-in; custom upload optional |
| Voice Interaction | Google NotebookLM | Limited — interactive Audio Overviews |

**Immediately below Table 1, insert:**

> The NotebookLM voice capability was reviewed against Google's documentation on October 18, 2026. Interactive Audio Overviews support voice questions where available; this differs from a structured mock defense. DEEMO always uses a rubric, while uploading a custom panel rubric is optional.

The date above applies to these verified corrections. Verify and source the remaining competitor cells before presenting the entire table as a current, fully verified comparison.

**Also find:** `optional defense evaluation rubric` in the comparison summary paragraph beginning `In summary, while Google Gemini AI`. Replace that phrase with `built-in evaluation rubric with optional custom upload`.

### C2-07 — Target Market: avoid claiming an unmeasured DEEMO outcome

- [ ] **Where:** Target Market → fourth-year BSIT discussion → final paragraph beginning `To bridge the gap between academic preparation and student performance`.

**Find its second sentence:** `By providing realistic, interactive defense simulations, the system directly strengthens...`. Replace the whole sentence with:

> Through repeated, interactive defense practice and personalized feedback, DEEMO aims to support students' communication skills, confidence and readiness for their capstone defense.

Keep actual findings from other studies attributed to those studies. Claim measured DEEMO improvements only when supported by the group's own evaluation results.

### C2-08 — Bibliography: add the missing source records

- [ ] **Where:** the paper's References section, currently in Chapter 1 after the Conceptual Framework; use the institution's required bibliography location if the manuscript is reorganized.

**Add verified full references for every cited Chapter 2 source currently absent:**

| Citation to locate in Chapter 2 | Reference work needed |
|---|---|
| Giray et al. (2024), Vergara (2024) | Verify the exact local-literature publications; add authors, year, title, publication and DOI/URL. |
| Lan et al. (2024), Xu et al. (2024), Wang et al. (2024) | Verify the exact foreign-literature publications and whether each supports the cited claim. |
| Villarino (2025), Goli-Cruz (2024) | Verify the local-study publications, participant counts and reported findings. |
| Chun et al. (2024), Baek (2024), Saeki et al. (2024) | Verify the oral-practice/assessment studies, including any percentage or effectiveness claim. |
| Jurafsky and Martin (2025) | Identify the actual book edition or online-draft version cited and its publication/version date. |
| Heller, where cited | Identify the exact source; do not create a reference from the surname alone. |
| Google AI for Developers; Firebase; Android Studio | Add the specific official documentation pages actually used. Include Cloud Messaging if C2-03 is added. |
| TypeScript; Expo; React Native; GitHub; PostgreSQL; Prisma; Bun; Express | Add the official documentation pages actually cited, with their actual dates or the style's undated-document convention. |
| ISO/IEC 25010 | Cite the edition actually used by the instrument. |

**Fix method:** locate the original source, verify the author/date/title and cited result, then insert its full reference alphabetically and reconcile the in-text author/year. If a source cannot be verified, replace that source and its claim with a verified one or remove the unsupported claim. Full publication entries are intentionally not invented here; this item requires source verification before a paste-ready bibliography can be produced.

## 3. Chapter 3

### C3-01 — System Overview: replace the obsolete plan paragraph

- [ ] **Where:** System Overview → paragraph beginning `Upon completion, the system generates a Defense Performance Analytics report`.

**Replace the whole paragraph:**

> Upon completion, the system saves the session and generates a Defense Performance Analytics report from the applicable rubric, verified contradictions and coverage of the session agenda. Sessions without substantive answers are marked Not scored. Free users can keep one manuscript and start up to five sessions per Philippine calendar day, practicing Title and Pre-Oral Defense with one panelist. Premium provides unlimited manuscripts and session starts, Final Defense, up to three panelists, detailed rubric and delivery analytics, stronger-answer suggestions and PDF report export. Students do not select a session length: the panel works through a stage-specific agenda based on the manuscript. Safety caps of 30 minutes for Free and 60 minutes for Premium stop a runaway session. Premium is simulated without real payment. Account and practice data are stored in PostgreSQL and are available after authenticated sign-in.

### C3-02 — System Objectives: qualify deletion and remove the duration upsell

- [ ] **Where:** System Objectives → objective beginning `Let students download a copy of all their stored data` (Objective 11 in the reviewed list).

**Replace that objective:**

> Let students export their account and practice data and delete their account and student-owned application records, with separately retained administrative audit records disclosed in the privacy notice.

- [ ] **Where:** next objective beginning `Implement a simulated Freemium model` (Objective 12).

**Replace that objective:**

> Implement a simulated Freemium model with server-enforced manuscript, daily-start, panelist and defense-stage limits. Premium enables Final Defense, multiple panelists and the full analytics report. Practice proceeds through a manuscript-based agenda, with plan-specific safety time caps rather than a student-selected session duration.

### C3-03 — Operational Definition: fix profiling and Freemium

- [ ] **Where:** Operational Definition → `Adaptive Domain Profiling.` Replace its domain-at-upload definition with:

> Adaptive Domain Profiling. Refers to tailoring panel composition, questioning and scoring feedback to the manuscript's detected academic field. The student reviews and may correct that classification before confirming the summary. The student's course, collected during onboarding and editable in Profile, is the fallback when no manuscript field is available. For BSIT and BSCS studies, an additional IT field guides questioning.

- [ ] **Where:** Operational Definition → `Freemium Access Tier.` Replace the whole definition with:

> Freemium Access Tier. Refers to DEEMO's simulated access model. Free users can keep one manuscript, start five sessions per Philippine calendar day and practice Title or Pre-Oral Defense with one panelist. Premium provides unlimited manuscripts and session starts, Final Defense, up to three panelists and the full analytics report, without payment. Sessions cover a manuscript-based agenda and use safety caps of 30 minutes for Free and 60 minutes for Premium; students do not choose a session duration.

- [ ] **Where:** Operational Definition → `Bounded Adaptive Follow-Up Mechanism.` Replace the whole definition with the definition in **C1-06**. Keep the same exception in both chapters.

### C3-04 — Onboarding: add course selection

- [ ] **Where:** System Function → paragraph beginning `Onboarding and Consent.` Append:

> After consent, the student selects their course in a one-time survey. The course can later be changed in Profile and is used to profile the panel when the manuscript has no identified academic field.

### C3-05 — Practice Setup: describe current controls and stage context

- [ ] **Where:** System Function → `Practice Setup.` Replace the whole paragraph:

> Practice Setup. Before each session, the student selects Title, Pre-Oral or Final Defense and reviews the manuscript and rubric to be used. They choose the panelist count, ordinary follow-up allowance per topic and difficulty. For computing studies, they may adjust the IT field. Setup previews the field-appropriate panelists and marks Premium-only choices with a lock. Session length and question count are not selected. The server constructs the questioning agenda from the stage and available manuscript content, omitting topics that require absent material. Title Defense excludes detailed methodology and results; Pre-Oral includes methodology and design but excludes results; Final uses available results and findings. Chapter-tagged facts beyond the selected stage are omitted, while untagged facts remain available. If Final is selected without manuscript results, Setup warns the student and the panel is instructed not to invent findings.

Do not claim perfect automatic chapter isolation: untagged facts remain available in the implementation.

### C3-06 — Live Panel Questioning: add agenda completion and challenge behavior

- [ ] **Where:** System Function → `Live Panel Questioning.` Replace the whole paragraph:

> Live Panel Questioning. The server issues a short-lived token, and the app connects directly to Gemini Live for voice interaction. Panelists question the student sequentially through separate connections and distinct voices, carrying relevant presentation and earlier exchanges into each handover. Each panelist asks the manuscript-based agenda topics assigned to their seat, one main question at a time, with ordinary follow-ups subject to the student's selected allowance. A clarification challenging a flagged contradiction stays on the current question and does not consume that allowance. The question card displays the current question or challenge and identifies the asker and question type. The live transcript does not visually mark contradictions; the server verifies them for the report afterward. The app permits normal handover or closure after the required agenda topics have been asked and answered. The student can finish an answer, type when enabled, pause, resume or end early. The plan's safety cap can also end the session. On a connection drop, the app attempts to reconnect; successful continuation depends on network and token availability.

**Also where:** Operational Definition → `Live Verbal Consistency Checker.` Preserve its existing no-highlight/report-afterward description, and append:

> A contradiction challenge appears as the current clarification question and does not consume the ordinary follow-up allowance.

### C3-07 — Data Download and Deletion: disclose what is retained

- [ ] **Where:** System Function → `Data Download and Deletion.` Replace the whole paragraph:

> Data Download and Deletion. From Profile, students can export account settings, accessible projects, practice sessions and visible notices with read status as a JSON file. Account deletion removes the Firebase sign-in account and student-owned application records, including analyses, rubrics, sessions and reports, according to the configured database relationships. Administrative audit records are retained separately and may include copied identifiers and email addresses; they have no account foreign keys that would cascade on deletion. Shared broadcast notices can also remain after an individual recipient deletes their account. Administrative audit records and device push tokens are not included in the current Profile export.

Apply APP-01 to the app's privacy copy and retention policy; changing only the paper does not resolve the app's absolute deletion claims.

### C3-08 — Scoring: replace the paragraph and insert the actual formula

- [ ] **Where:** System Function → `Scoring and Defense Performance Analytics.` Replace the whole paragraph:

> Scoring and Defense Performance Analytics. When a session ends, the app submits its transcript and measurements to the server, which saves the session. Gemini rates the applicable AI-judged rubric criteria from 1 to 5 with explanations, checks contradictions against the manuscript and provides answer feedback and stronger examples. For the default rubric, Confidence and Delivery is calculated in code from response-start latency, filler frequency and speaking pace rather than emotion recognition. For a custom rubric, Gemini evaluates its applicable criteria using the answers and available measurements. Criteria without a measured level are excluded and the remaining weights are normalized. The server calculates the numerical readiness score from rubric performance, coverage and verified contradiction penalties. Scores are labeled Defense-ready (85–100), Nearly ready (70–84), Developing (50–69) or Needs preparation (below 50). Sessions with no substantive answers are marked Not scored and excluded from readiness trends; default delivery is unmeasured when there are no qualifying spoken answers. Reports include the verdict, top fixes, verified contradictions, answer feedback and transcript; Premium adds the detailed rubric, delivery measurements, stronger-answer suggestions and PDF export. Students can practice again or target weak topics from a report. If scoring fails, the saved session can be retried.

**Immediately after that paragraph, insert the following formula block and explanation:**

```text
Level Points_i = (Level_i − 1) / 4
RS = 100 × Σ[(Weight_i / Σ measured weights) × Level Points_i]
CF = clamp(Answered Agenda Topics / Planned Agenda Topics, 0, 1)
CP = min(15, 5 × HIGH + 2 × MEDIUM + 0.5 × LOW)
Readiness Score = round(clamp(RS × CF − CP, 0, 100))
```

> RS is the weighted rubric score, CF is coverage and CP is the penalty for verified contradictions. For current agenda sessions, a distinct agenda topic is answered when its main question or a related follow-up receives at least three words containing letters or digits. This threshold identifies an answer for coverage, not its correctness. Coverage has no minimum floor. Topics that never received a main question are shown as Not reached; asked-but-unanswered topics also reduce coverage. Older sessions without an agenda use the legacy coverage calculation. The final calculation uses the unrounded RS; the rubric score displayed and stored in the report is rounded.

**Optional worked example, directly after the explanation:**

> With default weights [25, 20, 20, 20, 15], levels [4, 3, 4, 3, 3], full coverage, one verified HIGH contradiction and one verified MEDIUM contradiction, RS = 61.25, CP = 7 and readiness = round(61.25 − 7) = 54.

### C3-09 — Profile: include course and inbox

- [ ] **Where:** System Function → `Home Dashboard, History and Profile.` Replace its final sentence beginning `Profile shows` with:

> Profile shows the student's account and simulated plan, editable name and avatar, editable course, the typed-answer setting, notice inbox, and controls to export account/practice data, delete the account and sign out.

### C3-10 — Add Administrative Management and Notices

- [ ] **Where:** System Function → immediately after the `Home Dashboard, History and Profile.` paragraph and before `Graphical User Interface`.

**Insert two new paragraphs:**

> Administrative Management. Authorized administrators use a separate web interface to manage accounts and simulated Premium access, reset daily practice counts and retry failed or stalled scoring. Administrative actions are recorded in an audit log. The interface does not display students' full transcripts, answers or manuscript-analysis content.

> Notices and Inbox. Administrators can send a notice to all students, one student or a filtered audience. Filtered recipients are recorded when the notice is sent. Notices persist in an inbox with per-student read status. Foreground updates use an authenticated server-sent-events connection, and eligible new notices can appear through Deemo. In-app delivery is held during microphone check, live practice and scoring. Notices already waiting when the app opens stay in the inbox instead of floating again. Firebase Cloud Messaging supports Android notifications in the background or when the app is closed, subject to permission and successful device-token registration. Tapping a notification opens its notice.

### C3-11 — ERD description: qualify cascades and state current scope

- [ ] **Where:** Entity Relationship Diagram → paragraph beginning `The ERD shows DEEMO's PostgreSQL database`.

**Replace:**

> The ERD represents DEEMO's PostgreSQL database, including student accounts, projects, analyses, rubrics, sessions and reports, groups, administrative actions and notice-delivery records. Student-owned records use the cascading relationships shown in the diagram. Administrative audit records retain copied identifiers without foreign keys to accounts and can remain after account deletion. Broadcast notices are shared records rather than exclusively owned student data. The data dictionary describes all 22 tables in the reviewed schema.

Update the figure and dictionary before asserting that they show all 22 tables.

## 4. Chapter 3 — ER Diagram Data Dictionary

Keep the existing six columns and Length convention: VARCHAR = maximum characters; unbounded TEXT = Variable; other types = N/A. Do not change Length to storage bytes. Table 1 is already in Chapter 2, so Chapter 3 correctly starts with Table 2.

### D-01 — Add four fields to their existing tables

- [ ] Insert these rows at the exact positions below.

| Table and insertion point | Field Name | Description | Data Type | Length | Constraints | Possible Values |
|---|---|---|---|---|---|---|
| Table 2: users — after allow_typing | course | Student's course, selected at onboarding and editable in Profile | VARCHAR | 40 | Nullable | Supported course category |
| Table 4: analyses — after unsure | field | Manuscript academic field detected during analysis and correctable in the summary | VARCHAR | 40 | Nullable | Supported course category |
| Table 7: sessions — after minutes | agenda | Snapshot of the topics planned for this session | JSONB | N/A | Nullable for older sessions | Array of objects containing id and label |
| Table 8: session_turns — after question | topic | Agenda topic associated with this turn | VARCHAR | 60 | Nullable for older sessions; no FK | Agenda-topic identifier |

For the paper, paste only the existing six dictionary columns; the first column above tells you where to insert the row.

**Immediately after the users table, add this note:**

> Supported course categories are BSIT, BSCS, Engineering, Maritime, Education, Nursing & Health, Business & Accountancy, Hospitality & Tourism, Criminology, Psychology & Social Sciences, and Other. The application validates these categories; the database columns remain nullable VARCHAR fields.

### D-02 — Correct the existing dictionary cells

- [ ] Apply each row below to the specified existing field.

| Exact table/field | Column | Replacement |
|---|---|---|
| Table 3: projects.domain | Description | IT field associated with the manuscript; General is used for non-computing studies. |
| Table 3: projects.domain | Possible Values | Web/Mobile App, Networking & Security, Data & AI, IoT/Hardware, Information Systems, General |
| Table 4: analyses.features | Description | Main features or outputs described by the study. |
| Table 4: analyses.unsure | Possible Values | Keep the existing field names and add field. |
| Table 7: sessions.domain | Description | IT field used for the practice session. |
| Table 7: sessions.domain | Possible Values | Web/Mobile App, Networking & Security, Data & AI, IoT/Hardware, Information Systems, General |
| Table 7: sessions.minutes | Description | Safety time cap applied to the session. |
| Table 7: sessions.minutes | Possible Values | 30 for Free, 60 for Premium; legacy sessions can retain older selected durations. |
| Table 8: session_turns.panelist | Possible Values | 0 = Reyes (Chair), 1 = Santos (field expert), 2 = Cruz (Methodology); persona identifiers, not speaking-order positions. |
| Table 10: reports.answered | Description | Distinct agenda topics with a substantive answer; main-question coverage for legacy sessions. |
| Table 10: reports.planned | Description | Agenda topics planned; legacy planned-main-question count for older sessions. |
| Table 17: live_starts.expires_at | Possible Values | Session safety cap plus 30 minutes after the start attempt. |

### D-03 — Add Table 19: admin_actions

- [ ] **Where:** after Table 18: Data Dictionary of rate_limit_counters, before System Flowchart. Insert Tables 19–23 there in the following order, updating the List of Tables if the paper has one.

**Caption:** Table 19: Data Dictionary of admin_actions

| Field Name | Description | Data Type | Length | Constraints | Possible Values |
|---|---|---|---|---|---|
| id | Unique audit record ID | SERIAL (INTEGER) | N/A | PK, auto-increment | Positive integer |
| admin_id | Acting administrator's Firebase UID | VARCHAR | 128 | Not null; no FK | Firebase UID |
| admin_email | Administrator email copied when the action occurred | VARCHAR | 320 | Nullable | Email address |
| action | Administrative action identifier | VARCHAR | 40 | Not null | See action note below |
| target_id | Account, resource or audience identifier affected by the action | VARCHAR | 128 | Not null; no FK | Target ID, all, or filtered-audience marker |
| target_email | Target email copied at the time, where applicable | VARCHAR | 320 | Nullable | Email address |
| created_at | Time the action was recorded | TIMESTAMP(3) | N/A | Not null; default now; indexed | Date and time |

**Note immediately below Table 19:**

> Audit records retain copied identifiers and are not removed by account-deletion cascades. Actions include premium_on, premium_off, sign_in_disabled, sign_in_enabled, account_deleted, daily_reset, session_rescored, admin_granted, admin_revoked and notice_sent. These identifiers are stored as VARCHAR values, not a database ENUM. A target is not necessarily a Firebase UID: a notice can target all students or a filtered audience.

### D-04 — Add Table 20: notices

**Caption:** Table 20: Data Dictionary of notices

| Field Name | Description | Data Type | Length | Constraints | Possible Values |
|---|---|---|---|---|---|
| id | Notice identifier supplied by the application | VARCHAR | 36 | PK | UUID |
| title | Notice heading | VARCHAR | 120 | Not null | Notice title |
| body | Notice content | VARCHAR | 2000 | Not null | Notice text |
| target_id | Recipient of an individual notice | VARCHAR | 128 | Nullable; FK to users.id; cascade on delete | Firebase UID; null for broadcast or filtered audience |
| segment | Filters used to choose a filtered audience | VARCHAR | 400 | Nullable; JSON serialized as text | Audience-filter object serialized as text |
| created_by | Administrator who sent the notice | VARCHAR | 128 | Not null; no FK | Administrator Firebase UID |
| created_at | When the notice was created | TIMESTAMP(3) | N/A | Not null; default now; indexed | Date and time |

**Note immediately below Table 20:**

> The table has indexes on created_at and on (target_id, created_at). A broadcast has both target_id and segment null. A filtered notice has a segment and a fixed recipient list in notice_recipients. An individual notice has target_id and no segment. These audience combinations are validated by the application. Only the individual target relation cascades directly when that user is deleted; shared broadcast and filtered notices can remain.

### D-05 — Add Table 21: notice_reads

**Caption:** Table 21: Data Dictionary of notice_reads

| Field Name | Description | Data Type | Length | Constraints | Possible Values |
|---|---|---|---|---|---|
| user_id | Student who read the notice | VARCHAR | 128 | Composite PK with notice_id; FK to users.id; cascade on delete | Firebase UID |
| notice_id | Notice that was read | VARCHAR | 36 | Composite PK with user_id; FK to notices.id; cascade on delete | Notice UUID |
| read_at | When the student read the notice | TIMESTAMP(3) | N/A | Not null; default now; indexed | Date and time |

### D-06 — Add Table 22: notice_recipients

**Caption:** Table 22: Data Dictionary of notice_recipients

| Field Name | Description | Data Type | Length | Constraints | Possible Values |
|---|---|---|---|---|---|
| notice_id | Filtered notice delivered to the student | VARCHAR | 36 | Composite PK with user_id; FK to notices.id; cascade on delete | Notice UUID |
| user_id | Student selected when the notice was sent | VARCHAR | 128 | Composite PK with notice_id; FK to users.id; cascade on delete; indexed | Firebase UID |

**Note:** Filter criteria are resolved at send time. A later change to the student's course, plan or practice history does not recalculate the saved recipient list.

### D-07 — Add Table 23: push_tokens

**Caption:** Table 23: Data Dictionary of push_tokens

| Field Name | Description | Data Type | Length | Constraints | Possible Values |
|---|---|---|---|---|---|
| token | Firebase Cloud Messaging token registered by a device | VARCHAR | 512 | PK | FCM registration token |
| user_id | Account associated with the device token | VARCHAR | 128 | Not null; FK to users.id; cascade on delete; indexed | Firebase UID |
| updated_at | When the token association was last updated | TIMESTAMP(3) | N/A | Not null; maintained by Prisma | Date and time |

**Note:** The token is a device messaging identifier, not a Firebase sign-in credential. The implementation removes stale tokens reported by FCM and attempts to unregister a token at sign-out.

## 5. Diagrams — source changes first, paper replacement afterward

The previous paper uses the expanded PostgreSQL figures, not the obsolete five-table ERD. This review did not re-render the embedded paper images. Make the source changes below, regenerate, then replace the matching figures under Chapter 3's Data Flow Diagram, Entity Relationship Diagram and System Flowchart headings.

### FIG-01 — ERD

- [ ] **Source:** [erd.mjs](C:/Deemo.ai/docs/diagrams/src/erd.mjs), entity list and relationship definitions.

**Fix:** Add users.course, analyses.field, sessions.agenda and session_turns.topic, then add the five tables in D-03–D-07. Add the notice target/receipt/recipient/token foreign-key relationships with their composite keys. Show admin_actions and notices.created_by as copied identifiers without account foreign keys. Preserve sessions.project_id as a reference without an FK. The complete figure must cover 22 tables. Keep the user's full left-to-right layout and clear routed connectors.

**Paper location:** replace the figure immediately under **Entity Relationship Diagram**, then apply C3-11 to its explanatory paragraph. Check at landscape printed size; do not shrink labels until they become unreadable.

### FIG-02 — DFD

- [ ] **Source:** [dfd.mjs](C:/Deemo.ai/docs/diagrams/src/dfd.mjs), node/store definitions and data-flow edges.

**Fix:** Add course input from onboarding/Profile and manuscript-field output from analysis to panel profiling. Represent agenda construction, direct phone-to-Gemini Live audio, and post-session scoring. For a whole-system DFD, include the admin external actor, administrative actions/audit store, notices/recipient/read records, and notification delivery through FCM. If the figure deliberately covers only the student practice subsystem, label it as such and add a separate admin/notice DFD instead of implying full-system coverage.

**Paper location:** replace or supplement the figure under **Data Flow Diagram**. Use the existing DFD symbol convention consistently: external actors, processes, data stores and named data flows. Keep audio out of the server's live-turn path.

### FIG-03 — Flowchart A

- [ ] **Source:** [flow.mjs](C:/Deemo.ai/docs/diagrams/src/flow.mjs), the first flow definition; locate `Upload manuscript ... and pick the domain` and the email-verification-to-Home path.

**Fix:** Change upload to `Upload manuscript (PDF or DOCX, up to 20 MB)`. Add the one-time course-selection gate after the account/consent requirements and before Home. Change extraction/review to include academic field and, for computing manuscripts, IT field. Show the student correcting/confirming the analysis. Keep rubric upload as a separate optional step and retain the built-in-default path.

**Paper location:** replace Flowchart A under **System Flowchart**. Preserve portrait flowchart format.

### FIG-04 — Flowchart B

- [ ] **Source:** [flow.mjs](C:/Deemo.ai/docs/diagrams/src/flow.mjs), the second flow definition; locate `Practice setup: stage, panelists, length, follow-ups, difficulty, Coach or Panel mode`.

**Replace that node label with:** `Practice setup: stage, panelists, follow-ups and difficulty`.

**Add/adjust the path:** build stage/manuscript agenda → mic check → uninterrupted presentation → current panelist asks assigned agenda topic → student answers → ordinary follow-up/contradiction clarification as needed → topic covered? → current seat's topics complete? → hand over if another seat remains → normal close when the full agenda is covered → save and score → report. Add student-end and safety-cap exits. Include scoring failure/retry and Not scored when there are no substantive answers. Do not show Coach/Panel mode, a chosen duration, an arbitrary question-count end or a live contradiction-warning popup.

**Paper location:** replace Flowchart B under **System Flowchart**. Check decision labels and connector paths after regeneration. Update figure captions/List of Figures if numbering changes.

## 6. App/server work and verification prerequisites

These items are not fixed by pasting paper text. They require implementation, a policy decision or a device/configuration check. Keep them separate from completed code behavior.

### APP-01 — Make privacy copy and audit retention agree with the implementation

- [ ] **Edit locations:** [consent.tsx](C:/Deemo.ai/client/mobile/Deemo/src/app/consent.tsx), the `ITEMS` entry beginning `You can delete everything`; [Profile](C:/Deemo.ai/client/mobile/Deemo/src/screens/profile/index.tsx), the `Delete all your data?` sheet; [admin action schema](C:/Deemo.ai/server/prisma/schema.prisma), `AdminAction`; [admin actions](C:/Deemo.ai/server/src/modules/admin/application/actions.ts), audit recording.

**Consent-copy replacement:**

> You can delete your account and practice data from Profile. Administrative audit records are retained separately.

**Delete-sheet body replacement:**

> This removes your account, manuscripts, transcripts and reports. Groups you lead are dissolved; teammates keep their own past sessions. Administrative audit records are retained separately and may contain account identifiers and email addresses. Shared notices may remain. Deletion cannot be undone.

**Policy work:** define the audit retention period and who can access or delete those records; implement that policy in the server's maintenance/deletion path and disclose it in the consent/privacy notice. No automatic retention cutoff currently exists. Do not invent a number in the paper. Preserve audit accountability and existing deletion behavior while implementing the chosen policy.

### APP-02 — Verify notice delivery on a real device

- [ ] **Locations:** [use-push-notices.ts](C:/Deemo.ai/client/mobile/Deemo/src/hooks/use-push-notices.ts), especially the silent token-save failure; [push.ts](C:/Deemo.ai/server/src/modules/notices/infrastructure/push.ts); [notice-delivery.tsx](C:/Deemo.ai/client/mobile/Deemo/src/components/notice-delivery.tsx); [acceptance checklist](C:/Deemo.ai/docs/ADMIN_NOTICES.md).

**Fix/check:** expose a useful development log for token-registration failures, confirm the device registers a push_tokens row, and test a notice to a known test student in foreground, background and closed states. Also test broadcast/filtered targeting, read persistence, sign-out/account switch, notice-open navigation and practice deferral. Verify that already-waiting inbox notices do not float again on launch. Do not call token registration or push delivery verified until those checks pass. Do not log sign-in credentials or full FCM tokens.

### APP-03 — Verify agenda migration and end conditions

- [ ] **Locations:** [agenda migration](C:/Deemo.ai/server/prisma/migrations/20261018090000_session_agenda/migration.sql), [agenda builder](C:/Deemo.ai/server/src/modules/practice/domain/agenda.ts), [Gemini engine](C:/Deemo.ai/client/mobile/Deemo/src/live/gemini-engine.ts), [scoring coverage](C:/Deemo.ai/server/src/modules/scoring/domain/session.ts).

**Fix/check:** apply the migration to the intended database through the server's normal migration command, restart the server and reload Metro. Confirm that Setup has no length/question-count selector; unavailable manuscript sections omit their dependent topics; each seat hands over only after its required topics are covered; normal closure waits for the agenda; the student can end early; the correct safety cap is supplied; and a contradiction challenge still updates the question card with ordinary follow-ups set to zero or exhausted. Check that reports save agenda/topic identifiers, calculate topic coverage and list genuinely unreached topics. Do not claim this guide applied migrations or ran a phone test.

### APP-04 — Confirm paid-tier activation

- [ ] **Locations:** billing settings of the Google Cloud/Gemini API project used by the running server; [handoff billing blocker](C:/Deemo.ai/docs/HANDOFF.md).

**Fix/check:** verify the actual API project's billing state, not just the presence of GEMINI_API_KEY or a successful request. Record the result in the handoff, then use the matching present-tense or requirement wording in C2-02. No billing values, keys or student files need to be copied into the paper.

## 7. Presentation and marketing mockups

### PPT-01 — Use the revised deck with the intended app version

- [ ] **Location:** Git branches containing [the deck](C:/Deemo.ai/client/web/presentation/index.html).

**Fix:** preserve the revised deck on `dev` at `5319a74` and the newer agenda/challenge behavior on `preview`. Integrate the intended changes through the normal tested branch workflow before publishing the demo. Do not replace the revised deck with the older 13-slide version merely because it is present in the current checkout. The intended revised deck has 11 slides, with the six requested content sections, the two retained technology walkthrough slides, the disclaimer at 10 and thank-you at 11.

### PPT-02 — Setup phone: replace the obsolete LENGTH selector

- [ ] **Locations:** `DRAW.setup` in [presentation screens.js](C:/Deemo.ai/client/web/presentation/js/screens.js) and its mirrored renderer in [site screens.ts](C:/Deemo.ai/client/web/site/src/three/screens.ts). Find `seg("LENGTH"`.

**Fix:** remove that 10/15/20-minute segment. Show the current setup controls, including follow-ups per topic and difficulty, and retain stage/panelist selection. A short supporting line can say:

> The panel works through your manuscript's agenda.

**Slide locations:** revised slide 3's Setup phone, slide 6's setup step, and slide 9 → Practice setup. The marketing site's matching phone texture must stay in step.

### PPT-03 — Live phone: remove obsolete contradiction highlights

- [ ] **Locations:** `session(ctx, t, flag)` in the same two screen-renderer files. Find `coach-mode honey dot`, `Differs from Ch. 3` and the flagged transcript rendering.

**Fix:** remove the live amber discrepancy banner and highlighted student words. Keep a normal clarification question representing a contradiction challenge. Retain verified contradiction details in `DRAW.results`, where the app actually shows them after scoring.

**Slide locations:** revised slide 2's session phone, slide 6's live step, slide 7's architecture phone, slide 9 → Live AI panel, and slide 10's disclaimer device. Use the revised deck's existing screen mapping when applying the fix.

### PPT-04 — Mark sample screens as examples, not evaluation results

- [ ] **Locations:** `DRAW.analysis` and `DRAW.results` in the same two renderer files; the deck's sample phone states and marketing-site report examples.

**Fix:** add a small readable `Illustrative example` label in the mock screen or beside the relevant example. Preserve fictitious example numbers unless deliberately replacing the entire sample; do not turn the sample's 30 respondents or readiness score of 70 into claims about the group's forty-participant study. The built-in ReqTrack practice manuscript is also a separate sample, not DEEMO's evaluation result.

### PPT-05 — Keep summary/RRL wording within the paper's evidence

- [ ] **Location:** revised slide 8, Review of Related Literature; any public-site or deck claim that DEEMO has already improved readiness.

**Fix/check:** retain the synthesis as a design rationale. A safe closing line is:

> Related studies support the design of manuscript-based, voice-interactive defense practice. DEEMO's effect on readiness is evaluated in this study.

Verify the author/year labels against C2-08 before submission. Keep the existing practice-only disclaimer; it already agrees with the paper's adviser/panel-authority delimitation.

## 8. Audit-document follow-up and completion checks

### DOC-01 — Keep the online audit consistent with the current figures and open work

- [ ] **Where:** [audit document](https://docs.google.com/document/d/1S4Bs0Yh6OZN3985GOpH3FHEX3uhIGe8Bqm_eks3dhpg/edit) → **Audit** tab → ERD/data-dictionary findings and any summary of remaining corrections.

**Fix/check:** read the current audit before editing it. If it still calls the paper's ERD the old five-table diagram, replace that obsolete finding with the following current requirement, then remove findings only after their paper/code corrections are verified:

> Update the diagram source and embedded ERD to the current 22-table schema, including course and manuscript-field profiling, agenda/topic fields, administrative actions and notice-delivery records. Add the five missing data dictionaries and four missing fields, and distinguish retained administrative audit records from student-deletion cascades.

This guide did not re-read or edit the online audit, so the condition above is a follow-up check, not a claim that the obsolete finding is still present today.

### Final checks

- [ ] Apply the paper replacements only after checking that the exact anchor still contains the outdated wording; the group may be editing the live paper concurrently.
- [ ] Check the entire paper for remaining `two sessions a day`, `ten sessions a day`, `10-minute sessions`, `25 minutes`, `session length`, `Coach`, `at upload and before each session`, `every mock defense session receives a complete evaluation`, and absolute `all data` claims. Interpret matches in context; elapsed duration and historical example values are not automatically wrong.
- [ ] Confirm all 22 schema tables are documented and all four missing fields have been inserted; Tables 2–23 cover the database because Table 1 is the competitor comparison.
- [ ] Update List of Tables/List of Figures after inserting tables and regenerated images. Check landscape figures and portrait flowcharts at final printed size.
- [ ] Verify the score example: RS 61.25, CP 7, CF 1, final score 54. Distinguish ordinary follow-up limits, contradiction challenges and coverage.
- [ ] Reconcile citations with full references and actual source claims; confirm the ISO edition matches the instrument.
- [ ] Finish the policy/billing/device checks before writing that those matters are resolved. Keep unverified operational details out of the findings/conclusions.
- [ ] Recheck the final paper, app version and deck together; update handoff/tasks and commit through the repository's branch workflow.

**Authoritative code references:** [Prisma schema](C:/Deemo.ai/server/prisma/schema.prisma), [plan limits](C:/Deemo.ai/server/src/modules/identity/domain/plan.ts), [panel prompt/stage filtering](C:/Deemo.ai/server/src/modules/practice/domain/panel.ts), [agenda builder](C:/Deemo.ai/server/src/modules/practice/domain/agenda.ts), [readiness math](C:/Deemo.ai/server/src/modules/scoring/domain/scoring.ts), [coverage/report behavior](C:/Deemo.ai/server/src/modules/scoring/domain/session.ts), [export route](C:/Deemo.ai/server/src/modules/identity/http/routes.ts).

This guide was prepared from source and live document text. It does not claim that billing, migrations, phone delivery, original research publications or embedded figure pixels were verified, and it does not change the app or online paper.
