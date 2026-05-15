import { useState, useEffect } from 'react'
import type { WindValueData, WindValueProject } from '../lib/types'

const BASE = import.meta.env.BASE_URL + 'data'

let _cache: WindValueData | null = null
let _promise: Promise<WindValueData | null> | null = null

function fetchWindValue(): Promise<WindValueData | null> {
  if (_cache) return Promise.resolve(_cache)
  if (_promise) return _promise
  _promise = fetch(`${BASE}/analytics/wind-value.json`)
    .then(r => r.ok ? r.json() : null)
    .then(d => { _cache = d; return d })
    .catch(() => null)
  return _promise
}

export function useWindValueProject(projectId: string) {
  const [project, setProject] = useState<WindValueProject | null>(null)
  const [stateAvg, setStateAvg] = useState<WindValueData['state_averages'][string] | null>(null)
  const [allStateProjects, setAllStateProjects] = useState<WindValueProject[]>([])
  const [poolPrices, setPoolPrices] = useState<Record<string, Record<string, number>>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchWindValue().then(data => {
      if (!data) return
      const proj = data.projects[projectId] ?? null
      setProject(proj)
      setPoolPrices(data.pool_prices ?? {})
      if (proj) {
        setStateAvg(data.state_averages[proj.state] ?? null)
        setAllStateProjects(
          Object.values(data.projects).filter(p => p.state === proj.state)
        )
      }
    }).finally(() => setLoading(false))
  }, [projectId])

  return { project, stateAvg, allStateProjects, poolPrices, loading }
}
