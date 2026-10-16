import { expect, test } from "bun:test";

import { buildPanelPrompt, lineup, PANEL_TOOLS, seatShare } from "./panel";

const setup = { mode: "PRE_ORAL" as const, domain: "Web/Mobile App", minutes: 15, followUps: 2, difficulty: "STANDARD" as const };

test("one panelist: the whole panel prompt, presentation first, ends with end_session", () => {
  const p = buildPanelPrompt({ ...setup, panelists: 1 });
  expect(p).toContain("The student speaks first");
  expect(p).toContain("call end_session");
  expect(p).not.toContain("pass_to_next");
  expect(p).toContain("main questions in total");
});

test("three panelists question in turn: each seat speaks only as itself, hands over, and the last one closes", () => {
  const first = buildPanelPrompt({ ...setup, panelists: 3 }, undefined, 0);
  const second = buildPanelPrompt({ ...setup, panelists: 3 }, undefined, 1);
  const last = buildPanelPrompt({ ...setup, panelists: 3 }, undefined, 2);
  expect(first).toContain("You are Dr. Reyes");
  expect(first).toContain("The student speaks first");
  expect(first).toContain("call pass_to_next");
  expect(first).toContain("handing over to Engr. Santos");
  expect(second).toContain("You are Engr. Santos");
  expect(second).toContain("Earlier panelists have already questioned the student");
  expect(second).not.toContain("The student speaks first");
  expect(last).toContain("You are Prof. Cruz");
  expect(last).toContain("closing sentence for the whole panel");
  expect(last).not.toContain("call pass_to_next");
  expect(PANEL_TOOLS.map((t) => t.name)).toContain("pass_to_next");
});

test("each panelist's share of main questions", () => {
  expect(seatShare(15, 3)).toBe(2); // 6 planned / 3
  expect(seatShare(25, 2)).toBe(5); // 10 planned / 2
  expect(seatShare(10, 3)).toBe(2); // never fewer than 2
});

test("the panel is profiled by the student's course and, for computing courses, the IT field (plan F4)", () => {
  const nursing = buildPanelPrompt({ ...setup, domain: "General", panelists: 1, course: "Nursing & Health" });
  expect(nursing).not.toContain("BSIT");
  expect(nursing).toContain("a Nursing & Health student");
  expect(nursing).toContain("ethics clearance");
  const ai = buildPanelPrompt({ ...setup, domain: "Data & AI", panelists: 1, course: "BSIT" });
  expect(ai).toContain("Field: BSIT, Data & AI");
  expect(ai).toContain("training and validation");
  // A non-computing course ignores a leftover IT field.
  expect(buildPanelPrompt({ ...setup, domain: "Data & AI", panelists: 1, course: "Education" })).not.toContain("training and validation");
  expect(buildPanelPrompt({ ...setup, domain: "General", panelists: 1, course: "Other" })).toContain("a college student");
});

test("a study with no features leaves the Features / output line out", () => {
  const a = { title: "T", problem: "P", objectives: "O", method: "M", scope: "S", features: "", limits: "L", results: "", facts: [], unsure: [] };
  expect(buildPanelPrompt({ ...setup, panelists: 1 }, a)).not.toContain("Features / output");
  expect(buildPanelPrompt({ ...setup, panelists: 1 }, { ...a, features: "QR check-in" })).toContain("Features / output: QR check-in");
});

test("the course decides who sits with one or two panelists (best fit), in panel order", () => {
  expect(lineup("BSIT", 1)).toEqual([1]);
  expect(lineup("BSIT", 2)).toEqual([0, 1]);
  expect(lineup("BSIT", 3)).toEqual([0, 1, 2]);
  expect(lineup("Nursing & Health", 2)).toEqual([1, 2]);
  expect(lineup("Psychology & Social Sciences", 1)).toEqual([2]);
  expect(lineup("Other", 1)).toEqual([0]);
  expect(lineup("Other", 2)).toEqual([0, 2]);
});

test("Santos is the field expert for the student's course", () => {
  const nursing = { ...setup, domain: "General", panelists: 2, course: "Nursing & Health" as const };
  const first = buildPanelPrompt(nursing, undefined, 0);
  expect(first).toContain("You are Dr. Santos, the Clinical");
  expect(first).toContain("panelist is your id: Technical");
  expect(first).not.toContain("architecture, database");
  expect(first).toContain("handing over to Prof. Cruz");
  expect(buildPanelPrompt({ ...setup, domain: "General", panelists: 3, course: "Maritime" }, undefined, 0)).toContain(
    "handing over to Capt. Santos",
  );
  expect(buildPanelPrompt({ ...setup, panelists: 3 }, undefined, 1)).toContain("You are Engr. Santos, the Technical");
  const solo = buildPanelPrompt({ ...setup, domain: "General", panelists: 1, course: "Psychology & Social Sciences" });
  expect(solo).toContain("Methodology: Prof. Cruz");
  expect(solo).toContain("As the only panelist");
});
