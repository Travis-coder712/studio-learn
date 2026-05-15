import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts'
import { useLeagueTableIndex, useLeagueTable, useFilteredLeagueTable } from '../hooks/usePerformanceData'
import { fetchMonthlyPerformance, fetchLeagueTable, fetchWindValue, fetchSolarValue } from '../lib/dataService'
import type { LeagueTable, LeagueTechnology, LeagueTableEntry, State, ProjectMonthlyPerformance } from '../lib/types'
import DataProvenance from '../components/common/DataProvenance'
import DrillPanel from '../components/common/DrillPanel'
import DataTable from '../components/common/DataTable'

// ============================================================
// Info Tooltip Definitions
// ============================================================

const InfoIcon = () => (
  <svg className="w-3 h-3 inline-block ml-0.5 opacity-50 hover:opacity-100 transition-opacity" viewBox="0 0 16 16" fill="currentColor">
    <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <text x="8" y="12" textAnchor="middle" fontSize="10" fontWeight="bold">i</text>
  </svg>
)

interface MetricInfo {
  label: string
  description: string
  formula?: string
  source: string
}

const METRIC_INFO: Record<string, MetricInfo> = {
  capacity_factor: {
    label: 'Capacity Factor (CF%)',
    description: 'The ratio of actual energy output to the theoretical maximum output if the plant ran at full capacity 24/7. Higher is better — top wind farms achieve 35-50%, solar 20-30%.',
    formula: 'CF = (Energy MWh) / (Capacity MW × Hours in Period) × 100',
    source: 'Calculated from AEMO dispatch data via OpenElectricity API.',
  },
  revenue_per_mw: {
    label: 'Revenue per MW (Rev/MW)',
    description: 'Total market revenue divided by nameplate capacity. Measures the earning efficiency of each MW installed. Influenced by both output and price captured.',
    formula: 'Rev/MW = Market Value ($) / Capacity (MW)',
    source: 'Market value from AEMO settlement data via OpenElectricity API.',
  },
  price_received: {
    label: 'Price Received ($/MWh)',
    description: 'The average wholesale price received for energy generated, weighted by dispatch interval volume. Varies by time-of-day generation profile.',
    formula: '$/MWh = Market Value ($) / Energy Generated (MWh)',
    source: 'Derived from AEMO dispatch and settlement data via OpenElectricity API.',
  },
  curtailment: {
    label: 'Curtailment (%)',
    description: 'The estimated percentage of potential generation that was curtailed (turned down or off) due to network constraints, negative prices, or AEMO directions. Lower is better.',
    formula: 'Estimated from dispatch data patterns and AEMO constraint equations.',
    source: 'Estimated from AEMO dispatch data. Currently indicative only — precise curtailment data requires NEMWEB constraint analysis.',
  },
  spread: {
    label: 'Price Spread ($/MWh)',
    description: 'The difference between average discharge (selling) price and average charge (buying) price. The core profit driver for BESS — higher spreads mean better arbitrage returns.',
    formula: 'Spread = Avg Discharge Price - Avg Charge Price',
    source: 'Derived from AEMO battery unit dispatch data via OpenElectricity API.',
  },
  cycles: {
    label: 'Annual Cycles',
    description: 'The number of full charge-discharge cycles completed per year. One cycle = fully discharging the battery storage capacity once. Indicates utilisation intensity.',
    formula: 'Cycles = Total Energy Discharged (MWh) / Storage Capacity (MWh)',
    source: 'Calculated from AEMO dispatch data via OpenElectricity API.',
  },
  utilisation: {
    label: 'Utilisation (%)',
    description: 'The percentage of time the battery was actively discharging energy to the grid. Higher utilisation generally means more revenue opportunities captured.',
    formula: 'Utilisation = Energy Discharged / (Capacity MW × Hours in Period) × 100',
    source: 'Approximated from AEMO battery unit dispatch data via OpenElectricity API.',
  },
  discharged: {
    label: 'Energy Discharged',
    description: 'Total energy exported to the grid from the battery during the period. Battery units are tracked separately as charging and discharging in AEMO systems.',
    source: 'AEMO battery discharging unit data via OpenElectricity API.',
  },
  charged: {
    label: 'Energy Charged',
    description: 'Total energy imported from the grid to charge the battery during the period. Typically 10-15% higher than discharged energy due to round-trip efficiency losses.',
    source: 'AEMO battery charging unit data via OpenElectricity API.',
  },
  composite_rank: {
    label: 'Composite Ranking',
    description: 'Overall performance ranking combining multiple metrics. For wind/solar: 40% capacity factor + 40% revenue/MW + 20% curtailment (inverted). For BESS: 30% revenue + 30% utilisation + 20% spread + 20% cycles.',
    source: 'Calculated by AURES from underlying AEMO metrics.',
  },
  quartile: {
    label: 'Performance Quartile',
    description: 'Projects are divided into four equal groups based on composite score. Q1 (top 25%) are the best performers, Q4 (bottom 25%) are the lowest ranked.',
    source: 'Calculated by AURES from composite performance scores.',
  },
  value_factor: {
    label: 'Value Factor (VF)',
    description: 'The ratio of the average price received (capture price) to the pool average price. Values below 1.0 indicate price cannibalisation — the asset generates at times when many others also generate, depressing wholesale prices. Solar VF is typically 0.5–0.8 and declining as more solar enters the market.',
    formula: 'VF = Capture Price / Pool Average Price',
    source: 'Computed from AEMO 5-minute NEMWEB dispatch data.',
  },
}

function InfoTooltip({ metricKey }: { metricKey: string }) {
  const [show, setShow] = useState(false)
  const info = METRIC_INFO[metricKey]
  if (!info) return null

  return (
    <span className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setShow(!show) }}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="appearance-none border-none bg-transparent cursor-help p-0 leading-none"
        aria-label={`Info: ${info.label}`}
      >
        <InfoIcon />
      </button>
      {show && (
        <div
          className="absolute z-50 w-72 p-3 rounded-xl shadow-xl text-left
            bg-[var(--color-bg-elevated)] border border-[var(--color-border)]
            bottom-full left-1/2 -translate-x-1/2 mb-2"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-[11px] font-semibold text-[var(--color-text)] mb-1">{info.label}</p>
          <p className="text-[10px] text-[var(--color-text-muted)] mb-2 leading-relaxed">{info.description}</p>
          {info.formula && (
            <p className="text-[10px] text-[var(--color-primary)] font-mono mb-1.5 bg-[var(--color-bg-card)] rounded px-1.5 py-1">
              {info.formula}
            </p>
          )}
          <p className="text-[9px] text-[var(--color-text-muted)] italic border-t border-[var(--color-border)] pt-1.5 mt-1">
            📡 {info.source}
          </p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="w-2 h-2 bg-[var(--color-bg-elevated)] border-r border-b border-[var(--color-border)] rotate-45 -translate-y-1" />
          </div>
        </div>
      )}
    </span>
  )
}

// ============================================================
// Constants
// ============================================================

const TECH_TABS: { label: string; value: LeagueTechnology }[] = [
  { label: 'Wind', value: 'wind' },
  { label: 'Solar', value: 'solar' },
  { label: 'BESS', value: 'bess' },
  { label: 'Hydro', value: 'pumped_hydro' },
]

const STATE_TABS: { label: string; value: State | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'NSW', value: 'NSW' },
  { label: 'VIC', value: 'VIC' },
  { label: 'QLD', value: 'QLD' },
  { label: 'SA', value: 'SA' },
  { label: 'TAS', value: 'TAS' },
  { label: 'WA', value: 'WA' },
]

const QUARTILE_COLORS: Record<number, string> = {
  1: '#22c55e',
  2: '#3b82f6',
  3: '#f59e0b',
  4: '#ef4444',
}

const QUARTILE_LABELS: Record<number, string> = {
  1: 'Q1 — Top 25%',
  2: 'Q2 — Above Median',
  3: 'Q3 — Below Median',
  4: 'Q4 — Bottom 25%',
}

type SortField = 'rank' | 'capacity' | 'cf' | 'price' | 'rev' | 'curtailment' | 'spread' | 'util' | 'cycles' | 'discharged' | 'charged' | 'vf'

interface ValueProject {
  id: string
  state: string
  annual_data: Array<{ year: number; capture_price?: number; months?: number }>
  value_summary: { avg_value_factor?: number }
}
interface ValueDataFile {
  pool_prices: Record<string, Record<string, number>>
  state_averages: Record<string, { avg_value_factor?: number }>
  projects: Record<string, ValueProject>
}
type SortDir = 'asc' | 'desc'

// ============================================================
// Main Component
// ============================================================

export default function Performance() {
  const { index, loading: indexLoading } = useLeagueTableIndex()
  const [tech, setTech] = useState<LeagueTechnology>('wind')
  // Default to latest available year
  const latestYear = index?.available_years?.[index.available_years.length - 1] ?? 2025
  const [year, setYear] = useState<number | 'all'>(latestYear)
  const [stateFilter, setStateFilter] = useState<State | 'ALL'>('ALL')
  const [showUpdatePanel, setShowUpdatePanel] = useState(false)
  const [sortField, setSortField] = useState<SortField>('rank')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [drill, setDrill] = useState<1 | 2 | 3 | 4 | null>(null)
  const [valueData, setValueData] = useState<ValueDataFile | null>(null)

  // Load value factor data for wind/solar
  useEffect(() => {
    if (tech === 'wind') {
      fetchWindValue().then(d => setValueData(d))
    } else if (tech === 'solar') {
      fetchSolarValue().then(d => setValueData(d))
    } else {
      setValueData(null)
    }
  }, [tech])

  // Sync year when index loads
  const [yearInitialized, setYearInitialized] = useState(false)
  if (index && !yearInitialized) {
    const latest = index.available_years[index.available_years.length - 1]
    if (latest && latest !== year) setYear(latest)
    setYearInitialized(true)
  }

  // For "All Years" mode, load all tables and compute averages
  const [allYearsTables, setAllYearsTables] = useState<LeagueTable[]>([])
  const [allYearsLoading, setAllYearsLoading] = useState(false)

  useEffect(() => {
    if (year !== 'all' || !index) {
      setAllYearsTables([])
      return
    }
    setAllYearsLoading(true)
    Promise.all(
      index.available_years.map(y => fetchLeagueTable(tech, y).catch(() => null))
    ).then(results => {
      setAllYearsTables(results.filter((t): t is LeagueTable => t !== null))
      setAllYearsLoading(false)
    })
  }, [year, tech, index])

  const allYearsTable = useMemo<LeagueTable | null>(() => {
    if (year !== 'all' || allYearsTables.length === 0) return null

    // Aggregate: for each project, average its metrics across years it appears
    const projectMap = new Map<string, { entries: LeagueTableEntry[]; count: number }>()
    for (const t of allYearsTables) {
      for (const p of t.projects) {
        const existing = projectMap.get(p.project_id)
        if (existing) {
          existing.entries.push(p)
          existing.count++
        } else {
          projectMap.set(p.project_id, { entries: [p], count: 1 })
        }
      }
    }

    const avgProjects: LeagueTableEntry[] = []
    for (const [, { entries }] of projectMap) {
      const n = entries.length
      const base = { ...entries[entries.length - 1] } // Use latest entry as template
      const avg = (vals: (number | undefined | null)[]) => {
        const valid = vals.filter((v): v is number => v != null)
        return valid.length > 0 ? valid.reduce((s, v) => s + v, 0) / valid.length : undefined
      }
      base.capacity_factor_pct = avg(entries.map(e => e.capacity_factor_pct))
      base.revenue_per_mw = avg(entries.map(e => e.revenue_per_mw))
      base.curtailment_pct = avg(entries.map(e => e.curtailment_pct))
      base.energy_price_received = avg(entries.map(e => e.energy_price_received))
      base.utilisation_pct = avg(entries.map(e => e.utilisation_pct))
      base.avg_charge_price = avg(entries.map(e => e.avg_charge_price))
      base.avg_discharge_price = avg(entries.map(e => e.avg_discharge_price))
      base.cycles = avg(entries.map(e => e.cycles))
      base.years_of_data = n
      avgProjects.push(base)
    }

    // Re-rank by composite metric
    const isBess = tech === 'bess' || tech === 'pumped_hydro'
    avgProjects.sort((a, b) => {
      if (isBess) {
        const scoreA = (a.revenue_per_mw ?? 0)
        const scoreB = (b.revenue_per_mw ?? 0)
        return scoreB - scoreA
      }
      return (b.capacity_factor_pct ?? 0) - (a.capacity_factor_pct ?? 0)
    })
    avgProjects.forEach((p, i) => {
      p.rank_composite = i + 1
      p.quartile = Math.min(4, Math.floor(i / (avgProjects.length / 4)) + 1) as 1 | 2 | 3 | 4
    })

    return {
      year: 0,
      technology: tech,
      data_source: 'openelectricity',
      fleet_avg: {
        capacity_factor_pct: avg(avgProjects.map(p => p.capacity_factor_pct)),
        revenue_per_mw: avg(avgProjects.map(p => p.revenue_per_mw)),
        curtailment_pct: avg(avgProjects.map(p => p.curtailment_pct)),
        count: avgProjects.length,
      },
      projects: avgProjects,
    } satisfies LeagueTable

    function avg(vals: (number | undefined)[]): number | undefined {
      const valid = vals.filter((v): v is number => v != null)
      return valid.length > 0 ? valid.reduce((s, v) => s + v, 0) / valid.length : undefined
    }
  }, [allYearsTables, year, tech])

  const singleYearTable = useLeagueTable(tech, typeof year === 'number' ? year : latestYear)
  const table = year === 'all' ? allYearsTable : singleYearTable.table
  const tableLoading = year === 'all' ? allYearsLoading : singleYearTable.loading
  const filtered = useFilteredLeagueTable(table, stateFilter)

  const isYTD = year !== 'all' && table?.data_source === 'openelectricity_ytd'

  // Helper: get project count for a given year+tech from index
  const getYearCount = useCallback((y: number) => {
    if (!index) return 0
    const entry = index.tables.find(t => t.year === y && t.technology === tech)
    return entry?.count ?? 0
  }, [index, tech])

  // Sort
  const sorted = useMemo(() => {
    if (!filtered?.projects) return []
    const projects = [...filtered.projects]

    const getter = (p: LeagueTableEntry): number => {
      switch (sortField) {
        case 'rank': return p.rank_composite
        case 'capacity': return p.capacity_mw
        case 'cf': return p.capacity_factor_pct ?? 0
        case 'price': return p.energy_price_received ?? 0
        case 'rev': return p.revenue_per_mw ?? 0
        case 'curtailment': return p.curtailment_pct ?? 0
        case 'spread': return (p.avg_discharge_price ?? 0) - (p.avg_charge_price ?? 0)
        case 'util': return p.utilisation_pct ?? 0
        case 'cycles': return p.cycles ?? 0
        case 'discharged': return p.energy_discharged_mwh ?? 0
        case 'charged': return p.energy_charged_mwh ?? 0
        case 'vf': return vfMap.get(p.project_id) ?? 0
        default: return p.rank_composite
      }
    }

    projects.sort((a, b) => {
      const va = getter(a)
      const vb = getter(b)
      return sortDir === 'asc' ? va - vb : vb - va
    })
    return projects
  }, [filtered, sortField, sortDir])

  // Map project_id → avg value factor (from wind-value.json / solar-value.json)
  const vfMap = useMemo<Map<string, number>>(() => {
    const m = new Map<string, number>()
    if (!valueData?.projects) return m
    for (const [id, p] of Object.entries(valueData.projects)) {
      const vf = p.value_summary?.avg_value_factor
      if (vf != null) m.set(id, vf)
    }
    return m
  }, [valueData])

  const fleetAvgVF = useMemo(() => {
    if (vfMap.size === 0 || !sorted.length) return undefined
    const vals = sorted.map(p => vfMap.get(p.project_id)).filter((v): v is number => v != null)
    return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : undefined
  }, [vfMap, sorted])

  // Annual VF trend (fleet avg per year — for cannibalisation chart)
  const vfTrendData = useMemo(() => {
    if (!valueData) return []
    const yearMap = new Map<number, { total: number; count: number }>()
    for (const proj of Object.values(valueData.projects)) {
      for (const ann of proj.annual_data) {
        const poolPrice = valueData.pool_prices[proj.state]?.[String(ann.year)]
        if (!poolPrice || !ann.capture_price || poolPrice <= 0) continue
        const vf = ann.capture_price / poolPrice
        if (vf <= 0 || vf > 2) continue
        const entry = yearMap.get(ann.year) ?? { total: 0, count: 0 }
        entry.total += vf
        entry.count++
        yearMap.set(ann.year, entry)
      }
    }
    return Array.from(yearMap.entries())
      .sort((a, b) => a[0] - b[0])
      .filter(([, { count }]) => count >= 3)
      .map(([year, { total, count }]) => ({
        year: String(year),
        vf: Math.round((total / count) * 1000) / 1000,
        count,
      }))
  }, [valueData])

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir(field === 'rank' ? 'asc' : 'desc')
    }
  }, [sortField, sortDir])

  const SortHeader = ({ field, label, className, infoKey }: { field: SortField; label: string; className?: string; infoKey?: string }) => (
    <th
      className={`px-2 py-2 text-left cursor-pointer hover:text-[var(--color-text)] select-none ${className ?? ''}`}
      onClick={() => handleSort(field)}
    >
      {label}
      {infoKey && <InfoTooltip metricKey={infoKey} />}
      {sortField === field && (
        <span className="ml-0.5 text-[10px]">{sortDir === 'asc' ? '▲' : '▼'}</span>
      )}
    </th>
  )

  // Quartile distribution for chart
  const quartileData = useMemo(() => {
    if (!filtered?.projects) return []
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
    for (const p of filtered.projects) {
      counts[p.quartile] = (counts[p.quartile] || 0) + 1
    }
    return [
      { name: 'Q1', quartile: 1 as const, count: counts[1], fill: QUARTILE_COLORS[1] },
      { name: 'Q2', quartile: 2 as const, count: counts[2], fill: QUARTILE_COLORS[2] },
      { name: 'Q3', quartile: 3 as const, count: counts[3], fill: QUARTILE_COLORS[3] },
      { name: 'Q4', quartile: 4 as const, count: counts[4], fill: QUARTILE_COLORS[4] },
    ]
  }, [filtered])

  // Drill-down projects filtered by selected quartile
  const drillProjects = useMemo(() => {
    if (drill === null || !filtered?.projects) return []
    return filtered.projects.filter((p) => p.quartile === drill)
  }, [drill, filtered])

  // No data state
  if (indexLoading) {
    return (
      <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-[var(--color-bg-card)] rounded w-64" />
          <div className="h-10 bg-[var(--color-bg-card)] rounded w-48" />
          <div className="h-96 bg-[var(--color-bg-card)] rounded-xl" />
        </div>
      </div>
    )
  }

  if (!index || index.available_years.length === 0) {
    return (
      <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto space-y-6">
        <section>
          <h1 className="text-2xl lg:text-3xl font-bold text-[var(--color-text)] mb-2">
            Performance League Tables
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Performance data not yet available. Run the pipeline to generate league tables.
          </p>
        </section>
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-8 text-center">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-sm text-[var(--color-text-muted)] mb-2">No performance data loaded yet.</p>
          <p className="text-xs text-[var(--color-text-muted)]">
            Run: python3 pipeline/importers/import_openelectricity.py --year 2025
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <section>
        <h1 className="text-2xl lg:text-3xl font-bold text-[var(--color-text)] mb-2">
          Performance League Tables
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Operational performance rankings across {table?.fleet_avg.count ?? '...'} projects.
          Ranked by capacity factor, revenue, and curtailment.
          <InfoTooltip metricKey="composite_rank" />
        </p>
        <Link
          to="/guides/performance-methodology"
          className="inline-flex items-center gap-1.5 mt-2 text-xs text-[var(--color-primary)] hover:underline"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <text x="8" y="12" textAnchor="middle" fontSize="10" fontWeight="bold">i</text>
          </svg>
          How are these metrics calculated?
        </Link>
        <div className="mt-3">
          <DataProvenance
            sources={tech === 'bess' ? ['openelectricity_performance', 'nemweb_bids', 'json_export'] : ['openelectricity_performance', 'json_export']}
          />
        </div>
        {(table || index) && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {/* Data freshness badge */}
            {index?.last_updated && (() => {
              const days = Math.floor((Date.now() - new Date(index.last_updated).getTime()) / 86400000)
              const color = days < 7 ? 'emerald' : days < 30 ? 'amber' : 'red'
              return (
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-${color}-500/10 text-${color}-400 border border-${color}-500/20`}
                  style={{
                    backgroundColor: color === 'emerald' ? 'rgb(16 185 129 / 0.1)' : color === 'amber' ? 'rgb(245 158 11 / 0.1)' : 'rgb(239 68 68 / 0.1)',
                    color: color === 'emerald' ? 'rgb(52 211 153)' : color === 'amber' ? 'rgb(251 191 36)' : 'rgb(248 113 113)',
                    borderColor: color === 'emerald' ? 'rgb(16 185 129 / 0.2)' : color === 'amber' ? 'rgb(245 158 11 / 0.2)' : 'rgb(239 68 68 / 0.2)',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{
                    backgroundColor: color === 'emerald' ? 'rgb(52 211 153)' : color === 'amber' ? 'rgb(251 191 36)' : 'rgb(248 113 113)',
                  }} />
                  Updated {days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`}
                </span>
              )
            })()}
            {table && (table.data_source === 'openelectricity' || table.data_source === 'openelectricity_ytd') ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                AEMO data via OpenElectricity
              </span>
            ) : table?.data_source === 'sample' ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Sample data — projected estimates
              </span>
            ) : null}
            {isYTD && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                Year to Date (Jan–Feb)
              </span>
            )}
            {year === 'all' && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                All Years Average (2018–2026)
              </span>
            )}
          </div>
        )}
      </section>

      {/* Technology Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TECH_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setTech(tab.value); setSortField('rank'); setSortDir('asc') }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              tech === tab.value
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)]'
            }`}
          >
            {tab.label}
          </button>
        ))}

        {/* Year selector */}
        <select
          value={year === 'all' ? 'all' : String(year)}
          onChange={(e) => setYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="ml-auto px-3 py-2 rounded-lg text-sm bg-[var(--color-bg-card)] text-[var(--color-text)] border border-[var(--color-border)]"
        >
          <option value="all">All Years (avg)</option>
          {[...index.available_years].reverse().map((y) => {
            const count = getYearCount(y)
            const isCurrentYear = y === new Date().getFullYear()
            return (
              <option key={y} value={y}>
                {y}{isCurrentYear ? ' (YTD)' : ''} — {count} projects
              </option>
            )
          })}
        </select>
      </div>

      {/* Fleet Summary Cards */}
      {table && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Projects Ranked"
            value={String(filtered?.projects.length ?? table.fleet_avg.count)}
            color="var(--color-primary)"
          />
          {table.fleet_avg.capacity_factor_pct != null && (
            <StatCard
              label={tech === 'bess' ? 'Avg Utilisation' : 'Avg Capacity Factor'}
              value={`${table.fleet_avg.capacity_factor_pct.toFixed(1)}%`}
              color="#22c55e"
              infoKey={tech === 'bess' ? 'utilisation' : 'capacity_factor'}
            />
          )}
          {table.fleet_avg.revenue_per_mw != null && (
            <StatCard
              label={year === 'all' ? 'Avg Rev/MW (All)' : isYTD ? 'Avg Rev/MW (YTD)' : 'Avg Revenue/MW'}
              value={`$${(table.fleet_avg.revenue_per_mw / 1000).toFixed(0)}k`}
              color="#3b82f6"
              infoKey="revenue_per_mw"
            />
          )}
          {tech !== 'bess' && fleetAvgVF != null ? (
            <StatCard
              label="Avg Value Factor"
              value={fleetAvgVF.toFixed(3)}
              color="#8b5cf6"
              infoKey="value_factor"
            />
          ) : tech !== 'bess' && table.fleet_avg.curtailment_pct != null && (
            <StatCard
              label="Avg Curtailment"
              value={`${table.fleet_avg.curtailment_pct.toFixed(1)}%`}
              color="#f59e0b"
              infoKey="curtailment"
            />
          )}
        </section>
      )}

      {/* State Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATE_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStateFilter(tab.value)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              stateFilter === tab.value
                ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/30'
                : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* League Table */}
      {tableLoading ? (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-8">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 bg-[var(--color-bg-elevated)] rounded" />
            ))}
          </div>
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-8 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            No {tech} projects found{stateFilter !== 'ALL' ? ` in ${stateFilter}` : ''}.
          </p>
        </div>
      ) : (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                  <SortHeader field="rank" label="#" className="w-10" infoKey="composite_rank" />
                  <th className="px-2 py-2 text-left">Project</th>
                  <th className="px-2 py-2 text-left w-12">State</th>
                  <SortHeader field="capacity" label="MW" />
                  {tech === 'bess' ? (
                    <>
                      <SortHeader field="discharged" label="Disch." infoKey="discharged" />
                      <SortHeader field="charged" label="Chg." infoKey="charged" />
                      <SortHeader field="spread" label="Spread" infoKey="spread" />
                      <SortHeader field="cycles" label="Cycles" infoKey="cycles" />
                      <SortHeader field="rev" label="Rev/MW" infoKey="revenue_per_mw" />
                    </>
                  ) : (
                    <>
                      <SortHeader field="cf" label="CF%" infoKey="capacity_factor" />
                      <SortHeader field="price" label="$/MWh" infoKey="price_received" />
                      <SortHeader field="rev" label="Rev/MW" infoKey="revenue_per_mw" />
                      <SortHeader field="curtailment" label="Curt%" infoKey="curtailment" />
                      {vfMap.size > 0 && (
                        <SortHeader field="vf" label="VF" infoKey="value_factor" />
                      )}
                    </>
                  )}
                  {year === 'all' && (
                    <th className="px-2 py-2 text-left w-12 text-[var(--color-text-muted)]">Yrs</th>
                  )}
                  <th className="px-2 py-2 text-left w-12">
                    Q<InfoTooltip metricKey="quartile" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => (
                  <LeagueRow key={p.project_id} entry={p} tech={tech} showYears={year === 'all'} vfMap={vfMap} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quartile Distribution */}
      {quartileData.some((d) => d.count > 0) && (
        <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[var(--color-text)] mb-1">
            Quartile Distribution
          </h2>
          <p className="text-[11px] text-[var(--color-text-muted)]/70 mb-3 italic">
            Click any bar to see projects.
          </p>
          <div className="flex items-center gap-4 mb-3">
            {[1, 2, 3, 4].map((q) => (
              <div key={q} className="flex items-center gap-1.5 text-[10px]">
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: QUARTILE_COLORS[q] }}
                />
                <span className="text-[var(--color-text-muted)]">{QUARTILE_LABELS[q]}</span>
              </div>
            ))}
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={quartileData}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={(e: any) => {
                  const p = e?.activePayload?.[0]?.payload
                  if (p?.quartile) setDrill(p.quartile as 1 | 2 | 3 | 4)
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    color: '#f1f5f9',
                    fontSize: 13,
                  }}
                  itemStyle={{ color: '#f1f5f9' }}
                  formatter={(value) => `${value} projects`}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} cursor="pointer">
                  {quartileData.map((entry, idx) => (
                    <rect key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Fleet Monthly Trends */}
      {table && <FleetMonthlyTrends projects={sorted} tech={tech} year={year} />}

      {/* Cannibalisation Value Factor Trend */}
      {vfTrendData.length >= 2 && (
        <FleetValueTrend data={vfTrendData} tech={tech} />
      )}

      {/* Data Methodology */}
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-sm font-semibold text-[var(--color-text)] mb-2">
          About This Data
        </h2>
        <div className="space-y-2 text-[10px] text-[var(--color-text-muted)] leading-relaxed">
          <p>
            Performance data is sourced from <strong className="text-[var(--color-text)]">AEMO dispatch and settlement records</strong> via the <a href="https://openelectricity.org.au" target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] hover:underline">OpenElectricity API</a>.
            This covers all NEM-registered generation and storage facilities.
          </p>
          <p>
            <strong className="text-[var(--color-text)]">Capacity factor</strong> is calculated using nameplate capacity and actual energy output.
            <strong className="text-[var(--color-text)]"> Revenue</strong> reflects wholesale market value only — it excludes LGC revenue, contract premiums, and ancillary services.
            <strong className="text-[var(--color-text)]"> Curtailment</strong> is estimated and may not capture all constraint types.
          </p>
          <p>
            Rankings use a composite score: wind/solar weight CF (40%), revenue/MW (40%), and curtailment (20%). BESS weights revenue (30%), utilisation (30%), spread (20%), and cycles (20%).
          </p>
          <p>
            <strong className="text-amber-400">⚠ Hybrid facility note:</strong> Capacity factors for wind or solar components of hybrid facilities (e.g. Kennedy Energy Park) may be inflated due to energy attribution between co-located DUIDs. Where a wind farm is co-located with solar and/or battery, AEMO metering may not perfectly separate generation by source. Cross-reference with third-party sources (Rystad, Windlab) for hybrid sites.
          </p>
        </div>
      </section>

      {/* Update Data Panel */}
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <button
          onClick={() => setShowUpdatePanel(!showUpdatePanel)}
          className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-white/5 transition-colors"
        >
          <span className="text-sm font-semibold text-[var(--color-text)]">
            {showUpdatePanel ? '▾' : '▸'} Update Performance Data
          </span>
          {index?.last_updated && (() => {
            const days = Math.floor((Date.now() - new Date(index.last_updated).getTime()) / 86400000)
            return days > 30 ? (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgb(239 68 68 / 0.1)', color: 'rgb(248 113 113)' }}>
                Data may be outdated
              </span>
            ) : null
          })()}
        </button>
        {showUpdatePanel && (
          <div className="px-5 pb-4 space-y-3 text-[11px] text-[var(--color-text-muted)] leading-relaxed border-t border-[var(--color-border)]">
            <p className="pt-3">
              Run these commands in your terminal to refresh performance data from OpenElectricity:
            </p>
            <pre className="bg-[var(--color-bg)] rounded-lg p-3 text-[10px] font-mono overflow-x-auto select-all">
{`cd ~/aures-db

# Import latest data for each year
python3 pipeline/importers/import_openelectricity.py --year 2024
python3 pipeline/importers/import_openelectricity.py --year 2025
python3 pipeline/importers/import_openelectricity.py --year 2026 --ytd

# Recompute league table rankings
python3 pipeline/processors/compute_league_tables.py --year 2024
python3 pipeline/processors/compute_league_tables.py --year 2025
python3 pipeline/processors/compute_league_tables.py --year 2026

# Export to JSON and rebuild
python3 pipeline/exporters/export_json.py
cd frontend && npm run build`}
            </pre>
            <p>
              Requires <code className="bg-[var(--color-bg)] px-1 py-0.5 rounded text-[var(--color-primary)]">OPENELECTRICITY_API_KEY</code> in your environment.
              Community plan allows 500 requests/day.
            </p>
          </div>
        )}
      </section>

      {/* Drill-down panel — opens when a quartile bar is clicked */}
      <DrillPanel
        open={drill !== null}
        title={drill !== null ? `${QUARTILE_LABELS[drill]} — ${TECH_TABS.find((t) => t.value === tech)?.label ?? tech}${stateFilter !== 'ALL' ? ` · ${stateFilter}` : ''}${year !== 'all' ? ` · ${year}` : ' · All Years'}` : ''}
        subtitle={drill !== null ? `${drillProjects.length} projects — sorted by rank` : undefined}
        onClose={() => setDrill(null)}
      >
        {drill !== null && drillProjects.length > 0 ? (
          <DataTable<LeagueTableEntry>
            rows={[...drillProjects].sort((a, b) => a.rank_composite - b.rank_composite)}
            columns={[
              {
                key: 'rank_composite',
                label: 'Rank',
                format: 'integer',
                align: 'right',
              },
              {
                key: 'name',
                label: 'Project',
                render: (_v, row) => (
                  <Link
                    to={`/projects/${row.project_id}?from=performance&fromLabel=Back to Performance`}
                    className="text-[var(--color-primary)] hover:underline"
                    onClick={() => setDrill(null)}
                  >
                    {row.name}
                  </Link>
                ),
              },
              { key: 'state', label: 'State' },
              {
                key: 'capacity_mw',
                label: 'MW',
                format: 'number0',
                aggregator: 'sum',
              },
              tech === 'bess' || tech === 'pumped_hydro'
                ? {
                    key: 'spread',
                    label: 'Spread',
                    align: 'right' as const,
                    accessor: (row: LeagueTableEntry) =>
                      row.avg_discharge_price != null && row.avg_charge_price != null
                        ? row.avg_discharge_price - row.avg_charge_price
                        : null,
                    render: (v: unknown) =>
                      typeof v === 'number' ? `$${v.toFixed(0)}` : '—',
                  }
                : {
                    key: 'capacity_factor_pct',
                    label: 'CF%',
                    format: 'percent1' as const,
                    aggregator: 'avg' as const,
                  },
            ]}
            showRowNumbers
            showTotals
            csvFilename={`performance-q${drill}-${tech}${year !== 'all' ? `-${year}` : ''}`}
          />
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">No projects in this quartile.</p>
        )}
      </DrillPanel>
    </div>
  )
}

function LeagueRow({ entry, tech, showYears, vfMap }: { entry: LeagueTableEntry; tech: LeagueTechnology; showYears?: boolean; vfMap?: Map<string, number> }) {
  const spread = tech === 'bess'
    ? ((entry.avg_discharge_price ?? 0) - (entry.avg_charge_price ?? 0))
    : 0

  return (
    <tr className="border-b border-[var(--color-border)]/50 hover:bg-white/5 transition-colors">
      <td className="px-2 py-2 font-bold text-[var(--color-text-muted)]">
        {entry.rank_composite}
      </td>
      <td className="px-2 py-2">
        <Link
          to={`/projects/${entry.project_id}`}
          className="text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors font-medium truncate block max-w-[200px]"
        >
          {entry.name}
        </Link>
      </td>
      <td className="px-2 py-2 text-[var(--color-text-muted)]">{entry.state}</td>
      <td className="px-2 py-2 text-[var(--color-text)]">
        {entry.capacity_mw >= 1000
          ? `${(entry.capacity_mw / 1000).toFixed(1)}G`
          : entry.capacity_mw}
      </td>
      {tech === 'bess' ? (
        <>
          <td className="px-2 py-2 text-[var(--color-text)]">
            {entry.energy_discharged_mwh ? fmtGWh(entry.energy_discharged_mwh) : '—'}
          </td>
          <td className="px-2 py-2 text-[var(--color-text)]">
            {entry.energy_charged_mwh ? fmtGWh(entry.energy_charged_mwh) : '—'}
          </td>
          <td className="px-2 py-2 text-[var(--color-text)]">
            {spread > 0 ? `$${spread.toFixed(0)}` : '—'}
          </td>
          <td className="px-2 py-2 text-[var(--color-text)]">
            {entry.cycles?.toFixed(0) ?? '—'}
          </td>
          <td className="px-2 py-2 text-[var(--color-text)]">
            ${entry.revenue_per_mw ? (entry.revenue_per_mw / 1000).toFixed(0) + 'k' : '—'}
          </td>
        </>
      ) : (
        <>
          <td className="px-2 py-2">
            <span style={{ color: cfColor(entry.capacity_factor_pct) }}>
              {entry.capacity_factor_pct?.toFixed(1) ?? '—'}
            </span>
          </td>
          <td className="px-2 py-2 text-[var(--color-text)]">
            ${entry.energy_price_received?.toFixed(0) ?? '—'}
          </td>
          <td className="px-2 py-2 text-[var(--color-text)]">
            ${entry.revenue_per_mw ? (entry.revenue_per_mw / 1000).toFixed(0) + 'k' : '—'}
          </td>
          <td className="px-2 py-2">
            <span style={{ color: curtColor(entry.curtailment_pct) }}>
              {entry.curtailment_pct?.toFixed(1) ?? '—'}
            </span>
          </td>
          {vfMap && vfMap.size > 0 && (() => {
            const vf = vfMap.get(entry.project_id)
            return (
              <td className="px-2 py-2">
                {vf != null ? (
                  <span style={{ color: vfColor(vf) }}>{vf.toFixed(3)}</span>
                ) : (
                  <span className="text-[var(--color-text-muted)]">—</span>
                )}
              </td>
            )
          })()}
        </>
      )}
      {showYears && (
        <td className="px-2 py-2 text-[var(--color-text-muted)] text-center">
          {entry.years_of_data ?? '—'}
        </td>
      )}
      <td className="px-2 py-2">
        <span
          className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold"
          style={{
            color: QUARTILE_COLORS[entry.quartile],
            backgroundColor: QUARTILE_COLORS[entry.quartile] + '20',
          }}
        >
          {entry.quartile}
        </span>
      </td>
    </tr>
  )
}

// ============================================================
// Fleet Monthly Trends
// ============================================================

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function FleetMonthlyTrends({ projects, tech, year }: { projects: LeagueTableEntry[]; tech: LeagueTechnology; year: number | 'all' }) {
  const [monthlyData, setMonthlyData] = useState<ProjectMonthlyPerformance[]>([])
  const [loading, setLoading] = useState(true)

  // Load monthly data for top 20 projects (to keep it fast)
  useEffect(() => {
    setLoading(true)
    const top = projects.slice(0, 20)
    Promise.all(top.map(p => fetchMonthlyPerformance(p.project_id)))
      .then(results => {
        setMonthlyData(results.filter((r): r is ProjectMonthlyPerformance => r != null))
      })
      .finally(() => setLoading(false))
  }, [projects, tech])

  const chartData = useMemo(() => {
    if (monthlyData.length === 0) return []

    const isBess = tech === 'bess' || tech === 'pumped_hydro'

    return MONTH_LABELS.map((label, i) => {
      const month = i + 1
      let values: number[]

      if (isBess) {
        values = monthlyData
          .map(p => {
            if (year === 'all') {
              // Average across all years for this month
              const entries = p.monthly.filter(m => m.month === month && m.avg_discharge_price && m.avg_charge_price)
              if (entries.length === 0) return undefined
              return entries.reduce((s, e) => s + (e.avg_discharge_price! - e.avg_charge_price!), 0) / entries.length
            }
            const entry = p.monthly.find(m => m.year === year && m.month === month)
            if (!entry?.avg_discharge_price || !entry?.avg_charge_price) return undefined
            return entry.avg_discharge_price - entry.avg_charge_price
          })
          .filter((v): v is number => v != null)
      } else {
        values = monthlyData
          .map(p => {
            if (year === 'all') {
              const entries = p.monthly.filter(m => m.month === month && m.capacity_factor_pct != null)
              if (entries.length === 0) return undefined
              return entries.reduce((s, e) => s + (e.capacity_factor_pct ?? 0), 0) / entries.length
            }
            return p.monthly.find(m => m.year === year && m.month === month)?.capacity_factor_pct
          })
          .filter((v): v is number => v != null)
      }

      if (values.length === 0) return null

      const avg = values.reduce((s, v) => s + v, 0) / values.length
      const sorted = [...values].sort((a, b) => a - b)
      const q1 = sorted[Math.floor(sorted.length * 0.25)] ?? avg
      const q3 = sorted[Math.floor(sorted.length * 0.75)] ?? avg
      const best = sorted[sorted.length - 1]
      const worst = sorted[0]

      return { month: label, avg: Math.round(avg * 10) / 10, q1: Math.round(q1 * 10) / 10, q3: Math.round(q3 * 10) / 10, best: Math.round(best * 10) / 10, worst: Math.round(worst * 10) / 10, count: values.length }
    }).filter(Boolean)
  }, [monthlyData, year, tech])

  if (loading) {
    return (
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <div className="h-48 animate-pulse bg-[var(--color-bg-elevated)] rounded" />
      </section>
    )
  }

  if (chartData.length === 0) return null

  const isBess = tech === 'bess' || tech === 'pumped_hydro'
  const yLabel = isBess ? 'Spread ($/MWh)' : 'CF%'
  const fmtVal = isBess ? (v: number) => `$${v}` : (v: number) => `${v}%`

  return (
    <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
      <h2 className="text-sm font-semibold text-[var(--color-text)] mb-1">
        {year === 'all' ? 'All Years Average' : year} Monthly {isBess ? 'Price Spread' : 'Capacity Factor'} — Fleet Average
      </h2>
      <p className="text-[10px] text-[var(--color-text-muted)] mb-3">
        {isBess ? 'Average discharge–charge spread' : 'Average capacity factor'} across top {monthlyData.length} {tech} projects by month. Shaded area shows Q1–Q3 range.
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 10 }} />
          <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={fmtVal} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              fontSize: 11,
            }}
            formatter={(value, name) => [
              isBess ? `$${value}/MWh` : `${value}%`,
              name === 'avg' ? 'Fleet Avg' : name === 'q1' ? 'Q1 (25th)' : name === 'q3' ? 'Q3 (75th)' : name === 'best' ? 'Best' : 'Worst',
            ]}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} formatter={(v: string) => v === 'avg' ? `Fleet Avg ${yLabel}` : v === 'q1' ? 'Q1' : v === 'q3' ? 'Q3' : v === 'best' ? 'Best' : 'Worst'} />
          <Line type="monotone" dataKey="q1" stroke="#22c55e" strokeWidth={1} strokeDasharray="4 2" dot={false} opacity={0.5} />
          <Line type="monotone" dataKey="q3" stroke="#22c55e" strokeWidth={1} strokeDasharray="4 2" dot={false} opacity={0.5} />
          <Line type="monotone" dataKey="avg" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3, fill: '#22c55e' }} />
          <Line type="monotone" dataKey="best" stroke="#3b82f6" strokeWidth={1} dot={false} opacity={0.4} />
          <Line type="monotone" dataKey="worst" stroke="#ef4444" strokeWidth={1} dot={false} opacity={0.4} />
        </LineChart>
      </ResponsiveContainer>
    </section>
  )
}

function StatCard({ label, value, color, infoKey }: { label: string; value: string; color: string; infoKey?: string }) {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
      <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
        {label}
        {infoKey && <InfoTooltip metricKey={infoKey} />}
      </p>
      <p className="text-lg font-bold" style={{ color }}>{value}</p>
    </div>
  )
}

function fmtGWh(mwh: number): string {
  if (mwh >= 1000) return `${(mwh / 1000).toFixed(1)} GWh`
  return `${Math.round(mwh)} MWh`
}

function cfColor(cf?: number): string {
  if (!cf) return '#6b7280'
  if (cf >= 35) return '#22c55e'
  if (cf >= 25) return '#84cc16'
  if (cf >= 15) return '#f59e0b'
  return '#ef4444'
}

function curtColor(curt?: number): string {
  if (!curt) return '#6b7280'
  if (curt <= 2) return '#22c55e'
  if (curt <= 5) return '#f59e0b'
  return '#ef4444'
}

function vfColor(vf?: number): string {
  if (vf == null) return '#6b7280'
  if (vf >= 0.95) return '#22c55e'
  if (vf >= 0.85) return '#84cc16'
  if (vf >= 0.70) return '#f59e0b'
  return '#ef4444'
}

// ============================================================
// Fleet Value Factor Trend (cannibalisation over time)
// ============================================================

function FleetValueTrend({ data, tech }: { data: Array<{ year: string; vf: number; count: number }>; tech: LeagueTechnology }) {
  const label = tech === 'solar' ? 'Solar' : 'Wind'
  const refLine = tech === 'solar' ? 0.8 : 0.9

  return (
    <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
      <h2 className="text-sm font-semibold text-[var(--color-text)] mb-1">
        {label} Fleet Value Factor — Cannibalisation Trend
      </h2>
      <p className="text-[10px] text-[var(--color-text-muted)] mb-3">
        Fleet average capture price ÷ pool price by year. A declining trend indicates growing
        cannibalisation — more {label.toLowerCase()} farms competing at the same time, depressing
        the prices they capture. Values below 1.0 mean the fleet earns less than the pool average.
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="year" tick={{ fill: '#9ca3af', fontSize: 10 }} />
          <YAxis
            domain={[0.3, 1.1]}
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            tickFormatter={(v: number) => v.toFixed(2)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              fontSize: 11,
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any, _name: any, props: any) => [
              `${Number(value).toFixed(3)} (${props.payload?.count ?? 0} farms)`,
              'Fleet Avg Value Factor',
            ]}
          />
          {/* Reference line at 1.0 (pool parity) */}
          <Line
            type="monotone"
            dataKey={() => 1.0}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={1}
            strokeDasharray="4 2"
            dot={false}
            legendType="none"
          />
          {/* Reference line at tech-specific cannibalisation threshold */}
          <Line
            type="monotone"
            dataKey={() => refLine}
            stroke="rgba(245,158,11,0.3)"
            strokeWidth={1}
            strokeDasharray="4 2"
            dot={false}
            legendType="none"
          />
          <Line
            type="monotone"
            dataKey="vf"
            stroke="#8b5cf6"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#8b5cf6' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2 text-[9px] text-[var(--color-text-muted)]">
        <span className="flex items-center gap-1">
          <span className="w-4 h-0.5 bg-white/20 inline-block" style={{ borderTop: '1px dashed rgba(255,255,255,0.2)' }} />
          Pool parity (1.0)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-0.5 inline-block" style={{ borderTop: '1px dashed rgba(245,158,11,0.4)' }} />
          Cannibalisation threshold ({refLine})
        </span>
      </div>
    </section>
  )
}
