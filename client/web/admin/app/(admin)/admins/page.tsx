import { Suspense } from "react"

import { AdminsView } from "@/components/admins-view"

export const metadata = { title: "Admins · DEEMO admin" }

export default function Page() {
  return (
    <Suspense>
      <AdminsView />
    </Suspense>
  )
}
