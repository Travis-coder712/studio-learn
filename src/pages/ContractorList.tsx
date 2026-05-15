import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
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
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { useContractorIndex } from '../hooks/useContractorData'
import {
  TECHNOLOGY_CONFIG,
  CONTRACTOR_ROLE_CONFIG,
  STATUS_CONFIG,
  type Technology,
  type State,
  type ProjectStatus,
  type ContractorRole,
} from '../lib/types'
import DataProvenance from '../components/common/DataProvenance'
import DataTable from '../components/common/DataTable'
import ChartFrame from '../components/common/ChartFrame'
import { fetchContractorAnalytics } from '../lib/dataService'

type SortKey = 'capacity' | 'projects' | 'name'
type TabId = 'overview' | 'epc' | 'bop' | 'pairings' | 'directory'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'epc', label: 'EPC' },
  { id: 'bop', label: 'BoP' },
  { id: 'pairings', label: 'Developer × Contractor' },
  { id: 'directory', label: 'Directory' },
]

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  both: { label: 'Both', color: '#8b5cf6' },
  epc_only: { label: 'EPC', color: '#3b82f6' },
  bop_only: { label: 'BoP', color: '#f97316' },
}

const PIE_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#a855f7',
  '#64748b', '#84cc16', '#e11d48', '#0ea5e9', '#d946ef',
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ContractorAnalytics = any

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

interface DevContractorPair {
  developer: string
  contractor: string
  projects: number
  mw: number
  roles: ContractorRole[]
}

function parseMulti<T extends string>(raw: string | null): T[] {
  if (!raw) return []
  return raw.split(',').filter(Boolean) as T[]
}

function formatMW(mw: number): string {
  if (mw >= 1000) return `${(mw / 1000).toFixed(1)} GW`
  return `${Math.round(mw)} MW`
}

function hhiColor(hhi: number): string {
  if (hhi < 1500) return '#22c55e'
  if (hhi < 2500) return '#f59e0b'
  return '#ef4444'
}

function hhiBand(hhi: number): string {
  if (hhi < 1500) return 'Competitive'
  if (hhi < 2500) return 'Moderate'
  return 'Highly concentrated'
}

function CategoryPill({ category }: { category: string }) {
  const cfg = CATEGORY_CONFIG[category] ?? { label: category, color: '#6b7280' }
  return (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap"
      style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}
    >
      {cfg.label}
    </span>
  )
}

function RolePills({ roles }: { roles: ContractorRole[] }) {
  return (
    <span className="inline-flex gap-1 flex-wrap">
      {roles.map((r) => {
        const cfg = CONTRACTOR_ROLE_CONFIG[r]
        return (
          <span
            key={r}
            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}
          >
            {cfg.label}
          </span>
        )
      })}
    </span>
  )
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

export default function ContractorList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('capacity')
  const [sortDesc, setSortDesc] = useState(true)
  const { data, loading } = useContractorIndex()
  const navigate = useNavigate()

  const [analytics, setAnalytics] = useState<ContractorAnalytics | null>(null)

  useEffect(() => {
    fetchContractorAnalytics().then(setAnalytics).catch(() => setAnalytics(null))
  }, [])

  const tab = (searchParams.get('tab') as TabId) || 'overview'
  const stateFilters = parseMulti<State>(searchParams.get('state'))
  const techFilters = parseMulti<Technology>(searchParams.get('tech'))
  const statusFilters = parseMulti<ProjectStatus>(searchParams.get('status'))

  function setTab(next: TabId) {
    const sp = new URLSearchParams(searchParams)
    if (next === 'overview') sp.delete('tab')
    else sp.set('tab', next)
    setSearchParams(sp)
  }

  const filtered = useMemo(() => {
    if (!data) return []
    let result = [...data.contractors]

    if (query) {
      const q = query.toLowerCase()
      result = result.filter((c) => c.name.toLowerCase().includes(q))
    }
    if (stateFilters.length) {
      result = result.filter((c) => c.states.some((s) => stateFilters.includes(s as State)))
    }
    if (techFilters.length) {
      result = result.filter((c) => techFilters.some((t) => c.by_technology[t]))
    }
    if (statusFilters.length) {
      result = result.filter((c) => statusFilters.some((s) => c.by_status[s]))
    }

    result.sort((a, b) => {
      let cmp = 0
      switch (sortBy) {
        case 'capacity':
          cmp = a.total_capacity_mw - b.total_capacity_mw
          break
        case 'projects':
          cmp = a.project_count - b.project_count
          break
        case 'name':
          cmp = a.name.localeCompare(b.name)
          break
      }
      return sortDesc ? -cmp : cmp
    })

    return result
  }, [data, query, stateFilters.join(','), techFilters.join(','), statusFilters.join(','), sortBy, sortDesc])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60dvh]">
        <div className="text-sm text-[var(--color-text-muted)] animate-pulse">Loading contractors...</div>
      </div>
    )
  }

  function toggleFilter(key: string, value: string) {
    const sp = new URLSearchParams(searchParams)
    const current = sp.get(key) || ''
    const values = current ? current.split(',').filter(Boolean) : []
    const idx = values.indexOf(value)
    if (idx >= 0) values.splice(idx, 1)
    else values.push(value)
    if (values.length > 0) sp.set(key, values.join(','))
    else sp.delete(key)
    setSearchParams(sp)
  }

  function isFilterActive(key: string, value: string): boolean {
    const raw = searchParams.get(key) || ''
    return raw.split(',').includes(value)
  }

  const activeFilters = [stateFilters.length > 0, techFilters.length > 0, statusFilters.length > 0].filter(Boolean).length
  const totalContractorsAll = data?.contractors.length ?? 0
  const totalCapacityAll = data?.contractors.reduce((s, c) => s + c.total_capacity_mw, 0) ?? 0

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-[var(--color-text)] mb-1">
          Contractors
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          {totalContractorsAll} contractor{totalContractorsAll !== 1 ? 's' : ''} · {formatMW(totalCapacityAll)} total project capacity
        </p>
        <div className="mt-3">
          <DataProvenance page="contractors" />
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

      {/* Tab content */}
      {tab === 'overview' && <OverviewTab analytics={analytics} />}
      {tab === 'epc' && <RoleTab analytics={analytics} role="epc" />}
      {tab === 'bop' && <RoleTab analytics={analytics} role="bop" />}
      {tab === 'pairings' && <PairingsTab analytics={analytics} />}

      {tab === 'directory' && data && (
        <>
          {/* Top Contractors Quick Buttons */}
          {data.contractors.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] w-12">
                  Top
                </span>
                {[...data.contractors]
                  .sort((a, b) => b.project_count - a.project_count)
                  .slice(0, 8)
                  .map((c) => (
                    <Link
                      key={c.slug}
                      to={`/contractors/${c.slug}`}
                      className="text-xs px-2.5 py-1 rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)] transition-colors"
                    >
                      {c.name} <span className="opacity-60">{c.project_count}</span>
                    </Link>
                  ))}
              </div>
            </div>
          )}

          {/* Search + Dropdown */}
          <div className="mb-4 flex items-center gap-3 flex-wrap">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search contractors..."
              className="flex-1 min-w-[200px] max-w-md px-3 py-2 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/50 focus:outline-none focus:border-[var(--color-primary)]/50"
            />
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) navigate(`/contractors/${e.target.value}`)
              }}
              className="px-3 py-2 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]/50 max-w-[220px]"
            >
              <option value="">Jump to contractor...</option>
              {[...data.contractors]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name} ({c.project_count})
                  </option>
                ))}
            </select>
          </div>

          {/* Filter Chips */}
          <div className="mb-4 space-y-3">
            {/* Technology */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] w-12">
                Tech
              </span>
              {(['wind', 'solar', 'bess', 'hybrid', 'offshore_wind', 'pumped_hydro'] as const).map((t) => {
                const config = TECHNOLOGY_CONFIG[t]
                const isActive = isFilterActive('tech', t)
                return (
                  <button
                    key={t}
                    onClick={() => toggleFilter('tech', t)}
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
              {(['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS'] as const).map((s) => {
                const isActive = isFilterActive('state', s)
                return (
                  <button
                    key={s}
                    onClick={() => toggleFilter('state', s)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      isActive
                        ? 'border-transparent bg-[var(--color-primary)]/20 text-[var(--color-primary)] font-medium'
                        : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
                    }`}
                  >
                    {s}
                  </button>
                )
              })}
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] w-12">
                Status
              </span>
              {(['operating', 'commissioning', 'construction', 'development'] as const).map((s) => {
                const config = STATUS_CONFIG[s]
                const isActive = isFilterActive('status', s)
                return (
                  <button
                    key={s}
                    onClick={() => toggleFilter('status', s)}
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
                onClick={() => {
                  const sp = new URLSearchParams(searchParams)
                  sp.delete('state')
                  sp.delete('tech')
                  sp.delete('status')
                  setSearchParams(sp)
                }}
                className="text-xs text-[var(--color-primary)] hover:underline"
              >
                Clear {activeFilters} filter{activeFilters > 1 ? 's' : ''} ×
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-3 mb-4 text-xs text-[var(--color-text-muted)]">
            <span>Sort by:</span>
            {([
              { key: 'capacity', label: 'Capacity' },
              { key: 'projects', label: 'Projects' },
              { key: 'name', label: 'Name' },
            ] as const).map((option) => (
              <button
                key={option.key}
                onClick={() => {
                  if (sortBy === option.key) {
                    setSortDesc(!sortDesc)
                  } else {
                    setSortBy(option.key)
                    setSortDesc(true)
                  }
                }}
                className={`px-2 py-0.5 rounded transition-colors ${
                  sortBy === option.key
                    ? 'text-[var(--color-primary)] font-medium'
                    : 'hover:text-[var(--color-text)]'
                }`}
              >
                {option.label}
                {sortBy === option.key && (sortDesc ? ' ↓' : ' ↑')}
              </button>
            ))}
          </div>

          {/* Contractor Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filtered.map((contractor) => (
              <ContractorCard key={contractor.slug} contractor={contractor} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-lg text-[var(--color-text-muted)]">No contractors match your filters</p>
              <button
                onClick={() => { setQuery(''); setSearchParams({ tab: 'directory' }) }}
                className="mt-2 text-sm text-[var(--color-primary)] hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// =====================================================================
// Overview tab
// =====================================================================

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: string
}) {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        {label}
      </div>
      <div
        className="text-xl font-bold mt-1"
        style={{ color: accent ?? 'var(--color-text)' }}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{sub}</div>}
    </div>
  )
}

function OverviewTab({ analytics }: { analytics: ContractorAnalytics | null }) {
  const concentration = analytics?.concentration ?? null
  const summary = analytics?.summary ?? null

  const slugByName = useMemo(() => {
    const m = new Map<string, string>()
    const rows = (analytics?.top_contractors ?? []) as TopContractor[]
    for (const r of rows) m.set(r.contractor, r.slug)
    return m
  }, [analytics])

  const hhiChartData = useMemo(() => {
    if (!concentration) return []
    const roles = [
      { key: 'epc', label: 'EPC' },
      { key: 'bop', label: 'BoP' },
    ] as const
    return roles
      .map((r) => ({
        role: r.label,
        hhi: concentration[r.key]?.hhi_mw ?? 0,
        color: hhiColor(concentration[r.key]?.hhi_mw ?? 0),
      }))
      .filter((d) => d.hhi > 0)
  }, [concentration])

  const top3Rows = useMemo(() => {
    if (!concentration) return []
    const roles = [
      { key: 'epc', label: 'EPC' },
      { key: 'bop', label: 'BoP' },
    ] as const
    return roles
      .map((r) => {
        const c = concentration[r.key]
        if (!c) return null
        const [a, b, cc] = c.top3 ?? []
        return {
          role: r.label,
          top1: a ? `${a.supplier} (${formatMW(a.mw)})` : '—',
          top2: b ? `${b.supplier} (${formatMW(b.mw)})` : '—',
          top3: cc ? `${cc.supplier} (${formatMW(cc.mw)})` : '—',
          top3_share: c.top3_share_mw_pct ?? 0,
          contractor_count: c.total_contractors ?? 0,
        }
      })
      .filter(Boolean) as Array<{
        role: string; top1: string; top2: string; top3: string;
        top3_share: number; contractor_count: number
      }>
  }, [concentration])

  const pairingRows = useMemo(() => {
    const matrix = (analytics?.dev_contractor_matrix ?? []) as DevContractorPair[]
    return [...matrix]
      .sort((a, b) => b.projects - a.projects || b.mw - a.mw)
      .slice(0, 15)
      .map((r, i) => ({ id: `${i}`, ...r }))
  }, [analytics])

  const stats = useMemo(() => {
    if (!concentration || !summary) return null
    const epcCount = concentration.epc?.total_contractors ?? 0
    const bopCount = concentration.bop?.total_contractors ?? 0
    const epcHhi = concentration.epc?.hhi_mw ?? 0
    const bopHhi = concentration.bop?.hhi_mw ?? 0
    const mostConcentrated =
      bopHhi >= epcHhi
        ? { label: 'BoP', hhi: bopHhi }
        : { label: 'EPC', hhi: epcHhi }
    return {
      total: summary.total_contractors ?? 0,
      epcCount,
      bopCount,
      mostConcentrated,
    }
  }, [concentration, summary])

  if (!concentration || !summary || !stats) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-[var(--color-text-muted)]">
          Contractor analytics data not available. Run the exporter and refresh.
        </p>
      </div>
    )
  }

  const epc = concentration.epc
  const bop = concentration.bop
  const explainer =
    `BoP (balance-of-plant) work is ${hhiBand(bop?.hhi_mw ?? 0).toLowerCase()} — ` +
    `top-3 hold ${(bop?.top3_share_mw_pct ?? 0).toFixed(1)}% of MW. EPC is much more ` +
    `fragmented (${(epc?.top3_share_mw_pct ?? 0).toFixed(1)}% top-3 share).`

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Contractors" value={`${stats.total}`} sub="across EPC + BoP roles" />
        <StatCard label="EPC Firms" value={`${stats.epcCount}`} sub="in engineering-procurement-construction" />
        <StatCard label="BoP Firms" value={`${stats.bopCount}`} sub="in balance-of-plant work" />
        <StatCard
          label="Most Concentrated Role"
          value={stats.mostConcentrated.label}
          sub={`HHI ${stats.mostConcentrated.hhi.toLocaleString()}`}
          accent={hhiColor(stats.mostConcentrated.hhi)}
        />
      </div>

      {/* HHI chart */}
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">HHI concentration</h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Herfindahl-Hirschman Index by contractor role. Green &lt;1500 (competitive), amber 1500-2500 (moderate), red &gt;2500 (highly concentrated).
          </p>
        </div>
        <ChartFrame
          title="HHI by contractor role"
          height={220}
          data={hhiChartData}
          csvFilename="contractor-hhi"
          csvColumns={['role', 'hhi']}
        >
          <BarChart data={hhiChartData} layout="vertical" margin={{ top: 10, right: 30, bottom: 10, left: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis type="number" domain={[0, 3000]} stroke="#9ca3af" fontSize={11} />
            <YAxis type="category" dataKey="role" stroke="#9ca3af" fontSize={11} width={60} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: '#f1f5f9',
                fontSize: 13,
              }}
              formatter={(value) => [`HHI ${Number(value).toLocaleString()} — ${hhiBand(Number(value))}`, 'Concentration']}
            />
            <Bar dataKey="hhi" radius={[0, 4, 4, 0]}>
              {hhiChartData.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ChartFrame>
        <p className="text-xs text-[var(--color-text-muted)] mt-3 leading-relaxed">
          {explainer}
        </p>
      </section>

      {/* Top 3 per Role */}
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Top 3 per Role</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Leading contractors by MW in each role, with combined top-3 market share.
        </p>
        <DataTable
          rows={top3Rows}
          columns={[
            { key: 'role', label: 'Role' },
            { key: 'top1', label: '#1', sortable: false },
            { key: 'top2', label: '#2', sortable: false },
            { key: 'top3', label: '#3', sortable: false },
            { key: 'top3_share', label: 'Top-3 Share', format: 'percent1' },
            { key: 'contractor_count', label: '# Contractors', format: 'integer' },
          ]}
          showRowNumbers={false}
          showTotals={false}
          defaultSort={{ key: 'top3_share', dir: 'desc' }}
          csvFilename="contractor-concentration"
        />
      </section>

      {/* Dev-Contractor pairings (top 15) */}
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Most Active Developer-Contractor Pairings</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Top 15 by project count. Repeated pairings suggest preferred-partner dynamics.
        </p>
        <DataTable
          rows={pairingRows}
          columns={[
            {
              key: 'developer',
              label: 'Developer',
              render: (v) => <span>{truncate(String(v ?? ''), 30)}</span>,
            },
            {
              key: 'contractor',
              label: 'Contractor',
              render: (_v, row) => {
                const slug = slugByName.get(row.contractor)
                if (!slug) return <span>{row.contractor}</span>
                return (
                  <Link
                    to={`/contractors/${slug}`}
                    className="text-[var(--color-primary)] hover:underline"
                  >
                    {row.contractor}
                  </Link>
                )
              },
            },
            { key: 'projects', label: 'Projects', format: 'integer', aggregator: 'sum' },
            { key: 'mw', label: 'MW', format: 'number0', aggregator: 'sum' },
            {
              key: 'roles',
              label: 'Roles',
              sortable: false,
              render: (_v, row) => <RolePills roles={row.roles} />,
            },
          ]}
          showRowNumbers
          showTotals
          defaultSort={{ key: 'projects', dir: 'desc' }}
          csvFilename="dev-contractor-top-pairings"
          csvColumns={['developer', 'contractor', 'projects', 'mw']}
        />
      </section>
    </div>
  )
}

// =====================================================================
// EPC / BoP tab (shared)
// =====================================================================

function RoleTab({ analytics, role }: { analytics: ContractorAnalytics | null; role: 'epc' | 'bop' }) {
  const concentration = analytics?.concentration?.[role]
  const all = (analytics?.top_contractors ?? []) as TopContractor[]

  const rows = useMemo(() => {
    return all
      .filter((c) => c.roles.includes(role))
      .map((c) => {
        const topTechEntry = Object.entries(c.technologies ?? {})
          .sort(([, a], [, b]) => (b as number) - (a as number))[0]
        const topTech = topTechEntry ? (topTechEntry[0] as Technology) : null
        const topOem = c.top_oem_partners?.[0]
        const topDev = c.top_developers?.[0]
        return {
          id: c.slug,
          slug: c.slug,
          contractor: c.contractor,
          category: c.category,
          projects: c.projects,
          mw: Math.round(c.mw_total),
          topTech,
          topOem: topOem ? topOem.supplier : '',
          topDev: topDev ? topDev[0] : '',
        }
      })
  }, [all, role])

  const pieData = useMemo(() => {
    const sorted = [...rows].sort((a, b) => b.projects - a.projects)
    const top10 = sorted.slice(0, 10)
    const rest = sorted.slice(10)
    const otherProjects = rest.reduce((s, r) => s + r.projects, 0)
    const out: Array<{ name: string; value: number; color: string; slug?: string }> = top10.map((r, i) => ({
      name: r.contractor,
      value: r.projects,
      color: r.topTech && TECHNOLOGY_CONFIG[r.topTech]?.color ? TECHNOLOGY_CONFIG[r.topTech]!.color : PIE_COLORS[i % PIE_COLORS.length],
      slug: r.slug,
    }))
    if (otherProjects > 0) {
      out.push({ name: 'Other', value: otherProjects, color: '#64748b' })
    }
    return out
  }, [rows])

  const navigate = useNavigate()

  if (!concentration) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-[var(--color-text-muted)]">
          No {role.toUpperCase()} analytics available.
        </p>
      </div>
    )
  }

  const totalFirms = concentration.total_contractors ?? rows.length
  const top3share = (concentration.top3_share_mw_pct ?? 0).toFixed(1)
  const hhi = concentration.hhi_mw ?? 0
  const band = hhiBand(hhi).toLowerCase()
  const intro = role === 'epc'
    ? `The EPC market is ${band} — ${totalFirms} firms competing. Top 3 = ${top3share}% share. HHI ${hhi.toLocaleString()}.`
    : `BoP market is ${band} — ${top3share}% top-3 share. HHI ${hhi.toLocaleString()}.`

  const roleLabel = role === 'epc' ? 'EPC' : 'BoP'

  return (
    <div className="space-y-6">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 text-sm text-[var(--color-text-muted)]">
        {intro}
      </div>

      {/* Market share pie */}
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">{roleLabel} market share</h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Top 10 {roleLabel} firms by project count. Slice colour = dominant technology. Click slices to view profile.
          </p>
        </div>
        <ChartFrame
          title={`${roleLabel} market share`}
          height={300}
          data={pieData}
          csvFilename={`${role}-market-share`}
          csvColumns={['name', 'value']}
          responsive={false}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                cursor="pointer"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                label={(props: any) => {
                  const pct = props.percent ?? 0
                  return pct > 0.05 ? `${props.name ?? ''} ${(pct * 100).toFixed(0)}%` : ''
                }}
                labelLine={false}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={(_: any, index: number) => {
                  const slice = pieData[index]
                  if (slice?.slug) navigate(`/contractors/${slice.slug}`)
                }}
              >
                {pieData.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  color: '#f1f5f9',
                  fontSize: 13,
                }}
                formatter={(value) => `${Number(value).toLocaleString()} projects`}
              />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                formatter={(value) => <span style={{ color: '#9ca3af' }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartFrame>
      </section>

      {/* Top firms table */}
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Top {roleLabel} Firms</h2>
        <DataTable
          rows={rows}
          columns={[
            {
              key: 'contractor',
              label: 'Contractor',
              render: (_v, row) => (
                <Link
                  to={`/contractors/${row.slug}`}
                  className="text-[var(--color-primary)] hover:underline"
                >
                  {row.contractor}
                </Link>
              ),
            },
            {
              key: 'category',
              label: 'Category',
              render: (v) => <CategoryPill category={String(v)} />,
            },
            { key: 'projects', label: 'Projects', format: 'integer', aggregator: 'sum' },
            { key: 'mw', label: 'MW', format: 'number0', aggregator: 'sum' },
            {
              key: 'topTech',
              label: 'Top Tech',
              sortable: false,
              render: (v) => {
                if (!v) return <span>—</span>
                const cfg = TECHNOLOGY_CONFIG[v as Technology]
                if (!cfg) return <span className="text-xs">{String(v)}</span>
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
            {
              key: 'topOem',
              label: 'Top OEM Partner',
              render: (v) => {
                const s = v ? String(v) : ''
                return <span>{s ? truncate(s, 22) : '—'}</span>
              },
            },
            {
              key: 'topDev',
              label: 'Top Developer',
              render: (v) => {
                const s = v ? String(v) : ''
                return <span>{s ? truncate(s, 22) : '—'}</span>
              },
            },
          ]}
          showRowNumbers
          showTotals
          defaultSort={{ key: 'projects', dir: 'desc' }}
          csvFilename={`top-${role}-firms`}
          csvColumns={['contractor', 'category', 'projects', 'mw', 'topTech', 'topOem', 'topDev']}
        />
      </section>
    </div>
  )
}

// =====================================================================
// Developer × Contractor tab
// =====================================================================

function PairingsTab({ analytics }: { analytics: ContractorAnalytics | null }) {
  const matrix = (analytics?.dev_contractor_matrix ?? []) as DevContractorPair[]

  const slugByName = useMemo(() => {
    const m = new Map<string, string>()
    const rows = (analytics?.top_contractors ?? []) as TopContractor[]
    for (const r of rows) m.set(r.contractor, r.slug)
    return m
  }, [analytics])

  const rows = useMemo(() => matrix.map((r, i) => ({ id: `${i}`, ...r })), [matrix])

  if (!rows.length) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-[var(--color-text-muted)]">No pairing data available.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 text-sm text-[var(--color-text-muted)]">
        Preferred-partner patterns between developers and their build teams. Akaysha × CPP (5 projects, both EPC + BoP)
        is the standout relationship.
      </div>

      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">All developer-contractor pairings ({rows.length})</h2>
        <DataTable
          rows={rows}
          columns={[
            {
              key: 'developer',
              label: 'Developer',
              render: (v) => <span>{truncate(String(v ?? ''), 35)}</span>,
            },
            {
              key: 'contractor',
              label: 'Contractor',
              render: (_v, row) => {
                const slug = slugByName.get(row.contractor)
                const display = truncate(row.contractor, 35)
                if (!slug) return <span>{display}</span>
                return (
                  <Link
                    to={`/contractors/${slug}`}
                    className="text-[var(--color-primary)] hover:underline"
                  >
                    {display}
                  </Link>
                )
              },
            },
            { key: 'projects', label: 'Projects', format: 'integer', aggregator: 'sum' },
            { key: 'mw', label: 'MW', format: 'number0', aggregator: 'sum' },
            {
              key: 'roles',
              label: 'Roles',
              sortable: false,
              render: (_v, row) => <RolePills roles={row.roles} />,
            },
          ]}
          showRowNumbers
          showTotals
          defaultSort={{ key: 'projects', dir: 'desc' }}
          csvFilename="dev-contractor-pairings"
          csvColumns={['developer', 'contractor', 'projects', 'mw']}
        />
      </section>
    </div>
  )
}

// =====================================================================
// Directory card
// =====================================================================

function ContractorCard({ contractor }: { contractor: { slug: string; name: string; project_count: number; total_capacity_mw: number; roles: ContractorRole[]; by_technology: Partial<Record<Technology, number>>; states: string[] } }) {
  const techs = Object.entries(contractor.by_technology)
    .sort(([, a], [, b]) => (b as number) - (a as number))

  return (
    <Link
      to={`/contractors/${contractor.slug}`}
      className="block bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 hover:border-[var(--color-primary)]/30 transition-all hover:bg-[var(--color-bg-card)]/80 active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-[var(--color-text)] leading-tight">
          {contractor.name}
        </h3>
        <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0">
          {contractor.project_count} project{contractor.project_count !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Role badges */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        {contractor.roles.map((role) => {
          const config = CONTRACTOR_ROLE_CONFIG[role]
          return (
            <span
              key={role}
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: `${config.color}15`, color: config.color }}
            >
              {config.label}
            </span>
          )
        })}
      </div>

      {/* Tech breakdown pills */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {techs.map(([tech, count]) => {
          const config = TECHNOLOGY_CONFIG[tech as Technology]
          if (!config) return null
          return (
            <span
              key={tech}
              className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: `${config.color}15`, color: config.color }}
            >
              {config.icon} {count}
            </span>
          )
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
        <span className="font-medium text-[var(--color-text)]">
          {formatMW(contractor.total_capacity_mw)}
        </span>
        <span className="truncate max-w-[140px]">{contractor.states.join(', ')}</span>
      </div>
    </Link>
  )
}
