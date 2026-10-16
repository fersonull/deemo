"use client"

import Link from "next/link"
import { useState, type ReactNode } from "react"

import { FilterSelect, ListSearch, LoadError } from "@/components/list-controls"
import { Pager } from "@/components/pager"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAdminData } from "@/hooks/use-admin-data"
import { useUrlParams } from "@/hooks/use-url-params"
import { adminApi, type AdminSessionPage, type SessionReport } from "@/lib/api"
import { displayName, formatDay, formatDayTime, formatDuration, MODE_LABELS } from "@/lib/format"

const MODES = [
  { value: "all", label: "Any stage" },
  { value: "TITLE", label: "Title" },
  { value: "PRE_ORAL", label: "Pre-Oral" },
  { value: "FINAL", label: "Final" },
]
const STATUSES = [
  { value: "all", label: "Any status" },
  { value: "ready", label: "Scored" },
  { value: "scoring", label: "Scoring" },
  { value: "failed", label: "Failed" },
]

const statusBadge = (s: { status: string; stuck: boolean }) =>
  s.status === "failed" || s.stuck ? (
    <Badge variant="destructive">{s.stuck ? "Stuck" : "Failed"}</Badge>
  ) : s.status === "scoring" ? (
    <Badge variant="outline">Scoring</Badge>
  ) : null

// Every practice session across students, newest first (server pages of 25). A row opens the report summary.
export function SessionsView() {
  const { get, page, update, query } = useUrlParams()
  const open = get("session") || null
  const { data, error, reload } = useAdminData<AdminSessionPage>(`/admin/sessions?${query(["q", "mode", "status", "from", "to"])}`)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <ListSearch value={get("q")} onSearch={(q) => update({ q })} placeholder="Search by title or student" />
        <FilterSelect label="Stage" value={get("mode", "all")} options={MODES} onChange={(v) => update({ mode: v })} className="w-36" />
        <FilterSelect label="Status" value={get("status", "all")} options={STATUSES} onChange={(v) => update({ status: v })} className="w-36" />
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Input type="date" aria-label="From" value={get("from")} onChange={(e) => update({ from: e.target.value })} className="w-38" />
          <span>to</span>
          <Input type="date" aria-label="To" value={get("to")} onChange={(e) => update({ to: e.target.value })} className="w-38" />
        </div>
        <p className="ml-auto text-sm text-muted-foreground tabular-nums">
          {data ? `${data.total.toLocaleString()} ${data.total === 1 ? "session" : "sessions"}` : ""}
        </p>
      </div>

      {error && !data ? (
        <LoadError what="sessions" error={error} onRetry={reload} />
      ) : (
        <div className="border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Student</TableHead>
                <TableHead className="hidden md:table-cell">Stage</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="hidden lg:table-cell">Length</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data
                ? Array.from({ length: 8 }, (_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-7 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : data.sessions.map((s) => (
                    <TableRow
                      key={s.id}
                      tabIndex={0}
                      onClick={() => update({ session: s.id })}
                      onKeyDown={(e) => e.key === "Enter" && update({ session: s.id })}
                      className="cursor-pointer"
                      data-state={open === s.id ? "selected" : undefined}
                    >
                      <TableCell className="max-w-72">
                        <p className="truncate font-medium">{s.title}</p>
                      </TableCell>
                      <TableCell className="max-w-48">
                        <p className="truncate">{displayName(s.user)}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{MODE_LABELS[s.mode]}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {s.score !== null ? (
                          <>
                            <span className="font-semibold">{s.score}</span>
                            <span className="hidden text-muted-foreground xl:inline"> · {s.band}</span>
                          </>
                        ) : (
                          (statusBadge(s) ?? <span className="text-muted-foreground">Not scored</span>)
                        )}
                      </TableCell>
                      <TableCell className="hidden tabular-nums lg:table-cell">{formatDuration(s.durationMs)}</TableCell>
                      <TableCell className="hidden sm:table-cell">{formatDay(s.createdAt)}</TableCell>
                    </TableRow>
                  ))}
              {data && !data.sessions.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    No sessions match.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      )}

      {data ? <Pager page={page} total={data.total} pageSize={data.pageSize} onPage={(p) => update({ page: String(p) })} /> : null}

      <SessionSheet id={open} onClose={() => update({ session: null })} onChanged={reload} />
    </div>
  )
}

// One session's report summary. No transcript or answers: those stay with the student.
function SessionSheet({ id, onClose, onChanged }: { id: string | null; onClose: () => void; onChanged: () => void }) {
  const { data: s, error, reload } = useAdminData<SessionReport>(id ? `/admin/sessions/${encodeURIComponent(id)}` : null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState("")

  const rescore = async () => {
    if (!s) return
    setBusy(true)
    setActionError("")
    try {
      await adminApi(`/admin/sessions/${encodeURIComponent(s.id)}/rescore`, { method: "POST" })
      reload()
      onChanged()
    } catch (e) {
      setActionError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={id !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {error && !s ? (
          <div className="flex flex-col items-start gap-3 p-6">
            <SheetTitle>Couldn&apos;t load this session</SheetTitle>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={reload}>
              Try again
            </Button>
          </div>
        ) : !s ? (
          <div className="flex flex-col gap-3 p-6">
            <SheetTitle className="sr-only">Loading session</SheetTitle>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="mt-4 h-40 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>{s.title}</SheetTitle>
              <SheetDescription>
                {MODE_LABELS[s.mode]} · {formatDayTime(s.createdAt)} ·{" "}
                <Link href={`/users?user=${encodeURIComponent(s.user.id)}`} className="underline underline-offset-4">
                  {displayName(s.user)}
                </Link>
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-6 px-6 pb-8">
              {s.status !== "ready" ? (
                <Section title="Scoring">
                  <p className="text-sm">{s.status === "failed" ? (s.error ?? "Scoring failed.") : "Still being scored."}</p>
                  <div className="flex items-center gap-3">
                    <Button size="sm" onClick={rescore} disabled={busy}>
                      {busy ? "Starting…" : "Score again"}
                    </Button>
                    <span className="text-xs text-muted-foreground">Uses the same scoring as the app&apos;s Try again.</span>
                  </div>
                  {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}
                </Section>
              ) : null}

              {s.report ? (
                <>
                  <Section title="Result">
                    <div className="flex items-baseline gap-3">
                      <span className="font-heading text-4xl font-semibold tabular-nums">{s.report.scored ? s.report.score : "—"}</span>
                      <span className="text-sm font-medium">{s.report.band}</span>
                    </div>
                    <p className="text-sm">{s.report.headline}</p>
                    <Facts
                      rows={[
                        ["Rubric score", `${s.report.rubricScore}`],
                        ["Consistency penalty", `−${s.report.penalty}`],
                        ["Main questions answered", `${s.report.answered} of ${s.report.planned}`],
                        ["Judged by", s.report.model ?? "—"],
                      ]}
                    />
                  </Section>

                  {s.report.criteria.length ? (
                    <Section title="Rubric">
                      <ul className="flex flex-col divide-y">
                        {s.report.criteria.map((c) => (
                          <li key={c.name} className="flex flex-col gap-1 py-2 text-sm">
                            <div className="flex items-baseline gap-2">
                              <span className="flex-1 font-medium">{c.name}</span>
                              <span className="text-xs text-muted-foreground tabular-nums">{Math.round(c.weight)}%</span>
                              <span className="w-14 text-right tabular-nums">{c.level === null ? "—" : `${c.level} / 5`}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{c.why}</p>
                          </li>
                        ))}
                      </ul>
                    </Section>
                  ) : null}

                  <Section title={`Contradictions (${s.report.contradictions.length})`}>
                    {s.report.contradictions.length ? (
                      <ul className="flex flex-col divide-y">
                        {s.report.contradictions.map((c, i) => (
                          <li key={i} className="flex flex-col gap-1 py-2 text-sm">
                            <Badge variant="outline" className="w-fit">
                              {c.severity.toLowerCase()}
                            </Badge>
                            <p>
                              <span className="text-muted-foreground">Said: </span>
                              {c.spokenClaim}
                            </p>
                            <p>
                              <span className="text-muted-foreground">Paper: </span>
                              {c.manuscriptEvidence}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">None found.</p>
                    )}
                  </Section>

                  {s.report.fixes.length ? (
                    <Section title="Top fixes">
                      <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
                        {s.report.fixes.map((f, i) => (
                          <li key={i}>{f.text}</li>
                        ))}
                      </ol>
                    </Section>
                  ) : null}
                </>
              ) : null}

              <Section title="Setup">
                <Facts
                  rows={[
                    ["Planned length", `${s.minutes} min`],
                    ["Actual length", formatDuration(s.durationMs)],
                    ["Panelists", `${s.panelists}`],
                    ["Follow-ups", `${s.followUps}`],
                    ["Difficulty", s.difficulty.toLowerCase()],
                    ["Ended by", s.endedBy],
                    ["Group", s.groupCode ?? "—"],
                  ]}
                />
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
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      <Separator />
      {children}
    </section>
  )
}

function Facts({ rows }: { rows: [string, string][] }) {
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
