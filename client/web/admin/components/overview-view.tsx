"use client"

import Link from "next/link"

import { DayBars } from "@/components/day-bars"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAdminData } from "@/hooks/use-admin-data"
import type { Overview } from "@/lib/api"
import { displayName, formatDayTime, MODE_LABELS } from "@/lib/format"

// The first page: headline counts, sign-ups and sessions per day, and what needs attention.
export function OverviewView() {
  const { data, error, reload } = useAdminData<Overview>("/admin/overview")

  if (error && !data)
    return (
      <div className="flex flex-col items-start gap-3 border p-6">
        <p className="text-sm font-medium">Couldn&apos;t load the overview</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" onClick={reload}>
          Try again
        </Button>
      </div>
    )

  if (!data)
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    )

  const { counts, readiness, attention } = data
  const stats: { label: string; value: string; note?: string; href?: string }[] = [
    { label: "Students", value: counts.users.toLocaleString(), note: `${counts.verified.toLocaleString()} verified`, href: "/users" },
    { label: "New this week", value: counts.newThisWeek.toLocaleString(), href: "/users" },
    { label: "Premium", value: counts.premium.toLocaleString(), href: "/users?plan=premium" },
    { label: "Sessions this week", value: counts.sessionsThisWeek.toLocaleString(), href: "/sessions" },
    {
      label: "Average readiness",
      value: readiness.average === null ? "—" : `${readiness.average}`,
      note: `${readiness.scored} scored in ${readiness.days} days`,
      href: "/sessions?status=ready",
    },
  ]
  const issues = attention.projects.length + attention.sessions.length

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-2 divide-x divide-y border sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
        {stats.map((s) => (
          <Link key={s.label} href={s.href ?? "#"} className="flex flex-col gap-1 p-4 transition-colors hover:bg-muted/50">
            <dt className="text-xs text-muted-foreground">{s.label}</dt>
            <dd className="font-heading text-2xl font-semibold tracking-tight tabular-nums">{s.value}</dd>
            {s.note ? <dd className="text-xs text-muted-foreground">{s.note}</dd> : null}
          </Link>
        ))}
      </dl>

      <div className="grid gap-4 lg:grid-cols-2">
        <DayBars title="Sign-ups" unit={["sign-up", "sign-ups"]} days={data.signups} />
        <DayBars title="Practice sessions" unit={["session", "sessions"]} days={data.sessions} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">
          Needs attention {issues ? <span className="text-muted-foreground">({issues})</span> : null}
        </h2>
        {!issues ? (
          <p className="border p-4 text-sm text-muted-foreground">Nothing failed or stuck. Every manuscript analysis and score finished.</p>
        ) : (
          <ul className="flex flex-col divide-y border">
            {attention.projects.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3 text-sm">
                <Badge variant="destructive">{p.stuck ? "Analysis stuck" : "Analysis failed"}</Badge>
                <Link href={`/projects?q=${encodeURIComponent(p.name)}`} className="font-medium underline-offset-4 hover:underline">
                  {p.name}
                </Link>
                <Link href={`/users?user=${encodeURIComponent(p.user.id)}`} className="text-muted-foreground underline-offset-4 hover:underline">
                  {displayName(p.user)}
                </Link>
                <span className="ml-auto text-xs text-muted-foreground">{formatDayTime(p.updatedAt)}</span>
                {p.error ? <p className="w-full text-xs text-muted-foreground">{p.error}</p> : null}
              </li>
            ))}
            {attention.sessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3 text-sm">
                <Badge variant="destructive">{s.stuck ? "Scoring stuck" : "Scoring failed"}</Badge>
                <Link href={`/sessions?session=${encodeURIComponent(s.id)}`} className="font-medium underline-offset-4 hover:underline">
                  {MODE_LABELS[s.mode]} · {s.title}
                </Link>
                <Link href={`/users?user=${encodeURIComponent(s.user.id)}`} className="text-muted-foreground underline-offset-4 hover:underline">
                  {displayName(s.user)}
                </Link>
                <span className="ml-auto text-xs text-muted-foreground">{formatDayTime(s.updatedAt)}</span>
                {s.error ? <p className="w-full text-xs text-muted-foreground">{s.error}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
