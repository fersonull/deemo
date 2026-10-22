// The promo's words and sounds, in scene order. Edit a line, delete its public/audio/vo-<id>.mp3, then
// `bun run audio` regenerates what's missing; each scene stretches to fit its measured line (src/audio.json).
import audio from "./audio.json";

export const LINES = {
  hook: "You know your paper. But can you defend it out loud?",
  meet: "Meet DEEMO, your mock defense panel. Rehearse your title, pre-oral, and final defense, anytime.",
  upload: "Upload your manuscript. DEEMO reads every page, so each question comes from your own paper and course.",
  defend: "Then answer a live panel, out loud. Three panelists ask, follow up, and catch your contradictions.",
  improve: "After, you get a readiness score, and exactly what to fix before the real defense.",
  cta: "DEEMO, on Android. Practice the defense, before the defense.",
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
  glass: { prompt: "soft delicate glass tap, clean modern UI, short", seconds: 0.5 },
  roll: { prompt: "quick mechanical slot machine tick roll, light, short", seconds: 0.8 },
  swell: { prompt: "airy ethereal whoosh swell rising into open sky, soft", seconds: 2 },
} as const;
export type Sfx = keyof typeof SFX;

export const MUSIC = {
  prompt: "Airy modern ambient pop for a sleek app launch film. Soft synth pads, gentle plucks, light clap, warm sub bass, 100 bpm, optimistic and polished, no vocals.",
  seconds: 50,
};

export const FPS = 60;
export const VO_LEAD = 8; // frames into a scene before its line starts
export const OVERLAP = 30; // frames each scene overlaps the next (bridges live in the overlap)

// A scene never runs shorter than this (seconds): room for its choreography even with a short line.
const MIN: Record<Line, number> = { hook: 3.2, meet: 3, upload: 4.2, defend: 4.8, improve: 4, cta: 4.4 };
const FALLBACK: Record<Line, number> = { hook: 3.1, meet: 2.2, upload: 3.6, defend: 3.1, improve: 2, cta: 3.2 };

const voice = audio.voice as Partial<Record<Line, number>>;
export const hasVoice = (line: Line) => voice[line] !== undefined;
export const hasSfx = (id: Sfx) => (audio.sfx as string[]).includes(id);
export const hasMusic = audio.music;

// Measured loudness of each file in dB (scripts/measure-audio.ts), keyed like "sfx-hit" or "vo-intro".
export const levels = ((audio as { levels?: Record<string, number> }).levels ?? {}) as Record<string, number>;

// When each line is spoken, in frames (start, end): the mix ducks effects and music under the voice.
export const voiceWindows = (): [number, number][] =>
  ORDER.filter(hasVoice).map((l) => [S[l] + VO_LEAD, S[l] + VO_LEAD + Math.ceil(voice[l]! * FPS)]);

export const ORDER = Object.keys(LINES) as Line[];
// Scene lengths in frames, including the overlap into the next.
export const LEN = {} as Record<Line, number>;
// Scene start frames: S.setup is when the setup scene begins, and so on.
export const S = {} as Record<Line, number>;
let at = 0;
for (const l of ORDER) {
  LEN[l] = Math.ceil(Math.max(MIN[l] * FPS, (voice[l] ?? FALLBACK[l]) * FPS + VO_LEAD + 20)) + OVERLAP;
  S[l] = at;
  at += LEN[l] - OVERLAP;
}
export const TOTAL = at + OVERLAP;
