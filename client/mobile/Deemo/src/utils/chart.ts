// Geometry for the History readiness columns (an SVG drawn in px). Scores are 0–100; y grows downward. Columns
// always grow from 0: a cut baseline would misstate their heights.

export type Box = { height: number; top: number; bottom: number };
export type Column = { x: number; width: number; y: number; height: number };

export const MIN_SLOT = 22; // narrowest slot a column gets; past that the chart scrolls sideways
const MAX_BAR = 24; // columns never fill their slot
const ROUND = 4; // rounded data end

export const scoreY = (score: number, box: Box) =>
  box.top + (1 - Math.min(100, Math.max(0, score)) / 100) * (box.height - box.top - box.bottom);

// How wide the plot's content is: the visible width, or wider when the sessions need more room.
export const contentWidth = (count: number, visible: number) => Math.max(visible, count * MIN_SLOT);

// One column per score, oldest to newest, centered in equal slots across `width`.
export function columns(scores: number[], width: number, box: Box): Column[] {
  const slot = width / Math.max(1, scores.length);
  const w = Math.min(MAX_BAR, Math.round(slot * 0.6));
  const floor = box.height - box.bottom;
  return scores.map((s, i) => {
    const y = scoreY(s, box);
    return { x: i * slot + (slot - w) / 2, width: w, y, height: floor - y };
  });
}

// A column with its top corners rounded and its base square, `grown` 0–1 of its full height.
// Runs on the UI thread too (the grow-in animation), hence the worklet directive.
export function columnPath(c: Column, grown = 1) {
  "worklet";
  const h = c.height * grown;
  const r = Math.min(ROUND, c.width / 2, h);
  const floor = c.y + c.height;
  const top = floor - h;
  return (
    `M${c.x} ${floor} V${top + r} Q${c.x} ${top} ${c.x + r} ${top} ` +
    `H${c.x + c.width - r} Q${c.x + c.width} ${top} ${c.x + c.width} ${top + r} V${floor} Z`
  );
}
