import { useState, useEffect, useMemo } from 'react'
import type { DeveloperIndex, DeveloperProfile } from '../lib/types'
import { fetchDeveloperIndex } from '../lib/dataService'

/**
 * Hook: Load the full developer index.
 */
export function useDeveloperIndex() {
  const [data, setData] = useState<DeveloperIndex | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDeveloperIndex()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}

/**
 * Hook: Find a single developer by slug.
 */
export function useDeveloper(slug: string | undefined) {
  const { data, loading, error } = useDeveloperIndex()

  const developer = useMemo<DeveloperProfile | null>(() => {
    if (!data || !slug) return null
    // Prefer grouped profile (has all aliases merged) over ungrouped
    const grouped = data.grouped_developers?.find((d) => d.slug === slug)
    if (grouped) return grouped
    return data.developers.find((d) => d.slug === slug) ?? null
  }, [data, slug])

  return { developer, loading, error }
}
