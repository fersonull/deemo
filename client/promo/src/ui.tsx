// Shared look: the app's design system (tokens, fonts, raised surfaces, the blob), word-by-word text, icons and the
// sound helpers every scene uses.
import { Audio } from "@remotion/media";
import { loadFont as loadBricolage } from "@remotion/google-fonts/BricolageGrotesque";
import { loadFont as loadDMMono } from "@remotion/google-fonts/DMMono";
import { loadFont as loadDMSans } from "@remotion/google-fonts/DMSans";
import type React from "react";
import { staticFile, useCurrentFrame } from "remotion";
import { ios, t } from "./motion";
import { hasSfx, hasVoice, S, VO_LEAD, type Line, type Sfx as SfxId } from "./script";

// client/mobile/Deemo/src/colors.ts — keep in step.
export const C = {
  paper: "#F7F3EC",
  sand: "#EDE5D8",
  ink: "#2A2420",
  inkSoft: "#3E3731",
  inkDepth: "#191613",
  sandDepth: "#C8BDAE",
  inkMuted: "#5E554D",
  muted: "#8A7F74",
  faint: "#B0A698",
  border: "rgba(42,36,32,0.12)",
  dusk: "#5A66C7",
  duskIcon: "#4D57B7",
  duskInk: "#343996",
  duskTint: "#DCE3FF",
  duskSoft: "#CFD6F3",
  amber: "#EBB353",
  amberInk: "#6C4302",
  amberTint: "#F7E1C0",
  sage: "#4A9266",
  sageInk: "#2A7449",
  sageTint: "#CBEFD6",
  clayTint: "#F5DDD3",
};

export const F = {
  display: loadBricolage("normal", { weights: ["600", "700", "800"], subsets: ["latin"] }).fontFamily,
  body: loadDMSans("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] }).fontFamily,
  mono: loadDMMono("normal", { weights: ["500"], subsets: ["latin"] }).fontFamily,
};

// The app's raised surfaces: a face on a solid lower layer (like its buttons) plus a soft warm shadow.
const KINDS = {
  paper: { bg: "#FFFCF7", depth: C.sandDepth, ink: C.ink },
  sand: { bg: C.sand, depth: C.sandDepth, ink: C.ink },
  dusk: { bg: C.dusk, depth: C.duskInk, ink: C.paper },
  ink: { bg: C.ink, depth: C.inkDepth, ink: C.paper },
  amber: { bg: C.amberTint, depth: C.amber, ink: C.amberInk },
};
export function surface(kind: keyof typeof KINDS = "paper", radius = 24, lip = 6): React.CSSProperties {
  const k = KINDS[kind];
  return {
    borderRadius: radius,
    background: k.bg,
    color: k.ink,
    boxShadow: `0 ${lip}px 0 ${k.depth}, 0 ${lip + 20}px 44px -18px rgba(42,36,32,0.38)`,
  };
}

// The app's organic shape (components/blob.tsx: CSS "58% 42% 52% 48% / 55% 50% 50% 45%").
export const BLOB = "58% 42% 52% 48% / 55% 50% 50% 45%";

// Text that arrives one word at a time: rises, sharpens and scales up on a spring; leaves upward the same way
// from `out`. Wrap a word in *asterisks* to colour it dusk (or `accent`).
export const Words: React.FC<{
  text: string;
  at: number;
  out?: number;
  stagger?: number;
  accent?: string;
  style?: React.CSSProperties;
}> = ({ text, at, out, stagger = 3, accent = C.dusk, style }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "inherit", columnGap: "0.26em", ...style }}>
      {text.split(" ").map((raw, i) => {
        const word = raw.replaceAll("*", "");
        const p = ios(f, at + i * stagger, 220);
        const q = out === undefined ? 0 : t(f, out + i * 2, out + i * 2 + 16);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: Math.min(1, p * 1.4) * (1 - q),
              transform: `translateY(${(1 - p) * 0.45 - q * 0.45}em) scale(${0.94 + 0.06 * p})`,
              filter: `blur(${(1 - Math.min(1, p)) * 12 + q * 12}px)`,
              color: raw.startsWith("*") ? accent : undefined,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

// Material-style glyphs drawn inline.
const ICONS = {
  check: "M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z",
  warning: "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
  mic: "M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z",
  doc: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
  spark: "M12 2l2.2 6.2L20 10l-5.8 1.8L12 18l-2.2-6.2L4 10l5.8-1.8z",
  pause: "M6 19h4V5H6v14zm8-14v14h4V5h-4z",
  keyboard:
    "M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z",
  close: "M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  help: "M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z",
  science: "M19.8 18.4 14 10.67V6.5l1.35-1.69c.26-.33.03-.81-.39-.81H9.04c-.42 0-.65.48-.39.81L10 6.5v4.17L4.2 18.4c-.49.66-.02 1.6.8 1.6h14c.82 0 1.29-.94.8-1.6z",
  android:
    "M17.6 9.48l1.84-3.18a.38.38 0 0 0-.66-.38l-1.86 3.22a11.4 11.4 0 0 0-9.84 0L5.22 5.92a.38.38 0 0 0-.66.38L6.4 9.48A10.8 10.8 0 0 0 1 18h22a10.8 10.8 0 0 0-5.4-8.52zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z",
};
export const Icon: React.FC<{ name: keyof typeof ICONS; size: number; color: string }> = ({ name, size, color }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill={color} style={{ flexShrink: 0 }}>
    <path d={ICONS[name]} />
  </svg>
);

// A scene's voiceover at its start (+VO_LEAD). Silent until `bun run audio` has made the file.
export const Voice: React.FC<{ line: Line }> = ({ line }) =>
  hasVoice(line) ? <Audio name={`VO ${line}`} from={S[line] + VO_LEAD} src={staticFile(`audio/vo-${line}.mp3`)} /> : null;

export const Sfx: React.FC<{ id: SfxId; at: number; volume?: number }> = ({ id, at, volume = 0.5 }) =>
  hasSfx(id) ? <Audio name={`SFX ${id}`} from={Math.max(0, Math.round(at))} volume={volume} src={staticFile(`audio/sfx-${id}.mp3`)} /> : null;
