// What each plan allows (addendum Q1; Premium is simulated). The one place these limits live: manuscripts, groups
// and practice ask here instead of checking `premium` themselves.

export const PLAN = {
  free: { manuscripts: 1, dailySessions: 2, maxMinutes: 10, maxPanelists: 1, finalDefense: false },
  premium: { manuscripts: Infinity, dailySessions: 10, maxMinutes: 25, maxPanelists: 3, finalDefense: true },
} as const;

export const planOf = (premium: boolean) => (premium ? PLAN.premium : PLAN.free);

export const MANUSCRIPT_LIMIT_MESSAGE = "The free plan holds one manuscript, including joined projects. Delete or leave it first.";

// Whether a practice setup fits the plan; the reason the student sees when it doesn't.
export function setupProblem(premium: boolean, setup: { mode: string; panelists: number; minutes: number }) {
  const plan = planOf(premium);
  if (setup.minutes > PLAN.premium.maxMinutes) return { status: 400, message: "Practice rounds can last up to 25 minutes." };
  if ((setup.mode === "FINAL" && !plan.finalDefense) || setup.panelists > plan.maxPanelists || setup.minutes > plan.maxMinutes)
    return { status: 403, message: "That setup needs Premium." };
  return null;
}
