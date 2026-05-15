import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { useOEMIndex } from '../hooks/useOEMData'
import {
  TECHNOLOGY_CONFIG,
  OEM_ROLE_CONFIG,
  STATUS_CONFIG,
  type Technology,
  type State,
  type ProjectStatus,
  type OEMRole,
  type OEMProfile,
} from '../lib/types'
import DataProvenance from '../components/common/DataProvenance'
import DataTable, { type Column } from '../components/common/DataTable'
import ChartFrame from '../components/common/ChartFrame'
import { fetchOEMAnalytics, fetchBESSCapex } from '../lib/dataService'
import type { BESSCapexData, BESSCapexOEMSummary } from '../lib/types'

type SortKey = 'capacity' | 'projects' | 'name'
type TabId = 'overview' | 'wind' | 'solar' | 'bess' | 'hydro' | 'directory'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'wind', label: 'Wind' },
  { id: 'solar', label: 'Solar' },
  { id: 'bess', label: 'BESS' },
  { id: 'hydro', label: 'Hydro' },
  { id: 'directory', label: 'Directory' },
]

const CONCENTRATION_ROLES = [
  { key: 'wind_oem', label: 'Wind', tech: 'wind' as const },
  { key: 'solar_oem', label: 'Solar (Panels)', tech: 'solar' as const },
  { key: 'inverter', label: 'Inverters', tech: 'solar' as const },
  { key: 'bess_oem', label: 'BESS', tech: 'bess' as const },
  { key: 'hydro_oem', label: 'Hydro', tech: 'pumped_hydro' as const },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OEMAnalytics = any

function parseMulti<T extends string>(raw: string | null): T[] {
  if (!raw) return []
  return raw.split(',').filter(Boolean) as T[]
}

function formatMW(mw: number): string {
  if (mw >= 1000) return `${(mw / 1000).toFixed(1)} GW`
  return `${Math.round(mw)} MW`
}

function hhiColor(hhi: number): string {
  if (hhi < 1500) return '#22c55e' // green — competitive
  if (hhi < 2500) return '#f59e0b' // amber — moderate
  return '#ef4444' // red — concentrated
}

function hhiBand(hhi: number): string {
  if (hhi < 1500) return 'Competitive'
  if (hhi < 2500) return 'Moderate'
  return 'Highly concentrated'
}

export default function OEMList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('capacity')
  const [sortDesc, setSortDesc] = useState(true)
  const { data, loading } = useOEMIndex()
  const navigate = useNavigate()

  const [analytics, setAnalytics] = useState<OEMAnalytics | null>(null)
  const [bessCapex, setBessCapex] = useState<BESSCapexData | null>(null)

  useEffect(() => {
    fetchOEMAnalytics().then(setAnalytics).catch(() => setAnalytics(null))
    fetchBESSCapex().then(setBessCapex).catch(() => setBessCapex(null))
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
    let result = [...data.oems]

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
        <div className="text-sm text-[var(--color-text-muted)] animate-pulse">Loading OEMs...</div>
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
  const totalOemsAll = data?.oems.length ?? 0
  const totalCapacityAll = data?.oems.reduce((s, o) => s + o.total_capacity_mw, 0) ?? 0

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-[var(--color-text)] mb-1">
          Equipment Suppliers (OEMs)
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          {totalOemsAll} OEM{totalOemsAll !== 1 ? 's' : ''} · {formatMW(totalCapacityAll)} total project capacity
        </p>
        <div className="mt-3">
          <DataProvenance page="oems" />
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
      {tab === 'overview' && data && (
        <OverviewTab analytics={analytics} oems={data.oems} />
      )}

      {tab === 'wind' && data && (
        <WindTab oems={data.oems} analytics={analytics} stateFilters={stateFilters} statusFilters={statusFilters} navigate={navigate} />
      )}

      {tab === 'solar' && data && (
        <SolarTab oems={data.oems} analytics={analytics} stateFilters={stateFilters} statusFilters={statusFilters} navigate={navigate} />
      )}

      {tab === 'bess' && data && (
        <BessTab oems={data.oems} analytics={analytics} bessCapex={bessCapex} stateFilters={stateFilters} statusFilters={statusFilters} navigate={navigate} />
      )}

      {tab === 'hydro' && data && (
        <HydroTab oems={data.oems} analytics={analytics} stateFilters={stateFilters} statusFilters={statusFilters} navigate={navigate} />
      )}

      {tab === 'directory' && data && (
        <>
          {/* Top OEMs Quick Buttons */}
          {data.oems.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] w-12">
                  Top
                </span>
                {[...data.oems]
                  .sort((a, b) => b.project_count - a.project_count)
                  .slice(0, 8)
                  .map((oem) => (
                    <Link
                      key={oem.slug}
                      to={`/oems/${oem.slug}`}
                      className="text-xs px-2.5 py-1 rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)] transition-colors"
                    >
                      {oem.name} <span className="opacity-60">{oem.project_count}</span>
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
              placeholder="Search OEMs..."
              className="flex-1 min-w-[200px] max-w-md px-3 py-2 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/50 focus:outline-none focus:border-[var(--color-primary)]/50"
            />
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) navigate(`/oems/${e.target.value}`)
              }}
              className="px-3 py-2 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]/50 max-w-[220px]"
            >
              <option value="">Jump to OEM...</option>
              {[...data.oems]
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

          {/* OEM Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filtered.map((oem) => (
              <OEMCard key={oem.slug} oem={oem} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-lg text-[var(--color-text-muted)]">No OEMs match your filters</p>
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

function OverviewTab({ analytics, oems }: { analytics: OEMAnalytics | null; oems: OEMProfile[] }) {
  const concentration = analytics?.concentration ?? null

  // Stats
  const stats = useMemo(() => {
    if (!concentration) {
      return {
        uniqueOems: oems.length,
        totalGW: oems.reduce((s, o) => s + o.total_capacity_mw, 0) / 1000,
        mostConcentrated: null as null | { label: string; hhi: number },
        leastConcentrated: null as null | { label: string; hhi: number },
      }
    }

    const uniqueSuppliers = new Set<string>()
    let totalMw = 0
    let most: { label: string; hhi: number } | null = null
    let least: { label: string; hhi: number } | null = null

    for (const role of CONCENTRATION_ROLES) {
      const c = concentration[role.key]
      if (!c) continue
      totalMw += c.total_mw ?? 0
      for (const t of c.top3 ?? []) uniqueSuppliers.add(t.supplier)
      if (most === null || c.hhi_mw > most.hhi) most = { label: role.label, hhi: c.hhi_mw }
      if (least === null || c.hhi_mw < least.hhi) least = { label: role.label, hhi: c.hhi_mw }
    }

    return {
      uniqueOems: oems.length, // full set incl. non-ranked
      totalGW: totalMw / 1000,
      mostConcentrated: most,
      leastConcentrated: least,
    }
  }, [concentration, oems])

  const hhiChartData = useMemo(() => {
    if (!concentration) return []
    return CONCENTRATION_ROLES.map((r) => ({
      role: r.label,
      hhi: concentration[r.key]?.hhi_mw ?? 0,
      color: hhiColor(concentration[r.key]?.hhi_mw ?? 0),
    })).filter((d) => d.hhi > 0)
  }, [concentration])

  const top3Rows = useMemo(() => {
    if (!concentration) return []
    return CONCENTRATION_ROLES.map((r) => {
      const c = concentration[r.key]
      if (!c) return null
      const [a, b, cc] = c.top3 ?? []
      return {
        role: r.label,
        role_key: r.key,
        top1: a ? `${a.supplier} (${formatMW(a.mw)})` : '—',
        top2: b ? `${b.supplier} (${formatMW(b.mw)})` : '—',
        top3: cc ? `${cc.supplier} (${formatMW(cc.mw)})` : '—',
        top3_share: c.top3_share_mw_pct ?? 0,
        oem_count: c.total_oems ?? 0,
      }
    }).filter(Boolean) as Array<{
      role: string; role_key: string; top1: string; top2: string; top3: string;
      top3_share: number; oem_count: number
    }>
  }, [concentration])

  const pairingRows = useMemo(() => {
    const devs = analytics?.developers as Record<string, Array<{
      developer: string; project_count: number; total_mw: number; technologies: string[]; statuses: string[]
    }>> | undefined
    if (!devs) return []
    const flat: Array<{
      id: string; oem: string; developer: string; project_count: number; total_mw: number; technologies: string[]
    }> = []
    for (const [oemName, list] of Object.entries(devs)) {
      for (const d of list) {
        flat.push({
          id: `${oemName}::${d.developer}`,
          oem: oemName,
          developer: d.developer,
          project_count: d.project_count,
          total_mw: d.total_mw,
          technologies: d.technologies ?? [],
        })
      }
    }
    flat.sort((a, b) => b.project_count - a.project_count || b.total_mw - a.total_mw)
    return flat.slice(0, 20)
  }, [analytics])

  if (!concentration) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-[var(--color-text-muted)]">
          OEM analytics data not available. Run the exporter and refresh.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total OEMs" value={`${stats.uniqueOems}`} sub="across 5 equipment roles" />
        <StatCard label="Total Capacity Covered" value={`${stats.totalGW.toFixed(1)} GW`} sub="aggregated across roles" />
        <StatCard
          label="Most Concentrated"
          value={stats.mostConcentrated ? `${stats.mostConcentrated.label}` : '—'}
          sub={stats.mostConcentrated ? `HHI ${stats.mostConcentrated.hhi.toLocaleString()}` : ''}
          accent={stats.mostConcentrated ? hhiColor(stats.mostConcentrated.hhi) : undefined}
        />
        <StatCard
          label="Lowest Concentration"
          value={stats.leastConcentrated ? `${stats.leastConcentrated.label}` : '—'}
          sub={stats.leastConcentrated ? `HHI ${stats.leastConcentrated.hhi.toLocaleString()}` : ''}
          accent={stats.leastConcentrated ? hhiColor(stats.leastConcentrated.hhi) : undefined}
        />
      </div>

      {/* HHI chart */}
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Market Concentration (HHI)</h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            HHI = Herfindahl-Hirschman Index: 0 = perfect competition, 10,000 = monopoly. Above 2,500 = highly concentrated.
          </p>
        </div>
        <ChartFrame title="HHI by OEM role" height={260} data={hhiChartData} csvFilename="oem-hhi" csvColumns={['role', 'hhi']}>
          <BarChart data={hhiChartData} layout="vertical" margin={{ top: 10, right: 30, bottom: 10, left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis type="number" domain={[0, 10000]} stroke="#9ca3af" fontSize={11} />
            <YAxis type="category" dataKey="role" stroke="#9ca3af" fontSize={11} width={80} />
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
      </section>

      {/* Top 3 per Role table */}
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Top 3 per Equipment Type</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Leading OEMs by installed MW in each equipment role, with the combined top-3 market share.
        </p>
        <DataTable
          rows={top3Rows}
          columns={[
            { key: 'role', label: 'Role' },
            { key: 'top1', label: '#1', sortable: false },
            { key: 'top2', label: '#2', sortable: false },
            { key: 'top3', label: '#3', sortable: false },
            { key: 'top3_share', label: 'Top-3 Share', format: 'percent1' },
            { key: 'oem_count', label: '# OEMs', format: 'integer' },
          ]}
          showRowNumbers={false}
          showTotals={false}
          defaultSort={{ key: 'top3_share', dir: 'desc' }}
          csvFilename="oem-concentration"
        />
      </section>

      {/* Top developer-OEM pairings */}
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Most Active Developer-OEM Pairings</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Top 20 pairings by project count. Helps surface long-term supply relationships.
        </p>
        <DataTable
          rows={pairingRows}
          columns={[
            { key: 'oem', label: 'OEM' },
            { key: 'developer', label: 'Developer' },
            { key: 'project_count', label: 'Projects', format: 'integer', aggregator: 'sum' },
            { key: 'total_mw', label: 'MW', format: 'number0', aggregator: 'sum' },
            {
              key: 'technologies',
              label: 'Technologies',
              sortable: false,
              render: (_v, row) => (
                <span className="flex gap-1 flex-wrap">
                  {row.technologies.map((t: string) => {
                    const cfg = TECHNOLOGY_CONFIG[t as Technology]
                    if (!cfg) return <span key={t} className="text-[10px] text-[var(--color-text-muted)]">{t}</span>
                    return (
                      <span
                        key={t}
                        className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}
                      >
                        {cfg.icon} {cfg.label}
                      </span>
                    )
                  })}
                </span>
              ),
            },
          ]}
          showTotals
          defaultSort={{ key: 'project_count', dir: 'desc' }}
          csvFilename="oem-developer-pairings"
          csvColumns={['oem', 'developer', 'project_count', 'total_mw']}
        />
      </section>
    </div>
  )
}

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

// =====================================================================
// Per-technology OEM table row builder
// =====================================================================

interface TechOemRow {
  id: string
  slug: string
  name: string
  projects: number
  mw: number
  mwh?: number
  states: number
  models: string
  avg_cf?: number | null
  q1_pct?: number | null
  avg_composite?: number | null
}

function buildTechRows(
  oems: OEMProfile[],
  tech: Technology,
  analytics: OEMAnalytics | null,
  filterFn: (o: OEMProfile) => boolean = () => true,
): TechOemRow[] {
  const perf = (analytics?.performance ?? {}) as Record<string, {
    avg_cf?: number; q1_pct?: number; avg_composite?: number
  }>
  return oems
    .filter((o) => (o.by_technology[tech] ?? 0) > 0 && filterFn(o))
    .map((o) => {
      const p = perf[o.name]
      const modelsJoined = o.models.join(', ')
      return {
        id: o.slug,
        slug: o.slug,
        name: o.name,
        projects: o.by_technology[tech] ?? 0,
        mw: Math.round(o.total_capacity_mw),
        mwh: tech === 'bess' ? Math.round(o.total_storage_mwh) : undefined,
        states: o.states.length,
        models: modelsJoined.length > 60 ? modelsJoined.slice(0, 57) + '…' : modelsJoined,
        avg_cf: p?.avg_cf ?? null,
        q1_pct: p?.q1_pct ?? null,
        avg_composite: p?.avg_composite ?? null,
      }
    })
}

function oemLinkColumn(): Column<TechOemRow> {
  return {
    key: 'name',
    label: 'OEM',
    render: (_v, row) => (
      <Link
        to={`/oems/${row.slug}`}
        className="text-[var(--color-primary)] hover:underline"
      >
        {row.name}
      </Link>
    ),
  }
}

// =====================================================================
// Wind tab
// =====================================================================

function WindTab({
  oems,
  analytics,
  stateFilters,
  statusFilters,
  navigate,
}: {
  oems: OEMProfile[]
  analytics: OEMAnalytics | null
  stateFilters: State[]
  statusFilters: ProjectStatus[]
  navigate: (path: string) => void
}) {
  const rows = useMemo(() => buildTechRows(oems, 'wind', analytics), [oems, analytics])
  const wind = analytics?.concentration?.wind_oem

  return (
    <div className="space-y-6">
      {wind && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 text-sm text-[var(--color-text-muted)]">
          Wind OEM market is highly concentrated — Vestas, Goldwind and GE Vernova account for{' '}
          <strong className="text-[var(--color-text)]">{wind.top3_share_mw_pct?.toFixed(1) ?? '—'}%</strong>{' '}
          of installed MW. HHI = <strong className="text-[var(--color-text)]">{wind.hhi_mw?.toLocaleString()}</strong>
          {wind.hhi_mw > 2500 ? ', well above the 2,500 highly-concentrated threshold.' : '.'}
        </div>
      )}

      <WindMarketShare
        oems={oems}
        stateFilters={stateFilters}
        statusFilters={statusFilters}
        navigate={navigate}
      />

      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Top Wind OEMs</h2>
        <DataTable
          rows={rows}
          columns={[
            oemLinkColumn(),
            { key: 'projects', label: 'Projects', format: 'integer', aggregator: 'sum' },
            { key: 'mw', label: 'MW', format: 'number0', aggregator: 'sum' },
            { key: 'states', label: 'States', format: 'integer' },
            { key: 'models', label: 'Models', sortable: false, hideOnMobile: true },
            { key: 'avg_cf', label: 'Avg CF', format: 'percent1', aggregator: 'avg' },
            { key: 'q1_pct', label: 'Q1 Share', format: 'percent0' },
          ]}
          showTotals
          defaultSort={{ key: 'projects', dir: 'desc' }}
          csvFilename="top-wind-oems"
        />
      </section>
    </div>
  )
}

// =====================================================================
// Solar tab
// =====================================================================

function SolarTab({
  oems,
  analytics,
  stateFilters,
  statusFilters,
  navigate,
}: {
  oems: OEMProfile[]
  analytics: OEMAnalytics | null
  stateFilters: State[]
  statusFilters: ProjectStatus[]
  navigate: (path: string) => void
}) {
  const panelRows = useMemo(
    () => buildTechRows(oems, 'solar', analytics, (o) => o.roles.includes('solar_oem')),
    [oems, analytics],
  )
  const inverterRows = useMemo(
    () => buildTechRows(oems, 'solar', analytics, (o) => o.roles.includes('inverter')),
    [oems, analytics],
  )

  const solar = analytics?.concentration?.solar_oem

  return (
    <div className="space-y-6">
      {solar && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 text-sm text-[var(--color-text-muted)]">
          Solar panel market is more fragmented than wind — {solar.total_oems} panel OEMs,
          top 3 = <strong className="text-[var(--color-text)]">{solar.top3_share_mw_pct?.toFixed(1) ?? '—'}%</strong>{' '}
          of installed MW (HHI {solar.hhi_mw?.toLocaleString()}).
        </div>
      )}

      <SolarMarketShare
        oems={oems}
        stateFilters={stateFilters}
        statusFilters={statusFilters}
        navigate={navigate}
      />

      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-3">Panel OEMs</h2>
        <DataTable
          rows={panelRows}
          columns={[
            oemLinkColumn(),
            { key: 'projects', label: 'Projects', format: 'integer', aggregator: 'sum' },
            { key: 'mw', label: 'MW', format: 'number0', aggregator: 'sum' },
            { key: 'states', label: 'States', format: 'integer' },
            { key: 'models', label: 'Models', sortable: false, hideOnMobile: true },
          ]}
          showTotals
          defaultSort={{ key: 'projects', dir: 'desc' }}
          csvFilename="top-solar-panel-oems"
        />
      </section>

      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-3">Inverter OEMs</h2>
        <DataTable
          rows={inverterRows}
          columns={[
            oemLinkColumn(),
            { key: 'projects', label: 'Projects', format: 'integer', aggregator: 'sum' },
            { key: 'mw', label: 'MW', format: 'number0', aggregator: 'sum' },
            { key: 'states', label: 'States', format: 'integer' },
            { key: 'models', label: 'Models', sortable: false, hideOnMobile: true },
          ]}
          showTotals
          defaultSort={{ key: 'projects', dir: 'desc' }}
          csvFilename="top-solar-inverter-oems"
        />
      </section>
    </div>
  )
}

// =====================================================================
// BESS tab
// =====================================================================

function BessTab({
  oems,
  analytics,
  bessCapex,
  stateFilters,
  statusFilters,
  navigate,
}: {
  oems: OEMProfile[]
  analytics: OEMAnalytics | null
  bessCapex: BESSCapexData | null
  stateFilters: State[]
  statusFilters: ProjectStatus[]
  navigate: (path: string) => void
}) {
  const rows = useMemo(() => buildTechRows(oems, 'bess', analytics), [oems, analytics])

  const bess = analytics?.concentration?.bess_oem

  // $/kWh by OEM — prefer by_oem aggregation; fall back to computing from projects.
  const capexRows = useMemo(() => {
    if (!bessCapex) return []
    if (bessCapex.by_oem && Object.keys(bessCapex.by_oem).length > 0) {
      const out: Array<{
        id: string; oem: string; projects: number; mw: number;
        avg_per_mwh: number | null; min_per_mwh: number | null; max_per_mwh: number | null;
      }> = []
      for (const [oem, summary] of Object.entries(bessCapex.by_oem) as Array<[string, BESSCapexOEMSummary]>) {
        // min/max need to be computed from projects
        const projs = bessCapex.projects.filter((p) => p.bess_oem === oem && p.capex_per_mwh)
        const perMwhVals = projs.map((p) => p.capex_per_mwh).filter((v) => Number.isFinite(v))
        out.push({
          id: oem,
          oem,
          projects: summary.count,
          mw: summary.total_mw,
          avg_per_mwh: summary.avg_capex_per_mwh ?? null,
          min_per_mwh: perMwhVals.length ? Math.min(...perMwhVals) : null,
          max_per_mwh: perMwhVals.length ? Math.max(...perMwhVals) : null,
        })
      }
      return out.sort((a, b) => b.projects - a.projects)
    }
    // Fallback: compute from projects
    const bucket: Record<string, { oem: string; vals: number[]; mw: number }> = {}
    for (const p of bessCapex.projects) {
      if (!p.bess_oem || !p.capex_per_mwh) continue
      if (!bucket[p.bess_oem]) bucket[p.bess_oem] = { oem: p.bess_oem, vals: [], mw: 0 }
      bucket[p.bess_oem].vals.push(p.capex_per_mwh)
      bucket[p.bess_oem].mw += p.capacity_mw ?? 0
    }
    return Object.values(bucket).map((b) => ({
      id: b.oem,
      oem: b.oem,
      projects: b.vals.length,
      mw: b.mw,
      avg_per_mwh: b.vals.reduce((a, c) => a + c, 0) / b.vals.length,
      min_per_mwh: Math.min(...b.vals),
      max_per_mwh: Math.max(...b.vals),
    })).sort((a, b) => b.projects - a.projects)
  }, [bessCapex])

  return (
    <div className="space-y-6">
      {bess && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 text-sm text-[var(--color-text-muted)]">
          BESS market concentration — top 3 (Tesla, CATL, Fluence) hold{' '}
          <strong className="text-[var(--color-text)]">{bess.top3_share_mw_pct?.toFixed(1) ?? '—'}%</strong>{' '}
          of installed MW. HHI = {bess.hhi_mw?.toLocaleString()} — {hhiBand(bess.hhi_mw).toLowerCase()}.
        </div>
      )}

      <BESSMarketShare
        oems={oems}
        stateFilters={stateFilters}
        statusFilters={statusFilters}
        navigate={navigate}
      />

      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Top BESS OEMs</h2>
        <DataTable
          rows={rows}
          columns={[
            oemLinkColumn(),
            { key: 'projects', label: 'Projects', format: 'integer', aggregator: 'sum' },
            { key: 'mw', label: 'MW', format: 'number0', aggregator: 'sum' },
            { key: 'mwh', label: 'MWh', format: 'number0', aggregator: 'sum' },
            { key: 'states', label: 'States', format: 'integer' },
            { key: 'models', label: 'Models', sortable: false, hideOnMobile: true },
            { key: 'avg_composite', label: 'Avg Composite', format: 'number1', aggregator: 'avg' },
          ]}
          showTotals
          defaultSort={{ key: 'projects', dir: 'desc' }}
          csvFilename="top-bess-oems"
        />
      </section>

      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Capex by OEM ($/kWh)</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Computed from public capex disclosures. $/kWh reflects all-in capex divided by storage MWh.
        </p>
        <DataTable
          rows={capexRows}
          columns={[
            { key: 'oem', label: 'OEM' },
            { key: 'projects', label: 'Projects', format: 'integer', aggregator: 'sum' },
            { key: 'mw', label: 'MW', format: 'number0', aggregator: 'sum' },
            {
              key: 'avg_per_mwh',
              label: 'Avg $/kWh',
              align: 'right',
              aggregator: 'avg',
              render: (v) => (v == null ? '—' : `$${(Number(v) * 1000).toFixed(0)}`),
            },
            {
              key: 'min_per_mwh',
              label: 'Min $/kWh',
              align: 'right',
              render: (v) => (v == null ? '—' : `$${(Number(v) * 1000).toFixed(0)}`),
            },
            {
              key: 'max_per_mwh',
              label: 'Max $/kWh',
              align: 'right',
              render: (v) => (v == null ? '—' : `$${(Number(v) * 1000).toFixed(0)}`),
            },
          ]}
          showTotals
          defaultSort={{ key: 'projects', dir: 'desc' }}
          emptyMessage="No BESS capex data available"
          csvFilename="bess-capex-by-oem"
          csvColumns={['oem', 'projects', 'mw', 'avg_per_mwh', 'min_per_mwh', 'max_per_mwh']}
        />
      </section>

      <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <span className="text-amber-400 flex-shrink-0">ⓘ</span>
          <div className="text-sm">
            <div className="font-semibold text-[var(--color-text)] mb-0.5">Cell chemistry</div>
            <p className="text-[var(--color-text-muted)]">
              Verified from EIS documents for 34 operating / committed projects: <strong className="text-[var(--color-text)]">33 LFP, 1 NMC</strong>.
              Remainder awaiting EIS extraction.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// =====================================================================
// Hydro tab
// =====================================================================

function HydroTab({
  oems,
  analytics,
  stateFilters,
  statusFilters,
  navigate,
}: {
  oems: OEMProfile[]
  analytics: OEMAnalytics | null
  stateFilters: State[]
  statusFilters: ProjectStatus[]
  navigate: (path: string) => void
}) {
  const rows = useMemo(
    () => buildTechRows(oems, 'pumped_hydro', analytics, (o) => o.roles.includes('hydro_oem')),
    [oems, analytics],
  )

  const hydro = analytics?.concentration?.hydro_oem

  // Fuji Tasmania check — show callout only if >5 TAS hydro projects
  const fuji = oems.find((o) => o.name === 'Fuji Electric')
  const fujiTasProjects = fuji?.state_detail?.TAS?.count ?? 0
  const showFujiCallout = fujiTasProjects > 5

  return (
    <div className="space-y-6">
      {hydro && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 text-sm text-[var(--color-text-muted)]">
          Hydro OEM market is distinctive —{' '}
          <strong className="text-[var(--color-text)]">{hydro.top3_share_mw_pct?.toFixed(1) ?? '—'}%</strong>{' '}
          concentration (HHI {hydro.hhi_mw?.toLocaleString()}) but dominated by long-standing state-level relationships.
        </div>
      )}

      <HydroMarketShare
        oems={oems}
        stateFilters={stateFilters}
        statusFilters={statusFilters}
        navigate={navigate}
      />

      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Hydro OEMs</h2>
        <DataTable
          rows={rows}
          columns={[
            oemLinkColumn(),
            { key: 'projects', label: 'Projects', format: 'integer', aggregator: 'sum' },
            { key: 'mw', label: 'MW', format: 'number0', aggregator: 'sum' },
            { key: 'states', label: 'States', format: 'integer' },
            { key: 'models', label: 'Models', sortable: false, hideOnMobile: true },
          ]}
          showTotals
          defaultSort={{ key: 'projects', dir: 'desc' }}
          csvFilename="top-hydro-oems"
        />
      </section>

      {showFujiCallout && (
        <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <span className="text-amber-400 flex-shrink-0">ⓘ</span>
            <div className="text-sm">
              <div className="font-semibold text-[var(--color-text)] mb-0.5">Fuji Electric — Tasmanian monopoly</div>
              <p className="text-[var(--color-text-muted)]">
                Fuji Electric has supplied turbines to <strong className="text-[var(--color-text)]">{fujiTasProjects}</strong>{' '}
                of Tasmania's pumped hydro stations, giving them an effective Tasmanian monopoly on new-build hydro OEM contracts.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// =====================================================================
// OEM Card (directory)
// =====================================================================

function OEMCard({ oem }: { oem: { slug: string; name: string; project_count: number; total_capacity_mw: number; roles: OEMRole[]; models: string[]; by_technology: Partial<Record<Technology, number>>; states: string[] } }) {
  const techs = Object.entries(oem.by_technology)
    .sort(([, a], [, b]) => (b as number) - (a as number))

  return (
    <Link
      to={`/oems/${oem.slug}`}
      className="block bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 hover:border-[var(--color-primary)]/30 transition-all hover:bg-[var(--color-bg-card)]/80 active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-[var(--color-text)] leading-tight">
          {oem.name}
        </h3>
        <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0">
          {oem.project_count} project{oem.project_count !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Role badges */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        {oem.roles.map((role) => {
          const config = OEM_ROLE_CONFIG[role]
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

      {/* Models preview */}
      {oem.models.length > 0 && (
        <p className="text-[10px] text-[var(--color-text-muted)] mb-2 truncate">
          {oem.models.slice(0, 3).join(' · ')}{oem.models.length > 3 ? ` +${oem.models.length - 3}` : ''}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
        <span className="font-medium text-[var(--color-text)]">
          {oem.total_capacity_mw >= 1000
            ? `${(oem.total_capacity_mw / 1000).toFixed(1)} GW`
            : `${Math.round(oem.total_capacity_mw)} MW`}
        </span>
        <span className="truncate max-w-[140px]">{oem.states.join(', ')}</span>
      </div>
    </Link>
  )
}

// ─── Pie Chart Colours ───
const PIE_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#a855f7',
  '#64748b', '#84cc16', '#e11d48', '#0ea5e9', '#d946ef',
]

type PieMetric = 'projects' | 'mw' | 'mwh'

function BESSMarketShare({
  oems,
  stateFilters,
  statusFilters,
  navigate,
}: {
  oems: OEMProfile[]
  stateFilters: State[]
  statusFilters: ProjectStatus[]
  navigate: (path: string) => void
}) {
  const [metric, setMetric] = useState<PieMetric>('projects')

  const chartData = useMemo(() => {
    const bessOems = oems.filter((o) => o.by_technology.bess)

    return bessOems.map((oem) => {
      let count = 0
      let mw = 0
      let mwh = 0

      if (!stateFilters.length && !statusFilters.length) {
        count = oem.by_technology.bess ?? 0
        mw = oem.total_capacity_mw
        mwh = oem.total_storage_mwh
      } else {
        if (statusFilters.length && !stateFilters.length) {
          for (const s of statusFilters) {
            const d = oem.status_detail[s]
            if (d) { count += d.count; mw += d.capacity_mw; mwh += d.storage_mwh }
          }
        } else if (stateFilters.length && !statusFilters.length) {
          for (const s of stateFilters) {
            const d = oem.state_detail[s]
            if (d) { count += d.count; mw += d.capacity_mw; mwh += d.storage_mwh }
          }
        } else {
          for (const s of statusFilters) {
            const d = oem.status_detail[s]
            if (d) { count += d.count; mw += d.capacity_mw; mwh += d.storage_mwh }
          }
        }
      }

      return { name: oem.name, slug: oem.slug, projects: count, mw: Math.round(mw), mwh: Math.round(mwh) }
    })
      .filter((d) => d[metric] > 0)
      .sort((a, b) => b[metric] - a[metric])
  }, [oems, stateFilters.join(','), statusFilters.join(','), metric])

  const threshold = 0.03
  const total = chartData.reduce((s, d) => s + d[metric], 0)
  const mainSlices: { name: string; value: number; slug?: string }[] = []
  let otherValue = 0

  for (const d of chartData) {
    if (d[metric] / total >= threshold) {
      mainSlices.push({ name: d.name, value: d[metric], slug: d.slug })
    } else {
      otherValue += d[metric]
    }
  }
  if (otherValue > 0) mainSlices.push({ name: 'Other', value: otherValue })

  const metricLabel = metric === 'projects' ? 'Projects' : metric === 'mw' ? 'MW' : 'MWh'
  const filterDesc = [
    stateFilters.length ? stateFilters.join(', ') : '',
    statusFilters.length ? statusFilters.join(', ') : '',
  ].filter(Boolean).join(' · ')

  if (mainSlices.length === 0) return null

  return (
    <section className="mb-6 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">BESS Market Share</h2>
          <p className="text-xs text-[var(--color-text-muted)]">
            {chartData.length} OEMs · {total.toLocaleString()} {metricLabel} total
            {filterDesc && ` · ${filterDesc}`} · Click slices to view projects
          </p>
        </div>
        <div className="flex gap-1">
          {([
            { key: 'projects', label: '# Projects' },
            { key: 'mw', label: 'MW' },
            { key: 'mwh', label: 'MWh' },
          ] as const).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setMetric(opt.key)}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                metric === opt.key
                  ? 'border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={mainSlices}
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
                const slice = mainSlices[index]
                if (slice?.slug) {
                  navigate(`/oems/${slice.slug}`)
                }
              }}
            >
              {mainSlices.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
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
              formatter={(value) => `${Number(value).toLocaleString()} ${metricLabel}`}
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              formatter={(value) => <span style={{ color: '#9ca3af' }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

// ─── Wind Market Share Pie Chart ───
type WindPieMetric = 'projects' | 'mw'

function WindMarketShare({
  oems,
  stateFilters,
  statusFilters,
  navigate,
}: {
  oems: OEMProfile[]
  stateFilters: State[]
  statusFilters: ProjectStatus[]
  navigate: (path: string) => void
}) {
  const [metric, setMetric] = useState<WindPieMetric>('projects')

  const chartData = useMemo(() => {
    const windOems = oems.filter((o) => o.by_technology.wind)

    return windOems.map((oem) => {
      let count = 0
      let mw = 0

      if (!stateFilters.length && !statusFilters.length) {
        count = oem.by_technology.wind ?? 0
        mw = oem.total_capacity_mw
      } else {
        if (statusFilters.length && !stateFilters.length) {
          for (const s of statusFilters) {
            const d = oem.status_detail[s]
            if (d) { count += d.count; mw += d.capacity_mw }
          }
        } else if (stateFilters.length && !statusFilters.length) {
          for (const s of stateFilters) {
            const d = oem.state_detail[s]
            if (d) { count += d.count; mw += d.capacity_mw }
          }
        } else {
          for (const s of statusFilters) {
            const d = oem.status_detail[s]
            if (d) { count += d.count; mw += d.capacity_mw }
          }
        }
      }

      return { name: oem.name, slug: oem.slug, projects: count, mw: Math.round(mw) }
    })
      .filter((d) => d[metric] > 0)
      .sort((a, b) => b[metric] - a[metric])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oems, stateFilters.join(','), statusFilters.join(','), metric])

  const threshold = 0.03
  const total = chartData.reduce((s, d) => s + d[metric], 0)
  const mainSlices: { name: string; value: number; slug?: string }[] = []
  let otherValue = 0

  for (const d of chartData) {
    if (d[metric] / total >= threshold) {
      mainSlices.push({ name: d.name, value: d[metric], slug: d.slug })
    } else {
      otherValue += d[metric]
    }
  }
  if (otherValue > 0) mainSlices.push({ name: 'Other', value: otherValue })

  const metricLabel = metric === 'projects' ? 'Projects' : 'MW'
  const filterDesc = [
    stateFilters.length ? stateFilters.join(', ') : '',
    statusFilters.length ? statusFilters.join(', ') : '',
  ].filter(Boolean).join(' · ')

  if (mainSlices.length === 0) return null

  return (
    <section className="mb-6 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Wind OEM Market Share</h2>
          <p className="text-xs text-[var(--color-text-muted)]">
            {chartData.length} OEMs · {total >= 1000 ? `${(total / 1000).toFixed(1)} GW` : `${total.toLocaleString()} MW`} total
            {filterDesc && ` · ${filterDesc}`} · Click slices to view projects
          </p>
        </div>
        <div className="flex gap-1">
          {([
            { key: 'projects' as const, label: '# Projects' },
            { key: 'mw' as const, label: 'MW' },
          ]).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setMetric(opt.key)}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                metric === opt.key
                  ? 'border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={mainSlices}
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
                const slice = mainSlices[index]
                if (slice?.slug) {
                  navigate(`/oems/${slice.slug}`)
                }
              }}
            >
              {mainSlices.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
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
              formatter={(value) => `${Number(value).toLocaleString()} ${metricLabel}`}
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              formatter={(value) => <span style={{ color: '#9ca3af' }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

// ========================================================================
// SolarMarketShare — pie chart of solar OEM market share (panels + inverters)
// ========================================================================
function SolarMarketShare({
  oems,
  stateFilters,
  statusFilters,
  navigate,
}: {
  oems: OEMProfile[]
  stateFilters: State[]
  statusFilters: ProjectStatus[]
  navigate: (path: string) => void
}) {
  const [metric, setMetric] = useState<WindPieMetric>('projects')
  const [scope, setScope] = useState<'panels' | 'inverters'>('panels')

  const chartData = useMemo(() => {
    // Panels = solar_oem role; Inverters = inverter role with solar projects
    const solarOems = oems.filter((o) => {
      if (scope === 'panels') return o.roles.includes('solar_oem') && o.by_technology.solar
      return o.roles.includes('inverter') && o.by_technology.solar
    })

    return solarOems.map((oem) => {
      let count = 0
      let mw = 0

      if (!stateFilters.length && !statusFilters.length) {
        count = oem.by_technology.solar ?? 0
        mw = oem.total_capacity_mw
      } else {
        if (statusFilters.length && !stateFilters.length) {
          for (const s of statusFilters) {
            const d = oem.status_detail[s]
            if (d) { count += d.count; mw += d.capacity_mw }
          }
        } else if (stateFilters.length && !statusFilters.length) {
          for (const s of stateFilters) {
            const d = oem.state_detail[s]
            if (d) { count += d.count; mw += d.capacity_mw }
          }
        } else {
          for (const s of statusFilters) {
            const d = oem.status_detail[s]
            if (d) { count += d.count; mw += d.capacity_mw }
          }
        }
      }

      return { name: oem.name, slug: oem.slug, projects: count, mw: Math.round(mw) }
    })
      .filter((d) => d[metric] > 0)
      .sort((a, b) => b[metric] - a[metric])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oems, stateFilters.join(','), statusFilters.join(','), metric, scope])

  const threshold = 0.03
  const total = chartData.reduce((s, d) => s + d[metric], 0)
  const mainSlices: { name: string; value: number; slug?: string }[] = []
  let otherValue = 0

  for (const d of chartData) {
    if (d[metric] / total >= threshold) {
      mainSlices.push({ name: d.name, value: d[metric], slug: d.slug })
    } else {
      otherValue += d[metric]
    }
  }
  if (otherValue > 0) mainSlices.push({ name: 'Other', value: otherValue })

  const metricLabel = metric === 'projects' ? 'Projects' : 'MW'
  const filterDesc = [
    stateFilters.length ? stateFilters.join(', ') : '',
    statusFilters.length ? statusFilters.join(', ') : '',
  ].filter(Boolean).join(' · ')

  if (mainSlices.length === 0) return null

  return (
    <section className="mb-6 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">
            Solar {scope === 'panels' ? 'Panel' : 'Inverter'} OEM Market Share
          </h2>
          <p className="text-xs text-[var(--color-text-muted)]">
            {chartData.length} OEMs · {total >= 1000 ? `${(total / 1000).toFixed(1)} GW` : `${total.toLocaleString()} MW`} total
            {filterDesc && ` · ${filterDesc}`} · Click slices to view projects
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex gap-1">
            {([
              { key: 'panels' as const, label: 'Panels' },
              { key: 'inverters' as const, label: 'Inverters' },
            ]).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setScope(opt.key)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                  scope === opt.key
                    ? 'border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <span className="text-[var(--color-border)]">|</span>
          <div className="flex gap-1">
            {([
              { key: 'projects' as const, label: '# Projects' },
              { key: 'mw' as const, label: 'MW' },
            ]).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setMetric(opt.key)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                  metric === opt.key
                    ? 'border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={mainSlices}
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
                const slice = mainSlices[index]
                if (slice?.slug) {
                  navigate(`/oems/${slice.slug}`)
                }
              }}
            >
              {mainSlices.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
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
              formatter={(value) => `${Number(value).toLocaleString()} ${metricLabel}`}
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              formatter={(value) => <span style={{ color: '#9ca3af' }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

// ========================================================================
// HydroMarketShare — pumped_hydro role chart (clone of Wind, uses hydro_oem role)
// ========================================================================
function HydroMarketShare({
  oems,
  stateFilters,
  statusFilters,
  navigate,
}: {
  oems: OEMProfile[]
  stateFilters: State[]
  statusFilters: ProjectStatus[]
  navigate: (path: string) => void
}) {
  const [metric, setMetric] = useState<WindPieMetric>('projects')

  const chartData = useMemo(() => {
    const hydroOems = oems.filter((o) => o.roles.includes('hydro_oem') && o.by_technology.pumped_hydro)

    return hydroOems.map((oem) => {
      let count = 0
      let mw = 0

      if (!stateFilters.length && !statusFilters.length) {
        count = oem.by_technology.pumped_hydro ?? 0
        mw = oem.total_capacity_mw
      } else {
        if (statusFilters.length && !stateFilters.length) {
          for (const s of statusFilters) {
            const d = oem.status_detail[s]
            if (d) { count += d.count; mw += d.capacity_mw }
          }
        } else if (stateFilters.length && !statusFilters.length) {
          for (const s of stateFilters) {
            const d = oem.state_detail[s]
            if (d) { count += d.count; mw += d.capacity_mw }
          }
        } else {
          for (const s of statusFilters) {
            const d = oem.status_detail[s]
            if (d) { count += d.count; mw += d.capacity_mw }
          }
        }
      }

      return { name: oem.name, slug: oem.slug, projects: count, mw: Math.round(mw) }
    })
      .filter((d) => d[metric] > 0)
      .sort((a, b) => b[metric] - a[metric])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oems, stateFilters.join(','), statusFilters.join(','), metric])

  const threshold = 0.03
  const total = chartData.reduce((s, d) => s + d[metric], 0)
  const mainSlices: { name: string; value: number; slug?: string }[] = []
  let otherValue = 0

  for (const d of chartData) {
    if (d[metric] / total >= threshold) {
      mainSlices.push({ name: d.name, value: d[metric], slug: d.slug })
    } else {
      otherValue += d[metric]
    }
  }
  if (otherValue > 0) mainSlices.push({ name: 'Other', value: otherValue })

  const metricLabel = metric === 'projects' ? 'Projects' : 'MW'
  const filterDesc = [
    stateFilters.length ? stateFilters.join(', ') : '',
    statusFilters.length ? statusFilters.join(', ') : '',
  ].filter(Boolean).join(' · ')

  if (mainSlices.length === 0) return null

  return (
    <section className="mb-6 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Hydro OEM Market Share</h2>
          <p className="text-xs text-[var(--color-text-muted)]">
            {chartData.length} OEMs · {total >= 1000 ? `${(total / 1000).toFixed(1)} GW` : `${total.toLocaleString()} MW`} total
            {filterDesc && ` · ${filterDesc}`} · Click slices to view projects
          </p>
        </div>
        <div className="flex gap-1">
          {([
            { key: 'projects' as const, label: '# Projects' },
            { key: 'mw' as const, label: 'MW' },
          ]).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setMetric(opt.key)}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                metric === opt.key
                  ? 'border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={mainSlices}
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
                const slice = mainSlices[index]
                if (slice?.slug) {
                  navigate(`/oems/${slice.slug}`)
                }
              }}
            >
              {mainSlices.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
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
              formatter={(value) => `${Number(value).toLocaleString()} ${metricLabel}`}
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              formatter={(value) => <span style={{ color: '#9ca3af' }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
