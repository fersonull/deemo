import { UserDetailView } from "@/components/user-detail"

export const metadata = { title: "Student · DEEMO admin" }

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <UserDetailView id={decodeURIComponent(id)} />
}
