import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  getIdToken,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "@react-native-firebase/auth";
import {
  GoogleOneTapSignIn,
  isCancelledResponse,
  isNoSavedCredentialFoundResponse,
  isSuccessResponse,
} from "react-native-nitro-google-signin";

import { api } from "@/utils/api";
import { cleanName } from "@/utils/auth-form";
import { createStore } from "@/utils/store";

// The signed-in student (Firebase Auth) and their account record on the server (consent, simulated tier).
const store = createStore({
  ready: false, // Firebase has reported whether someone is already signed in
  signedIn: false,
  verified: false, // email confirmed (Google accounts always are); email sign-ups wait on the verify-email screen
  verifySentAt: 0, // when this device last sent a verification link (ms), for the resend cooldown
  avatar: null as string | null, // DiceBear seed from the account record (utils/avatar.ts)
  email: null as string | null,
  name: null as string | null, // Firebase display name: from Google, or typed at sign-up or in Profile
  allowTyping: true, // the typed-answer fallback in sessions (Profile setting)
  consentAt: null as string | null, // accepted on this device before sign-in; then recorded on the account
  accountLoaded: false, // the server's account record has arrived (false offline): only then can missing consent be told apart
  premium: false, // simulated freemium (addendum Q1)
});

// The consent text's version, recorded on the account. 2026-10.3: Google's AI only (the OpenAI backup was removed).
export const CONSENT_VERSION = "2026-10.3";

type Me = { name: string | null; premium: boolean; allowTyping: boolean; avatar: string; consentAt?: string };

const fromMe = (me: Me) => ({
  accountLoaded: true,
  name: me.name ?? store.get().name, // the server keeps the name (and writes it back to Firebase)
  premium: me.premium,
  allowTyping: me.allowTyping,
  avatar: me.avatar,
  consentAt: me.consentAt ?? store.get().consentAt,
});

const patchMe = (body: object) =>
  api<Me>("/me", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

// The account record lives on the server, which only serves verified emails (server/src/shared/auth/authenticate.ts).
async function loadAccount() {
  try {
    // Consent was given before there was an account to record it on.
    const me = store.get().consentAt
      ? await patchMe({ consentVersion: CONSENT_VERSION })
      : await api<Me>("/me");
    store.set(fromMe(me));
  } catch {
    // Offline or server down: the account record loads on the next sign-in.
  }
}

// Sign-in survives restarts: the first callback says whether someone is still signed in.
onAuthStateChanged(getAuth(), async (user) => {
  store.set({
    ready: true,
    signedIn: !!user,
    verified: !!user?.emailVerified,
    email: user?.email ?? null,
    name: user?.displayName ?? null,
    ...(!user && { premium: false, allowTyping: true, verifySentAt: 0, avatar: null, accountLoaded: false }),
  });
  if (user?.emailVerified) await loadAccount();
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
  // Re-read the account record (Premium, typed answers, consent) from the server, so changes made elsewhere, such as
  // an edit in the Firestore console, show up on pull to refresh. Signed out or offline: keep what we have.
  async refresh() {
    if (!store.get().signedIn) return;
    try {
      store.set(fromMe(await api<Me>("/me")));
    } catch {
      // The lists report being offline; the account keeps its last known state.
    }
  },

  // Saved on the account, so it follows the student; the switch flips right away and rolls back on failure.
  async setAllowTyping(allowTyping: boolean) {
    store.set({ allowTyping });
    try {
      store.set({ allowTyping: (await patchMe({ allowTyping })).allowTyping });
    } catch {
      store.set({ allowTyping: !allowTyping });
    }
  },

  // The face the student picked in Profile; saved on the account so teammates see it too.
  async setAvatar(avatar: string) {
    store.set({ avatar: (await patchMe({ avatar })).avatar });
  },

  // Delete my data (addendum Q9): the server removes everything and the sign-in account; then sign out here.
  async deleteEverything() {
    await api<unknown>("/me", { method: "DELETE" });
    store.set({ consentAt: null });
    await this.signOut().catch(() => {}); // the account is already gone server-side
  },

  // Consent before sign-in: kept on the device until there's an account to record it on (loadAccount).
  consent: () => store.set({ consentAt: new Date().toISOString() }),

  // Consent from a signed-in account that has none on record (an older account): recorded right away.
  async acceptConsent() {
    store.set(fromMe(await patchMe({ consentVersion: CONSENT_VERSION })));
  },

  signInWithEmail: (email: string, password: string) => signInWithEmailAndPassword(getAuth(), email.trim(), password),

  // A new email account gets the student's name (Google accounts come with one) and a verification link right away;
  // the root layout then shows the verify-email screen.
  async createAccount(name: string, email: string, password: string) {
    const { user } = await createUserWithEmailAndPassword(getAuth(), email.trim(), password);
    await this.setName(name).catch(() => {}); // Profile can set it later
    await sendEmailVerification(user)
      .then(() => store.set({ verifySentAt: Date.now() }))
      .catch(() => {}); // the verify-email screen can resend it
  },

  // The server owns the name: it saves it on the account and writes it to the Firebase user, so both stay in sync.
  // During sign-up the email isn't verified yet and the server won't answer, so the name goes on the Firebase user
  // directly; the server copies it onto the account on the first verified request.
  async setName(raw: string) {
    const user = getAuth().currentUser;
    const name = cleanName(raw);
    if (!user || !name) return;
    if (!user.emailVerified) {
      await updateProfile(user, { displayName: name });
      store.set({ name });
      return;
    }
    store.set({ name: (await patchMe({ name })).name ?? name });
    await reload(user).catch(() => {}); // the local Firebase user picks up the new display name
  },

  async resendVerification() {
    const user = getAuth().currentUser;
    if (!user) return;
    await sendEmailVerification(user);
    store.set({ verifySentAt: Date.now() });
  },

  // Has the student tapped the link yet? Firebase only knows after a reload. Once verified, a fresh ID token carries
  // email_verified to the server, then the account record loads and the root layout lets them in.
  async checkVerified() {
    const user = getAuth().currentUser;
    if (!user) return false;
    await reload(user);
    const fresh = getAuth().currentUser;
    if (!fresh?.emailVerified) return false;
    await getIdToken(fresh, true);
    await loadAccount();
    store.set({ verified: true });
    return true;
  },

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
      const me = await patchMe({ premium: true });
      store.set({ premium: me.premium });
    } catch {
      // Server unreachable: stay on the free tier; the locked choices still explain why.
    }
  },
};

export const useSession = store.use;
