import { Suspense } from "react"

import { SessionsView } from "@/components/sessions-view"

export const metadata = { title: "Sessions · DEEMO admin" }

export default function Page() {
  return (
    <Suspense>
      <SessionsView />
    </Suspense>
  )
}
