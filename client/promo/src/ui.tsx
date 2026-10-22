// Shared look: the app's design system (tokens, fonts, raised surfaces, the blob), word-by-word text, icons and the
// sound helpers every scene uses.
import { Audio } from "@remotion/media";
import { loadFont as loadBricolage } from "@remotion/google-fonts/BricolageGrotesque";
import { loadFont as loadDMMono } from "@remotion/google-fonts/DMMono";
import { loadFont as loadDMSans } from "@remotion/google-fonts/DMSans";
import type React from "react";
import { staticFile, useCurrentFrame } from "remotion";
import { ios, t } from "./motion";
import { hasMusic, hasSfx, hasVoice, levels, S, TOTAL, VO_LEAD, voiceWindows, type Line, type Sfx as SfxId } from "./script";

// client/mobile/Deemo/src/colors.ts — keep in step.
export const C = {
  paper: "#F7F3EC",
  sand: "#EDE5D8",
  ink: "#2A2420",
  inkSoft: "#3E3731",
  inkDepth: "#191613",
  sandDepth: "#C8BDAE",
  inkMuted: "#5E554D",
  muted: "#6B6157",
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

// The app's lit surfaces (client/mobile/Deemo theme.ts `lit` and components/pressable-scale): light from above,
// all inside the shape (a 1 px top highlight and a soft glow down the face), no lower layer. Dark faces take a
// fainter light. In the film these cards float over the backdrop, so they also get a soft drop shadow.
export const lit = (dark = false) =>
  dark
    ? "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 12px 20px -10px rgba(255,255,255,0.1)"
    : "inset 0 1px 0 rgba(255,255,255,0.7), inset 0 14px 22px -12px rgba(255,255,255,0.32)";
const FLOAT = "0 22px 44px -22px rgba(42,36,32,0.34)";
const KINDS = {
  paper: { bg: "#FFFCF7", ink: C.ink, dark: false },
  sand: { bg: C.sand, ink: C.ink, dark: false },
  dusk: { bg: C.dusk, ink: C.paper, dark: true },
  ink: { bg: C.ink, ink: C.paper, dark: true },
  amber: { bg: C.amberTint, ink: C.amberInk, dark: false },
};
export function surface(kind: keyof typeof KINDS = "paper", radius = 24): React.CSSProperties {
  const k = KINDS[kind];
  return { borderRadius: radius, background: k.bg, color: k.ink, boxShadow: `${lit(k.dark)}, ${FLOAT}` };
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
  home: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
  folder: "M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z",
  chart: "M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z",
  person: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
  group:
    "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  back: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z",
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

// The mix. Every sound is set from its measured loudness, not a guessed volume: the voice at -23 dB, effects about
// 10 dB under it, the music bed further down, and both effects and music duck while a line is spoken, so the
// voiceover always reads first. Remotion can't amplify (volume tops out at 1), so a quiet file stays as loud as it is.
const VOICE_DB = -23;
const SFX_DB = VOICE_DB - 10;
const MUSIC_DB = VOICE_DB - 8;
const gainFor = (key: string, target: number) => {
  const level = levels[key];
  return level === undefined ? 0.4 : Math.min(1, 10 ** ((target - level) / 20));
};
const WINDOWS = voiceWindows();
const RAMP = 8; // frames to dip in and out
// 1 while a line is being spoken, 0 between lines, eased at the edges.
export const speaking = (frame: number) =>
  Math.max(0, ...WINDOWS.map(([a, b]) => Math.min(1, (frame - a + RAMP) / RAMP, (b + RAMP - frame) / RAMP)));

// A scene's voiceover at its start (+VO_LEAD), evened out to the same level. Silent until `bun run audio` made it.
export const Voice: React.FC<{ line: Line }> = ({ line }) =>
  hasVoice(line) ? (
    <Audio name={`VO ${line}`} from={S[line] + VO_LEAD} volume={gainFor(`vo-${line}`, VOICE_DB)} src={staticFile(`audio/vo-${line}.mp3`)} />
  ) : null;

// An effect at frame `at`. `volume` is a small accent on top of the mix level (1 = the usual effect level), and the
// effect drops to 45% for as long as it overlaps a spoken line.
export const Sfx: React.FC<{ id: SfxId; at: number; volume?: number }> = ({ id, at, volume = 1 }) => {
  const from = Math.max(0, Math.round(at));
  const base = gainFor(`sfx-${id}`, SFX_DB) * volume;
  return hasSfx(id) ? (
    <Audio
      name={`SFX ${id}`}
      from={from}
      volume={(f) => Math.min(1, base * (1 - 0.55 * speaking(from + f)))}
      src={staticFile(`audio/sfx-${id}.mp3`)}
    />
  ) : null;
};

// The looping music bed: faded in and out, and halved under the voice.
export const Music: React.FC = () => {
  const base = gainFor("music", MUSIC_DB);
  return hasMusic ? (
    <Audio
      name="Music"
      src={staticFile("audio/music.mp3")}
      loop
      volume={(f) => base * Math.min(1, f / 20, (TOTAL - 1 - f) / 70) * (1 - 0.5 * speaking(f))}
    />
  ) : null;
};
