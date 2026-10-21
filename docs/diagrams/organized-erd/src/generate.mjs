import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { roundedPath, textBlock } from "../../src/lib.mjs";
import { entities, rels } from "./data.mjs";

const W = 480, HEAD = 76, ROW = 30, TOP = 100;
const ink = "#172033", line = "#46536a";
const byId = Object.fromEntries(entities.map((e) => [e[0], e]));
const text = (s, x, y, size = 24, weight = 400, anchor = "start") => textBlock([s], x, y, { size, weight, anchor, fill: ink });
const height = (id) => HEAD + byId[id][3].length * ROW + 10;
const original = readFileSync(new URL("../../src/erd.mjs", import.meta.url), "utf8");
const snapshot = readFileSync(new URL("./data.mjs", import.meta.url), "utf8").split("\n").slice(1).join("\n").replaceAll("export const", "const").trim();
assert.equal(snapshot, original.slice(original.indexOf("const id ="), original.indexOf("const byId =")).trim(), "Keep organized ERD data in sync with the original");

// Users → projects → sessions → reports reads left to right; side branches use separate lanes.
const positions = [
  ["user", 1000, 1200], ["livestart", 1000, 100], ["push", 1500, 2300],
  ["notice", 100, 1200], ["nread", 100, 200], ["nrec", 100, 2300],
  ["member", 1000, 500], ["group", 2000, 500], ["project", 2000, 1200],
  ["analysis", 3000, 100], ["rubric", 2000, 1800], ["criterion", 2700, 2300],
  ["session", 3000, 1200], ["turn", 4000, 100], ["flag", 4000, 650],
  ["report", 5000, 1200], ["rcrit", 6000, 100], ["rcontra", 6000, 650],
  ["rturn", 6000, 1800], ["rfix", 6000, 2500],
  ["admin", 5000, 100], ["rate", 5000, 650],
];
const paths = [
  ["user", "livestart", [[1120, 1200], [1120, 850], [900, 850], [900, 200], [1000, 200]]],
  ["user", "group", [[1480, 1285], [1700, 1285], [1700, 670], [2000, 670]]],
  ["user", "member", [[1360, 1200], [1360, 736]]],
  ["group", "member", [[2000, 585], [1480, 585]]],
  ["user", "project", [[1480, 1450], [2000, 1450]]],
  ["user", "session", [[1240, 1766], [1240, 2850], [3240, 2850], [3240, 2006]]],
  ["project", "group", [[2240, 1200], [2240, 706]]],
  ["project", "analysis", [[2360, 1200], [2360, 900], [3240, 900], [3240, 576]]],
  ["project", "rubric", [[2240, 1646], [2240, 1800]]],
  ["rubric", "criterion", [[2240, 1946], [2240, 2385], [2700, 2385]]],
  ["project", "session", [[2480, 1285], [3000, 1285]]],
  ["session", "turn", [[3120, 1200], [3120, 1000], [3740, 1000], [3740, 200], [4000, 200]]],
  ["session", "flag", [[3360, 1200], [3360, 1100], [4240, 1100], [4240, 946]]],
  ["session", "report", [[3480, 1285], [5000, 1285]]],
  ["report", "rcrit", [[5480, 1285], [5580, 1285], [5580, 185], [6000, 185]]],
  ["report", "rcontra", [[5480, 1400], [5660, 1400], [5660, 735], [6000, 735]]],
  ["report", "rturn", [[5480, 1500], [5660, 1500], [5660, 1885], [6000, 1885]]],
  ["report", "rfix", [[5480, 1600], [5580, 1600], [5580, 2585], [6000, 2585]]],
  ["user", "notice", [[1000, 1480], [580, 1480]]],
  ["user", "nread", [[1000, 1300], [800, 1300], [800, 285], [580, 285]]],
  ["notice", "nread", [[340, 1200], [340, 376]]],
  ["user", "nrec", [[1000, 1600], [800, 1600], [800, 2385], [580, 2385]]],
  ["notice", "nrec", [[340, 1496], [340, 2300]]],
  ["user", "push", [[1360, 1766], [1360, 2000], [1740, 2000], [1740, 2300]]],
];
const nodes = positions.map(([id, x, y]) => ({ id, x, y: y + TOP, w: W, h: height(id) }));
const routes = paths.map(([from, to, coords]) => ({ from, to, coords: coords.map(([x, y]) => [x, y + TOP]) }));
assert.equal(nodes.length, entities.length);
assert.equal(new Set(nodes.map((n) => n.id)).size, 22);
assert.deepEqual(routes.map((r) => `${r.from}:${r.to}`).toSorted(), rels.map(([s, t]) => `${s}:${t}`).toSorted());
const mainPath = ["user", "project", "session", "report"].map((id) => nodes.find((n) => n.id === id));
assert.equal(new Set(mainPath.map((n) => n.y)).size, 1, "Main path must share a horizontal row");
assert(mainPath.every((n, i) => !i || n.x > mainPath[i - 1].x + W), "Main path must read left to right");
const reached = new Set(["user"]), queue = ["user"];
for (const id of queue) for (const [from, to] of rels) {
  const next = from === id ? to : to === id ? from : undefined;
  if (next && !reached.has(next)) { reached.add(next); queue.push(next); }
}
assert.equal(reached.size, 20);
assert.deepEqual(nodes.filter((n) => !reached.has(n.id)).map((n) => n.id).toSorted(), ["admin", "rate"]);

// Test actual centerlines; no white masks or disconnected stubs conceal crossings.
const segments = routes.flatMap((r, ri) => r.coords.slice(1).map((b, i) => {
  const a = r.coords[i];
  assert(a[0] === b[0] || a[1] === b[1], "Diagonal edge");
  return { ri, x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]), y0: Math.min(a[1], b[1]), y1: Math.max(a[1], b[1]) };
}));
const onBorder = ([x, y], n) => ((x === n.x || x === n.x + n.w) && y >= n.y && y <= n.y + n.h) || ((y === n.y || y === n.y + n.h) && x >= n.x && x <= n.x + n.w);
for (const r of routes) {
  assert(onBorder(r.coords[0], nodes.find((n) => n.id === r.from)), `${r.from}: detached line`);
  assert(onBorder(r.coords.at(-1), nodes.find((n) => n.id === r.to)), `${r.to}: detached line`);
}
for (const s of segments) for (const n of nodes) {
  const crosses = s.x0 === s.x1
    ? s.x0 > n.x && s.x0 < n.x + n.w && s.y0 < n.y + n.h && s.y1 > n.y
    : s.y0 > n.y && s.y0 < n.y + n.h && s.x0 < n.x + n.w && s.x1 > n.x;
  assert(!crosses, `Edge through ${n.id}`);
}
for (let i = 0; i < segments.length; i++) for (const t of segments.slice(i + 1)) {
  const s = segments[i];
  if (s.ri === t.ri) continue;
  const overlap = s.x0 === s.x1 && t.x0 === t.x1
    ? s.x0 === t.x0 && Math.min(s.y1, t.y1) > Math.max(s.y0, t.y0)
    : s.y0 === s.y1 && t.y0 === t.y1
      ? s.y0 === t.y0 && Math.min(s.x1, t.x1) > Math.max(s.x0, t.x0)
      : s.x0 === s.x1
        ? s.x0 >= t.x0 && s.x0 <= t.x1 && t.y0 >= s.y0 && t.y0 <= s.y1
        : t.x0 >= s.x0 && t.x0 <= s.x1 && s.y0 >= t.y0 && s.y0 <= t.y1;
  assert(!overlap, `Crossing/shared segment: ${routes[s.ri].from}:${routes[s.ri].to} / ${routes[t.ri].from}:${routes[t.ri].to}`);
}

const mk = (id, inner) => `<marker id="${id}" viewBox="0 0 26 18" refX="26" refY="9" markerWidth="26" markerHeight="18" orient="auto-start-reverse" markerUnits="userSpaceOnUse">${inner}</marker>`;
const bar = (x) => `<line x1="${x}" y1="2" x2="${x}" y2="16" stroke="${line}" stroke-width="1.8"/>`;
const ring = (x) => `<circle cx="${x}" cy="9" r="4.5" fill="white" stroke="${line}" stroke-width="1.8"/>`;
const fork = `<path d="M12,9 L26,2 M12,9 L26,9 M12,9 L26,16" fill="none" stroke="${line}" stroke-width="1.8"/>`;
const defs = mk("one", bar(15) + bar(20)) + mk("zeroOne", ring(8) + bar(20)) + mk("many0", fork + ring(6)) + mk("many1", fork + bar(9));
function entity(n) {
  const { id, x, y, w, h } = n;
  const [, title, note, rows] = byId[id];
  const fill = ["admin", "rate"].includes(id) ? "#eef0f4" : "#e0e7f7";
  let out = `<g data-entity="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="white" stroke="${line}" stroke-width="1.8"/>`;
  out += `<path d="M${x},${y + HEAD} V${y + 8} Q${x},${y} ${x + 8},${y} H${x + w - 8} Q${x + w},${y} ${x + w},${y + 8} V${y + HEAD} Z" fill="${fill}"/>`;
  out += text(title, x + 16, y + 25, 30, 700);
  if (note) out += text(note, x + 16, y + 53, 20);
  out += `<line x1="${x}" y1="${y + HEAD}" x2="${x + w}" y2="${y + HEAD}" stroke="${line}"/>`;
  rows.forEach(([field, type, key], i) => {
    const cy = y + HEAD + ROW * i + 19;
    out += text(key ? `${field} (${key})` : field, x + 14, cy, 24, key ? 700 : 400);
    out += text(type, x + w - 14, cy, 21, 400, "end");
  });
  return out + "</g>";
}
function link(r) {
  const [, , verb, se, te, logical] = rels.find(([s, t]) => s === r.from && t === r.to);
  const runs = r.coords.slice(1).map((b, i) => [r.coords[i], b]);
  const horizontal = runs.filter(([a, b]) => a[1] === b[1]).sort(([a, b], [c, d]) => Math.abs(d[0] - c[0]) - Math.abs(b[0] - a[0]));
  const [a, b] = horizontal[0] ?? runs[0];
  const cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2;
  return `<g data-relation="${r.from}:${r.to}"><path d="${roundedPath(r.coords.map(([x, y]) => ({ x, y })))}" fill="none" stroke="${line}" stroke-width="2.5"${logical ? ' stroke-dasharray="8 6"' : ""} marker-start="url(#${se})" marker-end="url(#${te})"/>` + text(verb, horizontal.length ? cx : cx + 18, horizontal.length ? cy - 22 : cy, 26, 600, horizontal.length ? "middle" : "start") + "</g>";
}
const header = text("DEEMO  /  Entity relationship diagram", 100, 55, 48, 700) + text("Landscape · left to right · 22 tables · 24 direct relationships · no crossing or shared connector lines", 100, 118, 28);
let legend = text("Support tables — no foreign-key relationships", 5000, 150, 24, 700);
["one", "zeroOne", "many0", "many1"].forEach((id, i) => {
  const x = 100 + i * 320;
  legend += `<path d="M${x},3060 H${x + 80}" stroke="${line}" stroke-width="2.5" marker-end="url(#${id})"/>` + text(["exactly one", "zero or one", "zero or many", "one or many"][i], x + 98, 3060, 24);
});
legend += text("Solid line = FK relationship. Dashed = logical project reference (no FK). PK = primary key · FK = foreign key · UQ = unique.", 100, 3110, 24);
const body = header + routes.map(link).join("") + nodes.map(entity).join("") + legend;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="6600" height="3200" viewBox="0 0 6600 3200" font-family="Arial, Helvetica, sans-serif"><title>DEEMO continuous landscape ERD</title><defs>${defs}</defs><rect width="100%" height="100%" fill="white"/>${body}</svg>`;
writeFileSync("DEEMO-ERD-organized.svg", svg);
writeFileSync("routing-checks.json", JSON.stringify({ orientation: "landscape, left to right", tables: nodes.length, relationships: routes.length, connectedTables: reached.size, unrelatedTables: ["admin_actions", "rate_limit_counters"], referenceChips: 0, crossings: 0, sharedSegments: 0, routesThroughTables: 0, detachedEndpoints: 0, routes }, null, 2) + "\n");
console.log("Landscape: 22 tables, 24 direct relationships; zero crossings, shared segments, detached endpoints or reference chips.");
