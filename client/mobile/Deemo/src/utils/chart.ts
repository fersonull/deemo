// Line chart geometry for plain Views (no SVG in the build): a point per score, and a segment between
// neighbors as a rotated bar centered on its midpoint. Scores are 0–100; y grows downward.

export type Point = { x: number; y: number };
export type Segment = { cx: number; cy: number; length: number; angle: number }; // angle in degrees

export function chartPoints(scores: number[], width: number, height: number, pad = 8): Point[] {
  const yOf = (s: number) => pad + (1 - Math.min(100, Math.max(0, s)) / 100) * (height - 2 * pad);
  if (scores.length === 1) return [{ x: width / 2, y: yOf(scores[0]) }];
  const step = (width - 2 * pad) / Math.max(1, scores.length - 1);
  return scores.map((s, i) => ({ x: pad + i * step, y: yOf(s) }));
}

export function segments(points: Point[]): Segment[] {
  return points.slice(1).map((b, i) => {
    const a = points[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return { cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, length: Math.hypot(dx, dy), angle: (Math.atan2(dy, dx) * 180) / Math.PI };
  });
}

// The y of a score line (e.g. the 85 "defense-ready" mark), on the same scale as the points.
export const scoreY = (score: number, height: number, pad = 8) => pad + (1 - score / 100) * (height - 2 * pad);
