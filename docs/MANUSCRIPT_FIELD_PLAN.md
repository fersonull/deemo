# The manuscript decides the panel's field (course only as a fallback)

## Context

**The problem.** Today the panel's profile comes from the student's **account course**: the onboarding survey sets it and Profile edits it. A student whose course is Education but who uploads a BSIT capstone gets:
- "Dr. Santos · Pedagogy", asking about learners and instruction, about a system they built;
- Education-flavoured scoring feedback.

The paper is the thing being defended, so the paper's field should decide.

Cases where the two differ are common:
- a student helping a friend
- a panelist testing the app with their own paper
- a group mixing programs
- someone who picked the wrong course in the survey

**Outcome**
- **Field detection:** Document Logic Analysis also detects the manuscript's **field**, one of the `COURSES`. For computing papers it also detects the **IT field**.
- **What follows it:** the panel lineup, Santos's title and role, the voices, the prompts and the scoring all follow the **project's field**.
- **Fallback:** the account course is used only when there is no manuscript (sample paper) or an older analysis has no field.
- **Student control:** the student sees the detected field on the summary screen and can correct it.
- **Mismatches don't block:** when the field differs from the student's course, a gentle note explains which panel they'll get.

Builds on the unmerged **`feat/course-panel`** branch (it uses `lineup` and `personaFor`); commit there. Needs one migration, no native rebuild.

## 1. Detect the field during analysis (server)

**`server/src/modules/manuscripts/domain/manuscript.ts`**
- **`Analysis` type:** add `field?: Course`. It's optional because older analyses have none.
- **`ANALYSIS_SCHEMA` / `AnalysisReply`:** add `field: enum COURSES` and `itField: enum DOMAINS`. `"General"` is used when the paper isn't computing.
- **`ANALYSIS_PROMPT`:** two lines:
  - "field: the academic program this study belongs to, judged from its content (what was built or studied, the methods, the setting), not from the school or the student. Pick the closest of: {COURSES}; use Other if none fits."
  - "itField: for a computing study (BSIT, BSCS), the closest of {IT domains}; otherwise General."
  - "List field in unsure if it's unclear."
- **`FIELDS`:** gets `"field"` in the `unsure` enum only. It's not a text card.
- **`applyEdits`:** accepts `field` (validated against `COURSES`). An edited field leaves `unsure`.

**Storage:**
- **`server/prisma/schema.prisma`:** add `field String? @db.VarChar(40)` to `Analysis`. Migration `add_analysis_field`.
- **`infrastructure/project-repo.ts`:**
  - `toAnalysis` / `analysisData` carry `field`.
  - `finishAnalysis` also sets `project.domain = itField`. This replaces the upload-time pick (see §3).
- **Edit route (`http/routes.ts`, analysis edits schema):**
  - `field: z.enum(COURSES).optional()` and `domain: z.enum(DOMAINS).optional()`. A domain change updates `project.domain`.
  - Only owners can edit, as today: group members read only.

## 2. Use the project's field everywhere (server)

**One rule:** `profileCourse = project?.analysis?.field ?? courseOf(account.course)`.
- **`practice/application/live-token.ts`:** `panel.course = profileCourse`. The lineup and the voice per seat follow it.
- **`scoring/application/sessions.ts`:** `judge` uses the session's project field when `s.projectId` still resolves. Otherwise it falls back to the account course.
- **`manuscriptFacts`:** adds `Field: {field}` as the first line, so the panel also sees the field next to the facts.
- **Group projects:** the analysis is shared, so every member of a group gets the same panel for that manuscript, whatever their own course.

## 3. App

**Shared helper (`constants.ts` or `hooks/use-projects.ts`):** `profileCourse(project, accountCourse) = project?.analysis?.field ?? accountCourse`.

**Where it's used:**
- **`screens/setup/index.tsx`:** the panel preview and the IT FIELD row use `profileCourse(manuscript, course)`.
- **`screens/session/index.tsx`:** the `seats` snapshot uses the same, with the active project from `practiceSetup.projectId` and the projects store. The preview and the session therefore always agree.

**Upload sheet (`screens/projects/upload-sheet.tsx`):**
- Drop the IT field picker: the analysis detects it now, and it's editable on the summary.
- The upload sends `"General"` as a placeholder.
- One less decision before reading.

**Analysis summary (`screens/analysis/index.tsx`), a FIELD card at the top:**
- It shows "Education" or "BSIT · Data & AI", with "From your manuscript" and the existing unsure badge when the model wasn't sure.
- **Change** opens a sheet with the course picker (`components/course-picker.tsx`) and, for computing fields, the IT field chips.
  - Saving goes through `projects.saveAnalysis(id, { field })`, plus the domain.
  - Owners only; group members read only, as with other cards.
- **Mismatch note:** when the detected field isn't the student's account course, a short line under the card:
  - "Your course is Education, but this reads like a BSIT study. The panel will question it as BSIT. Change it here if that's wrong."
  - Informational only, never blocking.
- **Hook:** `hooks/use-projects.ts` gets `Analysis.field?: Course`, and `saveAnalysis` sends `field` and `domain`.

**Profile Course sheet copy:** "Used when you practice without a manuscript. With a manuscript, the panel follows the manuscript's field."

**Onboarding survey:** stays. It's the fallback and the default, and it costs one tap.

## 4. What changes in behaviour

| Situation | Panel field |
|---|---|
| Education student, BSIT capstone uploaded | BSIT (from the paper), with a note on the summary |
| Same, after correcting the field to Education on the summary | Education |
| No manuscript (sample paper) | account course |
| Analysis made before this change (no field) | account course; the summary shows "Field: not detected, using your course" with Change |
| Group project | the shared analysis's field, for every member |

## 5. Tests

- **Server, manuscript domain:**
  - `applyEdits` accepts a valid `field`, rejects an unknown one, and clears `unsure`.
  - `AnalysisReply` parses `field` and `itField`.
- **Server, panel:** `manuscriptFacts` starts with `Field:` when the analysis has one.
- **Server, live-token:** a project with field `"Nursing & Health"` and an account course of `BSIT` gives Nursing's lineup and voice.
- **App:** `profileCourse` prefers the project's field over the account course and falls back when it's missing.

## 6. Docs (same commit)

- **`docs/HANDOFF.md`:**
  - Recent changes row.
  - Gotchas:
    - the profile course = the project's field, else the account course
    - the upload no longer asks for the IT field; the analysis sets `project.domain`
- **`docs/COURSE_PROFILE_PLAN.md` §7 paper text:**
  - F4 now reads: "DEEMO detects the manuscript's field during Document Logic Analysis and adapts the panel to it; the student can correct it. The course stated at onboarding is used when practicing without a manuscript."
  - Ch. 3 data dictionary: `analyses.field`.
- Save this plan as `docs/MANUSCRIPT_FIELD_PLAN.md`.

## Verification

1. **Server:**
   ```bash
   cd server && bun run db:migrate && bunx tsc --noEmit && bun test src
   ```
2. **App:**
   ```bash
   cd client/mobile/Deemo && bunx tsc --noEmit && bunx expo lint && bun test src
   ```
3. **Phone:**
   - **Mismatch:**
     - Set the course to Education and upload a BSIT capstone.
     - The summary shows "Field: BSIT · Web/Mobile App" with the mismatch note.
     - Setup previews Engr. Santos (Tech).
     - The session matches.
   - **Correction:** change the field to Education on the summary; Setup re-seats to Dr. Santos (Pedagogy).
   - **Without a manuscript:** practicing on the sample paper uses the account course.
   - **Older project:** an existing project from before the change shows "not detected, using your course"; setting a field works.
4. **Merge:** with `feat/course-panel`, after the phone test.
