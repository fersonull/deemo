"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { NAV } from "@/lib/nav"

// The header's trail: the section, then the open item (a student, a session) once its page knows its name.
// A section crumb goes back to the list as it was left (search, filters, page).

const DetailContext = createContext<{
  detail: string | null
  setDetail: (label: string | null) => void
} | null>(null)
const lastList = new Map<string, string>() // section path -> the list URL it was last left at

export function BreadcrumbsProvider({ children }: { children: ReactNode }) {
  const [detail, setDetail] = useState<string | null>(null)
  return (
    <DetailContext.Provider value={{ detail, setDetail }}>
      {children}
    </DetailContext.Provider>
  )
}

// A detail page names itself in the trail ("Kim D."), and clears it when it closes.
export function useDetailCrumb(label: string | null) {
  const ctx = useContext(DetailContext)
  useEffect(() => {
    ctx?.setDetail(label)
    return () => ctx?.setDetail(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label])
}

// A list page remembers its full URL, so the crumb back to it keeps the search, filters and page.
export function useRememberList() {
  const pathname = usePathname()
  const params = useSearchParams()
  useEffect(() => {
    lastList.set(pathname, `${pathname}${params.size ? `?${params}` : ""}`)
  }, [pathname, params])
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const detail = useContext(DetailContext)?.detail ?? null
  const section = NAV.find((n) => pathname.startsWith(n.href))
  const onDetail = section && pathname !== section.href
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden sm:inline-flex">
          <BreadcrumbLink render={<Link href="/overview" />}>
            Admin
          </BreadcrumbLink>
        </BreadcrumbItem>
        {section ? (
          <>
            <BreadcrumbSeparator className="hidden sm:inline-flex" />
            <BreadcrumbItem>
              {onDetail ? (
                <BreadcrumbLink
                  render={
                    <Link href={lastList.get(section.href) ?? section.href} />
                  }
                >
                  {section.label}
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{section.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </>
        ) : null}
        {onDetail ? (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="truncate">
                {detail ?? "…"}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : null}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
