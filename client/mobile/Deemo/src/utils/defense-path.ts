import type { Mode } from "@/constants";

// The Defense Path (issue #13): the three stages in order, Title → Pre-Oral → Final, with how the student is doing in
// each. A stage is "ready" once its best score reaches the Defense-ready band (85, utils/bands.ts); the current stage
// is the first one that isn't ready yet.

export const READY_SCORE = 85;
const ORDER: Mode[] = ["TITLE", "PRE_ORAL", "FINAL"];

export type StageProgress = {
  mode: Mode;
  sessions: number; // practiced at this stage (scored or not)
  best: number | null; // best readiness score
  latest: number | null; // most recent scored readiness
  state: "ready" | "practicing" | "not-started";
  current: boolean; // the stage to work on next
};

export function defensePath(sessions: { mode: Mode; createdAt: string; score?: number }[]): StageProgress[] {
  const stages = ORDER.map((mode) => {
    const at = sessions.filter((s) => s.mode === mode);
    const scored = at.filter((s) => typeof s.score === "number").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const best = scored.length ? Math.max(...scored.map((s) => s.score!)) : null;
    const state: StageProgress["state"] = best !== null && best >= READY_SCORE ? "ready" : at.length ? "practicing" : "not-started";
    return { mode, sessions: at.length, best, latest: scored[0]?.score ?? null, state, current: false };
  });
  const next = stages.findIndex((s) => s.state !== "ready");
  if (next >= 0) stages[next]!.current = true;
  return stages;
}
