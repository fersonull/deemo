import { getAuth } from "../../../shared/auth/firebase";

// The Firebase side of an account: DEEMO writes the display name back and deletes the sign-in account.

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
