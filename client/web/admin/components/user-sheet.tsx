"use client"

import { useEffect, useState, type ReactNode } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { adminApi, type UserDetail } from "@/lib/api"
import { avatarUrl, formatDay, formatDayTime, initials, MODE_LABELS } from "@/lib/format"

// One student, read-only: account, sign-in facts from Firebase, projects, recent sessions and groups.
export function UserSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const [attempt, setAttempt] = useState(0)
  // Each answer remembers which request it belongs to, so a new user or a retry shows the skeleton until its own arrives.
  const key = `${id}#${attempt}`
  const [result, setResult] = useState<{ key: string; user?: UserDetail; error?: string } | null>(null)
  const current = result?.key === key ? result : null
  const user = current?.user ?? null
  const error = current?.error ?? ""

  useEffect(() => {
    if (!id) return
    let alive = true
    adminApi<UserDetail>(`/admin/users/${encodeURIComponent(id)}`)
      .then((u) => alive && setResult({ key, user: u }))
      .catch((e: Error) => alive && setResult({ key, error: e.message }))
    return () => {
      alive = false
    }
  }, [id, key])

  return (
    <Sheet open={id !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {error ? (
          <div className="flex flex-col items-start gap-3 p-6">
            <SheetTitle>Couldn&apos;t load this user</SheetTitle>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={() => setAttempt((a) => a + 1)}>
              Try again
            </Button>
          </div>
        ) : !user ? (
          <div className="flex flex-col gap-3 p-6">
            <SheetTitle className="sr-only">Loading user</SheetTitle>
            <div className="flex items-center gap-3">
              <Skeleton className="size-14 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
            </div>
            <Skeleton className="mt-4 h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader className="flex-row items-center gap-3">
              <Avatar className="size-14">
                <AvatarImage src={avatarUrl(user.avatar, user.id)} alt="" />
                <AvatarFallback>{initials(user.name, user.email)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <SheetTitle className="truncate">{user.name ?? user.email ?? "No name"}</SheetTitle>
                <SheetDescription className="truncate">{user.email ?? "No email"}</SheetDescription>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Badge variant={user.premium ? "default" : "secondary"}>{user.premium ? "Premium" : "Free"}</Badge>
                  <Badge variant="outline">{user.emailVerified ? "Verified" : "Not verified"}</Badge>
                  {user.firebase?.disabled ? <Badge variant="destructive">Sign-in disabled</Badge> : null}
                  {user.deletedAt ? <Badge variant="destructive">Being deleted</Badge> : null}
                </div>
              </div>
            </SheetHeader>

            <div className="flex flex-col gap-6 px-6 pb-8">
              <Section title="Account">
                <Facts
                  rows={[
                    ["Signs in with", user.provider === "google.com" ? "Google" : user.provider === "password" ? "Email and password" : (user.provider ?? "—")],
                    ["Joined", formatDay(user.createdAt)],
                    ["Last sign-in", user.firebase ? formatDayTime(user.firebase.lastSignInAt) : "Unknown (no Firebase account)"],
                    ["Consent", user.consentAt ? `${formatDay(user.consentAt)} (v${user.consentVersion ?? "?"})` : "Not given"],
                    ["Typed answers", user.allowTyping ? "Allowed" : "Off"],
                    ["Sessions started on last day", user.sessionDay ? `${user.sessionCount} on ${user.sessionDay}` : "—"],
                    ["User ID", <code key="id" className="text-xs break-all">{user.id}</code>],
                  ]}
                />
              </Section>

              <Section title={`Projects (${user.projects.length})`}>
                {user.projects.length ? (
                  <ul className="flex flex-col divide-y">
                    {user.projects.map((p) => (
                      <li key={p.id} className="flex items-center gap-3 py-2 text-sm">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.domain} · {formatDay(p.createdAt)}
                          </p>
                        </div>
                        <Badge variant={p.status === "failed" ? "destructive" : "outline"}>{p.status}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty>No projects.</Empty>
                )}
              </Section>

              <Section title={`Recent sessions (${user.sessions.length} of ${user.totalSessions})`}>
                {user.sessions.length ? (
                  <ul className="flex flex-col divide-y">
                    {user.sessions.map((s) => (
                      <li key={s.id} className="flex items-center gap-3 py-2 text-sm">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{s.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {MODE_LABELS[s.mode]} · {formatDay(s.createdAt)}
                          </p>
                        </div>
                        <span className="tabular-nums text-sm">
                          {s.status === "ready" && s.score !== null ? (
                            <>
                              <span className="font-semibold">{s.score}</span>
                              <span className="text-muted-foreground"> · {s.band}</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">{s.status}</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty>No sessions yet.</Empty>
                )}
              </Section>

              <Section title={`Groups (${user.groups.length})`}>
                {user.groups.length ? (
                  <ul className="flex flex-col divide-y">
                    {user.groups.map((g) => (
                      <li key={g.code} className="flex items-center gap-3 py-2 text-sm">
                        <code className="font-mono">{g.code}</code>
                        <span className="flex-1 text-muted-foreground">joined {formatDay(g.joinedAt)}</span>
                        <Badge variant="outline">{g.role}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty>Not in a group.</Empty>
                )}
              </Section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <Separator />
      {children}
    </section>
  )
}

function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="min-w-0">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

const Empty = ({ children }: { children: ReactNode }) => <p className="py-2 text-sm text-muted-foreground">{children}</p>
