# General-purpose DEEMO with a course profile; the study stays BSIT at PMFTCI

## Context

Right now the app is hard-wired to BSIT capstones:
- The panel, analysis and scoring prompts all say "BSIT capstone".
- The domain picker is IT-only.
- The panel assumes the paper builds a system.

The group wants two separate scopes:
- **System scope:** DEEMO works for research defenses from any course and any kind of study.
- **Study scope:** design focus, testing and evaluation stay limited to 4th-year BSIT students at PMFTCI (40 respondents). The delimitation limits the paper's claims, not the app.

**Adaptive Domain Profiling (paper F4)** becomes a course profile:
- The student picks their **course** once, in an onboarding survey. They can change it in Profile.
- **Computing students** (BSIT, BSCS) also pick the study's **IT field** per project, as today: Web/Mobile, Networking, Data & AI, IoT, Information Systems.
- The course, and the IT field when there is one, change the panel's question focus and the feedback's emphasis.
- Today the domain is only a label in the prompt. With this change it actually steers the panel.

**Decisions (from the user):**
- a broad course list plus Other
- BSIT and BSCS keep the IT field per project
- the survey asks the course only

## Branch

This adds a column to `users` (data model) and a new onboarding gate, so it's risky work. It goes on **`feat/course-profile`** off `dev`, and merges after the user tests it on the phone.
- Needs a DB migration: `bun run db:migrate`.
- No native rebuild (JS only plus the server).

## 1. Courses and the IT field (shared constants)

**Server: `server/src/modules/identity/domain/course.ts`** (new, small)
```ts
export const COURSES = ["BSIT", "BSCS", "Engineering", "Maritime", "Education", "Nursing & Health",
  "Business & Accountancy", "Hospitality & Tourism", "Criminology", "Psychology & Social Sciences", "Other"] as const;
export type Course = (typeof COURSES)[number];
export const COMPUTING: readonly Course[] = ["BSIT", "BSCS"]; // these pick an IT field per project
```

**App: `client/mobile/Deemo/src/constants.ts`:** the same `COURSES` and `COMPUTING` (the app already mirrors `DOMAINS` this way).

**`DOMAINS`** (both `manuscript.ts` and the app's `constants.ts`):
- add `"General"` (fits `VarChar(30)`)
- used for every non-computing project and session, and as the fallback

## 2. Data and API (server)

- **`server/prisma/schema.prisma`:** add `course String? @db.VarChar(40)` to `User`. Migration `add_user_course`. A null course means the survey hasn't been answered yet.
- **Identity:**
  - **`domain/account.ts`:** add `course: Course | null` to the account and to the `/me` reply.
  - **`application/accounts.ts`:** the patch accepts `course`.
  - **`http/schemas.ts`:** add `course: z.enum(COURSES)` to `MeUpdate`.
- **Prompts get the course from the server, never from the client:**
  - **`practice/application/live-token.ts`:** passes the signed-in account's `course` into `liveSetup`.
  - **`scoring/application/sessions.ts`:** passes the account's `course` into `scoringPrompt`.
  - Sessions don't store the course. Changing it later only affects new sessions and scoring.
- **Upload (`manuscripts/http/routes.ts`) and setup (`SetupInput`):** `domain` stays `z.enum(DOMAINS)`. "General" is now valid.

## 3. Prompts (program-neutral, profile-driven)

**`server/src/modules/practice/domain/panel.ts`**
- **`COURSE_FOCUS: Record<Course, string>`:** what a panel in that course presses on. For example:
  - **BSIT/BSCS:** system design, implementation and testing.
  - **Engineering:** design calculations, materials, prototype testing, standards.
  - **Maritime:** operational safety, regulations (STCW, MARPOL), shipboard procedures.
  - **Education:** learners, instructional design, the intervention's effect.
  - **Nursing & Health:** patient outcomes, protocol, ethics clearance.
  - **Business:** market, financials, feasibility.
  - **Hospitality & Tourism:** guest experience, service quality, operations.
  - **Criminology:** crime data, law enforcement practice, policy.
  - **Psychology & Social Sciences:** constructs, instruments, validity, ethics.
  - **Other:** read the field from the manuscript.
- **`DOMAIN_FOCUS: Record<Domain, string>`:** the five IT fields. For example:
  - **Data & AI:** dataset, model, validation, accuracy.
  - **Web/Mobile:** UX, platform, API and database, data security.
  - **"General":** `""`.
- **Who the panel is (`who`):** "research defense panel for a {course} student in the Philippines". The course `Other` reads "a college student".
- **Field line:** replaces "Project domain: X":
  - with a computing course and an IT field: "Field: {course}, {domain}. Panels in this field press on: {DOMAIN_FOCUS}."
  - otherwise: "… press on: {COURSE_FOCUS}."
  - Always followed by: "Read the manuscript for the kind of study; stay grounded in it."
- **Technical persona:** takes the field's emphasis. Add: "If the study builds no system, ask about its tools, procedures, data and how its output works instead of architecture and code."
- **`MODE_FOCUS`:**
  - **Title:** "feasible for the study"
  - **Pre-Oral:** "system or study design"
  - **Final:** "the evaluation (ISO/IEC 25010 when the study uses it)"
- **`manuscriptFacts`:** label the line `Features / output:` and leave it out when empty.
- **Closing rule:** "like a real Filipino defense panel".
- **`buildPanelPrompt` / `liveSetup`:** take `course` as one more argument. Default `"BSIT"`, so tests and the sample manuscript keep working.

**`server/src/modules/scoring/domain/session.ts` (`scoringPrompt`)**
- "a research mock defense for a {course} student"
- one line: "Judge technical depth against what matters in this field: {focus}."
- The rubric weights are never changed.

**`server/src/modules/manuscripts/domain/manuscript.ts` (`ANALYSIS_PROMPT`)**
- "their research manuscript (a capstone, thesis or research paper from any program)"
- `features` becomes "the system's main features; if no system, its main output or intervention; "" if none"

**`server/src/modules/manuscripts/domain/rubric.ts`:** "their research defense panel".

## 4. App (JS only)

- **Course picker, `src/components/course-picker.tsx`** (new):
  - the `COURSES` list as a radio group
  - same look as the domain chips in `screens/setup/sheets.tsx`
  - one named export, used by both the survey and Profile
- **Onboarding survey:**
  - **Route `src/app/survey.tsx` with `src/screens/survey/index.tsx`:**
    - a title, "What's your course?"
    - one line: "The panel asks what a panel in your field would ask. You can change it in Profile."
    - the picker and a Continue button, which calls `PATCH /me {course}`
- **Gate in `src/app/_layout.tsx`:** `needsCourse = inside && accountLoaded && !needsConsent && !course`, shown with `Stack.Protected` the same way as `needsConsent`.
  - Order: welcome → sign-in → verify → consent → **survey** → home.
  - Existing accounts see it once, on their next open.
- **`hooks/use-session.ts`:**
  - `course` in the store, filled from `/me`
  - `setCourse(course)` sends the patch
  - reset on sign-out
- **Profile (`screens/profile/index.tsx`):** a "Course" row showing the current course. It opens a `Sheet` with the course picker, and saving calls `setCourse`.
- **IT field only for computing courses:**
  - **`screens/projects/upload-sheet.tsx`:** the domain picker, relabelled "IT field", shows only when `COMPUTING.includes(course)`. Otherwise the upload sends `"General"`.
  - **`screens/setup/index.tsx`:** the DOMAIN row follows the same rule.
  - **`hooks/use-practice-setup.ts`:** the default is `"General"` for non-computing courses.
- **Copy:**
  - **Analysis card:** "KEY FEATURES" becomes "FEATURES / OUTPUT", hidden when empty.
  - **Rubric screen:** "like most defense forms".
  - **Group card:** "capstone group" becomes "research group".

## 5. Admin (small)

- **`client/web/admin/components/user-detail.tsx`:** show the course ("Not answered yet" when null).
- **`server/src/modules/admin`:** add `course` to the user detail and the list.
- No course filter (YAGNI).

## 6. Docs (same commit as the work)

- **`CLAUDE.md`, first line:** "Voice-based AI mock panel for research defense practice (built and evaluated with BSIT capstone students at PMFTCI)". Keep `AGENTS.md` in step.
- **`docs/DEEMO_Mobile_App_Plan.md`:**
  - F4 now covers the course profile plus the IT field.
  - §1.4 and §5 say the system accepts any course; the delimitation becomes "not evaluated for other courses".
- **`docs/HANDOFF.md`:**
  - a Recent changes row and the next steps
  - gotchas:
    - the course comes from the account on the server, not the client
    - "General" is the domain for non-computing courses
    - don't re-add BSIT to prompts
- **`docs/TASKS.md`:** add and tick the item.

## 7. Paper text (the group edits the Google Doc)

- **Title:** unchanged.
- **Ch. 1 Scope and Delimitation:**
  > "DEEMO accepts research manuscripts from any course and supports system-building and non-system studies. This study, however, limits its development focus, testing and evaluation to 4th-year BSIT students of PMFTCI preparing for their capstone defense. Its effectiveness for other courses, year levels, graduate theses and dissertations was not evaluated and is outside the scope of this study."
- **Adaptive Domain Profiling (Ch. 1 scope, Ch. 3 feature list):**
  > "Adaptive Domain Profiling: during onboarding, the student states their course, which can be changed in Profile. Students in computing courses also select the IT field of each project (Web/Mobile Applications, Networking and Security, Data and AI, IoT/Hardware, Information Systems). DEEMO adjusts the panel's question focus and the emphasis of its feedback to this profile. The profile does not change the rubric weights. The panel adapts too: its second member is the field expert for the student's course, and with one or two panelists DEEMO seats the best-fit members for the course."
- **Target users / Significance:** "intended primarily for 4th-year BSIT students…"; future researchers can evaluate DEEMO with other courses.
- **Ch. 3:**
  - data dictionary: `users.course` (`VARCHAR(40)`, nullable)
  - ERD: the `users` attribute
  - Document Logic Analysis: "features or output"
- **Ch. 5 Recommendations:** evaluate with other courses and institutions.

## Not doing

- **Year level, school or stage in the survey:** the user chose course only.
- **Auto-detecting the course or field from the paper:** the student states it.
- **Course-specific rubric weights or personas:** the student's rubric stays theirs.
- **Blocking non-BSIT papers:** contradicts the system scope.

## Verification

1. **Server:**
   ```bash
   cd server && bun run db:migrate && bunx tsc --noEmit && bun test src
   ```
   - **`panel.test.ts`:**
     - no "BSIT" in a Nursing prompt
     - the Nursing prompt has the nursing focus
     - BSIT plus "Data & AI" has the dataset focus
     - the `Features / output` line is left out when empty
   - **Identity test:** `PATCH /me` accepts a course from the list and rejects any other value.
2. **App:**
   ```bash
   cd client/mobile/Deemo && bunx tsc --noEmit && bunx expo lint && bun test src
   ```
3. **Admin:**
   ```bash
   cd client/web/admin && bunx tsc --noEmit && bun run lint
   ```
4. **Phone (user):**
   - **Existing account:** sees the survey once, picks BSIT, lands on Home.
   - **Profile:** shows the course; changing it to Nursing hides the IT field in Upload and Setup.
   - **Nursing thesis:** no features card; the panel asks about protocol, ethics and outcomes, not code; the report doesn't mention systems.
   - **BSIT capstone:** "Data & AI" vs "Web/Mobile" changes the Technical panelist's questions; otherwise the same as today.
5. **Merge:** after the phone test, merge `feat/course-profile` into `dev` and delete the branch.
