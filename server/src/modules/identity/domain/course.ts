// The student's course, asked once in the onboarding survey and editable in Profile (Adaptive Domain Profiling, plan
// F4). Computing courses also pick the study's IT field per project (DOMAINS in manuscripts/domain/manuscript.ts).
// Same list as the app's constants.ts.

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

// A stored value that's no longer on the list (or none yet) reads as "Other".
export const courseOf = (c: string | null | undefined): Course => (COURSES as readonly string[]).includes(c ?? "") ? (c as Course) : "Other";
