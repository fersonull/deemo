"use client"

import Link from "next/link"

import { ListSearch, LoadError } from "@/components/list-controls"
import { Pager } from "@/components/pager"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useAdminData } from "@/hooks/use-admin-data"
import { useUrlParams } from "@/hooks/use-url-params"
import type { AdminGroupPage } from "@/lib/api"
import { displayName, formatDay } from "@/lib/format"

// Capstone groups: the code, the leader, the shared project and each member (focus area, whether they share scores).
export function GroupsView() {
  const { get, page, update, query } = useUrlParams()
  const { data, error, reload } = useAdminData<AdminGroupPage>(`/admin/groups?${query(["q"])}`)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <ListSearch value={get("q")} onSearch={(q) => update({ q })} placeholder="Search by code, project or leader" />
        <p className="ml-auto text-sm text-muted-foreground tabular-nums">
          {data ? `${data.total.toLocaleString()} ${data.total === 1 ? "group" : "groups"}` : ""}
        </p>
      </div>

      {error && !data ? (
        <LoadError what="groups" error={error} onRetry={reload} />
      ) : !data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : !data.groups.length ? (
        <p className="border p-6 text-center text-sm text-muted-foreground">No groups match.</p>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {data.groups.map((g) => (
            <li key={g.code} className="flex flex-col gap-3 border p-4">
              <div className="flex items-baseline gap-3">
                <code className="font-mono text-base font-semibold tracking-wider">{g.code}</code>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{g.project.name}</span>
                <span className="text-xs text-muted-foreground">since {formatDay(g.createdAt)}</span>
              </div>
              <ul className="flex flex-col divide-y text-sm">
                <Member href={g.owner.id} name={displayName(g.owner)} role="Leader" />
                {g.members.map((m) => (
                  <Member
                    key={m.user.id}
                    href={m.user.id}
                    name={displayName(m.user)}
                    role={m.focusArea || "No focus area"}
                    sharing={m.shareScore}
                  />
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {data ? <Pager page={page} total={data.total} pageSize={data.pageSize} onPage={(p) => update({ page: String(p) })} /> : null}
    </div>
  )
}

function Member({ href, name, role, sharing }: { href: string; name: string; role: string; sharing?: boolean }) {
  return (
    <li className="flex items-center gap-3 py-2">
      <Link href={`/users?user=${encodeURIComponent(href)}`} className="min-w-0 flex-1 truncate underline-offset-4 hover:underline">
        {name}
      </Link>
      <span className="max-w-48 truncate text-xs text-muted-foreground">{role}</span>
      {sharing === undefined ? null : <Badge variant={sharing ? "outline" : "secondary"}>{sharing ? "Shares score" : "Private"}</Badge>}
    </li>
  )
}
