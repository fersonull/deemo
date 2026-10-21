import { File, Paths } from "expo-file-system";

import { DEFAULT_WEIGHTS, DOMAINS, type Difficulty, type Domain, type Mode } from "@/constants";
import { createStore } from "@/utils/store";

// Last-used session setup, so returning users start where they left off (brief flow 1). Saved as a small JSON file
// so it survives a restart; cleared on sign-out, since its manuscript and Premium choices belong to that account.
const DEFAULTS = {
  mode: "PRE_ORAL" as Mode,
  domain: DOMAINS[0] as Domain,
  panelists: 1,
  followUps: 2, // per topic (plan F8 default)
  difficulty: "STANDARD" as Difficulty,
  projectId: null as string | null, // the manuscript the panel reads; null uses the built-in sample
  weights: DEFAULT_WEIGHTS, // rubric weights in percent, RUBRIC order
  weakFrom: null as string | null, // "Practice weak topics": the scored session it targets; Setup clears it
};
type Setup = typeof DEFAULTS;

const file = () => new File(Paths.document, "practice-setup.json");

function load(): Setup {
  try {
    const f = file();
    if (!f.exists) return DEFAULTS;
    // weakFrom targets one report, so it never outlives the run that set it.
    return { ...DEFAULTS, ...(JSON.parse(f.textSync()) as Partial<Setup>), weakFrom: null };
  } catch {
    return DEFAULTS;
  }
}

function save(setup: Setup | null) {
  try {
    const f = file();
    if (setup) f.write(JSON.stringify(setup));
    else if (f.exists) f.delete();
  } catch {
    // Storage unavailable: the setup just doesn't survive a restart.
  }
}

const store = createStore(load());

export const practiceSetup = {
  get: store.get,
  set(patch: Partial<Setup>) {
    store.set(patch);
    save(store.get());
  },
  reset() {
    store.set(DEFAULTS);
    save(null);
  },
};
export const usePracticeSetup = store.use;
