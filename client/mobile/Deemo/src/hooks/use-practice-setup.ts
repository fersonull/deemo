import { DEFAULT_WEIGHTS, DOMAINS, type Domain, type Mode } from "@/constants";
import { createStore } from "@/utils/store";

// Last-used session setup, so returning users start where they left off (brief flow 1).
// ponytail: in-memory; persist with the rest of the session state once storage lands.
const store = createStore({
  mode: "PRE_ORAL" as Mode,
  domain: DOMAINS[0] as Domain,
  panelists: 1,
  minutes: 10,
  coach: true, // Coach mode marks contradictions; Panel mode shows nothing (addendum Q3)
  projectId: null as string | null, // the manuscript the panel reads; null uses the built-in sample
  weights: DEFAULT_WEIGHTS, // rubric weights in percent, RUBRIC order
});

export const practiceSetup = { get: store.get, set: store.set };
export const usePracticeSetup = store.use;
