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
  action: "premium_on" | "premium_off" | "sign_in_disabled" | "sign_in_enabled" | "account_deleted"
  targetId: string
  targetEmail: string | null
  createdAt: string
}
export type AuditPage = Paged & { actions: AdminAction[] }
