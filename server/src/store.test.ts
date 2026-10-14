/// <reference types="bun" />
import { expect, test } from "bun:test";

import { defaultAvatar, validAvatar } from "./store";

test("the default avatar is stable per account and hides the uid", () => {
  expect(defaultAvatar("uid-123")).toBe(defaultAvatar("uid-123"));
  expect(defaultAvatar("uid-123")).not.toBe(defaultAvatar("uid-124"));
  expect(defaultAvatar("uid-123")).toMatch(/^[0-9a-f]{8}$/);
});

test("only short lowercase seeds are accepted", () => {
  expect(validAvatar("a1b2c3d4")).toBe(true);
  expect(validAvatar("")).toBe(false);
  expect(validAvatar("x".repeat(33))).toBe(false);
  expect(validAvatar("a&size=4096")).toBe(false); // nothing that could change the URL
  expect(validAvatar(42)).toBe(false);
});
