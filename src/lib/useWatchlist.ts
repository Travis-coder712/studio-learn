import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'aures-watchlist'

function loadWatchlist(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return new Set(JSON.parse(raw))
  } catch { /* ignore */ }
  return new Set()
}

function saveWatchlist(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
}

export function useWatchlist() {
  const [watched, setWatched] = useState<Set<string>>(loadWatchlist)

  // Sync across tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setWatched(loadWatchlist())
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const toggle = useCallback((id: string) => {
    setWatched(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveWatchlist(next)
      return next
    })
  }, [])

  const isWatched = useCallback((id: string) => watched.has(id), [watched])

  return { watched, toggle, isWatched, count: watched.size }
}
