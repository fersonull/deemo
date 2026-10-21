import { File, Paths } from "expo-file-system";

import { createStore } from "@/utils/store";

// Whether this phone has been through the welcome slides. Kept as an empty file, so signing out (or a restart while
// signed out) goes straight to sign-in instead of replaying the slides. Consent stays per account: an account
// without it still gets the consent screen after signing in.
const flag = () => new File(Paths.document, "onboarded");

function seen() {
  try {
    return flag().exists;
  } catch {
    return false;
  }
}

const store = createStore({ onboarded: seen() });

export const onboarding = {
  done() {
    if (store.get().onboarded) return;
    try {
      flag().create();
    } catch {
      // Storage unavailable: still skip the slides for the rest of this run.
    }
    store.set({ onboarded: true });
  },
};
export const useOnboarded = () => store.use().onboarded;
