/// <reference types="bun" />
import { expect, test } from "bun:test";

process.env.FIREBASE_SERVICE_ACCOUNT ??= "unused"; // sessions.ts imports the store; the helper under test needs neither

const { substantive, weakTopics } = await import("./sessions");
const { buildPanelPrompt, parseSetup } = await import("./panel");

test("an answer counts with 3+ real words", () => {
  expect(substantive("Because it is easy and free.")).toBe(true);
  expect(substantive("I'm not sure.")).toBe(true); // weak, but an answer; the judge scores it 1
  expect(substantive("uh ... ok")).toBe(false);
  expect(substantive("")).toBe(false);
  expect(substantive("   ")).toBe(false);
});

const crit = (name: string, level: number | null) => ({ key: name, name, weight: 20, level, why: `${name} why.` });
const report = {
  score: 50, band: "Developing", message: "", rubricScore: 60, penalty: 6, answered: 3, planned: 4, scored: true,
  criteria: [crit("Content", 4), crit("Reasoning", 2), crit("Clarity", 3), crit("Consistency", 1), crit("Delivery", null)],
  contradictions: [{ spokenClaim: "50 users", manuscriptEvidence: "30 respondents", severity: "HIGH" as const, turn: 0 }],
  turns: [], fixes: [{ text: "State the sample first.", turn: 0 }], headline: "",
  delivery: { latencyS: null, fillersPerMin: null, wordsPerMin: null },
};

test("weak topics: the two weakest judged criteria, contradictions and fixes", () => {
  const t = weakTopics(report);
  expect(t).toContain("Weak criterion: Consistency (1/5). Consistency why.");
  expect(t).toContain("Weak criterion: Reasoning (2/5)");
  expect(t).not.toContain("Clarity");
  expect(t).not.toContain("Delivery");
  expect(t).toContain('said "50 users", the manuscript says "30 respondents"');
  expect(t).toContain("To fix: State the sample first.");
});

test("weak topics: a strong report still names its lowest criterion", () => {
  const strong = { ...report, criteria: [crit("Content", 5), crit("Clarity", 4)], contradictions: [], fixes: [] };
  expect(weakTopics(strong)).toBe("Weak criterion: Clarity (4/5). Clarity why.");
});

test("the panel prompt carries the weak areas as data, only on a weak-topics round", () => {
  const setup = parseSetup({ mode: "PRE_ORAL", domain: "Data & AI", panelists: 1, minutes: 10, weakFrom: "abc-123" })!;
  expect(setup.weakFrom).toBe("abc-123");
  expect(parseSetup({ ...setup, weakFrom: "../x" })).toBeNull();
  expect(buildPanelPrompt(setup)).not.toContain("targeted practice round");
  const prompt = buildPanelPrompt({ ...setup, weakTopics: 'To fix: "quotes" and\nlines' });
  expect(prompt).toContain(`Weak areas (JSON string): ${JSON.stringify('To fix: "quotes" and\nlines')}\n- Whenever`);
});
