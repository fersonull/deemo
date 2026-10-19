// Figure 3: Entity Relationship Diagram of DEEMO's PostgreSQL database (server/prisma/schema.prisma), left to right
// for a landscape page.
import { writeFileSync } from "node:fs";
import { drawLabels, edgePoints, htmlFor, labelOf, layout, placeLabelsOnLines, roundedPath, svgDoc, textBlock } from "./lib.mjs";

const ROW = 22, HEAD = 44, W = 330;

const id = ["id", "SERIAL", "PK"];
// [id, table, note, rows: [column, type, key?]]
const entities = [
  ["user", "users", "one row per Firebase account", [
    ["id", "VARCHAR(128)", "PK"], ["email", "VARCHAR(320)"], ["name", "VARCHAR(60)"], ["email_verified", "BOOLEAN"],
    ["provider", "VARCHAR(30)"], ["avatar", "VARCHAR(32)"], ["premium", "BOOLEAN"], ["allow_typing", "BOOLEAN"],
    ["course", "VARCHAR(40)"], ["consent_version", "VARCHAR(20)"], ["consent_at", "TIMESTAMP"], ["session_day", "VARCHAR(10)"], ["session_count", "INTEGER"],
    ["deleted_at", "TIMESTAMP"], ["created_at", "TIMESTAMP"], ["updated_at", "TIMESTAMP"],
  ]],
  ["livestart", "live_starts", "daily practice starts", [
    ["user_id", "VARCHAR(128)", "PK, FK"], ["id", "VARCHAR(100)", "PK"], ["day", "VARCHAR(10)"], ["setup", "TEXT"],
    ["lease", "VARCHAR(36)"], ["pending_until", "TIMESTAMP"], ["expires_at", "TIMESTAMP"], ["token", "TEXT"],
    ["new_session_until", "TIMESTAMP"],
  ]],
  ["group", "groups", "shared capstone projects", [
    ["code", "VARCHAR(6)", "PK"], ["owner_id", "VARCHAR(128)", "FK"], ["project_id", "VARCHAR(36)", "FK, UQ"], ["created_at", "TIMESTAMP"],
  ]],
  ["member", "group_members", "", [
    ["group_code", "VARCHAR(6)", "PK, FK"], ["user_id", "VARCHAR(128)", "PK, FK"], ["share_score", "BOOLEAN"],
    ["focus_area", "VARCHAR(160)"], ["joined_at", "TIMESTAMP"],
  ]],
  ["project", "projects", "manuscripts (the file is not kept)", [
    ["id", "VARCHAR(36)", "PK"], ["user_id", "VARCHAR(128)", "FK"], ["name", "VARCHAR(80)"], ["domain", "VARCHAR(30)"],
    ["file_name", "VARCHAR(200)"], ["size_bytes", "INTEGER"], ["status", "ENUM"], ["error", "TEXT"],
    ["confirmed_at", "TIMESTAMP"], ["weights", "INTEGER[]"], ["created_at", "TIMESTAMP"], ["updated_at", "TIMESTAMP"],
  ]],
  ["analysis", "analyses", "", [
    ["project_id", "VARCHAR(36)", "PK, FK"], ["title", "VARCHAR(2000)"], ["problem", "VARCHAR(2000)"],
    ["objectives", "VARCHAR(2000)"], ["method", "VARCHAR(2000)"], ["scope", "VARCHAR(2000)"], ["features", "VARCHAR(2000)"],
    ["limits", "VARCHAR(2000)"], ["results", "VARCHAR(2000)"], ["facts", "TEXT[]"], ["unsure", "TEXT[]"], ["field", "VARCHAR(40)"], ["model", "VARCHAR(40)"],
  ]],
  ["rubric", "rubrics", "", [["project_id", "VARCHAR(36)", "PK, FK"], ["source", "VARCHAR(200)"]]],
  ["criterion", "rubric_criteria", "", [
    id, ["rubric_id", "VARCHAR(36)", "FK"], ["position", "INTEGER"], ["name", "VARCHAR(80)"], ["description", "VARCHAR(300)"],
    ["points", "DOUBLE PRECISION"], ["weight", "INTEGER"], ["scored", "BOOLEAN"], ["level1", "VARCHAR(200)"],
    ["level3", "VARCHAR(200)"], ["level5", "VARCHAR(200)"],
  ]],
  ["session", "sessions", "practice sessions (audio is not kept)", [
    ["id", "VARCHAR(36)", "PK"], ["user_id", "VARCHAR(128)", "FK"], ["status", "ENUM"], ["error", "TEXT"],
    ["project_id", "VARCHAR(100)"], ["group_code", "VARCHAR(6)"], ["focus_area", "VARCHAR(160)"], ["weak_from", "VARCHAR(100)"],
    ["manuscript_context", "TEXT"], ["title", "VARCHAR(2000)"], ["mode", "ENUM"], ["domain", "VARCHAR(30)"],
    ["minutes", "INTEGER"], ["agenda", "JSONB"], ["panelists", "INTEGER"], ["follow_ups", "INTEGER"], ["difficulty", "ENUM"],
    ["duration_ms", "INTEGER"], ["ended_by", "ENUM"], ["weights", "DOUBLE PRECISION[]"], ["rubric", "JSONB"],
    ["lines", "JSONB"], ["created_at", "TIMESTAMP"], ["updated_at", "TIMESTAMP"],
  ]],
  ["turn", "session_turns", "", [
    id, ["session_id", "VARCHAR(36)", "FK"], ["position", "INTEGER"], ["number", "INTEGER"], ["follow_up", "INTEGER"],
    ["type", "VARCHAR(20)"], ["panelist", "INTEGER"], ["question", "VARCHAR(600)"], ["topic", "VARCHAR(60)"], ["answer", "VARCHAR(4000)"],
    ["latency_ms", "INTEGER"], ["answer_ms", "INTEGER"],
  ]],
  ["flag", "session_flags", "contradictions flagged live", [
    id, ["session_id", "VARCHAR(36)", "FK"], ["position", "INTEGER"], ["spoken_claim", "VARCHAR(400)"],
    ["manuscript_evidence", "VARCHAR(400)"], ["severity", "ENUM"], ["at_ms", "INTEGER"],
  ]],
  ["report", "reports", "scored result of a session", [
    ["session_id", "VARCHAR(36)", "PK, FK"], ["score", "INTEGER"], ["band", "VARCHAR(20)"], ["message", "TEXT"],
    ["scored", "BOOLEAN"], ["rubric_score", "INTEGER"], ["penalty", "DOUBLE PRECISION"], ["answered", "INTEGER"],
    ["planned", "INTEGER"], ["headline", "TEXT"], ["model", "VARCHAR(40)"], ["latency_s", "DOUBLE PRECISION"],
    ["fillers_per_min", "DOUBLE PRECISION"], ["words_per_min", "DOUBLE PRECISION"],
  ]],
  ["rcrit", "report_criteria", "", [
    id, ["report_id", "VARCHAR(36)", "FK"], ["position", "INTEGER"], ["key", "VARCHAR(20)"], ["name", "VARCHAR(80)"],
    ["weight", "DOUBLE PRECISION"], ["level", "INTEGER"], ["why", "TEXT"],
  ]],
  ["rcontra", "report_contradictions", "", [
    id, ["report_id", "VARCHAR(36)", "FK"], ["position", "INTEGER"], ["spoken_claim", "TEXT"],
    ["manuscript_evidence", "TEXT"], ["severity", "ENUM"], ["turn", "INTEGER"],
  ]],
  ["rturn", "report_turns", "", [
    id, ["report_id", "VARCHAR(36)", "FK"], ["position", "INTEGER"], ["feedback", "TEXT"], ["better_answer", "TEXT"],
  ]],
  ["rfix", "report_fixes", "", [id, ["report_id", "VARCHAR(36)", "FK"], ["position", "INTEGER"], ["text", "TEXT"], ["turn", "INTEGER"]]],
  ["rate", "rate_limit_counters", "request limits (no relations)", [
    ["key", "VARCHAR(200)", "PK"], ["window_start", "TIMESTAMP", "PK"], ["count", "INTEGER"],
  ]],
  ["admin", "admin_actions", "copied IDs; no account FK", [
    id, ["admin_id", "VARCHAR(128)"], ["admin_email", "VARCHAR(320)"], ["action", "VARCHAR(40)"],
    ["target_id", "VARCHAR(128)"], ["target_email", "VARCHAR(320)"], ["created_at", "TIMESTAMP"],
  ]],
  ["notice", "notices", "creator copied; no creator FK", [
    ["id", "VARCHAR(36)", "PK"], ["title", "VARCHAR(120)"], ["body", "VARCHAR(2000)"],
    ["target_id", "VARCHAR(128)", "FK"], ["segment", "VARCHAR(400)"], ["created_by", "VARCHAR(128)"], ["created_at", "TIMESTAMP"],
  ]],
  ["nread", "notice_reads", "per-user read receipt", [
    ["user_id", "VARCHAR(128)", "PK, FK"], ["notice_id", "VARCHAR(36)", "PK, FK"], ["read_at", "TIMESTAMP"],
  ]],
  ["nrec", "notice_recipients", "filtered audience at send time", [
    ["notice_id", "VARCHAR(36)", "PK, FK"], ["user_id", "VARCHAR(128)", "PK, FK"],
  ]],
  ["push", "push_tokens", "device notification tokens", [
    ["token", "VARCHAR(512)", "PK"], ["user_id", "VARCHAR(128)", "FK"], ["updated_at", "TIMESTAMP"],
  ]],

];

// [from, to, verb, from-end, to-end, logical]. Ends: one (||), zeroOne (o|), many0 (o<), many1 (|<).
// A logical link is a reference kept as plain text, with no foreign key (it can name a shared group project).
const rels = [
  ["user", "livestart", "starts", "one", "many0"],
  ["user", "group", "leads", "one", "many0"],
  ["user", "member", "joins as", "one", "many0"],
  ["group", "member", "has", "one", "many0"],
  ["user", "project", "uploads", "one", "many0"],
  ["user", "session", "takes", "one", "many0"],
  ["project", "group", "shared as", "one", "zeroOne"],
  ["project", "analysis", "has", "one", "zeroOne"],
  ["project", "rubric", "has", "one", "zeroOne"],
  ["rubric", "criterion", "lists", "one", "many1"],
  ["project", "session", "practiced in", "zeroOne", "many0", true],
  ["session", "turn", "has", "one", "many0"],
  ["session", "flag", "has", "one", "many0"],
  ["session", "report", "has", "one", "zeroOne"],
  ["report", "rcrit", "rates", "one", "many0"],
  ["report", "rcontra", "lists", "one", "many0"],
  ["report", "rturn", "explains", "one", "many0"],
  ["report", "rfix", "suggests", "one", "many0"],
  ["user", "notice", "private recipient", "zeroOne", "many0"],
  ["user", "nread", "reads", "one", "many0"],
  ["notice", "nread", "read receipts", "one", "many0"],
  ["user", "nrec", "selected", "one", "many0"],
  ["notice", "nrec", "audience", "one", "many0"],
  ["user", "push", "registers", "one", "many0"],

];

const byId = Object.fromEntries(entities.map((e) => [e[0], e]));
const children = entities.map(([id, , , rows]) => ({ id, width: W, height: HEAD + rows.length * ROW + 8 }));
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
    // Centre every column on one middle line so the diagram reads straight left to right instead of stepping down.
    "elk.layered.nodePlacement.strategy": "SIMPLE",
    "elk.layered.considerModelOrder.strategy": "NONE",
  },
);
placeLabelsOnLines(g);

const ink = "#1f2937", line = "#374151";

function drawEntity(n) {
  const [, title, note, rows] = byId[n.id];
  const { x, y, width: w, height: h } = n;
  const head = n.id === "rate" ? "#F3F4F6" : "#DBEAFE";
  let out =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#ffffff" stroke="${line}" stroke-width="1.3"/>` +
    `<path d="M${x},${y + HEAD} V${y + 10} Q${x},${y} ${x + 10},${y} H${x + w - 10} Q${x + w},${y} ${x + w},${y + 10} V${y + HEAD} Z" fill="${head}"/>` +
    `<line x1="${x}" y1="${y + HEAD}" x2="${x + w}" y2="${y + HEAD}" stroke="${line}" stroke-width="1.3"/>` +
    textBlock([title], x + w / 2, y + (note ? 15 : HEAD / 2), { size: 15, weight: 700, fill: ink }) +
    (note ? textBlock([note], x + w / 2, y + 32, { size: 11.5, fill: "#4B5563" }) : "");
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
  leg("one", 24, "exactly one") + leg("zeroOne", 190, "zero or one") + leg("many0", 356, "zero or many") + leg("many1", 532, "one or many") +
  `<path d="M708,${legendY + 12} H754" stroke="${line}" stroke-width="1.4" stroke-dasharray="6 4"/>` +
  textBlock(["reference without a foreign key"], 762, legendY + 12, { size: 12.5, fill: "#374151", anchor: "start" });

const H = legendY + 32;
writeFileSync("erd.html", htmlFor(svgDoc(LW, H, defs, body + legend), LW, H));
console.log("erd", LW, H);
