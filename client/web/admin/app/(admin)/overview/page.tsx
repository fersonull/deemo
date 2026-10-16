import { Suspense } from "react"

import { OverviewView } from "@/components/overview-view"

export const metadata = { title: "Overview · DEEMO admin" }

export default function Page() {
  return (
    <Suspense>
      <OverviewView />
    </Suspense>
  )
}
