import type { DeemoMood } from "@/components/deemo";

type Scored = { score?: number };

// What Deemo says at the top of History: the trend in plain words, then one thing to do or know (design D3:
// at most two sentences, no exclamation marks). `list` is newest first; `stage` names the filter, if any.
export function historySummary(list: Scored[], stage: string | null): { text: string; mood: DeemoMood } {
  const scored = list.filter((s) => s.score !== undefined).map((s) => s.score as number);
  const first = stage ? `your first ${stage} session` : "your first session";
  if (!list.length)
    return stage
      ? { text: `No ${stage} practice yet. Your first round will show up here.`, mood: "idle" }
      : { text: "No practice yet. Your first round will show up here.", mood: "waving" };
  if (!scored.length) return { text: "No scored sessions yet. Answer a question or two and you'll get a score.", mood: "idle" };
  if (scored.length === 1) return { text: `${scored[0]}% so far. One more scored session and your trend appears.`, mood: "idle" };
  const best = Math.max(...scored);
  const diff = scored[0] - scored[scored.length - 1];
  const points = (n: number) => `${n} ${n === 1 ? "point" : "points"}`;
  if (diff > 0) return { text: `Up ${points(diff)} since ${first}. Your best so far is ${best}%.`, mood: "cheering" };
  if (diff < 0)
    return { text: `Down ${points(-diff)} since ${first}. Practice the flagged topics and it will come back.`, mood: "encouraging" };
  return { text: `Level with ${first}. Your best so far is ${best}%.`, mood: "idle" };
}
