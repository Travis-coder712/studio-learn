import { useState, useEffect } from 'react'

const BASE = import.meta.env.BASE_URL + 'data'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _cache: any | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _promise: Promise<any | null> | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadBessValue(): Promise<any | null> {
  if (_cache) return Promise.resolve(_cache)
  if (_promise) return _promise
  _promise = fetch(`${BASE}/analytics/intelligence/bess-value.json`)
    .then(r => r.ok ? r.json() : null)
    .then(d => { _cache = d; return d })
    .catch(() => null)
  return _promise
}

export function useBessValueProject(projectId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [project, setProject] = useState<any | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stateAvg, setStateAvg] = useState<any | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [allStateProjects, setAllStateProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    loadBessValue().then(data => {
      if (!data) return
      const proj = data.projects[projectId] ?? null
      setProject(proj)
      if (proj) {
        setStateAvg(data.state_averages[proj.state] ?? null)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAllStateProjects(Object.values(data.projects).filter((p: any) => p.state === proj.state))
      }
    }).finally(() => setLoading(false))
  }, [projectId])

  return { project, stateAvg, allStateProjects, loading }
}
