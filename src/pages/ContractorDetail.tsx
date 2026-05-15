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
import { useContractor } from '../hooks/useContractorData'
import { useProjectIndex } from '../hooks/useProjectData'
import {
  TECHNOLOGY_CONFIG,
  STATUS_CONFIG,
  CONTRACTOR_ROLE_CONFIG,
  OEM_ROLE_CONFIG,
} from '../lib/types'
import type {
  Technology,
  ProjectStatus,
  ProjectSummary,
  ContractorRole,
  OEMRole,
  State,
} from '../lib/types'
import DataTable from '../components/common/DataTable'
import { fetchContractorAnalytics } from '../lib/dataService'

// ---------- Types for analytics entries ----------

interface TopContractor {
  contractor: string
  slug: string
  category: 'both' | 'epc_only' | 'bop_only'
  roles: ContractorRole[]
  projects: number
  mw_total: number
  technologies: Record<string, number>
  states: Record<string, number>
  statuses: Record<string, number>
  top_developers: Array<[string, number]>
  top_oem_partners: Array<{ supplier: string; role: string; count: number }>
}

interface PortfolioRow {
  project_id: string
  project_name: string
  role: ContractorRole
  technology: Technology
  state: State
  status: ProjectStatus
  capacity_mw: number
  developer: string | null
  model: string | null
  source_url: string | null
  drift_months: number | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ContractorAnalytics = any

const CATEGORY_CONFIG: Record<
  TopContractor['category'],
  { label: string; color: string }
> = {
  both: { label: 'Both (EPC + BoP)', color: '#8b5cf6' },
  epc_only: { label: 'EPC only', color: '#3b82f6' },
  bop_only: { label: 'BoP only', color: '#f97316' },
}

function makeSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

// External-link icon (small inline SVG — no extra deps)
function ExternalIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

export default function ContractorDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { contractor, loading: conLoading } = useContractor(slug)
  const { projects: allProjects, loading: projLoading } = useProjectIndex()

  const [analytics, setAnalytics] = useState<ContractorAnalytics | null>(null)

  useEffect(() => {
    fetchContractorAnalytics()
      .then(setAnalytics)
      .catch(() => setAnalytics(null))
  }, [])

  const loading = conLoading || projLoading

  // Resolve this contractor's analytics entry + portfolio rows.
  const analyticsEntry: TopContractor | null = useMemo(() => {
    if (!analytics || !contractor) return null
    const list = (analytics.top_contractors ?? []) as TopContractor[]
    return list.find((c) => c.contractor === contractor.name) ?? null
  }, [analytics, contractor])

  const portfolioRows: PortfolioRow[] = useMemo(() => {
    if (!analytics || !contractor) return []
    const portfolios = (analytics.contractor_portfolio ?? {}) as Record<
      string,
      PortfolioRow[]
    >
    return portfolios[contractor.name] ?? []
  }, [analytics, contractor])

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

  if (!contractor) {
    return (
      <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto text-center py-20">
        <p className="text-lg text-[var(--color-text-muted)]">Contractor not found</p>
        <Link to="/contractors" className="mt-2 text-sm text-[var(--color-primary)] hover:underline inline-block">
          Back to contractors
        </Link>
      </div>
    )
  }

  const projects = contractor.project_ids
    .map((id) => allProjects.find((p) => p.id === id))
    .filter((p): p is ProjectSummary => !!p)
    .sort((a, b) => b.capacity_mw - a.capacity_mw)

  const techData = Object.entries(contractor.by_technology)
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

  const statusData = Object.entries(contractor.by_status)
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

  const topOem = analyticsEntry?.top_oem_partners?.[0]
  const topDev = analyticsEntry?.top_developers?.[0]

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <div className="text-xs text-[var(--color-text-muted)]">
        <Link to="/contractors" className="hover:text-[var(--color-text)] transition-colors">
          Contractors
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-[var(--color-text)]">{contractor.name}</span>
      </div>

      {/* Header */}
      <section>
        <h1 className="text-2xl lg:text-3xl font-bold text-[var(--color-text)] mb-2">
          {contractor.name}
        </h1>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          {contractor.roles.map((role: ContractorRole) => {
            const config = CONTRACTOR_ROLE_CONFIG[role]
            return (
              <span
                key={role}
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: `${config.color}20`, color: config.color }}
              >
                {config.label}
              </span>
            )
          })}
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">
          {contractor.project_count} projects across {contractor.states.join(', ')}
        </p>
      </section>

      {/* Summary Pill Row (analytics-gated) */}
      {analyticsEntry && (
        <section className="flex items-center gap-2 flex-wrap">
          {(() => {
            const cfg = CATEGORY_CONFIG[analyticsEntry.category]
            if (!cfg) return null
            return (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}
              >
                {cfg.label}
              </span>
            )
          })()}
          {analyticsEntry.roles.map((role) => {
            const cfg = CONTRACTOR_ROLE_CONFIG[role]
            if (!cfg) return null
            return (
              <span
                key={`role-pill-${role}`}
                className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}
              >
                {cfg.label}
              </span>
            )
          })}
          {topOem && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-white/5 text-[var(--color-text-muted)]">
              Top partner:{' '}
              <span className="text-[var(--color-text)]">{topOem.supplier}</span>
              <span className="text-[var(--color-text-muted)]">
                {' '}
                ({topOem.count} project{topOem.count === 1 ? '' : 's'})
              </span>
            </span>
          )}
          {topDev && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-white/5 text-[var(--color-text-muted)]">
              Top client:{' '}
              <span className="text-[var(--color-text)]">{topDev[0]}</span>
              <span className="text-[var(--color-text-muted)]">
                {' '}
                ({topDev[1]} project{topDev[1] === 1 ? '' : 's'})
              </span>
            </span>
          )}
        </section>
      )}

      {/* Stat Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          label="Total Capacity"
          value={contractor.total_capacity_mw >= 1000
            ? `${(contractor.total_capacity_mw / 1000).toFixed(1)} GW`
            : `${Math.round(contractor.total_capacity_mw)} MW`}
          color="var(--color-primary)"
        />
        <StatCard
          label="Projects"
          value={contractor.project_count}
          sublabel={`${Object.keys(contractor.by_technology).length} technologies`}
        />
        <StatCard
          label="States"
          value={contractor.states.length}
          sublabel={contractor.states.join(', ')}
        />
      </section>

      {/* Go-to OEM Partners */}
      {analyticsEntry && analyticsEntry.top_oem_partners.length >= 2 && (
        <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">
            Go-to OEM Partners
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mb-3">
            OEMs most frequently paired with this contractor across their portfolio.
          </p>
          <DataTable
            rows={analyticsEntry.top_oem_partners}
            columns={[
              {
                key: 'supplier',
                label: 'OEM',
                render: (_v, row) => (
                  <Link
                    to={`/oems/${makeSlug(row.supplier)}`}
                    className="text-[var(--color-primary)] hover:underline"
                  >
                    {row.supplier}
                  </Link>
                ),
              },
              {
                key: 'role',
                label: 'Role',
                render: (_v, row) => {
                  const cfg = OEM_ROLE_CONFIG[row.role as OEMRole]
                  if (!cfg) {
                    return (
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {row.role}
                      </span>
                    )
                  }
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
                key: 'count',
                label: 'Projects',
                format: 'number0',
              },
            ]}
            showRowNumbers
            defaultSort={{ key: 'count', dir: 'desc' }}
          />
        </section>
      )}

      {/* Top Clients (Developers) */}
      {analyticsEntry && analyticsEntry.top_developers.length >= 2 && (
        <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">
            Top Clients
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mb-3">
            Developers this contractor has delivered for most often.
          </p>
          <DataTable
            rows={analyticsEntry.top_developers.map(([name, count]) => ({
              developer: name,
              count,
            }))}
            columns={[
              {
                key: 'developer',
                label: 'Developer',
                render: (_v, row) => (
                  <Link
                    to={`/developers/${makeSlug(String(row.developer))}`}
                    className="text-[var(--color-primary)] hover:underline"
                  >
                    {row.developer}
                  </Link>
                ),
              },
              {
                key: 'count',
                label: 'Projects',
                format: 'number0',
              },
            ]}
            showRowNumbers
            defaultSort={{ key: 'count', dir: 'desc' }}
          />
        </section>
      )}

      {/* Project Portfolio */}
      {portfolioRows.length > 0 ? (
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-3">
            Project Portfolio — {portfolioRows.length} project
            {portfolioRows.length === 1 ? '' : 's'}
          </h2>
          <DataTable
            rows={portfolioRows}
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
                key: 'role',
                label: 'Role',
                render: (_v, row) => {
                  const cfg = CONTRACTOR_ROLE_CONFIG[row.role as ContractorRole]
                  if (!cfg) {
                    return (
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {row.role}
                      </span>
                    )
                  }
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
                key: 'technology',
                label: 'Tech',
                hideOnMobile: true,
                render: (_v, row) => {
                  const cfg = TECHNOLOGY_CONFIG[row.technology as Technology]
                  if (!cfg) {
                    return (
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {row.technology}
                      </span>
                    )
                  }
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
                key: 'state',
                label: 'State',
                hideOnMobile: true,
              },
              {
                key: 'status',
                label: 'Status',
                render: (_v, row) => {
                  const cfg = STATUS_CONFIG[row.status as ProjectStatus]
                  if (!cfg) {
                    return (
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {row.status}
                      </span>
                    )
                  }
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
                label: 'MW',
                format: 'number0',
                aggregator: 'sum',
              },
              {
                key: 'developer',
                label: 'Developer',
                hideOnMobile: true,
                render: (_v, row) =>
                  row.developer ? (
                    <span title={row.developer}>{truncate(row.developer, 25)}</span>
                  ) : (
                    <span className="text-[var(--color-text-muted)]">—</span>
                  ),
              },
              {
                key: 'source_url',
                label: 'Source',
                sortable: false,
                align: 'center',
                render: (_v, row) =>
                  row.source_url ? (
                    <a
                      href={row.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
                      aria-label="Open source in new tab"
                      title="Open source"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalIcon />
                    </a>
                  ) : (
                    <span className="text-[var(--color-text-muted)]">—</span>
                  ),
              },
            ]}
            showRowNumbers
            showTotals
            defaultSort={{ key: 'capacity_mw', dir: 'desc' }}
            csvFilename={`${contractor.slug}-project-portfolio`}
            emptyMessage="No portfolio rows"
          />
        </section>
      ) : (
        // Fallback to the legacy simple project list if analytics hasn't loaded
        // / this contractor isn't in contractor_portfolio.
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">
            Projects ({projects.length})
          </h2>
          <ul className="divide-y divide-[var(--color-border)]/40 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  to={`/projects/${project.id}`}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-[var(--color-bg-primary)]/40 transition-colors"
                >
                  <span className="text-sm text-[var(--color-text)] truncate">
                    {project.name}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)] tabular-nums">
                    {Math.round(project.capacity_mw)} MW
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Portfolio summary charts kicker */}
      <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] -mb-4">
        Portfolio summary charts
      </p>

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
            const barWidth = contractor.total_capacity_mw > 0
              ? (item.capacity / contractor.total_capacity_mw) * 100
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
    </div>
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
