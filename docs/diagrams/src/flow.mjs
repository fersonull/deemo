// System Flowchart, parts A and B: top to bottom (the flowchart keeps its portrait format).
// Laid out by hand on a grid: the main path is one straight spine, side steps sit in a column to the right, and every
// loop gets its own lane, so no two connectors share a path and none cuts through a shape.
import { writeFileSync } from "node:fs";
import { htmlFor, roundedPath, svgDoc, textBlock, textWidth, wrap } from "./lib.mjs";

const ink = "#1f2937";
const SIZE = { term: [150, 46], proc: [260, 58], io: [290, 62], dec: [250, 104], conn: [46, 46], note: [240, 62] };
const SKEW = 22; // input/output parallelogram slant
const GAP = 38; // vertical gap between spine rows
const COL = { 0: 260, 1: 650 }; // column centers
const LANE = { stop: 40, left: 70, near: 830, far: 870 }; // vertical lanes for loops

// Place nodes: spine rows top to bottom; a side node takes the row of the spine node it sits beside.
function place(spine, side) {
  const pos = {};
  let y = 24;
  for (const [id, k, label] of spine) {
    const [w, baseH] = SIZE[k];
    const h = Math.max(baseH, wrap(label, wrapFor[k]).length * 17.55 + 20);
    const rowH = Math.max(h, ...side.filter((s) => s[3] === id).map((s) => Math.max(SIZE[s[1]][1], wrap(s[2], wrapFor[s[1]]).length * 17.55 + 20)));
    pos[id] = { k, x: COL[0] - w / 2, y: y + (rowH - h) / 2, w, h };
    for (const [sid, sk, , beside] of side.filter((s) => s[3] === id)) {
      const [sw, baseSh] = SIZE[sk];
      const sh = Math.max(baseSh, wrap(side.find((s) => s[0] === sid)[2], wrapFor[sk]).length * 17.55 + 20);
      pos[sid] = { k: sk, x: COL[1] - sw / 2, y: y + (rowH - sh) / 2, w: sw, h: sh };
    }
    y += rowH + GAP;
  }
  return { pos, height: y - GAP + 24 };
}

// Where a connector meets a shape: diamond points, the slanted sides of a parallelogram, box side centers.
function anchor(n, side, dy = 0) {
  const cx = n.x + n.w / 2, cy = n.y + n.h / 2;
  if (side === "top") return { x: cx, y: n.y };
  if (side === "bottom") return { x: cx, y: n.y + n.h };
  const yy = cy + dy;
  if (n.k === "io") {
    const t = (yy - n.y) / n.h; // 0 at the top, 1 at the bottom
    return side === "right" ? { x: n.x + n.w - SKEW * t, y: yy } : { x: n.x + SKEW * (1 - t), y: yy };
  }
  if (n.k === "conn") return { x: side === "right" ? n.x + n.w : n.x, y: cy };
  return { x: side === "right" ? n.x + n.w : n.x, y: yy };
}

// An orthogonal route from one anchor to another, optionally through a vertical lane.
function route(pos, e) {
  const a = pos[e.from];
  const p0 = anchor(a, e.out);
  let p1;
  if (e.join) {
    // join the spine line just above a spine node (a junction arrow)
    const t = pos[e.join];
    p1 = { x: t.x + t.w / 2, y: t.y - GAP / 2 + (e.joinDy ?? 0) };
  } else p1 = anchor(pos[e.to], e.in, e.dy ?? 0);
  if (e.lane !== undefined) {
    const x = LANE[e.lane];
    return [p0, { x, y: p0.y }, { x, y: p1.y }, p1];
  }
  const vert = (s) => s === "top" || s === "bottom";
  if (vert(e.out) && vert(e.in)) {
    if (Math.abs(p0.x - p1.x) < 0.5) return [p0, p1];
    const my = (p0.y + p1.y) / 2;
    return [p0, { x: p0.x, y: my }, { x: p1.x, y: my }, p1];
  }
  if (!vert(e.out) && vert(e.in)) return [p0, { x: p1.x, y: p0.y }, p1];
  if (vert(e.out) && !vert(e.in)) return [p0, { x: p0.x, y: p1.y }, p1];
  return [p0, p1];
}

const wrapFor = { term: 18, proc: 37, io: 31, dec: 22, conn: 3, note: 32 };

function drawNode(n, text) {
  const { x, y, w, h, k } = n;
  const cx = x + w / 2, cy = y + h / 2;
  const lines = wrap(text, wrapFor[k]);
  const label = textBlock(lines, cx, cy, { size: k === "dec" ? 12.5 : 13, fill: ink });
  const st = `fill="#ffffff" stroke="${ink}" stroke-width="1.4"`;
  if (k === "term") return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" ${st}/>` + label;
  if (k === "proc") return `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${st}/>` + label;
  if (k === "io") return `<path d="M${x + SKEW},${y} H${x + w} L${x + w - SKEW},${y + h} H${x} Z" ${st}/>` + label;
  if (k === "dec") return `<path d="M${cx},${y} L${x + w},${cy} L${cx},${y + h} L${x},${cy} Z" ${st}/>` + label;
  if (k === "conn") return `<circle cx="${cx}" cy="${cy}" r="${w / 2}" ${st}/>` + textBlock([text], cx, cy, { size: 15, weight: 600, fill: ink });
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#F9FAFB"/>` +
    `<path d="M${x + 14},${y} H${x} V${y + h} H${x + 14}" fill="none" stroke="${ink}" stroke-width="1.4"/>` +
    textBlock(lines, cx, cy, { size: 12.5, fill: "#374151" })
  );
}

// Yes / No just past a decision's exit.
function exitLabel(pts, text, left) {
  if (!text) return "";
  const [p0, p1] = pts;
  const down = Math.abs(p1.y - p0.y) > Math.abs(p1.x - p0.x);
  const w = textWidth(text, 12) + 6;
  const lx = down ? (left ? p0.x - 8 - w : p0.x + 8) : p0.x + (p1.x > p0.x ? 10 : -10 - w);
  const ly = down ? p0.y + 14 : p0.y - 12;
  return `<rect x="${lx}" y="${ly - 8}" width="${w}" height="16" fill="#ffffff"/>` + textBlock([text], lx + w / 2, ly, { size: 12, weight: 600, fill: ink });
}

function render(name, spine, side, edges) {
  const { pos, height } = place(spine, side);
  const text = Object.fromEntries([...spine, ...side].map(([id, , t]) => [id, t]));
  const defs = `<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M0,0 L10,5 L0,10 Z" fill="${ink}"/></marker>`;
  const routes = edges.map((e) => ({ e, pts: route(pos, e) }));
  const body =
    routes
      .map(({ e, pts }) =>
        e.note
          ? `<path d="${roundedPath(pts, 8)}" fill="none" stroke="${ink}" stroke-width="1.2" stroke-dasharray="4 4"/>`
          : `<path d="${roundedPath(pts, 8)}" fill="none" stroke="${ink}" stroke-width="1.4" marker-end="url(#arrow)"/>`,
      )
      .join("") +
    Object.entries(pos).map(([id, n]) => drawNode(n, text[id])).join("") +
    routes.map(({ e, pts }) => exitLabel(pts, e.label, e.labelLeft)).join("");
  const W = LANE.far + 30;
  writeFileSync(`${name}.html`, htmlFor(svgDoc(W, height, defs, body), W, height));
  console.log(name, W, height);
}

// Shorthands: down(a, b) is a straight spine arrow; side exits name their sides.
const down = (from, to, label) => ({ from, to, out: "bottom", in: "top", label });

// Part A: opening the app to a confirmed manuscript and a rubric.
render(
  "flow-a",
  [
    ["start", "term", "Start"],
    ["open", "proc", "Open DEEMO"],
    ["signed", "dec", "Signed in?"],
    ["welcome", "proc", "Welcome walkthrough (can be skipped)"],
    ["consent", "io", "Confirm 18+ and agree to how data is used"],
    ["signin", "io", "Sign in, or create an account with name, email and password; or continue with Google"],
    ["fbauth", "proc", "Firebase Authentication verifies the credentials"],
    ["valid", "dec", "Credentials valid?"],
    ["verified", "dec", "Email verified? (Google accounts always are)"],
    ["course", "dec", "Course selected?"],
    ["home", "proc", "Home dashboard"],
    ["confirmed", "dec", "Confirmed manuscript?"],
    ["upload", "io", "Upload manuscript (PDF or DOCX, up to 20 MB) "],
    ["filecheck", "dec", "PDF or DOCX, 20 MB or less, within the plan limit?"],
    ["read", "proc", "Gemini reads the file (PDF as-is, DOCX via mammoth)"],
    ["isms", "dec", "Research manuscript?"],
    ["extract", "proc", "Extract summary, academic field and computing IT field; save analysis"],
    ["review", "io", "Student reviews summary and detected field; corrects classifications"],
    ["looks", "dec", "Looks right?"],
    ["confirm", "proc", "Confirm the summary"],
    ["rubricq", "dec", "Upload the panel's rubric?"],
    ["uprubric", "io", "Upload rubric (PDF, DOCX, JPG or PNG, up to 10 MB)"],
    ["readrubric", "proc", "Gemini reads criteria, weights and levels; student saves it"],
    ["toB", "conn", "A"],
  ],
  [
    ["survey", "io", "Select course (editable later in Profile)", "course"],
    ["err", "proc", "Show the sign-in error", "valid"],
    ["link", "proc", "Open Firebase email link (or resend), then check again", "verified"],
    ["fileerr", "proc", "Show the file or plan error", "filecheck"],
    ["rejected", "proc", "Show why the file was rejected", "isms"],
    ["default", "proc", "Use the default rubric (weights adjustable)", "rubricq"],
  ],
  [
    down("start", "open"), down("open", "signed"),
    down("signed", "welcome", "No"),
    { from: "signed", out: "left", to: "verified", in: "left", lane: "left", label: "Yes" },
    down("welcome", "consent"), down("consent", "signin"), down("signin", "fbauth"), down("fbauth", "valid"),
    { from: "valid", out: "right", to: "err", in: "left", label: "No" },
    { from: "err", out: "top", to: "signin", in: "right" },
    { ...down("valid", "verified", "Yes"), labelLeft: true }, // the tap loop joins from the right
    { from: "verified", out: "right", to: "link", in: "left", label: "No" },
    { from: "link", out: "right", join: "verified", lane: "near" },
    down("verified", "course", "Yes"), down("course", "home", "Yes"),
    { from: "course", out: "right", to: "survey", in: "left", label: "No" },
    { from: "survey", out: "bottom", to: "home", in: "right" }, down("home", "confirmed"),
    down("confirmed", "upload", "No"),
    { from: "confirmed", out: "right", join: "rubricq", lane: "far", label: "Yes" },
    down("upload", "filecheck"),
    { from: "filecheck", out: "right", to: "fileerr", in: "left", label: "No" },
    { from: "fileerr", out: "top", to: "upload", in: "right", dy: -10 },
    down("filecheck", "read", "Yes"), down("read", "isms"),
    { from: "isms", out: "right", to: "rejected", in: "left", label: "No" },
    { from: "rejected", out: "right", to: "upload", in: "right", lane: "near", dy: 12 },
    down("isms", "extract", "Yes"), down("extract", "review"), down("review", "looks"),
    { from: "looks", out: "right", to: "review", in: "right", lane: "near" },
    down("looks", "confirm", "Yes"), down("confirm", "rubricq"),
    down("rubricq", "uprubric", "Yes"),
    { from: "rubricq", out: "right", to: "default", in: "left", label: "No" },
    down("uprubric", "readrubric"), down("readrubric", "toB"),
    { from: "default", out: "bottom", to: "toB", in: "right" },
  ].map((e) => (e.from === "looks" && e.to === "review" ? { ...e, label: "No" } : e)),
);

// Part B: practice setup to the readiness report.
render(
  "flow-b",
  [
    ["fromA", "conn", "A"],
    ["setup", "io", "Setup: stage, panelists, ordinary follow-ups and difficulty"],
    ["premium", "dec", "Needs Premium on a Free account?"],
    ["mic", "proc", "Mic check: voice level, earphones, connection"],
    ["limit", "dec", "Daily cap reached? (Free 5 starts, Premium unlimited)"],
    ["token", "proc", "Server builds the stage/manuscript agenda; issues a locked Live token"],
    ["connect", "proc", "App opens a live voice connection to Gemini Live"],
    ["present", "io", "Student presents the study; taps Done presenting"],
    ["pick", "proc", "Current panelist picks an assigned agenda topic (ask_question)"],
    ["fu", "dec", "Ordinary follow-up over the allowance?"],
    ["ask", "io", "Panelist reacts and asks aloud; screen shows who asks and the type"],
    ["answer", "io", "Student answers by voice (or types); taps Done answering"],
    ["contra", "dec", "Contradicts the manuscript?"],
    ["stop", "dec", "Student ends or safety cap reached?"],
    ["seatdone", "dec", "Current seat topics covered?"],
    ["over", "dec", "Full agenda covered?"],
    ["save", "proc", "App sends transcript, timings and flags; server saves the session"],
    ["real", "dec", "Any real answer?"],
    ["rate", "proc", "Gemini judges applicable criteria and contradictions; code measures default delivery"],
    ["ok", "dec", "Scoring succeeded?"],
    ["compute", "proc", "Code applies agenda coverage and penalty; saves readiness and verdict"],
    ["show", "io", "Show the readiness report"],
    ["end", "term", "End"],
  ],
  [
    ["upsell", "proc", "Show the Premium upsell", "premium"],
    ["limitmsg", "proc", "Show the limit message", "limit"],
    ["note", "note", "Pause/resume; attempt reconnect on network drop. Safety caps: Free 30 min, Premium 60 min.", "connect"],
    ["refused", "proc", "Refused: panel picks a new topic", "fu"],
    ["flag", "proc", "Record flag; HIGH asks a clarification on the current card; student answers (no ordinary allowance)", "contra"],
    ["handover", "proc", "Pass to next panelist with context and its own voice/token", "over"],
    ["notscored", "proc", "Report marked Not scored", "real"],
    ["retry", "proc", "Session stays saved; student taps Try again", "ok"],
  ],
  [
    down("fromA", "setup"), down("setup", "premium"),
    { from: "premium", out: "right", to: "upsell", in: "left", label: "Yes" },
    { from: "upsell", out: "top", to: "setup", in: "right" },
    down("premium", "mic", "No"), down("mic", "limit"),
    { from: "limit", out: "right", to: "limitmsg", in: "left", label: "Yes" },
    { from: "limitmsg", out: "right", to: "end", in: "right", lane: "far" },
    down("limit", "token", "No"), down("token", "connect"),
    { from: "note", out: "left", to: "connect", in: "right", note: true },
    down("connect", "present"), down("present", "pick"), down("pick", "fu"),
    { from: "fu", out: "right", to: "refused", in: "left", label: "Yes" },
    { from: "refused", out: "top", to: "pick", in: "right" },
    down("fu", "ask", "No"), down("ask", "answer"), down("answer", "contra"),
    { from: "contra", out: "right", to: "flag", in: "left", label: "Yes" },
    { from: "flag", out: "bottom", to: "stop", in: "right" },
    down("contra", "stop", "No"),
    { from: "stop", out: "left", to: "save", in: "left", lane: "stop", label: "Yes" },
    down("stop", "seatdone", "No"),
    { from: "seatdone", out: "left", to: "pick", in: "left", lane: "left", label: "No" },
    down("seatdone", "over", "Yes"),
    { from: "over", out: "right", to: "handover", in: "left", label: "No" },
    { from: "handover", out: "right", to: "pick", in: "right", lane: "near" },
    down("over", "save", "Yes"), down("save", "real"),
    { from: "real", out: "right", to: "notscored", in: "left", label: "No" },
    { from: "notscored", out: "right", to: "show", in: "right", lane: "near" },
    down("real", "rate", "Yes"), down("rate", "ok"),
    { from: "ok", out: "right", to: "retry", in: "left", label: "No" },
    { from: "retry", out: "top", to: "rate", in: "right" },
    down("ok", "compute", "Yes"), down("compute", "show"), down("show", "end"),
  ],
);
