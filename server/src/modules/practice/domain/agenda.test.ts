import { expect, test } from "bun:test";

import type { Analysis } from "../../manuscripts/domain/manuscript";
import { buildAgenda, SAMPLE_ANALYSIS } from "./agenda";

const ids = (a: { id: string }[]) => a.map((i) => i.id);

test("each stage has its own agenda, in order", () => {
  expect(ids(buildAgenda(null, { mode: "TITLE", panelists: 1 }))).toEqual(["problem", "objectives", "scope", "novelty", "solution", "approach"]);
  expect(ids(buildAgenda(null, { mode: "PRE_ORAL", panelists: 1 }))).toEqual([
    "problem", "scope", "design", "implementation", "research-design", "sampling", "instruments", "analysis",
  ]);
  expect(ids(buildAgenda(null, { mode: "FINAL", panelists: 1 }))).toContain("recommendations");
});

test("a topic with nothing in the manuscript to stand on is skipped", () => {
  const noResults: Analysis = { ...SAMPLE_ANALYSIS, results: "" };
  const final = ids(buildAgenda(noResults, { mode: "FINAL", panelists: 1 }));
  expect(final).not.toContain("results");
  expect(final).not.toContain("conclusions");
  expect(final).toContain("objectives-met");
  const noFeatures: Analysis = { ...SAMPLE_ANALYSIS, features: "", method: "" };
  expect(ids(buildAgenda(noFeatures, { mode: "TITLE", panelists: 1 }))).not.toContain("solution");
});

test("seats: every item goes to a seated panelist, and seats keep the stage's order", () => {
  const one = buildAgenda(null, { mode: "PRE_ORAL", panelists: 1 });
  expect(one.every((i) => i.seat === 0)).toBe(true);
  // BSIT, three panelists: Chair (seat 0), Santos (1), Cruz (2)
  const three = buildAgenda(null, { mode: "PRE_ORAL", panelists: 3 });
  expect(three.filter((i) => i.seat === 0).map((i) => i.id)).toEqual(["problem", "scope"]);
  expect(three.filter((i) => i.seat === 1).map((i) => i.id)).toEqual(["design", "implementation"]);
  expect(three.filter((i) => i.seat === 2).map((i) => i.id)).toEqual(["research-design", "sampling", "instruments", "analysis"]);
  expect(three.map((i) => i.seat)).toEqual([...three.map((i) => i.seat)].sort());
  // BSIT, two panelists: Chair and Santos; Methodology's items fall to Santos
  const two = buildAgenda(null, { mode: "PRE_ORAL", panelists: 2 });
  expect(two.find((i) => i.id === "sampling")!.seat).toBe(1);
  // Psychology, two: Santos and Cruz; the Chair's items fall to Santos (seat 0)
  const psych = buildAgenda(null, { mode: "PRE_ORAL", panelists: 2, course: "Psychology & Social Sciences" });
  expect(psych.find((i) => i.id === "problem")!.seat).toBe(0);
  expect(psych.find((i) => i.id === "sampling")!.seat).toBe(1);
});

test("the field expert's topics carry the field's own emphasis", () => {
  const nursing = buildAgenda(null, { mode: "PRE_ORAL", panelists: 1, course: "Nursing & Health" });
  expect(nursing.find((i) => i.id === "design")!.brief).toContain("health outcomes");
  const ai = buildAgenda(null, { mode: "PRE_ORAL", panelists: 1, course: "BSIT", domain: "Data & AI" });
  expect(ai.find((i) => i.id === "design")!.brief).toContain("training and validation");
});
