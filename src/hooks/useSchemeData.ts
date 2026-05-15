import { useState, useEffect } from 'react'
import type { CISRound, LTESARound } from '../lib/types'
import {
  CIS_ROUNDS, LTESA_ROUNDS,
  CIS_PROJECTS, LTESA_PROJECTS,
  type SchemeProject,
} from '../data/scheme-rounds'

/**
 * Hook: Load all scheme round data.
 * Currently from static TypeScript data; will migrate to JSON when pipeline exports it.
 */
export function useSchemeData() {
  const [loading, setLoading] = useState(true)
  const [cisRounds, setCisRounds] = useState<CISRound[]>([])
  const [ltesaRounds, setLtesaRounds] = useState<LTESARound[]>([])

  useEffect(() => {
    // Simulate async for consistency with other hooks
    setCisRounds(CIS_ROUNDS)
    setLtesaRounds(LTESA_ROUNDS)
    setLoading(false)
  }, [])

  return { cisRounds, ltesaRounds, loading }
}

/**
 * Hook: Load a specific CIS round by ID.
 */
export function useCISRound(id: string | undefined) {
  const round = id ? CIS_ROUNDS.find((r) => r.id === id) ?? null : null
  const projects = id ? CIS_PROJECTS[id] ?? [] : []
  return { round, projects }
}

/**
 * Hook: Load a specific LTESA round by ID.
 */
export function useLTESARound(id: string | undefined) {
  const round = id ? LTESA_ROUNDS.find((r) => r.id === id) ?? null : null
  const projects = id ? LTESA_PROJECTS[id] ?? [] : []
  return { round, projects }
}

/**
 * Get projects for any scheme round.
 */
export function getSchemeProjects(scheme: 'cis' | 'ltesa', roundId: string): SchemeProject[] {
  if (scheme === 'cis') return CIS_PROJECTS[roundId] ?? []
  return LTESA_PROJECTS[roundId] ?? []
}
