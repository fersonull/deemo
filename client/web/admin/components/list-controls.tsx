"use client"

import { SearchIcon } from "lucide-react"
import { useEffect, useState } from "react"

import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// The list's search box: searches after a short pause, "/" focuses it (the shell's shortcut), Esc leaves it.
export function ListSearch({
  value,
  onSearch,
  placeholder,
}: {
  value: string
  onSearch: (q: string) => void
  placeholder: string
}) {
  const [draft, setDraft] = useState(value)
  useEffect(() => {
    if (draft === value) return
    const t = setTimeout(() => onSearch(draft.trim()), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])
  return (
    <div className="relative min-w-56 flex-1">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id="list-search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && e.currentTarget.blur()}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pr-10 pl-9"
      />
      <Kbd className="absolute top-1/2 right-2 -translate-y-1/2">/</Kbd>
    </div>
  )
}

export function FilterSelect({
  label,
  value,
  options,
  onChange,
  className = "w-40",
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <Select
      items={options}
      value={value}
      onValueChange={(v) => onChange(v as string)}
    >
      <SelectTrigger className={className} aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// Shown when a list fails to load: what went wrong and a retry.
export function LoadError({
  what,
  error,
  onRetry,
}: {
  what: string
  error: string
  onRetry: () => void
}) {
  return (
    <div className="flex flex-col items-start gap-3 border p-6">
      <p className="text-sm font-medium">Couldn&apos;t load {what}</p>
      <p className="text-sm text-muted-foreground">{error}</p>
      <button
        type="button"
        onClick={onRetry}
        className="text-sm font-medium underline underline-offset-4"
      >
        Try again
      </button>
    </div>
  )
}
