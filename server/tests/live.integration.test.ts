/// <reference types="bun" />
import { expect, test } from "bun:test";

import { client, createStudent, fakeGemini, removeStudent, startServer } from "./helpers";

// Explicit opt-in (DEEMO_LIVE_INTEGRATION=1, a test DATABASE_URL): one disposable account, fake Gemini token mints.
test.skipIf(process.env.DEEMO_LIVE_INTEGRATION !== "1")(
  "live admission counts new rounds, reuses tokens, refunds failed mints, and keeps both user records in sync",
  async () => {
    const { prisma } = await import("../src/shared/prisma");
    const { getAuth } = await import("../src/shared/auth/firebase");
    const { sessionDay } = await import("../src/modules/practice/domain/live-start");
    let mintStatus = 200;
    const mints: any[] = [];
    const restoreFetch = fakeGemini((body) => {
      mints.push(body);
      return Response.json(mintStatus === 200 ? { name: `fixture-token-${mints.length}` } : { error: "fixture failure" }, { status: mintStatus });
    });
    const { base, close } = await startServer();
    const call = client(base);
    let uid: string | undefined;
    try {
      const student = await createStudent("Live");
      uid = student.uid;
      const setup = { mode: "TITLE", domain: "Data & AI", panelists: 1, minutes: 10 };
      const request = (body: object) => call(student.token, "/live/token", "POST", { ...setup, ...body });
      const counter = async () => (await prisma.user.findUniqueOrThrow({ where: { id: student.uid } })).sessionCount;

      expect((await request({})).status).toBe(400);
      expect((await request({ startId: "../bad" })).status).toBe(400);
      expect((await request({ startId: "long", minutes: 15 })).status).toBe(403);
      expect(mints).toHaveLength(0);
      const raced = await Promise.all(["a", "b", "c"].map((startId) => request({ startId })));
      expect(raced.map((r) => r.status).sort()).toEqual([200, 200, 429]);
      expect(mints).toHaveLength(2);
      const i = raced.findIndex((r) => r.status === 200);
      const id = ["a", "b", "c"][i]!;
      const saved = raced[i]!.body.token;
      expect((await request({ startId: id, resume: true })).body.token).toBe(saved);
      expect((await request({ startId: id })).body.token).toBe(saved); // lost HTTP reply
      expect(mints).toHaveLength(2);
      expect(await counter()).toBe(2);
      expect(mints.every((m) => m.uses === 1)).toBe(true);
      expect((await request({ startId: id, minutes: 5, resume: true })).status).toBe(400);
      expect((await request({ startId: "missing", resume: true })).status).toBe(404);

      await prisma.user.update({ where: { id: student.uid }, data: { sessionDay: "2026-10-09", sessionCount: 2 } }); // previous day resets
      mintStatus = 503;
      expect((await request({ startId: "failed" })).status).toBe(502);
      expect(await prisma.user.findUniqueOrThrow({ where: { id: student.uid } })).toMatchObject({ sessionDay: sessionDay(Date.now()), sessionCount: 0 });
      expect(await prisma.liveStart.findUnique({ where: { userId_id: { userId: student.uid, id: "failed" } } })).toBeNull();
      mintStatus = 200;
      expect((await request({ startId: "failed" })).status).toBe(200);
      expect(await counter()).toBe(1);

      await prisma.user.update({ where: { id: student.uid }, data: { premium: true, sessionCount: 9 } });
      expect((await request({ startId: "premium", mode: "FINAL", minutes: 25 })).status).toBe(200);
      expect((await request({ startId: "eleventh" })).status).toBe(429);
      expect((await request({ startId: "premium", mode: "FINAL", minutes: 25, resume: true })).status).toBe(200);
      const completed = await call(student.token, "/sessions", "POST", { ...setup, endedBy: "time", turns: [], lines: [], flags: [], durationMs: 600_000 });
      expect(completed.body.endedBy).toBe("time");

      // Two-way user sync: renaming in DEEMO renames the Firebase user; consent gates the AI routes.
      expect((await call(student.token, "/me", "PATCH", { name: "  Renamed   Student " })).body.name).toBe("Renamed Student");
      expect((await getAuth().getUser(student.uid)).displayName).toBe("Renamed Student");
      await prisma.user.update({ where: { id: student.uid }, data: { consentAt: null } });
      const gated = await request({ startId: "no-consent" });
      expect(gated).toMatchObject({ status: 403, body: { code: "CONSENT_REQUIRED" } });
      expect((await call(student.token, "/me", "PATCH", { consentVersion: "2026-10.3" })).body.consentAt).toBeString();
    } finally {
      restoreFetch();
      await close();
      if (uid) await removeStudent(uid);
    }
  },
  120_000,
);
