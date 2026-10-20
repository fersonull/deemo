import { expect, test } from "bun:test";
import { NoticeHub } from "./change-hub";

test("cross-instance scans notify only the recipient, broadcast once, and synchronize read state", async () => {
  let rows: { key: string; targetId: string | null }[] = [];
  const hub = new NoticeHub(async () => rows, 60_000);
  let a = 0, b = 0;
  const offA = hub.subscribe("a", () => a++);
  const offB = hub.subscribe("b", () => b++);
  await Bun.sleep(0); // initial snapshot
  try {
    rows = [{ key: "private", targetId: "a" }];
    await hub.poll();
    expect([a, b]).toEqual([1, 0]);
    await hub.poll();
    expect([a, b]).toEqual([1, 0]);
    rows.push({ key: "broadcast", targetId: null });
    await hub.poll();
    expect([a, b]).toEqual([2, 1]);
    rows.push({ key: "read:b", targetId: "b" });
    await hub.poll();
    expect([a, b]).toEqual([2, 2]);
    rows = rows.filter((r) => r.key !== "private");
    await hub.poll();
    expect([a, b]).toEqual([3, 2]);
    rows = rows.filter((r) => r.key !== "broadcast");
    await hub.poll();
    expect([a, b]).toEqual([4, 3]);
    offA();
    hub.notify(null);
    expect([a, b]).toEqual([4, 4]);
  } finally { offA(); offB(); }
});
