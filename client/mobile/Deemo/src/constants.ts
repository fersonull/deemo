// Adaptive Domain Profiling options (plan F4).
export const DOMAINS = [
  "Web/Mobile App",
  "Networking & Security",
  "Data & AI",
  "IoT/Hardware",
  "Information Systems",
  "General", // every non-computing course (profiled by the course alone)
] as const;

export type Domain = (typeof DOMAINS)[number];
export const IT_FIELDS = DOMAINS.filter((d) => d !== "General"); // what computing students pick from

// The student's course (onboarding survey, editable in Profile). Same list as server/src/modules/identity/domain/course.ts.
export const COURSES = [
  "BSIT",
  "BSCS",
  "Engineering",
  "Maritime",
  "Education",
  "Nursing & Health",
  "Business & Accountancy",
  "Hospitality & Tourism",
  "Criminology",
  "Psychology & Social Sciences",
  "Other",
] as const;
export type Course = (typeof COURSES)[number];
// The course the panel is set up for: the manuscript's field, else the student's own course (server live-token.ts
// uses the same rule).
export const profileCourse = (project: { analysis?: { field?: Course } } | undefined, course: Course | null) =>
  project?.analysis?.field ?? course;
export const isComputing = (c: Course | null) => c === "BSIT" || c === "BSCS"; // these pick an IT field per project

// Session data model values (plan §13).
export type Mode = "TITLE" | "PRE_ORAL" | "FINAL";

// How hard the panel pushes (plan F5a); scoring doesn't change with it.
export type Difficulty = "EASY" | "STANDARD" | "HARD";

export const DIFFICULTY_LABELS: Record<Difficulty, string> = { EASY: "Easy", STANDARD: "Standard", HARD: "Hard" };

export const MODE_LABELS: Record<Mode, string> = {
  TITLE: "Title Defense",
  PRE_ORAL: "Pre-Oral",
  FINAL: "Final Defense",
};

// Panel personas (addendum Q7), by persona index: who they are (face, voice, name). A seat is only the order they
// speak in; `lineup` says which persona sits in each seat. Transcript lines in a saved session hold persona indices.
export const PANEL = [
  { name: "Reyes", title: "Dr.", role: "Chair" },
  { name: "Santos", title: "Engr.", role: "Tech" },
  { name: "Cruz", title: "Prof.", role: "Methods" },
] as const;

// Santos is the field expert for the student's course (title and label). Same as FIELD_EXPERT in
// server/src/modules/practice/domain/panel.ts.
const FIELD_EXPERT: Record<Course, { title: string; role: string }> = {
  BSIT: { title: "Engr.", role: "Tech" },
  BSCS: { title: "Engr.", role: "Tech" },
  Engineering: { title: "Engr.", role: "Engineering" },
  Maritime: { title: "Capt.", role: "Maritime" },
  Education: { title: "Dr.", role: "Pedagogy" },
  "Nursing & Health": { title: "Dr.", role: "Clinical" },
  "Business & Accountancy": { title: "Dr.", role: "Business" },
  "Hospitality & Tourism": { title: "Prof.", role: "Industry" },
  Criminology: { title: "Dr.", role: "Criminology" },
  "Psychology & Social Sciences": { title: "Dr.", role: "Theory" },
  Other: { title: "Dr.", role: "Field" },
};
const expert = (persona: number, course: Course | null) => (persona === 1 ? FIELD_EXPERT[course ?? "BSIT"] : null);
export const panelLabel = (persona: number, course: Course | null) => expert(persona, course)?.role ?? PANEL[persona]!.role;
export const panelistName = (persona: number, course: Course | null) =>
  `${expert(persona, course)?.title ?? PANEL[persona]!.title} ${PANEL[persona]!.name}`;

// Who sits with fewer than three panelists: each course's personas from best fit down (0 Chair, 1 field expert,
// 2 Methodology), seated in panel order. Same table as PRIORITY in server/src/modules/practice/domain/panel.ts.
const PRIORITY: Record<Course, readonly [number, number, number]> = {
  BSIT: [1, 0, 2],
  BSCS: [1, 0, 2],
  Engineering: [1, 0, 2],
  Maritime: [1, 0, 2],
  "Business & Accountancy": [1, 0, 2],
  "Hospitality & Tourism": [1, 0, 2],
  Criminology: [1, 0, 2],
  Education: [1, 2, 0],
  "Nursing & Health": [1, 2, 0],
  "Psychology & Social Sciences": [2, 1, 0],
  Other: [0, 2, 1],
};
// The persona in each seat, e.g. Nursing with two panelists: [1, 2].
export const lineup = (course: Course | null, panelists: number) => PRIORITY[course ?? "BSIT"].slice(0, panelists).sort((a, b) => a - b);

// DEEMO server. Default works over USB with `adb reverse tcp:3000 tcp:3000`; set EXPO_PUBLIC_API_URL for Wi-Fi.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

// Default defense rubric (addendum Q5). Mirrors server/src/modules/scoring/domain/scoring.ts CRITERIA; weights in percent.
export const RUBRIC = [
  { name: "Content Mastery", desc: "Knows the study inside out" },
  { name: "Reasoning & Justification", desc: "Justifies the choices made" },
  { name: "Clarity & Organization", desc: "Answers in a clear order" },
  { name: "Consistency with Manuscript", desc: "Matches the manuscript" },
  { name: "Confidence & Delivery", desc: "Prompt start, steady pace, few fillers" },
] as const;

export const DEFAULT_WEIGHTS = [25, 20, 20, 20, 15];
