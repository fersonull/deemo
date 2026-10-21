// A panelist, drawn in code: a frame-driven port of the app's flat bust (client/mobile/Deemo/src/components/
// panel-face/{index.tsx,parts.ts,personas.ts}). The path data is copied, not imported: parts.ts type-imports
// personas.ts, which needs the app's `@/theme` alias. Keep both in step with the app.
import type React from "react";
import { C } from "../ui";

const EYES = [43, 57] as const;
const EYE_Y = 46;
const BROW_Y = 40;
const SHOULDERS = "M8 100 C10 84 22 77 36 75 L64 75 C78 77 90 84 92 100 Z";
const NECK = "M43 60 L57 60 L57 77 C54 80 46 80 43 77 Z";
const HEAD = "M47 22 L53 22 C62 22 69 29 69 38 L69 52 C69 60 62 66 54 66 L46 66 C38 66 31 60 31 52 L31 38 C31 29 38 22 47 22 Z";
const BEARD = "M32 49 C32 65 41 73 50 73 C59 73 68 65 68 49 C65 59 59 63 50 63 C41 63 35 59 32 49 Z";
const MUSTACHE = "M42.5 54.6 C45 52 55 52 57.5 54.6 C55 55.6 45 55.6 42.5 54.6 Z";
const GLASSES = [
  "M37.5 42 L48 42 Q49.5 42 49.5 43.5 L49.5 48.5 Q49.5 50 48 50 L39 50 Q37.5 50 37.5 48.5 Z",
  "M50.5 43.5 Q50.5 42 52 42 L62.5 42 L62.5 48.5 Q62.5 50 61 50 L52 50 Q50.5 50 50.5 48.5 Z",
];
const HAIR = {
  bun: [
    "M31 45 C30 27 39 20 50 20 C61 20 70 27 69 45 C67 34 60 29 50 29 C40 29 33 34 31 45 Z",
    "M50 8 C55 8 58 12 58 16 C58 20 55 23 50 23 C45 23 42 20 42 16 C42 12 45 8 50 8 Z",
  ],
  sidePart: ["M30 43 C28 25 39 17 52 17 C64 17 72 25 70 41 C67 31 60 27 53 30 C47 25 38 28 33 36 L30 43 Z"],
  short: ["M31 41 C31 26 39 20 50 20 C61 20 69 26 69 41 C65 32 58 28 50 28 C42 28 35 32 31 41 Z"],
};
const TOP = {
  blazer: { inner: ["M42 75 L50 89 L58 75 Z"], trim: ["M37 75.5 L50 93 L45 100 L33 100 L33 80 Z", "M63 75.5 L50 93 L55 100 L67 100 L67 80 Z"] },
  polo: { inner: ["M41 75 L50 83 L46 87 L38 78 Z", "M59 75 L50 83 L54 87 L62 78 Z"], trim: ["M49 83 L51 83 L51 95 L49 95 Z"] },
  cardigan: { inner: ["M40 75 L50 96 L60 75 Z"], trim: ["M44.5 88 a1.4 1.4 0 1 0 0.01 0 Z", "M47.5 95 a1.4 1.4 0 1 0 0.01 0 Z"] },
};

// Dr. Reyes (Chair), Santos (field expert), Prof. Cruz (Methodology): the app's PERSONAS, in persona order.
const PERSONAS = [
  { circle: "#E4D9C6", skin: "#EDC39B", shade: "#D9A77C", hair: "#77706A", hairStyle: "bun", glasses: true, beard: false, cloth: C.duskInk, inner: C.paper, top: "blazer" },
  { circle: C.duskSoft, skin: "#C99168", shade: "#AE7650", hair: "#2A2321", hairStyle: "sidePart", glasses: false, beard: false, cloth: C.sageInk, inner: C.sageTint, top: "polo" },
  { circle: "#BEE2C9", skin: "#A9714A", shade: "#8C5937", hair: "#3B2A22", hairStyle: "short", glasses: false, beard: true, cloth: C.amberInk, inner: C.duskTint, top: "cardigan" },
] as const;

// The app's mouthPath: open 0…1, smile -1…1.
function mouth(open: number, smile: number) {
  const half = 5 + open * 1.2 + smile * 0.8;
  const corner = 58 - smile * 1.6;
  const top = 58 - open * 1.4 + smile * 0.6;
  const bottom = 58 + 1.3 + open * 9 + Math.max(0, smile) * 2.4;
  return `M${50 - half} ${corner} Q50 ${top} ${50 + half} ${corner} Q50 ${bottom} ${50 - half} ${corner} Z`;
}
const brow = (x: number, lift: number, tilt: number) => `M${x - 4} ${BROW_Y + lift + tilt} L${x + 4} ${BROW_Y + lift - tilt}`;

type Props = {
  persona: number;
  size: number;
  speak?: number; // 0…1 mouth open
  lid?: number; // 1 open … 0 shut
  skeptical?: number; // 0…1: one brow up, a flat mouth (the contradiction)
  style?: React.CSSProperties;
};

export const PanelFace: React.FC<Props> = ({ persona, size, speak = 0, lid = 1, skeptical = 0, style }) => {
  const p = PERSONAS[persona]!;
  const top = TOP[p.top];
  const id = `face${persona}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ flexShrink: 0, ...style }}>
      <defs>
        <clipPath id={id}>
          <circle cx={50} cy={50} r={50} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <circle cx={50} cy={50} r={50} fill={p.circle} />
        <g transform="translate(50 64) scale(1.14) translate(-50 -64)">
          <path d={SHOULDERS} fill={p.cloth} />
          {top.inner.map((d) => (
            <path key={d} d={d} fill={p.inner} />
          ))}
          <path d={NECK} fill={p.shade} />
          {top.trim.map((d) => (
            <path key={d} d={d} fill={p.top === "polo" ? p.inner : C.paper} opacity={p.top === "blazer" ? 0.14 : 0.9} />
          ))}
          <circle cx={31} cy={48} r={4.2} fill={p.shade} />
          <circle cx={69} cy={48} r={4.2} fill={p.shade} />
          <path d={HEAD} fill={p.skin} />
          {p.beard ? <path d={BEARD} fill={p.hair} /> : null}
          {HAIR[p.hairStyle].map((d) => (
            <path key={d} d={d} fill={p.hair} />
          ))}
          <ellipse cx={50} cy={52.5} rx={2.2} ry={1.6} fill={p.shade} />
          {EYES.map((x) => (
            <ellipse key={x} cx={x} cy={EYE_Y} rx={2.3} ry={2.6 * Math.max(0.12, lid)} fill={C.ink} />
          ))}
          <path d={brow(EYES[0], -skeptical * 3, skeptical * 1.2)} stroke={p.hair} strokeWidth={2.2} strokeLinecap="round" />
          <path d={brow(EYES[1], 0, -skeptical * 0.8)} stroke={p.hair} strokeWidth={2.2} strokeLinecap="round" />
          {p.glasses ? GLASSES.map((d) => <path key={d} d={d} stroke={C.ink} strokeWidth={1.3} fill={C.paper} fillOpacity={0.12} />) : null}
          {p.glasses ? <path d="M49.5 45 L50.5 45" stroke={C.ink} strokeWidth={1.3} /> : null}
          {p.beard ? <path d={MUSTACHE} fill={p.hair} /> : null}
          <path d={mouth(speak, 0.35 - skeptical * 0.6)} fill="#5A3329" />
        </g>
      </g>
    </svg>
  );
};

// A natural blink at a few fixed moments: lid for frame f (seeded per face so they don't blink together).
export const blinkAt = (f: number, seed = 0) => {
  const m = (f + seed * 53) % 230;
  return m < 5 ? 1 - m / 5 : m < 10 ? (m - 5) / 5 : 1;
};
