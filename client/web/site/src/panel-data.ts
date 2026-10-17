// The "Build your panel" demo's data — ported, data-only, from the real app logic (nothing invented for marketing):
//   server/src/modules/identity/domain/course.ts  (COURSES, COMPUTING)
//   server/src/modules/practice/domain/panel.ts    (COURSE_FOCUS, FIELD_EXPERT, PRIORITY → lineup, personaFor)
// Keep this file in step with those two if the real lineup or focus text ever changes.

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

export const COMPUTING: readonly Course[] = ["BSIT", "BSCS"];

export const COURSE_FOCUS: Record<Course, string> = {
  BSIT: "system design, implementation, testing and the evaluation of the system",
  BSCS: "algorithms and models, system design, implementation, testing and evaluation",
  Engineering: "design calculations, materials and components, prototype testing, safety and applicable standards",
  Maritime: "shipboard operations and procedures, safety, and maritime regulations and conventions (e.g. STCW, MARPOL)",
  Education: "the learners, the instructional design or intervention, and evidence of its effect on learning",
  "Nursing & Health": "the patients or participants, the protocol, health outcomes and ethics clearance",
  "Business & Accountancy": "the market, the financials, feasibility and how the business decisions are justified",
  "Hospitality & Tourism": "guest or tourist experience, service quality, operations and the industry setting",
  Criminology: "crime data and its sources, law enforcement practice, legal bases and policy implications",
  "Psychology & Social Sciences": "the constructs and theory, instruments and their validity and reliability, analysis and ethics",
  Other: "what a panel in the manuscript's own field would press on",
};

const FIELD_EXPERT: Record<Course, { title: string; role: string }> = {
  BSIT: { title: "Engr.", role: "Technical" },
  BSCS: { title: "Engr.", role: "Technical" },
  Engineering: { title: "Engr.", role: "Engineering" },
  Maritime: { title: "Capt.", role: "Maritime" },
  Education: { title: "Dr.", role: "Pedagogy" },
  "Nursing & Health": { title: "Dr.", role: "Clinical" },
  "Business & Accountancy": { title: "Dr.", role: "Business" },
  "Hospitality & Tourism": { title: "Prof.", role: "Industry" },
  Criminology: { title: "Dr.", role: "Criminology" },
  "Psychology & Social Sciences": { title: "Dr.", role: "Theory" },
  Other: { title: "Dr.", role: "Field expert" },
};

// Persona index = who they are (face, name); same order as PANEL_FACES in panel-face.ts.
export type Panelist = { persona: number; id: string; name: string; role: string; focus: string };

const PERSONAS: Omit<Panelist, "focus">[] = [
  { persona: 0, id: "Chair", name: "Dr. Reyes", role: "Chair" },
  { persona: 1, id: "Technical", name: "Engr. Santos", role: "Technical" },
  { persona: 2, id: "Methodology", name: "Prof. Cruz", role: "Methodology" },
];
const CHAIR_FOCUS = "problem, scope, significance, objectives and overall coherence";
const METHOD_FOCUS = "research design, sampling, instruments, statistics and evaluation";

function personaFor(index: number, course: Course): Panelist {
  if (index === 0) return { ...PERSONAS[0]!, focus: CHAIR_FOCUS };
  if (index === 2) return { ...PERSONAS[2]!, focus: METHOD_FOCUS };
  const { title, role } = FIELD_EXPERT[course];
  return { persona: 1, id: "Technical", name: `${title} Santos`, role, focus: COURSE_FOCUS[course] };
}

// Who sits when there are fewer than three: each course's personas from best fit down. Applied/build courses are
// judged on the work itself (field expert leads); applied-research courses pair the field expert with Methodology;
// for Psychology & Social Sciences the method is the substance; with no known field, the Chair leads.
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

// The panel for a given course and panelist count (1–3), in speaking order.
export function panelFor(course: Course, panelists = 3): Panelist[] {
  const seats = PRIORITY[course].slice(0, panelists).sort((a, b) => a - b);
  return seats.map((i) => personaFor(i, course));
}
