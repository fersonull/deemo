import type { Persona } from "./personas";

// Path data for the busts, on a 100×100 canvas: head 31–69 × 22–66, eyes at (43, 46) and (57, 46), mouth at (50, 58).

export const EYES = [43, 57] as const;
export const EYE_Y = 46;
export const BROW_Y = 40;

export const SHOULDERS = "M8 100 C10 84 22 77 36 75 L64 75 C78 77 90 84 92 100 Z";
export const NECK = "M43 60 L57 60 L57 77 C54 80 46 80 43 77 Z";
export const HEAD = "M47 22 L53 22 C62 22 69 29 69 38 L69 52 C69 60 62 66 54 66 L46 66 C38 66 31 60 31 52 L31 38 C31 29 38 22 47 22 Z";

export function hairPaths(style: Persona["hairStyle"]): string[] {
  if (style === "bun")
    return [
      "M31 45 C30 27 39 20 50 20 C61 20 70 27 69 45 C67 34 60 29 50 29 C40 29 33 34 31 45 Z",
      "M50 8 C55 8 58 12 58 16 C58 20 55 23 50 23 C45 23 42 20 42 16 C42 12 45 8 50 8 Z", // the bun
    ];
  if (style === "sidePart")
    return ["M30 43 C28 25 39 17 52 17 C64 17 72 25 70 41 C67 31 60 27 53 30 C47 25 38 28 33 36 L30 43 Z"];
  return ["M31 41 C31 26 39 20 50 20 C61 20 69 26 69 41 C65 32 58 28 50 28 C42 28 35 32 31 41 Z"];
}

export const BEARD = "M32 49 C32 65 41 73 50 73 C59 73 68 65 68 49 C65 59 59 63 50 63 C41 63 35 59 32 49 Z";
export const MUSTACHE = "M42.5 54.6 C45 52 55 52 57.5 54.6 C55 55.6 45 55.6 42.5 54.6 Z";

// Collars and fronts by style, drawn over the shoulders.
export function topPaths(style: Persona["top"]["style"]): { inner: string[]; trim: string[] } {
  if (style === "blazer")
    return {
      inner: ["M42 75 L50 89 L58 75 Z"],
      trim: ["M37 75.5 L50 93 L45 100 L33 100 L33 80 Z", "M63 75.5 L50 93 L55 100 L67 100 L67 80 Z"],
    };
  if (style === "polo")
    return {
      inner: ["M41 75 L50 83 L46 87 L38 78 Z", "M59 75 L50 83 L54 87 L62 78 Z"],
      trim: ["M49 83 L51 83 L51 95 L49 95 Z"],
    };
  return {
    inner: ["M40 75 L50 96 L60 75 Z"],
    trim: ["M44.5 88 a1.4 1.4 0 1 0 0.01 0 Z", "M47.5 95 a1.4 1.4 0 1 0 0.01 0 Z"],
  };
}

// Glasses frames around both eyes and the bridge.
export const GLASSES = [
  "M37.5 42 L48 42 Q49.5 42 49.5 43.5 L49.5 48.5 Q49.5 50 48 50 L39 50 Q37.5 50 37.5 48.5 Z",
  "M50.5 43.5 Q50.5 42 52 42 L62.5 42 L62.5 48.5 Q62.5 50 61 50 L52 50 Q50.5 50 50.5 48.5 Z",
];

// The mouth from three numbers: open (0 shut … 1 wide), smile (-1 down … 1 up) and narrow (0 … 1, a pursed "hmm").
// One closed shape whose lower lip drops as it opens, so a closed mouth reads as a curved line, not a dot.
export function mouthPath(open: number, smile: number, narrow: number) {
  "worklet";
  const half = (5 + open * 1.2 + smile * 0.8) * (1 - narrow * 0.4);
  const corner = 58 - smile * 1.6;
  const top = 58 - open * 1.4 + smile * 0.6;
  const bottom = 58 + 1.3 + open * 9 + Math.max(0, smile) * 2.4;
  return `M${50 - half} ${corner} Q50 ${top} ${50 + half} ${corner} Q50 ${bottom} ${50 - half} ${corner} Z`;
}

// An eyebrow: a short stroke above an eye, raised by `lift` (negative is up) and tilted by `tilt`.
export function browPath(x: number, lift: number, tilt: number) {
  "worklet";
  const y = BROW_Y + lift;
  return `M${x - 4} ${y + tilt} L${x + 4} ${y - tilt}`;
}
