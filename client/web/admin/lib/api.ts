import { getAuth } from "@/lib/firebase"

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/$/, "")

// Calls the server's admin API with the signed-in admin's Firebase ID token. GET by default; `send` for changes.
export async function adminApi<T>(path: string, init?: { method: "PATCH" | "POST" | "DELETE"; body?: object }): Promise<T> {
  const token = await getAuth().currentUser?.getIdToken()
  if (!token) throw new Error("Sign in first.")
  const res = await fetch(`${BASE}${path}`, {
    method: init?.method ?? "GET",
    headers: { Authorization: `Bearer ${token}`, ...(init?.body && { "content-type": "application/json" }) },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.error ?? `The server answered ${res.status}.`)
  return body as T
}

export type Paged = { total: number; page: number; pageSize: number }

export type UserRow = {
  id: string
  name: string | null
  email: string | null
  avatar: string | null
  provider: string | null
  emailVerified: boolean
  premium: boolean
  createdAt: string
  deletedAt: string | null
  projects: number
  sessions: number
  lastSessionAt: string | null
  usedToday: number
  dailyCap: number
}

export type UserPage = Paged & { users: UserRow[] }

export type UserDetail = Omit<UserRow, "projects" | "sessions" | "lastSessionAt"> & {
  allowTyping: boolean
  consentVersion: string | null
  consentAt: string | null
  sessionDay: string | null
  sessionCount: number
  totalSessions: number
  projects: { id: string; name: string; domain: string; status: "analyzing" | "ready" | "failed"; createdAt: string }[]
  groups: { code: string; role: "owner" | "member"; joinedAt: string }[]
  firebase: { disabled: boolean; lastSignInAt: string | null } | null
}

export type SessionRow = {
  id: string
  mode: "TITLE" | "PRE_ORAL" | "FINAL"
  status: "scoring" | "ready" | "failed"
  title: string
  createdAt: string
  score: number | null
  band: string | null
}
export type SessionPage = Paged & { sessions: SessionRow[] }

export type AdminAction = {
  id: number
  adminId: string
  adminEmail: string | null
  action:
    | "premium_on"
    | "premium_off"
    | "sign_in_disabled"
    | "sign_in_enabled"
    | "account_deleted"
    | "daily_reset"
    | "session_rescored"
    | "admin_granted"
    | "admin_revoked"
  targetId: string
  targetEmail: string | null
  createdAt: string
}
export type AuditPage = Paged & { actions: AdminAction[] }

export type Person = { id: string; email: string | null; name: string | null }

export type Overview = {
  counts: { users: number; verified: number; premium: number; newThisWeek: number; sessionsThisWeek: number }
  readiness: { average: number | null; scored: number; days: number }
  signups: { day: string; n: number }[]
  sessions: { day: string; n: number }[]
  attention: {
    projects: { id: string; name: string; status: string; error: string | null; updatedAt: string; stuck: boolean; user: Person }[]
    sessions: { id: string; title: string; mode: SessionRow["mode"]; status: string; error: string | null; updatedAt: string; stuck: boolean; user: Person }[]
  }
}

export type AdminSessionRow = {
  id: string
  title: string
  mode: SessionRow["mode"]
  status: SessionRow["status"]
  minutes: number
  panelists: number
  durationMs: number
  createdAt: string
  user: Person
  stuck: boolean
  score: number | null
  band: string | null
}
export type AdminSessionPage = Paged & { sessions: AdminSessionRow[] }

export type SessionReport = {
  id: string
  title: string
  mode: SessionRow["mode"]
  status: SessionRow["status"]
  error: string | null
  minutes: number
  panelists: number
  followUps: number
  difficulty: "EASY" | "STANDARD" | "HARD"
  durationMs: number
  endedBy: "panel" | "student" | "time"
  groupCode: string | null
  createdAt: string
  user: Person
  report: {
    score: number
    band: string
    message: string
    headline: string
    scored: boolean
    rubricScore: number
    penalty: number
    answered: number
    planned: number
    model: string | null
    criteria: { name: string; weight: number; level: number | null; why: string }[]
    contradictions: { spokenClaim: string; manuscriptEvidence: string; severity: "LOW" | "MEDIUM" | "HIGH" }[]
    fixes: { text: string }[]
  } | null
}

export type AdminProjectRow = {
  id: string
  name: string
  domain: string
  fileName: string
  sizeBytes: number
  status: "analyzing" | "ready" | "failed"
  error: string | null
  confirmedAt: string | null
  createdAt: string
  user: Person
  stuck: boolean
  rubric: string | null
  groupCode: string | null
}
export type AdminProjectPage = Paged & { projects: AdminProjectRow[] }

export type AdminGroup = {
  code: string
  createdAt: string
  owner: Person
  project: { id: string; name: string }
  members: { shareScore: boolean; focusArea: string; joinedAt: string; user: Person }[]
}
export type AdminGroupPage = Paged & { groups: AdminGroup[] }

export type AdminAccount = { uid: string; email: string | null; name: string | null; lastSignInAt: string | null }
