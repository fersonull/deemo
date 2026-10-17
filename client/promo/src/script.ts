// The promo's words and sounds, in scene order. Edit a line, then `bun run audio` regenerates only what's missing
// (delete public/audio/vo-<id>.mp3, or pass --force, to redo one that changed).
import audio from "./audio.json";

export const LINES = {
  hook: "Three days until your defense. And your panel has read every page.",
  meet: "Meet DEEMO. The A.I. mock panel that lets you practice your research defense, out loud.",
  upload: "Upload your manuscript. DEEMO reads it, maps your objectives and methods, and finds every fact a panel could check.",
  panel: "Then it seats a panel built for your field. A capstone faces an engineer. A nursing study faces a clinician.",
  ask: "They ask out loud, listen to your answer, and follow up when it's thin. Just like the real thing.",
  flag: "Say something your paper doesn't, and DEEMO catches it, gently, before your real panel does.",
  report: "After every session, you get a readiness score, and feedback you can actually use.",
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
  seconds: 60,
};

export const FPS = 30;
export const TRANSITION = 12; // frames each scene overlaps the next
export const VO_DELAY = 10; // frames into a scene before its line starts

// Fallback lengths (seconds) until `bun run audio` measures the real ones.
const FALLBACK: Record<Line, number> = { hook: 4.5, meet: 5.5, upload: 6.5, panel: 6.5, ask: 5.5, flag: 5.5, report: 5, cta: 3.5 };
const MIN: Partial<Record<Line, number>> = { cta: 6 }; // let the end card breathe

const voice = audio.voice as Partial<Record<Line, number>>;
export const hasVoice = (line: Line) => voice[line] !== undefined;
export const hasSfx = (id: Sfx) => (audio.sfx as string[]).includes(id);
export const hasMusic = audio.music;

// A scene lasts its line plus room either side, never shorter than its minimum.
export function sceneFrames(line: Line) {
  const spoken = voice[line] ?? FALLBACK[line];
  return Math.ceil(Math.max(spoken * FPS + VO_DELAY + 24 + TRANSITION, (MIN[line] ?? 0) * FPS));
}

export const SCENES = Object.keys(LINES) as Line[];
export const TOTAL = SCENES.reduce((t, s) => t + sceneFrames(s), 0) - TRANSITION * (SCENES.length - 1);
