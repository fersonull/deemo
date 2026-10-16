import { SessionDetailView } from "@/components/session-detail"

export const metadata = { title: "Session · DEEMO admin" }

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <SessionDetailView id={decodeURIComponent(id)} />
}
