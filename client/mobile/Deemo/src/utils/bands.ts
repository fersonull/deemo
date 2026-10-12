import { colors } from "@/colors";

// Readiness bands (addendum Q4, server/src/scoring.ts `band`) with their status colors, so a score reads at a
// glance: sage = defense-ready, dusk = nearly ready, amber = developing, clay = needs preparation. Color is never
// the only signal: the band's name always travels with it. Never used inside a live session (no red there).

export type Band = { name: string; short: string; fill: string; ink: string; tint: string };

const BANDS: (Band & { from: number })[] = [
  { from: 85, name: "Defense-ready", short: "Ready", fill: colors.sage, ink: colors.sageInk, tint: colors.sageTint },
  { from: 70, name: "Nearly ready", short: "Nearly", fill: colors.dusk, ink: colors.duskInk, tint: colors.duskTint },
  { from: 50, name: "Developing", short: "Developing", fill: colors.amber, ink: colors.amberInk, tint: colors.amberTint },
  { from: -Infinity, name: "Needs preparation", short: "Needs prep", fill: colors.clay, ink: colors.clay, tint: colors.clayTint },
];

export function bandOf(score: number): Band {
  const { from: _from, ...band } = BANDS.find((b) => score >= b.from)!;
  return band;
}

export const BAND_KEY: Band[] = BANDS.map(({ from: _from, ...b }) => b);

// A change between two sessions: up is good (sage), down is a nudge (amber, never red), level is neutral.
export function deltaTone(delta: number) {
  if (delta > 0) return { ink: colors.sageInk, tint: colors.sageTint, icon: "arrow_upward" };
  if (delta < 0) return { ink: colors.amberInk, tint: colors.amberTint, icon: "arrow_downward" };
  return { ink: colors.inkMuted, tint: colors.sand, icon: "" };
}
