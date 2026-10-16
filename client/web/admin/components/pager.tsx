"use client"

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

// Server-side pages: shown only when the list is longer than one page.
export function Pager({ page, total, pageSize, onPage }: { page: number; total: number; pageSize: number; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-end gap-2">
      <p className="text-sm text-muted-foreground tabular-nums">
        Page {page} of {pages}
      </p>
      <Button variant="outline" size="icon-sm" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        <ChevronLeftIcon />
      </Button>
      <Button variant="outline" size="icon-sm" aria-label="Next page" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        <ChevronRightIcon />
      </Button>
    </div>
  )
}
