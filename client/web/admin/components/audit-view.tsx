"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { useRememberList } from "@/components/breadcrumbs"
import { Pager } from "@/components/pager"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import type { AdminAction, AuditPage } from "@/lib/api"
import { formatDayTime } from "@/lib/format"

const LABELS: Record<
  AdminAction["action"],
  { label: string; destructive?: boolean }
> = {
  premium_on: { label: "Premium on" },
  premium_off: { label: "Premium off" },
  sign_in_disabled: { label: "Sign-in turned off", destructive: true },
  sign_in_enabled: { label: "Sign-in turned on" },
  account_deleted: { label: "Account deleted", destructive: true },
  daily_reset: { label: "Daily sessions reset" },
  session_rescored: { label: "Session scored again" },
  admin_granted: { label: "Admin access given" },
  admin_revoked: { label: "Admin access removed", destructive: true },
}

// Every change an admin made, newest first, 25 to a page (from the server).
export function AuditView() {
  useRememberList()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const page = Math.max(1, Number(params.get("page")) || 1)
  const { data, error, reload } = useAdminData<AuditPage>(
    `/admin/audit?page=${page}`
  )

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {data
          ? `${data.total.toLocaleString()} ${data.total === 1 ? "change" : "changes"} recorded`
          : "Every change an admin makes is recorded here."}
      </p>
      {error && !data ? (
        <div className="flex flex-col items-start gap-3 border p-6">
          <p className="text-sm font-medium">
            Couldn&apos;t load the audit log
          </p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={reload}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="hidden md:table-cell">By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data
                ? Array.from({ length: 6 }, (_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={4}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : data.actions.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {formatDayTime(a.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            LABELS[a.action]?.destructive
                              ? "destructive"
                              : "outline"
                          }
                        >
                          {LABELS[a.action]?.label ?? a.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-64">
                        {[
                          "account_deleted",
                          "admin_granted",
                          "admin_revoked",
                        ].includes(a.action) ? (
                          <span className="truncate text-muted-foreground">
                            {a.targetEmail ?? a.targetId}
                          </span>
                        ) : (
                          <Link
                            href={`/users/${encodeURIComponent(a.targetId)}`}
                            className="truncate underline-offset-4 hover:underline"
                          >
                            {a.targetEmail ?? a.targetId}
                          </Link>
                        )}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {a.adminEmail ?? a.adminId}
                      </TableCell>
                    </TableRow>
                  ))}
              {data && !data.actions.length ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No changes yet.
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
          onPage={(p) =>
            router.replace(p > 1 ? `${pathname}?page=${p}` : pathname, {
              scroll: false,
            })
          }
        />
      ) : null}
    </div>
  )
}
