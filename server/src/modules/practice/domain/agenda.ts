import type { Course } from "../../identity/domain/course";
import type { Analysis } from "../../manuscripts/domain/manuscript";
import { fieldFocus, lineup, type Mode } from "./panel";

// What the panel must cover before it may end (no question count, no target length): one main topic per item, built
// from the defense stage and the manuscript. The prompt lists each seat's items, the app refuses end_session until all
// are asked, and scoring's coverage divides by the same list, so all three use this one builder.
export type AgendaItem = { id: string; label: string; brief: string; seat: number };

// Personas: 0 Chair, 1 field expert, 2 Methodology (PERSONAS in panel.ts).
type Owner = 0 | 1 | 2;
type Spec = {
  id: string;
  label: string;
  ask: string; // what the panelist probes
  owner: Owner;
  field?: true; // add the field's own emphasis (fieldFocus) to the brief
  needs?: (a: Analysis) => string; // the analysis field the topic stands on; empty = skip the topic
};

const STAGES: Record<Mode, Spec[]> = {
  TITLE: [
    { id: "problem", label: "Problem and title", owner: 0, ask: "Is the problem real and specific, and does the title say what the study does?", needs: (a) => a.problem },
    { id: "objectives", label: "Objectives", owner: 0, ask: "Are the objectives specific, measurable and achievable within the study?", needs: (a) => a.objectives },
    { id: "scope", label: "Scope and feasibility", owner: 0, ask: "Is the scope realistic for the time and resources, and are the limits clear?", needs: (a) => a.scope },
    { id: "novelty", label: "Novelty and significance", owner: 0, ask: "What is new compared with existing work, and who benefits?" },
    { id: "solution", label: "Proposed output", owner: 1, field: true, ask: "What the study will build or produce, and why that approach fits the problem", needs: (a) => a.features || a.method },
    { id: "approach", label: "Feasibility of the approach", owner: 2, ask: "Can the planned approach realistically be carried out? Ask about feasibility only, not methodology details." },
  ],
  PRE_ORAL: [
    { id: "problem", label: "Problem and objectives", owner: 0, ask: "Is the problem well grounded, and do the objectives follow from it?", needs: (a) => a.problem || a.objectives },
    { id: "scope", label: "Scope and limitations", owner: 0, ask: "Are the scope and limitations stated and justified?", needs: (a) => a.scope || a.limits },
    { id: "design", label: "Design of the system or study", owner: 1, field: true, ask: "How the system or study output is designed and why", needs: (a) => a.features || a.method },
    { id: "implementation", label: "Tools and implementation", owner: 1, field: true, ask: "The tools, platforms, procedures or materials used and how they will be carried out", needs: (a) => a.method },
    { id: "research-design", label: "Research design", owner: 2, ask: "Which research design is used, and is it the right one for the objectives?", needs: (a) => a.method },
    { id: "sampling", label: "Sampling and respondents", owner: 2, ask: "Who the respondents are, how many, how they are chosen, and why.", needs: (a) => a.method },
    { id: "instruments", label: "Instruments", owner: 2, ask: "What instruments collect the data, and are they valid and reliable?", needs: (a) => a.method },
    { id: "analysis", label: "Data analysis", owner: 2, ask: "How the data will be analyzed and interpreted (statistics, scales).", needs: (a) => a.method },
  ],
  FINAL: [
    { id: "objectives-met", label: "Objectives met", owner: 0, ask: "Was each objective met, and where is the evidence?", needs: (a) => a.objectives },
    { id: "results", label: "Results", owner: 1, field: true, ask: "What the results show and whether the system or output works as claimed", needs: (a) => a.results },
    { id: "evaluation", label: "Evaluation and testing", owner: 2, ask: "How the study was evaluated or tested, with whom, and how rigorously.", needs: (a) => a.results },
    { id: "interpretation", label: "Interpretation and statistics", owner: 2, ask: "Are the figures read correctly, and do they support the claims? Ask for exact values.", needs: (a) => a.results },
    { id: "conclusions", label: "Conclusions", owner: 0, ask: "Do the conclusions follow from the results without overreaching?", needs: (a) => a.results },
    { id: "recommendations", label: "Recommendations", owner: 0, ask: "Are the recommendations grounded in the findings and the limitations?", needs: (a) => a.results },
    { id: "limitations", label: "Limitations in hindsight", owner: 0, ask: "What limited the study, and what would they do differently?", needs: (a) => a.limits || a.results },
  ],
};

// An absent persona's topics go to whoever covers that ground next best.
const FALLBACK: Record<Owner, Owner[]> = { 0: [1, 2], 1: [0, 2], 2: [1, 0] };

export function buildAgenda(
  analysis: Analysis | null,
  { mode, course = "BSIT", domain = "General", panelists }: { mode: Mode; course?: Course; domain?: string; panelists: number },
): AgendaItem[] {
  const a = analysis ?? SAMPLE_ANALYSIS;
  const seats = lineup(course, panelists);
  const seatOf = (owner: Owner) => {
    for (const p of [owner, ...FALLBACK[owner]]) {
      const i = seats.indexOf(p);
      if (i >= 0) return i;
    }
    return 0;
  };
  const { field, focus } = fieldFocus(course, domain);
  return STAGES[mode]
    .filter((s) => !s.needs || s.needs(a).trim())
    .map((s) => ({
      id: s.id,
      label: s.label,
      brief: s.field ? `${s.ask}. A ${field} panel presses on ${focus}.` : s.ask,
      seat: seatOf(s.owner),
    }))
    .sort((x, y) => x.seat - y.seat); // stable: each seat keeps the stage's order
}

// The built-in sample paper (SAMPLE_MANUSCRIPT in panel.ts) as an analysis, for sessions without an upload.
export const SAMPLE_ANALYSIS: Analysis = {
  title: "ReqTrack: An Enrollment Requirements Tracking System for PMFTCI",
  problem: "Students queue at the registrar to check paper requirement checklists; staff update records by hand.",
  objectives: "Let students see missing requirements on their phone; let the registrar update records in real time; evaluate the system using ISO/IEC 25010.",
  method: "Agile (Scrum), descriptive-developmental design; 30 respondents by purposive sampling; ISO/IEC 25010 questionnaire, 4-point Likert scale, weighted mean.",
  scope: "PMFTCI main campus only.",
  features: "React Native app for students, web dashboard for registrar staff, Firebase Firestore and Authentication.",
  limits: "No online payment; Android only.",
  results: "Overall weighted mean 3.42 (Very Acceptable); lowest characteristic is Security (3.10).",
  facts: [],
  unsure: [],
};
