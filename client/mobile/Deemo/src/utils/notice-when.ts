// When a notice arrived, the way the inbox says it: "Just now", "Today, 3:40 PM", "Yesterday, 9:02 AM", "Oct 12"
// (this year) or "Oct 12, 2025".
export function noticeWhen(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (now.getTime() - d.getTime() < 60_000) return "Just now";
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((day(now) - day(d)) / 86_400_000);
  if (days === 0) return `Today, ${time}`;
  if (days === 1) return `Yesterday, ${time}`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(d.getFullYear() !== now.getFullYear() && { year: "numeric" }) });
}
