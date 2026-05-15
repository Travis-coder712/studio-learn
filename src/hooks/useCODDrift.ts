import { useState, useEffect } from 'react'
import type { CODDriftData } from '../lib/types'
import { fetchCODDrift } from '../lib/dataService'

export function useCODDrift() {
  const [data, setData] = useState<CODDriftData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCODDrift()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  return { data, loading }
}
