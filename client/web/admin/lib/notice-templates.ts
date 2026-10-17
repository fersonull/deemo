import type { Segment } from "@/lib/notice-audience"

// Starting points for common notices. Choosing one fills the composer (and its usual audience); every field stays
// editable. [Square brackets] mark details to fill in, and the composer won't send until they're replaced.
export type NoticeTemplate = {
  id: string
  name: string
  title: string
  body: string
  audience: "all" | "segment" | "user"
  segment?: Segment
}

export const NOTICE_TEMPLATES: NoticeTemplate[] = [
  {
    id: "account-warning",
    name: "Account warning",
    audience: "user",
    title: "A note about your account",
    body: "We noticed activity on your account that goes against DEEMO's terms of use: [what happened].\n\nPlease keep your practice sessions and manuscripts to your own academic work. If this happens again, your account may be suspended.\n\nIf you think this is a mistake, contact the DEEMO team.",
  },
  {
    id: "welcome",
    name: "Welcome new students",
    audience: "segment",
    segment: { joined: "week" },
    title: "Welcome to DEEMO",
    body: "Glad you're here. Upload your manuscript, pick your defense stage, and the panel will read it before asking you anything.\n\nTip: start with a short Title Defense to get a feel for the questions.",
  },
  {
    id: "maintenance",
    name: "Scheduled maintenance",
    audience: "all",
    title: "DEEMO maintenance on [date]",
    body: "DEEMO will be briefly unavailable on [date], from [start time] to [end time], while we make improvements.\n\nLive practice can't start during this window. Your manuscripts, reports and history are safe.",
  },
  {
    id: "first-practice",
    name: "First practice nudge",
    audience: "segment",
    segment: { practice: "never" },
    title: "Your first practice session is waiting",
    body: "You haven't practiced with the panel yet. Start with a short Title Defense: it takes about ten minutes, and you'll get a readiness score and the questions to work on next.",
  },
  {
    id: "come-back",
    name: "Practice reminder",
    audience: "segment",
    segment: { practice: "idle" },
    title: "It's been a week since your last practice",
    body: "A short session today keeps your answers fresh. Pick up where you left off: your last report shows the questions worth another try.",
  },
  {
    id: "new-feature",
    name: "What's new",
    audience: "all",
    title: "New in DEEMO: [feature]",
    body: "[What changed, in one or two sentences.]\n\nUpdate the app to try it, and tell us what you think.",
  },
]

export const hasPlaceholder = (s: string) => /\[[^\]]+\]/.test(s)
