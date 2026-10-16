"use client"

import { signOut } from "firebase/auth"
import { LogOutIcon, UsersIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

import { useAdmin } from "@/components/auth-gate"
import { Button } from "@/components/ui/button"
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
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { getAuth } from "@/lib/firebase"

const NAV = [{ href: "/users", label: "Users", icon: UsersIcon }]

// The admin's frame: a sidebar (sections; only Users for now) and the page beside it.
export function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const admin = useAdmin()
  const pathname = usePathname()
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="px-2 py-1.5">
            <p className="font-heading text-base font-semibold tracking-tight">DEEMO</p>
            <p className="text-xs text-muted-foreground">Admin</p>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV.map(({ href, label, icon: Icon }) => (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton isActive={pathname.startsWith(href)} render={<Link href={href} />}>
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
          <div className="flex items-center gap-2 px-2 py-1.5">
            <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{admin.email}</p>
            <Button variant="ghost" size="icon-sm" aria-label="Sign out" onClick={() => signOut(getAuth())}>
              <LogOutIcon />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <h1 className="font-heading text-lg font-semibold tracking-tight">{title}</h1>
        </header>
        <div className="flex-1 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
