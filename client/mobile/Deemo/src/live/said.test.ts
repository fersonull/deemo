import { expect, test } from "bun:test";

import { alreadySaid } from "./said";

const q = "Could you specify your target user sample size for developing and testing the DEEMO system?";

test("the question spoken before the tool call counts as said", () => {
  expect(alreadySaid("That's okay. Moving on to your evaluation, could you specify your target user sample size for developing and testing the DEEMO system?", q)).toBe(true);
});

test("a reaction alone, or a different question, does not", () => {
  expect(alreadySaid("That's okay. Moving on to your evaluation,", q)).toBe(false);
  expect(alreadySaid("How does the system handle connection interruptions?", q)).toBe(false);
  expect(alreadySaid("", q)).toBe(false);
  expect(alreadySaid("anything at all", "Why?")).toBe(false); // too short to judge
});
