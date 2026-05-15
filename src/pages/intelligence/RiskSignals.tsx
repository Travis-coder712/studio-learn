import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts'
import DataProvenance from '../../components/common/DataProvenance'
import DataTable from '../../components/common/DataTable'
import ChartFrame from '../../components/common/ChartFrame'
import {
  fetchConcentrationRisk,
  fetchSchemeWinProbability,
} from '../../lib/dataService'

// =====================================================================
// Types — loose, matching exporter shape
// =====================================================================

interface ConcentrationSummary {
  total_dominance_cells: number
  monopoly_cells: number
  dominant_cells: number
  concentrated_cells: number
  cells_with_at_risk_top_supplier: number
  at_risk_projects_total: number
  at_risk_mw_total: number
  dev_chain_risks_count: number
  at_risk_oems_list: string[]
}

interface DominanceCell {
  technology: string
  state: string
  role: string
  top_supplier: string
  top_share_mw_pct: number
  top_mw: number
  top_projects: number
  total_mw_in_cell: number
  total_projects_in_cell: number
  other_suppliers: number
  top_supplier_at_risk: boolean
  monopoly: boolean
  dominant: boolean
  concentrated: boolean
}

interface AtRiskProject {
  project_id: string
  name: string
  technology: string
  state: string
  status: string
  capacity_mw: number | null
  at_risk_oem: string
  oem_role: string
  model: string | null
  developer: string | null
}

interface AtRiskOemSummary {
  supplier: string
  total_mw: number
  project_count: number
  states_exposed: string[]
  developers_affected: string[]
}

interface DevChainRisk {
  developer: string
  oem: string
  role: string
  projects: number
  mw: number
  share_of_developer_role_mw_pct: number
  states: string[]
  oem_at_risk: boolean
}

interface ConcentrationRiskData {
  summary: ConcentrationSummary
  dominance_cells: DominanceCell[]
  at_risk_projects: AtRiskProject[]
  at_risk_oem_summary: AtRiskOemSummary[]
  dev_chain_risks: DevChainRisk[]
  exported_at?: string
}

interface SchemeWinSummary {
  total_development_projects_scored: number
  projects_with_scheme_wins_excluded: number
  band_counts: { high: number; medium: number; low: number; very_low: number }
}

type Band = 'high' | 'medium' | 'low' | 'very_low'

interface RankedProject {
  project_id: string
  name: string
  technology: string
  state: string
  capacity_mw: number | null
  storage_mwh: number | null
  developer: string | null
  developer_grade: string | null
  cod_current: string | null
  rez: string | null
  development_stage: string | null
  has_cod: boolean
  has_rez: boolean
  has_eis: boolean
  existing_scheme_winner_developer: boolean
  existing_wins_count: number
  grade_points: number
  tech_fit_points: number
  size_fit_points: number
  readiness_points: number
  existing_wins_bonus: number
  win_probability_score: number
  band: Band
}

interface ByTechRow {
  count: number
  avg_score: number
  high_band_count: number
  high_band_pct: number
  total_mw: number
}

interface ByStateRow {
  count: number
  high_band_count: number
  high_band_pct: number
  total_mw: number
}

interface ScoringModel {
  description: string
  components: Array<{ name: string; max: number; basis: string }>
  bands: { high: string; medium: string; low: string; very_low: string }
}

interface SchemeWinData {
  summary: SchemeWinSummary
  ranked_projects: RankedProject[]
  by_tech: Record<string, ByTechRow>
  by_state: Record<string, ByStateRow>
  scoring_model: ScoringModel
  exported_at?: string
}

// =====================================================================
// Tabs
// =====================================================================

type TabId = 'overview' | 'dominance' | 'at-risk-oems' | 'dev-chain' | 'scheme-win'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'dominance', label: 'Dominance Matrix' },
  { id: 'at-risk-oems', label: 'At-Risk OEMs' },
  { id: 'dev-chain', label: 'Dev Chain Risks' },
  { id: 'scheme-win', label: 'Scheme Win Probability' },
]

// =====================================================================
// Constants / helpers
// =====================================================================

const TECH_COLORS: Record<string, string> = {
  wind: '#3b82f6',
  solar: '#f59e0b',
  bess: '#10b981',
  pumped_hydro: '#8b5cf6',
  hybrid: '#ec4899',
  offshore_wind: '#0ea5e9',
}

const TECH_LABEL: Record<string, string> = {
  wind: 'Wind',
  solar: 'Solar',
  bess: 'BESS',
  pumped_hydro: 'Pumped Hydro',
  hybrid: 'Hybrid',
  offshore_wind: 'Offshore Wind',
}

const ROLE_COLORS: Record<string, string> = {
  wind_oem: '#3b82f6',
  solar_oem: '#f59e0b',
  bess_oem: '#8b5cf6',
  hydro_oem: '#14b8a6',
  inverter: '#eab308',
}

const BAND_COLORS: Record<Band, string> = {
  high: '#10b981',
  medium: '#3b82f6',
  low: '#f59e0b',
  very_low: '#6b7280',
}

const BAND_LABEL: Record<Band, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  very_low: 'Very Low',
}

const GRADE_COLORS: Record<string, string> = {
  A: '#10b981',
  B: '#3b82f6',
  C: '#f59e0b',
  D: '#f97316',
  F: '#ef4444',
}

function truncate(s: string | null | undefined, n: number): string {
  if (!s) return '—'
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

function formatRoleLabel(role: string): string {
  return role
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function TechPill({ tech }: { tech: string }) {
  const color = TECH_COLORS[tech] ?? '#6b7280'
  const label = TECH_LABEL[tech] ?? tech
  return (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap"
      style={{ backgroundColor: `${color}22`, color }}
    >
      {label}
    </span>
  )
}

function RolePill({ role }: { role: string }) {
  const color = ROLE_COLORS[role] ?? '#6b7280'
  return (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap"
      style={{ backgroundColor: `${color}22`, color }}
    >
      {formatRoleLabel(role)}
    </span>
  )
}

function ShareColour(pct: number): string {
  if (pct >= 75) return '#ef4444'
  if (pct >= 50) return '#f59e0b'
  if (pct >= 40) return '#eab308'
  return '#94a3b8'
}

function ClassificationPill({ cell }: { cell: DominanceCell }) {
  if (cell.monopoly) {
    return (
      <span
        className="text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap"
        style={{ backgroundColor: 'rgba(239,68,68,0.18)', color: '#ef4444' }}
      >
        🏴 MONOPOLY
      </span>
    )
  }
  if (cell.dominant) {
    return (
      <span
        className="text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap"
        style={{ backgroundColor: 'rgba(245,158,11,0.18)', color: '#f59e0b' }}
      >
        ⚠️ DOMINANT
      </span>
    )
  }
  if (cell.concentrated) {
    return (
      <span
        className="text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap"
        style={{ backgroundColor: 'rgba(234,179,8,0.18)', color: '#eab308' }}
      >
        concentrated
      </span>
    )
  }
  return <span className="text-[var(--color-text-muted)]">—</span>
}

function BandPill({ band }: { band: Band }) {
  const color = BAND_COLORS[band]
  return (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap"
      style={{ backgroundColor: `${color}22`, color }}
    >
      {BAND_LABEL[band]}
    </span>
  )
}

function GradePill({ grade }: { grade: string | null }) {
  if (!grade) return <span className="text-[var(--color-text-muted)]">—</span>
  const color = GRADE_COLORS[grade] ?? '#6b7280'
  return (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
      style={{ backgroundColor: `${color}22`, color }}
    >
      {grade}
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

export default function RiskSignals() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [concData, setConcData] = useState<ConcentrationRiskData | null>(null)
  const [winData, setWinData] = useState<SchemeWinData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchConcentrationRisk(), fetchSchemeWinProbability()])
      .then(([c, w]) => {
        setConcData(c as ConcentrationRiskData | null)
        setWinData(w as SchemeWinData | null)
      })
      .catch(() => {
        setConcData(null)
        setWinData(null)
      })
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
        <div className="text-sm text-[var(--color-text-muted)] animate-pulse">
          Loading risk signals…
        </div>
      </div>
    )
  }

  if (!concData || !winData) {
    return (
      <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto">
        <h1 className="text-xl lg:text-2xl font-bold text-[var(--color-text)] mb-2">
          Risk &amp; Probability Signals
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Risk-signal data not available. Run the exporter and refresh.
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-[var(--color-text)] mb-1">
          Risk &amp; Probability Signals
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Supply chain concentration, bankrupt-OEM exposure, single-point-of-failure dev-OEM
          chains, and forward-looking scheme win probability for the development pipeline.
        </p>
        <div className="mt-3">
          <DataProvenance page="risk-signals" />
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

      {tab === 'overview' && <OverviewTab conc={concData} win={winData} />}
      {tab === 'dominance' && <DominanceTab conc={concData} />}
      {tab === 'at-risk-oems' && <AtRiskOemsTab conc={concData} />}
      {tab === 'dev-chain' && <DevChainTab conc={concData} />}
      {tab === 'scheme-win' && <SchemeWinTab win={winData} />}
    </div>
  )
}

// =====================================================================
// Overview tab
// =====================================================================

function OverviewTab({ conc, win }: { conc: ConcentrationRiskData; win: SchemeWinData }) {
  const { summary, dominance_cells, at_risk_oem_summary } = conc
  const { summary: winSummary, ranked_projects } = win

  const monopolies = useMemo(
    () => dominance_cells.filter((c) => c.monopoly).slice(0, 4),
    [dominance_cells],
  )

  const highBandProjects = useMemo(
    () => ranked_projects.filter((p) => p.band === 'high'),
    [ranked_projects],
  )
  const highBandMw = highBandProjects.reduce((acc, p) => acc + (p.capacity_mw ?? 0), 0)

  const topScheme = useMemo(() => ranked_projects.slice(0, 5), [ranked_projects])

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Dominance cells"
          value={`${summary.total_dominance_cells}`}
          sub="tech × state × role cohorts"
        />
        <StatCard
          label="Monopoly cells"
          value={`${summary.monopoly_cells}`}
          sub="≥75% share"
        />
        <StatCard
          label="At-risk projects"
          value={`${summary.at_risk_projects_total}`}
          sub={`${summary.at_risk_mw_total.toFixed(0)} MW exposed`}
        />
        <StatCard
          label="High-prob scheme"
          value={`${winSummary.band_counts.high}`}
          sub={`${highBandMw.toFixed(0)} MW`}
        />
      </div>

      {/* Market monopolies */}
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">
          🏴 Market monopolies
        </h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-3">
          Cohorts where a single OEM holds ≥ 75% of installed MW.
        </p>
        {monopolies.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No monopoly cells flagged.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {monopolies.map((c, i) => (
              <li key={i} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0 flex items-center gap-2 flex-wrap">
                  <TechPill tech={c.technology} />
                  <span className="text-xs text-[var(--color-text-muted)]">{c.state}</span>
                  <RolePill role={c.role} />
                  <span className="text-sm text-[var(--color-text)] font-medium truncate">
                    {c.top_supplier}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs flex-shrink-0">
                  <span style={{ color: ShareColour(c.top_share_mw_pct), fontWeight: 600 }}>
                    {c.top_share_mw_pct.toFixed(1)}%
                  </span>
                  <span className="text-[var(--color-text-muted)]">
                    {c.top_projects}/{c.total_projects_in_cell} projects
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* At-risk OEM exposure */}
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">
          At-risk OEM exposure
        </h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-3">
          Projects using OEMs whose parent is bankrupt, absorbed, or under balance-sheet stress.
        </p>
        {at_risk_oem_summary.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No at-risk OEMs flagged.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {at_risk_oem_summary.map((o) => (
              <li key={o.supplier} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0 flex items-center gap-2">
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: 'rgba(239,68,68,0.18)', color: '#ef4444' }}
                  >
                    ⚠️
                  </span>
                  <span className="text-sm text-[var(--color-text)] font-medium truncate">
                    {o.supplier}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs flex-shrink-0 text-[var(--color-text-muted)]">
                  <span>
                    <span className="text-[var(--color-text)] font-medium">
                      {o.total_mw.toFixed(0)} MW
                    </span>
                    {' · '}
                    {o.project_count} projects
                  </span>
                  <span>{(o.states_exposed ?? []).join(', ')}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Top scheme win candidates */}
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">
          Top scheme win candidates
        </h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-3">
          Highest-scored development-stage projects by heuristic CIS/LTESA win probability.
        </p>
        <ul className="divide-y divide-[var(--color-border)]">
          {topScheme.map((p) => (
            <li key={p.project_id} className="py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Link
                  to={`/projects/${p.project_id}`}
                  className="text-sm text-[var(--color-primary)] hover:underline font-medium"
                >
                  {p.name}
                </Link>
                <div className="text-xs text-[var(--color-text-muted)] mt-0.5 flex items-center gap-2 flex-wrap">
                  <TechPill tech={p.technology} />
                  <span>{p.state}</span>
                  <span>· {p.capacity_mw != null ? `${p.capacity_mw.toFixed(0)} MW` : '—'}</span>
                  <span>· {truncate(p.developer, 28)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <GradePill grade={p.developer_grade} />
                <span
                  className="text-sm font-bold"
                  style={{ color: BAND_COLORS[p.band] }}
                >
                  {p.win_probability_score.toFixed(0)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

// =====================================================================
// Dominance Matrix tab
// =====================================================================

function DominanceTab({ conc }: { conc: ConcentrationRiskData }) {
  const rows = conc.dominance_cells

  return (
    <div className="space-y-6">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 text-sm text-[var(--color-text-muted)] leading-relaxed">
        Cells where a single OEM holds ≥ 40% of installed MW within a (technology × state × role)
        cohort. Thresholds: <strong className="text-[var(--color-text)]">monopoly</strong> ≥ 75%,{' '}
        <strong className="text-[var(--color-text)]">dominant</strong> 50-74%,{' '}
        <strong className="text-[var(--color-text)]">concentrated</strong> 40-49%.
      </div>

      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <DataTable
          rows={rows}
          columns={[
            {
              key: 'technology',
              label: 'Tech',
              render: (v) => <TechPill tech={String(v)} />,
            },
            { key: 'state', label: 'State' },
            {
              key: 'role',
              label: 'Role',
              render: (v) => <RolePill role={String(v)} />,
            },
            {
              key: 'top_supplier',
              label: 'Top Supplier',
              render: (v) => <span>{truncate(v as string | null, 30)}</span>,
            },
            {
              key: 'top_share_mw_pct',
              label: 'Share %',
              render: (v) => {
                if (v === null || v === undefined) return <span>—</span>
                const n = Number(v)
                if (!Number.isFinite(n)) return <span>—</span>
                return (
                  <span style={{ color: ShareColour(n), fontWeight: 600 }}>
                    {n.toFixed(1)}%
                  </span>
                )
              },
            },
            { key: 'top_mw', label: 'Top MW', format: 'number0' },
            { key: 'top_projects', label: 'Top Projects', format: 'number0' },
            {
              key: 'total_projects_in_cell',
              label: 'Cell Projects',
              format: 'number0',
              hideOnMobile: true,
            },
            {
              key: 'classification',
              label: 'Classification',
              sortable: false,
              render: (_v, row) => <ClassificationPill cell={row} />,
            },
            {
              key: 'top_supplier_at_risk',
              label: 'At Risk',
              render: (v) =>
                v ? (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: 'rgba(239,68,68,0.18)', color: '#ef4444' }}
                    title="Top supplier flagged as bankrupt or stressed"
                  >
                    ⚠️
                  </span>
                ) : (
                  <span className="text-[var(--color-text-muted)]">—</span>
                ),
            },
          ]}
          showRowNumbers
          defaultSort={{ key: 'top_share_mw_pct', dir: 'desc' }}
          csvFilename="dominance-matrix"
          csvColumns={[
            'technology',
            'state',
            'role',
            'top_supplier',
            'top_share_mw_pct',
            'top_mw',
            'top_projects',
            'total_mw_in_cell',
            'total_projects_in_cell',
            'other_suppliers',
            'top_supplier_at_risk',
            'monopoly',
            'dominant',
            'concentrated',
          ]}
        />
      </section>
    </div>
  )
}

// =====================================================================
// At-Risk OEMs tab
// =====================================================================

function AtRiskOemsTab({ conc }: { conc: ConcentrationRiskData }) {
  const { at_risk_projects, at_risk_oem_summary } = conc

  return (
    <div className="space-y-6">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 text-sm text-[var(--color-text-muted)] leading-relaxed">
        Projects using OEMs whose parent company is bankrupt, absorbed, or under balance-sheet
        stress. Spare-parts availability and service warranty coverage are the primary concerns.
        See the{' '}
        <Link
          to="/intelligence/asset-lifecycle"
          className="text-[var(--color-primary)] hover:underline"
        >
          Asset Lifecycle &amp; Repowering
        </Link>{' '}
        page for how these factor into refurb scoring.
      </div>

      {/* Call-out cards */}
      {at_risk_oem_summary.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {at_risk_oem_summary.map((o) => (
            <div
              key={o.supplier}
              className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: 'rgba(239,68,68,0.18)', color: '#ef4444' }}
                >
                  ⚠️ At risk
                </span>
                <span className="text-sm font-semibold text-[var(--color-text)]">
                  {o.supplier}
                </span>
              </div>
              <div className="text-xs text-[var(--color-text-muted)] space-y-1">
                <div>
                  <span className="text-[var(--color-text)] font-medium">
                    {o.total_mw.toFixed(0)} MW
                  </span>
                  {' · '}
                  {o.project_count} projects
                </div>
                <div>States: {(o.states_exposed ?? []).join(', ') || '—'}</div>
                <div>
                  Developers:{' '}
                  {truncate((o.developers_affected ?? []).join(', '), 80)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <DataTable
          rows={at_risk_projects}
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
            {
              key: 'technology',
              label: 'Tech',
              render: (v) => <TechPill tech={String(v)} />,
            },
            { key: 'state', label: 'State' },
            {
              key: 'status',
              label: 'Status',
              render: (v) => (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap"
                  style={{ backgroundColor: 'rgba(100,116,139,0.18)', color: '#94a3b8' }}
                >
                  {String(v ?? '—')}
                </span>
              ),
            },
            {
              key: 'at_risk_oem',
              label: 'At-Risk OEM',
              render: (v) => (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap"
                  style={{ backgroundColor: 'rgba(239,68,68,0.18)', color: '#ef4444' }}
                >
                  {String(v ?? '—')}
                </span>
              ),
            },
            {
              key: 'oem_role',
              label: 'Role',
              render: (v) => <RolePill role={String(v)} />,
            },
            {
              key: 'model',
              label: 'Model',
              hideOnMobile: true,
              render: (v) => <span>{truncate(v as string | null, 25)}</span>,
            },
            { key: 'capacity_mw', label: 'MW', format: 'number0', aggregator: 'sum' },
            {
              key: 'developer',
              label: 'Developer',
              hideOnMobile: true,
              render: (v) => <span>{truncate(v as string | null, 25)}</span>,
            },
          ]}
          showRowNumbers
          showTotals
          defaultSort={{ key: 'capacity_mw', dir: 'desc' }}
          csvFilename="at-risk-oem-projects"
          csvColumns={[
            'project_id',
            'name',
            'technology',
            'state',
            'status',
            'capacity_mw',
            'at_risk_oem',
            'oem_role',
            'model',
            'developer',
          ]}
        />
      </section>
    </div>
  )
}

// =====================================================================
// Dev Chain Risks tab
// =====================================================================

function DevChainTab({ conc }: { conc: ConcentrationRiskData }) {
  const rows = conc.dev_chain_risks
  const count = rows.length

  return (
    <div className="space-y-6">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 text-sm text-[var(--color-text-muted)] leading-relaxed">
        Developer-OEM pairings where a single supplier accounts for 100% (or ≥ 50%) of a
        developer&apos;s fleet in one role. Supply disruption or OEM failure would affect the
        entire fleet.{' '}
        <strong className="text-[var(--color-text)]">
          Currently {count} chain{count === 1 ? '' : 's'} flagged.
        </strong>
      </div>

      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <DataTable
          rows={rows}
          columns={[
            {
              key: 'developer',
              label: 'Developer',
              render: (v) => <span>{truncate(v as string | null, 35)}</span>,
            },
            {
              key: 'oem',
              label: 'OEM',
              render: (v) => <span>{truncate(v as string | null, 25)}</span>,
            },
            {
              key: 'role',
              label: 'Role',
              render: (v) => <RolePill role={String(v)} />,
            },
            { key: 'projects', label: 'Projects', format: 'number0' },
            { key: 'mw', label: 'MW', format: 'number0' },
            {
              key: 'share_of_developer_role_mw_pct',
              label: '% of Dev Fleet',
              render: (v) => {
                if (v === null || v === undefined) return <span>—</span>
                const n = Number(v)
                if (!Number.isFinite(n)) return <span>—</span>
                return (
                  <span style={{ color: ShareColour(n), fontWeight: 600 }}>
                    {n.toFixed(1)}%
                  </span>
                )
              },
            },
            {
              key: 'states',
              label: 'States',
              sortable: false,
              render: (v) => {
                const arr = Array.isArray(v) ? v : []
                return <span>{arr.join(', ') || '—'}</span>
              },
            },
            {
              key: 'oem_at_risk',
              label: 'OEM at risk',
              render: (v) =>
                v ? (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: 'rgba(239,68,68,0.18)', color: '#ef4444' }}
                  >
                    ⚠️
                  </span>
                ) : (
                  <span className="text-[var(--color-text-muted)]">—</span>
                ),
            },
          ]}
          showRowNumbers
          defaultSort={{ key: 'projects', dir: 'desc' }}
          csvFilename="dev-chain-risks"
          csvColumns={[
            'developer',
            'oem',
            'role',
            'projects',
            'mw',
            'share_of_developer_role_mw_pct',
            'states',
            'oem_at_risk',
          ]}
        />
      </section>
    </div>
  )
}

// =====================================================================
// Scheme Win Probability tab
// =====================================================================

function SchemeWinTab({ win }: { win: SchemeWinData }) {
  const { ranked_projects, by_tech, by_state, scoring_model, summary } = win
  const [showAll, setShowAll] = useState(false)

  const visibleRows = useMemo(
    () => (showAll ? ranked_projects : ranked_projects.slice(0, 100)),
    [ranked_projects, showAll],
  )

  const bandPieData = useMemo(() => {
    const bands: Band[] = ['high', 'medium', 'low', 'very_low']
    return bands
      .map((b) => ({
        name: BAND_LABEL[b],
        value: summary.band_counts[b] ?? 0,
        fill: BAND_COLORS[b],
      }))
      .filter((d) => d.value > 0)
  }, [summary])

  const techBarData = useMemo(() => {
    return Object.entries(by_tech)
      .map(([tech, v]) => ({
        tech: TECH_LABEL[tech] ?? tech,
        techKey: tech,
        high_band_count: v.high_band_count,
        count: v.count,
      }))
      .filter((d) => d.count > 0)
      .sort((a, b) => b.high_band_count - a.high_band_count || b.count - a.count)
  }, [by_tech])

  const stateBarData = useMemo(() => {
    return Object.entries(by_state)
      .map(([state, v]) => ({
        state,
        high_band_count: v.high_band_count,
        count: v.count,
      }))
      .filter((d) => d.count > 0)
      .sort((a, b) => b.high_band_count - a.high_band_count || b.count - a.count)
  }, [by_state])

  return (
    <div className="space-y-6">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 text-sm text-[var(--color-text-muted)] leading-relaxed">
        Development-stage projects ranked by heuristic CIS/LTESA win probability. Composite of
        developer track record (30 pts), tech fit to recent round appetite (20), project size fit
        (15), readiness signals (20), and repeat-winner bonus (15). Higher score = stronger
        historical fit with how past rounds have been awarded.
      </div>

      {/* Scoring explainer */}
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Scoring model</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-3">{scoring_model.description}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                <th className="py-1.5 pr-3 font-medium">Component</th>
                <th className="py-1.5 pr-3 font-medium text-right">Max</th>
                <th className="py-1.5 font-medium">Basis</th>
              </tr>
            </thead>
            <tbody>
              {scoring_model.components.map((c) => (
                <tr key={c.name} className="border-b border-[var(--color-border)]/50">
                  <td className="py-1.5 pr-3 font-medium text-[var(--color-text)]">{c.name}</td>
                  <td className="py-1.5 pr-3 text-right text-[var(--color-text)]">{c.max}</td>
                  <td className="py-1.5 text-[var(--color-text-muted)]">{c.basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-xs text-[var(--color-text-muted)] flex flex-wrap gap-3">
          {(Object.keys(scoring_model.bands) as Band[]).map((b) => (
            <span key={b} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: BAND_COLORS[b] }}
              />
              <span className="text-[var(--color-text)] font-medium">{BAND_LABEL[b]}</span>:{' '}
              {scoring_model.bands[b]}
            </span>
          ))}
        </div>
      </section>

      {/* Summary charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2">
            Band distribution
          </h3>
          <ChartFrame
            title="Band distribution"
            height={240}
            data={bandPieData}
            csvFilename="scheme-win-band-distribution"
            csvColumns={['name', 'value']}
          >
            <PieChart>
              <Pie
                data={bandPieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {bandPieData.map((entry, i) => (
                  <Cell key={`b-${i}`} fill={entry.fill} />
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
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ChartFrame>
        </div>

        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2">
            High-band projects by tech
          </h3>
          <ChartFrame
            title="High-band projects by tech"
            height={240}
            data={techBarData}
            csvFilename="scheme-win-by-tech"
            csvColumns={['tech', 'count', 'high_band_count']}
          >
            <BarChart
              data={techBarData}
              layout="vertical"
              margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis type="number" stroke="#9ca3af" fontSize={11} allowDecimals={false} />
              <YAxis type="category" dataKey="tech" stroke="#9ca3af" fontSize={11} width={80} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  color: '#f1f5f9',
                  fontSize: 12,
                }}
              />
              <Bar dataKey="high_band_count" radius={[0, 4, 4, 0]}>
                {techBarData.map((d, i) => (
                  <Cell key={`t-${i}`} fill={TECH_COLORS[d.techKey] ?? '#6b7280'} />
                ))}
              </Bar>
            </BarChart>
          </ChartFrame>
        </div>

        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2">
            High-band projects by state
          </h3>
          <ChartFrame
            title="High-band projects by state"
            height={240}
            data={stateBarData}
            csvFilename="scheme-win-by-state"
            csvColumns={['state', 'count', 'high_band_count']}
          >
            <BarChart
              data={stateBarData}
              layout="vertical"
              margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis type="number" stroke="#9ca3af" fontSize={11} allowDecimals={false} />
              <YAxis type="category" dataKey="state" stroke="#9ca3af" fontSize={11} width={60} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  color: '#f1f5f9',
                  fontSize: 12,
                }}
              />
              <Bar dataKey="high_band_count" radius={[0, 4, 4, 0]} fill="#10b981" />
            </BarChart>
          </ChartFrame>
        </div>
      </div>

      {/* Main ranked table */}
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Ranked projects</h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Showing {visibleRows.length} of {ranked_projects.length} development projects.
            </p>
          </div>
          {ranked_projects.length > 100 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="text-xs px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)] transition-colors"
            >
              {showAll ? 'Show top 100' : `Show all ${ranked_projects.length}`}
            </button>
          )}
        </div>
        <DataTable
          rows={visibleRows}
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
            {
              key: 'technology',
              label: 'Tech',
              render: (v) => <TechPill tech={String(v)} />,
            },
            { key: 'state', label: 'State' },
            { key: 'capacity_mw', label: 'MW', format: 'number0' },
            {
              key: 'developer',
              label: 'Developer',
              hideOnMobile: true,
              render: (v) => <span>{truncate(v as string | null, 25)}</span>,
            },
            {
              key: 'developer_grade',
              label: 'Dev Grade',
              render: (v) => <GradePill grade={v as string | null} />,
            },
            {
              key: 'has_cod',
              label: 'COD',
              render: (v) =>
                v ? (
                  <span style={{ color: '#10b981' }}>✓</span>
                ) : (
                  <span className="text-[var(--color-text-muted)]">—</span>
                ),
            },
            {
              key: 'has_rez',
              label: 'REZ',
              render: (v) =>
                v ? (
                  <span style={{ color: '#10b981' }}>✓</span>
                ) : (
                  <span className="text-[var(--color-text-muted)]">—</span>
                ),
            },
            {
              key: 'has_eis',
              label: 'EIS',
              render: (v) =>
                v ? (
                  <span style={{ color: '#10b981' }}>✓</span>
                ) : (
                  <span className="text-[var(--color-text-muted)]">—</span>
                ),
            },
            {
              key: 'existing_wins_count',
              label: 'Prior wins',
              hideOnMobile: true,
              render: (v) => {
                const n = Number(v ?? 0)
                if (!Number.isFinite(n) || n <= 0)
                  return <span className="text-[var(--color-text-muted)]">—</span>
                return (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap"
                    style={{ backgroundColor: 'rgba(16,185,129,0.18)', color: '#10b981' }}
                  >
                    {n} × 🏆
                  </span>
                )
              },
            },
            {
              key: 'win_probability_score',
              label: 'Score',
              render: (v, row) => {
                if (v === null || v === undefined) return <span>—</span>
                const n = Number(v)
                if (!Number.isFinite(n)) return <span>—</span>
                return (
                  <span
                    style={{ color: BAND_COLORS[row.band], fontWeight: 700 }}
                  >
                    {n.toFixed(0)}
                  </span>
                )
              },
            },
            {
              key: 'band',
              label: 'Band',
              render: (v) => <BandPill band={v as Band} />,
            },
          ]}
          showRowNumbers
          defaultSort={{ key: 'win_probability_score', dir: 'desc' }}
          csvFilename="scheme-win-candidates"
          csvColumns={[
            'project_id',
            'name',
            'technology',
            'state',
            'capacity_mw',
            'storage_mwh',
            'developer',
            'developer_grade',
            'cod_current',
            'rez',
            'development_stage',
            'has_cod',
            'has_rez',
            'has_eis',
            'existing_scheme_winner_developer',
            'existing_wins_count',
            'grade_points',
            'tech_fit_points',
            'size_fit_points',
            'readiness_points',
            'existing_wins_bonus',
            'win_probability_score',
            'band',
          ]}
        />
      </section>
    </div>
  )
}
