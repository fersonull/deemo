"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type ReactNode } from "react"
import { toast } from "sonner"

import { useAdmin } from "@/components/auth-gate"
import { useDetailCrumb } from "@/components/breadcrumbs"
import { LoadError } from "@/components/list-controls"
import { Pager } from "@/components/pager"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useAdminData } from "@/hooks/use-admin-data"
import { adminApi, type SessionPage, type UserDetail } from "@/lib/api"
import {
  avatarUrl,
  formatDay,
  formatDayTime,
  initials,
  MODE_LABELS,
} from "@/lib/format"

// One student's page: account, sign-in facts from Firebase, projects, sessions (paged on the server), groups, and the
// admin actions (Premium, daily reset, sign-in on or off, delete). Every action is recorded in the audit log.
export function UserDetailView({ id }: { id: string }) {
  const router = useRouter()
  const {
    data: user,
    error,
    reload,
  } = useAdminData<UserDetail>(`/admin/users/${encodeURIComponent(id)}`)
  useDetailCrumb(user ? (user.name ?? user.email ?? "No name") : null)

  if (error && !user)
    return <LoadError what="this user" error={error} onRetry={reload} />
  if (!user)
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-center gap-4">
        <Avatar className="size-16">
          <AvatarImage src={avatarUrl(user.avatar, user.id)} alt="" />
          <AvatarFallback>{initials(user.name, user.email)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-heading text-2xl font-semibold tracking-tight">
            {user.name ?? user.email ?? "No name"}
          </h2>
          <p className="truncate text-sm text-muted-foreground">
            {user.email ?? "No email"}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant={user.premium ? "default" : "secondary"}>
              {user.premium ? "Premium" : "Free"}
            </Badge>
            <Badge variant="outline">
              {user.emailVerified ? "Verified" : "Not verified"}
            </Badge>
            {user.firebase?.disabled ? (
              <Badge variant="destructive">Sign-in disabled</Badge>
            ) : null}
            {user.deletedAt ? (
              <Badge variant="destructive">Being deleted</Badge>
            ) : null}
          </div>
        </div>
      </header>

      <div>
        <Button
          variant="outline"
          render={
            <Link href={`/notices?user=${encodeURIComponent(user.id)}`} />
          }
        >
          Send notice
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="flex flex-col gap-8">
          <Actions
            user={user}
            onChanged={reload}
            onDeleted={() => router.push("/users")}
          />

          <Section title="Account">
            <Facts
              rows={[
                [
                  "Signs in with",
                  user.provider === "google.com"
                    ? "Google"
                    : user.provider === "password"
                      ? "Email and password"
                      : (user.provider ?? "—"),
                ],
                ["Joined", formatDay(user.createdAt)],
                [
                  "Last sign-in",
                  user.firebase
                    ? formatDayTime(user.firebase.lastSignInAt)
                    : "Unknown (no Firebase account)",
                ],
                [
                  "Consent",
                  user.consentAt
                    ? `${formatDay(user.consentAt)} (v${user.consentVersion ?? "?"})`
                    : "Not given",
                ],
                ["Course", user.course ?? "Not answered yet"],
                ["Typed answers", user.allowTyping ? "Allowed" : "Off"],
                [
                  "User ID",
                  <code key="id" className="text-xs break-all">
                    {user.id}
                  </code>,
                ],
              ]}
            />
          </Section>
        </div>

        <div className="flex flex-col gap-8">
          <Sessions userId={user.id} total={user.totalSessions} />

          <Section title={`Projects (${user.projects.length})`}>
            {user.projects.length ? (
              <ul className="flex flex-col divide-y">
                {user.projects.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 py-2 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/projects?q=${encodeURIComponent(p.name)}`}
                        className="truncate font-medium underline-offset-4 hover:underline"
                      >
                        {p.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {p.domain} · {formatDay(p.createdAt)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        p.status === "failed" ? "destructive" : "outline"
                      }
                    >
                      {p.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No projects.</Empty>
            )}
          </Section>

          <Section title={`Groups (${user.groups.length})`}>
            {user.groups.length ? (
              <ul className="flex flex-col divide-y">
                {user.groups.map((g) => (
                  <li
                    key={g.code}
                    className="flex items-center gap-3 py-2 text-sm"
                  >
                    <Link
                      href={`/groups?q=${g.code}`}
                      className="font-mono underline-offset-4 hover:underline"
                    >
                      {g.code}
                    </Link>
                    <span className="flex-1 text-muted-foreground">
                      joined {formatDay(g.joinedAt)}
                    </span>
                    <Badge variant="outline">{g.role}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>Not in a group.</Empty>
            )}
          </Section>
        </div>
      </div>
    </div>
  )
}

function Actions({
  user,
  onChanged,
  onDeleted,
}: {
  user: UserDetail
  onChanged: () => void
  onDeleted: () => void
}) {
  const admin = useAdmin()
  const [busy, setBusy] = useState<
    "premium" | "sign-in" | "delete" | "daily" | null
  >(null)
  const [confirm, setConfirm] = useState<"disable" | "delete" | null>(null)
  const [typed, setTyped] = useState("")
  const path = `/admin/users/${encodeURIComponent(user.id)}`
  const disabled = user.firebase?.disabled ?? false
  const deleteWord = user.email ?? "delete"

  if (user.id === admin.uid)
    return (
      <Section title="Actions">
        <Empty>This is your own account; change it in the app instead.</Empty>
      </Section>
    )

  const who = user.name ?? user.email ?? "this student"
  const run = async (
    kind: "premium" | "sign-in" | "delete" | "daily",
    call: () => Promise<unknown>,
    after: () => void,
    done: string
  ) => {
    setBusy(kind)
    try {
      await call()
      setConfirm(null)
      toast.success(done)
      after()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Section title="Actions">
      <div className="flex items-center gap-3 text-sm">
        <div className="flex-1">
          <p className="font-medium">Premium</p>
          <p className="text-xs text-muted-foreground">
            The simulated tier: every stage, three panelists, the full report.
          </p>
        </div>
        <Switch
          checked={user.premium}
          disabled={busy !== null}
          aria-label="Premium"
          onCheckedChange={(premium) =>
            run(
              "premium",
              () =>
                adminApi(`${path}/premium`, {
                  method: "PATCH",
                  body: { premium },
                }),
              onChanged,
              `Premium ${premium ? "on" : "off"} for ${who}.`
            )
          }
        />
      </div>

      {user.dailyCap === null ? (
        <div className="flex items-center gap-3 text-sm">
          <div className="flex-1">
            <p className="font-medium">Practice today: {user.usedToday}</p>
            <p className="text-xs text-muted-foreground">
              Premium has no daily limit.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-sm">
          <div className="flex-1">
            <p className="font-medium">
              Practice today: {user.usedToday} of {user.dailyCap}
            </p>
            <p className="text-xs text-muted-foreground">
              {user.usedToday >= (user.dailyCap ?? Infinity)
                ? "At today's limit."
                : "Resets at midnight, Philippine time."}{" "}
              Reset gives today&apos;s sessions back.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={busy !== null || user.usedToday === 0}
            onClick={() =>
              run(
                "daily",
                () => adminApi(`${path}/reset-daily`, { method: "POST" }),
                onChanged,
                `Today's sessions given back to ${who}.`
              )
            }
          >
            {busy === "daily" ? "Resetting…" : "Reset"}
          </Button>
        </div>
      )}

      {user.firebase ? (
        <div className="flex items-center gap-3 text-sm">
          <div className="flex-1">
            <p className="font-medium">Sign-in</p>
            <p className="text-xs text-muted-foreground">
              {disabled
                ? "Turned off: the student can't sign in."
                : "On. Turning it off signs them out everywhere."}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={busy !== null}
            onClick={() =>
              disabled
                ? run(
                    "sign-in",
                    () =>
                      adminApi(`${path}/sign-in`, {
                        method: "PATCH",
                        body: { disabled: false },
                      }),
                    onChanged,
                    `Sign-in turned on for ${who}.`
                  )
                : setConfirm("disable")
            }
          >
            {busy === "sign-in" ? "Saving…" : disabled ? "Turn on" : "Turn off"}
          </Button>
        </div>
      ) : null}

      <div className="flex items-center gap-3 text-sm">
        <div className="flex-1">
          <p className="font-medium">Delete account</p>
          <p className="text-xs text-muted-foreground">
            Removes the sign-in account and all their data. Can&apos;t be
            undone.
          </p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          disabled={busy !== null}
          onClick={() => {
            setTyped("")
            setConfirm("delete")
          }}
        >
          Delete
        </Button>
      </div>

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && busy === null && setConfirm(null)}
      >
        <AlertDialogContent>
          {confirm === "disable" ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Turn off sign-in?</AlertDialogTitle>
                <AlertDialogDescription>
                  {user.email ?? "This student"} is signed out on every device
                  and can&apos;t sign in until you turn it back on. Their data
                  stays.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={busy !== null}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={busy !== null}
                  onClick={() =>
                    run(
                      "sign-in",
                      () =>
                        adminApi(`${path}/sign-in`, {
                          method: "PATCH",
                          body: { disabled: true },
                        }),
                      onChanged,
                      `Sign-in turned off for ${who}. They're signed out everywhere.`
                    )
                  }
                >
                  {busy === "sign-in" ? "Turning off…" : "Turn off sign-in"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this account?</AlertDialogTitle>
                <AlertDialogDescription>
                  The same as Delete my data in the app: the sign-in account,
                  manuscript analyses, sessions, reports and group memberships
                  are removed for good. Type{" "}
                  <span className="font-medium text-foreground">
                    {deleteWord}
                  </span>{" "}
                  to confirm.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                aria-label="Type to confirm"
                autoComplete="off"
              />
              <AlertDialogFooter>
                <AlertDialogCancel disabled={busy !== null}>
                  Keep the account
                </AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={busy !== null || typed.trim() !== deleteWord}
                  onClick={() =>
                    run(
                      "delete",
                      () => adminApi(path, { method: "DELETE" }),
                      onDeleted,
                      `${who}'s account and data were deleted.`
                    )
                  }
                >
                  {busy === "delete" ? "Deleting…" : "Delete for good"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </Section>
  )
}

function Sessions({ userId, total }: { userId: string; total: number }) {
  const [page, setPage] = useState(1)
  const { data, error, reload } = useAdminData<SessionPage>(
    `/admin/users/${encodeURIComponent(userId)}/sessions?page=${page}`
  )
  return (
    <Section title={`Sessions (${total})`}>
      {error && !data ? (
        <div className="flex items-center gap-3 py-2 text-sm">
          <span className="flex-1 text-muted-foreground">{error}</span>
          <Button variant="outline" size="sm" onClick={reload}>
            Try again
          </Button>
        </div>
      ) : !data ? (
        <Skeleton className="h-24 w-full" />
      ) : data.sessions.length ? (
        <>
          <ul className="flex flex-col divide-y">
            {data.sessions.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/sessions/${encodeURIComponent(s.id)}`}
                    className="block truncate font-medium underline-offset-4 hover:underline"
                  >
                    {s.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {MODE_LABELS[s.mode]} · {formatDay(s.createdAt)}
                  </p>
                </div>
                <span className="text-sm tabular-nums">
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
          <Pager
            page={page}
            total={data.total}
            pageSize={data.pageSize}
            onPage={setPage}
          />
        </>
      ) : (
        <Empty>No sessions yet.</Empty>
      )}
    </Section>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
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

const Empty = ({ children }: { children: ReactNode }) => (
  <p className="py-2 text-sm text-muted-foreground">{children}</p>
)
