// Figure 3: Entity Relationship Diagram of DEEMO's Firestore data, left to right for a landscape page.
import { writeFileSync } from "node:fs";
import { drawLabels, edgePoints, htmlFor, labelOf, layout, placeLabelsOnLines, roundedPath, svgDoc, textBlock } from "./lib.mjs";

const ROW = 22, HEAD = 44, W = 250;

// [id, title, Firestore path or note, embedded?, rows: [field, type, key?]]
const entities = [
  ["user", "User", "users/{uid}", false, [
    ["uid", "string", "PK"], ["premium", "boolean"], ["allowTyping", "boolean"], ["avatar", "string"],
    ["consentVersion", "string"], ["consentAt", "timestamp"], ["sessionDay", "string"], ["sessionCount", "number"],
    ["projectsChangedAt", "number"], ["deleting", "boolean"],
  ]],
  ["livestart", "LiveStart", "users/{uid}/liveStarts/{id}", false, [
    ["id", "string", "PK"], ["day", "string"], ["setup", "string"], ["lease", "string"], ["pendingUntil", "number"],
    ["expiresAt", "number"], ["token", "string"], ["newSessionUntil", "number"],
  ]],
  ["group", "Group", "groups/{code}", false, [
    ["code", "string", "PK"], ["ownerUid", "string", "FK"], ["projectId", "string", "FK"],
    ["members", "map[] (max 20)"], ["memberIds", "string[]"],
  ]],
  ["project", "Project", "users/{uid}/projects/{id}", false, [
    ["id", "string", "PK"], ["name", "string"], ["domain", "string"], ["fileName", "string"], ["sizeBytes", "number"],
    ["status", "string"], ["error", "string"], ["analysis", "map"], ["confirmedAt", "timestamp"],
    ["weights", "number[5]"], ["rubric", "map"], ["createdAt", "timestamp"], ["updatedAt", "timestamp"],
  ]],
  ["session", "Session", "users/{uid}/sessions/{id}", false, [
    ["id", "string", "PK"], ["projectId", "string", "FK"], ["groupCode", "string", "FK"], ["weakFrom", "string", "FK"],
    ["status", "string"], ["error", "string"], ["title", "string"], ["mode", "string"], ["domain", "string"],
    ["minutes", "number"], ["panelists", "number"], ["followUps", "number"], ["difficulty", "string"],
    ["durationMs", "number"], ["endedBy", "string"], ["focusArea", "string"], ["manuscriptContext", "string"],
    ["weights", "number[]"], ["rubric", "criteria[]"], ["turns", "map[]"], ["lines", "map[]"], ["flags", "map[]"],
    ["report", "map"], ["createdAt", "timestamp"], ["updatedAt", "timestamp"],
  ]],
  ["analysis", "Analysis", "embedded in Project", true, [
    ["title", "string"], ["problem", "string"], ["objectives", "string"], ["method", "string"], ["scope", "string"],
    ["features", "string"], ["limits", "string"], ["results", "string"], ["facts", "string[]"], ["unsure", "string[]"],
    ["model", "string"],
  ]],
  ["rubric", "Rubric", "embedded in Project", true, [
    ["source", "string"], ["criteria", "map[] (max 12)"], ["  name, desc", "string"], ["  points, weight", "number"],
    ["  scored", "boolean"], ["  levels", "string[3]"],
  ]],
  ["report", "Report", "embedded in Session", true, [
    ["score", "number"], ["band", "string"], ["message", "string"], ["scored", "boolean"], ["rubricScore", "number"],
    ["penalty", "number"], ["answered", "number"], ["planned", "number"], ["criteria", "map[]"],
    ["contradictions", "map[]"], ["turns", "map[]"], ["fixes", "map[]"], ["headline", "string"], ["delivery", "map"],
    ["model", "string"],
  ]],
];

// [from, to, verb, from-end, to-end, embedded]. Ends: one (||), zeroOne (o|), many0 (o<), many1 (|<).
const rels = [
  ["user", "livestart", "starts", "one", "many0"],
  ["user", "group", "leads", "one", "many0"],
  ["user", "group", "member of", "many0", "many0"],
  ["user", "project", "uploads", "one", "many0"],
  ["user", "session", "takes", "one", "many0"],
  ["group", "project", "shares", "zeroOne", "one"],
  ["project", "session", "practiced in", "zeroOne", "many0"],
  ["project", "analysis", "has", "one", "zeroOne", true],
  ["project", "rubric", "has", "one", "zeroOne", true],
  ["session", "report", "has", "one", "zeroOne", true],
];

const byId = Object.fromEntries(entities.map((e) => [e[0], e]));
const children = entities.map(([id, , , , rows]) => ({ id, width: W, height: HEAD + rows.length * ROW + 8 }));
const edges = rels.map(([s, t, verb, se, te, emb], i) => ({
  id: `r${i}`, sources: [s], targets: [t], se, te, emb: !!emb, labels: labelOf(verb, 20),
}));

const g = await layout(
  { children, edges },
  {
    "elk.direction": "RIGHT",
    "elk.layered.spacing.nodeNodeBetweenLayers": "70",
    "elk.spacing.nodeNode": "40",
    "elk.spacing.edgeEdge": "18",
    "elk.spacing.edgeNode": "28",
    "elk.edgeLabels.inline": "true",
    "elk.layered.crossingMinimization.forceNodeModelOrder": "true",
  },
);
placeLabelsOnLines(g);

const ink = "#1f2937", line = "#374151";

function drawEntity(n) {
  const [, title, path, embedded, rows] = byId[n.id];
  const { x, y, width: w, height: h } = n;
  const head = embedded ? "#F3F4F6" : "#DBEAFE";
  let out =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#ffffff" stroke="${line}" stroke-width="1.3"${embedded ? ' stroke-dasharray="6 4"' : ""}/>` +
    `<path d="M${x},${y + HEAD} V${y + 10} Q${x},${y} ${x + 10},${y} H${x + w - 10} Q${x + w},${y} ${x + w},${y + 10} V${y + HEAD} Z" fill="${head}"/>` +
    `<line x1="${x}" y1="${y + HEAD}" x2="${x + w}" y2="${y + HEAD}" stroke="${line}" stroke-width="1.3"/>` +
    textBlock([title], x + w / 2, y + 15, { size: 15, weight: 700, fill: ink }) +
    textBlock([path], x + w / 2, y + 32, { size: 11.5, fill: "#4B5563" });
  rows.forEach(([f, t, key], i) => {
    const cy = y + HEAD + 4 + i * ROW + ROW / 2;
    out +=
      // Fields of a nested map ("  name") are indented under it.
      textBlock([key ? `${f} (${key})` : f.trim()], x + (f.startsWith(" ") ? 28 : 12), cy, { size: 13, weight: key ? 700 : 400, fill: ink, anchor: "start" }) +
      textBlock([t], x + w - 12, cy, { size: 12.5, fill: "#6B7280", anchor: "end" });
  });
  return out;
}

// Crow's-foot ends, drawn pointing into the entity at the line's end (orient auto-start-reverse covers both ends).
const mk = (id, inner) =>
  `<marker id="${id}" viewBox="0 0 26 18" refX="26" refY="9" markerWidth="26" markerHeight="18" orient="auto-start-reverse" markerUnits="userSpaceOnUse">${inner}</marker>`;
const bar = (x) => `<line x1="${x}" y1="2" x2="${x}" y2="16" stroke="${line}" stroke-width="1.6"/>`;
const ring = (x) => `<circle cx="${x}" cy="9" r="4.5" fill="#ffffff" stroke="${line}" stroke-width="1.5"/>`;
const fork = `<path d="M12,9 L26,2 M12,9 L26,9 M12,9 L26,16" fill="none" stroke="${line}" stroke-width="1.5"/>`;
const defs =
  mk("one", bar(15) + bar(20)) + mk("zeroOne", ring(8) + bar(20)) + mk("many0", fork + ring(6)) + mk("many1", fork + bar(9));

const body =
  g.edges
    .map(
      (e) =>
        `<path d="${roundedPath(edgePoints(e), 10)}" fill="none" stroke="${line}" stroke-width="1.4"${e.emb ? ' stroke-dasharray="6 4"' : ""} marker-start="url(#${e.se})" marker-end="url(#${e.te})"/>`,
    )
    .join("") +
  g.children.map(drawEntity).join("") +
  g.edges.map((e) => drawLabels(e)).join("");

// Legend, bottom left, under the layout.
const LW = Math.ceil(g.width), legendY = Math.ceil(g.height) + 6;
const leg = (id, x, label) =>
  `<path d="M${x},${legendY + 12} H${x + 46}" stroke="${line}" stroke-width="1.4" marker-end="url(#${id})"/>` +
  textBlock([label], x + 54, legendY + 12, { size: 12.5, fill: "#374151", anchor: "start" });
const legend =
  leg("one", 24, "exactly one") + leg("zeroOne", 190, "zero or one") + leg("many0", 356, "zero or many") +
  `<path d="M532,${legendY + 12} H578" stroke="${line}" stroke-width="1.4" stroke-dasharray="6 4"/>` +
  textBlock(["map stored inside its parent document"], 586, legendY + 12, { size: 12.5, fill: "#374151", anchor: "start" });

const H = legendY + 32;
writeFileSync("erd.html", htmlFor(svgDoc(LW, H, defs, body + legend), LW, H));
console.log("erd", LW, H);
