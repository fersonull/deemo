// Geometry for the History trend line (an SVG drawn in px). Scores are 0–100; y grows downward.

export type Point = { x: number; y: number };
export type Box = { width: number; height: number; left: number; right: number; top: number; bottom: number };

// The y range to plot: up to 100, down to a round number below the lowest score (never above 50), so a run of
// 60s–80s fills the chart instead of hugging its top. It's a line, not bars, so the axis needn't start at 0.
export function scoreDomain(scores: number[]): [number, number] {
  const low = Math.min(...scores, 50);
  return [Math.max(0, Math.floor((low - 5) / 10) * 10), 100];
}

export function scaleY(score: number, [lo, hi]: [number, number], box: Box) {
  const t = (Math.min(hi, Math.max(lo, score)) - lo) / (hi - lo);
  return box.top + (1 - t) * (box.height - box.top - box.bottom);
}

// One point per score, oldest to newest, spread across the plot; a single score sits in the middle.
export function chartPoints(scores: number[], domain: [number, number], box: Box): Point[] {
  const inner = box.width - box.left - box.right;
  const step = scores.length > 1 ? inner / (scores.length - 1) : 0;
  return scores.map((s, i) => ({
    x: scores.length > 1 ? box.left + i * step : box.left + inner / 2,
    y: scaleY(s, domain, box),
  }));
}

export const linePath = (p: Point[]) => p.map((q, i) => `${i ? "L" : "M"}${q.x} ${q.y}`).join(" ");

// The line closed down to the plot's floor, for the soft wash under it.
export function areaPath(p: Point[], box: Box) {
  if (!p.length) return "";
  const floor = box.height - box.bottom;
  return `${linePath(p)} L${p[p.length - 1].x} ${floor} L${p[0].x} ${floor} Z`;
}

export const pathLength = (p: Point[]) => p.slice(1).reduce((sum, q, i) => sum + Math.hypot(q.x - p[i].x, q.y - p[i].y), 0);

// The point whose x is closest to a touch, so scrubbing snaps to sessions.
export function nearestIndex(p: Point[], x: number) {
  let best = 0;
  p.forEach((q, i) => {
    if (Math.abs(q.x - x) < Math.abs(p[best].x - x)) best = i;
  });
  return best;
}
