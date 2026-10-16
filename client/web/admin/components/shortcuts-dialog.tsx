"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Kbd, KbdGroup } from "@/components/ui/kbd"

export const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["Ctrl", "K"], label: "Search users and commands (⌘ K on a Mac)" },
  { keys: ["/"], label: "Focus the user search" },
  { keys: ["G", "U"], label: "Go to Users" },
  { keys: ["G", "A"], label: "Go to Audit log" },
  { keys: ["Ctrl", "B"], label: "Collapse or expand the sidebar" },
  { keys: ["D"], label: "Switch between light and dark" },
  { keys: ["?"], label: "Show these shortcuts" },
  { keys: ["Esc"], label: "Close a panel or dialog" },
]

export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Letter keys work anywhere except while typing in a field.</DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col divide-y">
          {SHORTCUTS.map((s) => (
            <li key={s.label} className="flex items-center gap-4 py-2 text-sm">
              <span className="flex-1">{s.label}</span>
              <KbdGroup>
                {s.keys.map((k, i) => (
                  <Kbd key={i}>{k}</Kbd>
                ))}
              </KbdGroup>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
