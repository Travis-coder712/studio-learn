import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts'
import { fetchProjectTimeline } from '../lib/dataService'
import { TECHNOLOGY_CONFIG, STATUS_CONFIG } from '../lib/types'
import type { ProjectTimelineData, Technology, State, ProjectStatus } from '../lib/types'
import { isCuratedProject, CURATED_NOTE, CURATED_BENCHMARK } from '../lib/curatedFilter'
import DataProvenance from '../components/common/DataProvenance'

// ============================================================
// Icons — defined BEFORE const arrays per project pattern
// ============================================================

const ChartIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
    <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
  </svg>
)

const TableIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z" clipRule="evenodd" />
  </svg>
)

// ============================================================
// Constants
// ============================================================

const ALL_TECHS: Technology[] = ['wind', 'solar', 'bess', 'hybrid', 'offshore_wind', 'pumped_hydro']
const ALL_STATES: State[] = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS']
const ALL_STATUSES: ProjectStatus[] = ['operating', 'commissioning', 'construction', 'development']

type ViewMode = 'charts' | 'table'
type MetricMode = 'count' | 'capacity'
type SplitMode = 'none' | 'technology' | 'state' | 'status'

// ============================================================
// Component
// ============================================================

export default function ProjectTimeline() {
  const navigate = useNavigate()
  const [data, setData] = useState<ProjectTimelineData | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('charts')
  const [metric, setMetric] = useState<MetricMode>('count')
  const [split, setSplit] = useState<SplitMode>('technology')

  // Curated toggle (default on)
  const [curatedView, setCuratedView] = useState(true)
  const [showCuratedInfo, setShowCuratedInfo] = useState(false)

  // Multi-select filters
  const [techFilters, setTechFilters] = useState<Technology[]>([])
  const [stateFilters, setStateFilters] = useState<State[]>([])
  const [statusFilters, setStatusFilters] = useState<ProjectStatus[]>([])

  useEffect(() => {
    fetchProjectTimeline()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  function toggleTech(value: Technology) {
    setTechFilters(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])
  }
  function toggleState(value: State) {
    setStateFilters(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])
  }
  function toggleStatus(value: ProjectStatus) {
    setStatusFilters(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])
  }

  // Filter projects and rebuild year data
  const { filteredYearData, filteredProjects, yearRange } = useMemo(() => {
    if (!data) return { filteredYearData: [], filteredProjects: [], yearRange: [2000, 2026] }

    let projects = data.projects.filter(p => p.first_seen_year)

    // Apply curated filter first
    if (curatedView) projects = projects.filter(isCuratedProject)

    if (techFilters.length) projects = projects.filter(p => techFilters.includes(p.technology))
    if (stateFilters.length) projects = projects.filter(p => stateFilters.includes(p.state))
    if (statusFilters.length) projects = projects.filter(p => statusFilters.includes(p.status))

    // Only show years >= 2000 for clarity (older projects aren't interesting for "explosion" view)
    projects = projects.filter(p => (p.first_seen_year ?? 0) >= 2000)

    // Build year data
    const yearMap = new Map<number, typeof projects>()
    for (const p of projects) {
      const yr = p.first_seen_year!
      if (!yearMap.has(yr)) yearMap.set(yr, [])
      yearMap.get(yr)!.push(p)
    }

    // Fill all years in range
    const years = Array.from(yearMap.keys())
    const minYear = years.length ? Math.min(...years) : 2000
    const maxYear = years.length ? Math.max(...years) : 2026
    const yearData: Record<string, unknown>[] = []

    for (let y = minYear; y <= maxYear; y++) {
      const ps = yearMap.get(y) || []
      const entry: Record<string, unknown> = {
        year: y,
        count: ps.length,
        capacity_mw: Math.round(ps.reduce((s, p) => s + p.capacity_mw, 0)),
        projectIds: ps.map(p => p.id),
      }

      // Add split breakdowns
      if (split === 'technology') {
        for (const tech of ALL_TECHS) {
          const tps = ps.filter(p => p.technology === tech)
          entry[`${tech}_count`] = tps.length
          entry[`${tech}_capacity`] = Math.round(tps.reduce((s, p) => s + p.capacity_mw, 0))
        }
      } else if (split === 'state') {
        for (const state of ALL_STATES) {
          const sps = ps.filter(p => p.state === state)
          entry[`${state}_count`] = sps.length
          entry[`${state}_capacity`] = Math.round(sps.reduce((s, p) => s + p.capacity_mw, 0))
        }
      } else if (split === 'status') {
        for (const status of ALL_STATUSES) {
          const sps = ps.filter(p => p.status === status)
          entry[`${status}_count`] = sps.length
          entry[`${status}_capacity`] = Math.round(sps.reduce((s, p) => s + p.capacity_mw, 0))
        }
      }

      yearData.push(entry)
    }

    return {
      filteredYearData: yearData,
      filteredProjects: projects,
      yearRange: [minYear, maxYear],
    }
  }, [data, curatedView, techFilters, stateFilters, statusFilters, split])

  const navigateToProjects = useCallback((ids: string[], title: string) => {
    const params = new URLSearchParams()
    params.set('ids', ids.join(','))
    params.set('title', title)
    params.set('from', 'project-timeline')
    params.set('fromLabel', 'Back to Project Timeline')
    navigate(`/projects?${params.toString()}`)
  }, [navigate])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60dvh]">
        <div className="text-sm text-[var(--color-text-muted)] animate-pulse">Loading timeline data...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60dvh]">
        <p className="text-[var(--color-text-muted)]">No timeline data available</p>
      </div>
    )
  }

  const totalFiltered = filteredProjects.length
  const totalCapacity = filteredProjects.reduce((s, p) => s + p.capacity_mw, 0)
  const activeFilters = techFilters.length + stateFilters.length + statusFilters.length

  // Cumulative data for area chart
  const cumulativeData = filteredYearData.map((entry, i) => {
    const cumCount = filteredYearData.slice(0, i + 1).reduce((s, e) => s + (e.count as number), 0)
    const cumCapacity = filteredYearData.slice(0, i + 1).reduce((s, e) => s + (e.capacity_mw as number), 0)
    return { ...entry, cumCount, cumCapacity }
  })

  const metricSuffix = metric === 'count' ? '_count' : '_capacity'
  const metricLabel = metric === 'count' ? 'Projects' : 'MW'

  const getSplitKeys = (): { key: string; label: string; color: string }[] => {
    if (split === 'technology') {
      return ALL_TECHS.map(t => ({
        key: `${t}${metricSuffix}`,
        label: TECHNOLOGY_CONFIG[t]?.label ?? t,
        color: TECHNOLOGY_CONFIG[t]?.color ?? '#6b7280',
      }))
    }
    if (split === 'state') {
      const stateColors: Record<string, string> = {
        NSW: '#3b82f6', VIC: '#8b5cf6', QLD: '#ef4444',
        SA: '#f59e0b', WA: '#10b981', TAS: '#06b6d4',
      }
      return ALL_STATES.map(s => ({
        key: `${s}${metricSuffix}`,
        label: s,
        color: stateColors[s] ?? '#6b7280',
      }))
    }
    if (split === 'status') {
      return ALL_STATUSES.map(s => ({
        key: `${s}${metricSuffix}`,
        label: STATUS_CONFIG[s]?.label ?? s,
        color: STATUS_CONFIG[s]?.color ?? '#6b7280',
      }))
    }
    return []
  }

  const splitKeys = getSplitKeys()

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-[var(--color-text)] mb-1">
          Project Timeline
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          <button
            onClick={() => navigateToProjects(
              filteredProjects.map(p => p.id),
              `All ${totalFiltered} projects (${yearRange[0]}–${yearRange[1]})`
            )}
            className="hover:text-[var(--color-primary)] hover:underline transition-colors"
          >
            {totalFiltered} projects
          </button>
          {' · '}
          {totalCapacity >= 1000
            ? `${(totalCapacity / 1000).toFixed(1)} GW`
            : `${Math.round(totalCapacity)} MW`
          } total capacity
          {data.total_without_date > 0 && (
            <span className="text-[var(--color-text-muted)]/60">
              {' · '}{data.total_without_date} projects without date data
            </span>
          )}
        </p>
        <div className="mt-3">
          <DataProvenance page="project-timeline" />
        </div>
        <div className="mt-2">
          <Link
            to="/intelligence/nem-activities"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--color-primary)] hover:underline"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
            </svg>
            See month-by-month NEM activities timeline →
          </Link>
        </div>
      </div>

      {/* Multi-select Filter Chips */}
      <div className="mb-4 space-y-3">
        {/* Pipeline view toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] w-12">
            View
          </span>
          {(['curated', 'full'] as const).map((v) => {
            const isActive = v === 'curated' ? curatedView : !curatedView
            return (
              <button
                key={v}
                onClick={() => setCuratedView(v === 'curated')}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  isActive
                    ? 'border-transparent bg-[var(--color-primary)]/20 text-[var(--color-primary)] font-medium'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
                }`}
              >
                {v === 'curated' ? 'Curated' : 'Full Pipeline'}
              </button>
            )
          })}
          {curatedView && (
            <button
              onClick={() => setShowCuratedInfo(!showCuratedInfo)}
              className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] underline decoration-dotted"
            >
              What is curated?
            </button>
          )}
        </div>
        {showCuratedInfo && curatedView && (
          <div className="text-[11px] text-[var(--color-text-muted)] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-3 leading-relaxed max-w-2xl">
            <strong className="text-[var(--color-text)]">Curated</strong> {CURATED_NOTE}
            <span className="block mt-1 text-[10px] opacity-75">{CURATED_BENCHMARK}</span>
          </div>
        )}

        {/* Technology */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] w-12">
            Tech
          </span>
          {ALL_TECHS.map((tech) => {
            const config = TECHNOLOGY_CONFIG[tech]
            const isActive = techFilters.includes(tech)
            return (
              <button
                key={tech}
                onClick={() => toggleTech(tech)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  isActive
                    ? 'border-transparent font-medium'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
                }`}
                style={
                  isActive
                    ? { backgroundColor: `${config.color}20`, color: config.color }
                    : undefined
                }
              >
                {config.icon} {config.label}
              </button>
            )
          })}
        </div>

        {/* State */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] w-12">
            State
          </span>
          {ALL_STATES.map((state) => {
            const isActive = stateFilters.includes(state)
            return (
              <button
                key={state}
                onClick={() => toggleState(state)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
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

        {/* Status */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] w-12">
            Status
          </span>
          {ALL_STATUSES.map((status) => {
            const config = STATUS_CONFIG[status]
            const isActive = statusFilters.includes(status)
            return (
              <button
                key={status}
                onClick={() => toggleStatus(status)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  isActive
                    ? 'border-transparent font-medium'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
                }`}
                style={
                  isActive
                    ? { backgroundColor: `${config.color}20`, color: config.color }
                    : undefined
                }
              >
                {config.label}
              </button>
            )
          })}
        </div>

        {activeFilters > 0 && (
          <button
            onClick={() => { setTechFilters([]); setStateFilters([]); setStatusFilters([]) }}
            className="text-xs text-[var(--color-primary)] hover:underline"
          >
            Clear {activeFilters} filter{activeFilters > 1 ? 's' : ''} ×
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        {/* View toggle */}
        <div className="flex items-center gap-1 bg-[var(--color-bg-elevated)] rounded-lg p-0.5 border border-[var(--color-border)]">
          <button
            onClick={() => setView('charts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              view === 'charts'
                ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            <ChartIcon /> Charts
          </button>
          <button
            onClick={() => setView('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              view === 'table'
                ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            <TableIcon /> Table
          </button>
        </div>

        {/* Metric toggle */}
        <div className="flex items-center gap-1 bg-[var(--color-bg-elevated)] rounded-lg p-0.5 border border-[var(--color-border)]">
          <button
            onClick={() => setMetric('count')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              metric === 'count'
                ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            # Projects
          </button>
          <button
            onClick={() => setMetric('capacity')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              metric === 'capacity'
                ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            MW Capacity
          </button>
        </div>

        {/* Split toggle */}
        <div className="flex items-center gap-1 bg-[var(--color-bg-elevated)] rounded-lg p-0.5 border border-[var(--color-border)]">
          {(['none', 'technology', 'state', 'status'] as SplitMode[]).map(s => (
            <button
              key={s}
              onClick={() => setSplit(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                split === s
                  ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {s === 'none' ? 'Total' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {view === 'charts' ? (
        <div className="space-y-6">
          {/* Main bar chart — new projects per year */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">
              New Projects per Year
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] mb-4">
              {metric === 'count' ? 'Number of projects first appearing' : 'MW capacity of projects first appearing'} · Click bars to view projects
            </p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                {split === 'none' ? (
                  <BarChart data={filteredYearData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="year"
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    />
                    <YAxis
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      label={{ value: metricLabel, angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8,
                        color: '#f1f5f9',
                        fontSize: 13,
                      }}
                      formatter={(value) => [
                        metric === 'count'
                          ? `${value} projects`
                          : `${Number(value).toLocaleString()} MW`,
                        'Total',
                      ]}
                    />
                    <Bar
                      dataKey={metric === 'count' ? 'count' : 'capacity_mw'}
                      fill="var(--color-primary)"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      onClick={(entry: any) => {
                        if (entry?.projectIds?.length) {
                          navigateToProjects(
                            entry.projectIds as string[],
                            `Projects first seen in ${entry.year}`
                          )
                        }
                      }}
                    />
                  </BarChart>
                ) : (
                  <BarChart data={filteredYearData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="year"
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    />
                    <YAxis
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      label={{ value: metricLabel, angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8,
                        color: '#f1f5f9',
                        fontSize: 13,
                      }}
                      formatter={(value, name) => {
                        const sk = splitKeys.find(k => k.key === name)
                        return [
                          metric === 'count'
                            ? `${value} projects`
                            : `${Number(value).toLocaleString()} MW`,
                          sk?.label ?? name,
                        ]
                      }}
                    />
                    {splitKeys.map(sk => (
                      <Bar
                        key={sk.key}
                        dataKey={sk.key}
                        stackId="a"
                        fill={sk.color}
                        name={sk.key}
                      />
                    ))}
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
            {/* Legend for stacked */}
            {split !== 'none' && (
              <div className="flex items-center gap-3 mt-3 flex-wrap justify-center">
                {splitKeys.map(sk => (
                  <span key={sk.key} className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)]">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: sk.color }} />
                    {sk.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Cumulative area chart */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">
              Cumulative Growth
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] mb-4">
              Total {metric === 'count' ? 'number of projects' : 'MW capacity'} over time
            </p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulativeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="year"
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <YAxis
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    label={{ value: metricLabel, angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      color: '#f1f5f9',
                      fontSize: 13,
                    }}
                    formatter={(value) => [
                      metric === 'count'
                        ? `${value} total`
                        : `${Number(value).toLocaleString()} MW`,
                      'Cumulative',
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey={metric === 'count' ? 'cumCount' : 'cumCapacity'}
                    stroke="var(--color-primary)"
                    fill="var(--color-primary)"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Key Observations */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-3">Key Observations</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ObservationCard
                filteredYearData={filteredYearData}
                metric={metric}
              />
              <RecentSurgeCard filteredYearData={filteredYearData} metric={metric} />
              <DataCoverageCard data={data} totalFiltered={totalFiltered} />
            </div>
          </div>
        </div>
      ) : (
        /* Table view */
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Year</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider text-right">Projects</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider text-right">Capacity</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Top Technologies</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Top States</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider text-right">Avg MW</th>
                </tr>
              </thead>
              <tbody>
                {filteredYearData.map((entry) => {
                  const count = entry.count as number
                  const cap = entry.capacity_mw as number
                  const ids = entry.projectIds as string[]
                  if (count === 0) return null

                  // Get tech breakdown for this year
                  const techBreakdown = ALL_TECHS
                    .map(t => ({ tech: t, count: (entry[`${t}_count`] as number) || 0 }))
                    .filter(t => t.count > 0)
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 3)

                  const stateBreakdown = ALL_STATES
                    .map(s => ({ state: s, count: (entry[`${s}_count`] as number) || 0 }))
                    .filter(s => s.count > 0)
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 3)

                  return (
                    <tr
                      key={entry.year as number}
                      className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg-elevated)]/50 cursor-pointer transition-colors"
                      onClick={() => navigateToProjects(ids, `Projects first seen in ${entry.year}`)}
                    >
                      <td className="px-4 py-2.5 font-medium text-[var(--color-text)]">
                        {entry.year as number}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-text)]">
                        {count}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-text)]">
                        {cap >= 1000 ? `${(cap / 1000).toFixed(1)} GW` : `${cap} MW`}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1.5 flex-wrap">
                          {techBreakdown.map(t => (
                            <span
                              key={t.tech}
                              className="text-[10px] px-1.5 py-0.5 rounded-full"
                              style={{
                                backgroundColor: `${TECHNOLOGY_CONFIG[t.tech]?.color}15`,
                                color: TECHNOLOGY_CONFIG[t.tech]?.color,
                              }}
                            >
                              {TECHNOLOGY_CONFIG[t.tech]?.icon} {t.count}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1.5 flex-wrap">
                          {stateBreakdown.map(s => (
                            <span
                              key={s.state}
                              className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]"
                            >
                              {s.state} {s.count}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-text-muted)]">
                        {count > 0 ? Math.round(cap / count) : 0}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Helper components
// ============================================================

function ObservationCard({
  filteredYearData,
  metric,
}: {
  filteredYearData: Record<string, unknown>[]
  metric: MetricMode
}) {
  const peak = filteredYearData.reduce<{ year: number; val: number }>(
    (best, entry) => {
      const val = metric === 'count' ? Number(entry.count) : Number(entry.capacity_mw)
      return val > best.val ? { year: Number(entry.year), val } : best
    },
    { year: 0, val: 0 }
  )

  return (
    <div className="bg-[var(--color-bg-elevated)] rounded-lg p-4">
      <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Peak Year</p>
      <p className="text-2xl font-bold text-[var(--color-primary)]">{peak.year}</p>
      <p className="text-xs text-[var(--color-text-muted)] mt-1">
        {metric === 'count'
          ? `${peak.val} new projects`
          : `${peak.val >= 1000 ? `${(peak.val / 1000).toFixed(1)} GW` : `${peak.val} MW`} added`}
      </p>
    </div>
  )
}

function RecentSurgeCard({
  filteredYearData,
  metric,
}: {
  filteredYearData: Record<string, unknown>[]
  metric: MetricMode
}) {
  const recent3 = filteredYearData.filter(e => (e.year as number) >= 2023 && (e.year as number) <= 2025)
  const earlier3 = filteredYearData.filter(e => (e.year as number) >= 2020 && (e.year as number) <= 2022)

  const recentTotal = recent3.reduce((s: number, e) => s + Number(metric === 'count' ? e.count : e.capacity_mw), 0)
  const earlierTotal = earlier3.reduce((s: number, e) => s + Number(metric === 'count' ? e.count : e.capacity_mw), 0)
  const growth = earlierTotal > 0 ? ((recentTotal - earlierTotal) / earlierTotal * 100) : 0

  return (
    <div className="bg-[var(--color-bg-elevated)] rounded-lg p-4">
      <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Recent Surge</p>
      <p className="text-2xl font-bold" style={{ color: growth > 0 ? '#22c55e' : '#ef4444' }}>
        {growth > 0 ? '+' : ''}{Math.round(growth)}%
      </p>
      <p className="text-xs text-[var(--color-text-muted)] mt-1">
        2023–2025 vs 2020–2022
      </p>
    </div>
  )
}

function DataCoverageCard({
  data,
  totalFiltered,
}: {
  data: ProjectTimelineData
  totalFiltered: number
}) {
  const coverage = totalFiltered > 0
    ? Math.round((data.total_with_date / (data.total_with_date + data.total_without_date)) * 100)
    : 0

  return (
    <div className="bg-[var(--color-bg-elevated)] rounded-lg p-4">
      <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Data Coverage</p>
      <p className="text-2xl font-bold text-[var(--color-text)]">{coverage}%</p>
      <p className="text-xs text-[var(--color-text-muted)] mt-1">
        {data.total_with_date} of {data.total_with_date + data.total_without_date} projects have dates
      </p>
    </div>
  )
}
