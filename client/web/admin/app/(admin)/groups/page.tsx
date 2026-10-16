import { Suspense } from "react"

import { GroupsView } from "@/components/groups-view"

export const metadata = { title: "Groups · DEEMO admin" }

export default function Page() {
  return (
    <Suspense>
      <GroupsView />
    </Suspense>
  )
}
