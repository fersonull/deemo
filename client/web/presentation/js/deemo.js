// Deemo, the app's owl, as the deck's narrator: a plain-SVG port of the app component
// (client/mobile/Deemo/src/components/deemo/index.tsx), same geometry and moods, drawn statically.
// Blinking and the wave run in CSS; GSAP hops Deemo between moods.

const c = {
  paper: "#F7F3EC", ink: "#2A2420", inkSoft: "#3E3731", dusk: "#5A66C7", duskIcon: "#4D57B7",
  duskInk: "#343996", duskTint: "#DCE3FF", amber: "#EBB353", amberInk: "#6C4302", clayTint: "#F5DDD3",
};
const BODY = "M200 112 C292 112 322 170 318 232 C314 300 268 344 200 344 C132 344 86 300 82 232 C78 170 108 112 200 112 Z";
const FACE = "M200 170 C178 144 116 144 112 200 C108 250 160 268 200 248 C240 268 292 250 288 200 C284 144 222 144 200 170 Z";
const WING = {
  l: { d: "M96 236 C70 252 64 292 82 308 C100 300 112 278 112 254 Z", o: [102, 246], f: "M90 268 Q86 284 90 298" },
  r: { d: "M304 236 C330 252 336 292 318 308 C300 300 288 278 288 254 Z", o: [298, 246], f: "M310 268 Q314 284 310 298" },
};
const EYES = [160, 240];
const EYE_Y = 204;
const EYE_R = 32;
const LINE = 6;
const ink = `stroke="${c.duskInk}" stroke-linecap="round" stroke-linejoin="round"`;
export const VIEWBOX = "28 26 344 364";

function wing(side, angle = 0, dx = 0, dy = 0) {
  const { d, o, f } = WING[side];
  return `<g transform="translate(${dx} ${dy}) rotate(${angle} ${o[0]} ${o[1]})">
    <path d="${d}" fill="${c.duskIcon}" stroke-width="${LINE}" ${ink}/>
    <path d="${f}" fill="none" stroke="${c.duskInk}" stroke-opacity=".4" stroke-width="3.5" stroke-linecap="round"/></g>`;
}

function eyes(mood) {
  if (mood === "cheering") return EYES.map((x) => `<path d="M${x - 22} 212 Q${x} 184 ${x + 22} 212" fill="none" stroke-width="7" ${ink}/>`).join("");
  const pupil = mood === "nervous" ? 10 : 17;
  const down = mood === "reading" ? 9 : 2;
  return EYES.map((x, i) => {
    const px = x + (mood === "reading" ? 0 : i ? -3 : 3);
    const py = EYE_Y + down;
    return `<g class="deemo-eye">
      <ellipse cx="${x}" cy="${EYE_Y}" rx="${EYE_R}" ry="${EYE_R}" fill="${c.paper}" stroke-width="${LINE - 1}" ${ink}/>
      <circle cx="${px}" cy="${py}" r="${pupil}" fill="${c.duskInk}"/>
      <circle cx="${px + pupil * 0.38}" cy="${py - pupil * 0.42}" r="${pupil * 0.36}" fill="${c.paper}"/>
      <circle cx="${px - pupil * 0.4}" cy="${py + pupil * 0.36}" r="${pupil * 0.15}" fill="${c.paper}"/></g>`;
  }).join("");
}

function beak(mood) {
  const b = `fill="${c.amber}" stroke="${c.amberInk}" stroke-width="3" stroke-linejoin="round"`;
  if (mood === "cheering" || mood === "waving")
    return `<path d="M190 237 Q200 233 210 237 Q206 244 200 246 Q194 244 190 237 Z" ${b}/><path d="M194 248 Q200 258 206 248 Z" fill="${c.amberInk}"/>`;
  if (mood === "nervous")
    return `<path d="M192 238 Q200 234 208 238 Q204 248 200 251 Q196 248 192 238 Z" ${b}/><path d="M186 262 Q191 257 196 262 Q201 267 206 262 Q211 257 214 262" fill="none" stroke-width="3.5" ${ink}/>`;
  return `<path d="M191 238 Q200 233 209 238 Q205 249 200 253 Q195 249 191 238 Z" ${b}/>`;
}

function cap(mood) {
  const tilt = mood === "nervous" ? 4 : -6;
  const drop = mood === "cheering" ? -6 : 0;
  const black = `fill="${c.ink}" stroke="${c.ink}" stroke-width="${LINE}" stroke-linejoin="round"`;
  return `<g transform="translate(0 ${drop}) rotate(${tilt} 200 112)">
    <path d="M148 114 Q200 102 252 114 L248 136 Q200 126 152 136 Z" ${black}/>
    <path d="M200 68 L286 96 L200 124 L114 96 Z" ${black}/>
    <path d="M200 76 L262 96 L200 116 L138 96 Z" fill="${c.inkSoft}"/>
    <path d="M200 96 Q246 94 280 100 L280 134" fill="none" stroke="${c.amber}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="200" cy="96" r="6" fill="${c.amber}" stroke="${c.amberInk}" stroke-width="2.5"/>
    <rect x="273" y="130" width="14" height="22" rx="5" fill="${c.amber}" stroke="${c.amberInk}" stroke-width="3"/></g>`;
}

const feet = () =>
  `<g fill="${c.amber}" stroke="${c.amberInk}" stroke-width="3">${[176, 224]
    .flatMap((x) => [-11, 0, 11].map((d) => `<ellipse cx="${x + d * 0.9}" cy="345" rx="5.5" ry="8" transform="rotate(${d * 1.8} ${x + d * 0.9} 345)"/>`))
    .join("")}</g>`;

const scallops = () =>
  `<g fill="none" stroke="${c.duskIcon}" stroke-opacity=".5" stroke-width="3.5" stroke-linecap="round">${[[180, 288], [200, 288], [220, 288], [190, 306], [210, 306], [200, 324]]
    .map(([x, y]) => `<path d="M${x - 8} ${y} Q${x} ${y + 8} ${x + 8} ${y}"/>`)
    .join("")}</g>`;

function spark(x, y, r) {
  const q = r * 0.15;
  return `<path d="M${x} ${y - r} Q${x + q} ${y - q} ${x + r} ${y} Q${x + q} ${y + q} ${x} ${y + r} Q${x - q} ${y + q} ${x - r} ${y} Q${x - q} ${y - q} ${x} ${y - r}Z"/>`;
}

// moods: idle · waving · cheering · reading · encouraging · nervous
export function deemoSVG(mood = "idle") {
  const tilt = mood === "encouraging" ? -6 : mood === "nervous" ? 3 : 0;
  const lw = { cheering: 128, reading: -38, nervous: -22 }[mood] ?? 0;
  const rw =
    mood === "waving" ? `<g class="deemo-wave">${wing("r", -135, 26, -18)}</g>`
    : mood === "encouraging" ? wing("r", -100, 18, -4)
    : wing("r", { cheering: -128, reading: 38, nervous: 22 }[mood] ?? 0);
  const brows =
    mood === "encouraging"
      ? EYES.map((x) => `<path d="M${x - 20} 160 Q${x} 150 ${x + 20} 160" fill="none" stroke-width="5" ${ink}/>
          <path d="M${x - 30} 222 Q${x} 246 ${x + 30} 222 L${x + 34} 240 L${x - 34} 240 Z" fill="${c.duskTint}"/>
          <path d="M${x - 28} 222 Q${x} 242 ${x + 28} 222" fill="none" stroke-width="${LINE - 1}" ${ink}/>`).join("")
      : "";
  const sweat =
    mood === "nervous"
      ? `<path d="M112 140 Q100 162 104 172 Q110 182 120 176 Q128 168 112 140 Z" fill="${c.duskTint}" stroke="${c.duskIcon}" stroke-width="3.5" stroke-linejoin="round"/>
         <path d="M130 162 Q150 156 170 166 M230 166 Q250 156 270 162" fill="none" stroke-width="5" ${ink}/>`
      : "";
  const paper =
    mood === "reading"
      ? `<g transform="rotate(-4 200 300)"><rect x="146" y="262" width="108" height="72" rx="8" fill="${c.paper}" stroke="#5E554D" stroke-width="3.5"/>
         <path d="M162 282 H238 M162 296 H230 M162 310 H214" stroke="#CFD6F3" stroke-width="5" stroke-linecap="round"/></g>`
      : "";
  const sparks = mood === "cheering" ? `<g fill="${c.amber}">${spark(70, 120, 14)}${spark(334, 104, 11)}${spark(352, 160, 8)}</g>` : "";

  return `<svg viewBox="${VIEWBOX}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    ${feet()}
    <g transform="rotate(${tilt} 200 230)">
      <path d="${BODY}" fill="${c.dusk}"/>
      <ellipse cx="200" cy="298" rx="68" ry="42" fill="${c.paper}"/>
      ${mood === "reading" ? "" : scallops()}
      <path d="${BODY}" fill="none" stroke-width="${LINE}" ${ink}/>
      <path d="${FACE}" fill="${c.duskTint}"/>
      <ellipse cx="116" cy="246" rx="15" ry="8.5" fill="${c.clayTint}" opacity=".9"/>
      <ellipse cx="284" cy="246" rx="15" ry="8.5" fill="${c.clayTint}" opacity=".9"/>
      ${eyes(mood)}${brows}${beak(mood)}${sweat}${paper}
      ${wing("l", lw)}${rw}${cap(mood)}
    </g>${sparks}</svg>`;
}

// Mounts the narrator; say(mood, line) hops Deemo into the new mood and swaps the speech bubble.
export function createDeemo(root) {
  const figure = root.querySelector(".deemo__owl");
  const bubble = root.querySelector(".deemo__say");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let mood = null;
  let tl = null;

  return function say(nextMood = "idle", line = "") {
    tl?.progress(1);
    const swap = () => {
      if (nextMood !== mood) figure.innerHTML = deemoSVG(nextMood);
      mood = nextMood;
      bubble.textContent = line;
      root.toggleAttribute("data-quiet", !line);
    };
    if (reduced.matches || mood === null) {
      swap();
      if (!reduced.matches) gsap.from(root, { y: 60, autoAlpha: 0, duration: 0.8, ease: "back.out(1.6)", delay: 0.5 });
      return;
    }
    tl = gsap.timeline()
      .to(bubble, { autoAlpha: 0, x: -10, duration: 0.18, ease: "power2.in" }, 0)
      .to(figure, { y: 14, scaleY: 0.9, duration: 0.14, ease: "power2.in" }, 0)
      .add(swap)
      .to(figure, { y: -26, scaleY: 1.06, duration: 0.22, ease: "power2.out" })
      .to(figure, { y: 0, scaleY: 1, duration: 0.42, ease: "bounce.out" })
      .fromTo(bubble, { autoAlpha: 0, x: -14 }, { autoAlpha: 1, x: 0, duration: 0.45, ease: "expo.out" }, "<0.05");
  };
}
