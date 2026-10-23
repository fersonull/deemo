// What each plan allows (addendum Q1; Premium is simulated). The one place these limits live: manuscripts, groups
// and practice ask here instead of checking `premium` themselves.

export const PLAN = {
  // capMinutes: a safety cap only. A session ends when the panel's agenda is done (practice/domain/agenda.ts); the cap
  // stops one that runs away (a stalled student, a model that won't close) and bounds the Gemini cost.
  free: { manuscripts: 1, dailySessions: 5, capMinutes: 30, maxPanelists: 1, finalDefense: false },
  premium: { manuscripts: Infinity, dailySessions: Infinity, capMinutes: 60, maxPanelists: 3, finalDefense: true }, // unlimited practice
} as const;

export const planOf = (premium: boolean) => (premium ? PLAN.premium : PLAN.free);

export const MANUSCRIPT_LIMIT_MESSAGE = "The free plan holds one manuscript, including joined projects. Delete or leave one to add another.";

// Whether a practice setup fits the plan; the reason the student sees when it doesn't.
export function setupProblem(premium: boolean, setup: { mode: string; panelists: number }) {
  const plan = planOf(premium);
  if ((setup.mode === "FINAL" && !plan.finalDefense) || setup.panelists > plan.maxPanelists)
    return { status: 403, message: "That setup needs Premium." };
  return null;
}
