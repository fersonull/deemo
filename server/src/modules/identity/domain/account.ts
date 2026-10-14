// A student's account (plan §13): synced from Firebase sign-in, plus their consent, plan and settings.

export type Account = {
  id: string; // the Firebase uid
  email: string | null;
  name: string | null;
  emailVerified: boolean;
  provider: string | null;
  avatar: string | null; // DiceBear seed the student picked; null = default from the uid
  premium: boolean; // simulated (addendum Q1)
  allowTyping: boolean;
  consentVersion: string | null;
  consentAt: Date | null;
  sessionDay: string | null;
  sessionCount: number;
  deletedAt: Date | null;
};

// What Firebase says about the signed-in user (shared/auth/authenticate.ts).
export type Claims = {
  uid: string;
  email: string | null;
  name: string | null;
  emailVerified: boolean;
  provider: string | null;
};

// The account fields that come from Firebase and have drifted. Email, verification and sign-in method follow Firebase.
// The name only fills an empty one: after that DEEMO owns it (PATCH /me writes both sides), so a token minted before a
// rename can't undo it.
export function claimsPatch(account: Account, claims: Claims) {
  const patch: Partial<Pick<Account, "email" | "name" | "emailVerified" | "provider">> = {};
  if (claims.email !== account.email) patch.email = claims.email;
  if (claims.emailVerified !== account.emailVerified) patch.emailVerified = claims.emailVerified;
  if (claims.provider !== account.provider) patch.provider = claims.provider;
  if (!account.name && claims.name) patch.name = claims.name;
  return patch;
}

// FNV-1a, 32-bit, of the uid: a stable default face that doesn't expose the uid to DiceBear or teammates.
export function defaultAvatar(uid: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < uid.length; i++) h = Math.imul(h ^ uid.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16).padStart(8, "0");
}

export const AVATAR = /^[a-z0-9]{1,32}$/;

// GET /me: what the app needs about its own account.
export function toMe(a: Account) {
  return {
    name: a.name,
    email: a.email,
    premium: a.premium,
    allowTyping: a.allowTyping,
    avatar: a.avatar ?? defaultAvatar(a.id),
    ...(a.consentVersion && { consentVersion: a.consentVersion }),
    ...(a.consentAt && { consentAt: a.consentAt.toISOString() }),
  };
}
export type Me = ReturnType<typeof toMe>;
