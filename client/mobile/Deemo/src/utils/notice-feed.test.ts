import { expect, test } from "bun:test";
import { NoticeFeed, type Notice, type NoticePage } from "./notice-feed";

const notice = (id: string): Notice => ({ id, title: id, body: "Notice", createdAt: "2026-10-17T01:00:00Z", readAt: null });
const page = (ids: string[], nextCursor: string | null = null): NoticePage => ({ notices: ids.map(notice), unread: ids.length, nextCursor });

test("an old request cannot repopulate the inbox after switching accounts", async () => {
  let finish!: (page: NoticePage) => void;
  const feed = new NoticeFeed(() => new Promise((r) => { finish = r; }), async () => {});
  feed.reset("a");
  const pending = feed.refresh();
  feed.reset("b");
  finish(page(["private-to-a"]));
  await pending;
  expect(feed.store.get().owner).toBe("b");
  expect(feed.store.get().notices).toEqual([]);
});

test("pagination survives a new notice and the next refresh, without duplicates", async () => {
  let first = page(Array.from({ length: 30 }, (_, i) => String(i)), "29");
  const feed = new NoticeFeed(async (before) => before ? page(["29", "30", "31"]) : first, async () => {});
  feed.reset("a");
  await feed.refresh();
  await feed.more();
  expect(feed.store.get().notices).toHaveLength(32);
  first = page(["new", ...Array.from({ length: 29 }, (_, i) => String(i))], "28");
  await feed.refresh();
  expect(feed.store.get().notices).toHaveLength(33);
  expect(feed.store.get().notices[0]!.id).toBe("new");
  expect(feed.store.get().nextCursor).toBeNull();
});

test("failed reads keep the notice unread and errors can recover on refresh", async () => {
  let failed = true;
  const feed = new NoticeFeed(async () => { if (failed) throw new Error("Offline"); return page(["a"]); }, async () => { throw new Error("Offline"); });
  await feed.refresh();
  expect(feed.store.get().error).toBe("Offline");
  failed = false;
  await feed.refresh();
  expect(feed.store.get().error).toBe("");
  await expect(feed.read("a")).rejects.toThrow("Offline");
  expect(feed.store.get().unread).toBe(1);
  expect(feed.store.get().notices[0]!.readAt).toBeNull();
});
