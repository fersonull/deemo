"use client"

import { SearchIcon } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

import { Pager } from "@/components/pager"
import { UserSheet } from "@/components/user-sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAdminData } from "@/hooks/use-admin-data"
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
// Pages come from the server, 25 at a time.
export function UsersView() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const q = params.get("q") ?? ""
  const plan = params.get("plan") ?? "all"
  const verified = params.get("verified") ?? "all"
  const page = Math.max(1, Number(params.get("page")) || 1)
  const open = params.get("user")
  const [draft, setDraft] = useState(q)

  const query = new URLSearchParams({ page: String(page) })
  if (q) query.set("q", q)
  if (plan !== "all") query.set("plan", plan)
  if (verified !== "all") query.set("verified", verified)
  const { data, error, reload } = useAdminData<UserPage>(`/admin/users?${query}`)

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "" || v === "all" || (k === "page" && v === "1")) next.delete(k)
      else next.set(k, v)
    }
    if (!("page" in patch) && !("user" in patch)) next.delete("page") // a new search starts at page 1
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false })
  }

  // Search as you type, after a short pause.
  useEffect(() => {
    if (draft === q) return
    const t = setTimeout(() => update({ q: draft.trim() }), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="list-search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && e.currentTarget.blur()}
            placeholder="Search by name or email"
            aria-label="Search users"
            className="pr-10 pl-9"
          />
          <Kbd className="absolute top-1/2 right-2 -translate-y-1/2">/</Kbd>
        </div>
        <Select items={PLAN} value={plan} onValueChange={(v) => update({ plan: v as string })}>
          <SelectTrigger className="w-36" aria-label="Plan">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLAN.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select items={VERIFIED} value={verified} onValueChange={(v) => update({ verified: v as string })}>
          <SelectTrigger className="w-40" aria-label="Email verification">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VERIFIED.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="ml-auto text-sm text-muted-foreground tabular-nums">
          {data ? `${data.total.toLocaleString()} ${data.total === 1 ? "user" : "users"}` : ""}
        </p>
      </div>

      {error && !data ? (
        <div className="flex flex-col items-start gap-3 border p-6">
          <p className="text-sm font-medium">Couldn&apos;t load users</p>
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
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                <TableHead className="text-right">Projects</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
                <TableHead className="hidden lg:table-cell">Last session</TableHead>
                <TableHead className="hidden sm:table-cell">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data
                ? Array.from({ length: 8 }, (_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}>
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
                      <TableCell className="hidden lg:table-cell">{formatDay(u.lastSessionAt)}</TableCell>
                      <TableCell className="hidden sm:table-cell">{formatDay(u.createdAt)}</TableCell>
                    </TableRow>
                  ))}
              {data && !data.users.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
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
