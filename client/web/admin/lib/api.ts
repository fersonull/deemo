import { getAuth } from "@/lib/firebase"

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/$/, "")

// GET from the server's read-only admin API with the signed-in admin's Firebase ID token.
export async function adminApi<T>(path: string): Promise<T> {
  const token = await getAuth().currentUser?.getIdToken()
  if (!token) throw new Error("Sign in first.")
  const res = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.error ?? `The server answered ${res.status}.`)
  return body as T
}

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

export type UserPage = { total: number; page: number; pageSize: number; users: UserRow[] }

export type UserDetail = Omit<UserRow, "projects" | "sessions" | "lastSessionAt"> & {
  allowTyping: boolean
  consentVersion: string | null
  consentAt: string | null
  sessionDay: string | null
  sessionCount: number
  totalSessions: number
  projects: { id: string; name: string; domain: string; status: "analyzing" | "ready" | "failed"; createdAt: string }[]
  sessions: {
    id: string
    mode: "TITLE" | "PRE_ORAL" | "FINAL"
    status: "scoring" | "ready" | "failed"
    title: string
    createdAt: string
    score: number | null
    band: string | null
  }[]
  groups: { code: string; role: "owner" | "member"; joinedAt: string }[]
  firebase: { disabled: boolean; lastSignInAt: string | null } | null
}
