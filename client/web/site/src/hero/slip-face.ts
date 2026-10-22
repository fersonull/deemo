// Draws one side of a question slip onto a canvas, in the same notepaper language as the DOM `.slip` (base.css):
// off-white, dusk rules, a dusk margin line, the asker and stage on top, the question in Bricolage. The front carries
// the question; the back the follow-up the panelist would ask next.
import type { Slip } from "../content";

export const SLIP_W = 1280;
export const SLIP_H = 760;
const RULE = 87; // question lines sit on the rules
const RULE_TOP = 196;
const MARGIN = 118;
const TEXT_X = 150;

const C = {
  slip: "#fffdf8",
  rule: "#dfe4f7",
  margin: "rgba(90,102,199,0.5)",
  ink: "#2a2420",
  muted: "#6b6157",
  duskInk: "#343996",
  duskTint: "#dce3ff",
};

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function paper(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = C.slip;
  ctx.fillRect(0, 0, SLIP_W, SLIP_H);
  ctx.fillStyle = C.rule;
  for (let y = RULE_TOP; y < SLIP_H - 80; y += RULE) ctx.fillRect(0, y, SLIP_W, 3);
  ctx.fillStyle = C.margin;
  ctx.fillRect(MARGIN, 0, 3, SLIP_H);
}

function header(ctx: CanvasRenderingContext2D, slip: Slip) {
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = C.ink;
  ctx.font = "600 40px 'DM Sans'";
  ctx.fillText(slip.name, TEXT_X, 92);
  const nameW = ctx.measureText(slip.name).width;
  ctx.fillStyle = C.muted;
  ctx.font = "400 40px 'DM Sans'";
  ctx.fillText(slip.role, TEXT_X + nameW + 16, 92);

  ctx.font = "500 32px 'DM Sans'";
  const w = ctx.measureText(slip.stage).width + 44;
  const x = SLIP_W - 64 - w;
  ctx.fillStyle = C.duskTint;
  ctx.beginPath();
  ctx.roundRect(x, 50, w, 56, 28);
  ctx.fill();
  ctx.fillStyle = C.duskInk;
  ctx.fillText(slip.stage, x + 22, 90);
}

function body(ctx: CanvasRenderingContext2D, lead: string | null, text: string) {
  if (lead) {
    ctx.fillStyle = C.muted;
    ctx.font = "italic 400 36px 'DM Sans'";
    ctx.fillText(lead, TEXT_X, RULE_TOP - 22);
  }
  ctx.fillStyle = C.ink;
  ctx.font = "700 70px 'Bricolage Grotesque'";
  wrap(ctx, text, SLIP_W - TEXT_X - 72)
    .slice(0, 4)
    .forEach((line, i) => ctx.fillText(line, TEXT_X, RULE_TOP + (i + 1) * RULE - 10));
}

function footer(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = C.muted;
  ctx.font = "400 30px 'DM Sans'";
  ctx.fillText("Sample paper: ReqTrack", TEXT_X, SLIP_H - 44);
}

export function drawSlip(slip: Slip, side: "front" | "back") {
  const canvas = document.createElement("canvas");
  canvas.width = SLIP_W;
  canvas.height = SLIP_H;
  const ctx = canvas.getContext("2d")!;
  paper(ctx);
  header(ctx, slip);
  if (side === "front") body(ctx, null, slip.q);
  else body(ctx, `If you answer, ${slip.name} follows up:`, slip.follow);
  footer(ctx);
  return canvas;
}

// Canvas text needs the faces loaded first, or it silently falls back to a system font.
export const fontsReady = () =>
  Promise.all([
    document.fonts.load("700 70px 'Bricolage Grotesque'"),
    document.fonts.load("600 40px 'DM Sans'"),
    document.fonts.load("400 40px 'DM Sans'"),
    document.fonts.load("italic 400 36px 'DM Sans'"),
  ]);
