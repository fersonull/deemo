// Builds Deemo's app icon SVGs from the owl's own geometry (src/components/deemo/index.tsx): a big close-up of the
// owl's face filling the icon, its black cap tipped on top, soft shading, on a light dusk background. Run
// `bun assets/icon-src/make-icons.ts assets/icon-src`, then render each SVG to a 1024 px PNG in assets/images (any SVG
// renderer; we used headless Chrome with a transparent background), and rebuild the app.
import { writeFileSync } from "fs";
const OUT = process.argv[2];
const C = {
  paper: "#F7F3EC", ink: "#2A2420", inkSoft: "#3E3731", dusk: "#5A66C7", duskIcon: "#4D57B7", duskInk: "#343996",
  duskTint: "#DCE3FF", duskSoft: "#CFD6F3", amber: "#EBB353", amberInk: "#6C4302", clayTint: "#F5DDD3",
};
const BODY = "M200 112 C292 112 322 170 318 232 C314 300 268 344 200 344 C132 344 86 300 82 232 C78 170 108 112 200 112 Z";
const FACE = "M200 170 C178 144 116 144 112 200 C108 250 160 268 200 248 C240 268 292 250 288 200 C284 144 222 144 200 170 Z";
const BEAK = "M190 240 Q200 234 210 240 Q206 252 200 257 Q194 252 190 240 Z";
const EYES = [160, 240];

// Adaptive icon canvas: 108 × 108 (dp); 72 visible (18–90); 66 safe circle at the center. The owl is scaled up so its
// face fills the icon: the body runs off the sides and bottom, the cap tips over the top of the head.
const S = 0.3;
const g = (inner: string) => `<g transform="translate(54 62) scale(${S}) translate(-200 -204)">${inner}</g>`;

const defs = `<defs>
  <radialGradient id="bg" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="${C.duskTint}"/><stop offset="1" stop-color="${C.duskSoft}"/></radialGradient>
  <radialGradient id="body" cx="42%" cy="30%" r="75%"><stop offset="0" stop-color="#6E79D3"/><stop offset="0.55" stop-color="${C.dusk}"/><stop offset="1" stop-color="${C.duskIcon}"/></radialGradient>
  <radialGradient id="face" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="#EEF1FF"/><stop offset="1" stop-color="${C.duskTint}"/></radialGradient>
  <radialGradient id="eye" cx="45%" cy="38%" r="65%"><stop offset="0.6" stop-color="#FFFFFF"/><stop offset="1" stop-color="${C.paper}"/></radialGradient>
  <linearGradient id="cap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.inkSoft}"/><stop offset="1" stop-color="${C.ink}"/></linearGradient>
  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>
</defs>`;

const eye = (x: number, i: number) => {
  const px = x + (i ? -4 : 4);
  return `<g transform="translate(${x} 204) scale(1.18) translate(${-x} -204)">
    <circle cx="${x}" cy="209" r="38" fill="${C.duskIcon}" opacity="0.35" filter="url(#soft)"/>
    <circle cx="${x}" cy="204" r="36" fill="${C.dusk}"/>
    <circle cx="${x}" cy="204" r="30" fill="url(#eye)"/>
    <circle cx="${px}" cy="207" r="17" fill="${C.duskInk}"/>
    <circle cx="${px + 6.5}" cy="199.5" r="6.4" fill="#FFFFFF"/>
    <circle cx="${px - 6.8}" cy="213.4" r="2.8" fill="#FFFFFF"/>
  </g>`;
};

const cap = `<g transform="translate(-4 10) rotate(-10 200 112) translate(200 112) scale(0.92) translate(-200 -112)">
  <ellipse cx="200" cy="140" rx="70" ry="10" fill="${C.duskInk}" opacity="0.35" filter="url(#soft)"/>
  <path d="M146 112 Q200 98 254 112 L250 138 Q200 126 150 138 Z" fill="${C.ink}"/>
  <path d="M200 60 L296 92 L200 124 L104 92 Z" fill="url(#cap)"/>
  <path d="M200 70 L268 92 L200 114 L132 92 Z" fill="${C.inkSoft}" opacity="0.6"/>
  <path d="M200 92 Q252 90 288 96 L290 132" fill="none" stroke="${C.amber}" stroke-width="5" stroke-linecap="round"/>
  <circle cx="200" cy="92" r="7" fill="${C.amber}"/>
  <circle cx="290" cy="136" r="9" fill="${C.amber}"/>
</g>`;

const owl = g(`
  <path d="${BODY}" fill="url(#body)"/>
  <path d="${FACE}" fill="url(#face)"/>
  <ellipse cx="118" cy="250" rx="17" ry="9.5" fill="${C.clayTint}" opacity="0.95"/>
  <ellipse cx="282" cy="250" rx="17" ry="9.5" fill="${C.clayTint}" opacity="0.95"/>
  ${EYES.map(eye).join("")}
  <path d="${BEAK}" fill="${C.amber}"/>
  <path d="M193 243 Q200 240 207 243" fill="none" stroke="#F6DC86" stroke-width="2.5" stroke-linecap="round"/>
  ${cap}`);

const bg = `<rect x="-10" y="-10" width="200" height="200" fill="url(#bg)"/>`;
const svg = (viewBox: string, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="${viewBox}">${defs}${body}</svg>\n`;

// Monochrome (Android 13+ themed icons, used as a mask): cap, eyes and beak as shapes.
const mono = g(`<g fill="#000">
  ${EYES.map((x, i) => `<g transform="translate(${x} 204) scale(1.18) translate(${-x} -204)"><path fill-rule="evenodd" d="M${x - 36} 204 a36 36 0 1 0 72 0 a36 36 0 1 0 -72 0 Z M${x - 28} 204 a28 28 0 1 1 56 0 a28 28 0 1 1 -56 0 Z"/><circle cx="${x + (i ? -4 : 4)}" cy="207" r="17"/></g>`).join("")}
  <path d="${BEAK}"/>
  <g transform="translate(-4 10) rotate(-10 200 112) translate(200 112) scale(0.92) translate(-200 -112)"><path d="M200 60 L296 92 L200 124 L104 92 Z"/><path d="M146 112 Q200 98 254 112 L250 138 Q200 126 150 138 Z"/><path d="M286 96 h8 v40 h-8 Z"/></g>
</g>`);

writeFileSync(`${OUT}/android-icon-foreground.svg`, svg("0 0 108 108", owl));
writeFileSync(`${OUT}/android-icon-background.svg`, svg("0 0 108 108", bg));
writeFileSync(`${OUT}/android-icon-monochrome.svg`, svg("0 0 108 108", mono));
// The plain icon (iOS, web, stores): the adaptive icon's visible 72 × 72, full bleed.
writeFileSync(`${OUT}/icon.svg`, svg("18 18 72 72", bg + owl));
// Splash: the icon as a rounded square on paper.
writeFileSync(
  `${OUT}/splash-icon.svg`,
  svg("18 18 72 72", `<clipPath id="sq"><rect x="18" y="18" width="72" height="72" rx="16"/></clipPath><g clip-path="url(#sq)">${bg + owl}</g>`),
);
