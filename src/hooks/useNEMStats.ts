import { useMemo } from 'react'
import type { ProjectSummary, Technology, ProjectStatus, State, Confidence } from '../lib/types'
import { useProjectIndex } from './useProjectData'

export interface TechStatusBreakdown {
  technology: Technology
  label: string
  operating: number
  construction: number
  development: number
  total: number
}

export interface StateStatusBreakdown {
  state: State
  operating: number
  construction: number
  development: number
  total: number
}

export interface PipelineProject {
  id: string
  name: string
  technology: Technology
  capacity_mw: number
  storage_mwh?: number | null
  state: State
  developer?: string
}

export interface ConfidenceBreakdown {
  tier: Confidence
  count: number
  pct: number
}

export interface NEMStats {
  operating_gw: number
  construction_gw: number
  development_gw: number
  total_storage_gwh: number
  total_projects: number
  by_technology: TechStatusBreakdown[]
  by_state: StateStatusBreakdown[]
  by_confidence: ConfidenceBreakdown[]
  pipeline: PipelineProject[]
}

const TECH_ORDER: Technology[] = ['wind', 'solar', 'bess', 'hybrid', 'offshore_wind', 'pumped_hydro']
const TECH_LABELS: Record<Technology, string> = {
  wind: 'Wind',
  solar: 'Solar',
  bess: 'BESS',
  hybrid: 'Hybrid',
  pumped_hydro: 'Pumped Hydro',
  offshore_wind: 'Offshore Wind',
  gas: 'Gas',
}

const STATE_ORDER: State[] = ['NSW', 'QLD', 'VIC', 'SA', 'TAS', 'WA']
const ACTIVE_STATUSES: ProjectStatus[] = ['operating', 'construction', 'development']

function sumCapacity(projects: ProjectSummary[], status: ProjectStatus): number {
  return projects
    .filter((p) => p.status === status)
    .reduce((sum, p) => sum + p.capacity_mw, 0)
}

function sumStorage(projects: ProjectSummary[]): number {
  return projects.reduce((sum, p) => sum + (p.storage_mwh ?? 0), 0)
}

export function useNEMStats(excludeTechs?: Technology[]) {
  const { projects, loading, error } = useProjectIndex()
  const excludeKey = excludeTechs ? excludeTechs.sort().join(',') : ''

  const stats = useMemo<NEMStats | null>(() => {
    if (!projects.length) return null

    // Apply technology exclusion filter
    const base = excludeTechs?.length
      ? projects.filter((p) => !excludeTechs.includes(p.technology))
      : projects

    // Filter out withdrawn
    const active = base.filter((p) => ACTIVE_STATUSES.includes(p.status))

    // Headline stats
    const operating_gw = sumCapacity(base, 'operating') / 1000
    const construction_gw =
      (sumCapacity(base, 'construction') + sumCapacity(base, 'commissioning')) / 1000
    const development_gw = sumCapacity(base, 'development') / 1000
    const total_storage_gwh = sumStorage(base) / 1000

    // Filter tech order
    const techOrder = excludeTechs?.length
      ? TECH_ORDER.filter((t) => !excludeTechs.includes(t))
      : TECH_ORDER

    // By technology
    const by_technology: TechStatusBreakdown[] = techOrder.map((tech) => {
      const techProjects = active.filter((p) => p.technology === tech)
      return {
        technology: tech,
        label: TECH_LABELS[tech],
        operating: sumCapacity(techProjects, 'operating') / 1000,
        construction:
          (sumCapacity(techProjects, 'construction') +
            sumCapacity(techProjects, 'commissioning')) /
          1000,
        development: sumCapacity(techProjects, 'development') / 1000,
        total: techProjects.reduce((s, p) => s + p.capacity_mw, 0) / 1000,
      }
    })

    // By state
    const by_state: StateStatusBreakdown[] = STATE_ORDER.map((state) => {
      const stateProjects = active.filter((p) => p.state === state)
      return {
        state,
        operating: sumCapacity(stateProjects, 'operating') / 1000,
        construction:
          (sumCapacity(stateProjects, 'construction') +
            sumCapacity(stateProjects, 'commissioning')) /
          1000,
        development: sumCapacity(stateProjects, 'development') / 1000,
        total: stateProjects.reduce((s, p) => s + p.capacity_mw, 0) / 1000,
      }
    })

    // By confidence
    const CONF_ORDER: Confidence[] = ['high', 'good', 'medium', 'low']
    const by_confidence: ConfidenceBreakdown[] = CONF_ORDER.map((tier) => {
      const count = base.filter((p) => p.data_confidence === tier).length
      return { tier, count, pct: base.length ? Math.round((count / base.length) * 100) : 0 }
    })

    // Construction pipeline
    const pipeline: PipelineProject[] = base
      .filter((p) => p.status === 'construction' || p.status === 'commissioning')
      .sort((a, b) => b.capacity_mw - a.capacity_mw)
      .map((p) => ({
        id: p.id,
        name: p.name,
        technology: p.technology,
        capacity_mw: p.capacity_mw,
        storage_mwh: p.storage_mwh,
        state: p.state,
        developer: p.current_developer,
      }))

    return {
      operating_gw,
      construction_gw,
      development_gw,
      total_storage_gwh,
      total_projects: base.length,
      by_technology,
      by_state,
      by_confidence,
      pipeline,
    }
  }, [projects, excludeKey])

  return { stats, loading, error }
}
