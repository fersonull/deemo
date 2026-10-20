"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { SendIcon } from "lucide-react"
import { toast } from "sonner"

import { FilterSelect, LoadError } from "@/components/list-controls"
import { Pager } from "@/components/pager"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { useAdminData } from "@/hooks/use-admin-data"
import {
  adminApi,
  type Person,
  type SentNoticePage,
  type UserDetail,
  type UserPage,
} from "@/lib/api"
import { formatDayTime } from "@/lib/format"
import {
  describeSegment,
  FILTERS,
  hasFilter,
  type Segment,
} from "@/lib/notice-audience"
import {
  hasPlaceholder,
  NOTICE_TEMPLATES,
  type NoticeTemplate,
} from "@/lib/notice-templates"

export function NoticesView() {
  const params = useSearchParams()
  const seedId = params.get("user")
  const [audience, setAudience] = useState<"all" | "segment" | "user">(
    seedId ? "user" : "all"
  )
  const [segment, setSegment] = useState<Segment>({})
  const [reach, setReach] = useState<{ key: string; count: number } | null>(
    null
  )
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [chosen, setChosen] = useState<Person | null>(null)
  const seed = useAdminData<UserDetail>(
    seedId ? `/admin/users/${encodeURIComponent(seedId)}` : null
  )
  const recipient = chosen ?? seed.data
  const [query, setQuery] = useState("")
  const [search, setSearch] = useState("")
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)
  const requestId = useRef<string | null>(null)
  const sent = useAdminData<SentNoticePage>(`/admin/notices?page=${page}`)
  const [selected, setSelected] = useState<string[]>([])
  const [removing, setRemoving] = useState<string[]>([])
  const [deleting, setDeleting] = useState(false)
  const deletePending = useRef(false)
  const [deleteError, setDeleteError] = useState("")
  const selectedIds =
    sent.data?.notices
      .filter((n) => selected.includes(n.id))
      .map((n) => n.id) ?? []
  const confirmDelete = (ids: string[]) => {
    setDeleteError("")
    setRemoving(ids)
  }
  const remove = async () => {
    if (!removing.length || deletePending.current) return
    deletePending.current = true
    setDeleting(true)
    setDeleteError("")
    try {
      const result = await adminApi<{ deleted: number }>("/admin/notices", {
        method: "DELETE",
        body: { ids: removing },
      })
      toast.success(
        `${result.deleted} ${result.deleted === 1 ? "notice" : "notices"} deleted.`
      )
      setRemoving([])
      setSelected([])
      setPage(
        Math.min(
          page,
          Math.max(
            1,
            Math.ceil(((sent.data?.total ?? 0) - result.deleted) / 25)
          )
        )
      )
      sent.reload()
    } catch (e) {
      setDeleteError(
        e instanceof Error
          ? e.message
          : "Couldn't delete these notices. Try again."
      )
    } finally {
      deletePending.current = false
      setDeleting(false)
    }
  }
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 200)
    return () => clearTimeout(timer)
  }, [query])
  // How many students the filters reach right now, re-counted as they change.
  const segmentKey = JSON.stringify(segment)
  useEffect(() => {
    if (audience !== "segment" || !hasFilter(segment)) return
    let live = true
    const timer = setTimeout(() => {
      adminApi<{ count: number }>("/admin/notices/audience", {
        method: "POST",
        body: { segment },
      })
        .then((r) => live && setReach({ key: segmentKey, count: r.count }))
        .catch(() => live && setReach({ key: segmentKey, count: -1 })) // -1: couldn't count
    }, 250)
    return () => {
      live = false
      clearTimeout(timer)
    }
    // segmentKey stands in for segment
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audience, segmentKey])
  const count =
    audience === "segment" && hasFilter(segment) && reach?.key === segmentKey
      ? reach.count
      : null
  const users = useAdminData<UserPage>(
    audience === "user" && search.length >= 2
      ? `/admin/users?q=${encodeURIComponent(search)}`
      : null
  )
  const change = () => {
    requestId.current = null
    setError("")
  }
  const target =
    audience === "all"
      ? "All students"
      : audience === "segment"
        ? hasFilter(segment)
          ? describeSegment(segment) +
            (count === null || count < 0
              ? ""
              : ` (${count} ${count === 1 ? "student" : "students"})`)
          : "Choose at least one filter"
        : (recipient?.name ?? recipient?.email ?? "Choose a student")
  const placeholder = hasPlaceholder(title) || hasPlaceholder(body)
  const blocked =
    busy ||
    !title.trim() ||
    !body.trim() ||
    placeholder ||
    (audience === "user" && !recipient) ||
    (audience === "segment" && (!hasFilter(segment) || count === 0))

  const applyTemplate = (t: NoticeTemplate) => {
    if (
      (title.trim() || body.trim()) &&
      !window.confirm("Replace the title and message with this template?")
    )
      return
    setTemplateId(t.id)
    setTitle(t.title)
    setBody(t.body)
    setAudience(t.audience)
    setSegment(t.segment ?? {})
    change()
  }

  const send = async () => {
    if (blocked) return
    setBusy(true)
    setError("")
    requestId.current ??= crypto.randomUUID()
    try {
      await adminApi("/admin/notices", {
        method: "POST",
        body: {
          id: requestId.current,
          title: title.trim(),
          body: body.trim(),
          targetId: audience === "user" ? recipient!.id : null,
          segment: audience === "segment" ? segment : null,
        },
      })
      toast.success(
        audience === "all"
          ? "Notice sent to all students."
          : `Notice sent to ${target}.`
      )
      requestId.current = null
      setTemplateId(null)
      setTitle("")
      setBody("")
      setPage(1)
      setSelected([])
      sent.reload()
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Couldn't send this notice."
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Notices
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Send an update to everyone, a filtered group, or one student. Open
          apps receive it live; notices stay in the inbox. During practice,
          delivery waits until the session ends.
        </p>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void send()
          }}
          className="flex flex-col gap-5 border p-5"
        >
          <fieldset
            disabled={busy}
            className="flex flex-col gap-5 disabled:opacity-70"
          >
            <legend className="mb-3 text-sm font-semibold">New notice</legend>
            <div>
              <p className="mb-2 text-sm font-medium">Start from a template</p>
              <div className="flex flex-wrap gap-2">
                {NOTICE_TEMPLATES.map((t) => (
                  <Button
                    key={t.id}
                    type="button"
                    size="sm"
                    variant={templateId === t.id ? "default" : "outline"}
                    aria-pressed={templateId === t.id}
                    onClick={() => applyTemplate(t)}
                  >
                    {t.name}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Send to</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="audience"
                    checked={audience === "all"}
                    onChange={() => {
                      setAudience("all")
                      change()
                    }}
                  />
                  All students
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="audience"
                    checked={audience === "segment"}
                    onChange={() => {
                      setAudience("segment")
                      change()
                    }}
                  />
                  Filtered group
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="audience"
                    checked={audience === "user"}
                    onChange={() => {
                      setAudience("user")
                      change()
                    }}
                  />
                  One student
                </label>
              </div>
            </div>
            {audience === "segment" ? (
              <div className="flex flex-col gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  {FILTERS.map((f) => (
                    <div key={f.key} className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        {f.label}
                      </span>
                      <FilterSelect
                        label={f.label}
                        className="w-full"
                        value={segment[f.key] ?? "any"}
                        options={[...f.options]}
                        onChange={(v) => {
                          setSegment((s) => ({
                            ...s,
                            [f.key]: v === "any" ? undefined : v,
                          }))
                          change()
                        }}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-sm" aria-live="polite">
                  {!hasFilter(segment) ? (
                    <span className="text-muted-foreground">
                      Pick at least one filter. Students must match all of them.
                    </span>
                  ) : count === null ? (
                    <span className="text-muted-foreground">Counting…</span>
                  ) : count < 0 ? (
                    <span className="text-muted-foreground">
                      Couldn&apos;t count matching students. Sending still
                      checks that someone matches.
                    </span>
                  ) : count === 0 ? (
                    <span className="text-destructive">
                      No students match these filters.
                    </span>
                  ) : (
                    <>
                      Reaches <strong>{count}</strong>{" "}
                      {count === 1 ? "student" : "students"} right now.
                    </>
                  )}
                </p>
              </div>
            ) : null}
            {audience === "user" ? (
              <div className="flex flex-col gap-2">
                <label htmlFor="notice-search" className="text-sm font-medium">
                  Find a student
                </label>
                <Input
                  id="notice-search"
                  value={query}
                  maxLength={100}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name or email"
                  autoComplete="off"
                />
                {recipient ? (
                  <p className="text-sm break-words">
                    Selected:{" "}
                    <strong>
                      {recipient.name ?? recipient.email ?? recipient.id}
                    </strong>
                    {recipient.name && recipient.email
                      ? ` · ${recipient.email}`
                      : ""}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Type at least two characters, then choose a student.
                  </p>
                )}
                {seed.error && !chosen ? (
                  <p role="alert" className="text-sm text-destructive">
                    {seed.error}
                  </p>
                ) : null}
                {users.error ? (
                  <p role="alert" className="text-sm text-destructive">
                    {users.error}
                  </p>
                ) : null}
                {search.length >= 2 && users.data ? (
                  <ul
                    className="max-h-60 divide-y overflow-y-auto border"
                    aria-label="Student search results"
                  >
                    {users.data.users.length ? (
                      users.data.users
                        .filter((u) => !u.deletedAt)
                        .map((u) => (
                          <li key={u.id}>
                            <button
                              type="button"
                              className="w-full p-3 text-left text-sm hover:bg-muted focus-visible:outline-2"
                              onClick={() => {
                                setChosen(u)
                                setQuery("")
                                setSearch("")
                                change()
                              }}
                            >
                              <span className="block font-medium">
                                {u.name ?? "No name"}
                              </span>
                              <span className="text-muted-foreground">
                                {u.email ?? u.id}
                              </span>
                            </button>
                          </li>
                        ))
                    ) : (
                      <li className="p-3 text-sm text-muted-foreground">
                        No matching students.
                      </li>
                    )}
                  </ul>
                ) : null}
              </div>
            ) : null}
            <div className="flex flex-col gap-2">
              <label htmlFor="notice-title" className="text-sm font-medium">
                Title
              </label>
              <Input
                id="notice-title"
                required
                maxLength={120}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  change()
                }}
                placeholder="A short, clear heading"
              />
              <p className="text-xs text-muted-foreground">
                {title.length}/120
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="notice-body" className="text-sm font-medium">
                Message
              </label>
              <Textarea
                id="notice-body"
                required
                maxLength={2000}
                rows={6}
                value={body}
                onChange={(e) => {
                  setBody(e.target.value)
                  change()
                }}
                placeholder="What students need to know"
              />
              <p className="text-xs text-muted-foreground">
                {body.length}/2000 · Plain text
              </p>
            </div>
          </fieldset>
          {placeholder ? (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Replace the [bracketed] details before sending.
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="self-start" disabled={blocked}>
            <SendIcon />
            {busy
              ? "Sending…"
              : audience === "all"
                ? "Send to all students"
                : audience === "segment"
                  ? count && count > 0
                    ? `Send to ${count} ${count === 1 ? "student" : "students"}`
                    : "Send to group"
                  : "Send to student"}
          </Button>
        </form>
        <aside className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">Preview</h3>
          {/* Inbox preview uses the app's own colours whatever the admin theme. */}
          <div className="relative h-72 overflow-hidden rounded-[28px] border-[6px] border-[#2A2420] bg-[#F7F3EC]">
            <div className="mx-auto mt-3 h-4 w-20 rounded-full bg-[#2A2420]" />
            <div className="mx-4 mt-6 space-y-2" aria-hidden>
              <div className="h-5 w-32 rounded bg-[#EDE5D8]" />
              <div className="h-16 rounded-2xl bg-[#EDE5D8]" />
              <div className="h-16 rounded-2xl bg-[#EDE5D8]" />
            </div>
            <div className="absolute inset-x-3 top-24 rounded-2xl bg-[#EDE5D8] p-4">
              <p className="mb-2 text-xs font-semibold text-[#2A2420]">
                DEEMO · Inbox
              </p>
              <p className="line-clamp-2 text-sm font-semibold text-[#2A2420]">
                {title.trim() || "Your notice title"}
              </p>
              <div className="mt-2 line-clamp-3 text-sm whitespace-pre-wrap text-[#2A2420]">
                {body.trim() || "Your message will appear here."}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            To: {target}. Students open notices from their inbox or push
            notifications.
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Closing the app stops live delivery. Students see missed notices
            when they return. Sending a notice also records an entry in the
            audit log.
          </p>
        </aside>
      </div>
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-heading text-lg font-semibold">Sent notices</h3>
          <Button
            variant="outline"
            size="sm"
            disabled={deleting}
            onClick={sent.reload}
          >
            Refresh
          </Button>
        </div>
        {sent.error ? (
          <LoadError
            what="sent notices"
            error={sent.error}
            onRetry={sent.reload}
          />
        ) : null}
        {!sent.data ? (
          <Skeleton className="h-40" />
        ) : (
          <>
            {!sent.data.notices.length ? (
              <p className="border p-6 text-sm text-muted-foreground">
                No notices sent yet.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      disabled={deleting}
                      checked={selectedIds.length === sent.data.notices.length}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? sent.data!.notices.map((n) => n.id)
                            : []
                        )
                      }
                    />
                    Select this page
                  </label>
                  <span
                    className="text-sm text-muted-foreground"
                    aria-live="polite"
                  >
                    {selectedIds.length} selected
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deleting || !selectedIds.length}
                    onClick={() => confirmDelete(selectedIds)}
                  >
                    Delete selected
                  </Button>
                  {selectedIds.length ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={deleting}
                      onClick={() => setSelected([])}
                    >
                      Clear selection
                    </Button>
                  ) : null}
                </div>
                <ul className="divide-y border">
                  {sent.data.notices.map((n) => (
                    <li key={n.id} className="flex flex-col gap-2 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="checkbox"
                          aria-label={`Select notice: ${n.title}`}
                          disabled={deleting}
                          checked={selectedIds.includes(n.id)}
                          onChange={(e) =>
                            setSelected((ids) =>
                              e.target.checked
                                ? [...ids, n.id]
                                : ids.filter((id) => id !== n.id)
                            )
                          }
                        />
                        <strong className="text-sm break-words">
                          {n.title}
                        </strong>
                        <Badge variant="outline">
                          {n.targetId
                            ? "One student"
                            : n.segment
                              ? "Filtered"
                              : "Everyone"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDayTime(n.createdAt)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deleting}
                          className="ml-auto text-destructive"
                          onClick={() => confirmDelete([n.id])}
                          aria-label={`Delete notice: ${n.title}`}
                        >
                          Delete
                        </Button>
                      </div>
                      <p className="text-sm break-words whitespace-pre-wrap text-muted-foreground">
                        {n.body}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {n.target ? (
                          <Link
                            className="underline underline-offset-4"
                            href={`/users/${encodeURIComponent(n.target.id)}`}
                          >
                            {n.target.name ?? n.target.email ?? n.target.id}
                          </Link>
                        ) : n.segment ? (
                          `${describeSegment(n.segment)} · Sent to ${n.recipientCount}`
                        ) : (
                          "All students"
                        )}{" "}
                        · Read by {n.readCount}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <Pager
              page={sent.data.page}
              total={sent.data.total}
              pageSize={sent.data.pageSize}
              onPage={(next) => {
                if (!deleting) {
                  setSelected([])
                  setPage(next)
                }
              }}
            />
          </>
        )}
      </section>
      <AlertDialog
        open={removing.length > 0}
        onOpenChange={(open) => !open && !deleting && setRemoving([])}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete{" "}
              {removing.length === 1
                ? "this notice"
                : `${removing.length} notices`}
              ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes{" "}
              {removing.length === 1 ? "the notice" : "these notices"} from
              student inboxes and deletes their read receipts. Audit entries
              remain. Push notifications already delivered to phones cannot be
              recalled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError ? (
            <p role="alert" className="text-sm text-destructive">
              {deleteError}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => void remove()}
            >
              {deleting ? "Deleting…" : "Delete permanently"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
