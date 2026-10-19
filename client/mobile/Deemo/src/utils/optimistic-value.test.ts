import { expect, test } from "bun:test";
import { optimisticValue } from "./optimistic-value";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test("selection changes before a slow save and commits the server's value", async () => {
  let value = "BSIT", saving = false;
  const reply = deferred<string>();
  const setting = optimisticValue(() => value, (next, busy) => { value = next; saving = busy; }, () => reply.promise);
  const version = setting.version;
  const pending = setting.set("BSCS");
  expect(value).toBe("BSCS");
  expect(saving).toBe(true);
  expect(setting.version).not.toBe(version); // a read started before the edit is stale
  const during = setting.version;
  reply.resolve("Engineering");
  await pending;
  expect(value).toBe("Engineering");
  expect(saving).toBe(false);
  expect(setting.version).not.toBe(during); // a read started during the save is stale too
});

test("failed toggle rolls back, reports the error and allows a retry", async () => {
  let value = false, fail = true;
  const setting = optimisticValue(() => value, (next) => { value = next; }, async (next) => {
    if (fail) throw new Error("Offline");
    return next;
  });
  const pending = setting.set(true);
  expect(value).toBe(true);
  await expect(pending).rejects.toThrow("Offline");
  expect(value).toBe(false);
  expect(setting.saving).toBe(false);
  fail = false;
  await setting.set(true);
  expect(value).toBe(true);
});

test("rapid duplicate events share one save instead of racing writes", async () => {
  let value = false, calls = 0;
  const reply = deferred<boolean>();
  const setting = optimisticValue(() => value, (next) => { value = next; }, () => { calls++; return reply.promise; });
  const first = setting.set(true);
  const second = setting.set(false);
  expect(second).toBe(first);
  await Promise.resolve();
  expect(calls).toBe(1);
  expect(value).toBe(true);
  reply.resolve(true);
  await first;
});

test.each([true, false])("an old account's reply cannot change the new account (success: %s)", async (success) => {
  let value = "old";
  const reply = deferred<string>();
  const setting = optimisticValue(() => value, (next) => { value = next; }, () => reply.promise);
  const pending = setting.set("edit");
  await Promise.resolve();
  setting.reset();
  value = "new account";
  if (success) reply.resolve("old response");
  else reply.reject(new Error("Old failure"));
  await pending;
  expect(value).toBe("new account");
  expect(setting.saving).toBe(false);
});

test("reset before dispatch prevents an old edit being sent under a new account", async () => {
  let value = false, calls = 0;
  const setting = optimisticValue(() => value, (next) => { value = next; }, async (next) => { calls++; return next; });
  const pending = setting.set(true);
  setting.reset();
  value = false;
  await pending;
  expect(calls).toBe(0);
});

test("an old reply cannot finish a new account's pending save", async () => {
  let value = "old", saving = false;
  const oldReply = deferred<string>(), newReply = deferred<string>();
  const setting = optimisticValue(() => value, (next, busy) => { value = next; saving = busy; },
    (next) => next === "old edit" ? oldReply.promise : newReply.promise);
  const oldSave = setting.set("old edit");
  await Promise.resolve();
  setting.reset();
  value = "new account";
  const newSave = setting.set("new edit");
  oldReply.resolve("old edit");
  await oldSave;
  expect(value).toBe("new edit");
  expect(saving).toBe(true);
  expect(setting.saving).toBe(true);
  newReply.resolve("new edit");
  await newSave;
  expect(saving).toBe(false);
});
