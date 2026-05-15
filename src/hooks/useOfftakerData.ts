import { useState, useEffect, useMemo } from 'react'
import type { OfftakerIndex, OfftakerProfile } from '../lib/types'
import { fetchOfftakerIndex } from '../lib/dataService'

export function useOfftakerIndex() {
  const [data, setData] = useState<OfftakerIndex | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchOfftakerIndex()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}

export function useOfftaker(slug: string | undefined) {
  const { data, loading, error } = useOfftakerIndex()

  const offtaker = useMemo<OfftakerProfile | null>(() => {
    if (!data || !slug) return null
    return data.offtakers.find((o) => o.slug === slug) ?? null
  }, [data, slug])

  return { offtaker, loading, error }
}
