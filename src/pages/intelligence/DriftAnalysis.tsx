import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  ErrorBar,
} from 'recharts'
import { fetchDriftAnalysis } from '../../lib/dataService'
import ChartWrapper from '../../components/common/ChartWrapper'
import ChartFrame from '../../components/common/ChartFrame'
import ScrollableTable from '../../components/common/ScrollableTable'
import DataTable from '../../components/common/DataTable'
import DrillPanel from '../../components/common/DrillPanel'
import type { DriftAnalysisData, DriftProject } from '../../lib/types'
import DataProvenance from '../../components/common/DataProvenance'

/* ── icons defined BEFORE const arrays (Vite HMR issue) ── */
const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
)
const ChartIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
  </svg>
)
const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
)
const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
  </svg>
)

const TECH_COLORS: Record<string, string> = {
  wind: '#3b82f6',
  solar: '#f59e0b',
  bess: '#10b981',
  pumped_hydro: '#8b5cf6',
  hybrid: '#ec4899',
  offshore_wind: '#0ea5e9',
  gas: '#ef4444',
}

const TECH_LABELS: Record<string, string> = {
  wind: 'Wind',
  solar: 'Solar',
  bess: 'BESS',
  pumped_hydro: 'Pumped Hydro',
  hybrid: 'Hybrid',
  offshore_wind: 'Offshore Wind',
  gas: 'Gas',
}

const STATE_ORDER = ['NSW', 'QLD', 'VIC', 'SA', 'TAS', 'WA']

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

type SortKey = 'developer' | 'count' | 'mean' | 'on_time_pct' | 'median'
type SortDir = 'asc' | 'desc'

export default function DriftAnalysis() {
  const [data, setData] = useState<DriftAnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTechs, setSelectedTechs] = useState<Set<string>>(new Set())
  const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey>('count')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [drill, setDrill] = useState<{ dim: 'technology' | 'state'; key: string; label: string } | null>(null)

  // Projects matching the current drill dimension
  const drillProjects = useMemo(() => {
    if (!drill || !data) return []
    return data.projects.filter((p) => p[drill.dim] === drill.key)
  }, [drill, data])

  useEffect(() => {
    fetchDriftAnalysis().then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [])

  /* ── filter helpers ── */
  const toggleTech = useCallback((tech: string) => {
    setSelectedTechs((prev) => {
      const next = new Set(prev)
      if (next.has(tech)) next.delete(tech)
      else next.add(tech)
      return next
    })
  }, [])

  const toggleState = useCallback((state: string) => {
    setSelectedStates((prev) => {
      const next = new Set(prev)
      if (next.has(state)) next.delete(state)
      else next.add(state)
      return next
    })
  }, [])

  /* ── filtered projects ── */
  const filteredProjects = useMemo(() => {
    if (!data) return []
    let result = data.projects
    if (selectedTechs.size > 0) result = result.filter((p) => selectedTechs.has(p.technology))
    if (selectedStates.size > 0) result = result.filter((p) => selectedStates.has(p.state))
    return result
  }, [data, selectedTechs, selectedStates])

  /* ── stat cards ── */
  const stats = useMemo(() => {
    if (!filteredProjects.length) return { total: 0, median: 0, mean: 0, onTimePct: 0 }
    const drifts = filteredProjects.map((p) => p.drift_months).sort((a, b) => a - b)
    const n = drifts.length
    const median = n % 2 === 0 ? (drifts[n / 2 - 1] + drifts[n / 2]) / 2 : drifts[Math.floor(n / 2)]
    const mean = drifts.reduce((s, d) => s + d, 0) / n
    const onTime = drifts.filter((d) => d <= 6).length
    return { total: n, median, mean, onTimePct: (onTime / n) * 100 }
  }, [filteredProjects])

  /* ── tech bar chart data ── */
  const techChartData = useMemo(() => {
    if (!data) return []
    const techs = selectedTechs.size > 0
      ? Object.keys(data.by_technology).filter((t) => selectedTechs.has(t))
      : Object.keys(data.by_technology)
    return techs.map((tech) => {
      const g = data.by_technology[tech]
      return {
        key: tech,
        name: TECH_LABELS[tech] || tech,
        median: g.median,
        mean: parseFloat(g.mean.toFixed(1)),
        errorLow: g.median - g.p25,
        errorHigh: g.p75 - g.median,
        count: g.count,
      }
    })
  }, [data, selectedTechs])

  /* ── state bar chart data ── */
  const stateChartData = useMemo(() => {
    if (!data) return []
    const states = selectedStates.size > 0
      ? STATE_ORDER.filter((s) => selectedStates.has(s) && data.by_state[s])
      : STATE_ORDER.filter((s) => data.by_state[s])
    return states.map((state) => {
      const g = data.by_state[state]
      return {
        key: state,
        name: state,
        median: g.median,
        mean: parseFloat(g.mean.toFixed(1)),
        errorLow: g.median - g.p25,
        errorHigh: g.p75 - g.median,
        count: g.count,
      }
    })
  }, [data, selectedStates])

  /* ── year trend data ── */
  const yearTrendData = useMemo(() => {
    if (!data) return []
    return data.year_trend.map((y) => ({
      year: y.year,
      median: y.median,
      mean: parseFloat(y.mean.toFixed(1)),
      count: y.count,
    }))
  }, [data])

  /* ── developer ranking (sorted) ── */
  const devRanking = useMemo(() => {
    if (!data) return []
    const rows = [...data.developer_ranking]
    rows.sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
    })
    return rows
  }, [data, sortKey, sortDir])

  /* ── scatter data ── */
  const scatterByTech = useMemo(() => {
    if (!filteredProjects.length) return new Map<string, DriftProject[]>()
    const map = new Map<string, DriftProject[]>()
    for (const p of filteredProjects) {
      const list = map.get(p.technology) || []
      list.push(p)
      map.set(p.technology, list)
    }
    return map
  }, [filteredProjects])

  /* ── sort handler ── */
  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  const sortArrow = (key: SortKey) => (sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '')

  /* ── available tech/state for filter chips ── */
  const availableTechs = useMemo(() => {
    if (!data) return []
    return Object.keys(data.by_technology)
  }, [data])

  const availableStates = useMemo(() => {
    if (!data) return []
    return STATE_ORDER.filter((s) => data.by_state[s])
  }, [data])

  /* ── loading state ── */
  if (loading) {
    return (
      <div className="px-4 lg:px-8 py-6 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-[var(--color-bg-card)] rounded w-56" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-[var(--color-bg-card)] rounded-xl h-24" />
            ))}
          </div>
          <div className="bg-[var(--color-bg-card)] rounded-xl h-80" />
          <div className="bg-[var(--color-bg-card)] rounded-xl h-80" />
        </div>
      </div>
    )
  }

  /* ── empty state ── */
  if (!data || !data.projects.length) {
    return (
      <div className="px-4 lg:px-8 py-6 max-w-6xl mx-auto">
        <h1 className="text-xl lg:text-2xl font-bold text-[var(--color-text)] mb-4">COD Drift Analysis</h1>
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-12 text-center">
          <p className="text-[var(--color-text-muted)]">No drift data available.</p>
        </div>
      </div>
    )
  }

  const hasFilters = selectedTechs.size > 0 || selectedStates.size > 0

  return (
    <div className="px-4 lg:px-8 py-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <section>
        <h1 className="text-2xl lg:text-3xl font-bold text-[var(--color-text)] mb-1">
          COD Drift Analysis
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          {hasFilters
            ? `${filteredProjects.length} of ${data.total_projects} projects matching filters`
            : `${data.total_projects} projects with COD drift`}
        </p>
        <div className="mt-3">
          <DataProvenance page="drift-analysis" />
        </div>
      </section>

      {/* Filter Bar */}
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Filters
          </span>
          {hasFilters && (
            <button
              onClick={() => { setSelectedTechs(new Set()); setSelectedStates(new Set()) }}
              className="text-[11px] text-[var(--color-primary)] hover:underline"
            >
              Reset all
            </button>
          )}
        </div>

        {/* Tech pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]/60 w-11 flex-shrink-0">
            Tech
          </span>
          {availableTechs.map((tech) => {
            const isActive = selectedTechs.has(tech)
            const color = TECH_COLORS[tech] || '#6b7280'
            return (
              <button
                key={tech}
                onClick={() => toggleTech(tech)}
                className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                  isActive
                    ? 'border-transparent font-medium'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
                }`}
                style={isActive ? { backgroundColor: `${color}20`, color } : undefined}
              >
                {TECH_LABELS[tech] || tech}
              </button>
            )
          })}
        </div>

        {/* State pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]/60 w-11 flex-shrink-0">
            State
          </span>
          {availableStates.map((state) => {
            const isActive = selectedStates.has(state)
            return (
              <button
                key={state}
                onClick={() => toggleState(state)}
                className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                  isActive
                    ? 'border-transparent bg-[var(--color-primary)]/20 text-[var(--color-primary)] font-medium'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
                }`}
              >
                {state}
              </button>
            )
          })}
        </div>
      </section>

      {/* Stat Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<ChartIcon />} label="Total Projects" value={stats.total.toLocaleString()} color="#3b82f6" />
        <StatCard
          icon={<ClockIcon />}
          label="Median Drift"
          value={`${stats.median.toFixed(0)} mo`}
          color={stats.median > 12 ? '#ef4444' : stats.median > 6 ? '#f59e0b' : '#22c55e'}
        />
        <StatCard
          icon={<ChartIcon />}
          label="Mean Drift"
          value={`${stats.mean.toFixed(1)} mo`}
          color={stats.mean > 12 ? '#ef4444' : stats.mean > 6 ? '#f59e0b' : '#22c55e'}
        />
        <StatCard
          icon={<CheckIcon />}
          label="On-time (≤6 mo)"
          value={`${stats.onTimePct.toFixed(0)}%`}
          color={stats.onTimePct > 50 ? '#22c55e' : stats.onTimePct > 30 ? '#f59e0b' : '#ef4444'}
        />
      </section>

      {/* Drift by Technology */}
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Drift by Technology</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Bars show median and mean drift. Whiskers show interquartile range (p25–p75).
        </p>
        <p className="text-[11px] text-[var(--color-text-muted)]/70 -mt-3 mb-3 italic">
          Click any bar to see the projects behind it.
        </p>
        <ChartFrame title="Drift by Technology" height={288} heightLg={320} data={techChartData} csvColumns={['name', 'median', 'mean', 'count']}>
          <BarChart
            data={techChartData}
            barGap={4}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onClick={(e: any) => {
              const p = e?.activePayload?.[0]?.payload
              if (p?.key) setDrill({ dim: 'technology', key: p.key, label: p.name })
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="name" tick={TICK_STYLE} axisLine={AXIS_STYLE} />
            <YAxis
              tick={TICK_STYLE}
              axisLine={AXIS_STYLE}
              label={{ value: 'Months', angle: -90, position: 'insideLeft', fill: 'var(--color-text-muted, #6b7280)', fontSize: 12 }}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              formatter={(value) => `${Number(value).toFixed(1)} months`}
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-text-muted, #9ca3af)' }} />
            <Bar dataKey="median" name="Median" fill="#3b82f6" radius={[4, 4, 0, 0]} cursor="pointer">
              <ErrorBar dataKey="errorHigh" direction="y" width={4} stroke="#3b82f6" strokeWidth={1.5} />
            </Bar>
            <Bar dataKey="mean" name="Mean" fill="#f59e0b" radius={[4, 4, 0, 0]} cursor="pointer" />
          </BarChart>
        </ChartFrame>
      </section>

      {/* Drift by State */}
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Drift by State</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Median and mean COD drift by state. Whiskers show p25–p75 range.
        </p>
        <p className="text-[11px] text-[var(--color-text-muted)]/70 -mt-3 mb-3 italic">
          Click any bar to see the projects behind it.
        </p>
        <ChartFrame title="Drift by State" height={288} heightLg={320} data={stateChartData} csvColumns={['name', 'median', 'mean', 'count']}>
          <BarChart
            data={stateChartData}
            barGap={4}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onClick={(e: any) => {
              const p = e?.activePayload?.[0]?.payload
              if (p?.key) setDrill({ dim: 'state', key: p.key, label: p.name })
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="name" tick={TICK_STYLE} axisLine={AXIS_STYLE} />
            <YAxis
              tick={TICK_STYLE}
              axisLine={AXIS_STYLE}
              label={{ value: 'Months', angle: -90, position: 'insideLeft', fill: 'var(--color-text-muted, #6b7280)', fontSize: 12 }}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              formatter={(value) => `${Number(value).toFixed(1)} months`}
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-text-muted, #9ca3af)' }} />
            <Bar dataKey="median" name="Median" fill="#3b82f6" radius={[4, 4, 0, 0]} cursor="pointer">
              <ErrorBar dataKey="errorHigh" direction="y" width={4} stroke="#3b82f6" strokeWidth={1.5} />
            </Bar>
            <Bar dataKey="mean" name="Mean" fill="#f59e0b" radius={[4, 4, 0, 0]} cursor="pointer" />
          </BarChart>
        </ChartFrame>
      </section>

      {/* Year Trend */}
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Drift Trend by COD Year</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Are newer projects drifting more or less? Median drift by original COD year.
        </p>
        <ChartWrapper title="Drift Trend by COD Year" data={yearTrendData} csvColumns={['year', 'median', 'mean', 'count']}>
          <div className="h-72 lg:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yearTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="year" tick={TICK_STYLE} axisLine={AXIS_STYLE} />
                <YAxis
                  tick={TICK_STYLE}
                  axisLine={AXIS_STYLE}
                  label={{ value: 'Months', angle: -90, position: 'insideLeft', fill: 'var(--color-text-muted, #6b7280)', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  itemStyle={TOOLTIP_ITEM_STYLE}
                  formatter={(value) => `${Number(value).toFixed(1)} months`}
                  labelFormatter={(label) => `COD Year: ${label}`}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-text-muted, #9ca3af)' }} />
                <Line
                  type="monotone"
                  dataKey="median"
                  name="Median Drift"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#3b82f6' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="mean"
                  name="Mean Drift"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3, fill: '#f59e0b' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartWrapper>
      </section>

      {/* Scatter Plot */}
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Capacity vs Drift</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Each dot is a project. Hover for details. Colored by technology.
        </p>
        <ChartWrapper title="Capacity vs Drift" data={filteredProjects} csvColumns={['name', 'technology', 'state', 'capacity_mw', 'drift_months', 'developer']}>
          <div className="h-80 lg:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                type="number"
                dataKey="capacity_mw"
                name="Capacity"
                tick={TICK_STYLE}
                axisLine={AXIS_STYLE}
                label={{ value: 'Capacity (MW)', position: 'insideBottom', offset: -4, fill: 'var(--color-text-muted, #6b7280)', fontSize: 12 }}
              />
              <YAxis
                type="number"
                dataKey="drift_months"
                name="Drift"
                tick={TICK_STYLE}
                axisLine={AXIS_STYLE}
                label={{ value: 'Drift (months)', angle: -90, position: 'insideLeft', fill: 'var(--color-text-muted, #6b7280)', fontSize: 12 }}
              />
              <ZAxis range={[30, 30]} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const p = payload[0].payload as DriftProject
                  return (
                    <div style={TOOLTIP_STYLE} className="p-2.5 shadow-lg">
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs opacity-70 mt-0.5">
                        {TECH_LABELS[p.technology] || p.technology} · {p.state} · {p.capacity_mw} MW
                      </p>
                      <p className="text-xs mt-1">
                        Drift: <span className="font-medium">{p.drift_months} months</span>
                      </p>
                      {p.developer && (
                        <p className="text-xs opacity-70">{p.developer}</p>
                      )}
                    </div>
                  )
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, color: 'var(--color-text-muted, #9ca3af)' }}
              />
              {[...scatterByTech.entries()].map(([tech, projects]) => (
                <Scatter key={tech} name={TECH_LABELS[tech] || tech} data={projects}>
                  {projects.map((_, i) => (
                    <Cell key={i} fill={TECH_COLORS[tech] || '#6b7280'} fillOpacity={0.7} />
                  ))}
                </Scatter>
              ))}
            </ScatterChart>
          </ResponsiveContainer>
          </div>
        </ChartWrapper>
      </section>

      {/* Developer Ranking */}
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <UsersIcon />
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Developer Ranking</h2>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Top 20 developers by project count. Click column headers to sort.
        </p>
        <ScrollableTable>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th
                  className="text-left py-2.5 pr-3 text-[var(--color-text-muted)] font-medium cursor-pointer hover:text-[var(--color-text)] whitespace-nowrap"
                  onClick={() => handleSort('developer')}
                >
                  Developer{sortArrow('developer')}
                </th>
                <th
                  className="text-right py-2.5 px-3 text-[var(--color-text-muted)] font-medium cursor-pointer hover:text-[var(--color-text)] whitespace-nowrap"
                  onClick={() => handleSort('count')}
                >
                  Projects{sortArrow('count')}
                </th>
                <th
                  className="text-right py-2.5 px-3 text-[var(--color-text-muted)] font-medium cursor-pointer hover:text-[var(--color-text)] whitespace-nowrap"
                  onClick={() => handleSort('mean')}
                >
                  Avg Drift{sortArrow('mean')}
                </th>
                <th
                  className="text-right py-2.5 px-3 text-[var(--color-text-muted)] font-medium cursor-pointer hover:text-[var(--color-text)] whitespace-nowrap"
                  onClick={() => handleSort('median')}
                >
                  Median{sortArrow('median')}
                </th>
                <th
                  className="text-right py-2.5 pl-3 text-[var(--color-text-muted)] font-medium cursor-pointer hover:text-[var(--color-text)] whitespace-nowrap"
                  onClick={() => handleSort('on_time_pct')}
                >
                  On-time %{sortArrow('on_time_pct')}
                </th>
              </tr>
            </thead>
            <tbody>
              {devRanking.map((dev) => (
                <tr
                  key={dev.developer}
                  className="border-b border-[var(--color-border)]/30 hover:bg-[var(--color-bg-primary)]/50 transition-colors"
                >
                  <td className="py-2.5 pr-3 text-[var(--color-text)] max-w-[200px] truncate">
                    {dev.developer}
                  </td>
                  <td className="text-right py-2.5 px-3 text-[var(--color-text)] tabular-nums">
                    {dev.count}
                  </td>
                  <td className="text-right py-2.5 px-3 tabular-nums" style={{ color: driftColor(dev.mean) }}>
                    {dev.mean.toFixed(1)} mo
                  </td>
                  <td className="text-right py-2.5 px-3 tabular-nums" style={{ color: driftColor(dev.median) }}>
                    {dev.median} mo
                  </td>
                  <td className="text-right py-2.5 pl-3 tabular-nums" style={{ color: onTimeColor(dev.on_time_pct) }}>
                    {dev.on_time_pct.toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollableTable>
      </section>

      {/* Project List (filtered) — show top drifters */}
      {filteredProjects.length > 0 && (
        <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Largest Drifters</h2>
          <p className="text-xs text-[var(--color-text-muted)] mb-4">
            Top 20 projects by absolute drift. Click any column header to re-sort; click a project name to open it.
          </p>
          <DataTable<DriftProject>
            rows={[...filteredProjects]
              .sort((a, b) => Math.abs(b.drift_months) - Math.abs(a.drift_months))
              .slice(0, 20)}
            columns={[
              {
                key: 'name',
                label: 'Project',
                render: (_v, row) => (
                  <Link
                    to={`/projects/${row.project_id}?from=intelligence/drift-analysis&fromLabel=Back to Drift Analysis`}
                    className="text-[var(--color-primary)] hover:underline"
                  >
                    {row.name}
                  </Link>
                ),
              },
              {
                key: 'technology',
                label: 'Tech',
                hideOnMobile: true,
                render: (_v, row) => (
                  <span style={{ color: TECH_COLORS[row.technology] }}>
                    {TECH_LABELS[row.technology] || row.technology}
                  </span>
                ),
              },
              { key: 'state', label: 'State', hideOnMobile: true },
              { key: 'capacity_mw', label: 'MW', format: 'number0', aggregator: 'sum' },
              {
                key: 'drift_months',
                label: 'Drift',
                align: 'right',
                aggregator: 'median',
                render: (v, row) => (
                  <span className="font-medium" style={{ color: driftColor(row.drift_months) }}>
                    {(v as number) > 0 ? '+' : ''}{v as number} mo
                  </span>
                ),
              },
            ]}
            defaultSort={{ key: 'drift_months', dir: 'desc' }}
            showTotals
            totalsLabel={<span className="text-[var(--color-text-muted)]">Top 20 aggregate</span>}
            csvFilename="largest-drifters"
          />
        </section>
      )}

      {/* Drill-down panel — opens when a bar is clicked */}
      <DrillPanel
        open={drill !== null}
        title={drill ? (drill.dim === 'technology' ? `${drill.label} projects` : `Projects in ${drill.label}`) : ''}
        subtitle={drill ? `${drillProjects.length} projects · sorted by absolute drift` : undefined}
        onClose={() => setDrill(null)}
      >
        {drill && drillProjects.length > 0 ? (
          <DataTable<DriftProject>
            rows={[...drillProjects].sort((a, b) => Math.abs(b.drift_months) - Math.abs(a.drift_months))}
            columns={[
              {
                key: 'name',
                label: 'Project',
                render: (_v, row) => (
                  <Link
                    to={`/projects/${row.project_id}?from=intelligence/drift-analysis&fromLabel=Back to Drift Analysis`}
                    className="text-[var(--color-primary)] hover:underline"
                    onClick={() => setDrill(null)}
                  >
                    {row.name}
                  </Link>
                ),
              },
              ...(drill.dim === 'state'
                ? [{
                    key: 'technology',
                    label: 'Tech',
                    render: (_v: unknown, row: DriftProject) => (
                      <span style={{ color: TECH_COLORS[row.technology] }}>
                        {TECH_LABELS[row.technology] || row.technology}
                      </span>
                    ),
                  }]
                : [{ key: 'state', label: 'State' }]),
              { key: 'capacity_mw', label: 'MW', format: 'number0' as const, aggregator: 'sum' as const },
              {
                key: 'drift_months',
                label: 'Drift',
                align: 'right' as const,
                aggregator: 'median' as const,
                render: (v: unknown, row: DriftProject) => (
                  <span className="font-medium" style={{ color: driftColor(row.drift_months) }}>
                    {(v as number) > 0 ? '+' : ''}{v as number} mo
                  </span>
                ),
              },
            ]}
            showTotals
            csvFilename={`drift-${drill.dim}-${drill.key}`}
          />
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">No projects found.</p>
        )}
      </DrillPanel>
    </div>
  )
}

/* ── Stat Card component ── */
function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2" style={{ color }}>
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold tabular-nums" style={{ color }}>
        {value}
      </p>
    </div>
  )
}

/* ── color helpers ── */
function driftColor(months: number): string {
  if (months <= 6) return '#22c55e'
  if (months <= 18) return '#f59e0b'
  return '#ef4444'
}

function onTimeColor(pct: number): string {
  if (pct >= 60) return '#22c55e'
  if (pct >= 35) return '#f59e0b'
  return '#ef4444'
}
