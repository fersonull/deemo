// Everything the page says about the product, with where it comes from. Demo slips are written from the app's
// built-in sample paper (server/src/modules/practice/domain/agenda.ts SAMPLE_ANALYSIS, "ReqTrack") and are labeled
// as sample on the page; nothing here is a testimonial, a count or an endorsement.

export const RELEASES_URL = "https://github.com/fersonull/deemo/releases";

export type Slip = {
  name: string; // the panelist (server/src/modules/practice/domain/panel.ts PERSONAS)
  role: string;
  stage: "Title" | "Pre-Oral" | "Final";
  q: string; // the question on the front
  follow: string; // the follow-up on the back (a session allows up to two per topic)
};

// The hero stack, top first. Each asks about something actually in the sample paper.
export const HERO_SLIPS: Slip[] = [
  {
    name: "Prof. Cruz",
    role: "Methodology",
    stage: "Pre-Oral",
    q: "Why only 30 respondents, and why purposive sampling?",
    follow: "Who were the 30, and how would random sampling change your weighted mean?",
  },
  {
    name: "Engr. Santos",
    role: "Technical",
    stage: "Pre-Oral",
    q: "How does a registrar update reach the student's phone in real time?",
    follow: "And if the student is offline when the record changes?",
  },
  {
    name: "Dr. Reyes",
    role: "Chair",
    stage: "Title",
    q: "Why build a new system instead of fixing the paper checklist?",
    follow: "Which part of the queue problem does ReqTrack still not solve?",
  },
  {
    name: "Prof. Cruz",
    role: "Methodology",
    stage: "Final",
    q: "Security scored lowest, at 3.10. What does that tell you?",
    follow: "What would you change before rolling it out past the main campus?",
  },
  {
    name: "Engr. Santos",
    role: "Technical",
    stage: "Final",
    q: "Why Firestore instead of a relational database for these records?",
    follow: "How do you stop one student from reading another's requirements?",
  },
  {
    name: "Dr. Reyes",
    role: "Chair",
    stage: "Title",
    q: "Your scope is the main campus only. Why draw the line there?",
    follow: "What would it take to bring the other campuses in?",
  },
];

// The readiness arithmetic the report shows (server/src/modules/scoring/domain/scoring.ts): levels 1–5 earn
// (level − 1) / 4, weights DEFAULT_WEIGHTS, one HIGH contradiction costs 5. Here: RS 76.25 × 8/8 − 5 = 71.25 → 71.
export const RUBRIC = [
  { name: "Content Mastery", weight: 25, level: 5 },
  { name: "Reasoning & Justification", weight: 20, level: 4 },
  { name: "Clarity & Organization", weight: 20, level: 4 },
  { name: "Consistency with Manuscript", weight: 20, level: 3 },
  { name: "Confidence & Delivery", weight: 15, level: 4 },
];
export const SCORE = { rubric: 76, answered: 8, planned: 8, penalty: 5, readiness: 71, band: "Nearly ready" };
