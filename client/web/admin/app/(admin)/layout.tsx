import type { ReactNode } from "react"

import { AdminShell } from "@/components/admin-shell"
import { AuthGate } from "@/components/auth-gate"

// Every admin page: signed in with the admin claim, inside the sidebar shell (which keeps the palette across pages).
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <AdminShell>{children}</AdminShell>
    </AuthGate>
  )
}
