// Shared look and motion for the promo: the app's tokens (client/mobile/Deemo/src/colors.ts), its three fonts, and
// small frame-driven helpers every scene uses.
import { Audio } from "@remotion/media";
import { loadFont as loadBricolage } from "@remotion/google-fonts/BricolageGrotesque";
import { loadFont as loadDMMono } from "@remotion/google-fonts/DMMono";
import { loadFont as loadDMSans } from "@remotion/google-fonts/DMSans";
import type React from "react";
import { Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { deemoSVG, type DeemoMood } from "./art/deemo";
import { panelFaceSVG } from "./art/panel-face";
import { hasSfx, hasVoice, VO_DELAY, type Line, type Sfx as SfxId } from "./script";

export const C = {
  paper: "#F7F3EC",
  sand: "#EDE5D8",
  banner: "#F1E6D6",
  ink: "#2A2420",
  inkSoft: "#3E3731",
  inkMuted: "#5E554D",
  muted: "#8A7F74",
  faint: "#B0A698",
  border: "rgba(42, 36, 32, 0.12)",
  dusk: "#5A66C7",
  duskInk: "#343996",
  duskTint: "#DCE3FF",
  duskSoft: "#CFD6F3",
  amber: "#EBB353",
  amberInk: "#6C4302",
  amberTint: "#F7E1C0",
  sage: "#4A9266",
  sageInk: "#2A7449",
  sageTint: "#CBEFD6",
  chair: "#E4D9C6",
};

export const F = {
  display: loadBricolage("normal", { weights: ["600", "700", "800"], subsets: ["latin"] }).fontFamily,
  body: loadDMSans("normal", { weights: ["400", "500", "700"], subsets: ["latin"] }).fontFamily,
  mono: loadDMMono("normal", { weights: ["500"], subsets: ["latin"] }).fontFamily,
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

// 0→1 springing in at frame `at` (slight overshoot, like the app's bouncy entrances).
export const popAt = (frame: number, fps: number, at: number, damping = 12) =>
  spring({ frame: frame - at, fps, config: { damping, stiffness: 160, mass: 0.7 } });
export function usePop(at: number, damping = 12) {
  return popAt(useCurrentFrame(), useVideoConfig().fps, at, damping);
}

// 0→1 eased over [from, to].
export const tAt = (frame: number, from: number, to: number, easing = easeOut) =>
  interpolate(frame, [from, to], [0, 1], { ...clamp, easing });
export function useT(from: number, to: number, easing = easeOut) {
  return tAt(useCurrentFrame(), from, to, easing);
}

export const lerp = (t: number, a: number, b: number) => a + (b - a) * t;

// One scene's voiceover, starting VO_DELAY frames in. Silent until `bun run audio` has made the file.
export const Voice: React.FC<{ line: Line }> = ({ line }) =>
  hasVoice(line) ? <Audio name={`VO ${line}`} from={VO_DELAY} src={staticFile(`audio/vo-${line}.mp3`)} /> : null;

export const Sfx: React.FC<{ id: SfxId; at: number; volume?: number }> = ({ id, at, volume = 0.6 }) =>
  hasSfx(id) ? <Audio name={`SFX ${id}`} from={Math.round(at)} volume={volume} src={staticFile(`audio/sfx-${id}.mp3`)} /> : null;

export const Owl: React.FC<{ mood?: DeemoMood; size: number; style?: React.CSSProperties }> = ({ mood = "idle", size, style }) => (
  <div style={{ width: size, height: size * (364 / 344), ...style }} dangerouslySetInnerHTML={{ __html: deemoSVG(mood) }} />
);

export const Face: React.FC<{ persona: number; size: number; style?: React.CSSProperties }> = ({ persona, size, style }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", ...style }} dangerouslySetInnerHTML={{ __html: panelFaceSVG(persona) }} />
);

export const Kicker: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({ children, color = C.muted, style }) => (
  <div style={{ fontFamily: F.mono, fontSize: 26, letterSpacing: 4, textTransform: "uppercase", color, ...style }}>{children}</div>
);

// Material-style glyphs drawn inline (the icon font isn't on Google Fonts' static API).
const ICONS = {
  check: "M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z",
  warning: "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
  mic: "M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z",
  upload: "M5 20h14v-2H5v2zm0-10h4v6h6v-6h4l-7-7-7 7z",
  doc: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
};
export const Icon: React.FC<{ name: keyof typeof ICONS; size: number; color: string }> = ({ name, size, color }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill={color} style={{ flexShrink: 0 }}>
    <path d={ICONS[name]} />
  </svg>
);
