// Figure 2: Data Flow Diagram (Gane-Sarson, like the group's sample), left to right for a landscape page.
import { writeFileSync } from "node:fs";
import { drawLabels, edgePoints, htmlFor, labelOf, placeLabelsOnLines, layout, roundedPath, svgDoc, textBlock, wrap } from "./lib.mjs";

const P = { w: 210, h: 118, head: 34 }; // process
const E = { w: 176, h: 66 }; // external entity
const S = { w: 270, h: 54, id: 46 }; // data store

const procColors = ["#BFDBFE", "#C7D2FE", "#DBEAFE", "#A5B4FC", "#C4B5FD", "#DDD6FE", "#C7D2FE", "#DBEAFE"];

const processes = [
  ["p1", "1.0", "Manage Account and Consent"],
  ["p2", "2.0", "Analyze Manuscript"],
  ["p3", "3.0", "Set Up Rubric"],
  ["p4", "4.0", "Prepare Agenda and Token"],
  ["p5", "5.0", "Score Session"],
  ["p6", "6.0", "Show Reports, Groups and Inbox"],
  ["p7", "7.0", "Administer Accounts and Notices"],
  ["p8", "8.0", "Run Defense on Phone"],
];
const entities = [
  ["student", "Student"],
  ["admin", "Administrator"],
  ["fcm", "Firebase Cloud Messaging"],
  ["auth", "Firebase Authentication"],
  ["dicebear", "DiceBear Avatar API"],
  ["flash", "Google Gemini API (Flash)"],
  ["live", "Gemini Live API"],
];
// Numbered top to bottom, in the order the processes use them.
const stores = [
  ["d1", "D1", "Account Data"],
  ["d2", "D2", "Project Data"],
  ["d5", "D3", "Live Starts"],
  ["d3", "D4", "Session Data"],
  ["d4", "D5", "Group Data"],
  ["d6", "D6", "Admin Audit Data"],
  ["d7", "D7", "Notice and Receipt Data"],
];

// [from, to, label, both directions]
const flows = [
  ["student", "p1", "sign-in, name, course, consent / account status", true],
  ["p1", "auth", "credentials, name / verified identity", true],
  ["p1", "dicebear", "avatar seed / face image", true],
  ["p1", "d1", "consent, course, plan, avatar, device token"],
  ["student", "p2", "manuscript, corrections / summary and field", true],
  ["p2", "flash", "manuscript / summary, facts", true],
  ["p2", "d2", "confirmed analysis and academic field"],
  ["student", "p3", "rubric file or weights"],
  ["p3", "flash", "rubric file / criteria", true],
  ["p3", "d2", "saved rubric"],
  ["student", "p4", "stage, panelists, follow-ups, difficulty"],
  ["d1", "p4", "course and plan"],
  ["d2", "p4", "analysis, rubric"],
  ["p4", "d5", "start / daily count", true],
  ["p4", "p8", "agenda, locked token, safety cap"],
  ["student", "p8", "presentation, answers / questions, transcript", true],
  ["p8", "live", "direct WSS audio / speech, transcript, tools", true],
  ["p8", "p5", "transcript, timings, flags and agenda"],
  ["d3", "p5", "session to score"],
  ["p5", "flash", "answers / levels, feedback", true],
  ["p5", "d3", "saved session and report"],
  ["d3", "p6", "reports, history"],
  ["d1", "p6", "names, avatars, plans"],
  ["p6", "d4", "members, focus / shared scores", true],
  ["student", "p6", "group code, read choice / reports, PDF, export, inbox", true],
  ["admin", "p7", "authorized actions and notice audience / status", true],
  ["p7", "auth", "admin token / identity and claim", true],
  ["p7", "d1", "account actions / audience and tokens", true],
  ["p7", "d6", "audit record"],
  ["p7", "d7", "notice and resolved recipients"],
  ["p7", "fcm", "notification request / delivery result", true],
  ["fcm", "p6", "notification tap and notice identifier"],
  ["p6", "d7", "read receipt / visible notices", true],
];

const kind = {};
const children = [
  ...processes.map(([id]) => ((kind[id] = "process"), { id, width: P.w, height: P.h })),
  ...entities.map(([id]) => ((kind[id] = "entity"), { id, width: E.w, height: E.h })),
  ...stores.map(([id]) => ((kind[id] = "store"), { id, width: S.w, height: S.h })),
];
// Columns, left to right: the Student, the processes, the data stores, the external services.
const column = (id) => (["student", "admin"].includes(id) ? 0 : kind[id] === "process" ? 1 : kind[id] === "store" ? 2 : 3);
for (const c of children) c.layoutOptions = { "elk.partitioning.partition": String(column(c.id)) };

// For layout every edge runs left to right; `back` remembers which end the arrow belongs on.
const edges = flows.map(([s, t, label, bi], i) => {
  const back = column(s) > column(t);
  return { id: `e${i}`, sources: [back ? t : s], targets: [back ? s : t], bi: !!bi, back, labels: labelOf(label, 26) };
});

const g = await layout(
  { children, edges },
  {
    "elk.direction": "RIGHT",
    "elk.partitioning.activate": "true",
    "elk.layered.spacing.nodeNodeBetweenLayers": "60",
    "elk.spacing.nodeNode": "46",
    "elk.spacing.edgeEdge": "16",
    "elk.spacing.edgeNode": "26",
    "elk.layered.spacing.edgeNodeBetweenLayers": "24",
    "elk.layered.spacing.edgeEdgeBetweenLayers": "14",
    "elk.spacing.edgeLabel": "2",
    "elk.edgeLabels.inline": "true",
    "elk.layered.crossingMinimization.forceNodeModelOrder": "true",
  },
);

// Number the data stores D1 to D5 from top to bottom, wherever the layout put them.
g.children
  .filter((c) => kind[c.id] === "store")
  .sort((a, b) => a.y - b.y)
  .forEach((c, i) => (stores.find((st) => st[0] === c.id)[1] = `D${i + 1}`));
placeLabelsOnLines(g);

const info = Object.fromEntries([...processes.map(([id, n, name]) => [id, { n, name }]), ...entities.map(([id, name]) => [id, { name }]), ...stores.map(([id, n, name]) => [id, { n, name }])]);
const stroke = "#0b1220";

function drawNode(n) {
  const { x, y, width: w, height: h } = n;
  const k = kind[n.id];
  const d = info[n.id];
  if (k === "process") {
    const fill = procColors[Number(d.n[0]) - 1];
    return (
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${fill}" stroke="${stroke}" stroke-width="2"/>` +
      `<line x1="${x}" y1="${y + P.head}" x2="${x + w}" y2="${y + P.head}" stroke="${stroke}" stroke-width="2"/>` +
      textBlock([d.n], x + w / 2, y + P.head / 2, { size: 14, weight: 800 }) +
      textBlock(wrap(d.name, 20), x + w / 2, y + P.head + (h - P.head) / 2, { size: 15, weight: 700 })
    );
  }
  if (k === "entity") {
    return (
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#D1D5DB" stroke="#4B5563" stroke-width="2"/>` +
      textBlock(wrap(d.name, 18), x + w / 2, y + h / 2, { size: 15, weight: 700 })
    );
  }
  // Data store: open on the right, with the ID in its own cell.
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#E5E7EB"/>` +
    `<path d="M${x + w},${y} H${x} V${y + h} H${x + w}" fill="none" stroke="#4B5563" stroke-width="2"/>` +
    `<line x1="${x + S.id}" y1="${y}" x2="${x + S.id}" y2="${y + h}" stroke="#4B5563" stroke-width="2"/>` +
    textBlock([d.n], x + S.id / 2, y + h / 2, { size: 14, weight: 800 }) +
    textBlock([d.name], x + S.id + (w - S.id) / 2, y + h / 2, { size: 15, weight: 700 })
  );
}

const defs = `
<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
  <path d="M0,0 L10,5 L0,10 Z" fill="${stroke}"/></marker>`;

const body =
  g.edges
    .map((e) => `<path d="${roundedPath(edgePoints(e), 10)}" fill="none" stroke="${stroke}" stroke-width="2" ${e.bi || !e.back ? 'marker-end="url(#arrow)"' : ""}${e.bi || e.back ? ' marker-start="url(#arrow)"' : ""}/>`)
    .join("") +
  g.children.map(drawNode).join("") +
  g.edges.map((e) => drawLabels(e, { weight: 600, fill: "#0b1220" })).join("");

const W = Math.ceil(g.width), H = Math.ceil(g.height);
writeFileSync("dfd.html", htmlFor(svgDoc(W, H, defs, body), W, H));
console.log("dfd", W, H);
