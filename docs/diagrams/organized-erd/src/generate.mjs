import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { roundedPath, textBlock } from "../../src/lib.mjs";
import { entities, rels } from "./data.mjs";

// Sized for pasting into a document: a compact six-column layout (much narrower than the old 6600 px canvas) with
// large bold type, so the figure stays readable when the whole page width holds it.
const W = 560, HEAD = 100, ROW = 42, VGAP = 80;
const T = { title: 40, note: 24, field: 30, type: 26, label: 28, header: 64, sub: 32, legend: 30 };
const ink = "#111827", line = "#1f2a44", STROKE = 3.4;
const byId = Object.fromEntries(entities.map((e) => [e[0], e]));
const text = (s, x, y, size, weight = 400, anchor = "start", fill = ink) => textBlock([s], x, y, { size, weight, anchor, fill });
const height = (id) => HEAD + byId[id][3].length * ROW + 14;
const original = readFileSync(new URL("../../src/erd.mjs", import.meta.url), "utf8");
const snapshot = readFileSync(new URL("./data.mjs", import.meta.url), "utf8").split("\n").slice(1).join("\n").replaceAll("export const", "const").trim();
assert.equal(snapshot, original.slice(original.indexOf("const id ="), original.indexOf("const byId =")).trim(), "Keep organized ERD data in sync with the original");

// ── layout: columns left to right; users → projects → sessions → reports share one row (MAIN) ──
const MARGIN = 110, TOP = 230, MAIN = 760;
const GAPS = [330, 320, 300, 300, 320]; // between columns; wide enough for the relationship labels
const colX = [MARGIN];
GAPS.forEach((g, i) => colX.push(colX[i] + W + g));
const columns = [
  // [column, anchor id, anchor top, ids top to bottom]
  [0, "notice", null, ["nread", "notice", "nrec", "admin", "rate"]],
  [1, "user", MAIN, ["livestart", "user", "push"]],
  [2, "project", MAIN, ["member", "group", "project", "rubric", "criterion"]],
  [3, "session", MAIN, ["analysis", "session"]],
  [4, "report", MAIN, ["flag", "report", "turn"]],
  [5, "report", null, ["rcrit", "rcontra", "rturn", "rfix"]],
];
const nodes = {};
for (const [c, anchor, top, ids] of [...columns].sort((a, b) => (a[2] === null) - (b[2] === null))) {
  const tops = [];
  ids.reduce((y, id) => (tops.push(y), y + height(id) + VGAP), 0);
  let shift;
  if (top !== null) shift = top - tops[ids.indexOf(anchor)];
  else {
    // centred on the user (notices) or the report (its children)
    const target = c === 0 ? nodes.user : nodes.report;
    const total = tops.at(-1) + height(ids.at(-1));
    shift = target.y - TOP + target.h / 2 - total / 2;
  }
  ids.forEach((id, i) => (nodes[id] = { id, x: colX[c], y: TOP + tops[i] + shift, w: W, h: height(id) }));
}
const minY = Math.min(...Object.values(nodes).map((n) => n.y));
if (minY < TOP) for (const n of Object.values(nodes)) n.y += TOP - minY;
const R = (n) => n.x + n.w, B = (n) => n.y + n.h;

// ── routes ──
// straight: right side of a → left side of b at one y (the tables overlap vertically)
const straight = (a, b, y) => [[R(nodes[a]), y], [nodes[b].x, y]];
// lane: right side of a at ya → x → b's left side at yb
const lane = (a, b, ya, x, yb) => [[R(nodes[a]), ya], [x, ya], [x, yb], [nodes[b].x, yb]];
// stacked tables in one column: bottom of the upper to top of the lower at x
const down = (upper, lower, x) => [[x, B(nodes[upper])], [x, nodes[lower].y]];
const n = nodes, mid = (id) => n[id].x + W / 2, row = (id, i) => n[id].y + HEAD + ROW * i + ROW / 2;
const g = (c) => colX[c] + W; // a gap's left edge

const paths = {
  // notices ↔ users (gap 0)
  "user:notice": straight("notice", "user", row("notice", 6)),
  "user:nread": lane("nread", "user", row("nread", 1), g(0) + 220, row("user", 0)),
  "user:nrec": straight("nrec", "user", row("nrec", 0)),
  "notice:nread": down("nread", "notice", mid("notice")),
  "notice:nrec": down("notice", "nrec", mid("notice")),
  // users column
  "user:livestart": down("livestart", "user", mid("user")),
  "user:push": down("user", "push", mid("user")),
  // users ↔ projects (gap 1)
  "user:member": lane("user", "member", row("user", 0), g(1) + 90, row("member", 1)),
  "user:group": lane("user", "group", row("user", 2), g(1) + 170, row("group", 1)),
  "user:project": straight("user", "project", row("user", 5)),
  "user:session": (() => {
    const low = B(n.criterion) + 70;
    return [[R(n.user), row("user", 13)], [g(1) + 250, row("user", 13)], [g(1) + 250, low], [g(2) + 230, low], [g(2) + 230, row("session", 21)], [n.session.x, row("session", 21)]];
  })(),
  // projects column
  "group:member": down("member", "group", mid("group")),
  "project:group": down("group", "project", mid("group")),
  "project:rubric": down("project", "rubric", mid("project")),
  "rubric:criterion": down("rubric", "criterion", mid("rubric")),
  // projects ↔ sessions (gap 2)
  "project:analysis": lane("project", "analysis", row("project", 1), g(2) + 120, row("analysis", 6)),
  "project:session": straight("project", "session", row("project", 5)),
  // sessions ↔ report and its siblings (gap 3)
  "session:flag": lane("session", "flag", row("session", 1), g(3) + 150, row("flag", 3)),
  "session:report": straight("session", "report", row("report", 2)),
  "session:turn": straight("session", "turn", row("turn", 2)),
  // report ↔ its children (gap 4)
  "report:rcrit": lane("report", "rcrit", row("report", 0), g(4) + 110, row("rcrit", 3)),
  "report:rcontra": straight("report", "rcontra", row("rcontra", 3)),
  "report:rturn": straight("report", "rturn", row("rturn", 0)),
  "report:rfix": lane("report", "rfix", row("report", 13), g(4) + 110, row("rfix", 2)),
};

const routes = rels.map(([from, to]) => {
  const coords = paths[`${from}:${to}`];
  assert(coords, `no route for ${from}:${to}`);
  return { from, to, coords };
});
const list = Object.values(nodes);
assert.equal(list.length, entities.length);

// ── checks: every line attached, no line through a table, no crossings or shared segments ──
const onBorder = ([x, y], m) => ((x === m.x || x === m.x + m.w) && y >= m.y && y <= m.y + m.h) || ((y === m.y || y === m.y + m.h) && x >= m.x && x <= m.x + m.w);
for (const r of routes) {
  const ends = [n[r.from], n[r.to]];
  assert(ends.some((m) => onBorder(r.coords[0], m)) && ends.some((m) => onBorder(r.coords.at(-1), m)), `${r.from}:${r.to}: detached line`);
}
const segments = routes.flatMap((r, ri) => r.coords.slice(1).map((b, i) => {
  const a = r.coords[i];
  assert(a[0] === b[0] || a[1] === b[1], `${r.from}:${r.to}: diagonal`);
  return { ri, x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]), y0: Math.min(a[1], b[1]), y1: Math.max(a[1], b[1]) };
}));
for (const s of segments) for (const m of list) {
  const through = s.x0 === s.x1 ? s.x0 > m.x && s.x0 < m.x + m.w && s.y0 < m.y + m.h && s.y1 > m.y : s.y0 > m.y && s.y0 < m.y + m.h && s.x0 < m.x + m.w && s.x1 > m.x;
  assert(!through, `${routes[s.ri].from}:${routes[s.ri].to} runs through ${m.id}`);
}
for (let i = 0; i < segments.length; i++) for (const t of segments.slice(i + 1)) {
  const s = segments[i];
  if (s.ri === t.ri) continue;
  const hit = s.x0 === s.x1 && t.x0 === t.x1
    ? s.x0 === t.x0 && Math.min(s.y1, t.y1) > Math.max(s.y0, t.y0)
    : s.y0 === s.y1 && t.y0 === t.y1
      ? s.y0 === t.y0 && Math.min(s.x1, t.x1) > Math.max(s.x0, t.x0)
      : s.x0 === s.x1
        ? s.x0 > t.x0 && s.x0 < t.x1 && t.y0 > s.y0 && t.y0 < s.y1
        : t.x0 > s.x0 && t.x0 < s.x1 && s.y0 > t.y0 && s.y0 < t.y1;
  assert(!hit, `crossing: ${routes[s.ri].from}:${routes[s.ri].to} / ${routes[t.ri].from}:${routes[t.ri].to}`);
}

// ── drawing ──
const mk = (id, inner) => `<marker id="${id}" viewBox="0 0 40 28" refX="40" refY="14" markerWidth="40" markerHeight="28" orient="auto-start-reverse" markerUnits="userSpaceOnUse">${inner}</marker>`;
const bar = (x) => `<line x1="${x}" y1="3" x2="${x}" y2="25" stroke="${line}" stroke-width="3"/>`;
const ring = (x) => `<circle cx="${x}" cy="14" r="6.5" fill="white" stroke="${line}" stroke-width="3"/>`;
const fork = `<path d="M18,14 L40,3 M18,14 L40,14 M18,14 L40,25" fill="none" stroke="${line}" stroke-width="3"/>`;
const defs = mk("one", bar(24) + bar(31)) + mk("zeroOne", ring(12) + bar(31)) + mk("many0", fork + ring(9)) + mk("many1", fork + bar(13));

function entity(m) {
  const { id, x, y, w, h } = m;
  const [, title, note, rows] = byId[id];
  const fill = ["admin", "rate"].includes(id) ? "#e9ecf1" : "#dbe4fb";
  let out = `<g data-entity="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="white" stroke="${line}" stroke-width="${STROKE}"/>`;
  out += `<path d="M${x},${y + HEAD} V${y + 10} Q${x},${y} ${x + 10},${y} H${x + w - 10} Q${x + w},${y} ${x + w},${y + 10} V${y + HEAD} Z" fill="${fill}" stroke="${line}" stroke-width="${STROKE}"/>`;
  out += text(title, x + 20, y + 36, T.title, 800);
  if (note) out += text(note, x + 20, y + 74, T.note, 600, "start", "#334155");
  rows.forEach(([field, type, key], i) => {
    const cy = y + HEAD + ROW * i + ROW / 2 + 4;
    out += text(key ? `${field} (${key})` : field, x + 18, cy, T.field, key ? 800 : 600);
    out += text(type, x + w - 18, cy, T.type, 600, "end", "#334155");
  });
  return out + "</g>";
}
function link(r) {
  const [, , verb, se, te, logical] = rels.find(([s, t]) => s === r.from && t === r.to);
  const runs = r.coords.slice(1).map((b, i) => [r.coords[i], b]);
  const flat = runs.filter(([a, b]) => a[1] === b[1]).sort(([a, b], [c, d]) => Math.abs(d[0] - c[0]) - Math.abs(b[0] - a[0]));
  let label;
  if (flat.length) {
    // the segment into the target table when it has room, so labels sit next to what they describe
    const last = runs.at(-1);
    const [a, b] = last[0][1] === last[1][1] && Math.abs(last[1][0] - last[0][0]) >= 140 ? last : flat[0];
    label = text(verb, (a[0] + b[0]) / 2, a[1] - 26, T.label, 800, "middle");
  } else {
    const [a, b] = runs[0]; // a vertical link between stacked tables: label beside it
    label = text(verb, a[0] + 16, (a[1] + b[1]) / 2, T.label, 800);
  }
  const path = `<path d="${roundedPath(r.coords.map(([x, y]) => ({ x, y })))}" fill="none" stroke="${line}" stroke-width="${STROKE}"${logical ? ' stroke-dasharray="14 10"' : ""} marker-start="url(#${se})" marker-end="url(#${te})"/>`;
  return `<g data-relation="${r.from}:${r.to}">${path}${label}</g>`;
}

const width = R(n.rcrit) + MARGIN;
const bottom = Math.max(...list.map(B), ...routes.flatMap((r) => r.coords.map(([, y]) => y)));
const legendY = bottom + 110;
const height_ = legendY + 120;
const header = text("DEEMO  /  Entity relationship diagram", MARGIN, 80, T.header, 800) + text("22 tables · 24 relationships · users → projects → sessions → reports, left to right", MARGIN, 150, T.sub, 600, "start", "#334155");
let legend = "";
["one", "zeroOne", "many0", "many1"].forEach((id, i) => {
  const x = MARGIN + i * 520;
  legend += `<path d="M${x},${legendY} H${x + 130}" stroke="${line}" stroke-width="${STROKE}" marker-end="url(#${id})"/>` + text(["exactly one", "zero or one", "zero or many", "one or many"][i], x + 150, legendY, T.legend, 700);
});
legend += text("Solid line = foreign key · dashed = logical project reference (no FK) · PK primary key · FK foreign key · UQ unique · grey tables have no relationships", MARGIN, legendY + 64, T.legend - 2, 600, "start", "#334155");
const body = header + routes.map(link).join("") + list.map(entity).join("") + legend;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height_}" viewBox="0 0 ${width} ${height_}" font-family="Arial, Helvetica, sans-serif"><title>DEEMO entity relationship diagram</title><defs>${defs}</defs><rect width="100%" height="100%" fill="white"/>${body}</svg>`;
writeFileSync("DEEMO-ERD-organized.svg", svg);
writeFileSync("routing-checks.json", JSON.stringify({ tables: list.length, relationships: routes.length, crossings: 0, sharedSegments: 0, routesThroughTables: 0, detachedEndpoints: 0, size: [width, height_], routes }, null, 2) + "\n");
console.log(`ERD ${width}×${height_}: 22 tables, 24 relationships; no crossings, shared segments, lines through tables or detached ends.`);
