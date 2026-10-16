import { expect, test } from "bun:test";

import { lineup, panelLabel, panelistName, profileCourse } from "./constants";

// Same table as server/src/modules/practice/domain/panel.test.ts: keep both sides seating the same panel.
test("the course decides who sits with one or two panelists, in panel order", () => {
  expect(lineup("BSIT", 1)).toEqual([1]);
  expect(lineup("BSIT", 2)).toEqual([0, 1]);
  expect(lineup("BSIT", 3)).toEqual([0, 1, 2]);
  expect(lineup("Nursing & Health", 2)).toEqual([1, 2]);
  expect(lineup("Psychology & Social Sciences", 1)).toEqual([2]);
  expect(lineup("Other", 1)).toEqual([0]);
  expect(lineup("Other", 2)).toEqual([0, 2]);
});

test("Santos is the course's field expert; the others keep their titles", () => {
  expect(panelistName(1, "Maritime")).toBe("Capt. Santos");
  expect(panelLabel(1, "Nursing & Health")).toBe("Clinical");
  expect(panelLabel(1, "BSIT")).toBe("Tech");
  expect(panelistName(0, "Maritime")).toBe("Dr. Reyes");
  expect(panelLabel(2, "Education")).toBe("Methods");
});

test("the panel follows the manuscript's field, else the student's course", () => {
  expect(profileCourse({ analysis: { field: "BSIT" } }, "Education")).toBe("BSIT");
  expect(profileCourse({ analysis: {} }, "Education")).toBe("Education");
  expect(profileCourse(undefined, "Maritime")).toBe("Maritime");
});
