// Filters for a notice's audience. Same shape and values as Segment in
// server/src/modules/notices/domain/notice.ts; the course list matches identity/domain/course.ts.
export const COURSES = [
  "BSIT",
  "BSCS",
  "Engineering",
  "Maritime",
  "Education",
  "Nursing & Health",
  "Business & Accountancy",
  "Hospitality & Tourism",
  "Criminology",
  "Psychology & Social Sciences",
  "Other",
] as const

export type Segment = {
  plan?: "premium" | "free"
  joined?: "week" | "month"
  course?: (typeof COURSES)[number]
  practice?: "never" | "recent" | "idle"
}

const ANY = { value: "any", label: "Any" }
export const FILTERS = [
  {
    key: "plan",
    label: "Plan",
    options: [ANY, { value: "premium", label: "Premium" }, { value: "free", label: "Free" }],
  },
  {
    key: "joined",
    label: "Joined",
    options: [ANY, { value: "week", label: "This week" }, { value: "month", label: "This month" }],
  },
  {
    key: "course",
    label: "Course",
    options: [ANY, ...COURSES.map((c) => ({ value: c, label: c }))],
  },
  {
    key: "practice",
    label: "Practice",
    options: [
      ANY,
      { value: "never", label: "Never practiced" },
      { value: "recent", label: "Practiced this week" },
      { value: "idle", label: "No practice in 7 days" },
    ],
  },
] as const

export const hasFilter = (s: Segment) => Object.values(s).some(Boolean)

// "Premium · Not verified · BSIT", in the filters' order.
export function describeSegment(s: Segment) {
  return FILTERS.flatMap((f) => {
    const v = s[f.key]
    return v ? [f.options.find((o) => o.value === v)?.label ?? v] : []
  }).join(" · ")
}
