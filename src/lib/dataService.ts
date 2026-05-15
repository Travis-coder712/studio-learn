/**
 * Data Service — Loads project data from static JSON files.
 *
 * The JSON files are exported by the Python pipeline into public/data/.
 * In production (GitHub Pages), they're served as static files.
 * In development (Vite dev server), they're served from the public/ directory.
 */
import type { ProjectSummary, Project, Technology, ProjectStatus, State, LeagueTable, LeagueTableIndex, LeagueTechnology, DeveloperIndex, OEMIndex, ContractorIndex, OfftakerIndex, MapProject, CODDriftData, DataSourcesIndex, BESSCapexData, ProjectTimelineData, SchemeTrackerData, DriftAnalysisData, WindResourceData, DunkelflaunteData, EnergyMixData, DeveloperScoreData, RevenueIntelData, GridConnectionData, NewsData, REZAccessMap, EISAnalyticsData, EISComparisonData, EISCoverageData, ProjectMonthlyPerformance, GenerationProfileData, BatteryWatchData, CoalWatchData, CapacityWatchData, NemActivitiesData } from './types'

const BASE = import.meta.env.BASE_URL + 'data'

// ============================================================
// Cache
// ============================================================

let projectIndexCache: ProjectSummary[] | null = null
let statsCache: QuickStats | null = null

export interface QuickStats {
  total: number
  total_capacity_mw: number
  total_storage_mwh: number
  by_technology: Record<string, { count: number; capacity_mw: number; storage_mwh: number }>
  by_status: Record<string, { count: number; capacity_mw: number }>
  by_state: Record<string, { count: number; capacity_mw: number }>
}

// ============================================================
// Fetchers
// ============================================================

export async function fetchProjectIndex(): Promise<ProjectSummary[]> {
  if (projectIndexCache) return projectIndexCache

  const resp = await fetch(`${BASE}/projects/index.json`)
  if (!resp.ok) throw new Error(`Failed to load project index: ${resp.status}`)
  const data = await resp.json()
  projectIndexCache = data as ProjectSummary[]
  return projectIndexCache
}

// Map technology to folder name (underscores → hyphens for filesystem)
function techFolder(technology: Technology): string {
  const map: Partial<Record<Technology, string>> = {
    pumped_hydro: 'pumped-hydro',
    offshore_wind: 'offshore-wind',
  }
  return map[technology] ?? technology
}

export async function fetchProject(technology: Technology, id: string): Promise<Project | null> {
  try {
    const resp = await fetch(`${BASE}/projects/${techFolder(technology)}/${id}.json`)
    if (!resp.ok) return null
    return (await resp.json()) as Project
  } catch {
    return null
  }
}

export async function fetchStats(): Promise<QuickStats> {
  if (statsCache) return statsCache

  const resp = await fetch(`${BASE}/metadata/stats.json`)
  if (!resp.ok) throw new Error(`Failed to load stats: ${resp.status}`)
  statsCache = (await resp.json()) as QuickStats
  return statsCache
}

// ============================================================
// Derived helpers
// ============================================================

export async function fetchFilteredProjects(filters: {
  tech?: Technology | null
  status?: ProjectStatus | null
  state?: State | null
}): Promise<ProjectSummary[]> {
  const all = await fetchProjectIndex()
  let result = [...all]

  if (filters.tech) result = result.filter((p) => p.technology === filters.tech)
  if (filters.status) result = result.filter((p) => p.status === filters.status)
  if (filters.state) result = result.filter((p) => p.state === filters.state)

  return result
}

/**
 * Find a project by ID from the index. Returns summary + technology
 * so we know which subdirectory to fetch the full detail from.
 */
export async function findProjectSummary(id: string): Promise<ProjectSummary | null> {
  const all = await fetchProjectIndex()
  return all.find((p) => p.id === id) || null
}

/**
 * Fetch a project by ID (first finds its technology from the index,
 * then fetches the full detail JSON).
 */
export async function fetchProjectById(id: string): Promise<Project | null> {
  const summary = await findProjectSummary(id)
  if (!summary) return null
  return fetchProject(summary.technology, id)
}

// ============================================================
// Performance / League Table Fetchers
// ============================================================

let leagueIndexCache: LeagueTableIndex | null = null

export async function fetchLeagueTableIndex(): Promise<LeagueTableIndex | null> {
  if (leagueIndexCache) return leagueIndexCache
  try {
    const resp = await fetch(`${BASE}/performance/league-tables/index.json`)
    if (!resp.ok) return null
    leagueIndexCache = (await resp.json()) as LeagueTableIndex
    return leagueIndexCache
  } catch {
    return null
  }
}

export async function fetchLeagueTable(tech: LeagueTechnology, year: number): Promise<LeagueTable | null> {
  try {
    const resp = await fetch(`${BASE}/performance/league-tables/${tech}-${year}.json`)
    if (!resp.ok) return null
    return (await resp.json()) as LeagueTable
  } catch {
    return null
  }
}

// ============================================================
// Monthly Performance Data
// ============================================================

const monthlyCache: Record<string, ProjectMonthlyPerformance | null> = {}

export async function fetchMonthlyPerformance(projectId: string): Promise<ProjectMonthlyPerformance | null> {
  if (projectId in monthlyCache) return monthlyCache[projectId]
  try {
    const resp = await fetch(`${BASE}/performance/monthly/${projectId}.json`)
    if (!resp.ok) { monthlyCache[projectId] = null; return null }
    const data = (await resp.json()) as ProjectMonthlyPerformance
    monthlyCache[projectId] = data
    return data
  } catch {
    monthlyCache[projectId] = null
    return null
  }
}

// ============================================================
// Developer Profiles
// ============================================================

let developerIndexCache: DeveloperIndex | null = null

export async function fetchDeveloperIndex(): Promise<DeveloperIndex> {
  if (developerIndexCache) return developerIndexCache
  const resp = await fetch(`${BASE}/indexes/developer-profiles.json`)
  if (!resp.ok) throw new Error(`Failed to load developer profiles: ${resp.status}`)
  developerIndexCache = (await resp.json()) as DeveloperIndex
  return developerIndexCache
}

// ============================================================
// OEM Profiles
// ============================================================

let oemIndexCache: OEMIndex | null = null

export async function fetchOEMIndex(): Promise<OEMIndex> {
  if (oemIndexCache) return oemIndexCache
  const resp = await fetch(`${BASE}/indexes/oem-profiles.json`)
  if (!resp.ok) throw new Error(`Failed to load OEM profiles: ${resp.status}`)
  oemIndexCache = (await resp.json()) as OEMIndex
  return oemIndexCache
}

// ============================================================
// Contractor Profiles
// ============================================================

let contractorIndexCache: ContractorIndex | null = null

export async function fetchContractorIndex(): Promise<ContractorIndex> {
  if (contractorIndexCache) return contractorIndexCache
  const resp = await fetch(`${BASE}/indexes/contractor-profiles.json`)
  if (!resp.ok) throw new Error(`Failed to load contractor profiles: ${resp.status}`)
  contractorIndexCache = (await resp.json()) as ContractorIndex
  return contractorIndexCache
}

// ============================================================
// Offtaker Data
// ============================================================

let offtakerIndexCache: OfftakerIndex | null = null

export async function fetchOfftakerIndex(): Promise<OfftakerIndex> {
  if (offtakerIndexCache) return offtakerIndexCache
  const resp = await fetch(`${BASE}/indexes/offtaker-profiles.json`)
  if (!resp.ok) throw new Error(`Failed to load offtaker profiles: ${resp.status}`)
  offtakerIndexCache = (await resp.json()) as OfftakerIndex
  return offtakerIndexCache
}

// ============================================================
// Map Data
// ============================================================

let mapDataCache: MapProject[] | null = null

export async function fetchMapData(): Promise<MapProject[]> {
  if (mapDataCache) return mapDataCache
  const resp = await fetch(`${BASE}/indexes/by-coordinates.json`)
  if (!resp.ok) throw new Error(`Failed to load map data: ${resp.status}`)
  mapDataCache = (await resp.json()) as MapProject[]
  return mapDataCache
}

// ============================================================
// COD Drift Data
// ============================================================

let codDriftCache: CODDriftData | null = null

export async function fetchCODDrift(): Promise<CODDriftData | null> {
  if (codDriftCache) return codDriftCache
  try {
    const resp = await fetch(`${BASE}/indexes/cod-drift.json`)
    if (!resp.ok) return null
    codDriftCache = (await resp.json()) as CODDriftData
    return codDriftCache
  } catch {
    return null
  }
}

/**
 * Compute quick stats from the index (fallback if stats.json unavailable).
 */
export function computeStatsFromIndex(projects: ProjectSummary[]): QuickStats {
  const stats: QuickStats = {
    total: projects.length,
    total_capacity_mw: 0,
    total_storage_mwh: 0,
    by_technology: {},
    by_status: {},
    by_state: {},
  }

  for (const p of projects) {
    stats.total_capacity_mw += p.capacity_mw
    stats.total_storage_mwh += p.storage_mwh || 0

    // By tech
    if (!stats.by_technology[p.technology]) {
      stats.by_technology[p.technology] = { count: 0, capacity_mw: 0, storage_mwh: 0 }
    }
    stats.by_technology[p.technology].count++
    stats.by_technology[p.technology].capacity_mw += p.capacity_mw
    stats.by_technology[p.technology].storage_mwh += p.storage_mwh || 0

    // By status
    if (!stats.by_status[p.status]) {
      stats.by_status[p.status] = { count: 0, capacity_mw: 0 }
    }
    stats.by_status[p.status].count++
    stats.by_status[p.status].capacity_mw += p.capacity_mw

    // By state
    if (!stats.by_state[p.state]) {
      stats.by_state[p.state] = { count: 0, capacity_mw: 0 }
    }
    stats.by_state[p.state].count++
    stats.by_state[p.state].capacity_mw += p.capacity_mw
  }

  return stats
}

// ============================================================
// Data Sources Status
// ============================================================

let dataSourcesCache: DataSourcesIndex | null = null

let bessCapexCache: BESSCapexData | null = null

export async function fetchBESSCapex(): Promise<BESSCapexData | null> {
  if (bessCapexCache) return bessCapexCache
  try {
    const resp = await fetch(`${BASE}/analytics/bess-capex.json`)
    if (!resp.ok) return null
    bessCapexCache = (await resp.json()) as BESSCapexData
    return bessCapexCache
  } catch {
    return null
  }
}

let projectTimelineCache: ProjectTimelineData | null = null
export async function fetchProjectTimeline(): Promise<ProjectTimelineData | null> {
  if (projectTimelineCache) return projectTimelineCache
  try {
    const resp = await fetch(`${BASE}/analytics/project-timeline.json`)
    if (!resp.ok) return null
    projectTimelineCache = (await resp.json()) as ProjectTimelineData
    return projectTimelineCache
  } catch {
    return null
  }
}

export async function fetchDataSources(): Promise<DataSourcesIndex | null> {
  if (dataSourcesCache) return dataSourcesCache
  try {
    const resp = await fetch(`${BASE}/metadata/data-sources.json`)
    if (!resp.ok) return null
    dataSourcesCache = (await resp.json()) as DataSourcesIndex
    return dataSourcesCache
  } catch {
    return null
  }
}

// ============================================================
// Intelligence Layer
// ============================================================

let schemeTrackerCache: SchemeTrackerData | null = null
export async function fetchSchemeTracker(): Promise<SchemeTrackerData | null> {
  if (schemeTrackerCache) return schemeTrackerCache
  try {
    const resp = await fetch(`${BASE}/analytics/intelligence/scheme-tracker.json`)
    if (!resp.ok) return null
    schemeTrackerCache = (await resp.json()) as SchemeTrackerData
    return schemeTrackerCache
  } catch { return null }
}

let driftAnalysisCache: DriftAnalysisData | null = null
export async function fetchDriftAnalysis(): Promise<DriftAnalysisData | null> {
  if (driftAnalysisCache) return driftAnalysisCache
  try {
    const resp = await fetch(`${BASE}/analytics/intelligence/drift-analysis.json`)
    if (!resp.ok) return null
    driftAnalysisCache = (await resp.json()) as DriftAnalysisData
    return driftAnalysisCache
  } catch { return null }
}

let windResourceCache: WindResourceData | null = null
export async function fetchWindResource(): Promise<WindResourceData | null> {
  if (windResourceCache) return windResourceCache
  try {
    const resp = await fetch(`${BASE}/analytics/intelligence/wind-resource.json`)
    if (!resp.ok) return null
    windResourceCache = (await resp.json()) as WindResourceData
    return windResourceCache
  } catch { return null }
}

let dunkelflaunteCache: DunkelflaunteData | null = null
export async function fetchDunkelflaute(): Promise<DunkelflaunteData | null> {
  if (dunkelflaunteCache) return dunkelflaunteCache
  try {
    const resp = await fetch(`${BASE}/analytics/intelligence/dunkelflaute.json`)
    if (!resp.ok) return null
    dunkelflaunteCache = (await resp.json()) as DunkelflaunteData
    return dunkelflaunteCache
  } catch { return null }
}

let energyMixCache: EnergyMixData | null = null
export async function fetchEnergyMix(): Promise<EnergyMixData | null> {
  if (energyMixCache) return energyMixCache
  try {
    const resp = await fetch(`${BASE}/analytics/intelligence/energy-mix.json`)
    if (!resp.ok) return null
    energyMixCache = (await resp.json()) as EnergyMixData
    return energyMixCache
  } catch { return null }
}

let generationProfilesCache: GenerationProfileData | null = null
export async function fetchGenerationProfiles(): Promise<GenerationProfileData | null> {
  if (generationProfilesCache) return generationProfilesCache
  try {
    const resp = await fetch(`${BASE}/analytics/generation-profiles.json`)
    if (!resp.ok) return null
    generationProfilesCache = (await resp.json()) as GenerationProfileData
    return generationProfilesCache
  } catch { return null }
}

let developerScoresCache: DeveloperScoreData | null = null
export async function fetchDeveloperScores(): Promise<DeveloperScoreData | null> {
  if (developerScoresCache) return developerScoresCache
  try {
    const resp = await fetch(`${BASE}/analytics/intelligence/developer-scores.json`)
    if (!resp.ok) return null
    developerScoresCache = (await resp.json()) as DeveloperScoreData
    return developerScoresCache
  } catch { return null }
}

let revenueIntelCache: RevenueIntelData | null = null
export async function fetchRevenueIntel(): Promise<RevenueIntelData | null> {
  if (revenueIntelCache) return revenueIntelCache
  try {
    const resp = await fetch(`${BASE}/analytics/intelligence/revenue-intel.json`)
    if (!resp.ok) return null
    revenueIntelCache = (await resp.json()) as RevenueIntelData
    return revenueIntelCache
  } catch { return null }
}

let gridConnectionCache: GridConnectionData | null = null
export async function fetchGridConnection(): Promise<GridConnectionData | null> {
  if (gridConnectionCache) return gridConnectionCache
  try {
    const resp = await fetch(`${BASE}/analytics/intelligence/grid-connection.json`)
    if (!resp.ok) return null
    gridConnectionCache = (await resp.json()) as GridConnectionData
    return gridConnectionCache
  } catch { return null }
}

let newsCache: NewsData | null = null
export async function fetchNews(): Promise<NewsData | null> {
  if (newsCache) return newsCache
  try {
    const resp = await fetch(`${BASE}/news/latest.json`)
    if (!resp.ok) return null
    newsCache = (await resp.json()) as NewsData
    return newsCache
  } catch { return null }
}

// ============================================================
// NEM Activities Timeline
// ============================================================

let nemActivitiesCache: NemActivitiesData | null = null
export async function fetchNemActivities(): Promise<NemActivitiesData | null> {
  if (nemActivitiesCache) return nemActivitiesCache
  try {
    const resp = await fetch(`${BASE}/analytics/intelligence/nem-activities.json`)
    if (!resp.ok) return null
    nemActivitiesCache = (await resp.json()) as NemActivitiesData
    return nemActivitiesCache
  } catch { return null }
}

// ============================================================
// BESS Bidding Intelligence
// ============================================================

let bessBiddingCache: import('./types').BessBiddingData | null = null
export async function fetchBessBidding(): Promise<import('./types').BessBiddingData | null> {
  if (bessBiddingCache) return bessBiddingCache
  try {
    const resp = await fetch(`${BASE}/analytics/intelligence/bess-bidding.json`)
    if (!resp.ok) return null
    bessBiddingCache = (await resp.json()) as import('./types').BessBiddingData
    return bessBiddingCache
  } catch { return null }
}

// ============================================================
// EIS Analytics
// ============================================================

let eisAnalyticsCache: EISAnalyticsData | null = null
export async function fetchEISAnalytics(): Promise<EISAnalyticsData | null> {
  if (eisAnalyticsCache) return eisAnalyticsCache
  try {
    const resp = await fetch(`${BASE}/analytics/eis-analytics.json`)
    if (!resp.ok) return null
    eisAnalyticsCache = (await resp.json()) as EISAnalyticsData
    return eisAnalyticsCache
  } catch { return null }
}

let eisComparisonCache: EISComparisonData | null = null
// OEM analytics — per-OEM performance + developer cross-links + concentration
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let oemAnalyticsCache: any | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchOEMAnalytics(): Promise<any | null> {
  if (oemAnalyticsCache) return oemAnalyticsCache
  try {
    const resp = await fetch(`${BASE}/analytics/oem-analytics.json`)
    if (!resp.ok) return null
    oemAnalyticsCache = await resp.json()
    return oemAnalyticsCache
  } catch { return null }
}

// Developer analytics — per-developer equipment, COD drift, scheme wins,
// fleet performance, offtake counterparties, ownership events
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let developerAnalyticsCache: any | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchDeveloperAnalytics(): Promise<any | null> {
  if (developerAnalyticsCache) return developerAnalyticsCache
  try {
    const resp = await fetch(`${BASE}/analytics/developer-analytics.json`)
    if (!resp.ok) return null
    developerAnalyticsCache = await resp.json()
    return developerAnalyticsCache
  } catch { return null }
}

// Offtake analytics — PPA Market Mapper data: summary, types, top buyers,
// buyer portfolios, developer×offtaker matrix, uncontracted operating projects
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let offtakeAnalyticsCache: any | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchOfftakeAnalytics(): Promise<any | null> {
  if (offtakeAnalyticsCache) return offtakeAnalyticsCache
  try {
    const resp = await fetch(`${BASE}/analytics/offtake-analytics.json`)
    if (!resp.ok) return null
    offtakeAnalyticsCache = await resp.json()
    return offtakeAnalyticsCache
  } catch { return null }
}

// Lifecycle Quartile Matrix — state-of-the-nation grid by (tech, state, stage)
// with per-project scores + quartile assignments + drill IDs.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let lifecycleQuartileCache: any | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchLifecycleQuartile(): Promise<any | null> {
  if (lifecycleQuartileCache) return lifecycleQuartileCache
  try {
    const resp = await fetch(`${BASE}/analytics/lifecycle-quartile.json`)
    if (!resp.ok) return null
    lifecycleQuartileCache = await resp.json()
    return lifecycleQuartileCache
  } catch { return null }
}

// Contractor analytics — EPC/BoP concentration, developer pairings, OEM
// co-occurrence, full portfolio per contractor (T2.D Contractor Intelligence).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let contractorAnalyticsCache: any | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchContractorAnalytics(): Promise<any | null> {
  if (contractorAnalyticsCache) return contractorAnalyticsCache
  try {
    const resp = await fetch(`${BASE}/analytics/contractor-analytics.json`)
    if (!resp.ok) return null
    contractorAnalyticsCache = await resp.json()
    return contractorAnalyticsCache
  } catch { return null }
}

// Battery Live & Records — daily throughput, records board, latest snapshot
// for /intelligence/bess-portfolio Live & Records tab (v2.28.0).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let batteryLiveRecordsCache: any | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchBatteryLiveRecords(): Promise<any | null> {
  if (batteryLiveRecordsCache) return batteryLiveRecordsCache
  try {
    const resp = await fetch(`${BASE}/analytics/intelligence/battery-live-records.json`)
    if (!resp.ok) return null
    batteryLiveRecordsCache = await resp.json()
    return batteryLiveRecordsCache
  } catch { return null }
}

// BESS Records Leaderboard — per-battery + fleet all-time records (v2.32.0).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let bessRecordsLeaderboardCache: any | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchBessRecordsLeaderboard(): Promise<any | null> {
  if (bessRecordsLeaderboardCache) return bessRecordsLeaderboardCache
  try {
    const resp = await fetch(`${BASE}/analytics/intelligence/bess-records-leaderboard.json`)
    if (!resp.ok) return null
    bessRecordsLeaderboardCache = await resp.json()
    return bessRecordsLeaderboardCache
  } catch { return null }
}

// Coal Outage vs Dispatch — NEM/state/station decomposition of coal MWh
// reduction into outage (unavailable) vs displaced (available but not
// dispatched) vs dispatched (v2.27.0).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let coalOutageDispatchCache: any | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchCoalOutageDispatch(): Promise<any | null> {
  if (coalOutageDispatchCache) return coalOutageDispatchCache
  try {
    const resp = await fetch(`${BASE}/analytics/intelligence/coal-outage-dispatch.json`)
    if (!resp.ok) return null
    coalOutageDispatchCache = await resp.json()
    return coalOutageDispatchCache
  } catch { return null }
}

// Coal YTD + Same-Period Comparison — per-year aggregates from
// dispatch_availability with YTD (Jan 1 → cutoff day-of-year) and
// full-year modes for apples-to-apples cross-year comparison (v2.29.0).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let coalYtdComparisonCache: any | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchCoalYtdComparison(): Promise<any | null> {
  if (coalYtdComparisonCache) return coalYtdComparisonCache
  try {
    const resp = await fetch(`${BASE}/analytics/intelligence/coal-ytd-comparison.json`)
    if (!resp.ok) return null
    coalYtdComparisonCache = await resp.json()
    return coalYtdComparisonCache
  } catch { return null }
}

// Energy Transition Scoreboard — YoY coal vs wind/solar/BESS per region with
// YTD and full-year windows (v2.30.0).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let energyTransitionCache: any | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchEnergyTransition(): Promise<any | null> {
  if (energyTransitionCache) return energyTransitionCache
  try {
    const resp = await fetch(`${BASE}/analytics/intelligence/energy-transition.json`)
    if (!resp.ok) return null
    energyTransitionCache = await resp.json()
    return energyTransitionCache
  } catch { return null }
}

// Supply Chain Concentration Risk — dominance cells, at-risk OEM projects,
// dev×OEM single points of failure (T3.I).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let concentrationRiskCache: any | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchConcentrationRisk(): Promise<any | null> {
  if (concentrationRiskCache) return concentrationRiskCache
  try {
    const resp = await fetch(`${BASE}/analytics/intelligence/concentration-risk.json`)
    if (!resp.ok) return null
    concentrationRiskCache = await resp.json()
    return concentrationRiskCache
  } catch { return null }
}

// Scheme Win Probability — ranked development-stage projects (T3.J).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let schemeWinCache: any | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchSchemeWinProbability(): Promise<any | null> {
  if (schemeWinCache) return schemeWinCache
  try {
    const resp = await fetch(`${BASE}/analytics/intelligence/scheme-win-probability.json`)
    if (!resp.ok) return null
    schemeWinCache = await resp.json()
    return schemeWinCache
  } catch { return null }
}

// Asset Lifecycle & Repowering — age distribution, refurb candidates, aging OEMs,
// historic repowering deals, fleet turnover forecast (T3.H + T3.K).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let assetLifecycleCache: any | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchAssetLifecycle(): Promise<any | null> {
  if (assetLifecycleCache) return assetLifecycleCache
  try {
    const resp = await fetch(`${BASE}/analytics/intelligence/asset-lifecycle.json`)
    if (!resp.ok) return null
    assetLifecycleCache = await resp.json()
    return assetLifecycleCache
  } catch { return null }
}

// BESS portfolio — duration distribution + evolution, grid-forming, co-located,
// chemistry breakdown, network services registry (T2.G).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let bessPortfolioCache: any | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchBessPortfolio(): Promise<any | null> {
  if (bessPortfolioCache) return bessPortfolioCache
  try {
    const resp = await fetch(`${BASE}/analytics/intelligence/bess-portfolio.json`)
    if (!resp.ok) return null
    bessPortfolioCache = await resp.json()
    return bessPortfolioCache
  } catch { return null }
}

// Solar resource — mirrors fetchWindResource but for solar (T2.F).
// Shape is parallel to wind-resource but with solar-specific CF thresholds
// and extra capacity_class_benchmarks + developer_benchmarks sections.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let solarResourceCache: any | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchSolarResource(): Promise<any | null> {
  if (solarResourceCache) return solarResourceCache
  try {
    const resp = await fetch(`${BASE}/analytics/intelligence/solar-resource.json`)
    if (!resp.ok) return null
    solarResourceCache = await resp.json()
    return solarResourceCache
  } catch { return null }
}

export async function fetchEISComparison(): Promise<EISComparisonData | null> {
  if (eisComparisonCache) return eisComparisonCache
  try {
    const resp = await fetch(`${BASE}/analytics/eis-comparison.json`)
    if (!resp.ok) return null
    eisComparisonCache = (await resp.json()) as EISComparisonData
    return eisComparisonCache
  } catch { return null }
}

let eisCoverageCache: EISCoverageData | null = null
export async function fetchEISCoverage(): Promise<EISCoverageData | null> {
  if (eisCoverageCache) return eisCoverageCache
  try {
    const resp = await fetch(`${BASE}/analytics/eis-coverage.json`)
    if (!resp.ok) return null
    eisCoverageCache = (await resp.json()) as EISCoverageData
    return eisCoverageCache
  } catch { return null }
}

export interface EISPdfOpportunity {
  id: string; name: string; technology: string; state: string; capacity_mw: number
  data_gaps: string[]; eis_url: string | null; eis_year: number | null; priority: 'high' | 'medium' | 'low'
  status?: string; reason_eligible?: string
}
export interface EISPdfOpportunitiesData {
  summary: { total_opportunities: number; high_priority: number; medium_priority: number; low_priority: number; existing_projects_with_gaps: number; coverage_gap_candidates: number }
  opportunities: EISPdfOpportunity[]
}
let eisPdfCache: EISPdfOpportunitiesData | null = null
export async function fetchEISPdfOpportunities(): Promise<EISPdfOpportunitiesData | null> {
  if (eisPdfCache) return eisPdfCache
  try {
    const resp = await fetch(`${BASE}/analytics/eis-pdf-opportunities.json`)
    if (!resp.ok) return null
    eisPdfCache = (await resp.json()) as EISPdfOpportunitiesData
    return eisPdfCache
  } catch { return null }
}

// ============================================================
// REZ Access Rights
// ============================================================

// ============================================================
// Developer Data Quality
// ============================================================

export interface DevWebsiteProject {
  name: string; technology: string; capacity_mw: number; status: string
  in_aures: boolean; aures_id?: string; notes?: string
}
export interface DevWebsiteComparison {
  developer: string; slug: string; website_url: string
  website_projects: DevWebsiteProject[]; aures_projects: string[]
  match_count: number; website_only_count: number; aures_only_count: number
}
export interface DevJVPartnership {
  project_id: string; project_name: string; partners: string[]
  structure: string; source: string
}
export interface DevCorrection {
  project_id: string; project_name: string; current_developer: string
  suggested_developer: string; reason: string; confidence: 'high' | 'medium' | 'low'
}
export interface DevDataQuality {
  generated: string
  website_comparison: DevWebsiteComparison[]
  jv_partnerships: DevJVPartnership[]
  developer_corrections: DevCorrection[]
  summary: {
    developers_audited: number; total_discrepancies: number
    jv_projects_found: number; spv_corrections_suggested: number
    high_confidence_corrections: number
  }
}

let devDataQualityCache: DevDataQuality | null = null
export async function fetchDevDataQuality(): Promise<DevDataQuality | null> {
  if (devDataQualityCache) return devDataQualityCache
  try {
    const resp = await fetch(`${BASE}/analytics/developer-data-quality.json`)
    if (!resp.ok) return null
    devDataQualityCache = (await resp.json()) as DevDataQuality
    return devDataQualityCache
  } catch { return null }
}

// ============================================================
// Battery Watch
// ============================================================

let batteryWatchCache: BatteryWatchData | null = null
export async function fetchBatteryWatch(): Promise<BatteryWatchData | null> {
  if (batteryWatchCache) return batteryWatchCache
  try {
    const resp = await fetch(`${BASE}/analytics/battery-watch.json`)
    if (!resp.ok) return null
    batteryWatchCache = (await resp.json()) as BatteryWatchData
    return batteryWatchCache
  } catch { return null }
}

// ============================================================
// Capacity Watch (Wind / Solar)
// ============================================================

let windWatchCache: CapacityWatchData | null = null
export async function fetchWindWatch(): Promise<CapacityWatchData | null> {
  if (windWatchCache) return windWatchCache
  try {
    const resp = await fetch(`${BASE}/analytics/wind-watch.json`)
    if (!resp.ok) return null
    windWatchCache = (await resp.json()) as CapacityWatchData
    return windWatchCache
  } catch { return null }
}

let solarWatchCache: CapacityWatchData | null = null
export async function fetchSolarWatch(): Promise<CapacityWatchData | null> {
  if (solarWatchCache) return solarWatchCache
  try {
    const resp = await fetch(`${BASE}/analytics/solar-watch.json`)
    if (!resp.ok) return null
    solarWatchCache = (await resp.json()) as CapacityWatchData
    return solarWatchCache
  } catch { return null }
}

// ============================================================
// Market Prices
// ============================================================

export interface MarketPriceProfile {
  hourly_avg: Record<string, number>
  midday_avg: number | null
  evening_avg: number | null
  spread_evening_minus_midday: number | null
  negative_pct: number
  zero_or_negative_pct: number
  spike_gt300_pct: number
  spike_gt300_count: number
  total_intervals: number
  data_days: number
}

export interface MarketPricesData {
  generated_at: string
  monthly_trends: Record<string, { month: string; avg_price: number }[]>
  time_of_day_profiles: Record<string, MarketPriceProfile>
}

let marketPricesCache: MarketPricesData | null = null
export async function fetchMarketPrices(): Promise<MarketPricesData | null> {
  if (marketPricesCache) return marketPricesCache
  try {
    const resp = await fetch(`${BASE}/analytics/intelligence/market-prices.json`)
    if (!resp.ok) return null
    marketPricesCache = (await resp.json()) as MarketPricesData
    return marketPricesCache
  } catch { return null }
}

// ============================================================
// Coal Watch
// ============================================================

let coalWatchCache: CoalWatchData | null = null
export async function fetchCoalWatch(): Promise<CoalWatchData | null> {
  if (coalWatchCache) return coalWatchCache
  try {
    const resp = await fetch(`${BASE}/analytics/coal-watch.json`)
    if (!resp.ok) return null
    coalWatchCache = (await resp.json()) as CoalWatchData
    return coalWatchCache
  } catch { return null }
}

let rezAccessCache: REZAccessMap | null = null
export async function fetchREZAccess(): Promise<REZAccessMap | null> {
  if (rezAccessCache) return rezAccessCache
  try {
    const resp = await fetch(`${BASE}/analytics/rez-access.json`)
    if (!resp.ok) return null
    rezAccessCache = (await resp.json()) as REZAccessMap
    return rezAccessCache
  } catch { return null }
}

// ============================================================
// Value Analysis Data (Wind + Solar cannibalisation)
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let windValueCache: any | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchWindValue(): Promise<any | null> {
  if (windValueCache) return windValueCache
  try {
    const resp = await fetch(`${BASE}/analytics/wind-value.json`)
    if (!resp.ok) return null
    windValueCache = await resp.json()
    return windValueCache
  } catch { return null }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let solarValueCache: any | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchSolarValue(): Promise<any | null> {
  if (solarValueCache) return solarValueCache
  try {
    const resp = await fetch(`${BASE}/analytics/intelligence/solar-value.json`)
    if (!resp.ok) return null
    solarValueCache = await resp.json()
    return solarValueCache
  } catch { return null }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let bessValueCache: any | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchBessValue(): Promise<any | null> {
  if (bessValueCache) return bessValueCache
  try {
    const resp = await fetch(`${BASE}/analytics/intelligence/bess-value.json`)
    if (!resp.ok) return null
    bessValueCache = await resp.json()
    return bessValueCache
  } catch { return null }
}
