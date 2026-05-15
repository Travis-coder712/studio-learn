/** Shared curated filter — works with both ProjectSummary and TimelineProject */
interface CuratableProject {
  status: string
  technology: string
  user_override?: 'include' | 'exclude'
  has_scheme_contract?: boolean
  zombie_flag?: string | null
  development_stage?: string
  data_confidence?: string
}

/** Tier 1: Curated — credible projects only */
export function isCuratedProject(p: CuratableProject): boolean {
  // User override takes precedence
  if (p.user_override === 'include') return true
  if (p.user_override === 'exclude') return false
  // Non-development always included
  if (p.status !== 'development') return true
  // Offshore wind always excluded from curated
  if (p.technology === 'offshore_wind') return false
  // CIS/LTESA scheme projects always included (even if zombie/low confidence)
  if (p.has_scheme_contract) return true
  // Zombies excluded
  if (p.zombie_flag) return false
  // EPBC approved/submitted included regardless of confidence
  if (p.development_stage === 'epbc_approved' || p.development_stage === 'epbc_submitted') return true
  // Medium+ confidence included
  if (p.data_confidence !== 'low') return true
  // Low-confidence planning_submitted and early_stage excluded
  return false
}

/** Curated explanation text */
export const CURATED_NOTE = 'Curated shows operating, commissioning and construction projects, plus development projects awarded a CIS or LTESA contract, with EPBC approval/submission, or medium+ data confidence. Offshore wind and zombie projects are excluded.'

export const CURATED_BENCHMARK = 'Benchmarks: AEMO tracks ~275 projects in the NEM connection queue; CEC reports ~142 committed/under construction.'
