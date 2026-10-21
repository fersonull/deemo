// The promo's motion language: iOS-style springs (critically damped, a hint of settle), the sheet easing curve,
// keyframes, curved flight paths and a velocity blur that stands in for motion blur.
import { Easing, interpolate, interpolateColors, spring } from "remotion";
import { FPS } from "./script";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// 0→1 at frame `at`. `ios` for anything that moves into place, `glide` for slow camera-ish drifts.
export const ios = (f: number, at = 0, stiffness = 180) =>
  spring({ frame: f - at, fps: FPS, config: { damping: 26, stiffness, mass: 1 } });
export const glide = (f: number, at = 0) => spring({ frame: f - at, fps: FPS, config: { damping: 30, stiffness: 90, mass: 1 } });

// UIKit's sheet curve, and a symmetric in-out for keyframed paths.
export const ease = Easing.bezier(0.32, 0.72, 0, 1);
export const inOut = Easing.bezier(0.65, 0, 0.35, 1);

// 0→1 eased over [a, b].
export const t = (f: number, a: number, b: number, easing = ease) => interpolate(f, [a, b], [0, 1], { ...clamp, easing });
export const lerp = (p: number, a: number, b: number) => a + (b - a) * p;
export const kf = (f: number, times: number[], values: number[], easing = inOut) => interpolate(f, times, values, { ...clamp, easing });
export const kc = (f: number, times: number[], colors: string[]) => interpolateColors(f, times, colors);

// A point along a quadratic bezier from a through control c to b.
export function curve(p: number, a: [number, number], c: [number, number], b: [number, number]): [number, number] {
  const q = 1 - p;
  return [q * q * a[0] + 2 * q * p * c[0] + p * p * b[0], q * q * a[1] + 2 * q * p * c[1] + p * p * b[1]];
}

// Blur in px from how far `pos` moved since the previous frame: fast flights smear, settled ones are sharp.
export function speedBlur(pos: (f: number) => number[], f: number, k = 0.08, max = 16) {
  const a = pos(f - 1);
  const b = pos(f);
  return Math.min(max, Math.hypot(...b.map((v, i) => v - a[i]!)) * k);
}

