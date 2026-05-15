import { useMemo } from 'react'
import { REZ_ZONES, REZ_BY_STATE } from '../data/rez-zones'
import type { State } from '../lib/types'
import { useProjectIndex } from './useProjectData'

export function useREZList(stateFilter?: State | 'ALL') {
  const zones = useMemo(() => {
    if (!stateFilter || stateFilter === 'ALL') return REZ_ZONES
    return REZ_BY_STATE[stateFilter] ?? []
  }, [stateFilter])

  const totalCapacity = useMemo(
    () => REZ_ZONES.reduce((sum, z) => sum + (z.target_capacity_gw ?? 0), 0),
    [],
  )

  return { zones, totalCapacity, totalZones: REZ_ZONES.length }
}

export function useREZDetail(id: string | undefined) {
  const { projects, loading } = useProjectIndex()

  const zone = useMemo(
    () => REZ_ZONES.find((z) => z.id === id) ?? null,
    [id],
  )

  // Match projects whose rez field contains this zone's name
  const rezProjects = useMemo(() => {
    if (!zone || !projects.length) return []
    const nameLower = zone.name.toLowerCase()
    return projects.filter((p) => {
      if (!p.rez) return false
      return p.rez.toLowerCase().includes(nameLower)
    })
  }, [zone, projects])

  return { zone, projects: rezProjects, loading }
}
