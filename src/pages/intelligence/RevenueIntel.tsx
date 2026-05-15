import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, Cell, ReferenceLine,
} from 'recharts'
import { fetchRevenueIntel, fetchWindValue, fetchSolarValue } from '../../lib/dataService'
import ChartWrapper from '../../components/common/ChartWrapper'
import DataTable from '../../components/common/DataTable'
import DrillPanel from '../../components/common/DrillPanel'
import type { RevenueIntelData, MetricStats, RevenueProjectRanking } from '../../lib/types'
import DataProvenance from '../../components/common/DataProvenance'
import StateReportCard, { type ReportTech } from '../../components/intelligence/StateReportCard'

// ============================================================
// Icons — defined BEFORE const arrays per project pattern
// ============================================================

const DollarIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.736 6.979C9.208 6.193 9.696 6 10 6c.304 0 .792.193 1.264.979a1 1 0 001.715-1.029C12.279 4.784 11.232 4 10 4s-2.279.784-2.979 1.95c-.285.475-.507 1-.67 1.55H6a1 1 0 000 2h.013a9.358 9.358 0 000 1H6a1 1 0 100 2h.351c.163.55.385 1.075.67 1.55C7.721 15.216 8.768 16 10 16s2.279-.784 2.979-1.95a1 1 0 10-1.715-1.029c-.472.786-.96.979-1.264.979-.304 0-.792-.193-1.264-.979a5.389 5.389 0 01-.421-.821h1.72a1 1 0 100-2H7.734a7.368 7.368 0 010-1h2.302a1 1 0 000-2H8.315c.129-.292.28-.571.421-.821z" />
  </svg>
)

const TrendIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
  </svg>
)

const BoltIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
  </svg>
)

const ShieldIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
)

// ============================================================
// Section navigation
// ============================================================

type SectionId = 'overview' | 'state-breakdown' | 'state-cards' | 'trouble' | 'magnitude' | 'value-factor'

const StateIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zM14 5.586v12.828l2.293-2.293A1 1 0 0017 16V6a1 1 0 00-.293-.707L14 2.586v3z" clipRule="evenodd" />
  </svg>
)

const AlertIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
)

const ChartBarIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
  </svg>
)

const SparkleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
  </svg>
)

const CardIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
    <path d="M3 4a2 2 0 012-2h10a2 2 0 012 2v3H3V4zM3 9h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V9zm3 3a1 1 0 011-1h4a1 1 0 110 2H7a1 1 0 01-1-1zm0 3a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1z" />
  </svg>
)

const REV_SECTIONS: { id: SectionId; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <DollarIcon /> },
  { id: 'state-breakdown', label: 'State Leaders', icon: <StateIcon /> },
  { id: 'state-cards', label: 'State Report Cards', icon: <CardIcon /> },
  { id: 'trouble', label: 'Revenue Pressure', icon: <AlertIcon /> },
  { id: 'magnitude', label: 'Fleet Revenue', icon: <ChartBarIcon /> },
  { id: 'value-factor', label: 'Value Factor', icon: <SparkleIcon /> },
]

// ============================================================
// Tech colours & labels
// ============================================================

const TECH_COLOURS: Record<string, string> = {
  wind: '#3b82f6',
  solar: '#f59e0b',
  bess: '#10b981',
  pumped_hydro: '#8b5cf6',
  hybrid: '#ec4899',
}

const TECH_LABELS: Record<string, string> = {
  wind: 'Wind',
  solar: 'Solar',
  bess: 'BESS',
  pumped_hydro: 'Pumped Hydro',
  hybrid: 'Hybrid',
}

const TECH_ORDER = ['pumped_hydro', 'wind', 'bess', 'solar', 'hybrid']

// ============================================================
// Helpers
// ============================================================

const fmtRevenue = (v: number) => `$${(v / 1000).toFixed(0)}k`
const fmtPrice = (v: number) => `$${v.toFixed(1)}`
const fmtPct = (v: number) => `${v.toFixed(1)}%`

// Access BESS-specific fields from actual JSON (not in TS interface)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getBessField = (row: any, field: string): MetricStats | undefined => row?.[field]

// ============================================================
// Types for year selector
// ============================================================

type SelectedYear = 2024 | 2025

export default function RevenueIntel() {
  const [data, setData] = useState<RevenueIntelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState<SelectedYear>(2024)
  const [activeSection, setActiveSection] = useState<SectionId>('overview')
  const [selectedTech, setSelectedTech] = useState<string>('bess')
  const [selectedState, setSelectedState] = useState<string>('all')
  const [drill, setDrill] = useState<{ dim: 'tech' | 'state'; key: string; label: string } | null>(null)
  // State Report Card section — independent tech + state selection
  const [cardTech, setCardTech] = useState<ReportTech>('wind')
  const [cardState, setCardState] = useState<string>('NSW')

  useEffect(() => {
    fetchRevenueIntel().then(d => { setData(d); setLoading(false) })
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [vfData, setVfData] = useState<{ wind: any; solar: any } | null>(null)
  const [vfLoading, setVfLoading] = useState(false)

  useEffect(() => {
    if (activeSection !== 'value-factor' || vfData) return
    setVfLoading(true)
    Promise.all([fetchWindValue(), fetchSolarValue()]).then(([windResult, solarResult]) => {
      setVfData({ wind: windResult, solar: solarResult })
      setVfLoading(false)
    })
  }, [activeSection, vfData])

  // ---- Derived data ----

  const techYearRows = useMemo(() => {
    if (!data) return []
    return data.by_technology_year.filter(r => r.year === selectedYear)
  }, [data, selectedYear])

  // Revenue bar chart data
  const revenueBarData = useMemo(() => {
    return TECH_ORDER
      .map(tech => {
        const row = techYearRows.find(r => r.technology === tech)
        if (!row) return null
        return {
          key: tech,
          tech,
          label: TECH_LABELS[tech],
          median: row.revenue_per_mw.median,
          p25: row.revenue_per_mw.p25,
          p75: row.revenue_per_mw.p75,
          count: row.revenue_per_mw.count,
          colour: TECH_COLOURS[tech],
        }
      })
      .filter(Boolean) as Array<{ key: string; tech: string; label: string; median: number; p25: number; p75: number; count: number; colour: string }>
  }, [techYearRows])

  // YoY trend line data — actual JSON uses median_rpm, not revenue_per_mw
  const yoyLineData = useMemo(() => {
    if (!data) return []
    const years = [2024, 2025, 2026]
    return years.map(year => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const trends = data.yoy_trends as Record<string, Array<any>>
      const point: Record<string, number | string> = { year: String(year) }
      for (const tech of TECH_ORDER) {
        const entry = trends[tech]?.find((e: { year: number }) => e.year === year)
        if (entry) {
          point[tech] = entry.median_rpm ?? entry.revenue_per_mw ?? 0
        }
      }
      return point
    })
  }, [data])

  // BESS arbitrage data
  const bessArbitrageData = useMemo(() => {
    if (!data) return []
    return data.by_technology_year
      .filter(r => r.technology === 'bess' && (r.year === 2024 || r.year === 2025))
      .map(r => {
        const spread = getBessField(r, 'bess_spread')
        const discharge = getBessField(r, 'discharge_price')
        const charge = getBessField(r, 'charge_price')
        return {
          year: String(r.year),
          discharge: discharge?.median ?? 0,
          charge: charge?.median ?? 0,
          spread: spread?.median ?? 0,
        }
      })
  }, [data])

  // Comparison table data for selected year
  const comparisonRows = useMemo(() => {
    return TECH_ORDER
      .map(tech => {
        const row = techYearRows.find(r => r.technology === tech)
        if (!row) return null
        const bessSpread = getBessField(row, 'bess_spread')
        return {
          tech,
          label: TECH_LABELS[tech],
          colour: TECH_COLOURS[tech],
          count: row.revenue_per_mw.count,
          revMedian: row.revenue_per_mw.median,
          revP25: row.revenue_per_mw.p25,
          revP75: row.revenue_per_mw.p75,
          priceMedian: row.energy_price.median,
          priceP25: row.energy_price.p25,
          priceP75: row.energy_price.p75,
          cfMedian: row.capacity_factor.median,
          cfP25: row.capacity_factor.p25,
          cfP75: row.capacity_factor.p75,
          spreadMedian: bessSpread?.median,
        }
      })
      .filter(Boolean) as Array<{
        tech: string; label: string; colour: string; count: number;
        revMedian: number; revP25: number; revP75: number;
        priceMedian: number; priceP25: number; priceP75: number;
        cfMedian: number; cfP25: number; cfP75: number;
        spreadMedian?: number;
      }>
  }, [techYearRows])

  // Summary card values (2024 full year)
  const summaryCards = useMemo(() => {
    if (!data) return null
    const rows2024 = data.by_technology_year.filter(r => r.year === 2024)
    const highest = [...rows2024].sort((a, b) => b.revenue_per_mw.median - a.revenue_per_mw.median)[0]
    const bess2024 = rows2024.find(r => r.technology === 'bess')
    const solar2024 = rows2024.find(r => r.technology === 'solar')
    const wind2024 = rows2024.find(r => r.technology === 'wind')
    const bessSpread = getBessField(bess2024, 'bess_spread')

    return {
      highestTech: highest ? TECH_LABELS[highest.technology] : '-',
      highestRevenue: highest ? highest.revenue_per_mw.median : 0,
      highestColour: highest ? TECH_COLOURS[highest.technology] : '#666',
      bessSpread: bessSpread?.median ?? 0,
      solarPrice: solar2024?.energy_price.median ?? 0,
      windRevenue: wind2024?.revenue_per_mw.median ?? 0,
    }
  }, [data])

  // Projects for the current drill — sourced from top_10_by_state (flattened)
  const drillProjects = useMemo(() => {
    if (!drill || !data?.top_10_by_state) return []
    if (drill.dim === 'tech') {
      const stateMap = data.top_10_by_state[drill.key] || {}
      const flat: RevenueProjectRanking[] = []
      for (const list of Object.values(stateMap)) flat.push(...list)
      return flat.sort((a, b) => b.revenue_per_mw - a.revenue_per_mw)
    }
    return []
  }, [drill, data])

  // ---- Render ----

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  if (!data) {
    return <div className="p-6 text-center text-[var(--color-text-muted)]">No revenue data available</div>
  }

  const offtake = data.offtake_comparison

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Revenue Intelligence</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Revenue and pricing analytics across {data.by_technology_year.length} technology-year combinations
        </p>
        <div className="mt-3">
          <DataProvenance page="revenue-intel" />
        </div>
      </div>

      {/* Section navigation */}
      <div className="flex flex-wrap gap-1.5">
        {REV_SECTIONS.map(sec => (
          <button
            key={sec.id}
            onClick={() => setActiveSection(sec.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeSection === sec.id
                ? 'bg-blue-600 text-white'
                : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border border-[var(--color-border)] hover:border-blue-500/30'
            }`}
          >
            {sec.icon}
            {sec.label}
          </button>
        ))}
      </div>

      {activeSection === 'overview' && <>
      {/* Year selector */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Year</span>
        <div className="flex rounded-lg overflow-hidden border border-[var(--color-border)]">
          {([2024, 2025] as SelectedYear[]).map(yr => (
            <button
              key={yr}
              onClick={() => setSelectedYear(yr)}
              className={`px-3 py-1.5 text-sm ${selectedYear === yr ? 'bg-blue-600 text-white' : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)]'}`}
            >
              {yr}
            </button>
          ))}
        </div>
        <span className="text-xs text-[var(--color-text-muted)]">
          2026 excluded (partial year)
        </span>
      </div>

      {/* Rationale */}
      <details className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 mb-6">
        <summary className="text-sm font-medium text-[var(--color-text)] cursor-pointer">How is revenue calculated?</summary>
        <div className="mt-3 text-xs text-[var(--color-text-muted)] space-y-2">
          <p><strong>Revenue per MW</strong> = total market value divided by installed capacity. This normalises across different project sizes so you can compare a 50 MW farm against a 500 MW farm on equal footing.</p>
          <p><strong>Energy price received</strong> = market value divided by energy generated, giving a volume-weighted average price ($/MWh).</p>
          <p><strong>Data source:</strong> All figures are derived from the OpenElectricity API, which provides NEM settlement data from AEMO dispatch and pricing records.</p>
          <p><strong>BESS arbitrage</strong> = difference between average discharge price and average charge price. A higher spread indicates better arbitrage opportunities.</p>
          <p><strong>Statistical presentation:</strong> Values shown are medians with interquartile ranges (P25-P75) to show the spread of outcomes. Medians are used rather than means to reduce the influence of outliers.</p>
          <p><strong>Why this matters:</strong> These metrics help benchmark project financial performance and compare technologies on a like-for-like basis, informing investment and development decisions.</p>
        </div>
      </details>

      {/* Summary cards */}
      {summaryCards && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <div className="flex items-center gap-2 text-[var(--color-text-muted)] mb-2">
              <DollarIcon />
              <span className="text-xs font-medium uppercase tracking-wider">Top Revenue (2024)</span>
            </div>
            <div className="text-xl font-bold" style={{ color: summaryCards.highestColour }}>
              {fmtRevenue(summaryCards.highestRevenue)}
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">{summaryCards.highestTech} median $/MW</div>
          </div>

          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <div className="flex items-center gap-2 text-[var(--color-text-muted)] mb-2">
              <BoltIcon />
              <span className="text-xs font-medium uppercase tracking-wider">BESS Spread</span>
            </div>
            <div className="text-xl font-bold text-emerald-400">
              {fmtPrice(summaryCards.bessSpread)}
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">Median $/MWh (2024)</div>
          </div>

          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <div className="flex items-center gap-2 text-[var(--color-text-muted)] mb-2">
              <TrendIcon />
              <span className="text-xs font-medium uppercase tracking-wider">Solar Price</span>
            </div>
            <div className="text-xl font-bold text-amber-400">
              {fmtPrice(summaryCards.solarPrice)}
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">Median $/MWh (2024)</div>
          </div>

          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <div className="flex items-center gap-2 text-[var(--color-text-muted)] mb-2">
              <ShieldIcon />
              <span className="text-xs font-medium uppercase tracking-wider">Wind Revenue</span>
            </div>
            <div className="text-xl font-bold text-blue-400">
              {fmtRevenue(summaryCards.windRevenue)}
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">Median $/MW (2024)</div>
          </div>
        </div>
      )}

      {/* Revenue by Technology bar chart */}
      <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">
          Revenue by Technology ({selectedYear})
        </h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-1">
          Median revenue per MW by technology. Bar colour indicates technology.
        </p>
        <p className="text-[11px] text-[var(--color-text-muted)]/70 mb-3 italic">
          Click any bar to see projects.
        </p>
        <ChartWrapper title={`Revenue by Technology (${selectedYear})`} data={revenueBarData} csvColumns={['label', 'median', 'p25', 'p75', 'count']}>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={revenueBarData}
              margin={{ top: 5, right: 20, bottom: 5, left: 20 }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClick={(e: any) => {
                const p = e?.activePayload?.[0]?.payload
                if (p?.key) setDrill({ dim: 'tech', key: p.key, label: p.label })
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
              <YAxis
                tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                labelStyle={{ color: 'var(--color-text)' }}
                itemStyle={{ color: 'var(--color-text)' }}
                formatter={(value) => [fmtRevenue(Number(value)), 'Median $/MW']}
                labelFormatter={(label) => {
                  const row = revenueBarData.find(r => r.label === label)
                  return `${label} (${row?.count ?? 0} projects)`
                }}
              />
              <Bar dataKey="median" radius={[4, 4, 0, 0]} cursor="pointer">
                {revenueBarData.map((entry, i) => (
                  <Cell key={i} fill={entry.colour} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>
        {/* Inline legend */}
        <div className="flex flex-wrap gap-3 mt-3 justify-center">
          {revenueBarData.map(r => (
            <div key={r.tech} className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.colour }} />
              {r.label}
            </div>
          ))}
        </div>
      </div>

      {/* Two-column: YoY Trends + BESS Arbitrage */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* YoY Revenue Trends */}
        <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">
            Year-over-Year Revenue Trends
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mb-4">
            Median revenue per MW by year. 2026 is partial (YTD).
          </p>
          <ChartWrapper title="YoY Revenue Trends" data={yoyLineData} csvColumns={['year', ...TECH_ORDER]}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={yoyLineData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="year" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
                <YAxis
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                  labelStyle={{ color: 'var(--color-text)' }}
                  itemStyle={{ color: 'var(--color-text)' }}
                  formatter={(value) => [fmtRevenue(Number(value)), 'Median $/MW']}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px', color: 'var(--color-text-muted)' }}
                  formatter={(value) => TECH_LABELS[value] ?? value}
                />
                {TECH_ORDER.map(tech => (
                  <Line
                    key={tech}
                    type="monotone"
                    dataKey={tech}
                    stroke={TECH_COLOURS[tech]}
                    strokeWidth={2}
                    dot={{ fill: TECH_COLOURS[tech], r: 4 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartWrapper>
        </div>

        {/* BESS Arbitrage */}
        <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">
            BESS Arbitrage Pricing
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mb-4">
            Median discharge, charge, and spread prices ($/MWh) for BESS
          </p>
          <ChartWrapper title="BESS Arbitrage Pricing" data={bessArbitrageData} csvColumns={['year', 'discharge', 'charge', 'spread']}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={bessArbitrageData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="year" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
                <YAxis
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                  labelStyle={{ color: 'var(--color-text)' }}
                  itemStyle={{ color: 'var(--color-text)' }}
                  formatter={(value) => [fmtPrice(Number(value)), '']}
                />
                <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--color-text-muted)' }} />
                <Bar dataKey="discharge" name="Discharge Price" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="charge" name="Charge Price" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="spread" name="Spread" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartWrapper>
        </div>
      </div>

      {/* Technology Comparison Table */}
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] overflow-x-auto">
        <div className="p-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">
            Technology Comparison ({selectedYear})
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Median values with interquartile range (P25 - P75)
          </p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="text-left p-3 text-[var(--color-text-muted)] font-medium">Technology</th>
              <th className="text-right p-3 text-[var(--color-text-muted)] font-medium">Projects</th>
              <th className="text-right p-3 text-[var(--color-text-muted)] font-medium">Revenue/MW</th>
              <th className="text-right p-3 text-[var(--color-text-muted)] font-medium hidden sm:table-cell">Rev Range</th>
              <th className="text-right p-3 text-[var(--color-text-muted)] font-medium">Energy Price</th>
              <th className="text-right p-3 text-[var(--color-text-muted)] font-medium hidden sm:table-cell">Price Range</th>
              <th className="text-right p-3 text-[var(--color-text-muted)] font-medium">CF %</th>
              <th className="text-right p-3 text-[var(--color-text-muted)] font-medium hidden md:table-cell">CF Range</th>
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map(row => (
              <tr key={row.tech} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg)]/50">
                <td className="p-3">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: row.colour }} />
                    <Link to={`/projects?tech=${row.tech}`} className="text-[var(--color-text)] hover:text-[var(--color-primary)] font-medium">
                      {row.label}
                    </Link>
                  </span>
                </td>
                <td className="p-3 text-right text-[var(--color-text-muted)]">{row.count}</td>
                <td className="p-3 text-right font-medium text-[var(--color-text)]">{fmtRevenue(row.revMedian)}</td>
                <td className="p-3 text-right text-[var(--color-text-muted)] text-xs hidden sm:table-cell">
                  {fmtRevenue(row.revP25)} - {fmtRevenue(row.revP75)}
                </td>
                <td className="p-3 text-right font-medium text-[var(--color-text)]">{fmtPrice(row.priceMedian)}</td>
                <td className="p-3 text-right text-[var(--color-text-muted)] text-xs hidden sm:table-cell">
                  {fmtPrice(row.priceP25)} - {fmtPrice(row.priceP75)}
                </td>
                <td className="p-3 text-right font-medium text-[var(--color-text)]">{fmtPct(row.cfMedian)}</td>
                <td className="p-3 text-right text-[var(--color-text-muted)] text-xs hidden md:table-cell">
                  {fmtPct(row.cfP25)} - {fmtPct(row.cfP75)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Offtake Comparison */}
      <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">
          Offtake Agreement Impact ({offtake.year})
        </h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Revenue comparison for projects with and without offtake agreements
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {/* With Offtake */}
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-emerald-400">With Offtake</span>
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                {offtake.with_offtake.count} projects
              </span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-[var(--color-text-muted)] mb-0.5">Revenue/MW</div>
                <div className="text-lg font-bold text-[var(--color-text)]">
                  {fmtRevenue(offtake.with_offtake.revenue_per_mw.median)}
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  IQR: {fmtRevenue(offtake.with_offtake.revenue_per_mw.p25)} - {fmtRevenue(offtake.with_offtake.revenue_per_mw.p75)}
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--color-text-muted)] mb-0.5">Energy Price</div>
                <div className="text-lg font-bold text-[var(--color-text)]">
                  {fmtPrice(offtake.with_offtake.energy_price.median)}
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  IQR: {fmtPrice(offtake.with_offtake.energy_price.p25)} - {fmtPrice(offtake.with_offtake.energy_price.p75)}
                </div>
              </div>
            </div>
          </div>

          {/* Without Offtake */}
          <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-orange-400">Without Offtake</span>
              <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                {offtake.without_offtake.count} projects
              </span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-[var(--color-text-muted)] mb-0.5">Revenue/MW</div>
                <div className="text-lg font-bold text-[var(--color-text)]">
                  {fmtRevenue(offtake.without_offtake.revenue_per_mw.median)}
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  IQR: {fmtRevenue(offtake.without_offtake.revenue_per_mw.p25)} - {fmtRevenue(offtake.without_offtake.revenue_per_mw.p75)}
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--color-text-muted)] mb-0.5">Energy Price</div>
                <div className="text-lg font-bold text-[var(--color-text)]">
                  {fmtPrice(offtake.without_offtake.energy_price.median)}
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  IQR: {fmtPrice(offtake.without_offtake.energy_price.p25)} - {fmtPrice(offtake.without_offtake.energy_price.p75)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Source note */}
      <div className="text-xs text-[var(--color-text-muted)] italic">
        Revenue figures derived from AEMO dispatch and pricing data. Revenue/MW = annual energy revenue
        divided by registered capacity. 2026 figures are year-to-date and not comparable to full-year values.
      </div>
      </>}

      {/* ============================================================ */}
      {/* State Breakdown Section */}
      {/* ============================================================ */}
      {activeSection === 'state-breakdown' && data.top_10_by_state && (
        <StateBreakdownSection
          data={data.top_10_by_state}
          selectedTech={selectedTech}
          setSelectedTech={setSelectedTech}
          selectedState={selectedState}
          setSelectedState={setSelectedState}
        />
      )}

      {/* ============================================================ */}
      {/* State Report Cards Section */}
      {/* ============================================================ */}
      {activeSection === 'state-cards' && (
        <div className="space-y-4">
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">State Report Cards</h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Fleet-level scorecard for every wind, solar, and BESS farm in a state. Each project's grade and rationale come from the same value-summary data as the individual project pages — pivoted here from "deep dive on one project" to "compare all projects in one state". Export the full state view as a multi-page PDF.
            </p>
          </div>
          <StateReportCard
            tech={cardTech}
            state={cardState}
            onTechChange={setCardTech}
            onStateChange={setCardState}
          />
        </div>
      )}

      {/* ============================================================ */}
      {/* Revenue Pressure Section */}
      {/* ============================================================ */}
      {activeSection === 'trouble' && data.projects_in_trouble && (
        <RevenuePressureSection projects={data.projects_in_trouble} />
      )}

      {/* ============================================================ */}
      {/* Fleet Revenue Magnitude Section */}
      {/* ============================================================ */}
      {activeSection === 'magnitude' && data.revenue_magnitude_trends && (
        <FleetRevenueMagnitudeSection data={data.revenue_magnitude_trends} />
      )}

      {/* ============================================================ */}
      {/* Value Factor Intel Section */}
      {/* ============================================================ */}
      {activeSection === 'value-factor' && (
        vfLoading
          ? <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>
          : <ValueFactorSection wind={vfData?.wind ?? null} solar={vfData?.solar ?? null} />
      )}

      {/* Drill-down panel — opens when a Revenue by Tech bar is clicked */}
      <DrillPanel
        open={drill !== null}
        title={drill ? `${drill.label} projects` : ''}
        subtitle={drill ? `${drillProjects.length} top revenue projects (from State Leaders)` : undefined}
        onClose={() => setDrill(null)}
      >
        {drill && drillProjects.length > 0 ? (
          <DataTable<RevenueProjectRanking>
            rows={drillProjects}
            columns={[
              {
                key: 'name',
                label: 'Project',
                render: (_v, row) => (
                  <Link
                    to={`/projects/${row.project_id}?from=intelligence/revenue-intel&fromLabel=Back to Revenue Intelligence`}
                    className="text-[var(--color-primary)] hover:underline"
                    onClick={() => setDrill(null)}
                  >
                    {row.name}
                  </Link>
                ),
              },
              { key: 'state', label: 'State' },
              { key: 'capacity_mw', label: 'MW', format: 'number0', aggregator: 'sum' },
              {
                key: 'capacity_factor_pct',
                label: 'CF%',
                format: 'percent1',
                aggregator: 'avg',
                hideOnMobile: true,
              },
              {
                key: 'revenue_per_mw',
                label: 'Revenue/MW',
                format: 'currency0',
                aggregator: 'avg',
                render: (v) => v != null ? `$${Math.round(Number(v) / 1000)}k` : '—',
              },
            ]}
            showTotals
            csvFilename={`revenue-${drill.dim}-${drill.key}`}
          />
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">No projects found for this technology.</p>
        )}
      </DrillPanel>
    </div>
  )
}

// ============================================================
// State Breakdown Section
// ============================================================

function StateBreakdownSection({ data, selectedTech, setSelectedTech, selectedState, setSelectedState }: {
  data: Record<string, Record<string, RevenueProjectRanking[]>>
  selectedTech: string; setSelectedTech: (t: string) => void
  selectedState: string; setSelectedState: (s: string) => void
}) {
  const techKeys = Object.keys(data)
  const states = useMemo(() => {
    const s = new Set<string>()
    for (const stateMap of Object.values(data)) {
      for (const state of Object.keys(stateMap)) s.add(state)
    }
    return ['all', ...Array.from(s).sort()]
  }, [data])

  const stateData = data[selectedTech] || {}
  const displayProjects = useMemo(() => {
    if (selectedState === 'all') {
      const all: RevenueProjectRanking[] = []
      for (const projects of Object.values(stateData)) all.push(...projects)
      return all.sort((a, b) => b.revenue_per_mw - a.revenue_per_mw).slice(0, 20)
    }
    return stateData[selectedState] || []
  }, [stateData, selectedState])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Technology</span>
          <div className="flex rounded-lg overflow-hidden border border-[var(--color-border)]">
            {techKeys.map(tech => (
              <button
                key={tech}
                onClick={() => setSelectedTech(tech)}
                className={`px-3 py-1.5 text-xs ${selectedTech === tech ? 'text-white' : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)]'}`}
                style={selectedTech === tech ? { backgroundColor: TECH_COLOURS[tech] || '#3b82f6' } : {}}
              >
                {TECH_LABELS[tech] || tech}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">State</span>
          <div className="flex rounded-lg overflow-hidden border border-[var(--color-border)]">
            {states.map(st => (
              <button
                key={st}
                onClick={() => setSelectedState(st)}
                className={`px-2.5 py-1.5 text-xs ${selectedState === st ? 'bg-blue-600 text-white' : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)]'}`}
              >
                {st === 'all' ? 'All' : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] overflow-x-auto">
        <div className="p-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">
            Top Revenue Performers — {TECH_LABELS[selectedTech] || selectedTech} {selectedState !== 'all' ? `(${selectedState})` : ''}
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">Ranked by revenue per MW for latest full year</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="text-left p-3 text-[var(--color-text-muted)] font-medium">#</th>
              <th className="text-left p-3 text-[var(--color-text-muted)] font-medium">Project</th>
              <th className="text-left p-3 text-[var(--color-text-muted)] font-medium hidden sm:table-cell">State</th>
              <th className="text-right p-3 text-[var(--color-text-muted)] font-medium">MW</th>
              <th className="text-right p-3 text-[var(--color-text-muted)] font-medium">Revenue/MW</th>
              <th className="text-right p-3 text-[var(--color-text-muted)] font-medium hidden sm:table-cell">CF %</th>
              <th className="text-right p-3 text-[var(--color-text-muted)] font-medium">YoY</th>
            </tr>
          </thead>
          <tbody>
            {displayProjects.map((p, i) => (
              <tr key={p.project_id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg)]/50">
                <td className="p-3 text-[var(--color-text-muted)]">{i + 1}</td>
                <td className="p-3">
                  <Link to={`/projects/${p.project_id}`} className="text-[var(--color-text)] hover:text-[var(--color-primary)] font-medium">
                    {p.name}
                  </Link>
                </td>
                <td className="p-3 text-[var(--color-text-muted)] hidden sm:table-cell">{p.state}</td>
                <td className="p-3 text-right text-[var(--color-text-muted)]">{Math.round(p.capacity_mw)}</td>
                <td className="p-3 text-right font-medium text-[var(--color-text)]">${Math.round(p.revenue_per_mw / 1000)}k</td>
                <td className="p-3 text-right text-[var(--color-text-muted)] hidden sm:table-cell">
                  {p.capacity_factor_pct ? `${p.capacity_factor_pct.toFixed(1)}%` : '-'}
                </td>
                <td className="p-3 text-right">
                  {p.yoy_change_pct != null ? (
                    <span className={p.yoy_change_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {p.yoy_change_pct >= 0 ? '+' : ''}{p.yoy_change_pct.toFixed(1)}%
                    </span>
                  ) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {displayProjects.length === 0 && (
          <div className="p-8 text-center text-sm text-[var(--color-text-muted)]">No data for this combination.</div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Revenue Pressure Section
// ============================================================

function RevenuePressureSection({ projects }: { projects: RevenueProjectRanking[] }) {
  const [filterTech, setFilterTech] = useState<string>('all')
  const [drill, setDrill] = useState<{ dim: 'tech'; key: string; label: string } | null>(null)

  const techCounts = useMemo(() => {
    const counts: Record<string, number> = { all: projects.length }
    for (const p of projects) {
      const t = p.technology || 'unknown'
      counts[t] = (counts[t] || 0) + 1
    }
    return counts
  }, [projects])

  const filtered = useMemo(() => {
    if (filterTech === 'all') return projects
    return projects.filter(p => p.technology === filterTech)
  }, [projects, filterTech])

  // Chart data: worst 15 decliners
  const chartData = useMemo(() => {
    return filtered.slice(0, 15).map(p => ({
      key: p.technology || 'unknown',
      name: p.name.length > 20 ? p.name.slice(0, 18) + '...' : p.name,
      fullName: p.name,
      yoy_change: p.yoy_change_pct || 0,
      tech: p.technology || '',
    }))
  }, [filtered])

  // Projects in the drilled tech, sorted by biggest decline first
  const drillProjects = useMemo(() => {
    if (!drill) return []
    return projects
      .filter(p => (p.technology || 'unknown') === drill.key)
      .sort((a, b) => (a.yoy_change_pct ?? 0) - (b.yoy_change_pct ?? 0))
  }, [drill, projects])

  return (
    <div className="space-y-4">
      {/* Tech filter */}
      <div className="flex flex-wrap gap-1.5">
        {Object.keys(techCounts).map(tech => (
          <button
            key={tech}
            onClick={() => setFilterTech(tech)}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
              filterTech === tech
                ? 'text-white'
                : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
            }`}
            style={filterTech === tech ? { backgroundColor: tech === 'all' ? '#6b7280' : TECH_COLOURS[tech] || '#6b7280' } : {}}
          >
            {tech === 'all' ? 'All' : TECH_LABELS[tech] || tech} ({techCounts[tech]})
          </button>
        ))}
      </div>

      {/* Decline chart */}
      <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Revenue Pressure — Biggest YoY Declines</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-1">Projects with the largest year-over-year revenue per MW decline</p>
        <p className="text-[11px] text-[var(--color-text-muted)]/70 mb-3 italic">
          Click any bar to see all decliners in that technology.
        </p>
        <ChartWrapper title="Revenue Pressure" data={chartData} csvColumns={['fullName', 'yoy_change', 'tech']}>
          <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 28)}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, bottom: 5, left: 120 }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClick={(e: any) => {
                const p = e?.activePayload?.[0]?.payload
                if (p?.key) setDrill({ dim: 'tech', key: p.key, label: TECH_LABELS[p.key] || p.key })
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis type="number" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} width={115} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                labelStyle={{ color: 'var(--color-text)' }}
                formatter={(value) => [`${Number(value).toFixed(1)}%`, 'YoY Change']}
                labelFormatter={(_, payload) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const p = (payload as any)?.[0]?.payload
                  return p?.fullName || ''
                }}
              />
              <Bar dataKey="yoy_change" radius={[0, 4, 4, 0]} cursor="pointer">
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.yoy_change >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </div>

      {/* Table */}
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] overflow-x-auto">
        <div className="p-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">All Revenue Decliners</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="text-left p-3 text-[var(--color-text-muted)] font-medium">Project</th>
              <th className="text-left p-3 text-[var(--color-text-muted)] font-medium hidden sm:table-cell">Tech</th>
              <th className="text-left p-3 text-[var(--color-text-muted)] font-medium hidden sm:table-cell">State</th>
              <th className="text-right p-3 text-[var(--color-text-muted)] font-medium">MW</th>
              <th className="text-right p-3 text-[var(--color-text-muted)] font-medium">Prev $/MW</th>
              <th className="text-right p-3 text-[var(--color-text-muted)] font-medium">Latest $/MW</th>
              <th className="text-right p-3 text-[var(--color-text-muted)] font-medium">YoY</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 30).map(p => (
              <tr key={p.project_id} className={`border-b border-[var(--color-border)] hover:bg-[var(--color-bg)]/50 ${(p.yoy_change_pct || 0) < -30 ? 'bg-red-500/5' : ''}`}>
                <td className="p-3">
                  <Link to={`/projects/${p.project_id}`} className="text-[var(--color-text)] hover:text-[var(--color-primary)] font-medium">
                    {p.name}
                  </Link>
                </td>
                <td className="p-3 hidden sm:table-cell">
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: TECH_COLOURS[p.technology || ''] || '#6b7280' }}>
                    {TECH_LABELS[p.technology || ''] || p.technology}
                  </span>
                </td>
                <td className="p-3 text-[var(--color-text-muted)] hidden sm:table-cell">{p.state}</td>
                <td className="p-3 text-right text-[var(--color-text-muted)]">{Math.round(p.capacity_mw)}</td>
                <td className="p-3 text-right text-[var(--color-text-muted)]">
                  {p.prev_revenue_per_mw ? `$${Math.round(p.prev_revenue_per_mw / 1000)}k` : '-'}
                </td>
                <td className="p-3 text-right font-medium text-[var(--color-text)]">
                  {p.latest_revenue_per_mw ? `$${Math.round(p.latest_revenue_per_mw / 1000)}k` : `$${Math.round(p.revenue_per_mw / 1000)}k`}
                </td>
                <td className="p-3 text-right">
                  {p.yoy_change_pct != null ? (
                    <span className={`font-medium ${p.yoy_change_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {p.yoy_change_pct >= 0 ? '+' : ''}{p.yoy_change_pct.toFixed(1)}%
                    </span>
                  ) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Drill-down panel — opens when a decline bar is clicked */}
      <DrillPanel
        open={drill !== null}
        title={drill ? `${drill.label} decliners` : ''}
        subtitle={drill ? `${drillProjects.length} projects · sorted by largest decline` : undefined}
        onClose={() => setDrill(null)}
      >
        {drill && drillProjects.length > 0 ? (
          <DataTable<RevenueProjectRanking>
            rows={drillProjects}
            columns={[
              {
                key: 'name',
                label: 'Project',
                render: (_v, row) => (
                  <Link
                    to={`/projects/${row.project_id}?from=intelligence/revenue-intel&fromLabel=Back to Revenue Intelligence`}
                    className="text-[var(--color-primary)] hover:underline"
                    onClick={() => setDrill(null)}
                  >
                    {row.name}
                  </Link>
                ),
              },
              { key: 'state', label: 'State', hideOnMobile: true },
              { key: 'capacity_mw', label: 'MW', format: 'number0', aggregator: 'sum' },
              {
                key: 'revenue_per_mw',
                label: 'Revenue/MW',
                aggregator: 'avg',
                align: 'right',
                render: (v) => v != null ? `$${Math.round(Number(v) / 1000)}k` : '—',
              },
              {
                key: 'yoy_change_pct',
                label: 'YoY',
                align: 'right',
                aggregator: 'median',
                render: (v) => {
                  if (v == null) return '—'
                  const n = Number(v)
                  return (
                    <span className={`font-medium ${n >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {n >= 0 ? '+' : ''}{n.toFixed(1)}%
                    </span>
                  )
                },
              },
            ]}
            showTotals
            csvFilename={`revenue-pressure-${drill.key}`}
          />
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">No projects found.</p>
        )}
      </DrillPanel>
    </div>
  )
}

// ============================================================
// Value Factor Intel Section
// ============================================================

function ValueFactorSection({
  wind, solar,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wind: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  solar: any;
}) {
  const vfTrendData = useMemo(() => {
    const years = [2024, 2025, 2026]
    return years.map(year => {
      const yStr = String(year)
      let windSum = 0, windCount = 0
      let solarSum = 0, solarCount = 0
      if (wind?.projects) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const proj of Object.values(wind.projects) as any[]) {
          if (!proj.monthly_data) continue
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const m of proj.monthly_data as any[]) {
            if (m.value_factor == null) continue
            if (String(m.month).startsWith(yStr)) { windSum += m.value_factor; windCount++ }
          }
        }
      }
      if (solar?.projects) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const proj of Object.values(solar.projects) as any[]) {
          if (!proj.monthly_data) continue
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const m of proj.monthly_data as any[]) {
            if (m.value_factor == null) continue
            if (String(m.month).startsWith(yStr)) { solarSum += m.value_factor; solarCount++ }
          }
        }
      }
      return {
        year: yStr,
        wind: windCount > 0 ? windSum / windCount : null,
        solar: solarCount > 0 ? solarSum / solarCount : null,
      }
    }).filter(d => d.wind != null || d.solar != null)
  }, [wind, solar])

  const stateVfData = useMemo(() => {
    const states = ['NSW', 'VIC', 'SA', 'QLD', 'TAS']
    return states.map(state => ({
      state,
      wind: (wind?.state_averages?.[state]?.avg_value_factor as number | undefined) ?? null,
      solar: (solar?.state_averages?.[state]?.avg_value_factor as number | undefined) ?? null,
    })).filter(d => d.wind != null || d.solar != null)
  }, [wind, solar])

  const vintageData = useMemo(() => {
    if (!solar?.projects) return []
    const byVintage: Record<number, { vfSum: number; count: number }> = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const proj of Object.values(solar.projects) as any[]) {
      if (!proj.cod || proj.value_summary?.avg_value_factor == null) continue
      const vintage = parseInt(String(proj.cod).slice(0, 4))
      if (isNaN(vintage) || vintage < 2015 || vintage > 2030) continue
      if (!byVintage[vintage]) byVintage[vintage] = { vfSum: 0, count: 0 }
      byVintage[vintage].vfSum += proj.value_summary.avg_value_factor
      byVintage[vintage].count++
    }
    return Object.entries(byVintage)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([vintage, { vfSum, count }]) => ({ vintage, vf: count > 0 ? vfSum / count : null, count }))
      .filter(d => d.vf != null)
  }, [solar])

  if (!wind && !solar) {
    return <div className="p-6 text-center text-[var(--color-text-muted)]">Value factor data unavailable</div>
  }

  return (
    <div className="space-y-6">
      {/* Explainer */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-amber-400 mb-1">Understanding Value Factor &amp; Cannibalisation</h3>
        <p className="text-xs text-[var(--color-text-muted)]">
          Value Factor (VF) = capture price ÷ pool average price. VF = 1.0 means pool parity. As solar and wind
          capacity expands, assets generate at the same times as peers, pushing spot prices down and compressing
          VF — this is cannibalisation. Solar is most affected (VF typically 0.3–0.6); wind stays closer to
          parity (0.8–0.9). State-level VF varies significantly with grid mix.
        </p>
      </div>

      {/* Chart 1: Wind vs Solar VF Trend */}
      <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Wind vs Solar Value Factor Trend</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Fleet-average value factor by year. 2024 covers Aug–Dec only (NEMWEB pool prices available from Aug 2024).
        </p>
        <ChartWrapper title="VF Trend" data={vfTrendData} csvColumns={['year', 'wind', 'solar']}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={vfTrendData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
              <YAxis
                domain={[0, 1.15]}
                tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                tickFormatter={(v) => Number(v).toFixed(2)}
              />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                labelStyle={{ color: 'var(--color-text)' }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => [
                  value != null ? Number(value).toFixed(3) : '—',
                  name === 'wind' ? 'Wind VF' : 'Solar VF',
                ]}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px', color: 'var(--color-text-muted)' }}
                formatter={(value) => value === 'wind' ? 'Wind' : value === 'solar' ? 'Solar' : value}
              />
              <ReferenceLine y={1.0} stroke="#6b7280" strokeDasharray="4 4" label={{ value: 'Pool parity', fill: '#6b7280', fontSize: 10, position: 'insideTopRight' }} />
              <Line type="monotone" dataKey="wind" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 5 }} connectNulls />
              <Line type="monotone" dataKey="solar" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 5 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </div>

      {/* Chart 2: State Cannibalisation Index */}
      <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">State Cannibalisation Index</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Average value factor by state and technology. Lower = more cannibalisation pressure from fleet penetration.
        </p>
        <ChartWrapper title="State Cannibalisation Index" data={stateVfData} csvColumns={['state', 'wind', 'solar']}>
          <ResponsiveContainer width="100%" height={Math.max(240, stateVfData.length * 50)}>
            <BarChart data={stateVfData} layout="vertical" margin={{ top: 5, right: 40, bottom: 5, left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                type="number"
                domain={[0, 1.15]}
                tickFormatter={(v) => Number(v).toFixed(1)}
                tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
              />
              <YAxis type="category" dataKey="state" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} width={35} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                labelStyle={{ color: 'var(--color-text)' }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => [
                  value != null ? Number(value).toFixed(3) : '—',
                  name === 'wind' ? 'Wind VF' : 'Solar VF',
                ]}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} formatter={(value) => value === 'wind' ? 'Wind' : 'Solar'} />
              <ReferenceLine x={1.0} stroke="#6b7280" strokeDasharray="4 4" />
              <Bar dataKey="wind" name="wind" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={10} />
              <Bar dataKey="solar" name="solar" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={10} />
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>
        <div className="mt-3 p-3 bg-[var(--color-bg)]/50 border border-[var(--color-border)] rounded-lg">
          <p className="text-xs text-[var(--color-text-muted)]">
            <span className="font-semibold text-amber-400">SA Solar</span> has the lowest VF due to extremely high solar penetration in South Australia.
            {' '}<span className="font-semibold text-blue-400">QLD Wind</span> exceeds pool parity (VF &gt; 1.0), benefiting from favourable timing relative to peak demand.
          </p>
        </div>
      </div>

      {/* Chart 3: Solar VF by Vintage */}
      {vintageData.length > 0 && (
        <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Solar Value Factor by Vintage (COD Year)</h2>
          <p className="text-xs text-[var(--color-text-muted)] mb-4">
            Average VF grouped by year of commissioning. Later cohorts commissioned into a more saturated grid typically show lower VF.
          </p>
          <ChartWrapper title="Solar VF by Vintage" data={vintageData} csvColumns={['vintage', 'vf', 'count']}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={vintageData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="vintage" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
                <YAxis
                  domain={[0, 0.75]}
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                  tickFormatter={(v) => Number(v).toFixed(2)}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                  labelStyle={{ color: 'var(--color-text)' }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, _name: any, props: any) => [
                    `${Number(value).toFixed(3)} (${props.payload?.count ?? 0} projects)`,
                    'Avg Value Factor',
                  ]}
                />
                <Bar dataKey="vf" name="Avg VF" radius={[4, 4, 0, 0]}>
                  {vintageData.map((d, i) => {
                    const vf = d.vf ?? 0
                    const fill = vf >= 0.5 ? '#10b981' : vf >= 0.35 ? '#f59e0b' : '#ef4444'
                    return <Cell key={i} fill={fill} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartWrapper>
          <p className="text-xs text-[var(--color-text-muted)] mt-2 italic">
            Colour: green ≥ 0.50 · amber ≥ 0.35 · red &lt; 0.35
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Fleet Revenue Magnitude Section
// ============================================================

function FleetRevenueMagnitudeSection({ data }: { data: Record<string, Array<{ year: number; total_revenue_m_aud: number; project_count: number; mean_per_project_aud: number }>> }) {
  const chartData = useMemo(() => {
    const years = new Set<number>()
    for (const entries of Object.values(data)) {
      for (const e of entries) years.add(e.year)
    }
    return Array.from(years).sort().map(year => {
      const point: Record<string, number | string> = { year: String(year) }
      for (const [tech, entries] of Object.entries(data)) {
        const entry = entries.find(e => e.year === year)
        if (entry) {
          point[`${tech}_rev`] = entry.total_revenue_m_aud
          point[`${tech}_count`] = entry.project_count
        }
      }
      return point
    })
  }, [data])

  const techKeys = Object.keys(data).sort()

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {techKeys.filter(t => TECH_LABELS[t]).map(tech => {
          const entries = data[tech]
          const latest = entries[entries.length - 1]
          const prev = entries.length > 1 ? entries[entries.length - 2] : null
          const yoy = prev && prev.total_revenue_m_aud > 0
            ? ((latest.total_revenue_m_aud - prev.total_revenue_m_aud) / prev.total_revenue_m_aud * 100)
            : null
          return (
            <div key={tech} className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TECH_COLOURS[tech] }} />
                <span className="text-xs font-medium text-[var(--color-text-muted)]">{TECH_LABELS[tech]}</span>
              </div>
              <div className="text-lg font-bold text-[var(--color-text)]">
                ${latest.total_revenue_m_aud.toFixed(0)}M
              </div>
              <div className="text-xs text-[var(--color-text-muted)]">
                {latest.project_count} projects ({latest.year})
              </div>
              {yoy != null && (
                <div className={`text-xs mt-1 font-medium ${yoy >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {yoy >= 0 ? '+' : ''}{yoy.toFixed(1)}% YoY
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Stacked bar chart */}
      <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Fleet Revenue by Technology</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Total estimated annual revenue ($M AUD) across all operating projects
        </p>
        <ChartWrapper title="Fleet Revenue" data={chartData} csvColumns={['year', ...techKeys.map(t => `${t}_rev`)]}>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} tickFormatter={(v) => `$${v}M`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                labelStyle={{ color: 'var(--color-text)' }}
                formatter={(value, name) => {
                  const tech = String(name).replace('_rev', '')
                  return [`$${Number(value).toFixed(0)}M`, TECH_LABELS[tech] || tech]
                }}
              />
              <Legend formatter={(value) => TECH_LABELS[value.replace('_rev', '')] || value} wrapperStyle={{ fontSize: '12px' }} />
              {techKeys.filter(t => TECH_COLOURS[t]).map(tech => (
                <Bar key={tech} dataKey={`${tech}_rev`} stackId="a" fill={TECH_COLOURS[tech]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </div>

      {/* Per-project mean chart */}
      <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Mean Revenue Per Project</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Average annual revenue per project ($k AUD) — a declining trend indicates dilution from new entrants
        </p>
        <ChartWrapper title="Mean Revenue Per Project" data={chartData} csvColumns={['year', ...techKeys.map(t => `${t}_mean`)]}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={chartData.map(point => {
                const withMeans = { ...point }
                for (const tech of techKeys) {
                  const entries = data[tech]
                  const entry = entries?.find(e => String(e.year) === point.year)
                  if (entry) withMeans[`${tech}_mean`] = Math.round(entry.mean_per_project_aud / 1000)
                }
                return withMeans
              })}
              margin={{ top: 5, right: 20, bottom: 5, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} tickFormatter={(v) => `$${v}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                formatter={(value, name) => {
                  const tech = String(name).replace('_mean', '')
                  return [`$${Number(value).toFixed(0)}k`, TECH_LABELS[tech] || tech]
                }}
              />
              <Legend formatter={(value) => TECH_LABELS[value.replace('_mean', '')] || value} wrapperStyle={{ fontSize: '12px' }} />
              {techKeys.filter(t => TECH_COLOURS[t]).map(tech => (
                <Line key={tech} type="monotone" dataKey={`${tech}_mean`} stroke={TECH_COLOURS[tech]} strokeWidth={2} dot={{ r: 4, fill: TECH_COLOURS[tech] }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </div>
    </div>
  )
}
