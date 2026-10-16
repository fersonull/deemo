"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

// A list's search, filters, page and open item, kept in the URL so a view can be reloaded or shared.
export function useUrlParams() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const get = (key: string, fallback = "") => params.get(key) ?? fallback
  const page = Math.max(1, Number(params.get("page")) || 1)

  // Empty, "all" and page 1 drop out of the URL. Changing anything but the page or the open item starts at page 1.
  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "" || v === "all" || (k === "page" && v === "1")) next.delete(k)
      else next.set(k, v)
    }
    if (!("page" in patch) && Object.keys(patch).some((k) => !["user", "session"].includes(k))) next.delete("page")
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false })
  }

  // The query string for the server: the given keys that are set, plus the page.
  const query = (keys: string[]) => {
    const q = new URLSearchParams({ page: String(page) })
    for (const k of keys) {
      const v = params.get(k)
      if (v && v !== "all") q.set(k, v)
    }
    return q.toString()
  }

  return { get, page, update, query }
}
