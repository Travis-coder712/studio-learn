import { useState, useEffect } from 'react'
import type { ProjectSummary, Project } from '../lib/types'
import {
  fetchProjectIndex,
  fetchProjectById,
  fetchStats,
  computeStatsFromIndex,
  type QuickStats,
} from '../lib/dataService'

/**
 * Hook: Load the full project index (all summaries).
 */
export function useProjectIndex() {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProjectIndex()
      .then(setProjects)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return { projects, loading, error }
}

/**
 * Hook: Load a single project by ID (fetches full detail).
 */
export function useProject(id: string | undefined) {
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    setLoading(true)
    fetchProjectById(id)
      .then((p) => {
        setProject(p)
        if (!p) setError('Project not found')
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  return { project, loading, error }
}

/**
 * Hook: Load quick stats.
 */
export function useStats() {
  const [stats, setStats] = useState<QuickStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch(() => {
        // Fallback: compute from index
        fetchProjectIndex().then((projects) => {
          setStats(computeStatsFromIndex(projects))
        })
      })
      .finally(() => setLoading(false))
  }, [])

  return { stats, loading }
}
