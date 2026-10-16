"use client"

import { signOut } from "firebase/auth"
import { KeyboardIcon, LogOutIcon, SearchIcon } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef, useState, type ReactNode } from "react"

import { useAdmin } from "@/components/auth-gate"
import { CommandMenu } from "@/components/command-menu"
import { ShortcutsDialog } from "@/components/shortcuts-dialog"
import { ThemeMenu } from "@/components/theme-menu"
import { Kbd } from "@/components/ui/kbd"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { getAuth } from "@/lib/firebase"
import { NAV } from "@/lib/nav"

const typing = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))

// The admin's frame: a sidebar that collapses to icons (Ctrl B), the search palette (Ctrl K) and the shortcuts
// (?, /, G then a section letter). The sidebar's own Ctrl B and the theme's D come from their components.
export function AdminShell({ children }: { children: ReactNode }) {
  const admin = useAdmin()
  const pathname = usePathname()
  const router = useRouter()
  const [palette, setPalette] = useState(false)
  const [help, setHelp] = useState(false)
  const pendingG = useRef(0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setPalette((o) => !o)
        return
      }
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target) || e.defaultPrevented) return
      if (e.key === "?") return setHelp(true)
      if (e.key === "/") {
        const search = document.getElementById("list-search")
        if (search) {
          e.preventDefault()
          search.focus()
        }
        return
      }
      // "G then a letter" jumps to a section (G G is Groups, so check the pending G first).
      const key = e.key.toLowerCase()
      const target = NAV.find((n) => n.key === key)
      if (target && Date.now() - pendingG.current < 1200) {
        pendingG.current = 0
        router.push(target.href)
        return
      }
      if (key === "g") pendingG.current = Date.now()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [router])

  const title = NAV.find((n) => pathname.startsWith(n.href))?.label ?? "Admin"

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" tooltip="DEEMO admin" render={<Link href="/overview" />}>
                <span className="flex size-8 shrink-0 items-center justify-center bg-primary font-heading text-sm font-bold text-primary-foreground">
                  D
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="font-heading font-semibold tracking-tight">DEEMO</span>
                  <span className="text-xs text-muted-foreground">Admin</span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Search (Ctrl K)" onClick={() => setPalette(true)}>
                    <SearchIcon />
                    <span className="flex-1">Search</span>
                    <Kbd className="group-data-[collapsible=icon]:hidden">Ctrl K</Kbd>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {NAV.map(({ href, label, icon: Icon }) => (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton tooltip={label} isActive={pathname.startsWith(href)} render={<Link href={href} />}>
                      <Icon />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <ThemeMenu />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Keyboard shortcuts (?)" onClick={() => setHelp(true)}>
                <KeyboardIcon />
                <span>Shortcuts</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip={`Sign out ${admin.email ?? ""}`} onClick={() => signOut(getAuth())}>
                <LogOutIcon />
                <span className="flex min-w-0 flex-col leading-tight">
                  <span>Sign out</span>
                  <span className="truncate text-xs text-muted-foreground">{admin.email}</span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <h1 className="font-heading text-lg font-semibold tracking-tight">{title}</h1>
        </header>
        <div className="flex-1 p-4 md:p-6">{children}</div>
      </SidebarInset>
      <CommandMenu open={palette} onOpenChange={setPalette} onShortcuts={() => setHelp(true)} />
      <ShortcutsDialog open={help} onOpenChange={setHelp} />
    </SidebarProvider>
  )
}
