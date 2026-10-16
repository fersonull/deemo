import { Suspense } from "react"

import { AuditView } from "@/components/audit-view"

export const metadata = { title: "Audit log · DEEMO admin" }

export default function AuditPage() {
  return (
    <Suspense>
      <AuditView />
    </Suspense>
  )
}
