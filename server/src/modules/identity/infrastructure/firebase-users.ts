import { getAuth } from "../../../shared/auth/firebase";

// The Firebase side of an account: DEEMO writes the display name back, disables (web admin) and deletes the sign-in account.

export async function setFirebaseName(uid: string, name: string) {
  await getAuth().updateUser(uid, { displayName: name });
}

export async function deleteFirebaseUser(uid: string) {
  try {
    await getAuth().deleteUser(uid);
  } catch (err) {
    // Already gone (deleted in the console, or a retry after a partial delete): nothing left to remove.
    if ((err as { code?: string }).code !== "auth/user-not-found") throw err;
  }
}

// Disabling also revokes the account's sessions, so the app's next request fails at once (authenticate checks revocation).
export async function setFirebaseDisabled(uid: string, disabled: boolean) {
  await getAuth().updateUser(uid, { disabled });
  if (disabled) await getAuth().revokeRefreshTokens(uid);
}
