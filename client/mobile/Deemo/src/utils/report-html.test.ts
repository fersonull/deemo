/// <reference types="bun" />
import { expect, test } from "bun:test";

import type { Report, Session } from "@/hooks/use-sessions";

import { formula, reportHtml } from "./report-html";

const report: Report = {
  score: 54,
  band: "Developing",
  message: "",
  rubricScore: 66,
  penalty: 6,
  answered: 3,
  planned: 4,
  criteria: [{ key: "content", name: "Content Mastery", weight: 30, level: 3, why: "Knew the <scope>." }],
  contradictions: [{ spokenClaim: "50 users", manuscriptEvidence: "30 respondents", severity: "HIGH", turn: 0 }],
  turns: [{ feedback: "State the sample first.", betterAnswer: "We surveyed 30 respondents." }],
  fixes: [{ text: "Lead with the number.", turn: 0 }],
  headline: "Solid start.",
  delivery: { latencyS: 2, fillersPerMin: 4, wordsPerMin: 120 },
};

const session = {
  id: "s1",
  createdAt: "2026-10-10T08:00:00.000Z",
  status: "ready",
  title: 'CampusLost <script>alert("x")</script>',
  mode: "PRE_ORAL",
  difficulty: "HARD",
  durationMs: 761000,
  turns: [{ number: 1, followUp: 1, type: "TECHNICAL", panelist: 0, question: "How many users?", answer: "50 & more", latencyMs: 2400, answerMs: 9000 }],
  lines: [],
  report,
} as Session;

test("the adviser's copy carries the student, project, stage, date, score and the disclaimer", () => {
  const html = reportHtml(session, report, { student: "Casper", date: "Oct 10, 2026" });
  for (const part of ["Casper", "Pre-Oral · Hard · Oct 10, 2026", ">54<", "Developing", "12:41", "Practice result, not an official evaluation."])
    expect(html).toContain(part);
  expect(html).toContain("Q1.1");
  expect(html).toContain("2.4");
  expect(html).toContain("We surveyed 30 respondents.");
});

test("everything the student or the model wrote is escaped", () => {
  const html = reportHtml(session, report, { student: "<b>me</b>", date: "x" });
  expect(html).not.toContain("<script>");
  expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
  expect(html).toContain("50 &amp; more");
  expect(html).toContain("Knew the &lt;scope&gt;.");
  expect(html).toContain("&lt;b&gt;me&lt;/b&gt;");
});

test("an unscored session shows a dash and no formula", () => {
  const r = { ...report, scored: false, band: "Not scored" };
  const html = reportHtml(session, r, { student: "Casper", date: "x" });
  expect(html).toContain(">–<");
  expect(html).not.toContain("coverage");
});

test("the formula spells out every number", () => {
  expect(formula(report)).toBe("Rubric 66 × coverage 3/4 − consistency 6 (1 high) = 54");
});
