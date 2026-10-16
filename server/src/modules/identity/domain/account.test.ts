/// <reference types="bun" />
import { expect, test } from "bun:test";

import { AVATAR, claimsPatch, defaultAvatar, toMe, type Account } from "./account";

const account = (over: Partial<Account> = {}): Account => ({
  id: "uid-1", email: "a@school.edu", name: null, emailVerified: true, provider: "password", avatar: null,
  premium: false, allowTyping: true, course: null, consentVersion: null, consentAt: null, sessionDay: null, sessionCount: 0,
  deletedAt: null, ...over,
});
const claims = { uid: "uid-1", email: "a@school.edu", name: "Juan Dela Cruz", emailVerified: true, provider: "password" };

test("the default avatar is stable per account and hides the uid", () => {
  expect(defaultAvatar("uid-123")).toBe(defaultAvatar("uid-123"));
  expect(defaultAvatar("uid-123")).not.toBe(defaultAvatar("uid-124"));
  expect(defaultAvatar("uid-123")).toMatch(/^[0-9a-f]{8}$/);
});

test("only short lowercase seeds are accepted", () => {
  expect(AVATAR.test("a1b2c3d4")).toBe(true);
  expect(AVATAR.test("")).toBe(false);
  expect(AVATAR.test("x".repeat(33))).toBe(false);
  expect(AVATAR.test("a&size=4096")).toBe(false);
});

test("Firebase fills an empty name, then DEEMO owns it", () => {
  expect(claimsPatch(account(), claims)).toEqual({ name: "Juan Dela Cruz" });
  expect(claimsPatch(account({ name: "Juan" }), { ...claims, name: "Old token name" })).toEqual({});
});

test("email, verification and sign-in method follow Firebase", () => {
  const patch = claimsPatch(account({ name: "Juan", emailVerified: false }), { ...claims, email: "new@school.edu" });
  expect(patch).toEqual({ email: "new@school.edu", emailVerified: true });
  expect(claimsPatch(account({ name: "J", provider: "password" }), { ...claims, provider: "google.com" })).toEqual({ provider: "google.com" });
});

test("GET /me gives the default face and leaves out consent until it's given", () => {
  const me = toMe(account());
  expect(me.avatar).toBe(defaultAvatar("uid-1"));
  expect("consentAt" in me).toBe(false);
  const at = new Date("2026-10-15T00:00:00Z");
  expect(toMe(account({ consentVersion: "2026-10.3", consentAt: at, avatar: "abc" }))).toMatchObject({
    avatar: "abc", consentVersion: "2026-10.3", consentAt: at.toISOString(),
  });
});
