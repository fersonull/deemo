import type { DeemoMood } from "@/components/deemo";
import { MODE_LABELS, type Mode } from "@/constants";

import { bandOf, deltaTone } from "./bands";

// What Deemo tells the student on Home, from what we know about them. Deemo is the informer: the bubble leads with
// the last score as a big headline (number and band, in the band's color), then a short line on what changed and
// what to work on next. Parts marked `strong` are bold; `color` tints the ones that carry a status (the change).
// Design D3: plain words, no exclamation marks.

export type Part = { text: string; strong?: boolean; color?: string };
export type Headline = { score: number; band: string; color: string };
export type Brief = { parts: Part[]; mood: DeemoMood; headline?: Headline; openId?: string };

type Session = { id: string; mode: Mode; score?: number; band?: string; tip?: string };

const MAX_TIP = 60;
const clip = (s: string) => (s.length > MAX_TIP ? `${s.slice(0, MAX_TIP - 1).trimEnd()}…` : s);
const points = (n: number) => `${n} ${n === 1 ? "point" : "points"}`;

export function homeBrief(sessions: Session[], manuscript: string | null, offline: boolean): Brief {
  if (offline)
    return {
      parts: [{ text: "I " }, { text: "can't reach the DEEMO server", strong: true }, { text: " right now. Pull down to try again." }],
      mood: "sleepy",
    };

  const scored = sessions.filter((s) => s.score !== undefined);
  const last = scored[0];
  if (!last) {
    if (!sessions.length && !manuscript)
      return {
        parts: [
          { text: "Start by " },
          { text: "adding your manuscript", strong: true },
          { text: ", so the panel asks about your own study. Or try a round with the sample paper." },
        ],
        mood: "waving",
      };
    if (!sessions.length)
      return {
        parts: [{ text: "Your panel has read " }, { text: manuscript!, strong: true }, { text: ". Up for your " }, { text: "first round", strong: true }, { text: "?" }],
        mood: "waving",
      };
    return {
      parts: [{ text: "No score yet. Answer " }, { text: "at least one question", strong: true }, { text: " and your readiness shows up here." }],
      mood: "idle",
    };
  }

  const score = last.score!;
  const band = bandOf(score);
  // The headline carries the score and band, so the words stay short: the stage, the change, the next fix.
  const parts: Part[] = [{ text: "Your last " }, { text: MODE_LABELS[last.mode], strong: true }];
  const before = scored[1]?.score;
  if (before !== undefined && before !== score) {
    const diff = score - before;
    parts.push({ text: ", " }, { text: `${diff > 0 ? "up" : "down"} ${points(Math.abs(diff))}`, strong: true, color: deltaTone(diff).ink });
  }
  parts.push({ text: ". " });
  if (last.tip) parts.push({ text: "Next: " }, { text: clip(last.tip), strong: true });
  else parts.push({ text: "Open the report to see what to fix." });

  return {
    parts,
    headline: { score, band: last.band ?? band.name, color: band.ink },
    // The face follows the band: cheering, a calm smile, an encouraging tilt, a nervous wobble.
    mood: score >= 85 ? "cheering" : score >= 70 ? "idle" : score >= 50 ? "encouraging" : "nervous",
    openId: last.id,
  };
}

// The brief as one string, for screen readers.
export const briefText = (b: Brief) => b.parts.map((p) => p.text).join("");

