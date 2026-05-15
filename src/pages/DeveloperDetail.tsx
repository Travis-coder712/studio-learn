import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { useDeveloper } from '../hooks/useDeveloperData'
import { useProjectIndex } from '../hooks/useProjectData'
import { fetchDeveloperAnalytics, fetchDeveloperScores } from '../lib/dataService'
import { TECHNOLOGY_CONFIG, STATUS_CONFIG } from '../lib/types'
import type {
  Technology,
  ProjectStatus,
  ProjectSummary,
  ScoredDeveloper,
} from '../lib/types'
import ProjectCard from '../components/common/ProjectCard'
import DataProvenance from '../components/common/DataProvenance'
import DataTable from '../components/common/DataTable'
import ChartFrame from '../components/common/ChartFrame'

// ---------------------------------------------------------------
// Types for the analytics feed (developer-analytics.json)
// ---------------------------------------------------------------

type EquipmentRole = 'wind_oem' | 'solar_oem' | 'bess_oem' | 'hydro_oem' | 'inverter' | 'epc' | 'bop'

interface EquipmentRow {
  role: EquipmentRole
  supplier: string
  projects: number
  mw: number
}

interface CODDriftRow {
  id: string
  name: string
  technology: string
  state: string
  status: string
  capacity_mw: number
  cod_current: string | null
  cod_original: string | null
  drift_months: number | null
}

interface SchemeWinRow {
  scheme: string
  round: string
  project_id: string
  project_name: string
  technology: string
  state: string
  capacity_mw: number
  storage_mwh: number | null
  contract_type: string
  source_url: string | null
}

interface FleetProjectRow {
  project_id: string
  project_name: string
  technology: string
  quartile: number
  composite_score: number
  capacity_factor_pct: number | null
  year: number
}

interface FleetPerformance {
  ranked_projects: number
  avg_cf: number
  avg_composite: number
  q1_pct: number
  quartile_counts: Record<string, number>
  meaningful: boolean
  projects: FleetProjectRow[]
}

interface OfftakeRow {
  counterparty: string
  offtake_type: string
  project_id: string
  project_name: string
  technology: string
  state: string
  term_years: number | null
  offtake_mw: number | null
  source_url: string | null
}

interface DeveloperAnalytics {
  equipment_preferences?: Record<string, EquipmentRow[]>
  cod_drift?: Record<string, CODDriftRow[]>
  scheme_wins?: Record<string, SchemeWinRow[]>
  fleet_performance?: Record<string, FleetPerformance>
  offtake_counterparties?: Record<string, OfftakeRow[]>
}

// ---------------------------------------------------------------
// Constants
// ---------------------------------------------------------------

const OEM_ROLES: EquipmentRole[] = ['wind_oem', 'solar_oem', 'bess_oem', 'hydro_oem', 'inverter']
const CONTRACTOR_ROLES: EquipmentRole[] = ['epc', 'bop']

const ROLE_LABEL: Record<EquipmentRole, string> = {
  wind_oem: 'Wind OEM',
  solar_oem: 'Solar OEM',
  bess_oem: 'BESS OEM',
  hydro_oem: 'Hydro OEM',
  inverter: 'Inverter',
  epc: 'EPC',
  bop: 'BoP',
}

// Colour lookup for scheme chips
const SCHEME_COLOURS: Record<string, { bg: string; fg: string; border: string }> = {
  CIS: { bg: 'bg-violet-500/15', fg: 'text-violet-300', border: 'border-violet-500/30' },
  'NSW LTESA': { bg: 'bg-blue-500/15', fg: 'text-blue-300', border: 'border-blue-500/30' },
  ARENA: { bg: 'bg-emerald-500/15', fg: 'text-emerald-300', border: 'border-emerald-500/30' },
  'QLD RE&H Jobs Fund': { bg: 'bg-orange-500/15', fg: 'text-orange-300', border: 'border-orange-500/30' },
  'NSW SIPS': { bg: 'bg-teal-500/15', fg: 'text-teal-300', border: 'border-teal-500/30' },
  'VIC SIPS': { bg: 'bg-red-500/15', fg: 'text-red-300', border: 'border-red-500/30' },
  NAIF: { bg: 'bg-amber-500/15', fg: 'text-amber-300', border: 'border-amber-500/30' },
}
const DEFAULT_SCHEME_COLOUR = { bg: 'bg-slate-500/15', fg: 'text-slate-300', border: 'border-slate-500/30' }

const GRADE_STYLE: Record<string, string> = {
  A: 'bg-emerald-500/15 text-emerald-400',
  B: 'bg-blue-500/15 text-blue-400',
  C: 'bg-amber-500/15 text-amber-400',
  D: 'bg-amber-500/15 text-amber-400',
  F: 'bg-red-500/15 text-red-400',
}

const STATUS_ORDER: ProjectStatus[] = [
  'development',
  'construction',
  'commissioning',
  'operating',
]

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function formatMw(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return value >= 1000
    ? `${(value / 1000).toFixed(1)} GW`
    : `${Math.round(value)} MW`
}

function techColour(tech: string | undefined): string {
  const config = tech ? TECHNOLOGY_CONFIG[tech as Technology] : undefined
  return config?.color ?? '#6b7280'
}

function techLabel(tech: string | undefined): string {
  const config = tech ? TECHNOLOGY_CONFIG[tech as Technology] : undefined
  return config?.label ?? (tech ?? '—')
}

function parseYear(cod: string | null | undefined): number | null {
  if (!cod) return null
  const match = String(cod).match(/\d{4}/)
  return match ? parseInt(match[0], 10) : null
}

// ---------------------------------------------------------------
// Component
// ---------------------------------------------------------------

export default function DeveloperDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { developer, loading: devLoading } = useDeveloper(slug)
  const { projects: allProjects, loading: projLoading } = useProjectIndex()

  const [analytics, setAnalytics] = useState<DeveloperAnalytics | null>(null)
  const [scores, setScores] = useState<ScoredDeveloper[] | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchDeveloperAnalytics(), fetchDeveloperScores()])
      .then(([a, s]) => {
        if (cancelled) return
        setAnalytics((a as DeveloperAnalytics | null) ?? null)
        setScores(s?.developers ?? null)
      })
      .finally(() => {
        if (!cancelled) setAnalyticsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Merge analytics across the developer's primary name and any aliases.
  const aliasKeys = useMemo<string[]>(() => {
    if (!developer) return []
    return [developer.name, ...(developer.aliases ?? [])]
  }, [developer])

  const equipment = useMemo<EquipmentRow[]>(() => {
    if (!analytics?.equipment_preferences) return []
    return aliasKeys.flatMap((k) => analytics.equipment_preferences?.[k] ?? [])
  }, [analytics, aliasKeys])

  const codDrift = useMemo<CODDriftRow[]>(() => {
    if (!analytics?.cod_drift) return []
    return aliasKeys.flatMap((k) => analytics.cod_drift?.[k] ?? [])
  }, [analytics, aliasKeys])

  const schemeWins = useMemo<SchemeWinRow[]>(() => {
    if (!analytics?.scheme_wins) return []
    return aliasKeys.flatMap((k) => analytics.scheme_wins?.[k] ?? [])
  }, [analytics, aliasKeys])

  const offtakes = useMemo<OfftakeRow[]>(() => {
    if (!analytics?.offtake_counterparties) return []
    return aliasKeys.flatMap((k) => analytics.offtake_counterparties?.[k] ?? [])
  }, [analytics, aliasKeys])

  // Fleet performance is not additive — pick the first alias that has
  // a meaningful entry, otherwise the first alias that has any entry.
  const fleet = useMemo<FleetPerformance | null>(() => {
    if (!analytics?.fleet_performance) return null
    for (const k of aliasKeys) {
      const entry = analytics.fleet_performance[k]
      if (entry?.meaningful) return entry
    }
    for (const k of aliasKeys) {
      const entry = analytics.fleet_performance[k]
      if (entry) return entry
    }
    return null
  }, [analytics, aliasKeys])

  // Developer score — match on raw name in developer-scores.json
  const score = useMemo<ScoredDeveloper | null>(() => {
    if (!scores || !developer) return null
    for (const k of aliasKeys) {
      const s = scores.find((row) => row.developer === k)
      if (s) return s
    }
    return null
  }, [scores, developer, aliasKeys])

  const loading = devLoading || projLoading

  if (loading) {
    return (
      <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-[var(--color-bg-card)] rounded w-64" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-[var(--color-bg-card)] rounded-xl h-24" />
            ))}
          </div>
          <div className="bg-[var(--color-bg-card)] rounded-xl h-60" />
        </div>
      </div>
    )
  }

  if (!developer) {
    return (
      <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto text-center py-20">
        <p className="text-lg text-[var(--color-text-muted)]">Developer not found</p>
        <Link to="/developers" className="mt-2 text-sm text-[var(--color-primary)] hover:underline inline-block">
          Back to developers
        </Link>
      </div>
    )
  }

  // Full project summaries for this developer.
  const projects = developer.project_ids
    .map((id) => allProjects.find((p) => p.id === id))
    .filter((p): p is ProjectSummary => !!p)
    .sort((a, b) => b.capacity_mw - a.capacity_mw)

  // Tech mix chart data
  const techData = Object.entries(developer.by_technology)
    .map(([tech, count]) => ({
      tech: tech as Technology,
      label: techLabel(tech),
      count: count as number,
      color: techColour(tech),
      capacity: projects
        .filter((p) => p.technology === tech)
        .reduce((s, p) => s + p.capacity_mw, 0),
    }))
    .sort((a, b) => b.capacity - a.capacity)

  // Pipeline waterfall — one card per stage that appears in by_status
  const waterfallStages = STATUS_ORDER.map((status) => {
    const config = STATUS_CONFIG[status]
    const stageProjects = projects.filter((p) => p.status === status)
    const count = stageProjects.length
    const mw = stageProjects.reduce((s, p) => s + p.capacity_mw, 0)
    return {
      status,
      label: config.label,
      color: config.color,
      count,
      mw,
    }
  }).filter((s) => s.count > 0)

  const operatingMw = projects
    .filter((p) => p.status === 'operating' || p.status === 'commissioning')
    .reduce((s, p) => s + p.capacity_mw, 0)

  // Equipment tables
  const oemRows = equipment
    .filter((r) => OEM_ROLES.includes(r.role))
    .sort((a, b) => b.projects - a.projects || b.mw - a.mw)
  const contractorRows = equipment
    .filter((r) => CONTRACTOR_ROLES.includes(r.role))
    .sort((a, b) => b.projects - a.projects || b.mw - a.mw)
  const showEquipment = equipment.length >= 3

  // COD drift table
  const codDriftRows = codDrift
    .map((row) => ({
      ...row,
      cod_original_year: parseYear(row.cod_original),
      cod_current_year: parseYear(row.cod_current),
    }))
    .sort((a, b) => (a.cod_current_year ?? 9999) - (b.cod_current_year ?? 9999))

  // Quartile distribution for fleet chart
  const quartileData = fleet
    ? ([1, 2, 3, 4].map((q) => ({
        quartile: `Q${q}`,
        count: fleet.quartile_counts?.[String(q)] ?? 0,
        color: q === 1 ? '#10b981' : q === 2 ? '#3b82f6' : q === 3 ? '#f59e0b' : '#ef4444',
      })))
    : []

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <div className="text-xs text-[var(--color-text-muted)]">
        <Link to="/developers" className="hover:text-[var(--color-text)] transition-colors">
          Developers
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-[var(--color-text)]">{developer.name}</span>
      </div>

      {/* Header */}
      <section>
        <h1 className="text-2xl lg:text-3xl font-bold text-[var(--color-text)] mb-1">
          {developer.name}
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          {developer.project_count} projects across {developer.states.join(', ')}
        </p>
        {developer.aliases && developer.aliases.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {developer.aliases.map((alias) => (
              <span
                key={alias}
                className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] border border-[var(--color-border)]"
              >
                {alias}
              </span>
            ))}
          </div>
        )}
        <div className="mt-3">
          <DataProvenance page="developer-detail" />
        </div>
      </section>

      {/* Stat Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Capacity"
          value={formatMw(developer.total_capacity_mw)}
          color="var(--color-primary)"
        />
        <StatCard
          label="Operating"
          value={formatMw(operatingMw)}
          color="#22c55e"
        />
        <StatCard
          label="Projects"
          value={developer.project_count}
          sublabel={`${Object.keys(developer.by_technology).length} technologies`}
        />
        {developer.total_storage_mwh > 0 && (
          <StatCard
            label="Storage"
            value={developer.total_storage_mwh >= 1000
              ? `${(developer.total_storage_mwh / 1000).toFixed(1)} GWh`
              : `${Math.round(developer.total_storage_mwh)} MWh`}
            color="#8b5cf6"
          />
        )}
      </section>

      {/* Section 1 — Execution Scorecard */}
      {score && (
        <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-3">
            Execution Scorecard
          </h2>
          <div className="flex flex-col lg:flex-row gap-5 items-start lg:items-center">
            <div
              className={`shrink-0 flex flex-col items-center justify-center rounded-xl px-5 py-4 ${GRADE_STYLE[score.grade] ?? GRADE_STYLE.F}`}
            >
              <span className="text-5xl font-bold leading-none">{score.grade}</span>
              <span className="text-[10px] uppercase tracking-wider mt-1.5 opacity-80">
                Execution Grade
              </span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-1 w-full">
              <MiniStat
                label="On-time delivery"
                value={`${score.on_time_pct.toFixed(0)}%`}
              />
              <MiniStat
                label="Avg drift"
                value={`${score.avg_drift_months.toFixed(1)} mo`}
              />
              <MiniStat
                label="Completion rate"
                value={`${score.completion_rate.toFixed(0)}%`}
              />
              <MiniStat
                label="Score"
                value={`${score.execution_score}/100`}
              />
            </div>
          </div>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-4 leading-snug">
            Based on delivery timing relative to original COD across the developer's historical pipeline.
          </p>
        </section>
      )}

      {/* Section 2 — Scheme Wins */}
      {schemeWins.length > 0 && (
        <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">
            Scheme Wins
          </h2>
          <p className="text-[11px] text-[var(--color-text-muted)] mb-3">
            {schemeWins.length} contract{schemeWins.length === 1 ? '' : 's'} awarded across underwriting schemes.
          </p>
          <div className="flex flex-wrap gap-2">
            {schemeWins.map((win, i) => {
              const colour = SCHEME_COLOURS[win.scheme] ?? DEFAULT_SCHEME_COLOUR
              const label = win.round ? `${win.scheme} · ${win.round}` : win.scheme
              return (
                <Link
                  key={`${win.project_id}-${win.scheme}-${win.round}-${i}`}
                  to={`/projects/${win.project_id}`}
                  title={win.project_name}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium hover:brightness-125 transition-all ${colour.bg} ${colour.fg} ${colour.border}`}
                >
                  {label}
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Section 3 — Pipeline Waterfall */}
      {waterfallStages.length > 0 && (
        <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">
            Pipeline Waterfall
          </h2>
          <div className="flex flex-wrap items-stretch gap-2">
            {waterfallStages.map((stage, idx) => (
              <div key={stage.status} className="flex items-center gap-2 flex-1 min-w-[140px]">
                <div
                  className="flex-1 rounded-lg border px-3 py-3"
                  style={{
                    backgroundColor: `${stage.color}15`,
                    borderColor: `${stage.color}40`,
                  }}
                >
                  <p
                    className="text-[10px] uppercase tracking-wider font-medium"
                    style={{ color: stage.color }}
                  >
                    {stage.label}
                  </p>
                  <p className="text-2xl font-bold text-[var(--color-text)] mt-0.5 tabular-nums">
                    {stage.count}
                  </p>
                  <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
                    {formatMw(stage.mw)}
                  </p>
                </div>
                {idx < waterfallStages.length - 1 && (
                  <span
                    className="text-[var(--color-text-muted)]/50 text-lg"
                    aria-hidden
                  >
                    →
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section 4 — Portfolio Timeline (COD drift table) */}
      {codDriftRows.length > 0 && (
        <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">
            Portfolio Timeline
          </h2>
          <p className="text-[11px] text-[var(--color-text-muted)] mb-3">
            COD schedule and drift against original commissioning targets.
          </p>
          <DataTable
            rows={codDriftRows}
            columns={[
              {
                key: 'name',
                label: 'Project',
                render: (_v, row) => (
                  <Link
                    to={`/projects/${row.id}`}
                    className="text-[var(--color-primary)] hover:underline"
                  >
                    {row.name}
                  </Link>
                ),
              },
              {
                key: 'technology',
                label: 'Tech',
                render: (v) => (
                  <span style={{ color: techColour(v as string) }}>{techLabel(v as string)}</span>
                ),
              },
              { key: 'state', label: 'State', hideOnMobile: true },
              {
                key: 'capacity_mw',
                label: 'MW',
                format: 'number0',
                aggregator: 'sum',
              },
              {
                key: 'cod_original_year',
                label: 'Original COD',
                align: 'right',
                render: (v) => (v == null ? '—' : String(v)),
              },
              {
                key: 'cod_current_year',
                label: 'Current COD',
                align: 'right',
                render: (v) => (v == null ? '—' : String(v)),
              },
              {
                key: 'drift_months',
                label: 'Drift (mo)',
                format: 'number1',
                align: 'right',
                render: (v) => {
                  if (v == null) return '—'
                  const n = Number(v)
                  const colour = n > 12 ? '#ef4444' : n > 0 ? '#f59e0b' : '#22c55e'
                  return (
                    <span style={{ color: colour }} className="tabular-nums">
                      {n > 0 ? '+' : ''}
                      {n.toFixed(1)}
                    </span>
                  )
                },
              },
              {
                key: 'status',
                label: 'Status',
                hideOnMobile: true,
                render: (v) => {
                  const config = STATUS_CONFIG[v as ProjectStatus]
                  return config ? (
                    <span style={{ color: config.color }}>{config.label}</span>
                  ) : (
                    (v as string)
                  )
                },
              },
            ]}
            showRowNumbers
            showTotals
            csvFilename={`${developer.slug}-cod-drift`}
            defaultSort={{ key: 'cod_current_year', dir: 'asc' }}
          />
        </section>
      )}

      {/* Section 5 — Equipment Preferences */}
      {showEquipment && (
        <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">
            Equipment Preferences
          </h2>
          <p className="text-[11px] text-[var(--color-text-muted)] mb-4">
            Typical supplier relationships across this developer's portfolio.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-[var(--color-text)] mb-2">Go-to OEMs</h3>
              {oemRows.length > 0 ? (
                <DataTable
                  rows={oemRows}
                  columns={[
                    {
                      key: 'role',
                      label: 'Role',
                      render: (v) => ROLE_LABEL[v as EquipmentRole] ?? (v as string),
                    },
                    { key: 'supplier', label: 'Supplier' },
                    { key: 'projects', label: 'Projects', format: 'number0', aggregator: 'sum' },
                    { key: 'mw', label: 'MW', format: 'number0', aggregator: 'sum' },
                  ]}
                  showRowNumbers
                  showTotals
                  defaultSort={{ key: 'projects', dir: 'desc' }}
                  csvFilename={`${developer.slug}-oems`}
                />
              ) : (
                <p className="text-xs text-[var(--color-text-muted)]">No OEM data.</p>
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-[var(--color-text)] mb-2">Go-to Contractors</h3>
              {contractorRows.length > 0 ? (
                <DataTable
                  rows={contractorRows}
                  columns={[
                    {
                      key: 'role',
                      label: 'Role',
                      render: (v) => ROLE_LABEL[v as EquipmentRole] ?? (v as string),
                    },
                    { key: 'supplier', label: 'Supplier' },
                    { key: 'projects', label: 'Projects', format: 'number0', aggregator: 'sum' },
                    { key: 'mw', label: 'MW', format: 'number0', aggregator: 'sum' },
                  ]}
                  showRowNumbers
                  showTotals
                  defaultSort={{ key: 'projects', dir: 'desc' }}
                  csvFilename={`${developer.slug}-contractors`}
                />
              ) : (
                <p className="text-xs text-[var(--color-text-muted)]">No contractor data.</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Section 6 — Operating Fleet Performance */}
      {fleet && fleet.meaningful && (
        <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">
            Operating Fleet Performance
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <MiniStat label="Ranked projects" value={String(fleet.ranked_projects)} />
            <MiniStat label="Avg composite" value={fleet.avg_composite.toFixed(1)} />
            <MiniStat label="Avg capacity factor" value={`${fleet.avg_cf.toFixed(1)}%`} />
            <MiniStat label="Q1 share" value={`${fleet.q1_pct.toFixed(0)}%`} />
          </div>
          <div className="mb-5">
            <ChartFrame
              title="Quartile distribution"
              height={200}
              data={quartileData}
              csvColumns={['quartile', 'count']}
            >
              <BarChart data={quartileData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="quartile"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <YAxis
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    color: '#f1f5f9',
                    fontSize: 13,
                  }}
                  formatter={(value) => `${Number(value)} projects`}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {quartileData.map((entry) => (
                    <Cell key={entry.quartile} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ChartFrame>
          </div>
          <DataTable
            rows={fleet.projects}
            columns={[
              {
                key: 'project_name',
                label: 'Project',
                render: (_v, row) => (
                  <Link
                    to={`/projects/${row.project_id}`}
                    className="text-[var(--color-primary)] hover:underline"
                  >
                    {row.project_name}
                  </Link>
                ),
              },
              {
                key: 'technology',
                label: 'Tech',
                render: (v) => (
                  <span style={{ color: techColour(v as string) }}>{techLabel(v as string)}</span>
                ),
              },
              {
                key: 'quartile',
                label: 'Quartile',
                align: 'center',
                render: (v) => {
                  const q = Number(v)
                  const colour = q === 1 ? '#10b981' : q === 2 ? '#3b82f6' : q === 3 ? '#f59e0b' : '#ef4444'
                  return (
                    <span
                      className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium"
                      style={{ backgroundColor: `${colour}20`, color: colour }}
                    >
                      Q{q}
                    </span>
                  )
                },
              },
              { key: 'composite_score', label: 'Composite', format: 'number1', aggregator: 'avg' },
              { key: 'capacity_factor_pct', label: 'CF%', format: 'percent1', aggregator: 'avg' },
              { key: 'year', label: 'Year', align: 'right' },
            ]}
            showRowNumbers
            showTotals
            defaultSort={{ key: 'composite_score', dir: 'desc' }}
            csvFilename={`${developer.slug}-fleet-performance`}
          />
        </section>
      )}

      {/* Sparse-data note when fleet present but not meaningful */}
      {fleet && !fleet.meaningful && fleet.ranked_projects >= 1 && (
        <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
          <p className="text-sm text-[var(--color-text-muted)]">
            {fleet.ranked_projects} project{fleet.ranked_projects === 1 ? '' : 's'} have performance data; ≥3 required for a quartile view. See individual project performance tabs for detail.
          </p>
        </section>
      )}

      {/* Offtake counterparties — summary + cross-link only. Full analysis lives on /offtakers. */}
      {offtakes.length > 0 && (
        <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">
                Offtake Counterparties
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                {offtakes.length} offtake{offtakes.length !== 1 ? 's' : ''} across{' '}
                {new Set(offtakes.map((o) => o.counterparty)).size} counterparties on{' '}
                {new Set(offtakes.map((o) => o.project_id)).size} projects.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {Array.from(new Set(offtakes.map((o) => o.counterparty)))
                  .slice(0, 10)
                  .map((cp) => (
                    <span
                      key={cp}
                      className="text-[11px] px-2 py-0.5 rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)]"
                    >
                      {cp}
                    </span>
                  ))}
              </div>
            </div>
            <Link
              to="/offtakers"
              className="shrink-0 inline-flex items-center gap-1.5 text-xs text-[var(--color-primary)] hover:underline self-start whitespace-nowrap"
            >
              PPA Market Mapper →
            </Link>
          </div>
        </section>
      )}

      {/* Section 8 — Tech capacity bar chart (existing) */}
      {techData.length > 1 && (
        <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">
            Capacity by Technology
          </h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={techData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <YAxis
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  label={{
                    value: 'MW',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#6b7280',
                    fontSize: 12,
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    color: '#f1f5f9',
                    fontSize: 13,
                  }}
                  formatter={(value) => `${Number(value).toLocaleString()} MW`}
                />
                <Bar dataKey="capacity" radius={[4, 4, 0, 0]}>
                  {techData.map((entry) => (
                    <Cell key={entry.tech} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Full project list */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">
          Full project list ({projects.length})
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </section>

      {analyticsLoading && (
        <p className="text-center text-xs text-[var(--color-text-muted)]/60 py-2">
          Loading analytics…
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------

function StatCard({
  label,
  value,
  color,
  sublabel,
}: {
  label: string
  value: string | number
  color?: string
  sublabel?: string
}) {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
      <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
        {label}
      </p>
      <p className="text-xl lg:text-2xl font-bold" style={{ color: color || 'var(--color-text)' }}>
        {value}
      </p>
      {sublabel && (
        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{sublabel}</p>
      )}
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-0.5">
        {label}
      </p>
      <p className="text-lg font-semibold text-[var(--color-text)] tabular-nums">{value}</p>
    </div>
  )
}
