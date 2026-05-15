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
} from 'recharts'
import { useOfftakerIndex } from '../hooks/useOfftakerData'
import {
  TECHNOLOGY_CONFIG,
  OFFTAKE_TYPE_CONFIG,
  STATUS_CONFIG,
  type Technology,
  type State,
  type ProjectStatus,
  type OfftakeType,
} from '../lib/types'
import DataProvenance from '../components/common/DataProvenance'
import DataTable from '../components/common/DataTable'
import ChartFrame from '../components/common/ChartFrame'
import { fetchOfftakeAnalytics } from '../lib/dataService'

type SortKey = 'capacity' | 'projects' | 'name'
type TabId = 'overview' | 'buyers' | 'pairings' | 'types' | 'uncontracted' | 'directory'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'buyers', label: 'Top Buyers' },
  { id: 'pairings', label: 'Developer × Offtaker' },
  { id: 'types', label: 'Offtake Types' },
  { id: 'uncontracted', label: 'Uncontracted' },
  { id: 'directory', label: 'Directory' },
]

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

const TYPE_EXPLAINER: Record<string, string> = {
  PPA: 'Standard long-term power purchase — utility-to-utility or utility-to-project.',
  corporate_ppa: 'Direct or sleeved PPAs to corporate buyers (data centres, mining, retail).',
  government_ppa: 'Contracts for Difference / feed-in tariffs from state/ACT government auctions.',
  tolling: 'Fixed capacity-based payment structures — rare outside batteries.',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OfftakeAnalytics = any

function parseMulti<T extends string>(raw: string | null): T[] {
  if (!raw) return []
  return raw.split(',').filter(Boolean) as T[]
}

function formatMW(mw: number): string {
  if (mw >= 1000) return `${(mw / 1000).toFixed(1)} GW`
  return `${Math.round(mw)} MW`
}

function CategoryPill({ category }: { category: string }) {
  const cfg = CATEGORY_CONFIG[category as BuyerCategory] ?? CATEGORY_CONFIG.other
  return (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap"
      style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}
    >
      {cfg.label}
    </span>
  )
}

export default function OfftakerList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('capacity')
  const [sortDesc, setSortDesc] = useState(true)
  const { data, loading } = useOfftakerIndex()
  const navigate = useNavigate()

  const [analytics, setAnalytics] = useState<OfftakeAnalytics | null>(null)

  useEffect(() => {
    fetchOfftakeAnalytics().then(setAnalytics).catch(() => setAnalytics(null))
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
    let result = [...data.offtakers]

    if (query) {
      const q = query.toLowerCase()
      result = result.filter((o) => o.name.toLowerCase().includes(q))
    }
    if (stateFilters.length) {
      result = result.filter((o) => o.states.some((s) => stateFilters.includes(s as State)))
    }
    if (techFilters.length) {
      result = result.filter((o) => techFilters.some((t) => o.by_technology[t]))
    }
    if (statusFilters.length) {
      result = result.filter((o) => statusFilters.some((s) => o.by_status[s]))
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
        <div className="text-sm text-[var(--color-text-muted)] animate-pulse">Loading offtakers...</div>
      </div>
    )
  }

  function toggleFilter(key: string, value: string) {
    const sp = new URLSearchParams(searchParams)
    const current = sp.get(key) || ''
    const values = current ? current.split(',').filter(Boolean) : []
    const idx = values.indexOf(value)
    if (idx >= 0) {
      values.splice(idx, 1)
    } else {
      values.push(value)
    }
    if (values.length > 0) {
      sp.set(key, values.join(','))
    } else {
      sp.delete(key)
    }
    setSearchParams(sp)
  }

  function isFilterActive(key: string, value: string): boolean {
    const raw = searchParams.get(key) || ''
    return raw.split(',').includes(value)
  }

  const activeFilters = [stateFilters.length > 0, techFilters.length > 0, statusFilters.length > 0].filter(Boolean).length
  const totalOfftakersAll = data?.offtakers.length ?? 0
  const totalCapacityAll = data?.offtakers.reduce((s, o) => s + o.total_capacity_mw, 0) ?? 0

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-[var(--color-text)] mb-1">
          Offtakers & PPAs
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          {totalOfftakersAll} offtaker{totalOfftakersAll !== 1 ? 's' : ''} · {formatMW(totalCapacityAll)} total project capacity
        </p>
        <div className="mt-3">
          <DataProvenance page="offtakers" />
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
      {tab === 'buyers' && <BuyersTab analytics={analytics} />}
      {tab === 'pairings' && <PairingsTab analytics={analytics} />}
      {tab === 'types' && <TypesTab analytics={analytics} />}
      {tab === 'uncontracted' && <UncontractedTab analytics={analytics} />}

      {tab === 'directory' && data && (
        <>
          {/* Top Offtakers Quick Buttons */}
          {data.offtakers.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] w-12">
                  Top
                </span>
                {[...data.offtakers]
                  .sort((a, b) => b.project_count - a.project_count)
                  .slice(0, 8)
                  .map((o) => (
                    <Link
                      key={o.slug}
                      to={`/offtakers/${o.slug}`}
                      className="text-xs px-2.5 py-1 rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)] transition-colors"
                    >
                      {o.name} <span className="opacity-60">{o.project_count}</span>
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
              placeholder="Search offtakers..."
              className="flex-1 min-w-[200px] max-w-md px-3 py-2 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/50 focus:outline-none focus:border-[var(--color-primary)]/50"
            />
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) navigate(`/offtakers/${e.target.value}`)
              }}
              className="px-3 py-2 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]/50 max-w-[220px]"
            >
              <option value="">Jump to offtaker...</option>
              {[...data.offtakers]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((o) => (
                  <option key={o.slug} value={o.slug}>
                    {o.name} ({o.project_count})
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

          {/* Offtaker Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filtered.map((offtaker) => (
              <OfftakerCard key={offtaker.slug} offtaker={offtaker} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-lg text-[var(--color-text-muted)]">No offtakers match your filters</p>
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

function OverviewTab({ analytics }: { analytics: OfftakeAnalytics | null }) {
  const summary = analytics?.summary
  const types = analytics?.types
  const uncontracted = analytics?.uncontracted_operating ?? []

  const categoryChartData = useMemo(() => {
    const byCat = summary?.by_category ?? {}
    return (Object.entries(byCat) as Array<[string, { offtakes: number; projects: number; mw: number }]>)
      .map(([key, v]) => ({
        category: CATEGORY_CONFIG[key as BuyerCategory]?.label ?? key,
        mw: v?.mw ?? 0,
        offtakes: v?.offtakes ?? 0,
        projects: v?.projects ?? 0,
        color: CATEGORY_CONFIG[key as BuyerCategory]?.color ?? '#6b7280',
      }))
      .filter((d) => d.mw > 0)
      .sort((a, b) => b.mw - a.mw)
  }, [summary])

  const typeRows = useMemo(() => {
    if (!types) return []
    return (Object.entries(types) as Array<[string, {
      count: number; parties: number; projects: number;
      avg_tenor_years: number | null; avg_price_aud_per_mwh: number | null;
      price_coverage: number | null;
    }]>).map(([key, v]) => ({
      type: key,
      count: v.count,
      parties: v.parties,
      projects: v.projects,
      avg_tenor_years: v.avg_tenor_years,
      avg_price_aud_per_mwh: v.avg_price_aud_per_mwh,
      price_coverage: v.price_coverage,
    }))
  }, [types])

  if (!summary) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-[var(--color-text-muted)]">
          Offtake analytics data not available. Run the exporter and refresh.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Offtakes" value={`${summary.total_offtakes ?? 0}`} sub="contract records" />
        <StatCard label="Distinct Buyers" value={`${summary.total_buyers ?? 0}`} sub="unique offtake parties" />
        <StatCard label="Projects Contracted" value={`${summary.total_projects_contracted ?? 0}`} sub="with known offtake" />
        <StatCard label="Uncontracted Operating" value={`${uncontracted.length}`} sub="no known contract" />
      </div>

      {/* Market share by buyer category */}
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Market share by buyer category</h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Contracted project MW attributed to each offtake buyer category.
          </p>
        </div>
        <ChartFrame
          title="Market share by buyer category"
          height={280}
          data={categoryChartData}
          csvFilename="offtake-category-mw"
          csvColumns={['category', 'offtakes', 'projects', 'mw']}
        >
          <BarChart data={categoryChartData} layout="vertical" margin={{ top: 10, right: 30, bottom: 10, left: 90 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis type="number" stroke="#9ca3af" fontSize={11} />
            <YAxis type="category" dataKey="category" stroke="#9ca3af" fontSize={11} width={90} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: '#f1f5f9',
                fontSize: 13,
              }}
              formatter={(value) => [`${Number(value).toLocaleString()} MW`, 'Contracted']}
            />
            <Bar dataKey="mw" radius={[0, 4, 4, 0]}>
              {categoryChartData.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ChartFrame>
      </section>

      {/* Offtake types at a glance */}
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Offtake types at a glance</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Summary stats by contract type. Tenor and price are averages over records that disclose them.
        </p>
        <DataTable
          rows={typeRows}
          columns={[
            {
              key: 'type',
              label: 'Type',
              render: (v) => {
                const cfg = OFFTAKE_TYPE_CONFIG[v as OfftakeType]
                return cfg ? (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}
                  >
                    {cfg.label}
                  </span>
                ) : (
                  <span>{String(v)}</span>
                )
              },
            },
            { key: 'count', label: 'Count', format: 'integer', aggregator: 'sum' },
            { key: 'parties', label: 'Parties', format: 'integer' },
            { key: 'projects', label: 'Projects', format: 'integer', aggregator: 'sum' },
            { key: 'avg_tenor_years', label: 'Avg tenor (y)', format: 'number1' },
            { key: 'avg_price_aud_per_mwh', label: 'Avg price ($/MWh)', format: 'number0' },
            { key: 'price_coverage', label: 'Price coverage', format: 'percent0' },
          ]}
          showRowNumbers={false}
          showTotals
          defaultSort={{ key: 'count', dir: 'desc' }}
          csvFilename="offtake-types"
        />
      </section>
    </div>
  )
}

// =====================================================================
// Top Buyers tab
// =====================================================================

interface TopBuyerRow {
  party: string
  slug: string
  category: string
  offtakes: number
  projects: number
  mw_project_total: number
  mw_contracted: number | null
  avg_tenor_years: number | null
  avg_price_aud_per_mwh: number | null
  by_technology: Record<string, number>
}

function BuyersTab({ analytics }: { analytics: OfftakeAnalytics | null }) {
  const rows = (analytics?.top_buyers ?? []) as TopBuyerRow[]

  if (!rows.length) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-[var(--color-text-muted)]">No buyer data available.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">All buyers ({rows.length})</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Every known offtake buyer in the NEM, ranked by number of offtake contracts.
        </p>
        <DataTable
          rows={rows}
          columns={[
            {
              key: 'party',
              label: 'Buyer',
              render: (_v, row) => (
                <Link
                  to={`/offtakers/${row.slug}`}
                  className="text-[var(--color-primary)] hover:underline"
                >
                  {row.party}
                </Link>
              ),
            },
            {
              key: 'category',
              label: 'Category',
              render: (v) => <CategoryPill category={String(v)} />,
            },
            { key: 'offtakes', label: 'Offtakes', format: 'number0', aggregator: 'sum' },
            { key: 'projects', label: 'Projects', format: 'number0', aggregator: 'sum' },
            { key: 'mw_project_total', label: 'Project MW total', format: 'number0', aggregator: 'sum' },
            { key: 'mw_contracted', label: 'Contracted MW', format: 'number0' },
            { key: 'avg_tenor_years', label: 'Avg tenor (y)', format: 'number1' },
            { key: 'avg_price_aud_per_mwh', label: 'Avg price ($/MWh)', format: 'number0' },
            {
              key: 'by_technology',
              label: 'Top technologies',
              sortable: false,
              render: (_v, row) => {
                const entries = Object.entries(row.by_technology || {})
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .slice(0, 2)
                return (
                  <span className="flex gap-1 flex-wrap">
                    {entries.map(([tech, count]) => {
                      const cfg = TECHNOLOGY_CONFIG[tech as Technology]
                      if (!cfg) return (
                        <span key={tech} className="text-[10px] text-[var(--color-text-muted)]">
                          {tech} {count as number}
                        </span>
                      )
                      return (
                        <span
                          key={tech}
                          className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}
                        >
                          {cfg.icon} {count as number}
                        </span>
                      )
                    })}
                  </span>
                )
              },
            },
          ]}
          showRowNumbers
          showTotals
          defaultSort={{ key: 'offtakes', dir: 'desc' }}
          csvFilename="top-buyers"
          csvColumns={['party', 'category', 'offtakes', 'projects', 'mw_project_total', 'mw_contracted', 'avg_tenor_years', 'avg_price_aud_per_mwh']}
        />
      </section>
    </div>
  )
}

// =====================================================================
// Developer × Offtaker tab
// =====================================================================

interface PairingRow {
  developer: string
  offtaker: string
  offtakes: number
  projects: number
  mw: number
}

function PairingsTab({ analytics }: { analytics: OfftakeAnalytics | null }) {
  const matrix = (analytics?.dev_offtaker_matrix ?? []) as PairingRow[]
  const buyersBySlug = useMemo(() => {
    const m = new Map<string, string>()
    const tb = (analytics?.top_buyers ?? []) as Array<{ party: string; slug: string }>
    for (const b of tb) m.set(b.party, b.slug)
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
        The most active developer-offtaker relationships in the NEM. Strong repeated pairings
        (eg Neoen × Snowy Hydro, Tilt Renewables × AGL) suggest preferred-partner dynamics.
      </div>

      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Developer-Offtaker pairings</h2>
        <DataTable
          rows={rows}
          columns={[
            {
              key: 'developer',
              label: 'Developer',
              render: (v) => {
                const s = String(v ?? '')
                return <span>{s.length > 30 ? s.slice(0, 29) + '…' : s}</span>
              },
            },
            {
              key: 'offtaker',
              label: 'Offtaker',
              render: (_v, row) => {
                const slug = buyersBySlug.get(row.offtaker)
                if (!slug) return <span>{row.offtaker}</span>
                return (
                  <Link
                    to={`/offtakers/${slug}`}
                    className="text-[var(--color-primary)] hover:underline"
                  >
                    {row.offtaker}
                  </Link>
                )
              },
            },
            { key: 'offtakes', label: 'Offtakes', format: 'number0', aggregator: 'sum' },
            { key: 'projects', label: 'Projects', format: 'number0', aggregator: 'sum' },
            { key: 'mw', label: 'MW', format: 'number0', aggregator: 'sum' },
          ]}
          showRowNumbers
          showTotals
          defaultSort={{ key: 'offtakes', dir: 'desc' }}
          csvFilename="dev-offtaker-pairings"
          csvColumns={['developer', 'offtaker', 'offtakes', 'projects', 'mw']}
        />
      </section>
    </div>
  )
}

// =====================================================================
// Offtake Types tab
// =====================================================================

interface TypeEntry {
  count: number
  parties: number
  projects: number
  mw_contracted: number | null
  avg_tenor_years: number | null
  avg_price_aud_per_mwh: number | null
}

function TypesTab({ analytics }: { analytics: OfftakeAnalytics | null }) {
  const types = (analytics?.types ?? {}) as Record<string, TypeEntry>
  const typeKeys: Array<keyof typeof TYPE_EXPLAINER> = ['PPA', 'corporate_ppa', 'government_ppa', 'tolling']

  const tenorChart = useMemo(() => {
    return typeKeys
      .map((k) => {
        const cfg = OFFTAKE_TYPE_CONFIG[k as OfftakeType]
        return {
          type: cfg?.label ?? k,
          avg_tenor: types[k]?.avg_tenor_years ?? 0,
          color: cfg?.color ?? '#6b7280',
        }
      })
      .filter((d) => d.avg_tenor > 0)
  }, [types])

  if (!Object.keys(types).length) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-[var(--color-text-muted)]">No type-level data available.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {typeKeys.map((k) => {
          const cfg = OFFTAKE_TYPE_CONFIG[k as OfftakeType]
          const t = types[k]
          if (!t) return null
          return (
            <div
              key={k}
              className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: `${cfg?.color ?? '#6b7280'}20`, color: cfg?.color ?? '#6b7280' }}
                >
                  {cfg?.label ?? k}
                </span>
              </div>
              <div
                className="text-4xl font-bold"
                style={{ color: cfg?.color ?? 'var(--color-text)' }}
              >
                {t.count}
              </div>
              <div className="text-xs text-[var(--color-text-muted)] mt-0.5">offtake records</div>

              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <div className="text-[var(--color-text-muted)]">Parties</div>
                  <div className="text-[var(--color-text)] font-medium">{t.parties ?? '—'}</div>
                </div>
                <div>
                  <div className="text-[var(--color-text-muted)]">Projects</div>
                  <div className="text-[var(--color-text)] font-medium">{t.projects ?? '—'}</div>
                </div>
                <div>
                  <div className="text-[var(--color-text-muted)]">Avg tenor</div>
                  <div className="text-[var(--color-text)] font-medium">
                    {t.avg_tenor_years != null ? `${t.avg_tenor_years.toFixed(1)} y` : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[var(--color-text-muted)]">Avg price</div>
                  <div className="text-[var(--color-text)] font-medium">
                    {t.avg_price_aud_per_mwh != null ? `$${Math.round(t.avg_price_aud_per_mwh)}/MWh` : '—'}
                  </div>
                </div>
                {t.mw_contracted != null && (
                  <div className="col-span-2">
                    <div className="text-[var(--color-text-muted)]">MW contracted</div>
                    <div className="text-[var(--color-text)] font-medium">{formatMW(t.mw_contracted)}</div>
                  </div>
                )}
              </div>

              <p className="text-xs text-[var(--color-text-muted)] mt-4 leading-relaxed">
                {TYPE_EXPLAINER[k]}
              </p>
            </div>
          )
        })}
      </div>

      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Average tenor by contract type</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Weighted-average tenor in years, over records with a disclosed term.
        </p>
        <ChartFrame
          title="Avg tenor by type"
          height={260}
          data={tenorChart}
          csvFilename="offtake-avg-tenor"
          csvColumns={['type', 'avg_tenor']}
        >
          <BarChart data={tenorChart} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="type" stroke="#9ca3af" fontSize={11} />
            <YAxis stroke="#9ca3af" fontSize={11} label={{ value: 'Years', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: '#f1f5f9',
                fontSize: 13,
              }}
              formatter={(value) => [`${Number(value).toFixed(1)} years`, 'Avg tenor']}
            />
            <Bar dataKey="avg_tenor" radius={[4, 4, 0, 0]}>
              {tenorChart.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ChartFrame>
      </section>
    </div>
  )
}

// =====================================================================
// Uncontracted tab
// =====================================================================

interface UncontractedRow {
  project_id: string
  name: string
  technology: string
  state: string
  capacity_mw: number
  developer: string | null
  capacity_factor_pct: number | null
  revenue_per_mw: number | null
}

function UncontractedTab({ analytics }: { analytics: OfftakeAnalytics | null }) {
  const rows = (analytics?.uncontracted_operating ?? []) as UncontractedRow[]
  const totalMw = rows.reduce((s, r) => s + (r.capacity_mw || 0), 0)

  if (!rows.length) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-[var(--color-text-muted)]">No uncontracted operating projects found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 text-sm text-[var(--color-text-muted)] leading-relaxed">
        <strong className="text-[var(--color-text)]">Operating projects without a known offtake contract</strong>{' '}
        — these may be fully merchant, contracted but undisclosed, or at risk of revenue pressure.{' '}
        <strong className="text-[var(--color-text)]">{rows.length}</strong> projects,{' '}
        <strong className="text-[var(--color-text)]">{(totalMw / 1000).toFixed(1)} GW</strong> total capacity.
        Cross-reference: click any project name to see its revenue / performance data.
      </div>

      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Uncontracted operating projects</h2>
        <DataTable
          rows={rows}
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
              render: (v) => {
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
            { key: 'state', label: 'State' },
            { key: 'capacity_mw', label: 'MW', format: 'number0', aggregator: 'sum' },
            {
              key: 'developer',
              label: 'Developer',
              render: (v) => {
                const s = v ? String(v) : '—'
                return <span>{s.length > 30 ? s.slice(0, 29) + '…' : s}</span>
              },
            },
            { key: 'capacity_factor_pct', label: 'CF%', format: 'percent1' },
            { key: 'revenue_per_mw', label: 'Revenue/MW', format: 'currency0' },
          ]}
          showRowNumbers
          showTotals
          defaultSort={{ key: 'capacity_mw', dir: 'desc' }}
          csvFilename="uncontracted-operating"
          csvColumns={['project_id', 'name', 'technology', 'state', 'capacity_mw', 'developer', 'capacity_factor_pct', 'revenue_per_mw']}
        />
      </section>
    </div>
  )
}

// =====================================================================
// Directory card
// =====================================================================

function OfftakerCard({ offtaker }: { offtaker: { slug: string; name: string; project_count: number; total_capacity_mw: number; types: OfftakeType[]; by_technology: Partial<Record<Technology, number>>; states: string[] } }) {
  const techs = Object.entries(offtaker.by_technology)
    .sort(([, a], [, b]) => (b as number) - (a as number))

  return (
    <Link
      to={`/offtakers/${offtaker.slug}`}
      className="block bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 hover:border-[var(--color-primary)]/30 transition-all hover:bg-[var(--color-bg-card)]/80 active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-[var(--color-text)] leading-tight">
          {offtaker.name}
        </h3>
        <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0">
          {offtaker.project_count} project{offtaker.project_count !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Type badges */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        {offtaker.types.map((type) => {
          const config = OFFTAKE_TYPE_CONFIG[type]
          return (
            <span
              key={type}
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
          {formatMW(offtaker.total_capacity_mw)}
        </span>
        <span className="truncate max-w-[140px]">{offtaker.states.join(', ')}</span>
      </div>
    </Link>
  )
}
