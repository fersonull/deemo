import { expect, test } from "bun:test";

import { AnalysisReply, applyEdits, type Analysis } from "./manuscript";

const a: Analysis = { title: "T", problem: "", objectives: "", method: "", scope: "", features: "", limits: "", results: "", facts: [], unsure: ["field", "scope"] };

test("the student can correct the detected field; an unknown one is ignored", () => {
  const fixed = applyEdits({ ...a, field: "BSIT" }, { field: "Education" });
  expect(fixed.field).toBe("Education");
  expect(fixed.unsure).toEqual(["scope"]);
  expect(applyEdits({ ...a, field: "BSIT" }, { field: "Astrology" as never }).field).toBe("BSIT");
});

test("a field or IT field outside the lists falls back instead of failing the reading", () => {
  const base = { isManuscript: true, notManuscriptReason: "", title: "T", problem: "", objectives: "", method: "", scope: "", features: "", limits: "", results: "", facts: [], unsure: [] };
  const r = AnalysisReply.parse({ ...base, field: "Medicine", itField: "Robotics" });
  expect(r.field).toBe("Other");
  expect(r.itField).toBe("General");
  expect(AnalysisReply.parse({ ...base, field: "Maritime", itField: "General" }).field).toBe("Maritime");
});
