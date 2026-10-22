// Shared layout + SVG rendering for the DEEMO Chapter 3 diagrams.
// ELK (layered, orthogonal routing) places nodes and routes edges; this file draws each node type in its notation.
import { createRequire } from "node:module";
const ELK = createRequire(import.meta.url)("elkjs/lib/elk.bundled.js");

export const FONT = "Inter, 'Segoe UI', Arial, sans-serif";
const CHAR = 6.9; // average glyph width at 13px Inter
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Greedy word wrap to a max character count per line.
export function wrap(text, max) {
  const out = [];
  for (const para of String(text).split("\n")) {
    let line = "";
    for (const w of para.split(" ")) {
      if (line && (line + " " + w).length > max) {
        out.push(line);
        line = w;
      } else line = line ? line + " " + w : w;
    }
    out.push(line);
  }
  return out;
}

export const textWidth = (s, size = 13) => s.length * CHAR * (size / 13);

// Multi-line centered text.
export function textBlock(lines, cx, cy, { size = 13, weight = 400, fill = "#111827", lh = 1.35, anchor = "middle" } = {}) {
  const h = size * lh;
  const top = cy - ((lines.length - 1) * h) / 2;
  return lines
    .map(
      (l, i) =>
        `<text x="${cx}" y="${top + i * h}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" dominant-baseline="central">${esc(l)}</text>`,
    )
    .join("");
}

// Edge label sizing for ELK: a list of lines.
export function labelOf(text, max = 22) {
  if (!text) return [];
  const lines = wrap(text, max);
  const width = Math.max(...lines.map((l) => textWidth(l, 12))) * 1.08 + 10;
  return [{ text, lines, width, height: lines.length * 16 + 4 }];
}

const elk = new ELK();

export async function layout(graph, options) {
  return elk.layout({
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
      "elk.layered.mergeEdges": "false",
      "elk.layered.unnecessaryBendpoints": "true",
      "elk.edgeLabels.inline": "false",
      "elk.padding": "[top=24,left=24,bottom=24,right=24]",
      ...options,
    },
    ...graph,
  });
}

// An orthogonal path with rounded corners through the ELK edge section points.
export function roundedPath(points, r = 8) {
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i - 1], p = points[i], p1 = points[i + 1];
    const d0 = Math.hypot(p.x - p0.x, p.y - p0.y), d1 = Math.hypot(p1.x - p.x, p1.y - p.y);
    const rr = Math.min(r, d0 / 2, d1 / 2);
    const a = { x: p.x + ((p0.x - p.x) * rr) / d0, y: p.y + ((p0.y - p.y) * rr) / d0 };
    const b = { x: p.x + ((p1.x - p.x) * rr) / d1, y: p.y + ((p1.y - p.y) * rr) / d1 };
    d += ` L${a.x},${a.y} Q${p.x},${p.y} ${b.x},${b.y}`;
  }
  const last = points[points.length - 1];
  return d + ` L${last.x},${last.y}`;
}

export function edgePoints(edge) {
  const s = edge.sections[0];
  return [s.startPoint, ...(s.bendPoints ?? []), s.endPoint];
}

// Put every edge's label on its own line, like the sample (the chip breaks the line). Each label slides along its
// edge's horizontal runs to the spot nearest a run's middle where the chip covers no other edge's vertical line, no
// node and no label already placed. Longer runs are tried first; if nothing is clear, the longest run's middle wins.
export function placeLabelsOnLines(graph) {
  const segs = graph.edges.map((e) => {
    const pts = edgePoints(e);
    return pts.slice(1).map((b, i) => ({ a: pts[i], b }));
  });
  const nodes = graph.children.map((n) => ({ x: n.x, y: n.y, w: n.width, h: n.height }));
  const placed = [];
  const hit = (r, q) => r.x < q.x + q.w && q.x < r.x + r.w && r.y < q.y + q.h && q.y < r.y + r.h;
  graph.edges.forEach((e, ei) => {
    const l = (e.labels ?? [])[0];
    if (!l) return;
    const runs = segs[ei]
      .filter((s) => Math.abs(s.a.y - s.b.y) < 0.5 && Math.abs(s.a.x - s.b.x) > 20)
      .map((s) => ({ x0: Math.min(s.a.x, s.b.x), x1: Math.max(s.a.x, s.b.x), y: s.a.y }))
      .sort((p, q) => q.x1 - q.x0 - (p.x1 - p.x0));
    if (!runs.length) return;
    const clear = (r) => {
      if (nodes.some((n) => hit(r, n)) || placed.some((q) => hit(r, q))) return false;
      return segs.every((ss, j) =>
        j === ei ||
        ss.every((s) => {
          if (Math.abs(s.a.x - s.b.x) < 0.5) {
            const y0 = Math.min(s.a.y, s.b.y), y1 = Math.max(s.a.y, s.b.y);
            return !(s.a.x > r.x && s.a.x < r.x + r.w && y1 > r.y && y0 < r.y + r.h);
          }
          const x0 = Math.min(s.a.x, s.b.x), x1 = Math.max(s.a.x, s.b.x);
          return !(s.a.y > r.y && s.a.y < r.y + r.h && x1 > r.x && x0 < r.x + r.w);
        }),
      );
    };
    let pick = null;
    for (const run of runs) {
      const mid = (run.x0 + run.x1) / 2;
      const lo = run.x0 + 16 + l.width / 2, hi = run.x1 - 16 - l.width / 2;
      for (let d = 0; mid + d <= hi || mid - d >= lo; d += 4) {
        for (const cx of d ? [mid - d, mid + d] : [mid]) {
          if (cx < lo || cx > hi) continue;
          const r = { x: cx - l.width / 2 - 3, y: run.y - l.height / 2, w: l.width + 6, h: l.height };
          if (clear(r)) { pick = { cx, y: run.y, r }; break; }
        }
        if (pick) break;
      }
      if (pick) break;
    }
    if (!pick) pick = { cx: (runs[0].x0 + runs[0].x1) / 2, y: runs[0].y, r: null };
    l.x = pick.cx - l.width / 2;
    l.y = pick.y - l.height / 2;
    placed.push(pick.r ?? { x: l.x - 3, y: l.y, w: l.width + 6, h: l.height });
    if (!pick.r) console.warn("label without a clear spot:", l.text);
  });
}

// Edge labels: white chip behind the text so lines never run through it.
export function drawLabels(edge, { size = 12, fill = "#1f2937", weight = 400 } = {}) {
  return (edge.labels ?? [])
    .map((l) => {
      const lines = l.lines ?? [l.text];
      return (
        `<rect x="${l.x - 2}" y="${l.y}" width="${l.width + 4}" height="${l.height}" fill="#ffffff"/>` +
        textBlock(lines, l.x + l.width / 2, l.y + l.height / 2, { size, fill, lh: 1.3, weight })
      );
    })
    .join("");
}

export function svgDoc(width, height, defs, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${FONT}">
<defs>${defs}</defs><rect width="100%" height="100%" fill="#ffffff"/>${body}</svg>`;
}

// Write an SVG wrapped in HTML (Inter from Google Fonts) for headless Chrome to screenshot.
export function htmlFor(svg, width, height) {
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=block" rel="stylesheet">
<style>html,body{margin:0;background:#fff}svg{display:block}</style></head>
<body style="width:${width}px;height:${height}px">${svg}</body></html>`;
}
