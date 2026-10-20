import { Router } from "express";
import { z } from "zod";

import { claimsOf } from "../../../shared/auth/authenticate";
import { rateLimit } from "../../../shared/rate-limit";
import { bodyOf, validate } from "../../../shared/validate";
import { accountOf } from "../../identity/http/gates";
import { audienceCount, deleteNotices, dropPushToken, readNotice, savePushToken, sendNotice, sentNotices } from "../application/notices";
import { AudienceInput, DeleteNoticesInput, InboxQuery, NoticeId, NoticeInput } from "../domain/notice";
import { PushTokenInput } from "../domain/push";
import { inbox, noticeHub } from "../infrastructure/notice-repo";

export const noticesRouter = Router();
noticesRouter.get("/notices", validate({ query: InboxQuery }), async (req, res) => {
  res.json(await inbox(accountOf(req).id, (res.locals.query as z.infer<typeof InboxQuery>).before));
});

noticesRouter.post("/notices/:id/read", validate({ params: NoticeId }), async (req, res) => {
  await readNotice(accountOf(req).id, (req.params as z.infer<typeof NoticeId>).id);
  res.json({ ok: true });
});

noticesRouter.put("/notices/push-token", validate({ body: PushTokenInput }), async (req, res) => {
  await savePushToken(accountOf(req).id, bodyOf(req, PushTokenInput).token);
  res.json({ ok: true });
});
noticesRouter.delete("/notices/push-token", validate({ body: PushTokenInput }), async (req, res) => {
  await dropPushToken(accountOf(req).id, bodyOf(req, PushTokenInput).token);
  res.json({ ok: true });
});

noticesRouter.get("/notices/stream", (req, res) => {
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" });
  res.flushHeaders();
  const refresh = () => {
    if (!res.writableEnded && !res.write("data: sync\n\n")) res.end();
  };
  const unsubscribe = noticeHub.subscribe(accountOf(req).id, refresh);
  const heartbeat = setInterval(() => { if (!res.writableEnded && !res.write(": keepalive\n\n")) res.end(); }, 15_000);
  // Re-authenticate every minute, including revoked/disabled Firebase accounts.
  const lifetime = setTimeout(() => res.end(), 60_000);
  res.on("close", () => { unsubscribe(); clearInterval(heartbeat); clearTimeout(lifetime); });
  refresh(); // includes notices sent while closed, or between a REST read and subscribing
});

// Mounted behind the existing /admin authenticate + requireAdmin chain and CORS middleware.
export const adminNoticesRouter = Router();
const Page = z.object({ page: z.coerce.number().int().min(1).max(10_000).default(1) });
adminNoticesRouter.get("/admin/notices", validate({ query: Page }), async (_req, res) => {
  res.json(await sentNotices((res.locals.query as z.infer<typeof Page>).page));
});
adminNoticesRouter.delete("/admin/notices", validate({ body: DeleteNoticesInput }), async (req, res) => {
  res.json(await deleteNotices(claimsOf(req), bodyOf(req, DeleteNoticesInput).ids));
});
adminNoticesRouter.post("/admin/notices", rateLimit("noticeSend", { who: (req) => claimsOf(req).uid }), validate({ body: NoticeInput }), async (req, res) => {
  res.status(201).json(await sendNotice(claimsOf(req), bodyOf(req, NoticeInput)));
});
adminNoticesRouter.post("/admin/notices/audience", validate({ body: AudienceInput }), async (req, res) => {
  res.json({ count: await audienceCount(bodyOf(req, AudienceInput).segment) });
});
