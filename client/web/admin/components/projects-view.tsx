"use client"

import Link from "next/link"

import { FilterSelect, ListSearch, LoadError } from "@/components/list-controls"
import { useRememberList } from "@/components/breadcrumbs"
import { Pager } from "@/components/pager"
import { Badge } from "@/components/ui/badge"
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
import type { AdminProjectPage } from "@/lib/api"
import { displayName, formatDay } from "@/lib/format"

const STATUSES = [
  { value: "all", label: "Any status" },
  { value: "ready", label: "Analyzed" },
  { value: "analyzing", label: "Analyzing" },
  { value: "failed", label: "Failed" },
]

const size = (bytes: number) =>
  bytes >= 1_048_576
    ? `${(bytes / 1_048_576).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`

// Every uploaded manuscript with its analysis status, and the reason when it failed. The analysis itself isn't shown.
export function ProjectsView() {
  useRememberList()
  const { get, page, update, query } = useUrlParams()
  const { data, error, reload } = useAdminData<AdminProjectPage>(
    `/admin/projects?${query(["q", "status"])}`
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <ListSearch
          value={get("q")}
          onSearch={(q) => update({ q })}
          placeholder="Search by project, file or student"
        />
        <FilterSelect
          label="Status"
          value={get("status", "all")}
          options={STATUSES}
          onChange={(v) => update({ status: v })}
        />
        <p className="ml-auto text-sm text-muted-foreground tabular-nums">
          {data
            ? `${data.total.toLocaleString()} ${data.total === 1 ? "manuscript" : "manuscripts"}`
            : ""}
        </p>
      </div>

      {error && !data ? (
        <LoadError what="manuscripts" error={error} onRetry={reload} />
      ) : (
        <div className="border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Rubric</TableHead>
                <TableHead className="hidden sm:table-cell">Uploaded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data
                ? Array.from({ length: 6 }, (_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : data.projects.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="max-w-72">
                        <p className="truncate font-medium">{p.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {p.fileName} · {size(p.sizeBytes)} · {p.domain}
                          {p.groupCode ? ` · group ${p.groupCode}` : ""}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-48">
                        <Link
                          href={`/users/${encodeURIComponent(p.user.id)}`}
                          className="truncate underline-offset-4 hover:underline"
                        >
                          {displayName(p.user)}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-72">
                        {p.status === "failed" || p.stuck ? (
                          <div className="flex flex-col gap-1">
                            <Badge variant="destructive" className="w-fit">
                              {p.stuck ? "Stuck" : "Failed"}
                            </Badge>
                            {p.error ? (
                              <span className="text-xs whitespace-normal text-muted-foreground">
                                {p.error}
                              </span>
                            ) : null}
                          </div>
                        ) : p.status === "analyzing" ? (
                          <Badge variant="outline">Analyzing</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {p.confirmedAt
                              ? "Confirmed"
                              : "Analyzed, not confirmed"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden max-w-48 lg:table-cell">
                        <span className="truncate text-sm text-muted-foreground">
                          {p.rubric ?? "Default criteria"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {formatDay(p.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
              {data && !data.projects.length ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No manuscripts match.
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
