/// <reference types="bun" />
import { expect, spyOn, test } from "bun:test";
import type { DocumentReference, Transaction } from "firebase-admin/firestore";
import { db } from "./firebase";
import { finishLiveStart, reserveLiveStart, sessionDay } from "./live-starts";
import { parseSetup } from "./panel";

test("daily starts: caps, retries, refunds, leases and Manila midnight", async () => {
  // Serial transactions with staged writes; no Firebase or Gemini requests.
  const docs = new Map<string, Record<string, any>>();
  let queue = Promise.resolve();
  const transaction = spyOn(db, "runTransaction").mockImplementation(((update: (tx: Transaction) => Promise<unknown>) => {
    const run = queue.then(async () => {
      const writes: (() => void)[] = [];
      const tx = {
        get: async (ref: DocumentReference) => ({ data: () => docs.get(ref.path) }),
        set: (ref: DocumentReference, data: object, options?: { merge?: boolean }) =>
          writes.push(() => docs.set(ref.path, options?.merge ? { ...docs.get(ref.path), ...data } : { ...data })),
        update: (ref: DocumentReference, data: object) => writes.push(() => docs.set(ref.path, { ...docs.get(ref.path), ...data })),
        delete: (ref: DocumentReference) => writes.push(() => { docs.delete(ref.path); }),
      };
      const result = await update(tx as unknown as Transaction);
      writes.forEach((write) => write());
      return result;
    });
    queue = run.then(() => {}, () => {});
    return run;
  }) as typeof db.runTransaction);
  let now = Date.parse("2026-10-10T15:59:00Z");
  const clock = spyOn(Date, "now").mockImplementation(() => now);
  const setup = parseSetup({ mode: "TITLE", domain: "Data & AI", panelists: 1, minutes: 10 })!;
  const start = (uid: string, id: string, resume = false) => reserveLiveStart(uid, id, setup, resume);
  try {
    expect(sessionDay(now)).toBe("2026-10-10");
    expect(sessionDay(Date.parse("2026-10-10T16:00:00Z"))).toBe("2026-10-11");
    const raced = await Promise.allSettled([start("free", "a"), start("free", "b"), start("free", "c")]);
    expect(raced.filter((r) => r.status === "fulfilled")).toHaveLength(2);
    expect(raced[2]).toMatchObject({ status: "rejected", reason: { status: 429 } });
    const a = (raced[0] as PromiseFulfilledResult<Awaited<ReturnType<typeof start>>>).value;
    await expect(start("free", "a")).rejects.toMatchObject({ status: 503 });
    await finishLiveStart("free", "a", a.lease, "single-use-token", now + 60_000);
    expect((await start("free", "a")).token).toBe("single-use-token");
    expect((await start("free", "a", true)).expiresAt).toBe(a.expiresAt);
    expect(docs.get("users/free")?.sessionCount).toBe(2);
    await expect(reserveLiveStart("free", "a", { ...setup, followUps: 1 }, true)).rejects.toMatchObject({ status: 400 });
    await expect(start("other", "a", true)).rejects.toMatchObject({ status: 404 });

    const b = (raced[1] as PromiseFulfilledResult<Awaited<ReturnType<typeof start>>>).value;
    await finishLiveStart("free", "b", b.lease); // failed mint refunds the slot
    expect(docs.get("users/free")?.sessionCount).toBe(1);
    const retry = await start("free", "b");
    now += 31_000; // a crashed server's pending lease can be taken over without another slot
    const recovered = await start("free", "b");
    expect(recovered.lease).not.toBe(retry.lease);
    await finishLiveStart("free", "b", retry.lease);
    expect(docs.get("users/free")?.sessionCount).toBe(2);
    await expect(finishLiveStart("free", "b", retry.lease, "stale", now + 60_000)).rejects.toMatchObject({ status: 503 });
    await finishLiveStart("free", "b", recovered.lease);

    now = Date.parse("2026-10-10T16:00:01Z");
    await expect(start("free", "a")).rejects.toMatchObject({ status: 410 }); // initial-connect window closed
    expect((await start("free", "a", true)).cached).toBe(true); // genuine resumption still works
    await start("free", "new-day");
    expect(docs.get("users/free")).toMatchObject({ sessionDay: "2026-10-11", sessionCount: 1 });
    now = a.expiresAt;
    await expect(start("free", "a", true)).rejects.toMatchObject({ status: 410 });

    docs.set("users/premium", { premium: true });
    const premium = await Promise.allSettled(Array.from({ length: 11 }, (_, i) => start("premium", `p${i}`)));
    expect(premium.filter((r) => r.status === "fulfilled")).toHaveLength(10);
    expect(premium[10]).toMatchObject({ status: "rejected", reason: { status: 429 } });
    await expect(reserveLiveStart("long", "x", { ...setup, minutes: 15 }, false)).rejects.toMatchObject({ status: 403 });
    docs.set("users/long", { premium: true });
    await expect(reserveLiveStart("long", "x", { ...setup, minutes: 30 }, false)).rejects.toMatchObject({ status: 400 });
    expect(docs.get("users/long")?.sessionCount).toBeUndefined();
    const long = await reserveLiveStart("long", "x", { ...setup, minutes: 25 }, false);
    expect(long.expiresAt).toBe(now + 55 * 60_000);

    docs.set("users/deleted", { deleting: true });
    await expect(start("deleted", "x")).rejects.toMatchObject({ status: 403 });
  } finally {
    transaction.mockRestore();
    clock.mockRestore();
  }
});
