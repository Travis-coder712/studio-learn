import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ScatterChart, Scatter, Cell,
  PieChart, Pie,
} from 'recharts'
import { fetchWindResource } from '../../lib/dataService'
import type { WindResourceData, WindResourceFarm } from '../../lib/types'
import ScrollableTable from '../../components/common/ScrollableTable'
import DataProvenance from '../../components/common/DataProvenance'

// ============================================================
// Icons — defined BEFORE const arrays per project pattern
// ============================================================

const WindIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838l-2.727 1.17 1.94.831a1 1 0 00.788 0l7-3a1 1 0 000-1.838l-7-3.001z" />
    <path d="M3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
  </svg>
)

const ChartIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
    <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
  </svg>
)

const BoltIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
  </svg>
)

const PipelineIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
  </svg>
)

const SortUpIcon = () => (
  <svg className="w-3 h-3 inline" viewBox="0 0 10 10" fill="currentColor">
    <path d="M5 2L9 8H1L5 2z" />
  </svg>
)

const SortDownIcon = () => (
  <svg className="w-3 h-3 inline" viewBox="0 0 10 10" fill="currentColor">
    <path d="M5 8L1 2H9L5 8z" />
  </svg>
)

// ============================================================
// Rating & state colours
// ============================================================

const RATING_COLOURS: Record<string, string> = {
  'Excellent': '#10b981',
  'Good': '#3b82f6',
  'Average': '#f59e0b',
  'Below Average': '#ef4444',
}

const RATING_ORDER = ['Excellent', 'Good', 'Average', 'Below Average'] as const

const RATING_DESCRIPTIONS: Record<string, { range: string; description: string }> = {
  'Excellent': { range: 'CF ≥ 35%', description: 'Top-tier wind resource — strong, consistent winds' },
  'Good': { range: 'CF 28–35%', description: 'Above-average resource — reliable generation' },
  'Average': { range: 'CF 22–28%', description: 'Moderate wind resource — typical for many sites' },
  'Below Average': { range: 'CF < 22%', description: 'Weaker resource — lower capacity factors' },
}

// Dark theme tooltip style (hardcoded, not CSS vars — for Recharts overlay)
const DARK_TOOLTIP = {
  contentStyle: { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' },
  labelStyle: { color: '#f1f5f9' },
  itemStyle: { color: '#f1f5f9' },
}

const STATE_COLOURS: Record<string, string> = {
  NSW: '#3b82f6',
  VIC: '#8b5cf6',
  QLD: '#f59e0b',
  SA: '#10b981',
  TAS: '#06b6d4',
  WA: '#ec4899',
}

const getRatingColour = (rating: string) => RATING_COLOURS[rating] || '#636e72'
const getStateColour = (state: string) => STATE_COLOURS[state] || '#636e72'

// ============================================================
// Helpers
// ============================================================

const fmtCf = (v: number) => `${v.toFixed(1)}%`
const fmtPrice = (v: number) => `$${v.toFixed(1)}`
const fmtRevenue = (v: number) => `$${(v / 1000).toFixed(0)}k`
const fmtMw = (v: number) => `${v.toLocaleString()} MW`

// ============================================================
// Sort types
// ============================================================

type SortField = 'name' | 'state' | 'capacity_mw' | 'capacity_factor_pct' | 'resource_rating' | 'energy_price' | 'revenue_per_mw'
type SortDir = 'asc' | 'desc'

export default function WindResource() {
  const [data, setData] = useState<WindResourceData | null>(null)
  const [loading, setLoading] = useState(true)

  // Filters
  const [selectedStates, setSelectedStates] = useState<string[]>([])
  const [selectedRatings, setSelectedRatings] = useState<string[]>([])

  // Table sort
  const [sortField, setSortField] = useState<SortField>('capacity_factor_pct')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Pie drill-down
  const [selectedRating, setSelectedRating] = useState<string | null>(null)

  useEffect(() => {
    fetchWindResource().then(d => { setData(d); setLoading(false) })
  }, [])

  function toggleState(state: string) {
    setSelectedStates(prev =>
      prev.includes(state) ? prev.filter(s => s !== state) : [...prev, state]
    )
  }

  function toggleRating(rating: string) {
    setSelectedRatings(prev =>
      prev.includes(rating) ? prev.filter(r => r !== rating) : [...prev, rating]
    )
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir(field === 'name' || field === 'state' ? 'asc' : 'desc')
    }
  }

  // Available states from data
  const availableStates = useMemo(() => {
    if (!data) return []
    const states = new Set(data.operating_farms.map(f => f.state))
    return [...states].sort()
  }, [data])

  // Filtered operating farms
  const filtered = useMemo(() => {
    if (!data) return []
    let farms = data.operating_farms
    if (selectedStates.length > 0) {
      farms = farms.filter(f => selectedStates.includes(f.state))
    }
    if (selectedRatings.length > 0) {
      farms = farms.filter(f => selectedRatings.includes(f.resource_rating))
    }
    return farms
  }, [data, selectedStates, selectedRatings])

  // Sorted farms for table
  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal
      }
      const aStr = String(aVal ?? '')
      const bStr = String(bVal ?? '')
      return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
    })
    return arr
  }, [filtered, sortField, sortDir])

  // Summary stats
  const summary = useMemo(() => {
    if (!data) return null
    const farms = data.operating_farms
    const avgCf = farms.length > 0
      ? farms.reduce((sum, f) => sum + f.capacity_factor_pct, 0) / farms.length
      : 0

    // Best state by median CF
    let bestState = '-'
    let bestMedian = 0
    for (const [state, bench] of Object.entries(data.state_benchmarks)) {
      if (bench.median > bestMedian) {
        bestMedian = bench.median
        bestState = state
      }
    }

    return {
      totalOperating: data.total_operating,
      avgCf,
      bestState,
      bestStateMedian: bestMedian,
      devPipeline: data.total_development,
    }
  }, [data])

  // State benchmark bar chart data (horizontal)
  const stateBenchData = useMemo(() => {
    if (!data) return []
    return Object.entries(data.state_benchmarks)
      .map(([state, bench]) => ({
        state,
        median: bench.median,
        p25: bench.p25,
        p75: bench.p75,
        count: bench.count,
        rating: bench.rating,
        colour: getRatingColour(bench.rating),
        // For the whisker range bar
        rangeBottom: bench.p25,
        rangeHeight: bench.p75 - bench.p25,
      }))
      .sort((a, b) => b.median - a.median)
  }, [data])

  // Scatter data: capacity vs CF, coloured by state
  const scatterData = useMemo(() => {
    return filtered.map(f => ({
      ...f,
      x: f.capacity_mw,
      y: f.capacity_factor_pct,
      colour: getStateColour(f.state),
    }))
  }, [filtered])

  // Rating distribution pie data
  const pieData = useMemo(() => {
    if (!data) return []
    const counts: Record<string, number> = {}
    for (const r of RATING_ORDER) counts[r] = 0
    for (const f of data.operating_farms) {
      counts[f.resource_rating] = (counts[f.resource_rating] || 0) + 1
    }
    return RATING_ORDER
      .map(r => ({ name: r, value: counts[r], fill: RATING_COLOURS[r] }))
      .filter(d => d.value > 0)
  }, [data])

  // Projects for the selected pie slice
  const ratingProjects = useMemo(() => {
    if (!data || !selectedRating) return []
    return data.operating_farms
      .filter(f => f.resource_rating === selectedRating)
      .sort((a, b) => b.capacity_factor_pct - a.capacity_factor_pct)
  }, [data, selectedRating])

  // ---- Render ----

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-[var(--color-text-muted)]">
        No wind resource data available.
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Wind Resource Quality</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Capacity factor analysis across {data.total_operating} operating wind farms and {data.total_development} development projects
        </p>
        <div className="mt-3">
          <DataProvenance page="wind-resource" />
        </div>
      </div>

      {/* Methodology */}
      <details className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 mb-0">
        <summary className="text-sm font-medium text-[var(--color-text)] cursor-pointer">How are ratings calculated?</summary>
        <div className="mt-3 text-xs text-[var(--color-text-muted)] space-y-2">
          <p>Each wind farm is rated on its <strong className="text-[var(--color-text)]">capacity factor</strong> -- the ratio of actual generation to theoretical maximum output. Ratings are: <span className="text-emerald-400 font-semibold">Excellent</span> (CF &ge; 40%), <span className="text-blue-400 font-semibold">Good</span> (CF &ge; 30%), <span className="text-amber-400 font-semibold">Average</span> (CF &ge; 20%), and <span className="text-red-400 font-semibold">Below Average</span> (CF &lt; 20%).</p>
          <p><strong className="text-[var(--color-text)]">Why capacity factor matters:</strong> It measures how effectively a wind farm converts its installed capacity into actual electricity. A 100 MW farm with a 35% CF generates 35 MW on average -- higher CF means more energy per dollar of capital invested.</p>
          <p><strong className="text-[var(--color-text)]">Key factors affecting CF:</strong> Wind speed and consistency at site, turbine technology and hub height, grid curtailment (forced output reductions), marginal loss factors (transmission losses), and wake effects from nearby turbines.</p>
        </div>
      </details>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <div className="flex items-center gap-2 text-[var(--color-text-muted)] mb-2">
              <WindIcon />
              <span className="text-xs font-medium uppercase tracking-wider">Operating Farms</span>
            </div>
            <div className="text-2xl font-bold text-[var(--color-text)]">{summary.totalOperating}</div>
            <div className="text-xs text-[var(--color-text-muted)]">{filtered.length} shown</div>
          </div>

          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <div className="flex items-center gap-2 text-[var(--color-text-muted)] mb-2">
              <ChartIcon />
              <span className="text-xs font-medium uppercase tracking-wider">Avg CF</span>
            </div>
            <div className="text-2xl font-bold text-blue-400">{fmtCf(summary.avgCf)}</div>
            <div className="text-xs text-[var(--color-text-muted)]">fleet average</div>
          </div>

          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <div className="flex items-center gap-2 text-[var(--color-text-muted)] mb-2">
              <BoltIcon />
              <span className="text-xs font-medium uppercase tracking-wider">Best State</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: getStateColour(summary.bestState) }}>
              {summary.bestState}
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">median CF {fmtCf(summary.bestStateMedian)}</div>
          </div>

          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <div className="flex items-center gap-2 text-[var(--color-text-muted)] mb-2">
              <PipelineIcon />
              <span className="text-xs font-medium uppercase tracking-wider">Dev Pipeline</span>
            </div>
            <div className="text-2xl font-bold text-amber-400">{summary.devPipeline}</div>
            <div className="text-xs text-[var(--color-text-muted)]">development projects</div>
          </div>
        </div>
      )}

      {/* Filter chips: State */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] w-14">
          State
        </span>
        {availableStates.map(state => {
          const isActive = selectedStates.includes(state)
          const colour = getStateColour(state)
          return (
            <button
              key={state}
              onClick={() => toggleState(state)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                isActive
                  ? 'border-transparent font-medium'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
              }`}
              style={isActive ? { backgroundColor: `${colour}33`, color: colour } : undefined}
            >
              {state}
            </button>
          )
        })}
        {selectedStates.length > 0 && (
          <button onClick={() => setSelectedStates([])} className="text-xs text-[var(--color-primary)] hover:underline ml-1">
            Clear
          </button>
        )}
      </div>

      {/* Filter chips: Rating */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] w-14">
          Rating
        </span>
        {RATING_ORDER.map(rating => {
          const isActive = selectedRatings.includes(rating)
          const colour = getRatingColour(rating)
          return (
            <button
              key={rating}
              onClick={() => toggleRating(rating)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                isActive
                  ? 'border-transparent font-medium'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
              }`}
              style={isActive ? { backgroundColor: `${colour}33`, color: colour } : undefined}
            >
              {rating}
            </button>
          )
        })}
        {selectedRatings.length > 0 && (
          <button onClick={() => setSelectedRatings([])} className="text-xs text-[var(--color-primary)] hover:underline ml-1">
            Clear
          </button>
        )}
      </div>

      {/* State Benchmarks + Rating Distribution in 2-col */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* State benchmarks horizontal bar chart */}
        <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">State Benchmarks</h2>
          <p className="text-xs text-[var(--color-text-muted)] mb-4">
            Median capacity factor by state. Error bars show P25-P75 range.
          </p>
          <ResponsiveContainer width="100%" height={Math.max(stateBenchData.length * 44, 200)}>
            <BarChart data={stateBenchData} layout="vertical" margin={{ top: 5, right: 40, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis
                type="number" domain={[0, 50]}
                tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                type="category" dataKey="state" width={50}
                tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
              />
              <Tooltip
                {...DARK_TOOLTIP}
                formatter={(value) => [fmtCf(Number(value)), 'Median CF']}
                labelFormatter={(label) => {
                  const row = stateBenchData.find(r => r.state === label)
                  return row
                    ? `${label} (${row.count} farms) — ${row.rating} — P25: ${fmtCf(row.p25)}, P75: ${fmtCf(row.p75)}`
                    : String(label)
                }}
              />
              <Bar dataKey="median" radius={[0, 4, 4, 0]}>
                {stateBenchData.map((entry, index) => (
                  <Cell key={`bench-${index}`} fill={entry.colour} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {RATING_ORDER.map(r => (
              <div key={r} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: RATING_COLOURS[r] }} />
                <span className="text-[var(--color-text-muted)]">{r}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rating distribution pie */}
        <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Rating Distribution</h2>
          <p className="text-xs text-[var(--color-text-muted)] mb-4">
            {data.total_operating} farms by resource quality rating. Click a slice to see projects.
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
                cursor="pointer"
                onClick={(_, index) => {
                  const rating = pieData[index]?.name
                  if (rating) setSelectedRating(selectedRating === rating ? null : rating)
                }}
              >
                {pieData.map((entry, i) => (
                  <Cell
                    key={`pie-${i}`}
                    fill={entry.fill}
                    opacity={selectedRating && selectedRating !== entry.name ? 0.3 : 1}
                    stroke={selectedRating === entry.name ? '#f1f5f9' : 'none'}
                    strokeWidth={selectedRating === entry.name ? 2 : 0}
                  />
                ))}
              </Pie>
              <Tooltip
                {...DARK_TOOLTIP}
                formatter={(value, _name, props) => {
                  const pct = ((Number(value) / data.total_operating) * 100).toFixed(0)
                  return [`${value} farms (${pct}%)`, props.payload.name]
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Rating legend with descriptions */}
          <div className="space-y-1.5 mt-2">
            {RATING_ORDER.map(r => {
              const d = pieData.find(p => p.name === r)
              const desc = RATING_DESCRIPTIONS[r]
              if (!d) return null
              return (
                <button
                  key={r}
                  onClick={() => setSelectedRating(selectedRating === r ? null : r)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                    selectedRating === r
                      ? 'bg-white/10 ring-1 ring-white/20'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: RATING_COLOURS[r] }} />
                  <span className="text-xs text-[var(--color-text)] font-medium min-w-[90px]">{r}</span>
                  <span className="text-[10px] text-[var(--color-text-muted)] font-mono">{desc.range}</span>
                  <span className="text-[10px] text-[var(--color-text-muted)] ml-auto">{d.value} farms</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Rating drill-down project list */}
      {selectedRating && ratingProjects.length > 0 && (
        <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-text)]">
                <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: RATING_COLOURS[selectedRating] }} />
                {selectedRating} Wind Resource — {ratingProjects.length} projects
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                {RATING_DESCRIPTIONS[selectedRating]?.description} ({RATING_DESCRIPTIONS[selectedRating]?.range})
              </p>
            </div>
            <button
              onClick={() => setSelectedRating(null)}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10"
            >
              ✕ Close
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                  <th className="px-2 py-2 text-left">#</th>
                  <th className="px-2 py-2 text-left">Project</th>
                  <th className="px-2 py-2 text-left">State</th>
                  <th className="px-2 py-2 text-right">MW</th>
                  <th className="px-2 py-2 text-right">CF%</th>
                  <th className="px-2 py-2 text-right">$/MWh</th>
                  <th className="px-2 py-2 text-right">Rev/MW</th>
                </tr>
              </thead>
              <tbody>
                {ratingProjects.map((f, i) => (
                  <tr key={f.project_id} className="border-b border-[var(--color-border)]/30 hover:bg-white/5">
                    <td className="px-2 py-1.5 text-[var(--color-text-muted)]">{i + 1}</td>
                    <td className="px-2 py-1.5">
                      <Link to={`/projects/${f.project_id}`} className="text-[var(--color-text)] hover:text-[var(--color-primary)] font-medium">
                        {f.name}
                      </Link>
                    </td>
                    <td className="px-2 py-1.5 text-[var(--color-text-muted)]">{f.state}</td>
                    <td className="px-2 py-1.5 text-right text-[var(--color-text)]">{f.capacity_mw}</td>
                    <td className="px-2 py-1.5 text-right" style={{ color: getRatingColour(f.resource_rating) }}>
                      {fmtCf(f.capacity_factor_pct)}
                    </td>
                    <td className="px-2 py-1.5 text-right text-[var(--color-text)]">{fmtPrice(f.energy_price)}</td>
                    <td className="px-2 py-1.5 text-right text-[var(--color-text)]">{fmtRevenue(f.revenue_per_mw)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Scatter plot: Capacity vs CF */}
      <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Capacity vs Capacity Factor</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Each dot is an operating farm. Colour indicates state. Hover for details.
        </p>
        <ResponsiveContainer width="100%" height={360}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="x" type="number" name="Capacity"
              tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
              label={{ value: 'Capacity (MW)', position: 'insideBottom', offset: -10, fill: 'var(--color-text-muted)', fontSize: 12 }}
            />
            <YAxis
              dataKey="y" type="number" name="Capacity Factor"
              tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
              tickFormatter={(v) => `${v}%`}
              label={{ value: 'Capacity Factor %', angle: -90, position: 'insideLeft', fill: 'var(--color-text-muted)', fontSize: 12 }}
            />
            <Tooltip
              content={({ payload }) => {
                if (!payload?.length) return null
                const d = payload[0].payload as WindResourceFarm
                return (
                  <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }} className="text-sm">
                    <div style={{ color: '#f1f5f9' }} className="font-semibold">{d.name}</div>
                    <div style={{ color: '#94a3b8' }}>
                      {d.state} — {fmtMw(d.capacity_mw)}
                    </div>
                    <div style={{ color: '#94a3b8' }}>
                      CF: <span style={{ color: getRatingColour(d.resource_rating) }}>{fmtCf(d.capacity_factor_pct)}</span> — {d.resource_rating}
                    </div>
                    <div style={{ color: '#94a3b8' }}>
                      Price: {fmtPrice(d.energy_price)}/MWh — Revenue: {fmtRevenue(d.revenue_per_mw)}/MW
                    </div>
                  </div>
                )
              }}
            />
            <Scatter data={scatterData}>
              {scatterData.map((entry, index) => (
                <Cell key={`scatter-${index}`} fill={entry.colour} fillOpacity={0.7} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        {/* State legend */}
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          {availableStates.map(state => (
            <div key={state} className="flex items-center gap-1.5 text-xs">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getStateColour(state) }} />
              <span className="text-[var(--color-text-muted)]">{state}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Operating farms table */}
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)]">
        <div className="p-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Operating Wind Farms</h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Showing {sorted.length} of {data.total_operating} farms. Click column headers to sort.
          </p>
        </div>
        <ScrollableTable>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              {([
                ['name', 'Name', 'text-left', ''],
                ['state', 'State', 'text-left', 'hidden sm:table-cell'],
                ['capacity_mw', 'Capacity', 'text-right', ''],
                ['capacity_factor_pct', 'CF %', 'text-right', ''],
                ['resource_rating', 'Rating', 'text-center', 'hidden sm:table-cell'],
                ['energy_price', 'Price $/MWh', 'text-right', 'hidden md:table-cell'],
                ['revenue_per_mw', 'Revenue/MW', 'text-right', 'hidden md:table-cell'],
              ] as [SortField, string, string, string][]).map(([field, label, align, hide]) => (
                <th
                  key={field}
                  onClick={() => handleSort(field)}
                  className={`${align} p-3 text-[var(--color-text-muted)] font-medium cursor-pointer hover:text-[var(--color-text)] select-none ${hide}`}
                >
                  {label}
                  {sortField === field && (
                    <span className="ml-1">
                      {sortDir === 'desc' ? <SortDownIcon /> : <SortUpIcon />}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(farm => (
              <tr key={farm.project_id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg)]/50">
                <td className="p-3">
                  <Link
                    to={`/projects/${farm.project_id}?from=intelligence/wind-resource&fromLabel=Back to Wind Resource`}
                    className="text-[var(--color-primary)] hover:underline font-medium"
                  >
                    {farm.name}
                  </Link>
                </td>
                <td className="p-3 hidden sm:table-cell">
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: `${getStateColour(farm.state)}33`, color: getStateColour(farm.state) }}>
                    {farm.state}
                  </span>
                </td>
                <td className="p-3 text-right text-[var(--color-text)]">{fmtMw(farm.capacity_mw)}</td>
                <td className="p-3 text-right font-mono text-[var(--color-text)]">{fmtCf(farm.capacity_factor_pct)}</td>
                <td className="p-3 text-center hidden sm:table-cell">
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor: `${getRatingColour(farm.resource_rating)}33`,
                      color: getRatingColour(farm.resource_rating),
                    }}
                  >
                    {farm.resource_rating}
                  </span>
                </td>
                <td className="p-3 text-right text-[var(--color-text-muted)] hidden md:table-cell">{fmtPrice(farm.energy_price)}</td>
                <td className="p-3 text-right text-[var(--color-text)] hidden md:table-cell">{fmtRevenue(farm.revenue_per_mw)}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-[var(--color-text-muted)]">
                  No farms match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </ScrollableTable>
        <div className="px-3 py-2 text-xs text-[var(--color-text-muted)] border-t border-[var(--color-border)]">
          Showing {sorted.length} of {data.total_operating} operating wind farms
        </div>
      </div>

      {/* Development predictions */}
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)]">
        <div className="p-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Development Pipeline Predictions</h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Predicted capacity factors for {data.total_development} development-stage wind projects
          </p>
        </div>
        <ScrollableTable>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="text-left p-3 text-[var(--color-text-muted)] font-medium">Name</th>
              <th className="text-left p-3 text-[var(--color-text-muted)] font-medium hidden sm:table-cell">State</th>
              <th className="text-right p-3 text-[var(--color-text-muted)] font-medium">Capacity</th>
              <th className="text-right p-3 text-[var(--color-text-muted)] font-medium">Predicted CF</th>
              <th className="text-center p-3 text-[var(--color-text-muted)] font-medium hidden sm:table-cell">Rating</th>
              <th className="text-left p-3 text-[var(--color-text-muted)] font-medium hidden md:table-cell">Basis</th>
            </tr>
          </thead>
          <tbody>
            {data.development_projects.map(proj => (
              <tr key={proj.project_id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg)]/50">
                <td className="p-3">
                  <Link
                    to={`/projects/${proj.project_id}?from=intelligence/wind-resource&fromLabel=Back to Wind Resource`}
                    className="text-[var(--color-primary)] hover:underline font-medium"
                  >
                    {proj.name}
                  </Link>
                </td>
                <td className="p-3 hidden sm:table-cell">
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: `${getStateColour(proj.state)}33`, color: getStateColour(proj.state) }}>
                    {proj.state}
                  </span>
                </td>
                <td className="p-3 text-right text-[var(--color-text)]">{fmtMw(proj.capacity_mw)}</td>
                <td className="p-3 text-right font-mono text-[var(--color-text)]">{fmtCf(proj.predicted_cf_pct)}</td>
                <td className="p-3 text-center hidden sm:table-cell">
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor: `${getRatingColour(proj.predicted_rating)}33`,
                      color: getRatingColour(proj.predicted_rating),
                    }}
                  >
                    {proj.predicted_rating}
                  </span>
                </td>
                <td className="p-3 text-[var(--color-text-muted)] text-xs hidden md:table-cell">{proj.basis}</td>
              </tr>
            ))}
            {data.development_projects.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[var(--color-text-muted)]">
                  No development projects available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </ScrollableTable>
        <div className="px-3 py-2 text-xs text-[var(--color-text-muted)] border-t border-[var(--color-border)]">
          {data.total_development} development projects
        </div>
      </div>

      {/* Source note */}
      <div className="text-xs text-[var(--color-text-muted)] italic">
        Capacity factors derived from AEMO generation data. Resource ratings: Excellent (&gt;35%),
        Good (30-35%), Average (25-30%), Below Average (&lt;25%). Development predictions based on
        nearby operating farm performance and REZ benchmarks.
      </div>
    </div>
  )
}
