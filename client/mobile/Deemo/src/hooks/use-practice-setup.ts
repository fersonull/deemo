import { DEFAULT_WEIGHTS, DOMAINS, type Difficulty, type Domain, type Mode } from "@/constants";
import { createStore } from "@/utils/store";

// Last-used session setup, so returning users start where they left off (brief flow 1).
// ponytail: in-memory; persist with the rest of the session state once storage lands.
const store = createStore({
  mode: "PRE_ORAL" as Mode,
  domain: DOMAINS[0] as Domain,
  panelists: 1,
  followUps: 2, // per topic (plan F8 default)
  difficulty: "STANDARD" as Difficulty,
  projectId: null as string | null, // the manuscript the panel reads; null uses the built-in sample
  weights: DEFAULT_WEIGHTS, // rubric weights in percent, RUBRIC order
  weakFrom: null as string | null, // "Practice weak topics": the scored session it targets; Setup clears it
});

export const practiceSetup = { get: store.get, set: store.set };
export const usePracticeSetup = store.use;
