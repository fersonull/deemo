import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
} from "@react-native-firebase/auth";
import {
  GoogleOneTapSignIn,
  isCancelledResponse,
  isNoSavedCredentialFoundResponse,
  isSuccessResponse,
} from "react-native-nitro-google-signin";

import { api } from "@/utils/api";
import { createStore } from "@/utils/store";

// The signed-in student (Firebase Auth) and their account record on the server (consent, simulated tier).
const store = createStore({
  ready: false, // Firebase has reported whether someone is already signed in
  signedIn: false,
  email: null as string | null,
  consentAt: null as string | null, // accepted on this device before sign-in; then recorded on the account
  premium: false, // simulated freemium (addendum Q1)
});

export const CONSENT_VERSION = "2026-10";

type Me = { premium: boolean; consentAt?: string };

// Sign-in survives restarts: the first callback says whether someone is still signed in.
onAuthStateChanged(getAuth(), async (user) => {
  store.set({ ready: true, signedIn: !!user, email: user?.email ?? null, ...(!user && { premium: false }) });
  if (!user) return;
  try {
    // Consent was given before there was an account to record it on.
    const me = store.get().consentAt
      ? await api<Me>("/me", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ consentVersion: CONSENT_VERSION }),
        })
      : await api<Me>("/me");
    store.set({ premium: me.premium, consentAt: me.consentAt ?? store.get().consentAt });
  } catch {
    // Offline or server down: the account record loads on the next sign-in.
  }
});

let googleReady = false;
function google() {
  // Reads the web client ID from google-services.json (default_web_client_id).
  if (!googleReady) GoogleOneTapSignIn.configure({ webClientId: "autoDetect" });
  googleReady = true;
  return GoogleOneTapSignIn;
}

// Firebase error codes, in words a student can act on.
export function authMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  if (/invalid-credential|wrong-password|user-not-found/.test(code)) return "That email and password don't match.";
  if (code.includes("email-already-in-use")) return "That email already has an account. Sign in instead.";
  if (code.includes("weak-password")) return "Use a password with at least 6 characters.";
  if (code.includes("invalid-email")) return "Check the email address.";
  if (code.includes("too-many-requests")) return "Too many tries. Wait a minute, then try again.";
  if (code.includes("network-request-failed")) return "No connection. Check your internet and try again.";
  return e instanceof Error ? e.message : "Something went wrong. Try again.";
}

export const session = {
  consent: () => store.set({ consentAt: new Date().toISOString() }),

  signInWithEmail: (email: string, password: string) => signInWithEmailAndPassword(getAuth(), email.trim(), password),

  createAccount: (email: string, password: string) => createUserWithEmailAndPassword(getAuth(), email.trim(), password),

  resetPassword: (email: string) => sendPasswordResetEmail(getAuth(), email.trim()),

  // Credential Manager account picker → Google ID token → Firebase sign-in. False if the student backed out.
  async signInWithGoogle() {
    const g = google();
    await g.checkPlayServices();
    let r = await g.signIn();
    if (isNoSavedCredentialFoundResponse(r)) r = await g.createAccount();
    if (isNoSavedCredentialFoundResponse(r)) r = await g.presentExplicitSignIn();
    if (isCancelledResponse(r)) return false;
    if (!isSuccessResponse(r) || !r.data?.idToken) throw new Error("Google sign-in didn't finish. Try again.");
    await signInWithCredential(getAuth(), GoogleAuthProvider.credential(r.data.idToken));
    return true;
  },

  async signOut() {
    await google()
      .signOut()
      .catch(() => {}); // not signed in with Google
    await signOut(getAuth());
  },

  // ponytail: demo upgrade, no payments (addendum Q1). The server records it, so its limits follow.
  async upgrade() {
    try {
      const me = await api<Me>("/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ premium: true }),
      });
      store.set({ premium: me.premium });
    } catch {
      // Server unreachable: stay on the free tier; the locked choices still explain why.
    }
  },
};

export const useSession = store.use;
