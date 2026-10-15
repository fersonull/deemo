import { Router } from "express";
import { z } from "zod";

import { rateLimit } from "../../../shared/rate-limit";
import { bodyOf, validate } from "../../../shared/validate";
import { accountOf } from "../../identity/http/gates";
import { CODE } from "../domain/group";
import { createGroup, groupReadiness, joinGroup, leaveGroup, updateMember } from "../application/groups";

const ProjectParams = z.object({ id: z.string() });
const CodeParams = z.object({ code: z.string().regex(CODE, "This group project is no longer available.") });
const JoinBody = z.object({
  code: z
    .string({ error: "Enter the six-character group code." })
    .trim()
    .toUpperCase()
    .regex(CODE, "Enter the six-character group code."),
});
const MemberBody = z.object({
  shareScore: z.boolean({ error: "shareScore must be true or false." }).optional(),
  focusArea: z.string().max(160, "Keep your focus area under 160 characters.").transform((s) => s.trim()).optional(),
});

export const groupsRouter = Router();

groupsRouter.post("/projects/:id/group", validate({ params: ProjectParams }), async (req, res) => {
  res.json(await createGroup(accountOf(req), req.params.id as string));
});

groupsRouter.post(
  "/groups/join",
  rateLimit("groupJoin", { message: "Too many code attempts. Wait a minute and try again." }),
  validate({ body: JoinBody }),
  async (req, res) => {
    res.json(await joinGroup(accountOf(req), bodyOf(req, JoinBody).code));
  },
);

groupsRouter.get("/groups", async (req, res) => {
  res.json(await groupReadiness(accountOf(req).id));
});

groupsRouter.patch("/groups/:code/me", validate({ params: CodeParams, body: MemberBody }), async (req, res) => {
  await updateMember(accountOf(req).id, req.params.code as string, bodyOf(req, MemberBody));
  res.status(204).end();
});

groupsRouter.delete("/groups/:code/me", validate({ params: CodeParams }), async (req, res) => {
  await leaveGroup(accountOf(req).id, req.params.code as string);
  res.status(204).end();
});
