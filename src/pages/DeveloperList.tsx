import { useState, useMemo, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { useDeveloperIndex } from '../hooks/useDeveloperData'
import { fetchDevDataQuality, type DevDataQuality, type DevWebsiteComparison, type DevCorrection } from '../lib/dataService'
import { TECHNOLOGY_CONFIG, type Technology, type State, type DeveloperProfile } from '../lib/types'
import DataProvenance from '../components/common/DataProvenance'

type SortKey = 'capacity' | 'projects' | 'name'
type TabId = 'directory' | 'data-quality'

function parseMulti<T extends string>(raw: string | null): T[] {
  if (!raw) return []
  return raw.split(',').filter(Boolean) as T[]
}

// ─── Icons (defined BEFORE arrays that reference them) ───

const DirectoryIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const QualityIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
)

const SortUpIcon = () => (
  <svg className="w-3 h-3 inline ml-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 15l-6-6-6 6" /></svg>
)

const SortDownIcon = () => (
  <svg className="w-3 h-3 inline ml-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
)

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'directory', label: 'Directory', icon: <DirectoryIcon /> },
  { id: 'data-quality', label: 'Data Quality', icon: <QualityIcon /> },
]

// ─── Pie Chart Colours (same as OEM page) ───

const PIE_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#a855f7',
  '#64748b', '#84cc16', '#e11d48', '#0ea5e9', '#d946ef',
]

type PieMetric = 'projects' | 'mw'

export default function DeveloperList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('capacity')
  const [sortDesc, setSortDesc] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('directory')
  const { data, loading } = useDeveloperIndex()
  const navigate = useNavigate()

  // Data quality state
  const [dq, setDq] = useState<DevDataQuality | null>(null)
  useEffect(() => { fetchDevDataQuality().then(setDq) }, [])

  const stateFilters = parseMulti<State>(searchParams.get('state'))
  const techFilters = parseMulti<Technology>(searchParams.get('tech'))
  const grouped = searchParams.get('grouped') === '1'

  const sourceList = useMemo(() => {
    if (!data) return []
    return grouped && data.grouped_developers?.length
      ? data.grouped_developers
      : data.developers
  }, [data, grouped])

  const filtered = useMemo(() => {
    let result = [...sourceList]

    if (query) {
      const q = query.toLowerCase()
      result = result.filter((d) =>
        d.name.toLowerCase().includes(q) ||
        d.aliases?.some((a) => a.toLowerCase().includes(q))
      )
    }
    if (stateFilters.length) {
      result = result.filter((d) => d.states.some((s) => stateFilters.includes(s as State)))
    }
    if (techFilters.length) {
      result = result.filter((d) => techFilters.some((t) => d.by_technology[t]))
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceList, query, stateFilters.join(','), techFilters.join(','), sortBy, sortDesc])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60dvh]">
        <div className="text-sm text-[var(--color-text-muted)] animate-pulse">Loading developers...</div>
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

  function toggleGrouped() {
    if (grouped) {
      searchParams.delete('grouped')
    } else {
      searchParams.set('grouped', '1')
    }
    setSearchParams(searchParams)
  }

  const activeFilters = [stateFilters.length > 0, techFilters.length > 0].filter(Boolean).length
  const totalCapacity = filtered.reduce((s, d) => s + d.total_capacity_mw, 0)
  const topDevs = data?.top_developers ?? []

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-[var(--color-text)] mb-1">
          Developers
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          {filtered.length} {grouped ? 'group' : 'developer'}{filtered.length !== 1 ? 's' : ''} ·{' '}
          {totalCapacity >= 1000
            ? `${(totalCapacity / 1000).toFixed(1)} GW`
            : `${Math.round(totalCapacity)} MW`
          } total capacity
        </p>
        <div className="mt-3">
          <DataProvenance page="developers" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/30'
                : 'text-[var(--color-text-muted)] border border-transparent hover:text-[var(--color-text)] hover:bg-white/5'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'directory' && (
        <>
          {/* Top 10 Quick Buttons */}
          {topDevs.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] w-12">
                  Top
                </span>
                {topDevs.map((dev) => (
                  <Link
                    key={dev.slug}
                    to={`/developers/${dev.slug}`}
                    className="text-xs px-2.5 py-1 rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)] transition-colors"
                  >
                    {dev.name} <span className="opacity-60">{dev.project_count}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Search + Dropdown + Grouping Toggle */}
          <div className="mb-4 flex items-center gap-3 flex-wrap">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search developers..."
              className="flex-1 min-w-[200px] max-w-md px-3 py-2 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/50 focus:outline-none focus:border-[var(--color-primary)]/50"
            />
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) navigate(`/developers/${e.target.value}`)
              }}
              className="px-3 py-2 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]/50 max-w-[220px]"
            >
              <option value="">Jump to developer...</option>
              {sourceList
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((d, i) => (
                  <option key={`${d.slug}-${i}`} value={d.slug}>
                    {d.name} ({d.project_count})
                  </option>
                ))}
            </select>
            {data?.grouped_developers && data.grouped_developers.length > 0 && (
              <button
                onClick={toggleGrouped}
                className={`text-xs px-3 py-2 rounded-lg border transition-colors ${
                  grouped
                    ? 'border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
                }`}
              >
                Group variants
                <span className="ml-1.5 opacity-70">
                  {grouped ? data.total_grouped : data.total_developers}
                </span>
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="mb-4 space-y-3">
            {/* Technology */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] w-12">
                Tech
              </span>
              {(['wind', 'solar', 'bess', 'hybrid', 'offshore_wind', 'pumped_hydro'] as const).map((tech) => {
                const config = TECHNOLOGY_CONFIG[tech]
                const isActive = isFilterActive('tech', tech)
                return (
                  <button
                    key={tech}
                    onClick={() => toggleFilter('tech', tech)}
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
              {(['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS'] as const).map((state) => {
                const isActive = isFilterActive('state', state)
                return (
                  <button
                    key={state}
                    onClick={() => toggleFilter('state', state)}
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

            {activeFilters > 0 && (
              <button
                onClick={() => setSearchParams({})}
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

          {/* Pie Charts — always use grouped developers for accurate market share */}
          {data && <DeveloperMarketShare developers={data.grouped_developers?.length ? data.grouped_developers : sourceList} navigate={navigate} />}

          {/* Developer Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filtered.map((dev, i) => (
              <DeveloperCard key={`${dev.slug}-${i}`} developer={dev} grouped={grouped} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-lg text-[var(--color-text-muted)]">No developers match your filters</p>
              <button
                onClick={() => { setQuery(''); setSearchParams({}) }}
                className="mt-2 text-sm text-[var(--color-primary)] hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </>
      )}

      {activeTab === 'data-quality' && (
        <DataQualityTab dq={dq} />
      )}
    </div>
  )
}

// ─── Developer Market Share Pie Charts ───

function DeveloperMarketShare({ developers, navigate }: { developers: DeveloperProfile[]; navigate: (path: string) => void }) {
  const [metric, setMetric] = useState<PieMetric>('mw')

  const chartData = useMemo(() => {
    return developers
      .map((d) => ({
        name: d.name,
        slug: d.slug,
        projects: d.project_count,
        mw: Math.round(d.total_capacity_mw),
      }))
      .filter((d) => d[metric] > 0)
      .sort((a, b) => b[metric] - a[metric])
  }, [developers, metric])

  const total = chartData.reduce((s, d) => s + d[metric], 0)
  const mainSlices: { name: string; value: number; slug?: string }[] = []
  let otherValue = 0
  let otherCount = 0

  // Show top 12, rest as "Other"
  for (let i = 0; i < chartData.length; i++) {
    if (i < 12) {
      mainSlices.push({ name: chartData[i].name, value: chartData[i][metric], slug: chartData[i].slug })
    } else {
      otherValue += chartData[i][metric]
      otherCount++
    }
  }
  if (otherValue > 0) mainSlices.push({ name: `Other (${otherCount})`, value: otherValue })

  const metricLabel = metric === 'projects' ? 'Projects' : 'MW'

  if (mainSlices.length === 0) return null

  // Technology breakdown pie
  const techData = useMemo(() => {
    const techTotals: Record<string, number> = {}
    for (const d of developers) {
      for (const [tech, count] of Object.entries(d.by_technology)) {
        const val = metric === 'projects' ? (count as number) : 0
        if (metric === 'projects') {
          techTotals[tech] = (techTotals[tech] || 0) + val
        }
      }
    }
    if (metric === 'mw') {
      // Aggregate MW by technology from developer data
      // Since developers don't break down MW by tech, use project count as proxy
      for (const d of developers) {
        for (const [tech, count] of Object.entries(d.by_technology)) {
          techTotals[tech] = (techTotals[tech] || 0) + (count as number)
        }
      }
    }
    return Object.entries(techTotals)
      .map(([tech, val]) => ({
        name: TECHNOLOGY_CONFIG[tech as Technology]?.label ?? tech,
        value: val,
        color: TECHNOLOGY_CONFIG[tech as Technology]?.color ?? '#64748b',
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [developers, metric])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      {/* Top Developers Pie */}
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Top Developers</h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              {chartData.length} developers · {total >= 1000 ? `${(total / 1000).toFixed(1)} GW` : `${total.toLocaleString()} ${metricLabel}`} total · Click to view
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
                  if (slice?.slug) navigate(`/developers/${slice.slug}`)
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

      {/* Technology Breakdown Pie */}
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">By Technology</h2>
          <p className="text-xs text-[var(--color-text-muted)]">
            Project count by technology across all developers
          </p>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={techData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                label={(props: any) => {
                  const pct = props.percent ?? 0
                  return pct > 0.05 ? `${props.name ?? ''} ${(pct * 100).toFixed(0)}%` : ''
                }}
                labelLine={false}
              >
                {techData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
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
        </div>
      </section>
    </div>
  )
}

// ─── Data Quality Tab ───

type DQSection = 'overview' | 'website' | 'corrections' | 'jvs'
type CorrSortCol = 'project' | 'current' | 'suggested' | 'confidence'

function DataQualityTab({ dq }: { dq: DevDataQuality | null }) {
  const [section, setSection] = useState<DQSection>('overview')
  const [expandedDev, setExpandedDev] = useState<string | null>(null)
  const [corrFilter, setCorrFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [corrSort, setCorrSort] = useState<CorrSortCol>('confidence')
  const [corrSortDesc, setCorrSortDesc] = useState(true)
  const [corrQuery, setCorrQuery] = useState('')

  const filteredCorrections = useMemo(() => {
    if (!dq) return []
    let result = [...dq.developer_corrections]
    if (corrFilter !== 'all') {
      result = result.filter((c) => c.confidence === corrFilter)
    }
    if (corrQuery) {
      const q = corrQuery.toLowerCase()
      result = result.filter((c) =>
        c.project_name.toLowerCase().includes(q) ||
        c.current_developer.toLowerCase().includes(q) ||
        c.suggested_developer.toLowerCase().includes(q)
      )
    }
    result.sort((a, b) => {
      let cmp = 0
      switch (corrSort) {
        case 'project': cmp = a.project_name.localeCompare(b.project_name); break
        case 'current': cmp = a.current_developer.localeCompare(b.current_developer); break
        case 'suggested': cmp = a.suggested_developer.localeCompare(b.suggested_developer); break
        case 'confidence': {
          const order = { high: 3, medium: 2, low: 1 }
          cmp = (order[a.confidence] || 0) - (order[b.confidence] || 0)
          break
        }
      }
      return corrSortDesc ? -cmp : cmp
    })
    return result
  }, [dq, corrFilter, corrQuery, corrSort, corrSortDesc])

  function handleCorrSort(col: CorrSortCol) {
    if (corrSort === col) setCorrSortDesc(!corrSortDesc)
    else { setCorrSort(col); setCorrSortDesc(true) }
  }

  function sortIcon(col: CorrSortCol) {
    if (corrSort !== col) return null
    return corrSortDesc ? <SortDownIcon /> : <SortUpIcon />
  }

  if (!dq) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-[var(--color-text-muted)] animate-pulse">Loading data quality analysis...</div>
      </div>
    )
  }

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Developers Audited', value: dq.summary.developers_audited, color: 'text-blue-400' },
          { label: 'Discrepancies', value: dq.summary.total_discrepancies, color: 'text-amber-400' },
          { label: 'JV Projects', value: dq.summary.jv_projects_found, color: 'text-purple-400' },
          { label: 'SPV Corrections', value: dq.summary.spv_corrections_suggested, color: 'text-orange-400' },
          { label: 'High Confidence', value: dq.summary.high_confidence_corrections, color: 'text-emerald-400' },
        ].map((card) => (
          <div key={card.label} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            <div className="text-[10px] text-[var(--color-text-muted)] mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
        {([
          { id: 'overview' as const, label: 'Website Comparison' },
          { id: 'corrections' as const, label: `SPV Corrections (${dq.developer_corrections.length})` },
          { id: 'jvs' as const, label: `Joint Ventures (${dq.jv_partnerships.length})` },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSection(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              section === tab.id
                ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/30'
                : 'text-[var(--color-text-muted)] border border-transparent hover:text-[var(--color-text)] hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Website Comparison */}
      {section === 'overview' && (
        <div className="space-y-3">
          <p className="text-xs text-[var(--color-text-muted)] mb-4">
            Cross-referencing top {dq.website_comparison.length} developer websites against AURES database.
            Click a developer to see project-level details.
          </p>
          {dq.website_comparison.map((comp) => (
            <WebsiteComparisonCard
              key={comp.slug}
              comp={comp}
              expanded={expandedDev === comp.slug}
              onToggle={() => setExpandedDev(expandedDev === comp.slug ? null : comp.slug)}
            />
          ))}
        </div>
      )}

      {/* SPV Corrections */}
      {section === 'corrections' && (
        <div>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <input
              type="text"
              value={corrQuery}
              onChange={(e) => setCorrQuery(e.target.value)}
              placeholder="Search corrections..."
              className="flex-1 min-w-[200px] max-w-sm px-3 py-2 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/50 focus:outline-none focus:border-[var(--color-primary)]/50"
            />
            <div className="flex gap-1">
              {(['all', 'high', 'medium', 'low'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setCorrFilter(f)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                    corrFilter === f
                      ? 'border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
                  }`}
                >
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-[var(--color-text-muted)] mb-3">
            {filteredCorrections.length} correction{filteredCorrections.length !== 1 ? 's' : ''} —
            Projects where the current_developer field appears to be an SPV rather than the parent developer.
          </p>

          <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]">
                  <th className="px-3 py-2 text-left cursor-pointer hover:text-[var(--color-text)]" onClick={() => handleCorrSort('project')}>
                    Project {sortIcon('project')}
                  </th>
                  <th className="px-3 py-2 text-left cursor-pointer hover:text-[var(--color-text)]" onClick={() => handleCorrSort('current')}>
                    Current Developer {sortIcon('current')}
                  </th>
                  <th className="px-3 py-2 text-left cursor-pointer hover:text-[var(--color-text)]" onClick={() => handleCorrSort('suggested')}>
                    Suggested {sortIcon('suggested')}
                  </th>
                  <th className="px-3 py-2 text-center cursor-pointer hover:text-[var(--color-text)]" onClick={() => handleCorrSort('confidence')}>
                    Confidence {sortIcon('confidence')}
                  </th>
                  <th className="px-3 py-2 text-left">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {filteredCorrections.slice(0, 100).map((c, i) => (
                  <CorrectionRow key={`${c.project_id}-${i}`} correction={c} />
                ))}
              </tbody>
            </table>
          </div>
          {filteredCorrections.length > 100 && (
            <p className="text-xs text-[var(--color-text-muted)] mt-2 text-center">
              Showing 100 of {filteredCorrections.length} corrections. Use search to narrow down.
            </p>
          )}
        </div>
      )}

      {/* Joint Ventures */}
      {section === 'jvs' && (
        <div>
          <p className="text-xs text-[var(--color-text-muted)] mb-4">
            Projects identified as joint ventures or partnerships between multiple developers.
          </p>
          <div className="space-y-3">
            {dq.jv_partnerships.map((jv) => (
              <div key={jv.project_id} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Link
                    to={`/projects/${jv.project_id}`}
                    className="text-sm font-semibold text-[var(--color-primary)] hover:underline"
                  >
                    {jv.project_name}
                  </Link>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 font-medium">
                    {jv.structure}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {jv.partners.map((p, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-bg-elevated)] text-[var(--color-text)]">
                      {p}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-[var(--color-text-muted)]">Source: {jv.source}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Website Comparison Card ───

function WebsiteComparisonCard({ comp, expanded, onToggle }: {
  comp: DevWebsiteComparison; expanded: boolean
  onToggle: () => void
}) {
  const matchRate = comp.website_projects.length > 0
    ? Math.round((comp.match_count / comp.website_projects.length) * 100)
    : 0

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
      <button onClick={onToggle} className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/3 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[var(--color-text)]">{comp.developer}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
            matchRate >= 80 ? 'bg-emerald-500/15 text-emerald-400'
              : matchRate >= 50 ? 'bg-amber-500/15 text-amber-400'
              : 'bg-red-500/15 text-red-400'
          }`}>
            {matchRate}% match
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
          <span className="text-emerald-400">{comp.match_count} matched</span>
          {comp.website_only_count > 0 && <span className="text-amber-400">{comp.website_only_count} website only</span>}
          <span className="text-blue-400">{comp.aures_only_count} AURES only</span>
          <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--color-border)] px-4 py-3 space-y-4">
          {/* Website Projects */}
          {comp.website_projects.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[var(--color-text-muted)] mb-2">Projects on Website</h4>
              <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]">
                      <th className="px-2 py-1.5 text-left">Project</th>
                      <th className="px-2 py-1.5 text-left">Technology</th>
                      <th className="px-2 py-1.5 text-right">MW</th>
                      <th className="px-2 py-1.5 text-left">Status</th>
                      <th className="px-2 py-1.5 text-center">In AURES</th>
                      <th className="px-2 py-1.5 text-left">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {comp.website_projects.map((wp, i) => (
                      <tr key={i} className="hover:bg-white/3">
                        <td className="px-2 py-1.5">
                          {wp.in_aures && wp.aures_id ? (
                            <Link to={`/projects/${wp.aures_id}`} className="text-[var(--color-primary)] hover:underline">{wp.name}</Link>
                          ) : (
                            <span className="text-[var(--color-text)]">{wp.name}</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-[var(--color-text-muted)]">{wp.technology}</td>
                        <td className="px-2 py-1.5 text-right text-[var(--color-text)]">{wp.capacity_mw.toLocaleString()}</td>
                        <td className="px-2 py-1.5 text-[var(--color-text-muted)] capitalize">{wp.status}</td>
                        <td className="px-2 py-1.5 text-center">
                          {wp.in_aures ? (
                            <span className="text-emerald-400">✓</span>
                          ) : (
                            <span className="text-red-400">✗</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-[var(--color-text-muted)]">{wp.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AURES-only Projects */}
          {comp.aures_only_count > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[var(--color-text-muted)] mb-2">
                AURES Only ({comp.aures_only_count} projects not listed on developer website)
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {comp.aures_projects
                  .filter((id) => !comp.website_projects.some((wp) => wp.aures_id === id))
                  .map((id) => (
                    <Link
                      key={id}
                      to={`/projects/${id}`}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                    >
                      {id}
                    </Link>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Correction Row ───

function CorrectionRow({ correction: c }: { correction: DevCorrection }) {
  return (
    <tr className="hover:bg-white/3">
      <td className="px-3 py-2">
        <Link to={`/projects/${c.project_id}`} className="text-[var(--color-primary)] hover:underline">
          {c.project_name}
        </Link>
      </td>
      <td className="px-3 py-2 text-[var(--color-text-muted)] max-w-[200px] truncate" title={c.current_developer}>
        {c.current_developer}
      </td>
      <td className="px-3 py-2 text-[var(--color-text)] font-medium">
        {c.suggested_developer}
      </td>
      <td className="px-3 py-2 text-center">
        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold ${
          c.confidence === 'high' ? 'bg-emerald-500/15 text-emerald-400'
            : c.confidence === 'medium' ? 'bg-amber-500/15 text-amber-400'
            : 'bg-red-500/15 text-red-400'
        }`}>
          {c.confidence}
        </span>
      </td>
      <td className="px-3 py-2 text-[var(--color-text-muted)] max-w-[250px] truncate" title={c.reason}>
        {c.reason}
      </td>
    </tr>
  )
}

// ─── Developer Card ───

function DeveloperCard({ developer, grouped }: { developer: DeveloperProfile; grouped: boolean }) {
  const techs = Object.entries(developer.by_technology)
    .sort(([, a], [, b]) => (b as number) - (a as number))

  const aliasCount = developer.aliases?.length ?? 0

  return (
    <Link
      to={`/developers/${developer.slug}`}
      className="block bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 hover:border-[var(--color-primary)]/30 transition-all hover:bg-[var(--color-bg-card)]/80 active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-semibold text-[var(--color-text)] leading-tight truncate">
            {developer.name}
          </h3>
          {grouped && aliasCount > 1 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] flex-shrink-0">
              {aliasCount} names
            </span>
          )}
        </div>
        <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0">
          {developer.project_count} project{developer.project_count !== 1 ? 's' : ''}
        </span>
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
        <div className="flex items-center gap-3">
          <span className="font-medium text-[var(--color-text)]">
            {developer.total_capacity_mw >= 1000
              ? `${(developer.total_capacity_mw / 1000).toFixed(1)} GW`
              : `${Math.round(developer.total_capacity_mw)} MW`}
          </span>
          {developer.total_storage_mwh > 0 && (
            <span>
              {developer.total_storage_mwh >= 1000
                ? `${(developer.total_storage_mwh / 1000).toFixed(1)} GWh`
                : `${Math.round(developer.total_storage_mwh)} MWh`}
            </span>
          )}
        </div>
        <span className="truncate max-w-[140px]">{developer.states.join(', ')}</span>
      </div>
    </Link>
  )
}
