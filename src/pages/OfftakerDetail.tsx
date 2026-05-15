import { useEffect, useMemo, useState } from 'react'
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
import { useOfftaker } from '../hooks/useOfftakerData'
import { useProjectIndex } from '../hooks/useProjectData'
import { TECHNOLOGY_CONFIG, STATUS_CONFIG, OFFTAKE_TYPE_CONFIG } from '../lib/types'
import type { Technology, ProjectStatus, ProjectSummary, OfftakeType } from '../lib/types'
import ProjectCard from '../components/common/ProjectCard'
import DataTable from '../components/common/DataTable'
import DrillPanel from '../components/common/DrillPanel'
import { fetchOfftakeAnalytics } from '../lib/dataService'

// ---------------------------------------------------------------------------
// Category colour map — kept in sync with OfftakerList.tsx CATEGORY_CONFIG.
// Change both together if colours are ever rebalanced.
// ---------------------------------------------------------------------------
type BuyerCategory =
  | 'gentailer'
  | 'state_owned'
  | 'government'
  | 'corporate'
  | 'industrial'
  | 'trader'
  | 'other'

const CATEGORY_CONFIG: Record<BuyerCategory, { label: string; color: string }> = {
  gentailer: { label: 'Gentailer', color: '#ef4444' },
  state_owned: { label: 'State-owned', color: '#f59e0b' },
  government: { label: 'Government', color: '#3b82f6' },
  corporate: { label: 'Corporate', color: '#8b5cf6' },
  industrial: { label: 'Industrial', color: '#10b981' },
  trader: { label: 'Trader', color: '#14b8a6' },
  other: { label: 'Other', color: '#6b7280' },
}

// Map contract types → short pill label + a colour.
// Spec-provided palette: PPA #3b82f6, corporate_ppa #8b5cf6,
// government_ppa #10b981, tolling #f59e0b. Others fall back to neutral grey.
const CONTRACT_TYPE_PILL: Record<string, { label: string; color: string }> = {
  PPA: { label: 'PPA', color: '#3b82f6' },
  corporate_ppa: { label: 'Corp PPA', color: '#8b5cf6' },
  government_ppa: { label: 'Govt PPA', color: '#10b981' },
  tolling: { label: 'Tolling', color: '#f59e0b' },
}

const CONFIDENCE_PILL: Record<string, { label: string; bg: string; fg: string }> = {
  high: { label: 'High', bg: 'rgba(16,185,129,0.18)', fg: '#10b981' }, // emerald
  medium: { label: 'Medium', bg: 'rgba(59,130,246,0.18)', fg: '#3b82f6' }, // blue
  low: { label: 'Low', bg: 'rgba(245,158,11,0.18)', fg: '#f59e0b' }, // amber
  inferred: { label: 'Inferred', bg: 'rgba(107,114,128,0.25)', fg: '#9ca3af' }, // gray
}

// ---------------------------------------------------------------------------
// Buyer portfolio row shape — narrow typing over the loose analytics blob.
// ---------------------------------------------------------------------------
interface BuyerPortfolioEntry {
  offtake_id: string
  project_id: string
  project_name: string
  technology: Technology | string
  state: string
  project_mw: number | null
  developer: string | null
  type: string | null
  term_years: number | null
  capacity_mw: number | null
  volume_structure: string | null
  price_aud_per_mwh: number | null
  price_structure: string | null
  price_notes: string | null
  start_date: string | null
  end_date: string | null
  tenor_description: string | null
  sources: Array<{ url: string; title?: string; accessed?: string }>
  data_confidence: string | null
  last_verified: string | null
}

interface TopBuyerEntry {
  party: string
  slug: string
  category: string
  offtakes: number
  projects: number
  mw_project_total: number | null
  mw_contracted: number | null
  avg_tenor_years: number | null
  avg_price_aud_per_mwh: number | null
  by_technology?: Record<string, number>
  by_state?: Record<string, number>
  by_type?: Record<string, number>
  top_developers?: Array<{ developer: string; count: number }>
}

export default function OfftakerDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { offtaker, loading: offLoading } = useOfftaker(slug)
  const { projects: allProjects, loading: projLoading } = useProjectIndex()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [analytics, setAnalytics] = useState<any | null>(null)
  const [drillOfftakeId, setDrillOfftakeId] = useState<string | null>(null)

  useEffect(() => {
    fetchOfftakeAnalytics().then(setAnalytics).catch(() => setAnalytics(null))
  }, [])

  const loading = offLoading || projLoading

  // Pull this buyer's rich per-offtake contract records out of buyer_portfolio.
  // Matching is by display name (profile.name === buyer key).
  const portfolio = useMemo<BuyerPortfolioEntry[] | null>(() => {
    if (!offtaker || !analytics) return null
    const bp = (analytics as { buyer_portfolio?: Record<string, BuyerPortfolioEntry[]> }).buyer_portfolio
    if (!bp) return null
    return bp[offtaker.name] ?? null
  }, [analytics, offtaker])

  const topBuyerEntry = useMemo<TopBuyerEntry | null>(() => {
    if (!offtaker || !analytics) return null
    const tb = (analytics as { top_buyers?: TopBuyerEntry[] }).top_buyers ?? []
    return tb.find((b) => b.party === offtaker.name) ?? null
  }, [analytics, offtaker])

  const drillRow = useMemo<BuyerPortfolioEntry | null>(() => {
    if (!drillOfftakeId || !portfolio) return null
    return portfolio.find((r) => r.offtake_id === drillOfftakeId) ?? null
  }, [drillOfftakeId, portfolio])

  if (loading) {
    return (
      <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-[var(--color-bg-card)] rounded w-64" />
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[var(--color-bg-card)] rounded-xl h-24" />
            ))}
          </div>
          <div className="bg-[var(--color-bg-card)] rounded-xl h-60" />
        </div>
      </div>
    )
  }

  if (!offtaker) {
    return (
      <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto text-center py-20">
        <p className="text-lg text-[var(--color-text-muted)]">Offtaker not found</p>
        <Link to="/offtakers" className="mt-2 text-sm text-[var(--color-primary)] hover:underline inline-block">
          Back to offtakers
        </Link>
      </div>
    )
  }

  const projects = offtaker.project_ids
    .map((id) => allProjects.find((p) => p.id === id))
    .filter((p): p is ProjectSummary => !!p)
    .sort((a, b) => b.capacity_mw - a.capacity_mw)

  const techData = Object.entries(offtaker.by_technology)
    .map(([tech, count]) => ({
      tech: tech as Technology,
      label: TECHNOLOGY_CONFIG[tech as Technology]?.label ?? tech,
      count: count as number,
      color: TECHNOLOGY_CONFIG[tech as Technology]?.color ?? '#6b7280',
      capacity: projects
        .filter((p) => p.technology === tech)
        .reduce((s, p) => s + p.capacity_mw, 0),
    }))
    .sort((a, b) => b.capacity - a.capacity)

  const statusData = Object.entries(offtaker.by_status)
    .map(([status, count]) => ({
      status: status as ProjectStatus,
      label: STATUS_CONFIG[status as ProjectStatus]?.label ?? status,
      count: count as number,
      color: STATUS_CONFIG[status as ProjectStatus]?.color ?? '#6b7280',
      capacity: projects
        .filter((p) => p.status === status)
        .reduce((s, p) => s + p.capacity_mw, 0),
    }))
    .sort((a, b) => b.capacity - a.capacity)

  // --- Summary pill values (only meaningful when we have portfolio data) ---
  const hasPortfolio = Array.isArray(portfolio) && portfolio.length > 0
  const category = topBuyerEntry?.category ?? 'other'
  const categoryCfg = CATEGORY_CONFIG[category as BuyerCategory] ?? CATEGORY_CONFIG.other
  const avgTenor = topBuyerEntry?.avg_tenor_years ?? null
  const avgPrice = topBuyerEntry?.avg_price_aud_per_mwh ?? null
  const priceCoverage = hasPortfolio
    ? (portfolio!.filter((r) => r.price_aud_per_mwh != null).length / portfolio!.length) * 100
    : null

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <div className="text-xs text-[var(--color-text-muted)]">
        <Link to="/offtakers" className="hover:text-[var(--color-text)] transition-colors">
          Offtakers
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-[var(--color-text)]">{offtaker.name}</span>
      </div>

      {/* Header */}
      <section>
        <h1 className="text-2xl lg:text-3xl font-bold text-[var(--color-text)] mb-2">
          {offtaker.name}
        </h1>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          {offtaker.types.map((type: OfftakeType) => {
            const config = OFFTAKE_TYPE_CONFIG[type]
            return (
              <span
                key={type}
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: `${config.color}20`, color: config.color }}
              >
                {config.label}
              </span>
            )
          })}
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">
          {offtaker.project_count} projects across {offtaker.states.join(', ')}
        </p>
      </section>

      {/* Summary pills — only render when we have enriched analytics */}
      {hasPortfolio && (
        <section className="flex flex-wrap items-center gap-2">
          <span
            className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ backgroundColor: `${categoryCfg.color}20`, color: categoryCfg.color }}
          >
            {categoryCfg.label}
          </span>
          <SummaryPill
            label={avgTenor != null ? `${avgTenor.toFixed(1)} y avg` : '— y avg'}
          />
          <SummaryPill
            label={avgPrice != null ? `$${Math.round(avgPrice)}/MWh avg` : '— $/MWh avg'}
          />
          <SummaryPill
            label={priceCoverage != null ? `${Math.round(priceCoverage)}% price coverage` : '— price coverage'}
          />
        </section>
      )}

      {/* Stat Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          label="Total Capacity"
          value={offtaker.total_capacity_mw >= 1000
            ? `${(offtaker.total_capacity_mw / 1000).toFixed(1)} GW`
            : `${Math.round(offtaker.total_capacity_mw)} MW`}
          color="var(--color-primary)"
        />
        <StatCard
          label="Projects"
          value={offtaker.project_count}
          sublabel={`${Object.keys(offtaker.by_technology).length} technologies`}
        />
        <StatCard
          label="States"
          value={offtaker.states.length}
          sublabel={offtaker.states.join(', ')}
        />
      </section>

      {/* Technology Mix Chart */}
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

      {/* Status Breakdown */}
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">
          Pipeline Status
        </h2>
        <div className="space-y-2.5">
          {statusData.map((item) => {
            const barWidth = offtaker.total_capacity_mw > 0
              ? (item.capacity / offtaker.total_capacity_mw) * 100
              : 0
            return (
              <div key={item.status} className="flex items-center gap-3">
                <span className="text-xs w-24 text-right" style={{ color: item.color }}>
                  {item.label}
                </span>
                <div className="flex-1 h-5 bg-[var(--color-bg-elevated)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: `${item.color}40`,
                      minWidth: item.count > 0 ? '2px' : '0',
                    }}
                  />
                </div>
                <span className="text-xs text-[var(--color-text-muted)] w-28 text-right tabular-nums">
                  {item.count} · {item.capacity >= 1000
                    ? `${(item.capacity / 1000).toFixed(1)} GW`
                    : `${Math.round(item.capacity)} MW`}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      {/* Offtake Contracts table — only when enriched portfolio is available */}
      {hasPortfolio && (
        <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">
            Offtake Contracts — {portfolio!.length} contract{portfolio!.length !== 1 ? 's' : ''}
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mb-4">
            Click any row for full contract detail, sources, and provenance.
          </p>
          <DataTable<BuyerPortfolioEntry>
            rows={portfolio!}
            columns={[
              {
                key: 'project_name',
                label: 'Project',
                render: (_v, row) => (
                  <Link
                    to={`/projects/${row.project_id}`}
                    className="text-[var(--color-primary)] hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {row.project_name}
                  </Link>
                ),
              },
              {
                key: 'technology',
                label: 'Tech',
                hideOnMobile: true,
                render: (v) => {
                  const cfg = TECHNOLOGY_CONFIG[v as Technology]
                  if (!cfg) return <span className="text-xs">{String(v ?? '—')}</span>
                  return (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}
                    >
                      {cfg.icon} {cfg.label}
                    </span>
                  )
                },
              },
              { key: 'state', label: 'State', hideOnMobile: true },
              {
                key: 'type',
                label: 'Type',
                render: (v) => {
                  const key = String(v ?? '')
                  const cfg = CONTRACT_TYPE_PILL[key]
                  if (!cfg) return <span className="text-xs text-[var(--color-text-muted)]">{key || '—'}</span>
                  return (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}
                    >
                      {cfg.label}
                    </span>
                  )
                },
              },
              {
                key: 'capacity_mw',
                label: 'Volume',
                align: 'right',
                accessor: (r) => r.capacity_mw ?? null,
                render: (_v, row) => {
                  if (row.capacity_mw != null) return <span>{Math.round(row.capacity_mw).toLocaleString()} MW</span>
                  if (row.volume_structure) return <span className="text-xs text-[var(--color-text-muted)]">{row.volume_structure}</span>
                  return <span className="text-[var(--color-text-muted)]">—</span>
                },
              },
              {
                key: 'price_aud_per_mwh',
                label: 'Price',
                align: 'right',
                accessor: (r) => r.price_aud_per_mwh ?? null,
                render: (_v, row) => {
                  if (row.price_aud_per_mwh != null) return <span>${Math.round(row.price_aud_per_mwh)}/MWh</span>
                  if (row.price_structure) return <span className="text-xs text-[var(--color-text-muted)]">{row.price_structure}</span>
                  return <span className="text-[var(--color-text-muted)]">—</span>
                },
              },
              {
                key: 'term_years',
                label: 'Tenor',
                align: 'right',
                accessor: (r) => r.term_years ?? null,
                render: (_v, row) => {
                  if (row.term_years != null) {
                    const yr = row.start_date ? ` (from ${row.start_date.slice(0, 4)})` : ''
                    return <span>{row.term_years}y{yr}</span>
                  }
                  if (row.tenor_description) {
                    const t = row.tenor_description
                    return <span className="text-xs text-[var(--color-text-muted)]">{t.length > 28 ? t.slice(0, 27) + '…' : t}</span>
                  }
                  return <span className="text-[var(--color-text-muted)]">—</span>
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
                  const sources = row.sources ?? []
                  if (!sources.length) return <span className="text-[var(--color-text-muted)]">—</span>
                  const s0 = sources[0]
                  return (
                    <span className="inline-flex items-center gap-1">
                      <a
                        href={s0.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={s0.title || s0.url}
                        title={s0.title || s0.url}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                      >
                        <ExternalLinkIcon />
                      </a>
                      {sources.length > 1 && (
                        <span className="text-[10px] text-[var(--color-text-muted)]">+{sources.length - 1}</span>
                      )}
                    </span>
                  )
                },
              },
            ]}
            showRowNumbers
            defaultSort={{ key: 'capacity_mw', dir: 'desc' }}
            csvFilename={`${slug}-offtake-contracts`}
            onRowClick={(row) => setDrillOfftakeId(row.offtake_id)}
          />
        </section>
      )}

      {/* Project List */}
      <section>
        <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
          Full project list
        </p>
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">
          Projects ({projects.length})
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </section>

      {/* Contract detail drawer */}
      <DrillPanel
        open={drillRow !== null}
        title={drillRow?.project_name ?? ''}
        subtitle="Contract detail"
        onClose={() => setDrillOfftakeId(null)}
      >
        {drillRow && <ContractDetail row={drillRow} />}
      </DrillPanel>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers & small components
// ---------------------------------------------------------------------------

function SummaryPill({ label }: { label: string }) {
  return (
    <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text)]">
      {label}
    </span>
  )
}

function ExternalLinkIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  )
}

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

// ---------------------------------------------------------------------------
// Drill-panel body: all the fields we didn't show in the row.
// ---------------------------------------------------------------------------
function ContractDetail({ row }: { row: BuyerPortfolioEntry }) {
  const techCfg = TECHNOLOGY_CONFIG[row.technology as Technology]
  const typeCfg = CONTRACT_TYPE_PILL[row.type ?? '']
  const confCfg = CONFIDENCE_PILL[(row.data_confidence ?? '').toLowerCase()]

  return (
    <div className="space-y-5 text-sm">
      {/* Project header block */}
      <div className="rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] p-3 space-y-1.5">
        <Link
          to={`/projects/${row.project_id}`}
          className="text-[var(--color-primary)] hover:underline font-medium"
        >
          {row.project_name}
        </Link>
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {techCfg && (
            <span
              className="px-1.5 py-0.5 rounded-full text-[10px]"
              style={{ backgroundColor: `${techCfg.color}20`, color: techCfg.color }}
            >
              {techCfg.icon} {techCfg.label}
            </span>
          )}
          <span className="text-[var(--color-text-muted)]">{row.state}</span>
          {row.project_mw != null && (
            <span className="text-[var(--color-text-muted)]">
              {Math.round(row.project_mw)} MW project
            </span>
          )}
        </div>
        {row.developer && (
          <p className="text-xs text-[var(--color-text-muted)]">
            Developer: <span className="text-[var(--color-text)]">{row.developer}</span>
          </p>
        )}
      </div>

      {/* Contract terms */}
      <div>
        <SectionTitle>Contract terms</SectionTitle>
        <DetailGrid>
          <DetailItem label="Type">
            {typeCfg ? (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: `${typeCfg.color}20`, color: typeCfg.color }}
              >
                {typeCfg.label}
              </span>
            ) : (
              row.type ?? '—'
            )}
          </DetailItem>
          <DetailItem label="Term">
            {row.term_years != null ? `${row.term_years} years` : '—'}
          </DetailItem>
          <DetailItem label="Start">{row.start_date ?? '—'}</DetailItem>
          <DetailItem label="End">{row.end_date ?? '—'}</DetailItem>
        </DetailGrid>
        {row.tenor_description && (
          <p className="text-xs text-[var(--color-text-muted)] mt-2 leading-relaxed">
            {row.tenor_description}
          </p>
        )}
      </div>

      {/* Volume */}
      <div>
        <SectionTitle>Volume</SectionTitle>
        <DetailGrid>
          <DetailItem label="Capacity">
            {row.capacity_mw != null ? `${Math.round(row.capacity_mw).toLocaleString()} MW` : '—'}
          </DetailItem>
          <DetailItem label="Structure">
            {row.volume_structure ? <span className="text-xs">{row.volume_structure}</span> : '—'}
          </DetailItem>
        </DetailGrid>
      </div>

      {/* Price */}
      {(row.price_aud_per_mwh != null || row.price_structure || row.price_notes) && (
        <div>
          <SectionTitle>Price</SectionTitle>
          <DetailGrid>
            <DetailItem label="$/MWh">
              {row.price_aud_per_mwh != null ? `$${Math.round(row.price_aud_per_mwh)}` : '—'}
            </DetailItem>
            <DetailItem label="Structure">
              {row.price_structure ? <span className="text-xs">{row.price_structure}</span> : '—'}
            </DetailItem>
          </DetailGrid>
          {row.price_notes && (
            <p className="text-xs text-[var(--color-text-muted)] mt-2 leading-relaxed">
              {row.price_notes}
            </p>
          )}
        </div>
      )}

      {/* Sources */}
      <div>
        <SectionTitle>Sources ({row.sources?.length ?? 0})</SectionTitle>
        {row.sources && row.sources.length > 0 ? (
          <ul className="space-y-1.5">
            {row.sources.map((s, i) => (
              <li key={i} className="text-xs">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-primary)] hover:underline break-all"
                >
                  {s.title || s.url}
                </a>
                {s.accessed && (
                  <span className="ml-2 text-[var(--color-text-muted)]">accessed {s.accessed}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-[var(--color-text-muted)]">No sources recorded.</p>
        )}
      </div>

      {/* Provenance */}
      <div>
        <SectionTitle>Provenance</SectionTitle>
        <DetailGrid>
          <DetailItem label="Confidence">
            {confCfg ? (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: confCfg.bg, color: confCfg.fg }}
              >
                {confCfg.label}
              </span>
            ) : (
              row.data_confidence ?? '—'
            )}
          </DetailItem>
          <DetailItem label="Last verified">{row.last_verified ?? '—'}</DetailItem>
        </DetailGrid>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-2">
      {children}
    </h3>
  )
}

function DetailGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-2">{children}</div>
}

function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">{label}</p>
      <p className="text-sm text-[var(--color-text)]">{children}</p>
    </div>
  )
}
