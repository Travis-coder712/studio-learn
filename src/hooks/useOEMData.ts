import { useState, useEffect, useMemo } from 'react'
import type { OEMIndex, OEMProfile } from '../lib/types'
import { fetchOEMIndex } from '../lib/dataService'

export function useOEMIndex() {
  const [data, setData] = useState<OEMIndex | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchOEMIndex()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}

export function useOEM(slug: string | undefined) {
  const { data, loading, error } = useOEMIndex()

  const oem = useMemo<OEMProfile | null>(() => {
    if (!data || !slug) return null
    return data.oems.find((o) => o.slug === slug) ?? null
  }, [data, slug])

  return { oem, loading, error }
}
