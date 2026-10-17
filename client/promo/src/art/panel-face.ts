// A panelist's face — ported from client/mobile/Deemo/src/components/panel-face/{index.tsx,parts.ts,personas.ts}.
// Same 100×100 geometry and persona data (skin, hair, glasses, clothing). The live app animates mood, blink and voice
// on a Reanimated clock; here it's a static SVG per persona with a CSS idle blink and breath (see base.css /
// .pf-eye, .pf-face — keeps the character without porting the whole live-session engine for a marketing demo).

export const EYES = [43, 57] as const;
export const EYE_Y = 46;
export const BROW_Y = 40;

const SHOULDERS = "M8 100 C10 84 22 77 36 75 L64 75 C78 77 90 84 92 100 Z";
const NECK = "M43 60 L57 60 L57 77 C54 80 46 80 43 77 Z";
const HEAD = "M47 22 L53 22 C62 22 69 29 69 38 L69 52 C69 60 62 66 54 66 L46 66 C38 66 31 60 31 52 L31 38 C31 29 38 22 47 22 Z";
const BEARD = "M32 49 C32 65 41 73 50 73 C59 73 68 65 68 49 C65 59 59 63 50 63 C41 63 35 59 32 49 Z";
const MUSTACHE = "M42.5 54.6 C45 52 55 52 57.5 54.6 C55 55.6 45 55.6 42.5 54.6 Z";
const GLASSES = [
  "M37.5 42 L48 42 Q49.5 42 49.5 43.5 L49.5 48.5 Q49.5 50 48 50 L39 50 Q37.5 50 37.5 48.5 Z",
  "M50.5 43.5 Q50.5 42 52 42 L62.5 42 L62.5 48.5 Q62.5 50 61 50 L52 50 Q50.5 50 50.5 48.5 Z",
];

type HairStyle = "bun" | "sidePart" | "short";
type TopStyle = "blazer" | "polo" | "cardigan";

function hairPaths(style: HairStyle): string[] {
  if (style === "bun")
    return [
      "M31 45 C30 27 39 20 50 20 C61 20 70 27 69 45 C67 34 60 29 50 29 C40 29 33 34 31 45 Z",
      "M50 8 C55 8 58 12 58 16 C58 20 55 23 50 23 C45 23 42 20 42 16 C42 12 45 8 50 8 Z",
    ];
  if (style === "sidePart")
    return ["M30 43 C28 25 39 17 52 17 C64 17 72 25 70 41 C67 31 60 27 53 30 C47 25 38 28 33 36 L30 43 Z"];
  return ["M31 41 C31 26 39 20 50 20 C61 20 69 26 69 41 C65 32 58 28 50 28 C42 28 35 32 31 41 Z"];
}

function topPaths(style: TopStyle): { inner: string[]; trim: string[] } {
  if (style === "blazer")
    return { inner: ["M42 75 L50 89 L58 75 Z"], trim: ["M37 75.5 L50 93 L45 100 L33 100 L33 80 Z", "M63 75.5 L50 93 L55 100 L67 100 L67 80 Z"] };
  if (style === "polo")
    return { inner: ["M41 75 L50 83 L46 87 L38 78 Z", "M59 75 L50 83 L54 87 L62 78 Z"], trim: ["M49 83 L51 83 L51 95 L49 95 Z"] };
  return { inner: ["M40 75 L50 96 L60 75 Z"], trim: ["M44.5 88 a1.4 1.4 0 1 0 0.01 0 Z", "M47.5 95 a1.4 1.4 0 1 0 0.01 0 Z"] };
}

// A relaxed, closed-to-slightly-open mouth; a small positive smile reads as attentive, not blank.
function mouthPath(smile: number) {
  const half = 5 + smile * 0.8;
  const corner = 58 - smile * 1.6;
  const top = 58 + smile * 0.6;
  const bottom = 58 + 1.3 + Math.max(0, smile) * 2.4;
  return `M${50 - half} ${corner} Q50 ${top} ${50 + half} ${corner} Q50 ${bottom} ${50 - half} ${corner} Z`;
}

function browPath(x: number, lift: number, tilt: number) {
  const y = BROW_Y + lift;
  return `M${x - 4} ${y + tilt} L${x + 4} ${y - tilt}`;
}

export type Persona = {
  circle: string;
  skin: string;
  skinShade: string;
  hair: string;
  hairStyle: HairStyle;
  glasses: boolean;
  beard: boolean;
  top: { cloth: string; inner: string; style: TopStyle };
  smile: number; // this persona's resting expression (Reyes attentive, Santos keen, Cruz measured)
};

// Fills from client/mobile/Deemo/src/theme.ts panelist.{chair,technical,methodology} and colors.ts; same three
// personas, same order, as server/src/modules/practice/domain/panel.ts PERSONAS.
const SKIN = { light: "#EDC39B", lightShade: "#D9A77C", mid: "#C99168", midShade: "#AE7650", deep: "#A9714A", deepShade: "#8C5937" };
const HAIR = { gray: "#77706A", black: "#2A2321", brown: "#3B2A22" };
const INK = "#2A2420";
const PAPER = "#F7F3EC";
const MOUTH = "#5A3329";

export const PANEL_FACES: Persona[] = [
  {
    circle: "#E4D9C6",
    skin: SKIN.light,
    skinShade: SKIN.lightShade,
    hair: HAIR.gray,
    hairStyle: "bun",
    glasses: true,
    beard: false,
    top: { cloth: "#343996", inner: PAPER, style: "blazer" },
    smile: 0.4,
  },
  {
    circle: "#CFD6F3",
    skin: SKIN.mid,
    skinShade: SKIN.midShade,
    hair: HAIR.black,
    hairStyle: "sidePart",
    glasses: false,
    beard: false,
    top: { cloth: "#2A7449", inner: "#CBEFD6", style: "polo" },
    smile: 0.15,
  },
  {
    circle: "#BEE2C9",
    skin: SKIN.deep,
    skinShade: SKIN.deepShade,
    hair: HAIR.brown,
    hairStyle: "short",
    glasses: false,
    beard: true,
    top: { cloth: "#6C4302", inner: "#DCE3FF", style: "cardigan" },
    smile: -0.1,
  },
];

export function panelFaceSVG(persona: number): string {
  const p = PANEL_FACES[persona % PANEL_FACES.length]!;
  const top = topPaths(p.top.style);
  const mouth = mouthPath(p.smile);
  const leftBrow = browPath(EYES[0], 0, 0.4);
  const rightBrow = browPath(EYES[1], 0, -0.4);
  const clip = `pf-clip-${persona}`;

  return `<svg viewBox="0 0 100 100" role="img" aria-hidden="true">
    <defs><clipPath id="${clip}"><circle cx="50" cy="50" r="50"/></clipPath></defs>
    <g clip-path="url(#${clip})">
      <circle cx="50" cy="50" r="50" fill="${p.circle}"/>
      <g transform="translate(50 64) scale(1.14) translate(-50 -64)">
        <path d="${SHOULDERS}" fill="${p.top.cloth}"/>
        ${top.inner.map((d) => `<path d="${d}" fill="${p.top.inner}"/>`).join("")}
        <path d="${NECK}" fill="${p.skinShade}"/>
        ${top.trim.map((d) => `<path d="${d}" fill="${p.top.style === "polo" ? p.top.inner : PAPER}" opacity="${p.top.style === "blazer" ? 0.14 : 0.9}"/>`).join("")}
        <g class="pf-head">
          <circle cx="31" cy="48" r="4.2" fill="${p.skinShade}"/>
          <circle cx="69" cy="48" r="4.2" fill="${p.skinShade}"/>
          <path d="${HEAD}" fill="${p.skin}"/>
          ${p.beard ? `<path d="${BEARD}" fill="${p.hair}"/>` : ""}
          ${hairPaths(p.hairStyle).map((d) => `<path d="${d}" fill="${p.hair}"/>`).join("")}
          <ellipse cx="50" cy="52.5" rx="2.2" ry="1.6" fill="${p.skinShade}"/>
          <ellipse class="pf-eye" cx="${EYES[0]}" cy="${EYE_Y}" rx="2.3" ry="2.6" fill="${INK}"/>
          <ellipse class="pf-eye" cx="${EYES[1]}" cy="${EYE_Y}" rx="2.3" ry="2.6" fill="${INK}"/>
          <path d="${leftBrow}" stroke="${p.hair}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
          <path d="${rightBrow}" stroke="${p.hair}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
          ${p.glasses ? GLASSES.map((d) => `<path d="${d}" stroke="${INK}" stroke-width="1.3" fill="${PAPER}" fill-opacity="0.12"/>`).join("") : ""}
          ${p.glasses ? `<path d="M49.5 45 L50.5 45" stroke="${INK}" stroke-width="1.3"/>` : ""}
          ${p.beard ? `<path d="${MUSTACHE}" fill="${p.hair}"/>` : ""}
          <path d="${mouth}" fill="${MOUTH}"/>
        </g>
      </g>
    </g>
  </svg>`;
}
