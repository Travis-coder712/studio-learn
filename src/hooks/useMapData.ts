import { useState, useEffect } from 'react'
import type { MapProject } from '../lib/types'
import { fetchMapData } from '../lib/dataService'

export function useMapData() {
  const [projects, setProjects] = useState<MapProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMapData()
      .then(setProjects)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return { projects, loading, error }
}
