import { Suspense } from "react"

import { ProjectsView } from "@/components/projects-view"

export const metadata = { title: "Manuscripts · DEEMO admin" }

export default function Page() {
  return (
    <Suspense>
      <ProjectsView />
    </Suspense>
  )
}
