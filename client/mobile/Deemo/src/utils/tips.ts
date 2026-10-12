// Deemo's tips on Home (design D3: scripted lines only, at most two sentences, no exclamation marks, no hype).

export const TIPS = [
  "Answer the question first, then explain. Panels like the point up front.",
  "If you don't know, say what you would check and how. It beats guessing.",
  "Know your sample size and why you chose it. It comes up in almost every defense.",
  "Restate a long question in one line before you answer. It buys you a few seconds.",
  "Keep your objectives close. Most follow-ups trace back to them.",
  "Practice with earphones in. The panel hears you better without the echo.",
  "A short pause before answering is fine. Rushing is what panels notice.",
  "Name your limitations before the panel does. It shows you know your study.",
  "Tie each answer back to your results when you can.",
  "Read the top fixes on your last report before your next round.",
  "Use the same terms as your manuscript. The panel checks your answers against it.",
  "Explain your method as steps: what you did, then why.",
] as const;

// A random tip, never the one just shown (so tapping Deemo always changes it). `random` is injectable for tests.
export function nextTip(current: number | null, random: () => number = Math.random): number {
  if (TIPS.length < 2) return 0;
  const pick = Math.floor(random() * (current === null ? TIPS.length : TIPS.length - 1));
  return current !== null && pick >= current ? pick + 1 : pick;
}
