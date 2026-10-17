import { Suspense } from "react"
import { NoticesView } from "@/components/notices-view"

export const metadata = { title: "Notices · DEEMO admin" }

export default function Page() {
  return (
    <Suspense>
      <NoticesView />
    </Suspense>
  )
}
