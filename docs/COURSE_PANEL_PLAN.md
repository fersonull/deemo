# Course-adapted panel: the field expert, and who sits when there are 1 or 2 panelists

## Context

**Today, the panel ignores the course.** Seats are fixed by position:
- **1 panelist** (every Free user): always Dr. Reyes, the Chair, in the Kore voice.
- **2 panelists:** Reyes (Chair) and Engr. Santos (Technical).
- **3 panelists:** Reyes, Santos and Prof. Cruz (Methodology).

So a Nursing student is questioned by "Engr. Santos on the technical side" (session label "Santos · Tech"), whose listed focus is architecture and databases. That contradicts the course profile the prompt already carries.

**The user wants:**
1. The panel adapted to the student's course.
2. With **1 or 2 panelists**, the app picks the **best-fit** panelists for that course.
3. A clear story for what happens when the course changes in Profile.

**Unchanged:**
- The three people: names, faces and voices.
- Seat order logic, the sequential handover, the one-question rule.
- BSIT/BSCS sessions with 3 panelists.

This touches the live engine's display mapping and the reducer, so it goes on its own branch, **`feat/course-panel`** off `dev`. It merges after a phone test. No native rebuild, no migration.

## 1. The three personas (persona index = identity; fixed forever)

| # | Persona | Voice | Face | Asks about |
|---|---|---|---|---|
| 0 | Dr. Reyes, Chair | Kore | bun, glasses | problem, scope, significance, objectives, coherence |
| 1 | Santos, **field expert for the course** | Charon | side part | per course, below |
| 2 | Prof. Cruz, Methodology | Orus | beard | research design, sampling, instruments, statistics |

**Persona 1 by course** (the name stays Santos; title, role and focus change):

| Course | Title | Spoken role / app label | Focus |
|---|---|---|---|
| BSIT, BSCS | Engr. | Technical / Tech | architecture, database, security, implementation, testing (today's text) |
| Engineering | Engr. | Engineering / Engineering | design calculations, materials, prototype testing, standards, safety |
| Maritime | Capt. | Maritime / Maritime | shipboard operations, safety, regulations and conventions |
| Education | Dr. | Pedagogy / Pedagogy | learners, instructional design, the intervention and its effect |
| Nursing & Health | Dr. | Clinical / Clinical | patients, protocol, outcomes, ethics clearance |
| Business & Accountancy | Dr. | Business / Business | market, financials, feasibility |
| Hospitality & Tourism | Prof. | Industry / Industry | guest experience, service quality, operations |
| Criminology | Dr. | Criminology / Criminology | crime data, law enforcement practice, legal bases, policy |
| Psychology & Social Sciences | Dr. | Theory / Theory | constructs, theory, instruments and validity |
| Other | Dr. | Field expert / Field | the substance of the manuscript's own field |

The focus reuses `COURSE_FOCUS` in `panel.ts`. For computing courses, the IT field's `DOMAIN_FOCUS` goes to this persona.

## 2. Best fit for 1 and 2 panelists

Each course gets a **priority order** of the three personas:
- **1 panelist:** the first persona in the order.
- **2 panelists:** the first two, seated in the natural order (Chair → field → Methodology).
- **3 panelists:** all three, as today.

| Course group | Priority | 1 panelist | 2 panelists |
|---|---|---|---|
| BSIT, BSCS, Engineering, Maritime, Business & Accountancy, Hospitality & Tourism, Criminology (applied/build courses: the work itself is judged) | field, Chair, Methodology | Santos (field) | Reyes + Santos |
| Education, Nursing & Health (applied research: practice plus method) | field, Methodology, Chair | Santos (field) | Santos + Cruz |
| Psychology & Social Sciences (method is the substance) | Methodology, field, Chair | Cruz | Santos + Cruz |
| Other (field unknown) | Chair, Methodology, field | Reyes | Reyes + Cruz |

- **The solo panelist covers the whole defense:** the prompt adds "As the only panelist, also cover the problem and scope and how the study was done, briefly." The stage (`MODE_FOCUS`) still frames the questions.
- **Heads-up:** Free BSIT users, the study's population, will now meet **Engr. Santos (male voice)** instead of Dr. Reyes. That is the "best fit" rule applied. If you'd rather keep Reyes for the evaluation, BSIT's order can start with Chair; it's one row in the table.

**Shared rule:** `lineup(course, panelists): number[]` returns persona indices per seat, for example Nursing with 2 panelists gives `[1, 2]`.
- It lives in `server/src/modules/practice/domain/panel.ts` and as an identical copy in the app's `constants.ts`, the same way `COURSES` is mirrored.
- A test on each side pins the same table.

## 3. Server (`server/src/modules/practice/`)

**`domain/panel.ts`**
- `FIELD_EXPERT: Record<Course, { title; role }>` and `personaFor(index, course)`, which returns `{ id, role, name, focus }`. `id` stays `Chair` / `Technical` / `Methodology` for the tool.
- `PRIORITY: Record<Course, [number, number, number]>` and `lineup(course, n)`.
- **`buildPanelPrompt(setup, analysis, seat)`:** `me = personaFor(lineup(course, panelists)[seat], course)`; the same for `next` and the "questions in turn" list.
  - The intro and handover lines use the course name ("handing over to Capt. Santos").
  - Add: "When calling ask_question, panelist is your id: {me.id}."
  - Solo panelist: the cover-everything line.
- **`ask_question` enum unchanged** (`Chair` / `Technical` / `Methodology` = persona ids). The app's `ROLES` already maps them to persona indices 0–2.

**`application/live-token.ts`:** the voice becomes `PANEL_VOICES[lineup(course, panelists)[seat]]` instead of `PANEL_VOICES[seat]`, at all three return points.

## 4. App: seats vs personas

A **seat** is the order of speaking (engine, handover, `s.seat`). A **persona** is who sits there (face, name, voice, transcript). The engine stays in seats; display and transcript lines use personas.

- **`constants.ts`:** `FIELD_ROLE: Record<Course, string>`, `PRIORITY`, `lineup(course, n)`, and `panelLabel(persona, course)` (role label; only persona 1 varies).
- **`screens/session/index.tsx`:**
  - Compute `const seats = useState(() => lineup(course, setup.panelists))[0]` once at session start (a snapshot).
  - Render `<Panelist persona={seats[i]} …>` per seat.
  - The asker's seat is `seats.indexOf(question.panelist)`, falling back to `s.seat`. This replaces `question.panelist % count`.
- **`screens/session/panelist.tsx`:** takes `persona` (face, name, label with the course role) instead of `index`.
- **`screens/session/question-card.tsx`:** the asker and "X is taking over" read `PANEL[persona]` via the seat → persona map passed in.
- **`live/reducer.ts`:**
  - `LiveState` gets `seats: number[]` (initial state from the session).
  - Transcript lines store the **persona** index: `who = s.question?.panelist ?? s.seats[s.seat]`, and `seats[s.seat]` on a takeover.
  - So `transcript.tsx` and `results/parts.tsx` keep reading `PANEL[who].name`, correct forever.
  - Past sessions had seat = persona, so they're compatible.
- **`live/gemini-engine.ts`:**
  - Receives `seats` in its setup (from the session screen) and passes it to the handover note (`live/handover.ts`: names by persona).
  - The handover-name detection at `:551` uses `PANEL[seats[seat + 1]].name`.
  - Token requests are unchanged; the server derives the same lineup.
- **`live/mock-engine.ts`:** emits persona indices through the same lineup.

## 4b. Panel preview on the Setup screen

Under the PANELISTS segmented control (`screens/setup/index.tsx`), a preview row shows **who will sit** for the chosen count and the student's course.

- **Contents:** one small card per seat, in speaking order: the face (`PanelFace` from `components/panel-face`, about 40 px, mood `listening`), then the name with title ("Dr. Reyes", "Capt. Santos") and the short focus label ("Chair", "Maritime", "Methods").
- **Data:** `lineup(course, setup.panelists)` and `panelLabel(persona, course)` from `constants.ts`, the same data the session screen snapshots, so the preview always matches the session.
- **When the count changes (1 → 2 → 3):** the row updates.
  - Cards enter and leave with the app's existing motion: `riseIn` from `utils/motion.ts` and a Reanimated `layout` transition. Reduce motion turns it into a plain fade.
  - With 1 panelist, a line under the card says "Covers the whole defense."
- **Locked counts (Free):** tapping a locked 2 or 3 opens the upsell as today; the preview only shows the selected count.
- **Accessibility:** the row is one element labelled, for example, "Your panel: Capt. Santos, Maritime; Prof. Cruz, Methods."
- **New component:** `screens/setup/panel-preview.tsx` (private to Setup), one named export `PanelPreview({ course, panelists })`. The titled name comes from a shared `panelistName(persona, course)` in `constants.ts`, which the session label can reuse.

## 5. Changing the course in Profile

The course lives on the account. Each part reads it at a defined moment:

| What | When it reads the course | Effect of a change |
|---|---|---|
| Panel lineup, titles, voices, prompts | at session start: the app snapshots `seats`; the server derives the lineup at each token mint | the **next** session uses the new course; Profile can't be opened during a session (full screen, no tabs, back gesture off) |
| Scoring feedback | when scoring runs (seconds after the session) | the report matches the session; a later **Rescore** uses the course at that time (documented, acceptable) |
| Transcripts and reports | stored persona indices and names | never change: old sessions keep their panelists |
| Projects | the IT field was saved at upload | to non-computing: the IT field is ignored (`fieldFocus`), and Setup sends "General". To computing: old projects read "General", and Setup's IT FIELD row lets them pick one; new uploads ask for it |
| Setup screen | live from the session store | the IT FIELD row appears or disappears, and the panel preview re-seats, immediately |

- **Remaining edge:** a course changed on another device in the middle of a 3-panelist session would make later seats' tokens use the new lineup. Add a `ponytail:` comment in `live-token.ts` noting it, and the fix if it ever matters: snapshot the course on the live start.
- **Profile copy:** the Course sheet's line becomes "Your panel and its questions follow your course. Takes effect from your next session."

## 6. Tests

- **`server/.../panel.test.ts`:**
  - `lineup` for each course group and for counts 1 to 3.
  - The Nursing seat-1 prompt (2 panelists) is Prof. Cruz; the Nursing seat-0 prompt is "Dr. Santos, the Clinical", with no "architecture".
  - The Maritime handover names "Capt. Santos".
  - The BSIT 3-panelist prompts are unchanged.
  - The solo prompt has the cover-everything line.
- **`server/.../live-token`:** the voice for Psychology with 1 panelist is Orus.
- **App:**
  - **`constants.test.ts`:** the same `lineup` table as the server (parity).
  - **`reducer.test.ts`:** with `seats = [1, 2]`, lines carry persona indices and the asker's seat maps correctly.
  - **`gemini-engine.test.ts`:** the handover detection uses the persona name.

## 7. Docs (same commit)

- **`docs/HANDOFF.md`:**
  - Recent changes row.
  - Gotchas:
    - seat ≠ persona; `lineup` is mirrored on server and app
    - transcript `who` is a persona
    - the tool id for persona 1 stays `Technical`
- **`docs/COURSE_PROFILE_PLAN.md` §7:** F4 paper line: "The panel adapts to the course: the second member is the course's field expert, and with one or two panelists DEEMO seats the best-fit members for the course."

## Verification

1. **Server:**
   ```bash
   cd server && bunx tsc --noEmit && bun test src
   ```
2. **App:**
   ```bash
   cd client/mobile/Deemo && bunx tsc --noEmit && bunx expo lint && bun test src
   ```
3. **Mock engine** (`EXPO_PUBLIC_LIVE_ENGINE=mock`), course Nursing, 2 panelists: the faces are Santos · Clinical and Cruz · Methods; the handover goes Santos → Cruz; the transcript and results show the right names.
4. **Phone:**
   - **Setup preview:**
     - Switching 1 → 2 → 3 shows the right faces and names for the course.
     - After changing the course in Profile, Setup re-seats.
     - The session shows the same panel the preview showed.
   - **BSIT Free (1 panelist):** Engr. Santos, Charon voice, technical questions plus the basics.
   - **Psychology, 1 panelist:** Prof. Cruz.
   - **Nursing, 3 panelists:** Reyes, then Dr. Santos (Clinical), then Cruz, three voices.
   - **Course change in Profile:** the next session's lineup changes; an old report's transcript names are unchanged.
5. **Merge:** `feat/course-panel` into `dev` after the phone test; delete the branch.
