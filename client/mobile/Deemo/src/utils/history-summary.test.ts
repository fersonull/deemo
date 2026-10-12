/// <reference types="bun" />
import { expect, test } from "bun:test";

import { historySummary } from "./history-summary";

const s = (...scores: (number | undefined)[]) => scores.map((score) => ({ score }));

test("the trend is measured from the first scored session to the newest (list is newest first)", () => {
  expect(historySummary(s(88, 70, 75), null)).toEqual({ text: "Up 13 points since your first session. Your best so far is 88%.", mood: "cheering" });
  expect(historySummary(s(62, 75), null).text).toBe("Down 13 points since your first session. Practice the flagged topics and it will come back.");
  expect(historySummary(s(62, 75), null).mood).toBe("encouraging");
  expect(historySummary(s(70, undefined, 70), null).text).toBe("Level with your first session. Your best so far is 70%.");
  expect(historySummary(s(71, 70), null).text).toBe("Up 1 point since your first session. Your best so far is 71%.");
});

test("a stage filter names the stage", () => {
  expect(historySummary(s(80, 70), "Pre-Oral").text).toBe("Up 10 points since your first Pre-Oral session. Your best so far is 80%.");
  expect(historySummary([], "Final").text).toBe("No Final practice yet. Your first round will show up here.");
});

test("early days", () => {
  expect(historySummary([], null).mood).toBe("waving");
  expect(historySummary(s(undefined), null).text).toContain("No scored sessions yet");
  expect(historySummary(s(64), null).text).toBe("64% so far. One more scored session and your trend appears.");
});

test("Deemo's voice: at most two sentences, no exclamation marks", () => {
  for (const list of [s(), s(undefined), s(50), s(90, 50), s(50, 90), s(70, 70)]) {
    const { text } = historySummary(list, null);
    expect(text).not.toContain("!");
    expect(text.split(/\.\s/).length).toBeLessThanOrEqual(2);
  }
});
