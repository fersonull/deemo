import { planOf } from "../../identity/domain/plan";
import { sessionDay } from "../../practice/domain/live-start";

// Practice sessions a student has started today (Philippine day) against their plan's daily cap, as the practice module
// counts them when it hands out a Live token. `dailyCap: null` is unlimited (Premium; JSON has no Infinity).
export function dailyUsage(u: { premium: boolean; sessionDay: string | null; sessionCount: number }, now = Date.now()) {
  const cap = planOf(u.premium).dailySessions;
  return { usedToday: u.sessionDay === sessionDay(now) ? u.sessionCount : 0, dailyCap: Number.isFinite(cap) ? cap : null };
}
