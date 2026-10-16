/// <reference types="bun" />
import { expect, test } from "bun:test";

import { decideFinish, decideSeat, decideStart, sessionDay, type StartState } from "./live-start";
import { SetupInput } from "./panel";

// The same scenario the Firestore version was tested with, against an in-memory store that applies each decision the
// way practice/application/live-token.ts does. Concurrency itself is the database's job (serializable transactions;
// server/tests/live.integration.test.ts races real requests).
function harness() {
  const accounts = new Map<string, { premium: boolean; sessionDay: string | null; sessionCount: number }>();
  const starts = new Map<string, StartState>();
  let now = Date.parse("2026-10-10T15:59:00Z");
  let leases = 0;
  const account = (uid: string) => {
    if (!accounts.has(uid)) accounts.set(uid, { premium: false, sessionDay: null, sessionCount: 0 });
    return accounts.get(uid)!;
  };
  const setup = SetupInput.parse({ mode: "TITLE", domain: "Data & AI", panelists: 1, minutes: 10 });
  const start = (uid: string, id: string, resume = false, s = setup) => {
    const d = decideStart({
      previous: starts.get(`${uid}/${id}`) ?? null,
      account: account(uid),
      setup: s,
      fingerprint: JSON.stringify(s),
      resume,
      lease: `lease-${++leases}`,
      now,
    });
    if (d.kind !== "cached") starts.set(`${uid}/${id}`, d.start);
    if (d.kind === "new") Object.assign(account(uid), { sessionDay: d.day, sessionCount: d.count });
    return { ...d.start, cached: d.kind === "cached" };
  };
  const finish = (uid: string, id: string, lease: string, token?: string) => {
    const d = decideFinish({ start: starts.get(`${uid}/${id}`) ?? null, account: account(uid), lease, token, newSessionUntil: now + 60_000 });
    if (d.kind === "save") starts.set(`${uid}/${id}`, { ...starts.get(`${uid}/${id}`)!, token: d.token, newSessionUntil: d.newSessionUntil });
    if (d.kind === "refund") {
      starts.delete(`${uid}/${id}`);
      if (d.count !== null) account(uid).sessionCount = d.count;
    }
  };
  return { accounts, account, start, finish, setup, clock: { get: () => now, set: (t: number) => (now = t), add: (ms: number) => (now += ms) } };
}

test("Manila calendar days", () => {
  expect(sessionDay(Date.parse("2026-10-10T15:59:00Z"))).toBe("2026-10-10");
  expect(sessionDay(Date.parse("2026-10-10T16:00:00Z"))).toBe("2026-10-11");
});

test("daily starts: caps, retries, refunds, leases and Manila midnight", () => {
  const h = harness();
  for (let i = 0; i < 3; i++) h.start("free", `earlier${i}`); // three of today's five free sessions already used
  const a = h.start("free", "a");
  const b = h.start("free", "b");
  expect(() => h.start("free", "c")).toThrow(expect.objectContaining({ status: 429 }));
  expect(() => h.start("free", "a")).toThrow(expect.objectContaining({ status: 503 })); // still minting
  h.finish("free", "a", a.lease, "single-use-token");
  expect(h.start("free", "a").token).toBe("single-use-token");
  expect(h.start("free", "a", true).expiresAt).toBe(a.expiresAt);
  expect(h.account("free").sessionCount).toBe(5);
  expect(() => h.start("free", "a", true, { ...h.setup, followUps: 1 })).toThrow(expect.objectContaining({ status: 400 }));
  expect(() => h.start("other", "a", true)).toThrow(expect.objectContaining({ status: 404 }));

  h.finish("free", "b", b.lease); // a failed mint refunds the slot
  expect(h.account("free").sessionCount).toBe(4);
  const retry = h.start("free", "b");
  h.clock.add(31_000); // a crashed server's pending lease can be taken over without another slot
  const recovered = h.start("free", "b");
  expect(recovered.lease).not.toBe(retry.lease);
  h.finish("free", "b", retry.lease); // the old lease no longer owns it: ignored
  expect(h.account("free").sessionCount).toBe(5);
  expect(() => h.finish("free", "b", retry.lease, "stale")).toThrow(expect.objectContaining({ status: 503 }));
  h.finish("free", "b", recovered.lease);

  h.clock.set(Date.parse("2026-10-10T16:00:01Z"));
  expect(() => h.start("free", "a")).toThrow(expect.objectContaining({ status: 410 })); // initial-connect window closed
  expect(h.start("free", "a", true).cached).toBe(true); // genuine resumption still works
  h.start("free", "new-day");
  expect(h.account("free")).toMatchObject({ sessionDay: "2026-10-11", sessionCount: 1 });
  h.clock.set(a.expiresAt);
  expect(() => h.start("free", "a", true)).toThrow(expect.objectContaining({ status: 410 }));
});

test("Premium: unlimited sessions a day, up to 25 minutes", () => {
  const h = harness();
  h.accounts.set("premium", { premium: true, sessionDay: null, sessionCount: 0 });
  for (let i = 0; i < 40; i++) h.start("premium", `p${i}`); // no daily cap
  expect(h.account("premium").sessionCount).toBe(40);
  expect(() => h.start("long", "x", false, { ...h.setup, minutes: 15 })).toThrow(expect.objectContaining({ status: 403 }));
  h.accounts.set("long", { premium: true, sessionDay: null, sessionCount: 0 });
  expect(() => h.start("long", "x", false, { ...h.setup, minutes: 30 })).toThrow(expect.objectContaining({ status: 400 }));
  expect(h.account("long").sessionCount).toBe(0);
  const long = h.start("long", "x", false, { ...h.setup, minutes: 25 });
  expect(long.expiresAt).toBe(h.clock.get() + 55 * 60_000);
});

test("later panelists' seats: only under a connected start for the same setup, before it expires, no new slot", () => {
  const now = 1_000_000;
  const start = { day: "2026-10-16", setup: "fp", lease: "l", pendingUntil: now, expiresAt: now + 60_000, token: "t" };
  expect(decideSeat({ previous: start, fingerprint: "fp", seat: 1, panelists: 3, now })).toEqual({ expiresAt: now + 60_000 });
  expect(decideSeat({ previous: start, fingerprint: "fp", seat: 2, panelists: 3, now }).expiresAt).toBe(now + 60_000);
  expect(() => decideSeat({ previous: start, fingerprint: "fp", seat: 0, panelists: 3, now })).toThrow(); // seat 0 reserves the slot
  expect(() => decideSeat({ previous: start, fingerprint: "fp", seat: 2, panelists: 2, now })).toThrow(); // no third panelist
  expect(() => decideSeat({ previous: null, fingerprint: "fp", seat: 1, panelists: 3, now })).toThrow(); // no start
  expect(() => decideSeat({ previous: { ...start, token: undefined }, fingerprint: "fp", seat: 1, panelists: 3, now })).toThrow(); // not connected yet
  expect(() => decideSeat({ previous: start, fingerprint: "other", seat: 1, panelists: 3, now })).toThrow(); // setup changed
  expect(() => decideSeat({ previous: start, fingerprint: "fp", seat: 1, panelists: 3, now: now + 60_000 })).toThrow(); // expired
});
