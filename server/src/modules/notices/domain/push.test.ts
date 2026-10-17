import { expect, test } from "bun:test";

import { pushBody, PushTokenInput, staleTokens } from "./push";

test("the notification shows a one-line start of the message", () => {
  expect(pushBody("Practice\n\nresumes  at 3 PM.")).toBe("Practice resumes at 3 PM.");
  const long = pushBody("word ".repeat(100));
  expect(long.length).toBeLessThanOrEqual(158);
  expect(long.endsWith("…")).toBe(true);
});

test("only tokens FCM rejects for good are forgotten", () => {
  const tokens = ["a", "b", "c", "d"];
  const responses = [
    { success: true },
    { success: false, error: { code: "messaging/registration-token-not-registered" } },
    { success: false, error: { code: "messaging/internal-error" } }, // a hiccup: keep it
    { success: false, error: { code: "messaging/invalid-registration-token" } },
  ];
  expect(staleTokens(tokens, responses)).toEqual(["b", "d"]);
});

test("a push token must look like one", () => {
  expect(PushTokenInput.safeParse({ token: "x".repeat(152) }).success).toBe(true);
  expect(PushTokenInput.safeParse({ token: "short" }).success).toBe(false);
  expect(PushTokenInput.safeParse({ token: "x".repeat(513) }).success).toBe(false);
});
