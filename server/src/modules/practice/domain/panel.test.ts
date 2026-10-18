import { expect, test } from "bun:test";

import { buildAgenda } from "./agenda";
import { buildPanelPrompt, liveSetup, lineup, manuscriptFacts, panelTools } from "./panel";

const setup = { mode: "PRE_ORAL" as const, domain: "Web/Mobile App", followUps: 2, difficulty: "STANDARD" as const };

test("one panelist: the whole panel prompt, presentation first, ends with end_session", () => {
  const p = buildPanelPrompt({ ...setup, panelists: 1 });
  expect(p).toContain("The student speaks first");
  expect(p).toContain("call end_session");
  expect(p).not.toContain("pass_to_next");
  expect(p).toContain("no question limit");
  expect(p).not.toMatch(/about \d+ main questions/);
});

test("the agenda: each seat's prompt lists only its own items, and its tool limits topicId to them", () => {
  const agenda = buildAgenda(null, { mode: "PRE_ORAL", panelists: 3 });
  const chair = buildPanelPrompt({ ...setup, panelists: 3 }, undefined, 0, agenda);
  expect(chair).toContain("- problem: ");
  expect(chair).not.toContain("- sampling: "); // Methodology's
  const solo = buildPanelPrompt({ ...setup, panelists: 1 }, undefined, 0, buildAgenda(null, { mode: "PRE_ORAL", panelists: 1 }));
  expect(solo).toContain("- sampling: ");
  const tools = liveSetup({ ...setup, panelists: 3 }, undefined, 2, agenda).tools[0]!.functionDeclarations;
  const topic = (tools[0]!.parameters as { properties: { topicId: { enum?: string[] } } }).properties.topicId;
  expect(topic.enum).toEqual(agenda.filter((i) => i.seat === 2).map((i) => i.id));
  expect((panelTools()[0]!.parameters.properties.topicId as { enum?: string[] }).enum).toBeUndefined();
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
  expect(panelTools().map((t) => t.name)).toContain("pass_to_next");
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

test("the panel sees the manuscript's field first", () => {
  const a = { title: "T", problem: "P", objectives: "O", method: "M", scope: "S", features: "", limits: "L", results: "", facts: [], unsure: [], field: "Maritime" as const };
  expect(manuscriptFacts(a).startsWith("Field: Maritime\nTitle: T")).toBe(true);
});

test("the panel only sees the defense stage's chapters", () => {
  const a = {
    title: "ReqTrack", problem: "P", objectives: "O", method: "Agile, 30 respondents", scope: "S", features: "QR", limits: "L",
    results: "Weighted mean 3.42", unsure: [],
    facts: ["Registrar handles 2,000 students (Ch. 1)", "Thirty (30) respondents (Ch. 3)", "Mean 3.42 (Chapter 4)", "Built with Expo"],
  };
  const title = manuscriptFacts(a, "TITLE");
  expect(title).not.toContain("Agile");
  expect(title).not.toContain("Thirty (30)");
  expect(title).not.toContain("3.42");
  expect(title).toContain("2,000 students");
  expect(title).toContain("Built with Expo"); // no chapter: kept

  const preOral = manuscriptFacts(a, "PRE_ORAL");
  expect(preOral).toContain("Agile");
  expect(preOral).toContain("Thirty (30)");
  expect(preOral).not.toContain("3.42");

  const final = manuscriptFacts(a, "FINAL");
  expect(final).toContain("Results: Weighted mean 3.42");
  expect(final).toContain("Mean 3.42 (Chapter 4)");
});
