"use client"

import { useEffect, useState } from "react"

import { adminApi } from "@/lib/api"

// GET an admin API path. A new path shows nothing (skeletons) until its own answer arrives; `reload` (after a change)
// keeps the current rows on screen while the fresh ones load. `path: null` fetches nothing.
export function useAdminData<T>(path: string | null) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{
    path: string
    attempt: number
    data?: T
    error?: string
  } | null>(null)

  useEffect(() => {
    if (!path) return
    let alive = true
    adminApi<T>(path)
      .then((data) => alive && setResult({ path, attempt, data }))
      .catch(
        (e: Error) => alive && setResult({ path, attempt, error: e.message })
      )
    return () => {
      alive = false
    }
  }, [path, attempt])

  const samePath = result?.path === path
  const current = samePath && result?.attempt === attempt
  return {
    data: samePath ? (result?.data ?? null) : null,
    error: current ? (result?.error ?? "") : "",
    reload: () => setAttempt((a) => a + 1),
  }
}
