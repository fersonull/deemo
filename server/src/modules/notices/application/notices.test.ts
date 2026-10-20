import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

test("notice deletion audits only existing selections atomically, supports retry, and notifies after commit", () => {
  // Isolate database/auth mocks from other server tests; no real notices are deleted.
  const result = Bun.spawnSync([process.execPath, "--eval", `
    import assert from "node:assert/strict";
    import { mock } from "bun:test";
    let rows = [{ id: "a" }, { id: "b" }, { id: "untouched" }], audit = [], notifications = [], failAudit = false;
    const tx = { notice: {
      findMany: async ({ where }) => rows.filter(n => where.id.in.includes(n.id)),
      deleteMany: async ({ where }) => {
        const count = rows.filter(n => where.id.in.includes(n.id)).length;
        rows = rows.filter(n => !where.id.in.includes(n.id));
        return { count };
      },
    } };
    mock.module("../../../shared/prisma", () => ({
      prisma: {}, isDuplicate: () => false,
      withSerializable: async fn => {
        const oldRows = [...rows], oldAudit = [...audit];
        try { return await fn(tx); }
        catch (e) { rows = oldRows; audit = oldAudit; throw e; }
      },
    }));
    mock.module("../../admin/application/actions", () => ({ record: async (admin, action, target, db) => {
      assert.equal(db, tx);
      assert.equal(admin.uid, "admin");
      if (failAudit) throw new Error("audit unavailable");
      audit.push({ action, target });
    } }));
    mock.module("../infrastructure/notice-repo", () => ({ noticeHub: { notify: target => notifications.push(target) } }));
    mock.module("../infrastructure/push", () => ({ pushNotice: async () => {} }));
    const { deleteNotices } = await import("./notices.ts");
    const admin = { uid: "admin" };
    assert.deepEqual(await deleteNotices(admin, ["a", "b", "missing"]), { deleted: 2 });
    assert.deepEqual(rows, [{ id: "untouched" }]);
    assert.deepEqual(audit.map(a => [a.action, a.target.id]), [["notice_deleted", "a"], ["notice_deleted", "b"]]);
    assert.deepEqual(notifications, [null]);
    assert.deepEqual(await deleteNotices(admin, ["a", "b"]), { deleted: 0 });
    assert.equal(audit.length, 2);
    assert.equal(notifications.length, 1);
    failAudit = true;
    await assert.rejects(deleteNotices(admin, ["untouched"]), /audit unavailable/);
    assert.deepEqual(rows, [{ id: "untouched" }]);
    assert.equal(notifications.length, 1);
  `], { cwd: fileURLToPath(new URL(".", import.meta.url)), stdout: "pipe", stderr: "pipe" });
  expect(result.exitCode, new TextDecoder().decode(result.stderr)).toBe(0);
});
