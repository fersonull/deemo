import { Router } from "express";

import { bodyOf, validate } from "../../../shared/validate";
import { listProjects } from "../../groups/application/access";
import { listSessions } from "../../scoring/application/sessions";
import { deleteAccount, updateAccount } from "../application/accounts";
import { toMe } from "../domain/account";
import { accountOf } from "./gates";
import { MeUpdate } from "./schemas";

export const identityRouter = Router();

identityRouter.get("/me", (req, res) => {
  res.json(toMe(accountOf(req)));
});

// Consent (with the version agreed to), the simulated upgrade, settings, the avatar and the name (also written to
// Firebase, so both sides stay in sync).
identityRouter.patch("/me", validate({ body: MeUpdate }), async (req, res) => {
  res.json(toMe(await updateAccount(accountOf(req), bodyOf(req, MeUpdate))));
});

// Download my data (plan §17 user rights): everything kept about the student, as one JSON file. Projects include the
// group ones they can open (with their own membership settings); other members' sessions are never included.
identityRouter.get("/me/export", async (req, res) => {
  const account = accountOf(req);
  const [projects, sessions] = await Promise.all([listProjects(account.id), listSessions(account.id)]);
  res.json({
    exportedAt: new Date().toISOString(),
    email: account.email,
    name: account.name,
    account: toMe(account),
    projects,
    sessions,
  });
});

// Delete my data (addendum Q9, RA 10173): manuscript analyses, transcripts, reports, the account and the Firebase
// sign-in account itself.
identityRouter.delete("/me", async (req, res) => {
  await deleteAccount(accountOf(req).id);
  res.status(204).end();
});
