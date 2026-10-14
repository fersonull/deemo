// Builds Deemo's app icon SVGs from the owl's own geometry (src/components/deemo/index.tsx): a close-up of Deemo's
// head, cap and face on paper. Run `bun assets/icon-src/make-icons.ts assets/icon-src`, then render each SVG to a
// 1024 px PNG in assets/images (any SVG renderer; we used headless Chrome with a transparent background), and
// rebuild the app.
import { writeFileSync } from "fs";
const OUT = process.argv[2];
const C = {
  paper: "#F7F3EC", ink: "#2A2420", inkSoft: "#3E3731", dusk: "#5A66C7", duskInk: "#343996", duskTint: "#DCE3FF",
  amber: "#EBB353", amberInk: "#6C4302", clayTint: "#F5DDD3",
};
const BODY = "M200 112 C292 112 322 170 318 232 C314 300 268 344 200 344 C132 344 86 300 82 232 C78 170 108 112 200 112 Z";
const FACE = "M200 170 C178 144 116 144 112 200 C108 250 160 268 200 248 C240 268 292 250 288 200 C284 144 222 144 200 170 Z";
const BEAK = "M191 238 Q200 233 209 238 Q205 249 200 253 Q195 249 191 238 Z";
const EYES = [160, 240];

// Adaptive icon canvas: 108 × 108 (dp); 72 visible; 66 safe circle at the center. Close-up: the point between the
// cap and the eyes sits at the center, so cap, face and beak fit the safe circle while the body runs off the bottom.
const S = 0.27;
const g = (inner: string) => `<g transform="translate(54 54) scale(${S}) translate(-200 -170)">${inner}</g>`;
const line = `stroke="${C.duskInk}" stroke-linejoin="round" stroke-linecap="round"`;

const cap = `<g transform="rotate(-6 200 112)">
  <path d="M148 114 Q200 102 252 114 L248 136 Q200 126 152 136 Z" fill="${C.ink}" stroke="${C.ink}" stroke-width="6" stroke-linejoin="round"/>
  <path d="M200 68 L286 96 L200 124 L114 96 Z" fill="${C.ink}" stroke="${C.ink}" stroke-width="6" stroke-linejoin="round"/>
  <path d="M200 76 L262 96 L200 116 L138 96 Z" fill="${C.inkSoft}"/>
  <path d="M200 96 Q246 94 280 100 L280 134" fill="none" stroke="${C.amber}" stroke-width="4" stroke-linecap="round"/>
  <circle cx="200" cy="96" r="6" fill="${C.amber}" stroke="${C.amberInk}" stroke-width="2.5"/>
  <rect x="273" y="130" width="14" height="22" rx="5" fill="${C.amber}" stroke="${C.amberInk}" stroke-width="3"/>
</g>`;

const deemo = g(`
  <path d="${BODY}" fill="${C.dusk}" ${line} stroke-width="6"/>
  <path d="${FACE}" fill="${C.duskTint}"/>
  <ellipse cx="116" cy="246" rx="15" ry="8.5" fill="${C.clayTint}" opacity="0.9"/>
  <ellipse cx="284" cy="246" rx="15" ry="8.5" fill="${C.clayTint}" opacity="0.9"/>
  ${EYES.map((x, i) => {
    const px = x + (i ? -3 : 3);
    return `<circle cx="${x}" cy="204" r="32" fill="${C.paper}" ${line} stroke-width="5"/>
    <circle cx="${px}" cy="206" r="17" fill="${C.duskInk}"/>
    <circle cx="${px + 6.5}" cy="198.9" r="6.1" fill="${C.paper}"/>
    <circle cx="${px - 6.8}" cy="212.1" r="2.6" fill="${C.paper}"/>`;
  }).join("")}
  <path d="${BEAK}" fill="${C.amber}" stroke="${C.amberInk}" stroke-width="3" stroke-linejoin="round"/>
  ${cap}`);

const svg = (viewBox: string, body: string, bg?: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="${viewBox}">${bg ? `<rect x="-10" y="-10" width="200" height="200" fill="${bg}"/>` : ""}${body}</svg>\n`;

// Monochrome (Android 13+ themed icons, used as a mask): the cap, the eyes and the beak in line, pupils filled.
const mono = g(`<g stroke="#000" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" fill="none">
  ${EYES.map((x) => `<circle cx="${x}" cy="204" r="32"/>`).join("")}
  <path d="${BEAK}"/>
  <g transform="rotate(-6 200 112)"><path d="M200 68 L286 96 L200 124 L114 96 Z"/><path d="M152 118 L152 136 Q200 126 248 136 L248 118"/><path d="M280 100 L280 140"/></g>
  </g>
  ${EYES.map((x, i) => `<circle cx="${x + (i ? -3 : 3)}" cy="206" r="17" fill="#000"/>`).join("")}`);

writeFileSync(`${OUT}/android-icon-foreground.svg`, svg("0 0 108 108", deemo));
writeFileSync(`${OUT}/android-icon-background.svg`, svg("0 0 108 108", "", C.paper));
writeFileSync(`${OUT}/android-icon-monochrome.svg`, svg("0 0 108 108", mono));
// The plain icon (iOS, web, stores): the adaptive icon's visible 72 × 72, full bleed.
writeFileSync(`${OUT}/icon.svg`, svg("18 18 72 72", deemo, C.paper));
