// Builds Deemo's app icon SVGs from the character's own geometry (src/components/deemo/index.tsx): a close-up of
// Deemo on paper. Run `bun assets/icon-src/make-icons.ts assets/icon-src`, then render each SVG to a 1024 px PNG in
// assets/images (any SVG renderer; we used headless Chrome with a transparent background), and rebuild the app.
import { writeFileSync } from "fs";
const OUT = process.argv[2];
const C = { paper: "#F7F3EC", dusk: "#5A66C7", duskInk: "#343996", duskTint: "#DCE3FF" };
const W = 100, H = 85;
const [tl, tr, br, bl] = [[0.58 * W, 0.55 * H], [0.42 * W, 0.5 * H], [0.52 * W, 0.5 * H], [0.48 * W, 0.45 * H]];
const BODY = `M${tl[0]} 0 A${tr[0]} ${tr[1]} 0 0 1 ${W} ${tr[1]} A${br[0]} ${br[1]} 0 0 1 ${W - br[0]} ${H} A${bl[0]} ${bl[1]} 0 0 1 0 ${H - bl[1]} A${tl[0]} ${tl[1]} 0 0 1 ${tl[0]} 0Z`;
const EYE = { y: 31.5, dx: 17, rx: 7, ry: 9, pupil: 3.8 }, LENS = 15, INK = 3.2;
const ex = [50 - EYE.dx, 50 + EYE.dx];

// Adaptive icon canvas: 108 × 108 (dp); 72 visible; 66 safe circle at the center. Close-up: Deemo scaled so the
// pebble is wider than the visible area (sides and bottom run off), the top curve shows, the face sits in the safe zone.
const S = 0.82, EYES_AT = 52; // eyes slightly above center
const tx = 54 - 50 * S, ty = EYES_AT - EYE.y * S;
const g = (inner: string) => `<g transform="translate(${tx} ${ty}) scale(${S})">${inner}</g>`;

const face = `
  <g fill="${C.duskTint}" opacity="0.55"><ellipse cx="20" cy="55" rx="6.5" ry="3.4"/><ellipse cx="80" cy="55" rx="6.5" ry="3.4"/></g>
  ${ex.map((x) => `<ellipse cx="${x}" cy="${EYE.y}" rx="${EYE.rx}" ry="${EYE.ry}" fill="${C.paper}"/><circle cx="${x}" cy="${EYE.y + 1.5}" r="${EYE.pupil}" fill="${C.duskInk}"/>`).join("")}
  <g stroke="${C.duskInk}" stroke-width="${INK}" stroke-linecap="round" fill="none">
    ${ex.map((x) => `<circle cx="${x}" cy="${EYE.y}" r="${LENS}"/>`).join("")}
    <path d="M${ex[0] + LENS} ${EYE.y - 1} Q50 ${EYE.y - 4} ${ex[1] - LENS} ${EYE.y - 1}"/>
    <path d="M${ex[0] - LENS} ${EYE.y - 1} L5 ${EYE.y - 3}"/><path d="M${ex[1] + LENS} ${EYE.y - 1} L95 ${EYE.y - 3}"/>
  </g>
  <path d="M42 53 Q50 60 58 53" stroke="${C.paper}" stroke-width="${INK}" stroke-linecap="round" fill="none"/>`;

const deemo = g(`<path d="${BODY}" fill="${C.dusk}"/>${face}`);
const svg = (viewBox: string, body: string, bg?: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="${viewBox}">${bg ? `<rect x="-10" y="-10" width="200" height="200" fill="${bg}"/>` : ""}${body}</svg>\n`;

// Monochrome (Android 13+ themed icons, used as a mask): Deemo's face in line, glasses, pupils, smile.
const mono = g(`<g stroke="#000" stroke-width="${INK + 0.6}" stroke-linecap="round" fill="none">
  ${ex.map((x) => `<circle cx="${x}" cy="${EYE.y}" r="${LENS}"/>`).join("")}
  <path d="M${ex[0] + LENS} ${EYE.y - 1} Q50 ${EYE.y - 4} ${ex[1] - LENS} ${EYE.y - 1}"/>
  <path d="M42 53 Q50 60 58 53"/></g>
  ${ex.map((x) => `<circle cx="${x}" cy="${EYE.y + 1.5}" r="${EYE.pupil + 0.8}" fill="#000"/>`).join("")}`);

writeFileSync(`${OUT}/android-icon-foreground.svg`, svg("0 0 108 108", deemo));
writeFileSync(`${OUT}/android-icon-background.svg`, svg("0 0 108 108", "", C.paper));
writeFileSync(`${OUT}/android-icon-monochrome.svg`, svg("0 0 108 108", mono));
// The plain icon (iOS, web, stores): the adaptive icon's visible 72 × 72, full bleed.
writeFileSync(`${OUT}/icon.svg`, svg("18 18 72 72", deemo, C.paper));
