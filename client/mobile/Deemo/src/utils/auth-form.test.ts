/// <reference types="bun" />
import { expect, test } from "bun:test";

import { canCreate, confirmProblem } from "./auth-form";

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
  expect(canCreate("a@b.edu", "secret1", "secret1")).toBe(true);
  expect(canCreate(" ", "secret1", "secret1")).toBe(false);
  expect(canCreate("a@b.edu", "short", "short")).toBe(false);
  expect(canCreate("a@b.edu", "secret1", "secret2")).toBe(false);
});
