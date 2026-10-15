/// <reference types="bun" />
import { expect, test } from "bun:test";

import { SetupInput, buildPanelPrompt } from "../../practice/domain/panel";
import { coverage, substantive, unscored, weakTopics, type Unscored } from "./session";

const parseSetup = (x: unknown) => {
  const r = SetupInput.safeParse(x);
  return r.success ? r.data : null;
};

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

test("the setup schema fills the defaults and rejects what the panel can't run", () => {
  const setup = parseSetup({ mode: "TITLE", domain: "Data & AI", panelists: 1, minutes: 10 })!;
  expect(setup.followUps).toBe(2);
  expect(setup.difficulty).toBe("STANDARD");
  expect(parseSetup({ ...setup, mode: "ORAL" })).toBeNull();
  expect(parseSetup({ ...setup, panelists: 4 })).toBeNull();
  expect(parseSetup({ ...setup, minutes: 2.5 })).toBeNull();
});

const session = (over: Partial<Unscored> = {}): Unscored => ({
  id: "s1", createdAt: "", status: "scoring", title: "T", mode: "TITLE", domain: "Data & AI", minutes: 10, panelists: 1,
  followUps: 2, difficulty: "STANDARD", durationMs: 0, endedBy: "student", weights: [25, 20, 20, 20, 15],
  turns: [], lines: [], flags: [], ...over,
});
const turn = (number: number, answer: string, followUp = 0) =>
  ({ number, followUp, type: "TECHNICAL", panelist: 0, question: "Q?", answer, latencyMs: 1000, answerMs: 5000 });

test("coverage: planned questions follow the length unless the panel closed early", () => {
  const s = session({ turns: [turn(1, "We used thirty respondents."), turn(2, "uh")] });
  expect(coverage(s)).toEqual({ answered: 1, planned: 4 });
  expect(coverage({ ...s, endedBy: "panel" })).toEqual({ answered: 1, planned: 2 });
});

test("nothing answered: not scored, every criterion unmeasured", () => {
  const r = unscored(session({ turns: [turn(1, "")] }));
  expect(r.scored).toBe(false);
  expect(r.criteria.every((c) => c.level === null)).toBe(true);
  expect(r.turns).toHaveLength(1);
});
