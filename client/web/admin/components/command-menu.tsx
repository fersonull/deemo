"use client"

import { signOut } from "firebase/auth"
import { KeyboardIcon, LogOutIcon, MonitorIcon, MoonIcon, ScrollTextIcon, SunIcon, UserIcon, UsersIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { useEffect, useState, type ReactNode } from "react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { Command } from "@/components/ui/command"
import { useAdminData } from "@/hooks/use-admin-data"
import type { UserPage } from "@/lib/api"
import { getAuth } from "@/lib/firebase"

type Item = { id: string; label: string; icon: ReactNode; shortcut?: string; run: () => void }

// Ctrl/⌘ K: jump to a page, find a user by name or email (searched on the server), switch the theme, sign out.
export function CommandMenu({ open, onOpenChange, onShortcuts }: { open: boolean; onOpenChange: (open: boolean) => void; onShortcuts: () => void }) {
  const router = useRouter()
  const { setTheme } = useTheme()
  const [query, setQuery] = useState("")
  const [search, setSearch] = useState("")

  // Search users after a short pause, from 2 characters.
  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 200)
    return () => clearTimeout(t)
  }, [query])
  const users = useAdminData<UserPage>(open && search.length >= 2 ? `/admin/users?q=${encodeURIComponent(search)}` : null)

  const close = (run: () => void) => () => {
    onOpenChange(false)
    setQuery("")
    run()
  }

  const groups: { heading: string; items: Item[] }[] = [
    {
      heading: "Pages",
      items: [
        { id: "users", label: "Users", icon: <UsersIcon />, shortcut: "G U", run: () => router.push("/users") },
        { id: "audit", label: "Audit log", icon: <ScrollTextIcon />, shortcut: "G A", run: () => router.push("/audit") },
      ],
    },
    {
      heading: "Theme",
      items: [
        { id: "light", label: "Light theme", icon: <SunIcon />, run: () => setTheme("light") },
        { id: "dark", label: "Dark theme", icon: <MoonIcon />, run: () => setTheme("dark") },
        { id: "system", label: "System theme", icon: <MonitorIcon />, run: () => setTheme("system") },
      ],
    },
    {
      heading: "Help",
      items: [
        { id: "shortcuts", label: "Keyboard shortcuts", icon: <KeyboardIcon />, shortcut: "?", run: onShortcuts },
        { id: "signout", label: "Sign out", icon: <LogOutIcon />, run: () => signOut(getAuth()) },
      ],
    },
  ]
  const q = query.trim().toLowerCase()
  const shown = groups.map((g) => ({ ...g, items: g.items.filter((i) => !q || i.label.toLowerCase().includes(q)) })).filter((g) => g.items.length)
  const found = search.length >= 2 ? (users.data?.users ?? []) : []

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Search" description="Find a user or run a command">
      <Command shouldFilter={false}>
        <CommandInput value={query} onValueChange={setQuery} placeholder="Search users or type a command…" />
        <CommandList>
          <CommandEmpty>{search.length >= 2 && !users.data ? "Searching…" : "Nothing found."}</CommandEmpty>
          {found.length ? (
            <CommandGroup heading="Users">
              {found.slice(0, 8).map((u) => (
                <CommandItem key={u.id} value={`user-${u.id}`} onSelect={close(() => router.push(`/users?user=${encodeURIComponent(u.id)}`))}>
                  <UserIcon />
                  <span className="truncate">{u.name ?? u.email ?? u.id}</span>
                  {u.name && u.email ? <span className="truncate text-muted-foreground">{u.email}</span> : null}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {shown.map((g, i) => (
            <div key={g.heading}>
              {i > 0 || found.length ? <CommandSeparator /> : null}
              <CommandGroup heading={g.heading}>
                {g.items.map((item) => (
                  <CommandItem key={item.id} value={item.id} onSelect={close(item.run)}>
                    {item.icon}
                    <span>{item.label}</span>
                    {item.shortcut ? <CommandShortcut>{item.shortcut}</CommandShortcut> : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
