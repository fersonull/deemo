import { DOMAINS, type Domain, type Mode } from "@/constants";
import { createStore } from "@/utils/store";

// Last-used session setup, so returning users start where they left off (brief flow 1).
// ponytail: in-memory; persist with the rest of the session state once storage lands.
const store = createStore({
  mode: "PRE_ORAL" as Mode,
  domain: DOMAINS[0] as Domain,
  panelists: 1,
  minutes: 10,
  coach: true, // Coach mode marks contradictions; Panel mode shows nothing (addendum Q3)
});

export const practiceSetup = { set: store.set };
export const usePracticeSetup = store.use;
