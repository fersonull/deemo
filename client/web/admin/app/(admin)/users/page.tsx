import { Suspense } from "react"

import { UsersView } from "@/components/users-view"

export const metadata = { title: "Users · DEEMO admin" }

export default function UsersPage() {
  // useSearchParams needs a Suspense boundary so the shell can prerender
  return (
    <Suspense>
      <UsersView />
    </Suspense>
  )
}
