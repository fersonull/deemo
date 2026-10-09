import { useSyncExternalStore } from "react";

// ponytail: in-memory stub, resets on reload. Firebase Auth persists the sign-in
// and consentAt/consentVersion move to the user record (plan §13) in Sprint 1.
type Session = { signedIn: boolean; consentAt: string | null };

export const CONSENT_VERSION = "2026-10";

let state: Session = { signedIn: false, consentAt: null };
const listeners = new Set<() => void>();

function set(patch: Partial<Session>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export const session = {
  consent: () => set({ consentAt: new Date().toISOString() }),
  signIn: () => set({ signedIn: true }),
  signOut: () => set({ signedIn: false }),
};

export function useSession() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}
