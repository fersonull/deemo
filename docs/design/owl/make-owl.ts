// Draft of Deemo as an owl (study before any app change). Run `bun make-owl.ts` here, then open owl-sheet.html.
// Colors are the app's tokens (client/mobile/Deemo/src/colors.ts); the cap is ink, the darkest token.
import { writeFileSync } from "fs";

const c = {
  paper: "#F7F3EC", sand: "#EDE5D8", ink: "#2A2420", inkSoft: "#3E3731", inkMuted: "#5E554D",
  dusk: "#5A66C7", duskIcon: "#4D57B7", duskInk: "#343996", duskTint: "#DCE3FF", duskSoft: "#CFD6F3",
  amber: "#EBB353", amberInk: "#6C4302", clayTint: "#F5DDD3",
  gold: "#D9A521", goldLight: "#F6DC86", goldInk: "#8C6310",
};
const S = 6; // outline width

type Mood = "idle" | "waving" | "cheering" | "reading" | "encouraging" | "sleepy" | "nervous";

// A round little owl: one body, a big face, short wings, a black mortarboard.
const BODY = "M200 112 C292 112 322 170 318 232 C314 300 268 344 200 344 C132 344 86 300 82 232 C78 170 108 112 200 112 Z";
const FACE = "M200 170 C178 144 116 144 112 200 C108 250 160 268 200 248 C240 268 292 250 288 200 C284 144 222 144 200 170 Z";
const WING_L = "M96 236 C70 252 64 292 82 308 C100 300 112 278 112 254 Z";
const WING_R = "M304 236 C330 252 336 292 318 308 C300 300 288 278 288 254 Z";
const SHOULDER_L = "102 246";
const SHOULDER_R = "298 246";

const stroke = (w = S) => `stroke="${c.duskInk}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

function eyes(mood: Mood) {
  const at = [160, 240];
  if (mood === "cheering")
    return at.map((x) => `<path d="M${x - 22} 212 Q${x} 184 ${x + 22} 212" fill="none" ${stroke(7)}/>`).join("");
  if (mood === "sleepy")
    return at.map((x) => `<path d="M${x - 22} 204 Q${x} 220 ${x + 22} 204" fill="none" ${stroke(7)}/>`).join("");
  const r = mood === "nervous" ? 33 : 32;
  const pr = mood === "nervous" ? 10 : 17;
  const dy = mood === "reading" ? 9 : 2;
  return at
    .map((x, i) => {
      const dx = mood === "reading" ? 0 : i ? -3 : 3;
      return `<circle cx="${x}" cy="204" r="${r}" fill="${c.paper}" ${stroke(S - 1)}/>
      <circle cx="${x + dx}" cy="${204 + dy}" r="${pr}" fill="${c.duskInk}"/>
      <circle cx="${x + dx + pr * 0.38}" cy="${204 + dy - pr * 0.42}" r="${pr * 0.36}" fill="${c.paper}"/>
      <circle cx="${x + dx - pr * 0.4}" cy="${204 + dy + pr * 0.36}" r="${pr * 0.15}" fill="${c.paper}"/>
      ${mood === "encouraging" ? `<path d="M${x - 20} 160 Q${x} 150 ${x + 20} 160" fill="none" ${stroke(5)}/><path d="M${x - 30} 222 Q${x} 246 ${x + 30} 222 L${x + 34} 240 L${x - 34} 240 Z" fill="${c.duskTint}"/><path d="M${x - 28} 222 Q${x} 242 ${x + 28} 222" fill="none" ${stroke(S - 1)}/>` : ""}`;
    })
    .join("");
}

function beak(mood: Mood) {
  if (mood === "cheering" || mood === "waving")
    return `<path d="M190 237 Q200 233 210 237 Q206 244 200 246 Q194 244 190 237 Z" fill="${c.amber}" stroke="${c.amberInk}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M194 248 Q200 258 206 248 Z" fill="${c.amberInk}"/>`;
  if (mood === "nervous")
    return `<path d="M192 238 Q200 234 208 238 Q204 248 200 251 Q196 248 192 238 Z" fill="${c.amber}" stroke="${c.amberInk}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M186 262 Q191 257 196 262 Q201 267 206 262 Q211 257 214 262" fill="none" ${stroke(3.5)}/>`;
  return `<path d="M191 238 Q200 233 209 238 Q205 249 200 253 Q195 249 191 238 Z" fill="${c.amber}" stroke="${c.amberInk}" stroke-width="3" stroke-linejoin="round"/>`;
}

function wing(side: "l" | "r", angle = 0, dx = 0, dy = 0) {
  const d = side === "l" ? WING_L : WING_R;
  const o = side === "l" ? SHOULDER_L : SHOULDER_R;
  const f = side === "l" ? "M90 268 Q86 284 90 298" : "M310 268 Q314 284 310 298";
  return `<g transform="translate(${dx} ${dy}) rotate(${angle} ${o})"><path d="${d}" fill="${c.duskIcon}" ${stroke()}/><path d="${f}" fill="none" stroke="${c.duskInk}" stroke-opacity="0.4" stroke-width="3.5" stroke-linecap="round"/></g>`;
}

function cap(mood: Mood) {
  const tilt = mood === "sleepy" ? -14 : mood === "nervous" ? 4 : -6;
  const drop = mood === "sleepy" ? 14 : mood === "cheering" ? -6 : 0;
  return `<g transform="translate(0 ${drop}) rotate(${tilt} 200 112)">
    <path d="M148 114 Q200 102 252 114 L248 136 Q200 126 152 136 Z" fill="${c.ink}" stroke="${c.ink}" stroke-width="${S}" stroke-linejoin="round"/>
    <path d="M200 68 L286 96 L200 124 L114 96 Z" fill="${c.ink}" stroke="${c.ink}" stroke-width="${S}" stroke-linejoin="round"/>
    <path d="M200 76 L262 96 L200 116 L138 96 Z" fill="${c.inkSoft}"/>
    <path d="M200 96 Q246 94 280 100 L280 134" fill="none" stroke="${c.amber}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="200" cy="96" r="6" fill="${c.amber}" stroke="${c.amberInk}" stroke-width="2.5"/>
    <rect x="273" y="130" width="14" height="22" rx="5" fill="${c.amber}" stroke="${c.amberInk}" stroke-width="3"/>
  </g>`;
}

function extras(mood: Mood) {
  if (mood === "sleepy")
    return `<text x="300" y="120" font-family="Bricolage Grotesque, system-ui, sans-serif" font-weight="800" font-size="40" fill="${c.duskInk}">z</text>
      <text x="330" y="88" font-family="Bricolage Grotesque, system-ui, sans-serif" font-weight="800" font-size="28" fill="${c.duskInk}" opacity="0.7">z</text>`;
  if (mood === "nervous")
    return `<path d="M112 140 Q100 162 104 172 Q110 182 120 176 Q128 168 112 140 Z" fill="${c.duskTint}" stroke="${c.duskIcon}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M130 162 Q150 156 170 166 M230 166 Q250 156 270 162" fill="none" ${stroke(5)}/>`;
  if (mood === "cheering") {
    const spark = (x: number, y: number, r: number) =>
      `<path d="M${x} ${y - r} Q${x + r * 0.15} ${y - r * 0.15} ${x + r} ${y} Q${x + r * 0.15} ${y + r * 0.15} ${x} ${y + r} Q${x - r * 0.15} ${y + r * 0.15} ${x - r} ${y} Q${x - r * 0.15} ${y - r * 0.15} ${x} ${y - r}Z" fill="${c.amber}"/>`;
    return spark(70, 120, 14) + spark(334, 104, 11) + spark(352, 160, 8);
  }
  if (mood === "reading")
    return `<g transform="rotate(-4 200 300)">
      <rect x="146" y="262" width="108" height="72" rx="8" fill="${c.paper}" stroke="${c.inkMuted}" stroke-width="3.5"/>
      <path d="M162 282 H238 M162 296 H230 M162 310 H214" stroke="${c.duskSoft}" stroke-width="5" stroke-linecap="round"/>
    </g>`;
  return "";
}

function wings(mood: Mood) {
  switch (mood) {
    case "waving": return wing("l") + wing("r", -135, 26, -18);
    case "cheering": return wing("l", 128) + wing("r", -128);
    case "reading": return wing("l", -38) + wing("r", 38);
    case "encouraging": return wing("l") + wing("r", -100, 18, -4);
    case "nervous": return wing("l", -22) + wing("r", 22);
    default: return wing("l") + wing("r");
  }
}

function star(cx: number, cy: number, outer: number, inner: number) {
  return (
    Array.from({ length: 10 }, (_, i) => {
      const r = i % 2 ? inner : outer;
      const a = (Math.PI / 5) * i - Math.PI / 2;
      return `${i ? "L" : "M"}${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
    }).join(" ") + "Z"
  );
}

// Premium, as in the app today: a dark dusk jacket clipped to the body, lighter lapels, a paper shirt V,
// a gold bow tie at the collar, and the gold star medal on a ribbon pinned on the right lapel.
let clipId = 0;
function suit() {
  const id = `suit${clipId++}`;
  const top = 262; // just under the face
  const bx = 238, by = 300; // the medal
  return `<defs><clipPath id="${id}"><path d="${BODY}"/></clipPath></defs>
    <g clip-path="url(#${id})">
      <rect x="60" y="${top}" width="280" height="100" fill="${c.duskInk}"/>
      <path d="M170 ${top} L184 ${top} L200 344 L190 344Z" fill="${c.duskIcon}"/>
      <path d="M230 ${top} L216 ${top} L200 344 L210 344Z" fill="${c.duskIcon}"/>
      <path d="M184 ${top} L216 ${top} L200 330Z" fill="${c.paper}"/>
      <circle cx="200" cy="300" r="3" fill="${c.duskInk}"/><circle cx="200" cy="316" r="3" fill="${c.duskInk}"/>
    </g>
    <path d="M200 ${top + 6} L184 ${top - 2} L184 ${top + 14}Z" fill="${c.gold}" stroke="${c.goldInk}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M200 ${top + 6} L216 ${top - 2} L216 ${top + 14}Z" fill="${c.gold}" stroke="${c.goldInk}" stroke-width="2.5" stroke-linejoin="round"/>
    <rect x="196" y="${top + 1.5}" width="8" height="9" rx="2.5" fill="${c.goldInk}"/>
    <path d="M${bx - 7} ${by + 3} L${bx - 10} ${by + 17} L${bx - 4} ${by + 13} L${bx - 1} ${by + 18} L${bx + 1} ${by + 5}Z" fill="${c.goldInk}"/>
    <path d="M${bx + 7} ${by + 3} L${bx + 10} ${by + 17} L${bx + 4} ${by + 13} L${bx + 1} ${by + 18} L${bx - 1} ${by + 5}Z" fill="${c.gold}"/>
    <circle cx="${bx}" cy="${by}" r="11" fill="${c.gold}" stroke="${c.goldInk}" stroke-width="2.4"/>
    <circle cx="${bx}" cy="${by}" r="7" fill="none" stroke="${c.goldLight}" stroke-width="1.4" opacity="0.8"/>
    <path d="${star(bx, by, 5, 2.3)}" fill="${c.goldLight}"/>
    <path d="M${bx + 10} ${by - 16} Q${bx + 10.7} ${by - 11.7} ${bx + 15} ${by - 11} Q${bx + 10.7} ${by - 10.3} ${bx + 10} ${by - 6} Q${bx + 9.3} ${by - 10.3} ${bx + 5} ${by - 11} Q${bx + 9.3} ${by - 11.7} ${bx + 10} ${by - 16}Z" fill="${c.goldLight}"/>`;
}

export function owl(mood: Mood = "idle", { premium = false, size = 220 } = {}) {
  const tilt = mood === "encouraging" ? -6 : mood === "nervous" ? 3 : 0;
  const reading = mood === "reading";
  const scallop = (x: number, y: number) =>
    `<path d="M${x - 8} ${y} Q${x} ${y + 8} ${x + 8} ${y}" fill="none" stroke="${c.duskIcon}" stroke-opacity="0.5" stroke-width="3.5" stroke-linecap="round"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="30 40 340 330" width="${size}" height="${(size * 330) / 340}">
    <ellipse cx="200" cy="356" rx="${mood === "cheering" ? 74 : 92}" ry="9" fill="${c.duskSoft}"/>
    <g transform="translate(0 ${mood === "cheering" ? -10 : 0})">
    ${[176, 224].map((x) => [-11, 0, 11].map((d) => `<ellipse cx="${x + d * 0.9}" cy="345" rx="5.5" ry="8" transform="rotate(${d * 1.8} ${x + d * 0.9} 345)" fill="${c.amber}" stroke="${c.amberInk}" stroke-width="3"/>`).join("")).join("")}
    <g transform="rotate(${tilt} 200 230)">
      <path d="${BODY}" fill="${c.dusk}"/>
      <ellipse cx="200" cy="298" rx="68" ry="42" fill="${c.paper}"/>
      ${reading || premium ? "" : scallop(180, 288) + scallop(200, 288) + scallop(220, 288) + scallop(190, 306) + scallop(210, 306) + scallop(200, 324)}
      ${premium ? suit() : ""}
      <path d="${BODY}" fill="none" ${stroke()}/>
      <path d="${FACE}" fill="${c.duskTint}"/>
      <ellipse cx="116" cy="246" rx="15" ry="8.5" fill="${c.clayTint}" opacity="0.9"/>
      <ellipse cx="284" cy="246" rx="15" ry="8.5" fill="${c.clayTint}" opacity="0.9"/>
      ${eyes(mood)}
      ${beak(mood)}
      ${extras(mood)}
      ${wings(mood)}
      ${cap(mood)}
    </g>
    </g>
  </svg>`;
}

const MOODS: [Mood, string][] = [
  ["idle", "Idle: calm, looking out"],
  ["waving", "Waving: hello"],
  ["cheering", "Cheering: a hop, wings up"],
  ["reading", "Reading: working on your paper"],
  ["encouraging", "Encouraging: head tilt, a nudge"],
  ["sleepy", "Sleepy: offline"],
  ["nervous", "Nervous: low score, errors"],
];

const tile = (label: string, svg: string) => `<figure>${svg}<figcaption>${label}</figcaption></figure>`;

writeFileSync("owl.svg", owl("idle"));
writeFileSync(
  "owl-sheet.html",
  `<!doctype html><meta charset="utf-8"><title>Deemo owl states</title>
<style>
  body{margin:0;background:${c.paper};font-family:"DM Sans",system-ui,sans-serif;color:${c.ink}}
  h1{font:700 30px "Bricolage Grotesque",system-ui,sans-serif;margin:32px 40px 0;letter-spacing:-0.5px}
  h2{font:600 13px "DM Sans",system-ui,sans-serif;letter-spacing:1px;text-transform:uppercase;color:${c.inkMuted};margin:28px 40px 0}
  p.sub{margin:6px 40px 0;color:${c.inkMuted};font-size:15px}
  .grid{display:grid;grid-template-columns:repeat(5,200px);gap:22px 30px;padding:18px 40px 0}
  figure{margin:0;text-align:center}
  figcaption{margin-top:6px;font-size:13px;color:${c.inkMuted}}
  .sizes{display:flex;align-items:flex-end;gap:36px;padding:16px 40px 36px}
  .sizes figure figcaption{font-size:12px}
</style>
<h1>Deemo, the owl: every state</h1>
<p class="sub">Black cap, no ear tufts, rounder and softer. Same moods the app uses today; Premium keeps today's suit, bow tie and shining gold medal.</p>
<h2>Moods</h2>
<div class="grid">
${MOODS.map(([m, l]) => tile(l, owl(m, { size: 200 }))).join("\n")}
${tile("Premium: suit, bow tie, gold medal", owl("idle", { premium: true, size: 200 }))}
${tile("Premium, waving", owl("waving", { premium: true, size: 200 }))}
${tile("Premium, cheering", owl("cheering", { premium: true, size: 200 }))}
</div>
<h2>Sizes in the app</h2>
<div class="sizes">
${([["XL 220", 220], ["L 136", 136], ["M 76", 76], ["S 40", 40]] as const).map(([l, s]) => tile(l, owl("idle", { size: s }))).join("\n")}
</div>`,
);
