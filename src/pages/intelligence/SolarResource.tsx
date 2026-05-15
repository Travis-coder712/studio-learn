import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ScatterChart, Scatter, Cell,
  PieChart, Pie,
} from 'recharts'
import { fetchSolarResource } from '../../lib/dataService'
import DataProvenance from '../../components/common/DataProvenance'
import ChartFrame from '../../components/common/ChartFrame'
import DataTable, { type Column } from '../../components/common/DataTable'

// ============================================================
// Types — local, mirrors the JSON export shape
// ============================================================

interface SolarFarm {
  project_id: string
  name: string
  state: string
  capacity_mw: number
  latitude: number
  longitude: number
  developer: string
  capacity_factor_pct: number
  energy_price: number
  revenue_per_mw: number
  resource_rating: string
  data_year: number
}

interface SolarDevProject {
  project_id: string
  name: string
  state: string
  capacity_mw: number
  latitude: number | null
  longitude: number | null
  developer: string
  predicted_cf_pct: number
  predicted_rating: string
  basis: string
}

interface BenchmarkStats {
  count: number
  mean: number
  median: number
  p25: number
  p75: number
  rating: string
  total_mw?: number
}

interface DeveloperBenchmark extends BenchmarkStats {
  developer: string
  project_count: number
  total_mw: number
}

interface SolarResourcePayload {
  operating_farms: SolarFarm[]
  state_benchmarks: Record<string, BenchmarkStats>
  rez_benchmarks: Record<string, BenchmarkStats>
  capacity_class_benchmarks: Record<string, BenchmarkStats>
  developer_benchmarks: DeveloperBenchmark[]
  development_projects: SolarDevProject[]
  total_operating: number
  total_development: number
  cf_rating_thresholds: Record<string, string>
  exported_at: string
}

// ============================================================
// Icons — defined BEFORE const arrays per project pattern
// ============================================================

const SolarIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
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

const FleetIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 3a5 5 0 015 5h-5V5z" />
  </svg>
)

// ============================================================
// Rating & state colours (solar thresholds: Excellent >=29%, Good 24-29%, Average 20-24%, Below <20%)
// ============================================================

const RATING_COLOURS: Record<string, string> = {
  'Excellent': '#10b981',
  'Good': '#3b82f6',
  'Average': '#f59e0b',
  'Below Average': '#ef4444',
}

const RATING_ORDER = ['Excellent', 'Good', 'Average', 'Below Average'] as const

const RATING_DESCRIPTIONS: Record<string, { range: string; description: string }> = {
  'Excellent': { range: 'CF \u2265 29%', description: 'Top-tier solar resource — strong irradiance, low curtailment' },
  'Good': { range: 'CF 24–29%', description: 'Above-average resource — reliable generation' },
  'Average': { range: 'CF 20–24%', description: 'Moderate solar resource — typical fleet performance' },
  'Below Average': { range: 'CF < 20%', description: 'Weaker resource — clipping or curtailment-heavy' },
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

const CAPACITY_CLASS_ORDER = [
  'Small (<50 MW)',
  'Medium (50-150 MW)',
  'Large (150-300 MW)',
  'Utility (300+ MW)',
] as const

const getRatingColour = (rating: string) => RATING_COLOURS[rating] || '#636e72'
const getStateColour = (state: string) => STATE_COLOURS[state] || '#636e72'

// ============================================================
// Helpers
// ============================================================

const fmtCf = (v: number) => `${v.toFixed(1)}%`
const fmtPrice = (v: number) => `$${v.toFixed(1)}`
const fmtRevenue = (v: number) => `$${(v / 1000).toFixed(0)}k`
const fmtMw = (v: number) => `${v.toLocaleString()} MW`
const truncate = (s: string, n: number) => (s && s.length > n ? `${s.slice(0, n - 1)}\u2026` : s)

// ============================================================
// Component
// ============================================================

export default function SolarResource() {
  const [data, setData] = useState<SolarResourcePayload | null>(null)
  const [loading, setLoading] = useState(true)

  // Pie drill-down
  const [selectedRating, setSelectedRating] = useState<string | null>(null)

  useEffect(() => {
    fetchSolarResource().then((d) => {
      setData(d as SolarResourcePayload | null)
      setLoading(false)
    })
  }, [])

  // Available states from data
  const availableStates = useMemo(() => {
    if (!data) return []
    const states = new Set(data.operating_farms.map((f) => f.state))
    return [...states].sort()
  }, [data])

  // Summary stats
  const summary = useMemo(() => {
    if (!data) return null
    const farms = data.operating_farms
    const avgCf = farms.length > 0
      ? farms.reduce((sum, f) => sum + f.capacity_factor_pct, 0) / farms.length
      : 0

    let bestState = '-'
    let bestMedian = 0
    for (const [state, bench] of Object.entries(data.state_benchmarks)) {
      if (bench.median > bestMedian) {
        bestMedian = bench.median
        bestState = state
      }
    }

    const totalMw = farms.reduce((sum, f) => sum + (f.capacity_mw || 0), 0)

    return {
      totalOperating: data.total_operating,
      avgCf,
      bestState,
      bestStateMedian: bestMedian,
      devPipeline: data.total_development,
      totalMw,
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
      }))
      .sort((a, b) => b.median - a.median)
  }, [data])

  // Capacity class benchmark bar chart (vertical)
  const capacityClassData = useMemo(() => {
    if (!data) return []
    return CAPACITY_CLASS_ORDER
      .filter((cls) => data.capacity_class_benchmarks[cls])
      .map((cls) => {
        const bench = data.capacity_class_benchmarks[cls]
        return {
          className: cls,
          shortLabel: cls.replace(/\s*\([^)]+\)/, ''),
          median: bench.median,
          p25: bench.p25,
          p75: bench.p75,
          count: bench.count,
          total_mw: bench.total_mw ?? 0,
          rating: bench.rating,
          colour: getRatingColour(bench.rating),
        }
      })
  }, [data])

  // Scatter data: capacity vs CF, coloured by state
  const scatterData = useMemo(() => {
    if (!data) return []
    return data.operating_farms.map((f) => ({
      ...f,
      x: f.capacity_mw,
      y: f.capacity_factor_pct,
      colour: getStateColour(f.state),
    }))
  }, [data])

  // Rating distribution pie data
  const pieData = useMemo(() => {
    if (!data) return []
    const counts: Record<string, number> = {}
    for (const r of RATING_ORDER) counts[r] = 0
    for (const f of data.operating_farms) {
      counts[f.resource_rating] = (counts[f.resource_rating] || 0) + 1
    }
    return RATING_ORDER
      .map((r) => ({ name: r, value: counts[r], fill: RATING_COLOURS[r] }))
      .filter((d) => d.value > 0)
  }, [data])

  // Projects for the selected pie slice
  const ratingProjects = useMemo(() => {
    if (!data || !selectedRating) return []
    return data.operating_farms
      .filter((f) => f.resource_rating === selectedRating)
      .sort((a, b) => b.capacity_factor_pct - a.capacity_factor_pct)
  }, [data, selectedRating])

  // Columns for operating farms table
  const operatingColumns: Column<SolarFarm>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Project',
        sortable: true,
        render: (_v, row) => (
          <Link
            to={`/projects/${row.project_id}?from=intelligence/solar-resource&fromLabel=Back to Solar Resource`}
            className="text-[var(--color-primary)] hover:underline font-medium"
          >
            {row.name}
          </Link>
        ),
      },
      {
        key: 'state',
        label: 'State',
        sortable: true,
        render: (_v, row) => (
          <span
            className="text-xs font-medium px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: `${getStateColour(row.state)}33`,
              color: getStateColour(row.state),
            }}
          >
            {row.state}
          </span>
        ),
      },
      {
        key: 'developer',
        label: 'Developer',
        sortable: true,
        hideOnMobile: true,
        render: (_v, row) => (
          <span className="text-[var(--color-text-muted)] text-xs" title={row.developer}>
            {truncate(row.developer || '\u2014', 25)}
          </span>
        ),
      },
      {
        key: 'capacity_mw',
        label: 'MW',
        align: 'right',
        format: 'number0',
        aggregator: 'sum',
      },
      {
        key: 'capacity_factor_pct',
        label: 'CF %',
        align: 'right',
        format: 'number1',
        aggregator: 'avg',
        render: (v) => (
          <span className="font-mono text-[var(--color-text)]">{fmtCf(Number(v))}</span>
        ),
      },
      {
        key: 'resource_rating',
        label: 'Rating',
        align: 'center',
        sortable: true,
        hideOnMobile: true,
        render: (_v, row) => (
          <span
            className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: `${getRatingColour(row.resource_rating)}33`,
              color: getRatingColour(row.resource_rating),
            }}
          >
            {row.resource_rating}
          </span>
        ),
      },
      {
        key: 'energy_price',
        label: 'Price $/MWh',
        align: 'right',
        format: 'number0',
        hideOnMobile: true,
      },
      {
        key: 'revenue_per_mw',
        label: 'Revenue/MW',
        align: 'right',
        format: 'currency0',
        hideOnMobile: true,
      },
    ],
    [],
  )

  // Columns for development pipeline table
  const devColumns: Column<SolarDevProject>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Project',
        sortable: true,
        render: (_v, row) => (
          <Link
            to={`/projects/${row.project_id}?from=intelligence/solar-resource&fromLabel=Back to Solar Resource`}
            className="text-[var(--color-primary)] hover:underline font-medium"
          >
            {row.name}
          </Link>
        ),
      },
      {
        key: 'state',
        label: 'State',
        sortable: true,
        render: (_v, row) => (
          <span
            className="text-xs font-medium px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: `${getStateColour(row.state)}33`,
              color: getStateColour(row.state),
            }}
          >
            {row.state}
          </span>
        ),
      },
      {
        key: 'developer',
        label: 'Developer',
        sortable: true,
        hideOnMobile: true,
        render: (_v, row) => (
          <span className="text-[var(--color-text-muted)] text-xs" title={row.developer}>
            {truncate(row.developer || '\u2014', 25)}
          </span>
        ),
      },
      {
        key: 'capacity_mw',
        label: 'MW',
        align: 'right',
        format: 'number0',
        aggregator: 'sum',
      },
      {
        key: 'predicted_cf_pct',
        label: 'Predicted CF',
        align: 'right',
        format: 'number1',
        render: (v) => (
          <span className="font-mono text-[var(--color-text)]">{fmtCf(Number(v))}</span>
        ),
      },
      {
        key: 'predicted_rating',
        label: 'Predicted Rating',
        align: 'center',
        sortable: true,
        hideOnMobile: true,
        render: (_v, row) => (
          <span
            className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: `${getRatingColour(row.predicted_rating)}33`,
              color: getRatingColour(row.predicted_rating),
            }}
          >
            {row.predicted_rating}
          </span>
        ),
      },
    ],
    [],
  )

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
        No solar resource data available.
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Section 1 — Header + DataProvenance */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Solar Resource</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Capacity factor analysis across {data.total_operating} operating solar farms and {data.total_development} development projects
        </p>
        <div className="mt-3">
          <DataProvenance page="solar-resource" />
        </div>
      </div>

      {/* Methodology */}
      <details className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
        <summary className="text-sm font-medium text-[var(--color-text)] cursor-pointer">How are solar ratings calculated?</summary>
        <div className="mt-3 text-xs text-[var(--color-text-muted)] space-y-2">
          <p>Each solar farm is rated on its <strong className="text-[var(--color-text)]">capacity factor</strong> -- the ratio of actual AC generation to theoretical maximum output. Solar ratings are: <span className="text-emerald-400 font-semibold">Excellent</span> (CF &ge; 29%), <span className="text-blue-400 font-semibold">Good</span> (24-29%), <span className="text-amber-400 font-semibold">Average</span> (20-24%), and <span className="text-red-400 font-semibold">Below Average</span> (CF &lt; 20%).</p>
          <p><strong className="text-[var(--color-text)]">Why solar CF maxes out lower than wind:</strong> Solar physically can't generate at night, so even a perfectly sunny site in outback SA tops out around 30%. Inverter clipping (DC capacity &gt; AC rating) and network curtailment pull larger projects lower still.</p>
          <p><strong className="text-[var(--color-text)]">Key factors affecting CF:</strong> Site irradiance, DC/AC oversizing ratio, tracker vs fixed-tilt, curtailment from marginal loss factors and network constraints, and commissioning year (older sites have degraded panels).</p>
        </div>
      </details>

      {/* Section 2 — Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <div className="flex items-center gap-2 text-[var(--color-text-muted)] mb-2">
              <SolarIcon />
              <span className="text-xs font-medium uppercase tracking-wider">Operating</span>
            </div>
            <div className="text-2xl font-bold text-[var(--color-text)]">{summary.totalOperating}</div>
            <div className="text-xs text-[var(--color-text-muted)]">solar farms</div>
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
            <div className="text-xs text-[var(--color-text-muted)]">median {fmtCf(summary.bestStateMedian)}</div>
          </div>

          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <div className="flex items-center gap-2 text-[var(--color-text-muted)] mb-2">
              <PipelineIcon />
              <span className="text-xs font-medium uppercase tracking-wider">Dev Pipeline</span>
            </div>
            <div className="text-2xl font-bold text-amber-400">{summary.devPipeline}</div>
            <div className="text-xs text-[var(--color-text-muted)]">projects</div>
          </div>

          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <div className="flex items-center gap-2 text-[var(--color-text-muted)] mb-2">
              <FleetIcon />
              <span className="text-xs font-medium uppercase tracking-wider">Total MW</span>
            </div>
            <div className="text-2xl font-bold text-[var(--color-text)]">
              {(summary.totalMw / 1000).toFixed(1)}
              <span className="text-sm font-medium text-[var(--color-text-muted)] ml-1">GW</span>
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">operating capacity</div>
          </div>
        </div>
      )}

      {/* Section 3 & 4 — State Benchmarks + Rating Distribution in 2-col */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* State benchmarks horizontal bar chart */}
        <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">State Benchmarks</h2>
          <p className="text-xs text-[var(--color-text-muted)] mb-4">
            Median capacity factor by state. Bars coloured by rating; tooltip shows P25-P75 range.
          </p>
          <ChartFrame
            title="Solar CF by state"
            height={Math.max(stateBenchData.length * 48, 200)}
            data={stateBenchData}
            csvFilename="solar-state-benchmarks"
          >
            <BarChart data={stateBenchData} layout="vertical" margin={{ top: 5, right: 40, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 35]}
                tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="state"
                width={50}
                tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
              />
              <Tooltip
                {...DARK_TOOLTIP}
                formatter={(value) => [fmtCf(Number(value)), 'Median CF']}
                labelFormatter={(label) => {
                  const row = stateBenchData.find((r) => r.state === label)
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
          </ChartFrame>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {RATING_ORDER.map((r) => (
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
            {data.total_operating} farms by resource quality. Click a slice to see projects.
          </p>
          <ChartFrame title="Rating distribution" height={240} data={pieData} csvFilename="solar-rating-distribution">
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
          </ChartFrame>
          <div className="space-y-1.5 mt-2">
            {RATING_ORDER.map((r) => {
              const d = pieData.find((p) => p.name === r)
              const desc = RATING_DESCRIPTIONS[r]
              if (!d) return null
              return (
                <button
                  key={r}
                  onClick={() => setSelectedRating(selectedRating === r ? null : r)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                    selectedRating === r ? 'bg-white/10 ring-1 ring-white/20' : 'hover:bg-white/5'
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
                {selectedRating} Solar Resource — {ratingProjects.length} projects
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

      {/* Section 5 — Capacity Class Benchmarks (unique to solar) */}
      <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Capacity Class Benchmarks</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Solar capacity factor typically decreases with project size due to inverter clipping and network curtailment.
          This chart shows the pattern across the operating fleet.
        </p>
        <ChartFrame
          title="Solar CF by capacity class"
          height={280}
          data={capacityClassData}
          csvFilename="solar-capacity-class-benchmarks"
        >
          <BarChart data={capacityClassData} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="shortLabel"
              tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
            />
            <YAxis
              domain={[0, 35]}
              tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
              tickFormatter={(v) => `${v}%`}
              label={{ value: 'Median CF %', angle: -90, position: 'insideLeft', fill: 'var(--color-text-muted)', fontSize: 12 }}
            />
            <Tooltip
              {...DARK_TOOLTIP}
              formatter={(value) => [fmtCf(Number(value)), 'Median CF']}
              labelFormatter={(label) => {
                const row = capacityClassData.find((r) => r.shortLabel === label)
                return row
                  ? `${row.className} — ${row.count} farms (${row.total_mw.toLocaleString()} MW) — ${row.rating} — P25: ${fmtCf(row.p25)}, P75: ${fmtCf(row.p75)}`
                  : String(label)
              }}
            />
            <Bar dataKey="median" radius={[4, 4, 0, 0]}>
              {capacityClassData.map((entry, i) => (
                <Cell key={`cls-${i}`} fill={entry.colour} />
              ))}
            </Bar>
          </BarChart>
        </ChartFrame>
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          {RATING_ORDER.map((r) => (
            <div key={r} className="flex items-center gap-1.5 text-xs">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: RATING_COLOURS[r] }} />
              <span className="text-[var(--color-text-muted)]">{r}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Section 6 — Scatter plot: Capacity vs CF */}
      <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Capacity vs Capacity Factor</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Each dot is an operating farm. Colour indicates state. Hover for details.
        </p>
        <ChartFrame title="Capacity vs CF scatter" height={360} data={scatterData} csvFilename="solar-capacity-vs-cf">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="x"
              type="number"
              name="Capacity"
              tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
              label={{ value: 'Capacity (MW)', position: 'insideBottom', offset: -10, fill: 'var(--color-text-muted)', fontSize: 12 }}
            />
            <YAxis
              dataKey="y"
              type="number"
              name="Capacity Factor"
              domain={[0, 35]}
              tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
              tickFormatter={(v) => `${v}%`}
              label={{ value: 'Capacity Factor %', angle: -90, position: 'insideLeft', fill: 'var(--color-text-muted)', fontSize: 12 }}
            />
            <Tooltip
              content={({ payload }) => {
                if (!payload?.length) return null
                const d = payload[0].payload as SolarFarm
                return (
                  <div
                    style={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: 8,
                      padding: 12,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                    }}
                    className="text-sm"
                  >
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
        </ChartFrame>
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          {availableStates.map((state) => (
            <div key={state} className="flex items-center gap-1.5 text-xs">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getStateColour(state) }} />
              <span className="text-[var(--color-text-muted)]">{state}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Section 7 — Operating Solar Farms table */}
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)]">
        <div className="p-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Operating Solar Farms</h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            {data.total_operating} farms. Click column headers to sort.
          </p>
        </div>
        <div className="p-4">
          <DataTable
            rows={data.operating_farms}
            columns={operatingColumns}
            defaultSort={{ key: 'capacity_factor_pct', dir: 'desc' }}
            csvFilename="operating-solar-farms"
            csvColumns={[
              'name', 'state', 'developer', 'capacity_mw',
              'capacity_factor_pct', 'resource_rating', 'energy_price', 'revenue_per_mw',
            ]}
            emptyMessage="No operating solar farms."
          />
        </div>
      </div>

      {/* Section 8 — Development Pipeline */}
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)]">
        <div className="p-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Development Pipeline Predictions</h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Each project's predicted CF is the state average — actual performance will vary with site selection, panel choice, and commissioning year.
          </p>
        </div>
        <div className="p-4">
          <DataTable
            rows={data.development_projects}
            columns={devColumns}
            defaultSort={{ key: 'capacity_mw', dir: 'desc' }}
            csvFilename="solar-development-pipeline"
            csvColumns={['name', 'state', 'developer', 'capacity_mw', 'predicted_cf_pct', 'predicted_rating']}
            emptyMessage="No development projects."
          />
        </div>
      </div>

      {/* Section 9 — Developer benchmarks (conditional) */}
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-4">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Developer Fleet Benchmarks</h2>
        {data.developer_benchmarks.length > 0 ? (
          <>
            <p className="text-xs text-[var(--color-text-muted)] mb-4">
              Developers with 3+ operating solar farms, ranked by fleet median CF.
            </p>
            <DataTable
              rows={data.developer_benchmarks}
              columns={[
                { key: 'developer', label: 'Developer', sortable: true },
                { key: 'project_count', label: 'Projects', align: 'right', format: 'number0' },
                { key: 'total_mw', label: 'Total MW', align: 'right', format: 'number0' },
                {
                  key: 'median',
                  label: 'Median CF',
                  align: 'right',
                  format: 'number1',
                  render: (v) => <span className="font-mono text-[var(--color-text)]">{fmtCf(Number(v))}</span>,
                },
                { key: 'p25', label: 'P25', align: 'right', format: 'number1', render: (v) => fmtCf(Number(v)) },
                { key: 'p75', label: 'P75', align: 'right', format: 'number1', render: (v) => fmtCf(Number(v)) },
                {
                  key: 'rating',
                  label: 'Rating',
                  align: 'center',
                  render: (_v, row) => (
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: `${getRatingColour(row.rating)}33`,
                        color: getRatingColour(row.rating),
                      }}
                    >
                      {row.rating}
                    </span>
                  ),
                },
              ]}
              defaultSort={{ key: 'median', dir: 'desc' }}
              csvFilename="solar-developer-benchmarks"
              emptyMessage="No developer benchmarks."
            />
          </>
        ) : (
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
            Developer fleet benchmarks will populate as more portfolios reach 3+ operating projects — currently
            we have {new Set(data.operating_farms.map((f) => f.developer).filter(Boolean)).size} developers
            with 2 or fewer solar farms operating.
          </p>
        )}
      </div>

      {/* Source note */}
      <div className="text-xs text-[var(--color-text-muted)] italic">
        Capacity factors derived from AEMO / OpenElectricity generation data. Solar resource ratings:
        Excellent (&ge;29%), Good (24-29%), Average (20-24%), Below Average (&lt;20%).
        Development predictions based on state-level fleet averages.
      </div>
    </div>
  )
}
