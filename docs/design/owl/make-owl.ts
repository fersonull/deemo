// Draft of Deemo as an owl (study before any app change). Run `bun make-owl.ts`, then open owl-sheet.html.
// Colors are the app's tokens (client/mobile/Deemo/src/colors.ts).
import { writeFileSync } from "fs";

const c = {
  paper: "#F7F3EC", dusk: "#5A66C7", duskIcon: "#4D57B7", duskInk: "#343996", duskTint: "#DCE3FF",
  duskSoft: "#CFD6F3", amber: "#EBB353", amberInk: "#6C4302", ink: "#2A2420",
};
const S = 6; // outline width

const BODY =
  "M200 100 C298 100 326 152 322 208 C318 266 302 304 270 330 C246 350 154 350 130 330 C98 304 82 266 78 208 C74 152 102 100 200 100 Z";

function owl({ glasses = false, cap = true } = {}) {
  const scallop = (x: number, y: number) =>
    `<path d="M${x - 9} ${y} Q${x} ${y + 9} ${x + 9} ${y}" fill="none" stroke="${c.duskIcon}" stroke-opacity="0.55" stroke-width="4" stroke-linecap="round"/>`;
  const eye = (x: number, look: number) => `
    <circle cx="${x}" cy="182" r="29" fill="${c.paper}" stroke="${c.duskInk}" stroke-width="${S - 1}"/>
    <circle cx="${x + look}" cy="186" r="13.5" fill="${c.duskInk}"/>
    <circle cx="${x + look + 5}" cy="180" r="4.6" fill="${c.paper}"/>`;
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="40 40 360 340" width="360" height="340">
    <ellipse cx="200" cy="362" rx="96" ry="10" fill="${c.duskSoft}"/>
    <!-- ear tufts, behind the head -->
    <path d="M108 146 Q90 112 84 84 Q122 94 154 116 Z" fill="${c.duskIcon}" stroke="${c.duskInk}" stroke-width="${S}" stroke-linejoin="round"/>
    <path d="M292 146 Q310 112 316 84 Q278 94 246 116 Z" fill="${c.duskIcon}" stroke="${c.duskInk}" stroke-width="${S}" stroke-linejoin="round"/>
    <!-- hand on hip (viewer's left) -->
    <path d="M96 226 C64 240 52 282 66 300 C80 314 104 306 114 292 Z" fill="${c.duskIcon}" stroke="${c.duskInk}" stroke-width="${S}" stroke-linejoin="round"/>
    <!-- body -->
    <path d="${BODY}" fill="${c.dusk}"/>
    <ellipse cx="200" cy="290" rx="76" ry="54" fill="${c.paper}"/>
    ${scallop(172, 270)}${scallop(200, 270)}${scallop(228, 270)}
    ${scallop(186, 294)}${scallop(214, 294)}
    ${scallop(200, 318)}
    <path d="${BODY}" fill="none" stroke="${c.duskInk}" stroke-width="${S}" stroke-linejoin="round"/>
    <!-- face disc -->
    <path d="M200 150 C176 124 122 126 117 174 C114 214 150 238 184 226 L200 244 L216 226 C250 238 286 214 283 174 C278 126 224 124 200 150 Z" fill="${c.duskTint}"/>
    <!-- brows: two soft feather strokes -->
    <path d="M140 146 Q160 136 184 146" fill="none" stroke="${c.duskInk}" stroke-width="5" stroke-linecap="round"/>
    <path d="M216 146 Q240 136 260 146" fill="none" stroke="${c.duskInk}" stroke-width="5" stroke-linecap="round"/>
    ${eye(162, 3)}${eye(238, -3)}
    ${glasses ? `
    <circle cx="162" cy="182" r="37" fill="none" stroke="${c.duskInk}" stroke-width="${S}"/>
    <circle cx="238" cy="182" r="37" fill="none" stroke="${c.duskInk}" stroke-width="${S}"/>
    <path d="M190 172 Q200 166 210 172" fill="none" stroke="${c.duskInk}" stroke-width="${S}" stroke-linecap="round"/>
    <path d="M125 178 L96 172 M275 178 L304 172" stroke="${c.duskInk}" stroke-width="${S - 1}" stroke-linecap="round"/>` : ""}
    <!-- cheeks and beak -->
    <ellipse cx="120" cy="226" rx="12" ry="7" fill="${c.duskSoft}" opacity="0.85"/>
    <ellipse cx="280" cy="226" rx="12" ry="7" fill="${c.duskSoft}" opacity="0.85"/>
    <path d="M187 221 Q200 216 213 221 Q207 238 200 248 Q193 238 187 221 Z" fill="${c.amber}" stroke="${c.amberInk}" stroke-width="3.5" stroke-linejoin="round"/>
    <!-- waving wing (viewer's right) -->
    <path d="M308 262 C326 246 336 222 340 196 L344 150 Q351 141 358 150 L361 168 Q369 160 375 169 L376 187 Q384 183 388 192 C390 216 381 238 363 253 C347 266 327 270 308 262 Z" fill="${c.duskIcon}" stroke="${c.duskInk}" stroke-width="${S}" stroke-linejoin="round"/>
    <path d="M352 168 Q348 202 330 238 M370 188 Q364 216 344 248" fill="none" stroke="${c.duskInk}" stroke-opacity="0.45" stroke-width="3.5" stroke-linecap="round"/>
    <!-- feet -->
    ${[168, 232].map((x) => [-12, 0, 12].map((d) => `<ellipse cx="${x + d * 0.9}" cy="352" rx="6.5" ry="10" transform="rotate(${d * 1.8} ${x + d * 0.9} 352)" fill="${c.amber}" stroke="${c.amberInk}" stroke-width="3.5"/>`).join("")).join("")}
    ${cap ? `
    <!-- mortarboard -->
    <g transform="translate(0 12) rotate(-5 200 96)">
      <path d="M144 106 Q200 92 256 106 L252 130 Q200 118 148 130 Z" fill="${c.duskInk}" stroke="${c.duskInk}" stroke-width="${S}" stroke-linejoin="round"/>
      <path d="M200 52 L294 82 L200 112 L106 82 Z" fill="${c.duskInk}" stroke="${c.duskInk}" stroke-width="${S}" stroke-linejoin="round"/>
      <path d="M200 60 L270 82 L200 104 L130 82 Z" fill="${c.duskIcon}"/>
      <path d="M200 82 Q250 80 288 86 L288 120" fill="none" stroke="${c.amber}" stroke-width="4" stroke-linecap="round"/>
      <circle cx="200" cy="82" r="6" fill="${c.amber}" stroke="${c.amberInk}" stroke-width="2.5"/>
      <rect x="281" y="116" width="14" height="24" rx="5" fill="${c.amber}" stroke="${c.amberInk}" stroke-width="3"/>
    </g>` : ""}
  </svg>`;
}

const card = (label: string, svg: string) =>
  `<figure>${svg}<figcaption>${label}</figcaption></figure>`;

writeFileSync("owl.svg", owl().trim());
writeFileSync("owl-glasses.svg", owl({ glasses: true }).trim());
writeFileSync(
  "owl-sheet.html",
  `<!doctype html><meta charset="utf-8"><title>Deemo owl study</title>
<style>
  body{margin:0;background:${c.paper};font-family:"DM Sans",system-ui,sans-serif;color:${c.ink}}
  main{display:flex;gap:28px;padding:36px 40px 28px;align-items:flex-end}
  h1{font:700 30px "Bricolage Grotesque",system-ui,sans-serif;margin:32px 40px 0;letter-spacing:-0.5px}
  p.sub{margin:6px 40px 0;color:#5E554D;font-size:15px}
  figure{margin:0;text-align:center}
  figure svg{width:420px;height:397px}
  figcaption{margin-top:8px;font-size:14px;color:#5E554D}
  .sw{display:flex;gap:10px;margin:0 40px 32px}
  .sw span{display:flex;align-items:center;gap:6px;font-size:12px;color:#5E554D}
  .sw i{width:18px;height:18px;border-radius:50%;display:inline-block;border:1px solid rgba(42,36,32,.12)}
</style>
<h1>Deemo, the owl</h1>
<p class="sub">A study before the app changes. Same tokens as the app: dusk body, paper belly, duskInk outlines, amber beak, feet and tassel.</p>
<main>
${card("A. Owl with the cap (as in the reference)", owl())}
${card("B. Same owl, keeping Deemo's round glasses", owl({ glasses: true }))}
</main>
<div class="sw">${Object.entries({ dusk: c.dusk, duskIcon: c.duskIcon, duskInk: c.duskInk, duskTint: c.duskTint, duskSoft: c.duskSoft, paper: c.paper, amber: c.amber, amberInk: c.amberInk })
    .map(([k, v]) => `<span><i style="background:${v}"></i>${k}</span>`).join("")}</div>`,
);
