import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, ReferenceLine, Cell,
  Area, ComposedChart,
} from 'recharts'
import { fetchDunkelflaute } from '../../lib/dataService'
import type { DunkelflaunteData, StateYearPerformance, SeasonalMonthly } from '../../lib/types'
import {
  CLIMATE_DRIVERS,
  HISTORICAL_CLIMATE_EVENTS,
  CURRENT_CONDITIONS,
  ASSESSMENT_COLORS,
  ASSESSMENT_LABELS,
  getPhaseColor,
  getImpactArrow,
  getImpactColor,
  getClimateEventForYear,
} from '../../data/climate-intelligence'
import type { ClimateDriver, HistoricalClimateEvent } from '../../data/climate-intelligence'
import DataProvenance from '../../components/common/DataProvenance'

// ============================================================
// Icons — defined BEFORE const arrays (Vite HMR issue)
// ============================================================

const WindIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
  </svg>
)

const BoltIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
  </svg>
)

const BatteryIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 10.5h.375c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125H21M3.75 18h15A2.25 2.25 0 0 0 21 15.75v-6a2.25 2.25 0 0 0-2.25-2.25h-15A2.25 2.25 0 0 0 1.5 9.75v6A2.25 2.25 0 0 0 3.75 18Z" />
  </svg>
)

const AlertIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
  </svg>
)

const GlobeIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A9 9 0 0 1 3 12c0-1.47.353-2.856.978-4.08" />
  </svg>
)

const ChartIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
  </svg>
)

// ============================================================
// Constants
// ============================================================

const STATE_COLORS: Record<string, string> = {
  NSW: '#3b82f6',
  QLD: '#f59e0b',
  SA: '#10b981',
  TAS: '#06b6d4',
  VIC: '#8b5cf6',
}

const STATE_ORDER = ['NSW', 'QLD', 'VIC', 'SA', 'TAS']

const WIND_COLOR = '#3b82f6'
const SOLAR_COLOR = '#f59e0b'
const COMBINED_COLOR = '#10b981'

type TechFilter = 'combined' | 'wind' | 'solar'

const TECH_OPTIONS: { id: TechFilter; label: string; color: string }[] = [
  { id: 'combined', label: 'Combined', color: COMBINED_COLOR },
  { id: 'wind', label: 'Wind', color: WIND_COLOR },
  { id: 'solar', label: 'Solar', color: SOLAR_COLOR },
]

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--color-bg-primary, #1e293b)',
  border: '1px solid var(--color-border, rgba(255,255,255,0.1))',
  borderRadius: '8px',
  color: 'var(--color-text, #f1f5f9)',
  fontSize: 13,
}

const TOOLTIP_ITEM_STYLE = { color: 'var(--color-text, #f1f5f9)' }
const TICK_STYLE = { fill: 'var(--color-text-muted, #9ca3af)', fontSize: 12 }
const AXIS_STYLE = { stroke: 'rgba(255,255,255,0.1)' }

const COVERAGE_COLORS: Record<string, string> = {
  Low: '#ef4444',
  Moderate: '#f59e0b',
  Good: '#22c55e',
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Year colour palette for overlays (up to 10 years)
const YEAR_COLORS = [
  '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444',
  '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#a855f7',
]

// ============================================================
// Tab definitions
// ============================================================

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'state-perf', label: 'State Performance' },
  { id: 'seasonal', label: 'Seasonal Trends' },
  { id: 'climate', label: 'Climate Drivers' },
  { id: 'assessment', label: 'Current Assessment' },
  { id: 'forecast', label: 'Forecast' },
  { id: 'bess', label: 'BESS Coverage' },
] as const

type TabId = (typeof TABS)[number]['id']

// ============================================================
// Helpers
// ============================================================

function fmtPct(v: number | undefined | null): string {
  if (v == null) return 'N/A'
  return `${v.toFixed(1)}%`
}

/** Get the CF field from SeasonalMonthly based on tech filter */
function getSeasonalCF(r: SeasonalMonthly, tech: TechFilter): number | null {
  if (tech === 'wind') return r.wind_cf
  if (tech === 'solar') return r.solar_cf
  return r.combined_cf ?? null
}

/** Get the tech label for chart titles */
function techLabel(tech: TechFilter): string {
  if (tech === 'wind') return 'Wind'
  if (tech === 'solar') return 'Solar'
  return 'Combined'
}

function fmtMW(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)} GW`
  return `${v.toLocaleString()} MW`
}

function fmtMWh(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)} GWh`
  return `${v.toLocaleString()} MWh`
}

function fmtHours(v: number): string {
  return `${v.toFixed(2)}h`
}

function getCoverageColor(rating: string): string {
  return COVERAGE_COLORS[rating] || '#636e72'
}

/** Pearson correlation between two equal-length arrays */
function pearsonCorrelation(x: number[], y: number[]): number | null {
  const n = x.length
  if (n < 3 || n !== y.length) return null
  const meanX = x.reduce((s, v) => s + v, 0) / n
  const meanY = y.reduce((s, v) => s + v, 0) / n
  let num = 0, denX = 0, denY = 0
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX
    const dy = y[i] - meanY
    num += dx * dy
    denX += dx * dx
    denY += dy * dy
  }
  const den = Math.sqrt(denX) * Math.sqrt(denY)
  if (den === 0) return null
  return num / den
}

// ============================================================
// Component
// ============================================================

export default function Dunkelflaute() {
  const [data, setData] = useState<DunkelflaunteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [selectedYear, setSelectedYear] = useState<number>(2024)
  const [seasonalState, setSeasonalState] = useState<string>('NSW')
  const [assessmentState, setAssessmentState] = useState<string>('NSW')
  const [forecastState, setForecastState] = useState<string>('NSW')
  const [expandedDrivers, setExpandedDrivers] = useState<Set<string>>(new Set())
  const [techFilter, setTechFilter] = useState<TechFilter>('combined')
  const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set(STATE_ORDER))

  useEffect(() => {
    fetchDunkelflaute().then(d => { setData(d ?? null); setLoading(false) })
  }, [])

  // Filter seasonal monthly data to exclude the current (partial) month
  // Partial months show artificially low CF due to fewer days of generation data
  const filteredSeasonalMonthly = useMemo(() => {
    if (!data?.seasonal_monthly) return []
    const now = new Date()
    const curYear = now.getFullYear()
    const curMonth = now.getMonth() + 1
    return data.seasonal_monthly.filter(r =>
      !(r.year === curYear && r.month >= curMonth)
    )
  }, [data])

  // Available years
  const years = useMemo(() => {
    if (!data) return []
    const s = new Set(data.state_year_performance.map(r => r.year))
    return Array.from(s).sort()
  }, [data])

  // State performance for selected year
  const yearPerformance = useMemo(() => {
    if (!data) return []
    return STATE_ORDER
      .map(st => data.state_year_performance.find(r => r.state === st && r.year === selectedYear))
      .filter((r): r is StateYearPerformance => r != null)
  }, [data, selectedYear])

  // Chart data for year comparison bar chart (respects techFilter + selectedStates)
  const barChartData = useMemo(() => {
    return yearPerformance
      .filter(r => selectedStates.has(r.state))
      .map(r => ({
        state: r.state,
        wind_cf: r.wind_cf_pct,
        solar_cf: r.solar_cf_pct ?? 0,
        combined_cf: r.combined_cf_pct,
      }))
  }, [yearPerformance, selectedStates])

  // Line chart data: CF trend per state over years (respects tech filter)
  const lineChartData = useMemo(() => {
    if (!data) return []
    const byYear: Record<number, Record<string, number>> = {}
    for (const r of data.state_year_performance) {
      if (!byYear[r.year]) byYear[r.year] = {}
      const val = techFilter === 'wind' ? r.wind_cf_pct
        : techFilter === 'solar' ? (r.solar_cf_pct ?? 0)
        : r.combined_cf_pct
      byYear[r.year][r.state] = val
    }
    return Object.entries(byYear)
      .map(([y, states]) => ({ year: Number(y), ...states }))
      .sort((a, b) => a.year - b.year)
  }, [data, techFilter])

  // BESS coverage chart data
  const coverageChartData = useMemo(() => {
    if (!data) return []
    return STATE_ORDER
      .filter(st => data.bess_coverage[st])
      .map(st => {
        const c = data.bess_coverage[st]
        return {
          state: st,
          coverage_hours: c.coverage_hours,
          rating: c.coverage_rating,
          bess_mw: c.bess_mw,
          bess_mwh: c.bess_mwh,
          peak_demand: c.peak_demand_mw_est,
        }
      })
  }, [data])

  // Pipeline comparison data
  const pipelineData = useMemo(() => {
    if (!data) return []
    return STATE_ORDER
      .filter(st => data.bess_coverage[st] && data.bess_pipeline[st])
      .map(st => {
        const current = data.bess_coverage[st]
        const pipeline = data.bess_pipeline[st]
        const peakDemand = data.peak_demand_estimates[st] || current.peak_demand_mw_est
        const pipelineCoverageHours = peakDemand > 0
          ? (current.bess_mwh + pipeline.mwh) / peakDemand
          : 0
        return {
          state: st,
          current_mwh: current.bess_mwh,
          pipeline_mwh: pipeline.mwh,
          pipeline_mw: pipeline.mw,
          pipeline_count: pipeline.count,
          current_hours: current.coverage_hours,
          potential_hours: pipelineCoverageHours,
        }
      })
  }, [data])

  // Lowest CF period
  const lowestCF = useMemo(() => {
    if (!data || data.lowest_cf_periods.length === 0) return null
    return data.lowest_cf_periods[0]
  }, [data])

  // Seasonal monthly data for selected state — shows monthly CF across years (respects techFilter)
  const seasonalChartData = useMemo(() => {
    if (filteredSeasonalMonthly.length === 0) return []
    const stateData = filteredSeasonalMonthly.filter(r => r.state === seasonalState)
    const byMonth: Record<number, Record<string, number>> = {}
    for (const r of stateData) {
      if (!byMonth[r.month]) byMonth[r.month] = {}
      const val = getSeasonalCF(r, techFilter)
      if (val != null) byMonth[r.month][`y${r.year}`] = val
    }
    return Array.from({ length: 12 }, (_, i) => ({
      month: MONTH_NAMES[i],
      monthNum: i + 1,
      ...byMonth[i + 1],
    }))
  }, [filteredSeasonalMonthly, seasonalState, techFilter])

  // Identify worst months across all states (dunkelflaute detection)
  const worstMonths = useMemo(() => {
    if (filteredSeasonalMonthly.length === 0) return []
    return [...filteredSeasonalMonthly]
      .filter(r => r.combined_cf != null)
      .sort((a, b) => (a.combined_cf ?? 99) - (b.combined_cf ?? 99))
      .slice(0, 10) as SeasonalMonthly[]
  }, [filteredSeasonalMonthly])

  // Years available in seasonal data
  const seasonalYears = useMemo(() => {
    if (filteredSeasonalMonthly.length === 0) return []
    return Array.from(new Set(filteredSeasonalMonthly.map(r => r.year))).sort()
  }, [filteredSeasonalMonthly])

  // Avg BESS coverage hours
  const avgCoverage = useMemo(() => {
    if (!data) return 0
    const entries = Object.values(data.bess_coverage)
    if (entries.length === 0) return 0
    return entries.reduce((sum, e) => sum + e.coverage_hours, 0) / entries.length
  }, [data])

  // ── Climate / Assessment data ──

  // Assessment overlay chart: current year vs all historical years for a chosen state (respects techFilter)
  const assessmentChartData = useMemo(() => {
    if (filteredSeasonalMonthly.length === 0) return []
    const stateData = filteredSeasonalMonthly.filter(r => r.state === assessmentState)
    const byMonth: Record<number, Record<string, number>> = {}
    for (const r of stateData) {
      if (!byMonth[r.month]) byMonth[r.month] = {}
      const val = getSeasonalCF(r, techFilter)
      if (val != null) byMonth[r.month][`y${r.year}`] = val
    }
    return Array.from({ length: 12 }, (_, i) => ({
      month: MONTH_NAMES[i],
      monthNum: i + 1,
      ...byMonth[i + 1],
    }))
  }, [filteredSeasonalMonthly, assessmentState, techFilter])

  // ── Forecast: pattern matching ──

  const currentYear = useMemo(() => {
    if (seasonalYears.length === 0) return new Date().getFullYear()
    return Math.max(...seasonalYears)
  }, [seasonalYears])

  const historicalYears = useMemo(() => {
    return seasonalYears.filter(y => y < currentYear)
  }, [seasonalYears, currentYear])

  // Pattern matching: for each state, compute similarity of currentYear to each historical year (respects techFilter)
  const patternMatchResults = useMemo(() => {
    if (filteredSeasonalMonthly.length === 0 || historicalYears.length === 0) return []

    const stateData = filteredSeasonalMonthly.filter(r => r.state === forecastState && getSeasonalCF(r, techFilter) != null)
    const currentMonths = stateData.filter(r => r.year === currentYear).sort((a, b) => a.month - b.month)
    if (currentMonths.length < 2) return []

    const currentCF = currentMonths.map(r => getSeasonalCF(r, techFilter)!)
    const monthRange = currentMonths.map(r => r.month)

    return historicalYears.map(yr => {
      const histData = stateData.filter(r => r.year === yr)
      const histCF = monthRange
        .map(m => {
          const row = histData.find(r => r.month === m)
          return row ? getSeasonalCF(row, techFilter) : null
        })
        .filter((v): v is number => v != null)

      if (histCF.length < monthRange.length) return null // incomplete data

      const corr = pearsonCorrelation(currentCF, histCF)
      const climateEvent = getClimateEventForYear(yr)

      return {
        year: yr,
        correlation: corr,
        similarityPct: corr != null ? Math.round(((corr + 1) / 2) * 100) : null,
        monthsCompared: monthRange.length,
        climateLabel: climateEvent ? climateEvent.ensoPhase : 'Unknown',
      }
    })
    .filter((r): r is NonNullable<typeof r> => r != null && r.similarityPct != null)
    .sort((a, b) => (b.similarityPct ?? 0) - (a.similarityPct ?? 0))
  }, [filteredSeasonalMonthly, forecastState, currentYear, historicalYears, techFilter])

  // Forecast ranges: use top 3 matching years to project remaining months (respects techFilter)
  const forecastData = useMemo((): { month: string; actual: number | null; optimistic: number | null; pessimistic: number | null; median: number | null; isForecast: boolean }[] => {
    if (filteredSeasonalMonthly.length === 0 || patternMatchResults.length === 0) return []

    const stateData = filteredSeasonalMonthly.filter(r => r.state === forecastState && getSeasonalCF(r, techFilter) != null)
    const currentMonths = stateData.filter(r => r.year === currentYear).sort((a, b) => a.month - b.month)
    const lastMonth = currentMonths.length > 0 ? currentMonths[currentMonths.length - 1].month : 0

    const topYears = patternMatchResults.slice(0, 3).map(r => r.year)

    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1
      const cur = currentMonths.find(r => r.month === month)
      const actual = cur ? getSeasonalCF(cur, techFilter) : null

      if (month <= lastMonth) {
        return { month: MONTH_NAMES[i], actual, optimistic: null, pessimistic: null, median: null, isForecast: false }
      }

      // Forecast from top matching years
      const vals = topYears
        .map(yr => {
          const row = stateData.find(r => r.year === yr && r.month === month)
          return row ? getSeasonalCF(row, techFilter) : null
        })
        .filter((v): v is number => v != null)
        .sort((a, b) => a - b)

      if (vals.length === 0) {
        return { month: MONTH_NAMES[i], actual: null, optimistic: null, pessimistic: null, median: null, isForecast: true }
      }

      return {
        month: MONTH_NAMES[i],
        actual: null,
        pessimistic: vals[0],
        optimistic: vals[vals.length - 1],
        median: vals[Math.floor(vals.length / 2)],
        isForecast: true,
      }
    })
  }, [filteredSeasonalMonthly, forecastState, currentYear, patternMatchResults, techFilter])

  // Forecast overlay chart data: actual + forecast range (respects techFilter)
  const forecastChartData = useMemo(() => {
    if (filteredSeasonalMonthly.length === 0) return []
    const stateData = filteredSeasonalMonthly.filter(r => r.state === forecastState && getSeasonalCF(r, techFilter) != null)
    const currentMonths = stateData.filter(r => r.year === currentYear)
    const lastMonth = currentMonths.length > 0 ? Math.max(...currentMonths.map(r => r.month)) : 0
    const topYears = patternMatchResults.slice(0, 3).map(r => r.year)

    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1
      const cur = currentMonths.find(r => r.month === month)
      const actual = cur ? (getSeasonalCF(cur, techFilter) ?? undefined) : undefined

      // Historical year lines
      const histValues: Record<string, number | undefined> = {}
      for (const yr of topYears) {
        const row = stateData.find(r => r.year === yr && r.month === month)
        const v = row ? getSeasonalCF(row, techFilter) : null
        if (v != null) histValues[`y${yr}`] = v
      }

      // Forecast range (only for future months)
      let range: [number, number] | undefined
      if (month > lastMonth) {
        const vals = topYears
          .map(yr => {
            const row = stateData.find(r => r.year === yr && r.month === month)
            return row ? getSeasonalCF(row, techFilter) : null
          })
          .filter((v): v is number => v != null)
          .sort((a, b) => a - b)
        if (vals.length > 0) range = [vals[0], vals[vals.length - 1]]
      }

      return {
        month: MONTH_NAMES[i],
        actual,
        ...histValues,
        rangeMin: range?.[0],
        rangeMax: range?.[1],
      }
    })
  }, [filteredSeasonalMonthly, forecastState, currentYear, patternMatchResults, techFilter])

  // ── Loading ──
  if (loading) {
    return (
      <div className="px-4 lg:px-8 py-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
          <span className="ml-3 text-sm text-[var(--color-text-muted)]">Loading dunkelflaute data...</span>
        </div>
      </div>
    )
  }

  // ── Empty state ──
  if (!data) {
    return (
      <div className="px-4 lg:px-8 py-6 max-w-6xl mx-auto">
        <h1 className="text-xl lg:text-2xl font-bold text-[var(--color-text)] mb-4">Dunkelflaute Monitor</h1>
        <div className="flex flex-col items-center py-12 text-[var(--color-text-muted)]">
          <AlertIcon />
          <p className="text-sm text-[var(--color-text-muted)] mt-2">No dunkelflaute data available.</p>
        </div>
      </div>
    )
  }

  // Toggle state selection
  const toggleState = (st: string) => {
    setSelectedStates(prev => {
      const next = new Set(prev)
      if (next.has(st)) {
        if (next.size > 1) next.delete(st) // keep at least one
      } else {
        next.add(st)
      }
      return next
    })
  }

  const selectAllStates = () => setSelectedStates(new Set(STATE_ORDER))

  // Toggle driver expand/collapse
  const toggleDriver = (id: string) => {
    setExpandedDrivers(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="px-4 lg:px-8 py-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-[var(--color-text)]">Dunkelflaute Monitor</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Wind and solar generation vulnerability, climate intelligence, and BESS adequacy by state
        </p>
        <div className="mt-3">
          <DataProvenance page="dunkelflaute" />
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════
          TAB: Overview
         ════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <>
          {/* Concept Explainer */}
          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <div className="flex items-start gap-3">
              <div className="text-amber-400 mt-0.5"><WindIcon /></div>
              <div>
                <h2 className="text-sm font-semibold text-[var(--color-text)] mb-1">What is a Dunkelflaute?</h2>
                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                  <span className="font-medium text-[var(--color-text)]">Dunkelflaute</span> (German: &ldquo;dark doldrums&rdquo;) refers to
                  extended periods when both wind and solar generation are simultaneously low. These events
                  expose the NEM to its greatest reliability risk, as renewable output collapses across multiple
                  technologies at once. Capacity factor (CF) measures actual output as a percentage of maximum
                  possible output. A combined CF below 25% signals significant stress on the generation fleet
                  and heightens the need for dispatchable firming capacity such as BESS.
                </p>
              </div>
            </div>
          </div>

          {/* Why it matters */}
          <details className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
            <summary className="text-sm font-medium text-[var(--color-text)] cursor-pointer">Why does this matter for Australia?</summary>
            <div className="mt-3 text-xs text-[var(--color-text-muted)] space-y-2">
              <p>As coal plants retire and the grid becomes more dependent on wind and solar, periods of low renewable output become critical reliability risks. During a Dunkelflaute, the grid must rely on dispatchable generation — primarily gas and batteries.</p>
              <p>The capacity factor data here shows how severe these low-output periods have been historically. States with lower combined capacity factors during their worst periods are more vulnerable.</p>
              <p><strong>BESS coverage</strong> shows how many hours of peak demand each state&apos;s current battery fleet could sustain. Current coverage is very low (under 1 hour in all states), highlighting the urgency of the large BESS pipeline.</p>
              <p><strong>The 25% threshold</strong> for combined wind+solar capacity factor is used as a stress indicator — periods below this level represent significant renewable energy drought conditions.</p>
            </div>
          </details>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
              <div className="flex items-center gap-2 text-red-400 mb-2">
                <AlertIcon />
                <span className="text-xs font-medium uppercase tracking-wide">Lowest Combined CF</span>
              </div>
              {lowestCF ? (
                <>
                  <p className="text-2xl font-bold text-[var(--color-text)]">{fmtPct(lowestCF.combined_cf_pct)}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    {lowestCF.state} {lowestCF.year} — Wind {fmtPct(lowestCF.wind_cf_pct)}, Solar {fmtPct(lowestCF.solar_cf_pct)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-[var(--color-text-muted)]">No data</p>
              )}
            </div>
            <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
              <div className="flex items-center gap-2 text-amber-400 mb-2">
                <BatteryIcon />
                <span className="text-xs font-medium uppercase tracking-wide">Avg BESS Coverage</span>
              </div>
              <p className="text-2xl font-bold text-[var(--color-text)]">{fmtHours(avgCoverage)}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Across {Object.keys(data.bess_coverage).length} states — target is 4+ hours
              </p>
            </div>
            <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <BoltIcon />
                <span className="text-xs font-medium uppercase tracking-wide">BESS Pipeline</span>
              </div>
              <p className="text-2xl font-bold text-[var(--color-text)]">
                {fmtMW(Object.values(data.bess_pipeline).reduce((s, p) => s + p.mw, 0))}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                {fmtMWh(Object.values(data.bess_pipeline).reduce((s, p) => s + p.mwh, 0))} across{' '}
                {Object.values(data.bess_pipeline).reduce((s, p) => s + p.count, 0)} projects
              </p>
            </div>
          </div>

          {/* Climate assessment summary card */}
          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <div className="flex items-center gap-2 mb-3">
              <GlobeIcon />
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Climate Outlook</h2>
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: ASSESSMENT_COLORS[CURRENT_CONDITIONS.overallAssessment] + '22',
                  color: ASSESSMENT_COLORS[CURRENT_CONDITIONS.overallAssessment],
                }}
              >
                {ASSESSMENT_LABELS[CURRENT_CONDITIONS.overallAssessment]}
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              {CURRENT_CONDITIONS.assessmentSummary}
            </p>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-2">
              Updated {CURRENT_CONDITIONS.lastUpdated} · See <button onClick={() => setActiveTab('assessment')} className="text-[var(--color-primary)] hover:underline">Current Assessment</button> for details
            </p>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB: State Performance
         ════════════════════════════════════════════════════════════ */}
      {activeTab === 'state-perf' && (
        <>
          {/* Tech + State filter bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1">
              {TECH_OPTIONS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTechFilter(t.id)}
                  className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                    techFilter === t.id
                      ? 'text-white'
                      : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                  style={techFilter === t.id ? { backgroundColor: t.color } : undefined}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="h-4 w-px bg-[var(--color-border)]" />
            <div className="flex gap-1 flex-wrap items-center">
              {STATE_ORDER.map(st => (
                <button
                  key={st}
                  onClick={() => toggleState(st)}
                  className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                    selectedStates.has(st)
                      ? 'text-white'
                      : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] opacity-50'
                  }`}
                  style={selectedStates.has(st) ? { backgroundColor: STATE_COLORS[st] } : undefined}
                >
                  {st}
                </button>
              ))}
              {selectedStates.size < STATE_ORDER.length && (
                <button onClick={selectAllStates} className="px-2 py-1 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)]">All</button>
              )}
            </div>
          </div>

          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">State Capacity Factor by Resource</h2>
              <div className="flex gap-1 flex-wrap">
                {years.map(y => (
                  <button
                    key={y}
                    onClick={() => setSelectedYear(y)}
                    className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                      selectedYear === y
                        ? 'bg-blue-600 text-white'
                        : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" {...AXIS_STYLE} />
                <XAxis dataKey="state" tick={TICK_STYLE} axisLine={AXIS_STYLE} tickLine={false} />
                <YAxis tick={TICK_STYLE} axisLine={AXIS_STYLE} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 'auto']} />
                <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} formatter={(value) => [`${Number(value).toFixed(1)}%`]} labelStyle={{ color: 'var(--color-text)', fontWeight: 600 }} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-text-muted)' }} />
                {(techFilter === 'combined' || techFilter === 'wind') && (
                  <Bar dataKey="wind_cf" name="Wind CF" fill={WIND_COLOR} radius={[4, 4, 0, 0]} />
                )}
                {(techFilter === 'combined' || techFilter === 'solar') && (
                  <Bar dataKey="solar_cf" name="Solar CF" fill={SOLAR_COLOR} radius={[4, 4, 0, 0]} />
                )}
                {techFilter === 'combined' && (
                  <Bar dataKey="combined_cf" name="Combined CF" fill={COMBINED_COLOR} radius={[4, 4, 0, 0]} />
                )}
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-[var(--color-text-muted)] mt-2">
              TAS has no utility-scale solar — Solar CF will show 0% for Tasmania.
            </p>
          </div>

          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-[var(--color-text)] mb-4">{techLabel(techFilter)} CF Trend by State</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" {...AXIS_STYLE} />
                <XAxis dataKey="year" tick={TICK_STYLE} axisLine={AXIS_STYLE} tickLine={false} />
                <YAxis tick={TICK_STYLE} axisLine={AXIS_STYLE} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 'auto']} />
                <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} formatter={(value) => [`${Number(value).toFixed(1)}%`]} labelStyle={{ color: 'var(--color-text)', fontWeight: 600 }} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-text-muted)' }} />
                {STATE_ORDER.filter(st =>
                  selectedStates.has(st) && lineChartData.some(d => (d as Record<string, unknown>)[st] != null)
                ).map(st => (
                  <Line key={st} type="monotone" dataKey={st} stroke={STATE_COLORS[st]} strokeWidth={2} dot={{ r: 4, fill: STATE_COLORS[st] }} activeDot={{ r: 6 }} />
                ))}
                <ReferenceLine y={25} stroke="#ef4444" strokeDasharray="6 3" label={{ value: 'Stress threshold (25%)', fill: '#ef4444', fontSize: 11, position: 'insideTopRight' }} />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-[var(--color-text-muted)] mt-2">
              Combined CF below 25% indicates significant dunkelflaute risk. The red dashed line marks the stress threshold.
            </p>
          </div>

          {/* Lowest CF Periods table */}
          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-[var(--color-text)] mb-4">Lowest Combined CF Periods</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-2 px-2 text-[var(--color-text-muted)] font-medium">State</th>
                    <th className="text-right py-2 px-2 text-[var(--color-text-muted)] font-medium">Year</th>
                    <th className="text-right py-2 px-2 text-[var(--color-text-muted)] font-medium">Wind CF</th>
                    <th className="text-right py-2 px-2 text-[var(--color-text-muted)] font-medium">Solar CF</th>
                    <th className="text-right py-2 px-2 text-[var(--color-text-muted)] font-medium">Combined CF</th>
                    <th className="text-right py-2 px-2 text-[var(--color-text-muted)] font-medium hidden sm:table-cell">Climate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lowest_cf_periods.map((row, i) => {
                    const isStress = row.combined_cf_pct < 25
                    const event = getClimateEventForYear(row.year)
                    return (
                      <tr key={`${row.state}-${row.year}`} className={`border-b border-[var(--color-border)] ${i % 2 === 0 ? 'bg-[var(--color-bg-elevated)]' : ''}`}>
                        <td className="py-2 px-2">
                          <Link to={`/projects?state=${row.state}`} className="text-[var(--color-primary)] hover:underline font-medium">{row.state}</Link>
                        </td>
                        <td className="text-right py-2 px-2 text-[var(--color-text)]">{row.year}</td>
                        <td className="text-right py-2 px-2 text-[var(--color-text)]">{fmtPct(row.wind_cf_pct)}</td>
                        <td className="text-right py-2 px-2 text-[var(--color-text)]">{fmtPct(row.solar_cf_pct)}</td>
                        <td className="text-right py-2 px-2">
                          <span className={`font-semibold ${isStress ? 'text-red-400' : 'text-[var(--color-text)]'}`}>{fmtPct(row.combined_cf_pct)}</span>
                        </td>
                        <td className="text-right py-2 px-2 hidden sm:table-cell">
                          {event && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: getPhaseColor(event.ensoPhase) + '22', color: getPhaseColor(event.ensoPhase) }}>
                              {event.ensoPhase}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB: Seasonal Trends
         ════════════════════════════════════════════════════════════ */}
      {activeTab === 'seasonal' && data.seasonal_monthly && data.seasonal_monthly.length > 0 && (
        <>
          {/* Tech filter for seasonal tab */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1">
              {TECH_OPTIONS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTechFilter(t.id)}
                  className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                    techFilter === t.id
                      ? 'text-white'
                      : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                  style={techFilter === t.id ? { backgroundColor: t.color } : undefined}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="h-4 w-px bg-[var(--color-border)]" />
            <div className="flex gap-1">
              {STATE_ORDER.map(st => (
                <button
                  key={st}
                  onClick={() => setSeasonalState(st)}
                  className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                    seasonalState === st
                      ? 'text-white'
                      : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                  style={seasonalState === st ? { backgroundColor: STATE_COLORS[st] } : undefined}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-[var(--color-text)] mb-1">
              Seasonal {techLabel(techFilter)} Capacity Factor — {seasonalState}
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] mb-3">
              {techLabel(techFilter)} capacity factor by month — winter drops reveal Dunkelflaute vulnerability
            </p>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={seasonalChartData}>
                <CartesianGrid strokeDasharray="3 3" {...AXIS_STYLE} />
                <XAxis dataKey="month" tick={TICK_STYLE} axisLine={AXIS_STYLE} tickLine={false} />
                <YAxis tick={TICK_STYLE} axisLine={AXIS_STYLE} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 'auto']} />
                <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} formatter={(value) => [`${Number(value).toFixed(1)}%`]} labelStyle={{ color: 'var(--color-text)', fontWeight: 600 }} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-text-muted)' }} />
                <ReferenceLine y={25} stroke="#ef4444" strokeDasharray="6 3" label={{ value: '25% stress', fill: '#ef4444', fontSize: 11, position: 'insideTopRight' }} />
                {seasonalYears.map((yr, i) => (
                  <Line
                    key={yr}
                    type="monotone"
                    dataKey={`y${yr}`}
                    name={`${yr}`}
                    stroke={YEAR_COLORS[i % YEAR_COLORS.length]}
                    strokeWidth={yr === currentYear ? 3 : 1.5}
                    strokeDasharray={yr === currentYear ? undefined : '5 3'}
                    dot={{ r: yr === currentYear ? 4 : 2 }}
                    activeDot={{ r: 7 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Worst Months Table */}
          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3">Worst Renewable Months (Dunkelflaute Events)</h2>
            <p className="text-xs text-[var(--color-text-muted)] mb-3">
              Months with the lowest combined wind+solar capacity factor — these represent the most severe renewable energy droughts
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-2 px-2 text-[var(--color-text-muted)] font-medium">State</th>
                    <th className="text-left py-2 px-2 text-[var(--color-text-muted)] font-medium">Period</th>
                    <th className="text-left py-2 px-2 text-[var(--color-text-muted)] font-medium">Season</th>
                    <th className="text-right py-2 px-2 text-[var(--color-text-muted)] font-medium">Wind CF</th>
                    <th className="text-right py-2 px-2 text-[var(--color-text-muted)] font-medium">Solar CF</th>
                    <th className="text-right py-2 px-2 text-[var(--color-text-muted)] font-medium">Combined CF</th>
                  </tr>
                </thead>
                <tbody>
                  {worstMonths.map((row, i) => {
                    const season = row.month >= 3 && row.month <= 5 ? 'Autumn' : row.month >= 6 && row.month <= 8 ? 'Winter' : row.month >= 9 && row.month <= 11 ? 'Spring' : 'Summer'
                    const isStress = (row.combined_cf ?? 99) < 25
                    const seasonColor = season === 'Winter' ? 'text-blue-400' : season === 'Autumn' ? 'text-amber-400' : season === 'Spring' ? 'text-emerald-400' : 'text-red-400'
                    return (
                      <tr key={`${row.state}-${row.year}-${row.month}`} className={`border-b border-[var(--color-border)] ${i % 2 === 0 ? 'bg-[var(--color-bg-elevated)]' : ''}`}>
                        <td className="py-2 px-2">
                          <Link to={`/projects?state=${row.state}`} className="text-[var(--color-primary)] hover:underline font-medium">{row.state}</Link>
                        </td>
                        <td className="py-2 px-2 text-[var(--color-text)]">{MONTH_NAMES[row.month - 1]} {row.year}</td>
                        <td className="py-2 px-2"><span className={`font-medium ${seasonColor}`}>{season}</span></td>
                        <td className="text-right py-2 px-2 text-[var(--color-text)]">{fmtPct(row.wind_cf)}</td>
                        <td className="text-right py-2 px-2 text-[var(--color-text)]">{fmtPct(row.solar_cf)}</td>
                        <td className="text-right py-2 px-2">
                          <span className={`font-semibold ${isStress ? 'text-red-400' : 'text-[var(--color-text)]'}`}>{fmtPct(row.combined_cf)}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <details className="mt-3">
              <summary className="text-xs font-medium text-[var(--color-text-muted)] cursor-pointer">How to read seasonal patterns</summary>
              <div className="mt-2 text-xs text-[var(--color-text-muted)] space-y-1.5">
                <p><strong className="text-[var(--color-text)]">Winter (Jun–Aug)</strong> is the highest-risk period: solar output drops to 10–15% CF due to shorter days and lower solar angles, while wind is variable.</p>
                <p><strong className="text-[var(--color-text)]">Autumn (Mar–May)</strong> shows the transition — solar is declining but wind hasn&apos;t yet strengthened.</p>
                <p><strong className="text-[var(--color-text)]">SA and VIC</strong> are particularly vulnerable because their wind resources can simultaneously drop during blocking high-pressure systems.</p>
              </div>
            </details>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB: Climate Drivers (educational)
         ════════════════════════════════════════════════════════════ */}
      {activeTab === 'climate' && (
        <>
          {/* Intro */}
          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <div className="flex items-start gap-3">
              <div className="text-cyan-400 mt-0.5"><GlobeIcon /></div>
              <div>
                <h2 className="text-sm font-semibold text-[var(--color-text)] mb-1">Climate Drivers &amp; Renewable Energy</h2>
                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                  Australian renewable energy output is heavily influenced by large-scale climate patterns. These climate modes
                  determine rainfall, cloud cover, and wind patterns across different regions — directly affecting capacity factors
                  for wind and solar farms. Understanding these drivers helps explain why generation varies between years and
                  provides a basis for anticipating future conditions.
                </p>
              </div>
            </div>
          </div>

          {/* Climate Driver Cards */}
          <div className="space-y-3">
            {CLIMATE_DRIVERS.map(driver => (
              <ClimateDriverCard
                key={driver.id}
                driver={driver}
                expanded={expandedDrivers.has(driver.id)}
                onToggle={() => toggleDriver(driver.id)}
              />
            ))}
          </div>

          {/* Historical Events Table */}
          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3">Historical Climate Events &amp; Renewable Impact</h2>
            <p className="text-xs text-[var(--color-text-muted)] mb-3">
              How major climate patterns affected Australian renewable generation over the past decade
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-2 px-2 text-[var(--color-text-muted)] font-medium">Period</th>
                    <th className="text-left py-2 px-2 text-[var(--color-text-muted)] font-medium">ENSO</th>
                    <th className="text-left py-2 px-2 text-[var(--color-text-muted)] font-medium hidden sm:table-cell">IOD</th>
                    <th className="text-center py-2 px-2 text-[var(--color-text-muted)] font-medium">Wind</th>
                    <th className="text-center py-2 px-2 text-[var(--color-text-muted)] font-medium">Solar</th>
                    <th className="text-left py-2 px-2 text-[var(--color-text-muted)] font-medium hidden md:table-cell">Key Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {HISTORICAL_CLIMATE_EVENTS.map((event, i) => (
                    <HistoricalEventRow key={event.year} event={event} index={i} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB: Current Assessment
         ════════════════════════════════════════════════════════════ */}
      {activeTab === 'assessment' && (
        <>
          {/* Climate Index Gauges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ClimateGauge
              label="ENSO"
              index="ONI"
              value={CURRENT_CONDITIONS.enso.oni}
              phase={CURRENT_CONDITIONS.enso.phase}
              outlook={CURRENT_CONDITIONS.enso.outlook}
              min={-2.5}
              max={2.5}
              thresholds={[{ value: -0.5, label: 'La Niña' }, { value: 0.5, label: 'El Niño' }]}
            />
            <ClimateGauge
              label="IOD"
              index="DMI"
              value={CURRENT_CONDITIONS.iod.dmi}
              phase={CURRENT_CONDITIONS.iod.phase}
              outlook={CURRENT_CONDITIONS.iod.outlook}
              min={-1.5}
              max={1.5}
              thresholds={[{ value: -0.4, label: 'Negative' }, { value: 0.4, label: 'Positive' }]}
            />
            <ClimateGauge
              label="SAM"
              index="SAM Index"
              value={CURRENT_CONDITIONS.sam.index}
              phase={CURRENT_CONDITIONS.sam.phase}
              outlook={CURRENT_CONDITIONS.sam.outlook}
              min={-3}
              max={3}
              thresholds={[{ value: -1, label: 'Negative' }, { value: 1, label: 'Positive' }]}
            />
          </div>

          {/* Overall Assessment Traffic Light */}
          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: ASSESSMENT_COLORS[CURRENT_CONDITIONS.overallAssessment] }}
              />
              <h2 className="text-sm font-semibold text-[var(--color-text)]">
                Current Season Outlook: <span style={{ color: ASSESSMENT_COLORS[CURRENT_CONDITIONS.overallAssessment] }}>{ASSESSMENT_LABELS[CURRENT_CONDITIONS.overallAssessment]}</span>
              </h2>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mb-3">
              {CURRENT_CONDITIONS.assessmentSummary}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h3 className="text-xs font-medium text-red-400 mb-1.5">Key Risks</h3>
                <ul className="space-y-1">
                  {CURRENT_CONDITIONS.keyRisks.map((risk, i) => (
                    <li key={i} className="text-xs text-[var(--color-text-muted)] flex gap-1.5">
                      <span className="text-red-400 flex-shrink-0">•</span>{risk}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-medium text-emerald-400 mb-1.5">Key Opportunities</h3>
                <ul className="space-y-1">
                  {CURRENT_CONDITIONS.keyOpportunities.map((opp, i) => (
                    <li key={i} className="text-xs text-[var(--color-text-muted)] flex gap-1.5">
                      <span className="text-emerald-400 flex-shrink-0">•</span>{opp}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-3 pt-2 border-t border-[var(--color-border)]">
              Last updated: {CURRENT_CONDITIONS.lastUpdated} · Based on BOM and NOAA climate data
            </p>
          </div>

          {/* Year Overlay Chart: current year vs historical */}
          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Monthly {techLabel(techFilter)} CF: {currentYear} vs Historical</h2>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex gap-1">
                  {TECH_OPTIONS.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTechFilter(t.id)}
                      className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                        techFilter === t.id
                          ? 'text-white'
                          : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                      }`}
                      style={techFilter === t.id ? { backgroundColor: t.color } : undefined}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="h-4 w-px bg-[var(--color-border)]" />
                <div className="flex gap-1">
                  {STATE_ORDER.map(st => (
                    <button
                      key={st}
                      onClick={() => setAssessmentState(st)}
                      className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                        assessmentState === st
                          ? 'text-white'
                          : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                      }`}
                      style={assessmentState === st ? { backgroundColor: STATE_COLORS[st] } : undefined}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={assessmentChartData}>
                <CartesianGrid strokeDasharray="3 3" {...AXIS_STYLE} />
                <XAxis dataKey="month" tick={TICK_STYLE} axisLine={AXIS_STYLE} tickLine={false} />
                <YAxis tick={TICK_STYLE} axisLine={AXIS_STYLE} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 'auto']} />
                <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} formatter={(value) => [`${Number(value).toFixed(1)}%`]} labelStyle={{ color: 'var(--color-text)', fontWeight: 600 }} />
                <Legend wrapperStyle={{ fontSize: 11, color: 'var(--color-text-muted)' }} />
                <ReferenceLine y={25} stroke="#ef4444" strokeDasharray="6 3" label={{ value: '25% stress', fill: '#ef4444', fontSize: 11, position: 'insideTopRight' }} />
                {/* Historical years as thin dashed lines */}
                {historicalYears.map((yr, i) => (
                  <Line
                    key={yr}
                    type="monotone"
                    dataKey={`y${yr}`}
                    name={`${yr}`}
                    stroke={YEAR_COLORS[i % YEAR_COLORS.length]}
                    strokeWidth={1}
                    strokeDasharray="4 3"
                    dot={false}
                    connectNulls
                  />
                ))}
                {/* Current year as thick solid line */}
                <Line
                  type="monotone"
                  dataKey={`y${currentYear}`}
                  name={`${currentYear} (current)`}
                  stroke="#ffffff"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#ffffff', stroke: STATE_COLORS[assessmentState], strokeWidth: 2 }}
                  activeDot={{ r: 8 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-[var(--color-text-muted)] mt-2">
              {currentYear} shown as a thick white line. Historical years shown as thinner dashed lines for comparison.
              Red dashed line at 25% marks the stress threshold.
            </p>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB: Forecast
         ════════════════════════════════════════════════════════════ */}
      {activeTab === 'forecast' && (
        <>
          {/* State + tech selector */}
          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <ChartIcon />
                <h2 className="text-sm font-semibold text-[var(--color-text)]">Pattern Matching &amp; Forecast</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex gap-1">
                  {TECH_OPTIONS.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTechFilter(t.id)}
                      className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                        techFilter === t.id
                          ? 'text-white'
                          : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                      }`}
                      style={techFilter === t.id ? { backgroundColor: t.color } : undefined}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="h-4 w-px bg-[var(--color-border)]" />
                <div className="flex gap-1">
                  {STATE_ORDER.map(st => (
                    <button
                      key={st}
                      onClick={() => setForecastState(st)}
                      className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                        forecastState === st
                          ? 'text-white'
                          : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                      }`}
                      style={forecastState === st ? { backgroundColor: STATE_COLORS[st] } : undefined}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
              Comparing {currentYear}&apos;s generation pattern to historical years to find the closest match and project remaining months.
            </p>
          </div>

          {/* Pattern Matching Results */}
          {patternMatchResults.length > 0 ? (
            <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
              <h3 className="text-sm font-semibold text-[var(--color-text)] mb-1">
                Year Similarity — {forecastState} {techLabel(techFilter)} CF
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] mb-3">
                Based on {patternMatchResults[0]?.monthsCompared ?? 0} months of {currentYear} data
              </p>
              <div className="space-y-2">
                {patternMatchResults.map((result, i) => (
                  <div key={result.year} className="flex items-center gap-3">
                    <span className="text-xs text-[var(--color-text)] w-12 font-medium">{result.year}</span>
                    <div className="flex-1 h-6 bg-[var(--color-bg-elevated)] rounded-full overflow-hidden relative">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${result.similarityPct}%`,
                          backgroundColor: YEAR_COLORS[i % YEAR_COLORS.length],
                          opacity: 0.8,
                        }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                        {result.similarityPct}%
                      </span>
                    </div>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap"
                      style={{
                        backgroundColor: getPhaseColor(result.climateLabel) + '22',
                        color: getPhaseColor(result.climateLabel),
                      }}
                    >
                      {result.climateLabel}
                    </span>
                  </div>
                ))}
              </div>
              {patternMatchResults.length > 0 && (
                <p className="text-xs text-[var(--color-text-muted)] mt-3">
                  Most similar year: <strong className="text-[var(--color-text)]">{patternMatchResults[0].year}</strong>
                  {' '}({patternMatchResults[0].similarityPct}% match)
                  {patternMatchResults[0].climateLabel !== 'Unknown' && (
                    <> — {patternMatchResults[0].climateLabel} conditions</>
                  )}
                </p>
              )}
            </div>
          ) : (
            <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
              <div className="flex items-center gap-2 text-amber-400 mb-2">
                <AlertIcon />
                <span className="text-xs font-medium">Insufficient Data</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                Pattern matching requires at least 2 months of current-year data and 1+ historical years.
                As more data accumulates, the forecast capability will improve.
              </p>
            </div>
          )}

          {/* Forecast Overlay Chart */}
          {forecastChartData.length > 0 && patternMatchResults.length > 0 && (
            <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
              <h3 className="text-sm font-semibold text-[var(--color-text)] mb-1">
                {currentYear} Forecast — {forecastState} {techLabel(techFilter)} CF
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] mb-3">
                Solid white line = actual data. Shaded area = forecast range based on top {Math.min(3, patternMatchResults.length)} matching years.
              </p>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={forecastChartData}>
                  <CartesianGrid strokeDasharray="3 3" {...AXIS_STYLE} />
                  <XAxis dataKey="month" tick={TICK_STYLE} axisLine={AXIS_STYLE} tickLine={false} />
                  <YAxis tick={TICK_STYLE} axisLine={AXIS_STYLE} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 'auto']} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} formatter={(value) => [value != null ? `${Number(value).toFixed(1)}%` : '—']} labelStyle={{ color: 'var(--color-text)', fontWeight: 600 }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: 'var(--color-text-muted)' }} />
                  <ReferenceLine y={25} stroke="#ef4444" strokeDasharray="6 3" />

                  {/* Forecast range area */}
                  <Area
                    type="monotone"
                    dataKey="rangeMax"
                    name="Forecast Range"
                    stroke="none"
                    fill={STATE_COLORS[forecastState]}
                    fillOpacity={0.15}
                    connectNulls={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="rangeMin"
                    stroke="none"
                    fill="var(--color-bg-card)"
                    fillOpacity={1}
                    connectNulls={false}
                    legendType="none"
                  />

                  {/* Historical matching year lines */}
                  {patternMatchResults.slice(0, 3).map((r, i) => (
                    <Line
                      key={r.year}
                      type="monotone"
                      dataKey={`y${r.year}`}
                      name={`${r.year}`}
                      stroke={YEAR_COLORS[i % YEAR_COLORS.length]}
                      strokeWidth={1}
                      strokeDasharray="4 3"
                      dot={false}
                      connectNulls
                    />
                  ))}

                  {/* Current year actual */}
                  <Line
                    type="monotone"
                    dataKey="actual"
                    name={`${currentYear} Actual`}
                    stroke="#ffffff"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#ffffff' }}
                    connectNulls={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Forecast Table */}
          {forecastData.length > 0 && patternMatchResults.length > 0 && (
            <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
              <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">Month-by-Month Forecast</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="text-left py-2 px-2 text-[var(--color-text-muted)] font-medium">Month</th>
                      <th className="text-right py-2 px-2 text-[var(--color-text-muted)] font-medium">Actual</th>
                      <th className="text-right py-2 px-2 text-[var(--color-text-muted)] font-medium">Pessimistic</th>
                      <th className="text-right py-2 px-2 text-[var(--color-text-muted)] font-medium">Median</th>
                      <th className="text-right py-2 px-2 text-[var(--color-text-muted)] font-medium">Optimistic</th>
                      <th className="text-center py-2 px-2 text-[var(--color-text-muted)] font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecastData.map((row, i) => {
                      const aboveMedian = row.actual != null && row.median != null && row.actual > row.median
                      const belowMedian = row.actual != null && row.median != null && row.actual < row.median
                      return (
                        <tr key={row.month} className={`border-b border-[var(--color-border)] ${i % 2 === 0 ? 'bg-[var(--color-bg-elevated)]' : ''}`}>
                          <td className="py-2 px-2 text-[var(--color-text)] font-medium">{row.month}</td>
                          <td className={`text-right py-2 px-2 font-semibold ${aboveMedian ? 'text-emerald-400' : belowMedian ? 'text-red-400' : 'text-[var(--color-text)]'}`}>
                            {row.actual != null ? fmtPct(row.actual) : '—'}
                          </td>
                          <td className="text-right py-2 px-2 text-[var(--color-text-muted)]">
                            {row.pessimistic != null ? fmtPct(row.pessimistic) : '—'}
                          </td>
                          <td className="text-right py-2 px-2 text-[var(--color-text)]">
                            {row.median != null ? fmtPct(row.median) : '—'}
                          </td>
                          <td className="text-right py-2 px-2 text-[var(--color-text-muted)]">
                            {row.optimistic != null ? fmtPct(row.optimistic) : '—'}
                          </td>
                          <td className="text-center py-2 px-2">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${row.isForecast ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                              {row.isForecast ? 'Forecast' : 'Actual'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Methodology */}
          <details className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
            <summary className="text-sm font-medium text-[var(--color-text)] cursor-pointer">Forecast Methodology</summary>
            <div className="mt-3 text-xs text-[var(--color-text-muted)] space-y-2">
              <p><strong className="text-[var(--color-text)]">Pattern matching</strong> uses Pearson correlation to compare the current year&apos;s month-by-month combined capacity factor trajectory with each historical year. Only months where both years have data are compared.</p>
              <p><strong className="text-[var(--color-text)]">Similarity score</strong> is derived from the correlation coefficient: 100% = perfect positive correlation, 50% = no correlation, 0% = perfect negative correlation.</p>
              <p><strong className="text-[var(--color-text)]">Forecast range</strong> uses the top 3 most similar years. For each remaining month, the pessimistic bound is the minimum CF observed across these years, and the optimistic bound is the maximum. The median is the middle value.</p>
              <p><strong className="text-[var(--color-text)]">Limitations:</strong> This is statistical pattern matching, not weather forecasting. It assumes years with similar early-season patterns tend to follow similar trajectories. The forecast improves as more months of current-year data become available and as the historical dataset grows.</p>
              <p>Climate context labels (ENSO phase, IOD) are sourced from Bureau of Meteorology and NOAA records. These help explain <em>why</em> certain years may match the current pattern.</p>
            </div>
          </details>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB: BESS Coverage
         ════════════════════════════════════════════════════════════ */}
      {activeTab === 'bess' && (
        <>
          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-[var(--color-text)] mb-4">Current BESS Coverage by State</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={coverageChartData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" {...AXIS_STYLE} />
                <XAxis dataKey="state" tick={TICK_STYLE} axisLine={AXIS_STYLE} tickLine={false} />
                <YAxis tick={TICK_STYLE} axisLine={AXIS_STYLE} tickLine={false} tickFormatter={(v) => `${v}h`} domain={[0, 5]} />
                <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} formatter={(value) => [`${Number(value).toFixed(2)} hours`]} labelStyle={{ color: 'var(--color-text)', fontWeight: 600 }} />
                <ReferenceLine y={4} stroke="#22c55e" strokeDasharray="6 3" label={{ value: '4h target', fill: '#22c55e', fontSize: 11, position: 'insideTopRight' }} />
                <Bar dataKey="coverage_hours" name="Coverage Hours" radius={[4, 4, 0, 0]}>
                  {coverageChartData.map((entry, i) => (
                    <Cell key={i} fill={getCoverageColor(entry.rating)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {coverageChartData.map(entry => (
                <div key={entry.state} className="bg-[var(--color-bg-elevated)] rounded-lg p-3 border border-[var(--color-border)]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-[var(--color-text)]">{entry.state}</span>
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: getCoverageColor(entry.rating) + '22', color: getCoverageColor(entry.rating) }}
                    >
                      {entry.rating}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-[var(--color-text)]">{fmtHours(entry.coverage_hours)}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">{fmtMW(entry.bess_mw)} / {fmtMWh(entry.bess_mwh)}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">Peak demand: {fmtMW(entry.peak_demand)}</p>
                  <Link to={`/projects?state=${entry.state}&tech=bess`} className="text-[10px] hover:text-[var(--color-primary)] transition-colors text-[var(--color-text-muted)] mt-1 inline-block">
                    View BESS projects →
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-[var(--color-text)] mb-4">Pipeline vs Current BESS Coverage</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={pipelineData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" {...AXIS_STYLE} />
                <XAxis dataKey="state" tick={TICK_STYLE} axisLine={AXIS_STYLE} tickLine={false} />
                <YAxis tick={TICK_STYLE} axisLine={AXIS_STYLE} tickLine={false} tickFormatter={(v) => `${v}h`} domain={[0, 'auto']} />
                <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} formatter={(value) => [`${Number(value).toFixed(2)} hours`]} labelStyle={{ color: 'var(--color-text)', fontWeight: 600 }} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-text-muted)' }} />
                <ReferenceLine y={4} stroke="#22c55e" strokeDasharray="6 3" label={{ value: '4h target', fill: '#22c55e', fontSize: 11, position: 'insideTopRight' }} />
                <Bar dataKey="current_hours" name="Current Coverage" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="potential_hours" name="With Pipeline" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {pipelineData.map(entry => (
                <div key={entry.state} className="bg-[var(--color-bg-elevated)] rounded-lg p-3 border border-[var(--color-border)]">
                  <span className="text-xs font-semibold" style={{ color: STATE_COLORS[entry.state] }}>{entry.state}</span>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-[var(--color-text-muted)]">Pipeline</span>
                      <span className="text-[var(--color-text)]">{fmtMW(entry.pipeline_mw)}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-[var(--color-text-muted)]">Storage</span>
                      <span className="text-[var(--color-text)]">{fmtMWh(entry.pipeline_mwh)}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-[var(--color-text-muted)]">Projects</span>
                      <span className="text-[var(--color-text)]">{entry.pipeline_count}</span>
                    </div>
                    <div className="flex justify-between text-[10px] pt-1 border-t border-[var(--color-border)]">
                      <span className="text-[var(--color-text-muted)]">Current</span>
                      <span className="text-red-400 font-medium">{fmtHours(entry.current_hours)}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-[var(--color-text-muted)]">Potential</span>
                      <span className="text-emerald-400 font-medium">{fmtHours(entry.potential_hours)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================
// Sub-components
// ============================================================

/** Expandable Climate Driver Card */
function ClimateDriverCard({ driver, expanded, onToggle }: { driver: ClimateDriver; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-[var(--color-bg-elevated)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {driver.phases.map(p => (
              <span key={p.name} className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            ))}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text)]">{driver.name}</h3>
            <p className="text-xs text-[var(--color-text-muted)]">{driver.fullName}</p>
          </div>
        </div>
        <svg className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed pt-3">
            {driver.description}
          </p>

          {/* Phases */}
          <div>
            <h4 className="text-xs font-medium text-[var(--color-text)] mb-1.5">Phases</h4>
            <div className="flex flex-wrap gap-2">
              {driver.phases.map(p => (
                <div key={p.name} className="flex items-center gap-1.5 bg-[var(--color-bg-elevated)] rounded-lg px-2 py-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-[10px] font-medium text-[var(--color-text)]">{p.name}</span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">({p.threshold})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Impact on renewables */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-[var(--color-bg-elevated)] rounded-lg p-3">
              <h4 className="text-xs font-medium text-blue-400 mb-1">Wind Impact</h4>
              <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">{driver.impactOnRenewables.wind}</p>
            </div>
            <div className="bg-[var(--color-bg-elevated)] rounded-lg p-3">
              <h4 className="text-xs font-medium text-amber-400 mb-1">Solar Impact</h4>
              <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">{driver.impactOnRenewables.solar}</p>
            </div>
          </div>
          <p className="text-[10px] text-[var(--color-text-muted)]">
            <strong className="text-[var(--color-text)]">Regions most affected:</strong> {driver.impactOnRenewables.regions}
          </p>
          <p className="text-[10px] text-[var(--color-text-muted)]">
            Measured by: {driver.measurementIndex} · Source: {driver.dataSource}
          </p>
        </div>
      )}
    </div>
  )
}

/** Historical Event Table Row */
function HistoricalEventRow({ event, index }: { event: HistoricalClimateEvent; index: number }) {
  return (
    <tr className={`border-b border-[var(--color-border)] ${index % 2 === 0 ? 'bg-[var(--color-bg-elevated)]' : ''}`}>
      <td className="py-2 px-2 text-[var(--color-text)] font-medium whitespace-nowrap">{event.yearRange}</td>
      <td className="py-2 px-2">
        <span
          className="text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap"
          style={{ backgroundColor: getPhaseColor(event.ensoPhase) + '22', color: getPhaseColor(event.ensoPhase) }}
        >
          {event.ensoPhase}
        </span>
      </td>
      <td className="py-2 px-2 hidden sm:table-cell">
        <span
          className="text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap"
          style={{ backgroundColor: getPhaseColor(event.iodPhase) + '22', color: getPhaseColor(event.iodPhase) }}
        >
          {event.iodPhase}
        </span>
      </td>
      <td className="text-center py-2 px-2">
        <span className="text-sm font-bold" style={{ color: getImpactColor(event.windImpact) }}>
          {getImpactArrow(event.windImpact)}
        </span>
      </td>
      <td className="text-center py-2 px-2">
        <span className="text-sm font-bold" style={{ color: getImpactColor(event.solarImpact) }}>
          {getImpactArrow(event.solarImpact)}
        </span>
      </td>
      <td className="py-2 px-2 text-[var(--color-text-muted)] hidden md:table-cell max-w-xs">
        <p className="text-[10px] leading-relaxed truncate" title={event.renewableImpact}>
          {event.renewableImpact.slice(0, 120)}{event.renewableImpact.length > 120 ? '…' : ''}
        </p>
      </td>
    </tr>
  )
}

/** Climate Index Gauge Card */
function ClimateGauge({
  label,
  index,
  value,
  phase,
  outlook,
  min,
  max,
  thresholds,
}: {
  label: string
  index: string
  value: number
  phase: string
  outlook: string
  min: number
  max: number
  thresholds: { value: number; label: string }[]
}) {
  const range = max - min
  const pct = Math.max(0, Math.min(100, ((value - min) / range) * 100))

  return (
    <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">{label}</h3>
        <span
          className="text-[10px] font-medium px-1.5 py-0.5 rounded"
          style={{ backgroundColor: getPhaseColor(phase) + '22', color: getPhaseColor(phase) }}
        >
          {phase}
        </span>
      </div>
      <p className="text-2xl font-bold text-[var(--color-text)] mb-1">
        {value > 0 ? '+' : ''}{value.toFixed(1)}
      </p>
      <p className="text-[10px] text-[var(--color-text-muted)] mb-3">{index}</p>

      {/* Gauge bar */}
      <div className="relative h-3 bg-[var(--color-bg-elevated)] rounded-full mb-1">
        {/* Threshold markers */}
        {thresholds.map(t => {
          const tPct = ((t.value - min) / range) * 100
          return (
            <div
              key={t.value}
              className="absolute top-0 bottom-0 w-px bg-[var(--color-text-muted)]"
              style={{ left: `${tPct}%`, opacity: 0.5 }}
            />
          )
        })}
        {/* Current value indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white"
          style={{
            left: `calc(${pct}% - 6px)`,
            backgroundColor: getPhaseColor(phase),
          }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-[var(--color-text-muted)] mb-2">
        <span>{min}</span>
        <span>{max}</span>
      </div>

      <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">{outlook}</p>
    </div>
  )
}
