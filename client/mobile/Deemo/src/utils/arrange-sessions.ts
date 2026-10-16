// History's session list: a date range, then a sort. Sessions without a score (still scoring, or nothing answered)
// sort after scored ones when sorting by score.

export type SessionSort = "newest" | "oldest" | "highest" | "lowest";
export type SessionRange = "all" | "7d" | "30d";

export const SORTS: { value: SessionSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "highest", label: "Highest score" },
  { value: "lowest", label: "Lowest score" },
];
export const RANGES: { value: SessionRange; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

const DAY = 86_400_000;

export function arrangeSessions<T extends { createdAt: string; score?: number }>(
  list: T[],
  sort: SessionSort,
  range: SessionRange,
  now = Date.now(),
): T[] {
  const since = range === "7d" ? now - 7 * DAY : range === "30d" ? now - 30 * DAY : -Infinity;
  const time = (s: T) => new Date(s.createdAt).getTime();
  const kept = list.filter((s) => time(s) >= since);
  const byDate = (a: T, b: T) => time(b) - time(a); // newest first
  return kept.sort((a, b) => {
    if (sort === "oldest") return -byDate(a, b);
    if (sort === "newest") return byDate(a, b);
    if (a.score === undefined || b.score === undefined) return a.score === undefined ? (b.score === undefined ? byDate(a, b) : 1) : -1;
    return (sort === "highest" ? b.score - a.score : a.score - b.score) || byDate(a, b);
  });
}
