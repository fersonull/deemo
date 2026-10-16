"use client"

import { useRouter } from "next/navigation"

import { useRememberList } from "@/components/breadcrumbs"
import { FilterSelect, ListSearch, LoadError } from "@/components/list-controls"
import { Pager } from "@/components/pager"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAdminData } from "@/hooks/use-admin-data"
import { useUrlParams } from "@/hooks/use-url-params"
import type { AdminSessionPage } from "@/lib/api"
import {
  displayName,
  formatDay,
  formatDuration,
  MODE_LABELS,
} from "@/lib/format"

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

// Every practice session across students, newest first (server pages of 25). A row opens the session's page.
export function SessionsView() {
  const { get, page, update, query } = useUrlParams()
  const router = useRouter()
  useRememberList()
  const { data, error, reload } = useAdminData<AdminSessionPage>(
    `/admin/sessions?${query(["q", "mode", "status", "from", "to"])}`
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <ListSearch
          value={get("q")}
          onSearch={(q) => update({ q })}
          placeholder="Search by title or student"
        />
        <FilterSelect
          label="Stage"
          value={get("mode", "all")}
          options={MODES}
          onChange={(v) => update({ mode: v })}
          className="w-36"
        />
        <FilterSelect
          label="Status"
          value={get("status", "all")}
          options={STATUSES}
          onChange={(v) => update({ status: v })}
          className="w-36"
        />
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Input
            type="date"
            aria-label="From"
            value={get("from")}
            onChange={(e) => update({ from: e.target.value })}
            className="w-38"
          />
          <span>to</span>
          <Input
            type="date"
            aria-label="To"
            value={get("to")}
            onChange={(e) => update({ to: e.target.value })}
            className="w-38"
          />
        </div>
        <p className="ml-auto text-sm text-muted-foreground tabular-nums">
          {data
            ? `${data.total.toLocaleString()} ${data.total === 1 ? "session" : "sessions"}`
            : ""}
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
                      onClick={() =>
                        router.push(`/sessions/${encodeURIComponent(s.id)}`)
                      }
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        router.push(`/sessions/${encodeURIComponent(s.id)}`)
                      }
                      className="cursor-pointer"
                    >
                      <TableCell className="max-w-72">
                        <p className="truncate font-medium">{s.title}</p>
                      </TableCell>
                      <TableCell className="max-w-48">
                        <p className="truncate">{displayName(s.user)}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {MODE_LABELS[s.mode]}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {s.score !== null ? (
                          <>
                            <span className="font-semibold">{s.score}</span>
                            <span className="hidden text-muted-foreground xl:inline">
                              {" "}
                              · {s.band}
                            </span>
                          </>
                        ) : (
                          (statusBadge(s) ?? (
                            <span className="text-muted-foreground">
                              Not scored
                            </span>
                          ))
                        )}
                      </TableCell>
                      <TableCell className="hidden tabular-nums lg:table-cell">
                        {formatDuration(s.durationMs)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {formatDay(s.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
              {data && !data.sessions.length ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No sessions match.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      )}

      {data ? (
        <Pager
          page={page}
          total={data.total}
          pageSize={data.pageSize}
          onPage={(p) => update({ page: String(p) })}
        />
      ) : null}
    </div>
  )
}
