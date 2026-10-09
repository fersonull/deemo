import { createStore } from "@/utils/store";

// ponytail: in-memory stub, resets on reload. Firebase Auth persists the sign-in;
// consentAt/consentVersion and the tier move to the user record (plan §13) in Sprint 1.
const store = createStore({
  signedIn: false,
  consentAt: null as string | null,
  premium: false, // simulated freemium (addendum Q1); "upgrade" is a demo toggle
});

export const CONSENT_VERSION = "2026-10";

export const session = {
  consent: () => store.set({ consentAt: new Date().toISOString() }),
  signIn: () => store.set({ signedIn: true }),
  signOut: () => store.set({ signedIn: false }),
  upgrade: () => store.set({ premium: true }),
};

export const useSession = store.use;
