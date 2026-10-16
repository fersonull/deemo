"use client"

import { useState } from "react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatShortDay } from "@/lib/format"

// One count per day as columns: a single series in the foreground ink (no legend; the title names it), bars capped at
// 24px with a 2px gap, a 4px rounded top on a shared baseline, a hover tooltip per day and a table view.
export function DayBars({
  title,
  unit,
  days,
}: {
  title: string
  unit: [string, string]
  days: { day: string; n: number }[]
}) {
  const [table, setTable] = useState(false)
  const max = Math.max(1, ...days.map((d) => d.n))
  const total = days.reduce((a, d) => a + d.n, 0)
  const label = (n: number) =>
    `${n.toLocaleString()} ${n === 1 ? unit[0] : unit[1]}`

  return (
    <figure className="flex flex-col gap-3 border p-4">
      <figcaption className="flex items-baseline gap-2">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-sm text-muted-foreground">
          {label(total)} in {days.length} days
        </span>
        <button
          type="button"
          onClick={() => setTable((t) => !t)}
          className="ml-auto text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          {table ? "Show chart" : "Show table"}
        </button>
      </figcaption>

      {table ? (
        <div className="max-h-48 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-1 font-normal">Day</th>
                <th className="py-1 text-right font-normal">
                  {unit[1][0].toUpperCase() + unit[1].slice(1)}
                </th>
              </tr>
            </thead>
            <tbody>
              {[...days].reverse().map((d) => (
                <tr key={d.day} className="border-t">
                  <td className="py-1">{formatShortDay(d.day)}</td>
                  <td className="py-1 text-right tabular-nums">{d.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex gap-2">
          {/* y axis: just the top and zero, since every day's value is in its tooltip and the table */}
          <div className="flex h-36 flex-col justify-between text-right text-xs text-muted-foreground tabular-nums">
            <span>{max}</span>
            <span>0</span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div
              className="flex h-36 items-end gap-0.5 border-b border-border"
              role="img"
              aria-label={`${title}: ${label(total)} in ${days.length} days`}
            >
              {days.map((d) => (
                <Tooltip key={d.day}>
                  <TooltipTrigger
                    render={
                      <div
                        className="group flex h-full max-w-6 min-w-0 flex-1 items-end justify-center"
                        aria-label={`${formatShortDay(d.day)}: ${label(d.n)}`}
                      />
                    }
                  >
                    <div
                      className="w-full rounded-t-[4px] bg-primary transition-opacity group-hover:opacity-80"
                      style={{
                        height: d.n ? `${Math.max(3, (d.n / max) * 100)}%` : 0,
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    {formatShortDay(d.day)}: {label(d.n)}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatShortDay(days[0]?.day ?? "")}</span>
              <span>{formatShortDay(days.at(-1)?.day ?? "")}</span>
            </div>
          </div>
        </div>
      )}
    </figure>
  )
}
