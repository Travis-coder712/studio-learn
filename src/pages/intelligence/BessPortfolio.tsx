import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  Legend,
  PieChart,
  Pie,
  ComposedChart,
  Area,
} from 'recharts'
import DataProvenance from '../../components/common/DataProvenance'
import DataTable from '../../components/common/DataTable'
import ChartFrame from '../../components/common/ChartFrame'
import { fetchBessPortfolio, fetchBatteryLiveRecords } from '../../lib/dataService'
import { STATUS_CONFIG, type ProjectStatus } from '../../lib/types'

// =====================================================================
// Types (loose — exported JSON shape)
// =====================================================================

type DurationBucketKey = '<1h' | '1-2h' | '2-4h' | '4-8h' | '8h+'
const BUCKET_ORDER: DurationBucketKey[] = ['<1h', '1-2h', '2-4h', '4-8h', '8h+']
const BUCKET_COLOR: Record<DurationBucketKey, string> = {
  '<1h': '#dc2626',
  '1-2h': '#f59e0b',
  '2-4h': '#eab308',
  '4-8h': '#84cc16',
  '8h+': '#10b981',
}

type StatusKey = 'operating' | 'construction' | 'commissioning' | 'development'
const STATUS_ORDER: StatusKey[] = ['operating', 'commissioning', 'construction', 'development']

interface BessSummary {
  total_bess: number
  total_with_storage: number
  total_operating: number
  total_hybrid: number
  total_hybrid_operating: number
  grid_forming_count: number
  grid_forming_pct: number
  chemistry_verified_count: number
  chemistry_coverage_pct: number
  pcs_type_counts: Record<string, number>
  network_service_contracts: number
}

interface DurationBlock {
  buckets: Record<string, number>
  count: number
  avg: number | null
  median: number | null
  max: number | null
  min: number | null
}

interface EvolutionRow {
  year: number
  count: number
  avg_duration_h: number | null
  median_duration_h: number | null
  max_duration_h: number | null
  total_mw: number | null
  total_mwh: number | null
}

interface BessProjectRow {
  project_id: string
  name: string
  state: string
  status: string
  capacity_mw: number | null
  storage_mwh: number | null
  duration_h: number | null
  developer: string | null
  operator?: string | null
  cod?: string | null
}

interface ChemistryProjectRow extends BessProjectRow {
  chemistry: string | null
  chemistry_full: string | null
  cell_supplier: string | null
  cell_country: string | null
  inverter_supplier: string | null
  inverter_model: string | null
  pcs_type: string | null
  rte_pct: number | null
}

interface ChemistryBreakdown {
  project_count: number
  total_mw: number
  top_oems: Array<[string, number]>
}

interface NetworkServiceSource {
  url?: string | null
  title?: string | null
  accessed?: string | null
  legacy?: boolean | null
}

interface NetworkServiceRow {
  offtake_id: number | string
  project_id: string
  name: string
  state: string
  status: string
  capacity_mw: number | null
  storage_mwh: number | null
  duration_h: number | null
  developer: string | null
  contract_party: string | null
  contract_type: string | null
  contracted_mw: number | null
  term_years: number | null
  price_structure: string | null
  price_notes: string | null
  start_date: string | null
  end_date: string | null
  tenor_description: string | null
  volume_structure: string | null
  sources: NetworkServiceSource[] | null
  data_confidence: string | null
}

interface BessPortfolioData {
  summary: BessSummary
  duration_distribution: Record<StatusKey, DurationBlock>
  duration_evolution: EvolutionRow[]
  grid_forming: BessProjectRow[]
  co_located: BessProjectRow[]
  chemistry_breakdown: Record<string, ChemistryBreakdown>
  chemistry_projects: ChemistryProjectRow[]
  network_services: NetworkServiceRow[]
  exported_at?: string
}

// =====================================================================
// Tabs
// =====================================================================

type TabId = 'overview' | 'duration' | 'grid-forming' | 'co-located' | 'chemistry' | 'network-services' | 'live-records'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'duration', label: 'Duration' },
  { id: 'grid-forming', label: 'Grid-Forming' },
  { id: 'co-located', label: 'Co-located' },
  { id: 'chemistry', label: 'Chemistry' },
  { id: 'network-services', label: 'Network Services' },
  { id: 'live-records', label: 'Live & Records' },
]

// =====================================================================
// Helpers
// =====================================================================

const CHEM_COLOR: Record<string, string> = {
  LFP: '#10b981',
  NMC: '#f59e0b',
}

const PCS_COLOR: Record<string, { bg: string; fg: string; label: string }> = {
  grid_forming: { bg: 'rgba(59,130,246,0.18)', fg: '#3b82f6', label: 'Grid-forming' },
  grid_following: { bg: 'rgba(148,163,184,0.18)', fg: '#94a3b8', label: 'Grid-following' },
  both: { bg: 'rgba(139,92,246,0.18)', fg: '#8b5cf6', label: 'Both' },
}

const CONTRACT_TYPE_COLOR: Record<string, { bg: string; fg: string; label: string }> = {
  SIPS: { bg: 'rgba(239,68,68,0.18)', fg: '#ef4444', label: 'SIPS' },
  sips: { bg: 'rgba(239,68,68,0.18)', fg: '#ef4444', label: 'SIPS' },
  FCAS: { bg: 'rgba(139,92,246,0.18)', fg: '#8b5cf6', label: 'FCAS' },
  fcas: { bg: 'rgba(139,92,246,0.18)', fg: '#8b5cf6', label: 'FCAS' },
  tolling: { bg: 'rgba(245,158,11,0.18)', fg: '#f59e0b', label: 'Tolling' },
  availability: { bg: 'rgba(59,130,246,0.18)', fg: '#3b82f6', label: 'Availability' },
}

const CONFIDENCE_PILL: Record<string, { label: string; bg: string; fg: string }> = {
  high: { label: 'High', bg: 'rgba(16,185,129,0.18)', fg: '#10b981' },
  medium: { label: 'Medium', bg: 'rgba(59,130,246,0.18)', fg: '#3b82f6' },
  low: { label: 'Low', bg: 'rgba(245,158,11,0.18)', fg: '#f59e0b' },
  inferred: { label: 'Inferred', bg: 'rgba(107,114,128,0.25)', fg: '#9ca3af' },
}

function truncate(s: string | null | undefined, n: number): string {
  if (!s) return '—'
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

function formatDateShort(iso: string | null): string | null {
  if (!iso) return null
  // YYYY-MM-DD → YYYY-MM
  const m = iso.match(/^(\d{4})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}`
  return iso
}

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as ProjectStatus]
  if (!cfg) return <span className="text-xs text-[var(--color-text-muted)]">{status}</span>
  return (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap"
      style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}
    >
      {cfg.label}
    </span>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        {label}
      </div>
      <div className="text-xl font-bold mt-1 text-[var(--color-text)]">{value}</div>
      {sub && <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{sub}</div>}
    </div>
  )
}

// =====================================================================
// Main component
// =====================================================================

export default function BessPortfolio() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [data, setData] = useState<BessPortfolioData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBessPortfolio()
      .then((d) => setData(d as BessPortfolioData | null))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  const tab = (searchParams.get('tab') as TabId) || 'overview'

  function setTab(next: TabId) {
    const sp = new URLSearchParams(searchParams)
    if (next === 'overview') sp.delete('tab')
    else sp.set('tab', next)
    setSearchParams(sp)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60dvh]">
        <div className="text-sm text-[var(--color-text-muted)] animate-pulse">Loading BESS portfolio…</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto">
        <h1 className="text-xl lg:text-2xl font-bold text-[var(--color-text)] mb-2">BESS Portfolio Intelligence</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Portfolio data not available. Run the exporter and refresh.
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-[var(--color-text)] mb-1">
          BESS Portfolio Intelligence
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Duration trends, grid-forming coverage, co-located projects, cell chemistry, and network service
          contracts across the Australian battery fleet.
        </p>
        <div className="mt-3">
          <DataProvenance page="bess-portfolio" />
        </div>
      </div>

      {/* Tab strip */}
      <div className="mb-6 flex gap-2 flex-wrap border-b border-[var(--color-border)] pb-3">
        {TABS.map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                active
                  ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/40 text-[var(--color-primary)] font-medium'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'overview' && <OverviewTab data={data} />}
      {tab === 'duration' && <DurationTab data={data} />}
      {tab === 'grid-forming' && <GridFormingTab data={data} />}
      {tab === 'co-located' && <CoLocatedTab data={data} />}
      {tab === 'chemistry' && <ChemistryTab data={data} />}
      {tab === 'network-services' && <NetworkServicesTab data={data} />}
      {tab === 'live-records' && <LiveAndRecordsTab />}
    </div>
  )
}

// =====================================================================
// Overview tab
// =====================================================================

function OverviewTab({ data }: { data: BessPortfolioData }) {
  const { summary, duration_evolution, chemistry_breakdown } = data

  const evolutionRows = useMemo(
    () => duration_evolution.filter((r) => r.avg_duration_h != null),
    [duration_evolution],
  )

  const chemistryRows = useMemo(
    () =>
      Object.entries(chemistry_breakdown)
        .map(([name, v]) => ({ name, project_count: v.project_count, total_mw: v.total_mw }))
        .sort((a, b) => b.project_count - a.project_count),
    [chemistry_breakdown],
  )

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total BESS" value={`${summary.total_bess}`} sub={`${summary.total_with_storage} with MWh data`} />
        <StatCard label="Operating" value={`${summary.total_operating}`} sub="currently commissioned" />
        <StatCard
          label="Grid-forming"
          value={`${summary.grid_forming_count}`}
          sub={`${summary.grid_forming_pct.toFixed(1)}% of fleet`}
        />
        <StatCard
          label="Chemistry verified"
          value={`${summary.chemistry_verified_count}`}
          sub={`${summary.chemistry_coverage_pct.toFixed(1)}% coverage`}
        />
      </div>

      {/* Duration evolution */}
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Duration is doubling</h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Fleet duration: 2h → 4h transition. Average and median storage duration by COD year.
          </p>
        </div>
        <ChartFrame
          title="BESS duration evolution"
          height={300}
          data={evolutionRows}
          csvFilename="bess-duration-evolution"
          csvColumns={['year', 'count', 'avg_duration_h', 'median_duration_h', 'total_mw', 'total_mwh']}
        >
          <LineChart data={evolutionRows} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="year" stroke="#9ca3af" fontSize={11} />
            <YAxis
              stroke="#9ca3af"
              fontSize={11}
              label={{ value: 'Duration (h)', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: '#f1f5f9',
                fontSize: 12,
              }}
              formatter={(value) => (typeof value === 'number' ? `${value.toFixed(2)} h` : value)}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="avg_duration_h"
              name="Avg duration"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="median_duration_h"
              name="Median"
              stroke="#60a5fa"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ r: 2 }}
            />
          </LineChart>
        </ChartFrame>
      </section>

      {/* Chemistry dominance */}
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">LFP dominates</h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Project count by cell chemistry — EIS-verified operating/committed BESS only.
          </p>
        </div>
        <ChartFrame
          title="BESS cell chemistry split"
          height={180}
          data={chemistryRows}
          csvFilename="bess-chemistry-split"
          csvColumns={['name', 'project_count', 'total_mw']}
        >
          <BarChart data={chemistryRows} layout="vertical" margin={{ top: 10, right: 30, bottom: 10, left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis type="number" stroke="#9ca3af" fontSize={11} />
            <YAxis type="category" dataKey="name" stroke="#9ca3af" fontSize={12} width={50} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: '#f1f5f9',
                fontSize: 12,
              }}
              formatter={(value) => [`${value} projects`, 'Count']}
            />
            <Bar dataKey="project_count" radius={[0, 4, 4, 0]}>
              {chemistryRows.map((d, i) => (
                <Cell key={i} fill={CHEM_COLOR[d.name] ?? '#6b7280'} />
              ))}
            </Bar>
          </BarChart>
        </ChartFrame>
      </section>

      {/* GFM summary line */}
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-1">Grid-forming coverage</h3>
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
          {summary.grid_forming_count} grid-forming projects out of {summary.total_bess} BESS —{' '}
          {summary.grid_forming_pct.toFixed(1)}% of the fleet, clustered in projects with COD 2024+.
        </p>
      </section>
    </div>
  )
}

// =====================================================================
// Duration tab
// =====================================================================

function DurationTab({ data }: { data: BessPortfolioData }) {
  const { duration_distribution, duration_evolution } = data

  const stackedData = useMemo(() => {
    return STATUS_ORDER.map((status) => {
      const block = duration_distribution[status]
      const row: Record<string, string | number> = { status: STATUS_CONFIG[status]?.label ?? status }
      for (const bk of BUCKET_ORDER) {
        row[bk] = block?.buckets?.[bk] ?? 0
      }
      return row
    })
  }, [duration_distribution])

  const evolutionRows = useMemo(
    () => duration_evolution.filter((r) => r.avg_duration_h != null),
    [duration_evolution],
  )

  const longestRows = useMemo(() => {
    const combined = [...data.grid_forming, ...data.co_located, ...data.chemistry_projects]
    const seen = new Map<string, BessProjectRow>()
    for (const r of combined) {
      if (r.duration_h == null) continue
      const prev = seen.get(r.project_id)
      if (!prev || (prev.duration_h ?? 0) < (r.duration_h ?? 0)) {
        seen.set(r.project_id, r)
      }
    }
    return [...seen.values()].sort((a, b) => (b.duration_h ?? 0) - (a.duration_h ?? 0)).slice(0, 20)
  }, [data])

  return (
    <div className="space-y-6">
      {/* Stacked buckets by status */}
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Duration buckets by status</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Project counts broken down by storage duration across lifecycle stages.
        </p>
        <ChartFrame
          title="Duration buckets by status"
          height={320}
          data={stackedData}
          csvFilename="bess-duration-by-status"
        >
          <BarChart data={stackedData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="status" stroke="#9ca3af" fontSize={11} />
            <YAxis stroke="#9ca3af" fontSize={11} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: '#f1f5f9',
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {BUCKET_ORDER.map((bk) => (
              <Bar key={bk} dataKey={bk} stackId="duration" fill={BUCKET_COLOR[bk]} name={bk} />
            ))}
          </BarChart>
        </ChartFrame>
      </section>

      {/* Summary cards per status */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATUS_ORDER.map((status) => {
          const block = duration_distribution[status]
          const cfg = STATUS_CONFIG[status]
          return (
            <div
              key={status}
              className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: `${cfg?.color ?? '#6b7280'}20`, color: cfg?.color ?? '#6b7280' }}
                >
                  {cfg?.label ?? status}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">{block?.count ?? 0}</span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-xs">
                <div>
                  <div className="text-[var(--color-text-muted)]">Avg</div>
                  <div className="text-[var(--color-text)] font-medium">
                    {block?.avg != null ? `${block.avg.toFixed(2)}h` : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[var(--color-text-muted)]">Median</div>
                  <div className="text-[var(--color-text)] font-medium">
                    {block?.median != null ? `${block.median.toFixed(2)}h` : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[var(--color-text-muted)]">Max</div>
                  <div className="text-[var(--color-text)] font-medium">
                    {block?.max != null ? `${block.max.toFixed(1)}h` : '—'}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Evolution composed chart */}
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Duration evolution by COD year</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Average and median duration overlaid on total MWh committed, by Commercial Operation Date.
        </p>
        <ChartFrame
          title="BESS duration evolution"
          height={320}
          data={evolutionRows}
          csvFilename="bess-duration-evolution-detail"
          csvColumns={['year', 'count', 'avg_duration_h', 'median_duration_h', 'max_duration_h', 'total_mw', 'total_mwh']}
        >
          <ComposedChart data={evolutionRows} margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="year" stroke="#9ca3af" fontSize={11} />
            <YAxis
              yAxisId="left"
              stroke="#9ca3af"
              fontSize={11}
              label={{ value: 'Duration (h)', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 11 }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#64748b"
              fontSize={11}
              label={{ value: 'Total MWh', angle: 90, position: 'insideRight', fill: '#64748b', fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: '#f1f5f9',
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="total_mwh"
              name="Total MWh (area)"
              stroke="#64748b"
              fill="#64748b"
              fillOpacity={0.15}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="avg_duration_h"
              name="Avg duration"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={{ r: 3 }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="median_duration_h"
              name="Median"
              stroke="#60a5fa"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ r: 2 }}
            />
          </ComposedChart>
        </ChartFrame>
      </section>

      {/* Longest duration table */}
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Top 20 by duration</h2>
        <DataTable
          rows={longestRows}
          columns={[
            {
              key: 'name',
              label: 'Project',
              render: (_v, row) => (
                <Link
                  to={`/projects/${row.project_id}`}
                  className="text-[var(--color-primary)] hover:underline"
                >
                  {row.name}
                </Link>
              ),
            },
            { key: 'state', label: 'State' },
            {
              key: 'status',
              label: 'Status',
              render: (v) => <StatusPill status={String(v)} />,
            },
            { key: 'capacity_mw', label: 'MW', format: 'number0' },
            { key: 'storage_mwh', label: 'MWh', format: 'number0' },
            { key: 'duration_h', label: 'Duration (h)', format: 'number1' },
            {
              key: 'developer',
              label: 'Developer',
              render: (v) => <span>{truncate(v as string | null, 25)}</span>,
            },
          ]}
          showRowNumbers
          defaultSort={{ key: 'duration_h', dir: 'desc' }}
          csvFilename="bess-longest-duration"
          csvColumns={['project_id', 'name', 'state', 'status', 'capacity_mw', 'storage_mwh', 'duration_h', 'developer']}
        />
      </section>
    </div>
  )
}

// =====================================================================
// Grid-Forming tab
// =====================================================================

function GridFormingTab({ data }: { data: BessPortfolioData }) {
  const rows = data.grid_forming
  const { grid_forming_count, grid_forming_pct } = data.summary

  return (
    <div className="space-y-6">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 text-sm text-[var(--color-text-muted)] leading-relaxed">
        Grid-forming (GFM) inverters provide voltage/frequency support that traditional grid-following inverters
        cannot. As synchronous generators retire, GFM BESS becomes critical for grid stability.{' '}
        <strong className="text-[var(--color-text)]">{grid_forming_count} projects</strong> flagged —{' '}
        {grid_forming_pct.toFixed(1)}% of the BESS fleet.
      </div>

      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Grid-forming BESS</h2>
        <DataTable
          rows={rows}
          columns={[
            {
              key: 'name',
              label: 'Project',
              render: (_v, row) => (
                <Link to={`/projects/${row.project_id}`} className="text-[var(--color-primary)] hover:underline">
                  {row.name}
                </Link>
              ),
            },
            { key: 'state', label: 'State' },
            {
              key: 'status',
              label: 'Status',
              render: (v) => <StatusPill status={String(v)} />,
            },
            { key: 'capacity_mw', label: 'MW', format: 'number0', aggregator: 'sum' },
            { key: 'storage_mwh', label: 'MWh', format: 'number0', aggregator: 'sum' },
            { key: 'duration_h', label: 'Duration (h)', format: 'number1' },
            {
              key: 'developer',
              label: 'Developer',
              render: (v) => <span>{truncate(v as string | null, 25)}</span>,
            },
            { key: 'cod', label: 'COD' },
          ]}
          showRowNumbers
          showTotals
          defaultSort={{ key: 'capacity_mw', dir: 'desc' }}
          csvFilename="grid-forming-bess"
          csvColumns={['project_id', 'name', 'state', 'status', 'capacity_mw', 'storage_mwh', 'duration_h', 'developer', 'cod']}
        />
      </section>
    </div>
  )
}

// =====================================================================
// Co-located tab
// =====================================================================

function CoLocatedTab({ data }: { data: BessPortfolioData }) {
  const rows = data.co_located
  const totalMw = rows.reduce((s, r) => s + (r.capacity_mw ?? 0), 0)
  const totalGw = (totalMw / 1000).toFixed(1)

  return (
    <div className="space-y-6">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 text-sm text-[var(--color-text-muted)] leading-relaxed">
        Hybrid projects — solar+BESS and wind+BESS — sharing a connection point.{' '}
        <strong className="text-[var(--color-text)]">{rows.length} projects</strong> covering ~
        <strong className="text-[var(--color-text)]">{totalGw} GW</strong> of combined nameplate. BESS is typically
        sized at 30–50% of generator AC capacity to absorb curtailment and shift to evening peak.
      </div>

      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Co-located hybrid projects</h2>
        <DataTable
          rows={rows}
          columns={[
            {
              key: 'name',
              label: 'Project',
              render: (_v, row) => (
                <Link to={`/projects/${row.project_id}`} className="text-[var(--color-primary)] hover:underline">
                  {row.name}
                </Link>
              ),
            },
            { key: 'state', label: 'State' },
            {
              key: 'status',
              label: 'Status',
              render: (v) => <StatusPill status={String(v)} />,
            },
            { key: 'capacity_mw', label: 'MW', format: 'number0', aggregator: 'sum' },
            { key: 'storage_mwh', label: 'MWh', format: 'number0', aggregator: 'sum' },
            { key: 'duration_h', label: 'Duration (h)', format: 'number1' },
            {
              key: 'developer',
              label: 'Developer',
              render: (v) => <span>{truncate(v as string | null, 25)}</span>,
            },
            { key: 'cod', label: 'COD' },
          ]}
          showRowNumbers
          showTotals
          defaultSort={{ key: 'capacity_mw', dir: 'desc' }}
          csvFilename="co-located-hybrid"
          csvColumns={['project_id', 'name', 'state', 'status', 'capacity_mw', 'storage_mwh', 'duration_h', 'developer', 'cod']}
        />
      </section>
    </div>
  )
}

// =====================================================================
// Chemistry tab
// =====================================================================

function ChemistryTab({ data }: { data: BessPortfolioData }) {
  const breakdown = data.chemistry_breakdown
  const nmcCount = breakdown.NMC?.project_count ?? 0

  const pieData = useMemo(
    () =>
      Object.entries(breakdown).map(([name, v]) => ({
        name,
        value: v.project_count,
      })),
    [breakdown],
  )

  const topOemsData = useMemo(() => {
    const result: Array<{ oem: string; count: number; chem: string }> = []
    for (const [chem, v] of Object.entries(breakdown)) {
      for (const [oem, count] of v.top_oems) {
        result.push({ oem: `${oem} (${chem})`, count, chem })
      }
    }
    return result.sort((a, b) => b.count - a.count).slice(0, 8)
  }, [breakdown])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">Chemistry split</h3>
          <ChartFrame title="BESS chemistry split" height={220} data={pieData} csvFilename="bess-chemistry-share">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                label={({ name, value }) => `${name} (${value})`}
                labelLine={{ stroke: '#94a3b8' }}
              >
                {pieData.map((d, i) => (
                  <Cell key={i} fill={CHEM_COLOR[d.name] ?? ['#3b82f6', '#f59e0b', '#8b5cf6'][i % 3]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  color: '#f1f5f9',
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ChartFrame>
          <p className="text-xs text-[var(--color-text-muted)] mt-3 leading-relaxed">
            All EIS-verified operating/committed BESS use LFP except {nmcCount} NMC. LFP&apos;s thermal stability
            and cycle life make it the default for stationary storage.
          </p>
        </div>

        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">Top cell suppliers</h3>
          <ChartFrame title="Top cell suppliers" height={220} data={topOemsData} csvFilename="bess-top-cell-suppliers">
            <BarChart data={topOemsData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 120 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis type="number" stroke="#9ca3af" fontSize={11} allowDecimals={false} />
              <YAxis type="category" dataKey="oem" stroke="#9ca3af" fontSize={10} width={120} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  color: '#f1f5f9',
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {topOemsData.map((d, i) => (
                  <Cell key={i} fill={CHEM_COLOR[d.chem] ?? '#6b7280'} />
                ))}
              </Bar>
            </BarChart>
          </ChartFrame>
        </div>
      </div>

      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">EIS-verified BESS chemistry</h2>
        <DataTable
          rows={data.chemistry_projects}
          columns={[
            {
              key: 'name',
              label: 'Project',
              render: (_v, row) => (
                <Link to={`/projects/${row.project_id}`} className="text-[var(--color-primary)] hover:underline">
                  {row.name}
                </Link>
              ),
            },
            { key: 'state', label: 'State' },
            { key: 'capacity_mw', label: 'MW', format: 'number0' },
            { key: 'storage_mwh', label: 'MWh', format: 'number0' },
            { key: 'duration_h', label: 'Duration (h)', format: 'number1' },
            {
              key: 'chemistry',
              label: 'Chemistry',
              render: (v) => {
                const s = String(v ?? '')
                const color = CHEM_COLOR[s] ?? '#6b7280'
                return s ? (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: `${color}20`, color }}
                  >
                    {s}
                  </span>
                ) : (
                  <span>—</span>
                )
              },
            },
            {
              key: 'cell_supplier',
              label: 'Cell supplier',
              render: (v) => <span>{truncate(v as string | null, 25)}</span>,
            },
            { key: 'cell_country', label: 'Origin' },
            {
              key: 'inverter_supplier',
              label: 'Inverter supplier',
              render: (v) => <span>{truncate(v as string | null, 25)}</span>,
            },
            {
              key: 'pcs_type',
              label: 'PCS',
              render: (v) => {
                const key = String(v ?? '').toLowerCase()
                const cfg = PCS_COLOR[key]
                if (!cfg) return <span className="text-[var(--color-text-muted)]">—</span>
                return (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap"
                    style={{ backgroundColor: cfg.bg, color: cfg.fg }}
                  >
                    {cfg.label}
                  </span>
                )
              },
            },
            { key: 'rte_pct', label: 'RTE %', format: 'number1' },
          ]}
          showRowNumbers
          defaultSort={{ key: 'capacity_mw', dir: 'desc' }}
          csvFilename="bess-chemistry-eis-verified"
          csvColumns={[
            'project_id',
            'name',
            'state',
            'status',
            'capacity_mw',
            'storage_mwh',
            'duration_h',
            'chemistry',
            'chemistry_full',
            'cell_supplier',
            'cell_country',
            'inverter_supplier',
            'inverter_model',
            'pcs_type',
            'rte_pct',
            'developer',
          ]}
        />
      </section>
    </div>
  )
}

// =====================================================================
// Network Services tab
// =====================================================================

function NetworkServicesTab({ data }: { data: BessPortfolioData }) {
  const rows = data.network_services

  return (
    <div className="space-y-6">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 text-sm text-[var(--color-text-muted)] leading-relaxed">
        BESS contracts providing system services — SIPS (System Integrity Protection Schemes), FCAS tolling,
        network augmentation. <strong className="text-[var(--color-text)]">{rows.length} contracts</strong>{' '}
        documented, including Waratah Super Battery and Victorian Big Battery.
      </div>

      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">BESS network service contracts</h2>
        <DataTable
          rows={rows}
          columns={[
            {
              key: 'name',
              label: 'Project',
              render: (_v, row) => (
                <Link to={`/projects/${row.project_id}`} className="text-[var(--color-primary)] hover:underline">
                  {row.name}
                </Link>
              ),
            },
            { key: 'state', label: 'State' },
            {
              key: 'contract_party',
              label: 'Contract party',
              render: (v) => <span>{truncate(v as string | null, 25)}</span>,
            },
            {
              key: 'contract_type',
              label: 'Type',
              render: (v) => {
                const s = String(v ?? '')
                const cfg = CONTRACT_TYPE_COLOR[s] ?? CONTRACT_TYPE_COLOR[s.toLowerCase()]
                if (!cfg) return <span className="text-[var(--color-text-muted)]">{s || '—'}</span>
                return (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap"
                    style={{ backgroundColor: cfg.bg, color: cfg.fg }}
                  >
                    {cfg.label}
                  </span>
                )
              },
            },
            { key: 'contracted_mw', label: 'Contracted MW', format: 'number0' },
            { key: 'term_years', label: 'Term (y)', format: 'number0' },
            {
              key: 'price_structure',
              label: 'Price structure',
              render: (v) => <span>{truncate(v as string | null, 30)}</span>,
            },
            {
              key: 'start_date',
              label: 'Start → End',
              sortable: false,
              render: (_v, row) => {
                const start = formatDateShort(row.start_date)
                const end = formatDateShort(row.end_date)
                if (!start && !end) return <span className="text-[var(--color-text-muted)]">—</span>
                return (
                  <span className="text-xs whitespace-nowrap">
                    {start ?? '—'} → {end ?? '—'}
                  </span>
                )
              },
            },
            {
              key: 'data_confidence',
              label: 'Confidence',
              render: (v) => {
                const key = String(v ?? '').toLowerCase()
                const cfg = CONFIDENCE_PILL[key]
                if (!cfg) return <span className="text-[var(--color-text-muted)]">—</span>
                return (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: cfg.bg, color: cfg.fg }}
                  >
                    {cfg.label}
                  </span>
                )
              },
            },
            {
              key: 'sources',
              label: 'Source',
              sortable: false,
              render: (_v, row) => {
                const src = row.sources?.[0]
                if (!src?.url) return <span className="text-[var(--color-text-muted)]">—</span>
                return (
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--color-primary)] hover:underline inline-flex items-center gap-1"
                    title={src.title ?? src.url}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )
              },
            },
          ]}
          showRowNumbers
          defaultSort={{ key: 'contracted_mw', dir: 'desc' }}
          csvFilename="bess-network-services"
          csvColumns={[
            'offtake_id',
            'project_id',
            'name',
            'state',
            'contract_party',
            'contract_type',
            'contracted_mw',
            'term_years',
            'price_structure',
            'start_date',
            'end_date',
            'data_confidence',
          ]}
        />
      </section>
    </div>
  )
}

// =====================================================================
// Live & Records tab (v2.28.0)
// =====================================================================

interface RecordEntry {
  region: string
  value: number
  unit: string
  recorded_at?: string | null
  settlement_date?: string | null
}

interface BatteryLiveRecords {
  has_data: boolean
  latest_date: string | null
  source_note: string
  records: {
    max_discharge_5min: RecordEntry[]
    max_charge_5min: RecordEntry[]
    max_daily_discharge: RecordEntry[]
    max_daily_charge: RecordEntry[]
  }
  latest_snapshot: Record<string, {
    discharged_mwh: number
    charged_mwh: number
    peak_discharge_mw: number
    peak_charge_mw: number
    peak_discharge_time: string | null
    peak_charge_time: string | null
    intervals: number
  }>
  daily_30d: Record<string, Array<{
    settlement_date: string
    discharged_mwh: number
    charged_mwh: number
    peak_discharge_mw: number
    peak_charge_mw: number
  }>>
  installed_capacity: Record<string, { project_count: number; total_mw: number; total_mwh: number }>
}

const REGION_ORDER = ['NEM', 'NSW1', 'VIC1', 'QLD1', 'SA1', 'TAS1']
const REGION_LABEL: Record<string, string> = {
  NEM: 'NEM (All)',
  NSW1: 'NSW',
  VIC1: 'VIC',
  QLD1: 'QLD',
  SA1: 'SA',
  TAS1: 'TAS',
}

function LiveAndRecordsTab() {
  const [data, setData] = useState<BatteryLiveRecords | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBatteryLiveRecords().then((d) => {
      setData(d as BatteryLiveRecords | null)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return <div className="py-16 text-center text-sm text-[var(--color-text-muted)]">Loading battery records…</div>
  }
  if (!data) {
    return <div className="py-16 text-center text-sm text-[var(--color-text-muted)]">No data available.</div>
  }

  const hasData = data.has_data
  const nemRecs = {
    max_discharge: data.records.max_discharge_5min.find((r) => r.region === 'NEM'),
    max_charge: data.records.max_charge_5min.find((r) => r.region === 'NEM'),
    max_daily_discharge: data.records.max_daily_discharge.find((r) => r.region === 'NEM'),
    max_daily_charge: data.records.max_daily_charge.find((r) => r.region === 'NEM'),
  }
  const nemCap = data.installed_capacity?.['NEM']
  const nemLatest = data.latest_snapshot?.['NEM']

  return (
    <div className="space-y-6">
      {/* Banner */}
      <section
        className="rounded-xl p-4 flex items-start gap-3"
        style={{
          background: hasData ? 'rgba(16,185,129,0.05)' : 'rgba(245,158,11,0.05)',
          border: `1px solid ${hasData ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
        }}
      >
        <span style={{ color: hasData ? '#10b981' : '#f59e0b' }}>{hasData ? '✓' : 'ℹ️'}</span>
        <p className="text-xs text-[var(--color-text-muted)] leading-snug">{data.source_note}</p>
      </section>

      {hasData && nemCap && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MiniStat
            label="Fleet Capacity"
            value={`${(nemCap.total_mw / 1000).toFixed(2)} GW`}
            sub={`${nemCap.project_count} operating projects · ${(nemCap.total_mwh / 1000).toFixed(1)} GWh total`}
            colour="#10b981"
          />
          <MiniStat
            label="Max 5-min Discharge"
            value={nemRecs.max_discharge ? `${Math.round(nemRecs.max_discharge.value)} MW` : '—'}
            sub={nemRecs.max_discharge?.recorded_at ? `Recorded ${formatShortDatetime(nemRecs.max_discharge.recorded_at)}` : ''}
            colour="#3b82f6"
          />
          <MiniStat
            label="Max 5-min Charge"
            value={nemRecs.max_charge ? `${Math.round(nemRecs.max_charge.value)} MW` : '—'}
            sub={nemRecs.max_charge?.recorded_at ? `Recorded ${formatShortDatetime(nemRecs.max_charge.recorded_at)}` : ''}
            colour="#8b5cf6"
          />
          <MiniStat
            label="Max Daily Discharge"
            value={nemRecs.max_daily_discharge ? `${Math.round(nemRecs.max_daily_discharge.value).toLocaleString()} MWh` : '—'}
            sub={nemRecs.max_daily_discharge?.settlement_date ? `On ${nemRecs.max_daily_discharge.settlement_date}` : ''}
            colour="#f59e0b"
          />
        </section>
      )}

      {/* Latest snapshot */}
      {hasData && nemLatest && (
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
          <h2 className="text-base font-semibold text-[var(--color-text)] mb-1">
            Latest snapshot · {data.latest_date}
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mb-3">
            Most recent day's total throughput and peak dispatch per region.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
                  <th className="text-left py-2 px-2">Region</th>
                  <th className="text-right py-2 px-2">Discharged</th>
                  <th className="text-right py-2 px-2">Charged</th>
                  <th className="text-right py-2 px-2">Peak Discharge</th>
                  <th className="text-right py-2 px-2">Peak Charge</th>
                </tr>
              </thead>
              <tbody>
                {REGION_ORDER.map((r) => {
                  const snap = data.latest_snapshot?.[r]
                  if (!snap) return null
                  return (
                    <tr key={r} className="border-b border-[var(--color-border)]/30">
                      <td className="py-2 px-2 font-medium">{REGION_LABEL[r]}</td>
                      <td className="py-2 px-2 text-right tabular-nums" style={{ color: '#10b981' }}>
                        {Math.round(snap.discharged_mwh).toLocaleString()} MWh
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums" style={{ color: '#8b5cf6' }}>
                        {Math.round(snap.charged_mwh).toLocaleString()} MWh
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums">
                        {Math.round(snap.peak_discharge_mw).toLocaleString()} MW
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums">
                        {Math.round(snap.peak_charge_mw).toLocaleString()} MW
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Records by region */}
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
        <h2 className="text-base font-semibold text-[var(--color-text)] mb-1">Records Board</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-3">
          All-time peaks per region since DISPATCHLOAD data was ingested. Updates every time the importer runs.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
                <th className="text-left py-2 px-2">Region</th>
                <th className="text-right py-2 px-2">Max 5-min Discharge</th>
                <th className="text-right py-2 px-2">Max 5-min Charge</th>
                <th className="text-right py-2 px-2">Max Daily Discharge</th>
                <th className="text-right py-2 px-2">Max Daily Charge</th>
              </tr>
            </thead>
            <tbody>
              {REGION_ORDER.map((r) => {
                const md = data.records.max_discharge_5min.find((x) => x.region === r)
                const mc = data.records.max_charge_5min.find((x) => x.region === r)
                const mdd = data.records.max_daily_discharge.find((x) => x.region === r)
                const mdc = data.records.max_daily_charge.find((x) => x.region === r)
                const hasRegion = md || mc || mdd || mdc
                return (
                  <tr key={r} className="border-b border-[var(--color-border)]/30">
                    <td className="py-2 px-2 font-medium">{REGION_LABEL[r]}</td>
                    <td className="py-2 px-2 text-right tabular-nums">
                      {md ? `${Math.round(md.value)} MW` : hasRegion ? '—' : '—'}
                      {md?.recorded_at && <div className="text-[10px] text-[var(--color-text-muted)]">{formatShortDatetime(md.recorded_at)}</div>}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums">
                      {mc ? `${Math.round(mc.value)} MW` : '—'}
                      {mc?.recorded_at && <div className="text-[10px] text-[var(--color-text-muted)]">{formatShortDatetime(mc.recorded_at)}</div>}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums">
                      {mdd ? `${Math.round(mdd.value).toLocaleString()} MWh` : '—'}
                      {mdd?.settlement_date && <div className="text-[10px] text-[var(--color-text-muted)]">{mdd.settlement_date}</div>}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums">
                      {mdc ? `${Math.round(mdc.value).toLocaleString()} MWh` : '—'}
                      {mdc?.settlement_date && <div className="text-[10px] text-[var(--color-text-muted)]">{mdc.settlement_date}</div>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 30-day chart */}
      {hasData && data.daily_30d?.NEM?.length > 0 && (
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
          <h2 className="text-base font-semibold text-[var(--color-text)] mb-1">30-day NEM fleet throughput</h2>
          <p className="text-xs text-[var(--color-text-muted)] mb-3">
            Daily MWh discharged (green) and charged (purple) across the whole NEM BESS fleet.
          </p>
          <ChartFrame title="Daily throughput NEM" height={280} data={data.daily_30d.NEM} csvColumns={['settlement_date', 'discharged_mwh', 'charged_mwh']}>
            <BarChart data={data.daily_30d.NEM}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="settlement_date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="discharged_mwh" name="Discharged (MWh)" fill="#10b981" />
              <Bar dataKey="charged_mwh" name="Charged (MWh)" fill="#8b5cf6" />
            </BarChart>
          </ChartFrame>
        </section>
      )}
    </div>
  )
}

function MiniStat({ label, value, sub, colour }: { label: string; value: string; sub?: string; colour: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">{label}</div>
      <div className="text-xl font-bold mt-0.5 tabular-nums" style={{ color: colour }}>{value}</div>
      {sub && <div className="text-[10px] text-[var(--color-text-muted)] mt-1">{sub}</div>}
    </div>
  )
}

function formatShortDatetime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('en-AU', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}
