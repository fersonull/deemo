import type { AuthClaims } from "../../../shared/auth/authenticate";
import { getAuth } from "../../../shared/auth/firebase";
import { AppError } from "../../../shared/errors";
import { record } from "./actions";

// Who has the web admin's `admin` claim. The claim lives on the Firebase account, so the list is a scan of Firebase
// users (fine at DEEMO's size; ponytail: keep an admins table if there are ever thousands of accounts).
export async function listAdmins() {
  const admins: { uid: string; email: string | null; name: string | null; lastSignInAt: string | null }[] = [];
  let pageToken: string | undefined;
  do {
    const page = await getAuth().listUsers(1000, pageToken);
    for (const u of page.users)
      if (u.customClaims?.admin === true)
        admins.push({ uid: u.uid, email: u.email ?? null, name: u.displayName ?? null, lastSignInAt: u.metadata.lastSignInTime ?? null });
    pageToken = page.pageToken;
  } while (pageToken);
  return admins;
}

// The person must already have a Firebase account (they signed in to the app or the admin once). The claim reaches
// their token when they next sign in.
export async function grantAdmin(by: AuthClaims, email: string) {
  const user = await getAuth()
    .getUserByEmail(email)
    .catch(() => {
      throw new AppError(404, "No account with that email. They need to sign in to the app or the admin once first.");
    });
  if (user.customClaims?.admin === true) throw new AppError(409, "They're already an admin.");
  await getAuth().setCustomUserClaims(user.uid, { ...user.customClaims, admin: true });
  await record(by, "admin_granted", { id: user.uid, email: user.email ?? null });
}

// Not your own: there must always be someone left who can grant it back.
export async function revokeAdmin(by: AuthClaims, uid: string) {
  if (uid === by.uid) throw new AppError(403, "You can't remove your own admin access.");
  const user = await getAuth()
    .getUser(uid)
    .catch(() => {
      throw new AppError(404, "No such account.");
    });
  const { admin: _admin, ...rest } = user.customClaims ?? {};
  await getAuth().setCustomUserClaims(uid, rest);
  await getAuth().revokeRefreshTokens(uid); // signed out of the admin now, not when their token expires
  await record(by, "admin_revoked", { id: uid, email: user.email ?? null });
}
