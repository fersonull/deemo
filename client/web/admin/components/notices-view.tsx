"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { SendIcon } from "lucide-react"
import { toast } from "sonner"

import { LoadError } from "@/components/list-controls"
import { Pager } from "@/components/pager"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

export function NoticesView() {
  const params = useSearchParams()
  const seedId = params.get("user")
  const [audience, setAudience] = useState<"all" | "user">(
    seedId ? "user" : "all"
  )
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
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 200)
    return () => clearTimeout(timer)
  }, [query])
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
      : (recipient?.name ?? recipient?.email ?? "Choose a student")

  const send = async () => {
    if (
      busy ||
      !title.trim() ||
      !body.trim() ||
      (audience === "user" && !recipient)
    )
      return
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
        },
      })
      toast.success(`Notice sent to ${target.toLowerCase()}.`)
      requestId.current = null
      setTitle("")
      setBody("")
      setPage(1)
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
          Send an update to everyone or one student. Open apps receive it live;
          notices stay in the inbox. During practice, delivery waits until the
          session ends.
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
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            className="self-start"
            disabled={
              busy ||
              !title.trim() ||
              !body.trim() ||
              (audience === "user" && !recipient)
            }
          >
            <SendIcon />
            {busy
              ? "Sending…"
              : audience === "all"
                ? "Send to all students"
                : "Send to student"}
          </Button>
        </form>
        <aside className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">Preview</h3>
          {/* Mirrors the app's floating notice (client/mobile/Deemo/src/components/floating-notice.tsx): Deemo at
              the screen edge with the title in a bubble, in the app's own colours whatever the admin theme. */}
          <div className="relative h-72 overflow-hidden rounded-[28px] border-[6px] border-[#2A2420] bg-[#F7F3EC]">
            <div className="mx-auto mt-3 h-4 w-20 rounded-full bg-[#2A2420]" />
            <div className="mx-4 mt-6 space-y-2" aria-hidden>
              <div className="h-5 w-32 rounded bg-[#EDE5D8]" />
              <div className="h-16 rounded-2xl bg-[#EDE5D8]" />
              <div className="h-16 rounded-2xl bg-[#EDE5D8]" />
            </div>
            <div className="absolute top-24 right-2.5 flex items-center gap-2">
              <div className="relative max-w-[200px] rounded-full bg-[#2A2420] px-4 py-2.5 shadow-[0_6px_18px_rgba(42,36,32,0.22)]">
                <p className="truncate text-sm font-medium text-[#F7F3EC]">{title.trim() || "Your notice title"}</p>
                <span className="absolute top-1/2 -right-1 size-3 -translate-y-1/2 rotate-45 bg-[#2A2420]" />
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/deemo-mark.svg" alt="" className="size-[60px] shrink-0 rounded-full border-[2.5px] border-[#F7F3EC] shadow-[0_6px_18px_rgba(42,36,32,0.25)]" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">To: {target}. Students see only the title here; tapping Deemo opens the full message.</p>
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
          <Button variant="outline" size="sm" onClick={sent.reload}>
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
              <ul className="divide-y border">
                {sent.data.notices.map((n) => (
                  <li key={n.id} className="flex flex-col gap-2 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm break-words">{n.title}</strong>
                      <Badge variant="outline">
                        {n.targetId ? "One student" : "Everyone"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDayTime(n.createdAt)}
                      </span>
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
                      ) : (
                        "All students"
                      )}{" "}
                      · Read by {n.readCount}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <Pager
              page={sent.data.page}
              total={sent.data.total}
              pageSize={sent.data.pageSize}
              onPage={setPage}
            />
          </>
        )}
      </section>
    </div>
  )
}
