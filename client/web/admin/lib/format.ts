const day = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" })
const dayTime = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })

export const formatDay = (iso: string | null | undefined) => (iso ? day.format(new Date(iso)) : "—")
export const formatDayTime = (iso: string | null | undefined) => (iso ? dayTime.format(new Date(iso)) : "—")

export const MODE_LABELS = { TITLE: "Title", PRE_ORAL: "Pre-Oral", FINAL: "Final" } as const

// The face the student picked in the app, drawn exactly as the app draws it (client/mobile/Deemo/src/utils/avatar.ts:
// DiceBear notionists in DEEMO's dusk and paper). No pick means the server's default seed, a hash of the user ID, so
// DiceBear never sees an ID.
function fnv(s: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193)
  return (h >>> 0).toString(16).padStart(8, "0")
}

export const avatarUrl = (seed: string | null, id: string) =>
  `https://api.dicebear.com/10.x/notionists/png?seed=${seed || fnv(id)}&size=256&inkColor=343996&paperColor=F7F3EC&backgroundColor=DCE3FF,CFD6F3`

export const initials = (name: string | null, email: string | null) =>
  ((name ?? email ?? "?").match(/\b\p{L}/gu) ?? ["?"]).slice(0, 2).join("").toUpperCase()

export const formatDuration = (ms: number) => {
  const m = Math.floor(ms / 60_000)
  const s = Math.round((ms % 60_000) / 1000)
  return `${m}:${String(s).padStart(2, "0")}`
}

// "2026-10-14" (a Philippine calendar day) as "Oct 14".
export const formatShortDay = (day: string) =>
  new Date(`${day}T00:00:00+08:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "Asia/Manila" })

export const displayName = (p: { name: string | null; email: string | null; id?: string }) => p.name ?? p.email ?? p.id ?? "Unknown"
