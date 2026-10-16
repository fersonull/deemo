import { PANEL } from "@/constants";

import type { LiveState } from "./types";

// What a panelist taking over is told (sequential panel: each panelist has their own Live session and voice, so the
// next one never heard the earlier audio). The student's presentation, every question and answer so far, the
// contradictions flagged and the topics covered, trimmed so the note stays short.

const cut = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);
const MAX = 6000;

// `from`, `to` and the turns' askers are seats; `seats[seat]` is the persona sitting there.
export function handoverNote(s: LiveState, from: number, to: number, seats: number[] = [0, 1, 2]) {
  const name = (seat: number) => {
    const p = PANEL[seats[seat] ?? seat];
    return p ? `${p.name} (${p.role})` : "A panelist";
  };
  const firstPanel = s.lines.findIndex((l) => l.who !== "you");
  const presentation = s.lines
    .slice(0, firstPanel < 0 ? s.lines.length : firstPanel)
    .filter((l) => l.who === "you")
    .map((l) => l.text)
    .join(" ")
    .trim();
  const turns = s.turns.map(
    (t, i) => `Q${i + 1} by ${name(t.question.panelist)}: ${cut(t.question.text, 300)}\nStudent: ${cut(t.answer || "(no answer)", 500)}`,
  );
  const topics = [...new Set(s.turns.map((t) => t.question.topicId))];
  const flags = s.flags.map((f) => `- Said "${cut(f.spokenClaim, 160)}" but the manuscript says "${cut(f.manuscriptEvidence, 160)}" (${f.severity})`);

  const note = [
    `(Handover: ${name(from)} has finished questioning. You are ${name(to)}; it is your turn now.)`,
    presentation ? `Student's presentation: ${cut(presentation, 900)}` : "",
    turns.length ? `Questions so far:\n${turns.join("\n")}` : "",
    flags.length ? `Contradictions already flagged:\n${flags.join("\n")}` : "",
    topics.length ? `Topics already covered (don't repeat them): ${topics.join(", ")}.` : "",
    "Introduce yourself in a few words, then call ask_question and ask your first question.",
  ]
    .filter(Boolean)
    .join("\n\n");
  return note.length > MAX ? `${note.slice(0, MAX - 200)}…\n\nIntroduce yourself in a few words, then call ask_question and ask your first question.` : note;
}
