export type DayCount = { day: string; n: number };

const DAY_MS = 24 * 60 * 60_000;

// Every day in the window, zero-filled, so the chart has no gaps.
export function fillDays(rows: DayCount[], days: number, now = Date.now()) {
  const by = new Map(rows.map((r) => [r.day, r.n]));
  return Array.from({ length: days }, (_, i) => {
    const day = new Date(now + 8 * 3_600_000 - (days - 1 - i) * DAY_MS).toISOString().slice(0, 10);
    return { day, n: by.get(day) ?? 0 };
  });
}

