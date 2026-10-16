import { Suspense } from "react"

import { AdminShell } from "@/components/admin-shell"
import { AuthGate } from "@/components/auth-gate"
import { UsersView } from "@/components/users-view"

export const metadata = { title: "Users · DEEMO admin" }

export default function UsersPage() {
  return (
    <AuthGate>
      <AdminShell title="Users">
        {/* useSearchParams needs a Suspense boundary so the shell can prerender */}
        <Suspense>
          <UsersView />
        </Suspense>
      </AdminShell>
    </AuthGate>
  )
}
