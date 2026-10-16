import { AppError } from "../../../shared/errors";
import { claimsPatch, type Account, type Claims } from "../domain/account";
import { deleteFirebaseUser, setFirebaseDisabled, setFirebaseName } from "../infrastructure/firebase-users";
import { userRepo } from "../infrastructure/user-repo";

// Firebase → DEEMO: every authenticated request makes sure the account exists and follows Firebase (one read; a write
// only on first sight or when Firebase changed something).
export async function syncAccount(claims: Claims): Promise<Account> {
  const account = await userRepo.find(claims.uid);
  if (!account) return userRepo.create(claims);
  const patch = claimsPatch(account, claims);
  return Object.keys(patch).length ? userRepo.update(account.id, patch) : account;
}

export type AccountUpdate = {
  consentVersion?: string;
  premium?: boolean;
  allowTyping?: boolean;
  course?: string;
  avatar?: string;
  name?: string;
};

// Consent, the simulated upgrade, settings (typed answers, course), the avatar and the name. DEEMO → Firebase: a new name is written to the
// account first, then to Firebase; if Firebase refuses, the account goes back to the old name.
export async function updateAccount(account: Account, patch: AccountUpdate): Promise<Account> {
  const data: Partial<Account> = {};
  if (patch.consentVersion !== undefined) {
    data.consentVersion = patch.consentVersion;
    data.consentAt = new Date();
  }
  if (patch.premium === true) data.premium = true; // ponytail: demo toggle, no payments (addendum Q1)
  if (patch.allowTyping !== undefined) data.allowTyping = patch.allowTyping;
  if (patch.course !== undefined) data.course = patch.course;
  if (patch.avatar !== undefined) data.avatar = patch.avatar;
  const rename = patch.name !== undefined && patch.name !== account.name;
  if (rename) data.name = patch.name;
  if (!Object.keys(data).length) return account;

  const updated = await userRepo.update(account.id, data);
  if (rename) {
    try {
      await setFirebaseName(account.id, patch.name!);
    } catch (err) {
      console.error("firebase rename", account.id, err);
      await userRepo.update(account.id, { name: account.name });
      throw new AppError(502, "Couldn't save your name. Try again.");
    }
  }
  return updated;
}

// Delete my data (addendum Q9, RA 10173): the account is marked first, so no new work starts while the Firebase
// user and then every row (cascade) are removed. A retry after a partial failure finishes the job.
export async function deleteAccount(id: string) {
  await userRepo.update(id, { deletedAt: new Date() });
  await deleteFirebaseUser(id);
  await userRepo.remove(id);
}

export const accountsByIds = (ids: string[]) => userRepo.findMany(ids);

// Web admin (client/web/admin): Premium both ways, and turning Firebase sign-in off or on.
export const setPremium = (id: string, premium: boolean) => userRepo.update(id, { premium });
export const setSignInDisabled = setFirebaseDisabled;
// Give back today's practice sessions (testing and demos); the next start counts from zero again.
export const resetDailyCount = (id: string) => userRepo.update(id, { sessionCount: 0 });
