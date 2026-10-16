"use client"

import { FilterSelect, ListSearch, LoadError } from "@/components/list-controls"
import { Pager } from "@/components/pager"
import { UserSheet } from "@/components/user-sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAdminData } from "@/hooks/use-admin-data"
import { useUrlParams } from "@/hooks/use-url-params"
import type { UserPage } from "@/lib/api"
import { avatarUrl, formatDay, initials } from "@/lib/format"

const PLAN = [
  { value: "all", label: "Any plan" },
  { value: "premium", label: "Premium" },
  { value: "free", label: "Free" },
]
const VERIFIED = [
  { value: "all", label: "Any status" },
  { value: "true", label: "Verified" },
  { value: "false", label: "Not verified" },
]

// The user table. Search, filters, page and the open user live in the URL, so a view can be reloaded or shared.
// Pages come from the server, 25 at a time. "Today" is practice sessions started today against the daily cap.
export function UsersView() {
  const { get, page, update, query } = useUrlParams()
  const plan = get("plan", "all")
  const verified = get("verified", "all")
  const open = get("user") || null
  const { data, error, reload } = useAdminData<UserPage>(`/admin/users?${query(["q", "plan", "verified"])}`)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <ListSearch value={get("q")} onSearch={(q) => update({ q })} placeholder="Search by name or email" />
        <FilterSelect label="Plan" value={plan} options={PLAN} onChange={(v) => update({ plan: v })} className="w-36" />
        <FilterSelect label="Email verification" value={verified} options={VERIFIED} onChange={(v) => update({ verified: v })} />
        <p className="ml-auto text-sm text-muted-foreground tabular-nums">
          {data ? `${data.total.toLocaleString()} ${data.total === 1 ? "user" : "users"}` : ""}
        </p>
      </div>

      {error && !data ? (
        <LoadError what="users" error={error} onRetry={reload} />
      ) : (
        <div className="border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                <TableHead className="text-right">Projects</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
                <TableHead className="hidden text-right md:table-cell">Today</TableHead>
                <TableHead className="hidden lg:table-cell">Last session</TableHead>
                <TableHead className="hidden sm:table-cell">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data
                ? Array.from({ length: 8 }, (_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : data.users.map((u) => (
                    <TableRow
                      key={u.id}
                      tabIndex={0}
                      onClick={() => update({ user: u.id })}
                      onKeyDown={(e) => e.key === "Enter" && update({ user: u.id })}
                      className="cursor-pointer"
                      data-state={open === u.id ? "selected" : undefined}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarImage src={avatarUrl(u.avatar, u.id)} alt="" />
                            <AvatarFallback>{initials(u.name, u.email)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{u.name ?? "No name"}</p>
                            <p className="truncate text-xs text-muted-foreground">{u.email ?? "No email"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.premium ? "default" : "secondary"}>{u.premium ? "Premium" : "Free"}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {u.deletedAt ? (
                          <Badge variant="destructive">Being deleted</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">{u.emailVerified ? "Verified" : "Not verified"}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{u.projects}</TableCell>
                      <TableCell className="text-right tabular-nums">{u.sessions}</TableCell>
                      <TableCell className="hidden text-right tabular-nums md:table-cell">
                        <span className={u.usedToday >= u.dailyCap ? "font-semibold" : "text-muted-foreground"}>
                          {u.usedToday} / {u.dailyCap}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">{formatDay(u.lastSessionAt)}</TableCell>
                      <TableCell className="hidden sm:table-cell">{formatDay(u.createdAt)}</TableCell>
                    </TableRow>
                  ))}
              {data && !data.users.length ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    No users match.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      )}

      {data ? <Pager page={page} total={data.total} pageSize={data.pageSize} onPage={(p) => update({ page: String(p) })} /> : null}

      <UserSheet id={open} onClose={() => update({ user: null })} onChanged={reload} />
    </div>
  )
}
