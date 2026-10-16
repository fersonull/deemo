"use client"

import Link from "next/link"
import { useState, type ReactNode } from "react"
import { toast } from "sonner"

import { useDetailCrumb } from "@/components/breadcrumbs"
import { LoadError } from "@/components/list-controls"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useAdminData } from "@/hooks/use-admin-data"
import { adminApi, type SessionReport } from "@/lib/api"
import {
  displayName,
  formatDayTime,
  formatDuration,
  MODE_LABELS,
} from "@/lib/format"

// One session's page: the report summary. No transcript or answers: those stay with the student.
export function SessionDetailView({ id }: { id: string }) {
  const {
    data: s,
    error,
    reload,
  } = useAdminData<SessionReport>(`/admin/sessions/${encodeURIComponent(id)}`)
  useDetailCrumb(s ? s.title : null)
  const [busy, setBusy] = useState(false)

  const rescore = async () => {
    if (!s) return
    setBusy(true)
    try {
      await adminApi(`/admin/sessions/${encodeURIComponent(s.id)}/rescore`, {
        method: "POST",
      })
      toast.success("Scoring again. The result appears here in a minute or so.")
      reload()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (error && !s)
    return <LoadError what="this session" error={error} onRetry={reload} />
  if (!s)
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          {s.title}
        </h2>
        <p className="text-sm text-muted-foreground">
          {MODE_LABELS[s.mode]} · {formatDayTime(s.createdAt)} ·{" "}
          <Link
            href={`/users/${encodeURIComponent(s.user.id)}`}
            className="underline underline-offset-4"
          >
            {displayName(s.user)}
          </Link>
        </p>
      </header>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-8">
          {s.status !== "ready" ? (
            <Section title="Scoring">
              <p className="text-sm">
                {s.status === "failed"
                  ? (s.error ?? "Scoring failed.")
                  : "Still being scored."}
              </p>
              <div className="flex items-center gap-3">
                <Button size="sm" onClick={rescore} disabled={busy}>
                  {busy ? "Starting…" : "Score again"}
                </Button>
                <span className="text-xs text-muted-foreground">
                  Uses the same scoring as the app&apos;s Try again.
                </span>
              </div>
            </Section>
          ) : null}

          {s.report ? (
            <>
              <Section title="Result">
                <div className="flex items-baseline gap-3">
                  <span className="font-heading text-4xl font-semibold tabular-nums">
                    {s.report.scored ? s.report.score : "—"}
                  </span>
                  <span className="text-sm font-medium">{s.report.band}</span>
                </div>
                <p className="text-sm">{s.report.headline}</p>
                <Facts
                  rows={[
                    ["Rubric score", `${s.report.rubricScore}`],
                    ["Consistency penalty", `−${s.report.penalty}`],
                    [
                      "Main questions answered",
                      `${s.report.answered} of ${s.report.planned}`,
                    ],
                    ["Judged by", s.report.model ?? "—"],
                  ]}
                />
              </Section>

              {s.report.criteria.length ? (
                <Section title="Rubric">
                  <ul className="flex flex-col divide-y">
                    {s.report.criteria.map((c) => (
                      <li
                        key={c.name}
                        className="flex flex-col gap-1 py-2 text-sm"
                      >
                        <div className="flex items-baseline gap-2">
                          <span className="flex-1 font-medium">{c.name}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {Math.round(c.weight)}%
                          </span>
                          <span className="w-14 text-right tabular-nums">
                            {c.level === null ? "—" : `${c.level} / 5`}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{c.why}</p>
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : null}

              <Section
                title={`Contradictions (${s.report.contradictions.length})`}
              >
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
        </div>
        <div className="flex flex-col gap-8">
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
      </div>
    </div>
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
