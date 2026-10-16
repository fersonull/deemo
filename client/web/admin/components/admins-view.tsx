"use client"

import { useState } from "react"

import { useAdmin } from "@/components/auth-gate"
import { LoadError } from "@/components/list-controls"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useAdminData } from "@/hooks/use-admin-data"
import { adminApi, type AdminAccount } from "@/lib/api"
import { formatDayTime } from "@/lib/format"

// Who can use this admin. Granting needs an account that has signed in to the app or the admin once; the change
// reaches the person when they next sign in. Every grant and removal goes to the audit log.
export function AdminsView() {
  const me = useAdmin()
  const { data, error, reload } = useAdminData<{ admins: AdminAccount[] }>("/admin/admins")
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [removing, setRemoving] = useState<AdminAccount | null>(null)

  const act = async (call: () => Promise<unknown>, done: string) => {
    setBusy(true)
    setMessage(null)
    try {
      await call()
      setMessage({ ok: true, text: done })
      setRemoving(null)
      reload()
      return true
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message })
      return false
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <form
        className="flex flex-col gap-2 border p-4"
        onSubmit={(e) => {
          e.preventDefault()
          const value = email.trim()
          if (value)
            void act(() => adminApi("/admin/admins", { method: "POST", body: { email: value } }), `${value} is now an admin. They'll get access after signing in again.`).then(
              (ok) => ok && setEmail(""),
            )
        }}
      >
        <label htmlFor="grant" className="text-sm font-semibold">
          Add an admin
        </label>
        <p className="text-xs text-muted-foreground">They need to have signed in to the DEEMO app or this admin once.</p>
        <div className="flex gap-2">
          <Input id="grant" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="off" />
          <Button type="submit" disabled={busy || !email.trim()}>
            {busy && !removing ? "Adding…" : "Add"}
          </Button>
        </div>
        {message ? <p className={`text-sm ${message.ok ? "text-muted-foreground" : "text-destructive"}`}>{message.text}</p> : null}
      </form>

      {error && !data ? (
        <LoadError what="admins" error={error} onRetry={reload} />
      ) : !data ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <ul className="flex flex-col divide-y border">
          {data.admins.map((a) => (
            <li key={a.uid} className="flex flex-wrap items-center gap-3 p-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {a.name ?? a.email ?? a.uid} {a.uid === me.uid ? <Badge variant="outline">You</Badge> : null}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {a.email} · last sign-in {formatDayTime(a.lastSignInAt)}
                </p>
              </div>
              {a.uid === me.uid ? null : (
                <Button variant="outline" size="sm" disabled={busy} onClick={() => setRemoving(a)}>
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={removing !== null} onOpenChange={(o) => !o && !busy && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove admin access?</AlertDialogTitle>
            <AlertDialogDescription>
              {removing?.email ?? "They"} will be signed out of the admin right away. Their DEEMO app account isn&apos;t affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={busy}
              onClick={() =>
                removing &&
                act(() => adminApi(`/admin/admins/${encodeURIComponent(removing.uid)}`, { method: "DELETE" }), `${removing.email ?? "They"} no longer have admin access.`)
              }
            >
              {busy ? "Removing…" : "Remove access"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
