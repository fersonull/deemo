/// <reference types="bun" />
import { expect, test } from "bun:test";

import { RubricInput, rubricFromReply, toPercents } from "./rubric";

test("a form's points become whole percents that sum to 100", () => {
  expect(toPercents([30, 25, 20, 15, 10])).toEqual([30, 25, 20, 15, 10]);
  expect(toPercents([20, 20, 10])).toEqual([40, 40, 20]);
  expect(toPercents([1, 1, 1])).toEqual([34, 33, 33]);
  expect(toPercents([0, 0])).toEqual([50, 50]);
  expect(toPercents([7, 13, 29, 31, 20]).reduce((a, b) => a + b, 0)).toBe(100);
});

const criterion = (name: string, weight: number, scored = true) => ({
  name,
  desc: "What the panel looks for.",
  points: weight,
  weight,
  scored,
  levels: ["Poor", "Fair", "Excellent"],
});
const parse = (x: unknown) => {
  const r = RubricInput.safeParse(x);
  return r.success ? r.data : null;
};

test("a saved rubric is trimmed and its scored weights must total 100", () => {
  const ok = parse({ source: "form.pdf", criteria: [criterion("Mastery", 60), criterion("Delivery", 40), criterion("Paper", 0, false)] });
  expect(ok?.criteria.map((c) => c.weight)).toEqual([60, 40, 0]);
  expect(parse({ criteria: [criterion("Mastery", 60), criterion("Delivery", 30)] })).toBeNull(); // 90%
  expect(parse({ criteria: [criterion("Mastery", 100), criterion("Paper", 10, false)] })).toBeNull(); // unscored with weight
  expect(parse({ criteria: [{ ...criterion("Mastery", 100), levels: ["a", "b"] }] })).toBeNull();
  expect(parse({ criteria: [criterion("", 100)] })).toBeNull();
  expect(parse({ criteria: Array.from({ length: 13 }, (_, i) => criterion(`C${i}`, i ? 0 : 100)) })).toBeNull();
  expect(parse({ criteria: [criterion("x".repeat(200), 100)] })?.criteria[0]?.name.length).toBe(80);
});

test("the weights message reaches the student", () => {
  const r = RubricInput.safeParse({ criteria: [criterion("Mastery", 60), criterion("Delivery", 30)] });
  expect(r.success ? "" : r.error.issues[0]?.message).toBe("Each scored criterion needs a weight, totaling 100%.");
});

test("a read form keeps every criterion; only scorable ones carry weight", () => {
  const c = (name: string, points: number, scorable: boolean) => ({ name, desc: "d", points, scorable, level1: "a", level3: "", level5: "c" });
  const r = rubricFromReply({ isRubric: true, notRubricReason: "", criteria: [c("Mastery", 30, true), c("Paper", 20, false), c("Delivery", 10, true)] }, " form.pdf ");
  expect(r.source).toBe("form.pdf");
  expect(r.criteria.map((x) => x.weight)).toEqual([75, 0, 25]);
  expect(r.criteria[0]!.levels).toEqual(["a", "—", "c"]);
});
