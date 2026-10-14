/// <reference types="bun" />
import { expect, test } from "bun:test";

import { canCreate, cleanName, confirmProblem } from "./auth-form";

test("the confirmation stays quiet while it's empty, matching, or still being typed", () => {
  expect(confirmProblem("secret1", "")).toBeNull();
  expect(confirmProblem("secret1", "secret1")).toBeNull();
  expect(confirmProblem("secret1", "secr")).toBeNull();
});

test("a wrong confirmation is flagged", () => {
  expect(confirmProblem("secret1", "secrex")).toBe("Passwords don't match.");
  expect(confirmProblem("secret1", "secret12")).toBe("Passwords don't match.");
});

test("an account needs an email, 6+ characters, and a matching confirmation", () => {
  expect(canCreate("Juan", "a@b.edu", "secret1", "secret1")).toBe(true);
  expect(canCreate("  ", "a@b.edu", "secret1", "secret1")).toBe(false); // a name is required
  expect(canCreate("Juan", " ", "secret1", "secret1")).toBe(false);
  expect(canCreate("Juan", "a@b.edu", "short", "short")).toBe(false);
  expect(canCreate("Juan", "a@b.edu", "secret1", "secret2")).toBe(false);
});

test("names are trimmed, single-spaced and capped", () => {
  expect(cleanName("  Juan   Dela  Cruz ")).toBe("Juan Dela Cruz");
  expect(cleanName("x".repeat(80))).toHaveLength(60);
  expect(cleanName("   ")).toBe("");
});
