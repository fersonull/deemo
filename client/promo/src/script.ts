// The promo's words and sounds, in beat order. Edit a line, delete its public/audio/vo-<id>.mp3, then
// `bun run audio` regenerates what's missing; each beat stretches to fit its measured line (src/audio.json).
import audio from "./audio.json";

export const LINES = {
  hook: "Your defense is in three days.",
  meet: "Meet DEEMO, your A.I. mock panel.",
  upload: "Upload your manuscript. It reads every page.",
  panel: "Then seats a panel built for your field.",
  ask: "They ask out loud, and follow up.",
  flag: "Contradict your paper? DEEMO catches it.",
  report: "Then it scores how ready you are.",
  cta: "DEEMO. Practice the defense, before the defense.",
} as const;
export type Line = keyof typeof LINES;

export const SFX = {
  hit: { prompt: "deep cinematic impact hit, short, punchy, no reverb tail", seconds: 1 },
  tick: { prompt: "single clean clock tick, crisp, close", seconds: 0.5 },
  pop: { prompt: "soft bubbly cartoon pop, playful UI sound", seconds: 0.5 },
  whoosh: { prompt: "fast airy whoosh swipe transition", seconds: 0.8 },
  sparkle: { prompt: "magical sparkle shimmer chime, bright, short", seconds: 1.2 },
  paper: { prompt: "sheet of paper sliding onto a wooden desk", seconds: 1 },
  scan: { prompt: "soft digital scanning sweep, futuristic, gentle", seconds: 2 },
  click: { prompt: "small satisfying UI click, soft plastic", seconds: 0.5 },
  chime: { prompt: "gentle two-note notification chime, warm, friendly", seconds: 1 },
  nudge: { prompt: "soft warm attention tone, curious, not alarming, marimba", seconds: 1 },
  riser: { prompt: "short bright uplifting riser swell", seconds: 2 },
  ding: { prompt: "success ding, bright bell, satisfying", seconds: 1.2 },
  sting: { prompt: "upbeat logo sting, warm synth and bell, confident ending", seconds: 2.5 },
} as const;
export type Sfx = keyof typeof SFX;

export const MUSIC = {
  prompt: "Upbeat, warm, playful electronic pop background for a student app promo. Light plucks, soft claps, bright marimba, steady 112 bpm, optimistic, no vocals.",
  seconds: 30,
};

export const FPS = 30;
export const VO_LEAD = 4; // frames into a beat before its line starts

// A beat never runs shorter than this (seconds): room for its choreography even with a short line.
const MIN: Record<Line, number> = { hook: 2.4, meet: 2.6, upload: 3.4, panel: 3.4, ask: 3, flag: 2.8, report: 2.8, cta: 3.8 };
const FALLBACK: Record<Line, number> = { hook: 1.8, meet: 2, upload: 2.8, panel: 2.3, ask: 2, flag: 2.4, report: 1.8, cta: 2.9 };

const voice = audio.voice as Partial<Record<Line, number>>;
export const hasVoice = (line: Line) => voice[line] !== undefined;
export const hasSfx = (id: Sfx) => (audio.sfx as string[]).includes(id);
export const hasMusic = audio.music;

export const ORDER = Object.keys(LINES) as Line[];
const len = (l: Line) => Math.ceil(Math.max(MIN[l] * FPS, (voice[l] ?? FALLBACK[l]) * FPS + VO_LEAD + 10));

// Beat start frames: B.upload is when the upload beat begins, and so on.
export const B = {} as Record<Line, number>;
let at = 0;
for (const l of ORDER) {
  B[l] = at;
  at += len(l);
}
export const TOTAL = at;
