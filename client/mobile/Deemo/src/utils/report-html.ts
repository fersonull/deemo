import { colors } from "@/colors";
import { DIFFICULTY_LABELS, MODE_LABELS } from "@/constants";
import type { Report, Session, SessionTurn } from "@/hooks/use-sessions";

import { formatTime } from "./format-time";

export const turnLabel = (t: SessionTurn) => `Q${t.number}${t.followUp ? `.${t.followUp}` : ""}`;

// Every number in the score, spelled out (addendum Q4: the arithmetic is done in code and shown).
export function formula(r: Report) {
  const counts = (["HIGH", "MEDIUM", "LOW"] as const)
    .map((s) => [s, r.contradictions.filter((c) => c.severity === s).length] as const)
    .filter(([, n]) => n)
    .map(([s, n]) => `${n} ${s.toLowerCase()}`);
  const coverage = `${Math.min(r.answered, r.planned)}/${r.planned}`;
  return `Rubric ${r.rubricScore} × coverage ${coverage} − consistency ${r.penalty}${counts.length ? ` (${counts.join(", ")})` : ""} = ${r.score}`;
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const SEVERITY = { HIGH: "High", MEDIUM: "Medium", LOW: "Low" } as const;

type Who = { student: string; date: string };

// The adviser's copy (design brief, "PDF export"): results blocks 1–7 on one or two printed pages, with the student,
// project, date and the practice disclaimer. Printed by expo-print, so plain HTML and inline CSS; fonts fall back to
// the system sans-serif.
export function reportHtml(s: Session, r: Report, who: Who) {
  const turn = (i: number | null) => (i !== null && s.turns[i] ? turnLabel(s.turns[i]) : "");
  const stage = `${MODE_LABELS[s.mode]}${s.difficulty && s.difficulty !== "STANDARD" ? ` · ${DIFFICULTY_LABELS[s.difficulty]}` : ""}`;
  const scored = r.scored !== false;
  const spoken = s.turns.filter((t) => t.latencyMs !== null);

  const fixes = r.fixes.length
    ? `<h2>Top 3 things to fix</h2><ol class="fixes">${r.fixes
        .map((f) => `<li>${esc(f.text)}${turn(f.turn) ? ` <span class="meta">${turn(f.turn)}</span>` : ""}</li>`)
        .join("")}</ol>`
    : "";

  const contradictions = r.contradictions.length
    ? `<h2>Contradictions</h2>${r.contradictions
        .map(
          (c) => `<div class="card avoid"><div class="row"><span class="meta">${turn(c.turn) || "During the session"}</span>
<span class="sev">${SEVERITY[c.severity]}</span></div>
<div class="quotes"><div class="quote"><div class="label">You said</div>"${esc(c.spokenClaim)}"</div>
<div class="quote ms"><div class="label">Your manuscript</div>"${esc(c.manuscriptEvidence)}"</div></div></div>`,
        )
        .join("")}`
    : "";

  const criteria = `<h2>Rubric</h2><div class="card">${r.criteria
    .map(
      (c) => `<div class="crit avoid"><div class="row"><b>${esc(c.name)}</b>
<span class="mono">${c.level === null ? "Not measured" : `${c.level}/5 · ${c.weight}%`}</span></div>
<div class="track"><div class="bar" style="width:${c.level === null ? 0 : ((c.level - 1) / 4) * 100}%"></div></div>
<div class="why">${esc(c.why)}</div></div>`,
    )
    .join("")}</div>`;

  const delivery = `<h2>Delivery</h2><div class="card avoid">${
    spoken.length
      ? `<table><tr><th>Question</th>${spoken.map((t) => `<td>${turnLabel(t)}</td>`).join("")}</tr>
<tr><th>Seconds to start</th>${spoken.map((t) => `<td class="mono">${((t.latencyMs ?? 0) / 1000).toFixed(1)}</td>`).join("")}</tr></table>`
      : `<div class="meta">No spoken answers to time.</div>`
  }<div class="row stats2"><span><b>${r.delivery.fillersPerMin ?? "–"}</b> fillers/min</span>
<span><b>${r.delivery.wordsPerMin ?? "–"}</b> words/min</span></div></div>`;

  const questions = s.turns.length
    ? `<h2>Question by question</h2><div class="qs">${s.turns
        .map((t, i) => {
          const f = r.turns[i];
          return `<div class="card avoid"><div class="q"><span class="qn">${turnLabel(t)}</span><span>${esc(t.question)}</span></div>
<div class="label">Your answer · ${esc(t.type.charAt(0) + t.type.slice(1).toLowerCase())}</div><p>${esc(t.answer.trim() || "(no answer)")}</p>
${f ? `<div class="label">Feedback</div><p>${esc(f.feedback)}</p><div class="better"><div class="label">A stronger answer</div>${esc(f.betterAnswer)}</div>` : ""}</div>`;
        })
        .join("")}</div>`
    : "";

  return `<!doctype html><html><head><meta charset="utf-8"><style>
@page { margin: 16mm 14mm; }
* { box-sizing: border-box; }
body { font-family: 'DM Sans', Roboto, sans-serif; color: ${colors.ink}; font-size: 10.5pt; line-height: 1.45; margin: 0; }
.top { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1px solid ${colors.border}; padding-bottom: 8px; }
.brand { font-weight: 800; font-size: 15pt; letter-spacing: -0.03em; }
.meta, .who { color: ${colors.muted}; font-size: 9pt; }
.who { text-align: right; }
.who b { color: ${colors.ink}; font-size: 10.5pt; }
.hero { display: flex; align-items: center; gap: 16px; margin-top: 14px; }
.score { font-weight: 800; font-size: 54pt; line-height: 1; letter-spacing: -0.04em; }
.score .unit { font-size: 28pt; letter-spacing: 0; }
.band { font-weight: 800; font-size: 17pt; line-height: 1.05; }
.formula, .mono { font-family: 'DM Mono', monospace; font-size: 8.5pt; color: ${colors.inkMuted}; }
.stats { display: flex; gap: 8px; margin-top: 10px; }
.stat { flex: 1; background: ${colors.sand}; border-radius: 12px; padding: 8px 12px; }
.stat b { font-family: 'DM Mono', monospace; font-size: 13pt; display: block; }
h2 { font-size: 8pt; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; color: ${colors.muted}; margin: 16px 0 6px; break-after: avoid; }
.card { background: ${colors.sand}; border-radius: 14px; padding: 10px 14px; margin-bottom: 6px; }
.avoid { break-inside: avoid; }
.row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.fixes { margin: 0; padding-left: 18px; }
.fixes li { margin-bottom: 4px; }
.sev { background: ${colors.amberTint}; color: ${colors.amberInk}; border-radius: 8px; padding: 1px 8px; font-size: 8.5pt; font-weight: 600; }
.quotes { display: flex; gap: 6px; margin-top: 6px; }
.quote { flex: 1; background: ${colors.paper}; border-radius: 10px; padding: 8px 10px; }
.quote.ms { border-left: 3px solid ${colors.amber}; }
.label { font-family: 'DM Mono', monospace; font-size: 7.5pt; letter-spacing: 0.12em; text-transform: uppercase; color: ${colors.muted}; margin-top: 6px; }
.crit { margin: 6px 0 10px; }
.track { height: 5px; border-radius: 3px; background: ${colors.paper}; margin-top: 4px; overflow: hidden; }
.bar { height: 100%; background: ${colors.dusk}; }
.why { color: ${colors.inkMuted}; font-size: 9pt; margin-top: 3px; }
table { border-collapse: collapse; font-size: 9pt; }
th { text-align: left; font-weight: 500; color: ${colors.muted}; padding-right: 12px; }
td { padding: 2px 8px; text-align: center; }
.stats2 { justify-content: flex-start; gap: 24px; margin-top: 6px; color: ${colors.inkMuted}; font-size: 9pt; }
.q { display: flex; gap: 8px; font-weight: 600; }
.qn { font-family: 'DM Mono', monospace; color: ${colors.duskLink}; font-weight: 500; flex: none; }
p { margin: 2px 0 0; }
.better { background: ${colors.duskTint}; border-radius: 10px; padding: 6px 10px; margin-top: 6px; }
.qs .card { font-size: 9.5pt; line-height: 1.4; padding: 8px 12px; }
</style></head><body>
<div class="top"><div><div class="brand">DEEMO</div><div class="meta">Practice result, not an official evaluation.</div></div>
<div class="who"><b>${esc(who.student)}</b><br>${esc(s.title)}<br>${esc(stage)} · ${esc(who.date)}</div></div>
<div class="hero"><div class="score">${scored ? `${r.score}<span class="unit">%</span>` : "–"}</div><div class="band">${esc(r.band)}</div></div>
<p>${esc(r.headline)}</p>
${scored ? `<div class="formula">${esc(formula(r))}</div>` : ""}
<div class="stats"><div class="stat"><b>${formatTime(s.durationMs)}</b><span class="meta">length</span></div>
<div class="stat"><b>${r.answered}</b><span class="meta">answered</span></div>
<div class="stat"><b>${r.contradictions.length}</b><span class="meta">${r.contradictions.length === 1 ? "contradiction" : "contradictions"}</span></div></div>
${fixes}${contradictions}${criteria}${delivery}${questions}
</body></html>`;
}
