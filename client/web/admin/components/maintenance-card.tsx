"use client"

import { useState } from "react"
import { toast } from "sonner"

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
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useAdminData } from "@/hooks/use-admin-data"
import { adminApi, type Maintenance } from "@/lib/api"
import { formatDayTime } from "@/lib/format"
import { cn } from "@/lib/utils"

const DEFAULT_MESSAGE =
  "DEEMO is getting an update. Try again in a little while; your sessions are safe."

// Maintenance mode, on top of the Overview: while it's on, every student request answers "maintenance" and the app
// shows its maintenance screen with this message. The admin keeps working. Turning it on asks first; off is one tap.
// Phones see a change within about 15 seconds (the server caches the switch).
export function MaintenanceCard() {
  const { data, error, reload } = useAdminData<Maintenance>(
    "/admin/maintenance"
  )
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)

  const save = async (on: boolean, text: string | null, done: string) => {
    setBusy(true)
    try {
      await adminApi("/admin/maintenance", {
        method: "PATCH",
        body: { on, message: text ?? undefined },
      })
      toast.success(done)
      setEditing(false)
      reload()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const openEditor = () => {
    setMessage(data?.message ?? "")
    setEditing(true)
  }

  if (error && !data)
    return (
      <div className="flex items-center justify-between gap-3 border p-4">
        <p className="text-sm text-muted-foreground">
          Couldn&apos;t load maintenance mode: {error}
        </p>
        <Button variant="outline" size="sm" onClick={reload}>
          Try again
        </Button>
      </div>
    )
  if (!data) return <Skeleton className="h-[74px] w-full" />

  return (
    <section
      className={cn(
        "flex flex-col gap-3 border p-4 sm:flex-row sm:items-center",
        data.on && "border-amber-500/60 bg-amber-500/10"
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <span
            className={cn(
              "size-2 rounded-full",
              data.on ? "bg-amber-500" : "bg-emerald-500"
            )}
          />
          {data.on ? "Maintenance mode is on" : "Maintenance mode"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {data.on ? (
            <>
              Students see: &ldquo;{data.message || DEFAULT_MESSAGE}&rdquo;
              {data.updatedAt ? ` Since ${formatDayTime(data.updatedAt)}.` : ""}
            </>
          ) : (
            "The app is open. Turn this on to pause it for every student while you update the server or database."
          )}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {data.on ? (
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={openEditor}
          >
            Edit message
          </Button>
        ) : null}
        <Switch
          checked={data.on}
          disabled={busy}
          aria-label="Maintenance mode"
          onCheckedChange={(on) =>
            on
              ? openEditor()
              : save(false, data.message, "Maintenance is off. The app is open again.")
          }
        />
      </div>

      <AlertDialog
        open={editing}
        onOpenChange={(open) => !open && !busy && setEditing(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {data.on ? "Edit the maintenance message" : "Turn on maintenance?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {data.on
                ? "Students see the new message within about 15 seconds."
                : "Every student is paused within about 15 seconds: the app shows a maintenance screen and checks back by itself. Live sessions already running finish, and are kept on the phone until they can be scored."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="maintenance-message" className="text-sm font-medium">
              Message <span className="text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              id="maintenance-message"
              value={message}
              maxLength={280}
              placeholder={DEFAULT_MESSAGE}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {message.length}/280. For example, when you expect to be back.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault()
                void save(
                  true,
                  message.trim() || null,
                  data.on
                    ? "Message updated."
                    : "Maintenance is on. Students are paused."
                )
              }}
            >
              {busy
                ? "Saving…"
                : data.on
                  ? "Save message"
                  : "Turn on maintenance"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
