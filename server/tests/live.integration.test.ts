/// <reference types="bun" />
import { expect, test } from "bun:test";

// Real Auth and Firestore, fake Gemini: one disposable account, removed in finally.
test.skipIf(process.env.DEEMO_LIVE_INTEGRATION !== "1")("live admission counts new rounds, reuses tokens and refunds failed mints", async () => {
  const { db, getAuth } = await import("../src/firebase");
  const { app } = await import("../src/index");
  const { sessionDay } = await import("../src/live-starts");
  const { parseSession } = await import("../src/sessions");
  const config = await Bun.file("../client/mobile/Deemo/google-services.json").json();
  const key = config.client[0].api_key[0].current_key;
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const realFetch = globalThis.fetch;
  let uid: string | undefined;
  let mintStatus = 200;
  const mints: any[] = [];
  globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    if (String(input) !== "https://generativelanguage.googleapis.com/v1beta/auth_tokens") return realFetch(input, init);
    mints.push(JSON.parse(String(init?.body)));
    return Response.json(mintStatus === 200 ? { name: `fixture-token-${mints.length}` } : { error: "fixture failure" }, { status: mintStatus });
  }) as typeof fetch;
  try {
    const user = await getAuth().createUser({ email: `live-${crypto.randomUUID()}@deemo.test` });
    uid = user.uid;
    const signed = await realFetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${key}`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: await getAuth().createCustomToken(uid), returnSecureToken: true }),
    });
    const { idToken } = await signed.json() as { idToken?: string };
    if (!idToken) throw new Error(`Fixture sign-in failed (${signed.status})`);
    const ref = db.collection("users").doc(uid);
    await ref.set({ premium: false });
    const setup = { mode: "TITLE", domain: "Data & AI", panelists: 1, minutes: 10 };
    const request = async (body: object) => {
      const r = await realFetch(base + "/live/token", {
        method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ ...setup, ...body }),
      });
      return { status: r.status, body: await r.json() as any };
    };
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
    expect((await ref.get()).data()?.sessionCount).toBe(2);
    expect(mints.every((m) => m.uses === 1)).toBe(true);
    expect((await request({ startId: id, minutes: 5, resume: true })).status).toBe(400);
    expect((await request({ startId: "missing", resume: true })).status).toBe(404);

    await ref.set({ sessionDay: "2026-10-09", sessionCount: 2 }, { merge: true }); // previous day resets
    mintStatus = 503;
    expect((await request({ startId: "failed" })).status).toBe(502);
    expect((await ref.get()).data()).toMatchObject({ sessionDay: sessionDay(Date.now()), sessionCount: 0 });
    expect((await ref.collection("liveStarts").doc("failed").get()).exists).toBe(false);
    mintStatus = 200;
    expect((await request({ startId: "failed" })).status).toBe(200);
    expect((await ref.get()).data()?.sessionCount).toBe(1);

    await ref.set({ premium: true, sessionCount: 9 }, { merge: true });
    expect((await request({ startId: "premium", mode: "FINAL", minutes: 25 })).status).toBe(200);
    expect((await request({ startId: "eleventh" })).status).toBe(429);
    expect((await request({ startId: "premium", mode: "FINAL", minutes: 25, resume: true })).status).toBe(200);
    const completed = await parseSession(uid, { ...setup, endedBy: "time", turns: [], lines: [], flags: [], durationMs: 600_000 });
    expect(completed?.endedBy).toBe("time");
  } finally {
    globalThis.fetch = realFetch;
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (uid) {
      await db.recursiveDelete(db.collection("users").doc(uid));
      await getAuth().deleteUser(uid);
    }
  }
}, 120_000);
