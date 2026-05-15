import { useState, useEffect, useMemo } from 'react'
import { fetchGenerationProfiles } from '../../lib/dataService'
import type { GenerationProfileData, GenerationSeasonProfile } from '../../lib/types'

// ============================================================
// Constants
// ============================================================

const REGION_ORDER = ['SA1', 'VIC1', 'NSW1', 'QLD1', 'TAS1']

const REGION_SHORT: Record<string, string> = {
  SA1: 'SA', VIC1: 'VIC', NSW1: 'NSW', QLD1: 'QLD', TAS1: 'TAS',
}

const SEASON_ORDER = ['summer', 'autumn', 'winter', 'spring'] as const

const SEASON_ICONS: Record<string, string> = {
  summer: '☀️', autumn: '🍂', winter: '❄️', spring: '🌱',
}

// ============================================================
// SVG Stacked Area Chart
// ============================================================

function StackedAreaTOD({
  profile,
  colours,
  labels,
  stackOrder,
  width = 800,
  height = 340,
}: {
  profile: GenerationSeasonProfile
  colours: Record<string, string>
  labels: Record<string, string>
  stackOrder: string[]
  width?: number
  height?: number
}) {
  const padL = 55
  const padR = 15
  const padT = 15
  const padB = 40
  const chartW = width - padL - padR
  const chartH = height - padT - padB

  // Only fuels present in this profile, in stack order
  const fuels = stackOrder.filter(f => profile.profiles[f]?.some(v => v > 0))

  // Compute stacked values
  const stacked: number[][] = Array.from({ length: 24 }, () => Array(fuels.length).fill(0))
  for (let h = 0; h < 24; h++) {
    let cumulative = 0
    for (let fi = 0; fi < fuels.length; fi++) {
      const val = profile.profiles[fuels[fi]]?.[h] ?? 0
      cumulative += val
      stacked[h][fi] = cumulative
    }
  }

  // Max value for Y scale
  const maxY = Math.max(
    ...stacked.map(s => s[s.length - 1] || 0),
    ...profile.demand
  )
  const yMax = Math.ceil(maxY / 500) * 500 || 1000

  const xScale = (h: number) => padL + (h / 23) * chartW
  const yScale = (v: number) => padT + chartH - (v / yMax) * chartH

  // Build area paths (top-down so first painted is back)
  const areaPaths: { fuel: string; path: string; colour: string }[] = []
  for (let fi = fuels.length - 1; fi >= 0; fi--) {
    const topPoints = Array.from({ length: 24 }, (_, h) => `${xScale(h)},${yScale(stacked[h][fi])}`)
    const bottomPoints = fi > 0
      ? Array.from({ length: 24 }, (_, h) => `${xScale(23 - h)},${yScale(stacked[23 - h][fi - 1])}`)
      : Array.from({ length: 24 }, (_, h) => `${xScale(23 - h)},${yScale(0)}`)

    areaPaths.push({
      fuel: fuels[fi],
      path: `M${topPoints.join(' L')} L${bottomPoints.join(' L')} Z`,
      colour: colours[fuels[fi]] || '#666',
    })
  }

  // Demand line
  const demandPath = profile.demand
    .map((d, h) => `${h === 0 ? 'M' : 'L'}${xScale(h)},${yScale(d)}`)
    .join(' ')

  // Y-axis ticks
  const yTickCount = 5
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) => Math.round((yMax / yTickCount) * i))

  // Hover state
  const [hoverHour, setHoverHour] = useState<number | null>(null)

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ maxHeight: height }}
        onMouseLeave={() => setHoverHour(null)}
      >
        {/* Grid lines */}
        {yTicks.map(tick => (
          <g key={tick}>
            <line
              x1={padL} y1={yScale(tick)} x2={width - padR} y2={yScale(tick)}
              stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="3 3"
            />
            <text x={padL - 8} y={yScale(tick) + 4} textAnchor="end"
              fill="var(--color-text-muted)" fontSize="10">
              {tick >= 1000 ? `${(tick / 1000).toFixed(1)}k` : tick}
            </text>
          </g>
        ))}

        {/* Y-axis label */}
        <text x={14} y={padT + chartH / 2} textAnchor="middle"
          fill="var(--color-text-muted)" fontSize="10"
          transform={`rotate(-90, 14, ${padT + chartH / 2})`}>
          MW
        </text>

        {/* Stacked areas */}
        {areaPaths.map(({ fuel, path, colour }) => (
          <path key={fuel} d={path} fill={colour} fillOpacity={0.85} />
        ))}

        {/* Demand line */}
        <path d={demandPath} fill="none" stroke="#f1f5f9" strokeWidth="1.5"
          strokeDasharray="4 3" opacity={0.7} />

        {/* X-axis labels */}
        {[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22].map(h => (
          <text key={h} x={xScale(h)} y={height - 8} textAnchor="middle"
            fill="var(--color-text-muted)" fontSize="10">
            {h}
          </text>
        ))}

        {/* X-axis label */}
        <text x={padL + chartW / 2} y={height - 0} textAnchor="middle"
          fill="var(--color-text-muted)" fontSize="10">
          Hour of Day
        </text>

        {/* Hover zones */}
        {Array.from({ length: 24 }, (_, h) => (
          <rect
            key={h}
            x={xScale(h) - chartW / 48}
            y={padT}
            width={chartW / 24}
            height={chartH}
            fill="transparent"
            onMouseEnter={() => setHoverHour(h)}
          />
        ))}

        {/* Hover line */}
        {hoverHour !== null && (
          <line
            x1={xScale(hoverHour)} y1={padT}
            x2={xScale(hoverHour)} y2={padT + chartH}
            stroke="var(--color-text)" strokeWidth="1" opacity={0.4}
          />
        )}
      </svg>

      {/* Tooltip */}
      {hoverHour !== null && (
        <div
          className="absolute bg-[#1e293b] border border-[#334155] rounded-lg p-3 text-xs shadow-xl pointer-events-none z-10"
          style={{
            left: hoverHour < 12 ? `${((hoverHour + 1) / 24) * 100}%` : 'auto',
            right: hoverHour >= 12 ? `${((24 - hoverHour) / 24) * 100}%` : 'auto',
            top: '20px',
          }}
        >
          <div className="font-medium text-[#f1f5f9] mb-1.5">
            {String(hoverHour).padStart(2, '0')}:00 – {String(hoverHour + 1).padStart(2, '0')}:00
          </div>
          {[...fuels].reverse().map(fuel => {
            const val = profile.profiles[fuel]?.[hoverHour] ?? 0
            if (val < 1) return null
            return (
              <div key={fuel} className="flex items-center gap-2 text-[#94a3b8]">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colours[fuel] }} />
                <span>{labels[fuel] || fuel}</span>
                <span className="ml-auto font-medium text-[#f1f5f9]">
                  {val >= 1000 ? `${(val / 1000).toFixed(1)} GW` : `${Math.round(val)} MW`}
                </span>
              </div>
            )
          })}
          <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-[#334155] text-[#94a3b8]">
            <span className="w-2 h-2 rounded-full bg-white/50" />
            <span>Demand</span>
            <span className="ml-auto font-medium text-[#f1f5f9]">
              {profile.demand[hoverHour] >= 1000
                ? `${(profile.demand[hoverHour] / 1000).toFixed(1)} GW`
                : `${Math.round(profile.demand[hoverHour])} MW`}
            </span>
          </div>
          {profile.price[hoverHour] !== undefined && (
            <div className="flex items-center gap-2 text-[#94a3b8]">
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              <span>Price</span>
              <span className="ml-auto font-medium text-[#f1f5f9]">
                ${profile.price[hoverHour].toFixed(0)}/MWh
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Price Chart (small, below main chart)
// ============================================================

function PriceChart({
  prices,
  width = 800,
  height = 80,
}: {
  prices: number[]
  width?: number
  height?: number
}) {
  const padL = 55
  const padR = 15
  const padT = 5
  const padB = 10
  const chartW = width - padL - padR
  const chartH = height - padT - padB

  const maxP = Math.max(...prices.map(Math.abs), 50)
  const minP = Math.min(...prices, 0)
  const range = maxP - minP

  const xScale = (h: number) => padL + (h / 23) * chartW
  const yScale = (v: number) => padT + chartH - ((v - minP) / range) * chartH

  const linePath = prices
    .map((p, h) => `${h === 0 ? 'M' : 'L'}${xScale(h)},${yScale(p)}`)
    .join(' ')

  // Zero line if there are negative prices
  const zeroY = yScale(0)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: height }}>
      {/* Zero line */}
      <line x1={padL} y1={zeroY} x2={width - padR} y2={zeroY}
        stroke="#ef4444" strokeWidth="0.5" opacity={0.5} />

      {/* Price line */}
      <path d={linePath} fill="none" stroke="#d69e2e" strokeWidth="2" />

      {/* Y label */}
      <text x={14} y={padT + chartH / 2} textAnchor="middle"
        fill="var(--color-text-muted)" fontSize="9"
        transform={`rotate(-90, 14, ${padT + chartH / 2})`}>
        $/MWh
      </text>

      {/* Y ticks */}
      <text x={padL - 8} y={yScale(maxP) + 3} textAnchor="end"
        fill="var(--color-text-muted)" fontSize="9">
        {maxP.toFixed(0)}
      </text>
      {minP < 0 && (
        <text x={padL - 8} y={zeroY + 3} textAnchor="end"
          fill="var(--color-text-muted)" fontSize="9">0</text>
      )}

      {/* Label */}
      <text x={padL + chartW / 2} y={padT + 10} textAnchor="middle"
        fill="var(--color-text-muted)" fontSize="10" fontWeight="500">
        Average Price
      </text>
    </svg>
  )
}

// ============================================================
// Year-over-Year Comparison (small multiples)
// ============================================================

function YoYComparison({
  seasons,
  colours,
  labels,
  stackOrder,
  selectedSeason,
}: {
  seasons: GenerationSeasonProfile[]
  colours: Record<string, string>
  labels: Record<string, string>
  stackOrder: string[]
  selectedSeason: string
}) {
  const filtered = seasons.filter(s => s.season === selectedSeason)
    .sort((a, b) => a.year - b.year)

  if (filtered.length < 2) return null

  return (
    <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
      <h3 className="text-sm font-semibold text-[var(--color-text)] mb-1">
        Year-on-Year Comparison — {SEASON_ICONS[selectedSeason]} {selectedSeason.charAt(0).toUpperCase() + selectedSeason.slice(1)}
      </h3>
      <p className="text-xs text-[var(--color-text-muted)] mb-4">
        How the daily generation pattern is evolving each {selectedSeason}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(profile => (
          <div key={profile.key} className="bg-[var(--color-bg)] rounded-lg p-2 border border-[var(--color-border)]">
            <div className="text-xs font-medium text-[var(--color-text)] mb-1 text-center">
              {profile.label}
            </div>
            <StackedAreaTOD
              profile={profile}
              colours={colours}
              labels={labels}
              stackOrder={stackOrder}
              width={400}
              height={200}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// Key Metrics Summary
// ============================================================

function MetricsSummary({ profile }: { profile: GenerationSeasonProfile }) {
  // Compute average MW per fuel over 24 hours
  const fuelAvgs: { fuel: string; avg: number }[] = []
  for (const [fuel, hourly] of Object.entries(profile.profiles)) {
    const avg = hourly.reduce((s, v) => s + v, 0) / 24
    if (avg > 1) fuelAvgs.push({ fuel, avg })
  }
  fuelAvgs.sort((a, b) => b.avg - a.avg)

  const totalAvg = fuelAvgs.reduce((s, f) => s + f.avg, 0)
  const renewableAvg = fuelAvgs
    .filter(f => ['wind', 'solar_utility', 'solar_rooftop', 'hydro'].includes(f.fuel))
    .reduce((s, f) => s + f.avg, 0)
  const renewablePct = totalAvg > 0 ? (renewableAvg / totalAvg) * 100 : 0

  const peakDemand = Math.max(...profile.demand)

  const avgPrice = profile.price.reduce((s, v) => s + v, 0) / 24
  const peakPrice = Math.max(...profile.price)
  const minPrice = Math.min(...profile.price)

  const batteryAvg = fuelAvgs.find(f => f.fuel === 'battery')?.avg ?? 0
  const gasAvg = fuelAvgs.find(f => f.fuel === 'gas')?.avg ?? 0

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      <StatCard label="Renewable Share" value={`${renewablePct.toFixed(0)}%`} colour="text-emerald-400" />
      <StatCard label="Peak Demand" value={peakDemand >= 1000 ? `${(peakDemand / 1000).toFixed(1)} GW` : `${Math.round(peakDemand)} MW`} colour="text-blue-400" />
      <StatCard label="Avg Price" value={`$${avgPrice.toFixed(0)}/MWh`} colour="text-yellow-400" />
      <StatCard label="Price Range" value={`$${minPrice.toFixed(0)}–$${peakPrice.toFixed(0)}`} colour="text-amber-400" />
      <StatCard label="Avg Battery" value={batteryAvg >= 1000 ? `${(batteryAvg / 1000).toFixed(1)} GW` : `${Math.round(batteryAvg)} MW`} colour="text-purple-400" />
      <StatCard label="Avg Gas" value={gasAvg >= 1000 ? `${(gasAvg / 1000).toFixed(1)} GW` : `${Math.round(gasAvg)} MW`} colour="text-orange-400" />
    </div>
  )
}

function StatCard({ label, value, colour }: { label: string; value: string; colour: string }) {
  return (
    <div className="bg-[var(--color-bg-card)] rounded-lg p-3 border border-[var(--color-border)]">
      <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">{label}</div>
      <div className={`text-lg font-bold ${colour}`}>{value}</div>
    </div>
  )
}

// ============================================================
// Legend
// ============================================================

function StackLegend({ fuels, colours, labels }: {
  fuels: string[]
  colours: Record<string, string>
  labels: Record<string, string>
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {fuels.map(fuel => (
        <div key={fuel} className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: colours[fuel] }} />
          <span>{labels[fuel] || fuel}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
        <span className="w-3 h-0.5 inline-block bg-white/50 border-t border-dashed border-white/50" />
        <span>Demand</span>
      </div>
    </div>
  )
}

// ============================================================
// Main Component
// ============================================================

export default function GenerationStack() {
  const [data, setData] = useState<GenerationProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedRegion, setSelectedRegion] = useState('SA1')
  const [selectedSeason, setSelectedSeason] = useState<string>('autumn')
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [showYoY, setShowYoY] = useState(false)

  useEffect(() => {
    fetchGenerationProfiles().then(d => {
      setData(d)
      setLoading(false)
      // Default to most recent season
      if (d) {
        const region = d.regions[selectedRegion]
        if (region?.seasons.length) {
          const latest = region.seasons[region.seasons.length - 1]
          setSelectedSeason(latest.season)
          setSelectedYear(latest.year)
        }
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Available years for the selected region + season
  const availableYears = useMemo(() => {
    if (!data) return []
    const region = data.regions[selectedRegion]
    if (!region) return []
    const years = [...new Set(
      region.seasons
        .filter(s => s.season === selectedSeason)
        .map(s => s.year)
    )].sort()
    return years
  }, [data, selectedRegion, selectedSeason])

  // Auto-select latest year when season changes
  useEffect(() => {
    if (availableYears.length && (!selectedYear || !availableYears.includes(selectedYear))) {
      setSelectedYear(availableYears[availableYears.length - 1])
    }
  }, [availableYears, selectedYear])

  // Selected profile
  const selectedProfile = useMemo(() => {
    if (!data || !selectedYear) return null
    const region = data.regions[selectedRegion]
    return region?.seasons.find(s => s.season === selectedSeason && s.year === selectedYear) ?? null
  }, [data, selectedRegion, selectedSeason, selectedYear])

  // Fuels present in the current profile
  const activeFuels = useMemo(() => {
    if (!data || !selectedProfile) return []
    return data.stack_order.filter(f => selectedProfile.profiles[f]?.some(v => v > 0))
  }, [data, selectedProfile])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  if (!data || Object.keys(data.regions).length === 0) {
    return (
      <div className="p-6 text-center text-[var(--color-text-muted)]">
        <p>No generation profile data available</p>
        <p className="text-xs mt-2">Run the pipeline importer to fetch data from Open Electricity.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Info / Methodology */}
      <details className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
        <summary className="text-sm font-medium text-[var(--color-text)] cursor-pointer flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          About this data & methodology
        </summary>
        <div className="mt-3 text-xs text-[var(--color-text-muted)] space-y-3">
          <div>
            <h4 className="text-[var(--color-text)] font-semibold mb-1">Data Source</h4>
            <p>
              Generation data is sourced from the{' '}
              <a href="https://openelectricity.org.au" target="_blank" rel="noopener noreferrer"
                className="text-[var(--color-primary)] hover:underline">Open Electricity</a>{' '}
              platform (openelectricity.org.au), which provides open access to Australia's National
              Electricity Market (NEM) data. Open Electricity aggregates real-time and historical
              dispatch data from AEMO (Australian Energy Market Operator) and makes it available
              via a public API.
            </p>
          </div>

          <div>
            <h4 className="text-[var(--color-text)] font-semibold mb-1">What the chart shows</h4>
            <p>
              Each chart displays the <strong className="text-[var(--color-text)]">average generation
              (MW) by hour of day</strong> for a given NEM region and season. The stacked areas represent
              how much each fuel type (wind, solar, gas, coal, battery, etc.) is generating on average
              at each hour from midnight to midnight. The dashed line shows average demand. The price
              sub-chart shows the average wholesale spot price ($/MWh) for each hour.
            </p>
          </div>

          <div>
            <h4 className="text-[var(--color-text)] font-semibold mb-1">Processing Method</h4>
            <p>
              The AURES pipeline fetches <strong className="text-[var(--color-text)]">hourly power output
              data</strong> (1-hour intervals) from the Open Electricity API for each NEM region,
              broken down by individual fuel technology (e.g. gas_ccgt, gas_ocgt, solar_utility,
              solar_rooftop, wind, battery_discharging, etc.). Related fuel types are then grouped
              into display categories (e.g. all gas types → "Gas"). For each hour of the day (0–23),
              we compute the <strong className="text-[var(--color-text)]">arithmetic mean</strong> across
              all days in the season, giving a representative 24-hour generation profile that smooths
              out day-to-day variability while preserving the characteristic daily shape.
            </p>
          </div>

          <div>
            <h4 className="text-[var(--color-text)] font-semibold mb-1">Season Definitions</h4>
            <p>Seasons follow the Australian meteorological convention:</p>
            <ul className="list-disc pl-4 mt-1 space-y-0.5">
              <li><strong className="text-[var(--color-text)]">Summer</strong> — December (previous year), January, February (e.g. "Summer 2024/25" = Dec 2024 – Feb 2025)</li>
              <li><strong className="text-[var(--color-text)]">Autumn</strong> — March, April, May</li>
              <li><strong className="text-[var(--color-text)]">Winter</strong> — June, July, August</li>
              <li><strong className="text-[var(--color-text)]">Spring</strong> — September, October, November</li>
            </ul>
            <p className="mt-1">
              Each season covers approximately 90 days of hourly data (~2,160 data points per fuel type).
              The API is queried in monthly chunks (≤31 days each, the maximum window for hourly-interval
              requests), then combined before averaging.
            </p>
          </div>

          <div>
            <h4 className="text-[var(--color-text)] font-semibold mb-1">NEM Regions</h4>
            <p>
              The five NEM regions correspond to Australian states:{' '}
              <strong className="text-[var(--color-text)]">SA</strong> (South Australia),{' '}
              <strong className="text-[var(--color-text)]">VIC</strong> (Victoria),{' '}
              <strong className="text-[var(--color-text)]">NSW</strong> (New South Wales),{' '}
              <strong className="text-[var(--color-text)]">QLD</strong> (Queensland), and{' '}
              <strong className="text-[var(--color-text)]">TAS</strong> (Tasmania).
              Each has a distinct generation mix — SA has no coal and leads in battery deployment;
              VIC has brown coal; NSW and QLD have black coal; TAS is dominated by hydro.
            </p>
          </div>

          <div>
            <h4 className="text-[var(--color-text)] font-semibold mb-1">Why seasons matter</h4>
            <p>
              Seasonal comparison reveals the energy transition in action. As the article that inspired
              this tool notes: <em>"Spring and now Autumn tells us about the system that we are building.
              Winter tells you about the system we used to have."</em> SA in particular is a preview of
              where the rest of the NEM is heading — batteries are already delivering higher peak morning
              supply than gas, and their share grows each season.
            </p>
          </div>

          <div>
            <h4 className="text-[var(--color-text)] font-semibold mb-1">Fuel type categories</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#4a5568' }} /> Coal (black + brown)</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#c05621' }} /> Gas (CCGT, OCGT, reciprocating, steam)</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#5b21b6' }} /> Battery (discharging only)</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#2563eb' }} /> Hydro</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#d69e2e' }} /> Solar (utility-scale)</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#ecc94b' }} /> Rooftop Solar (distributed)</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#588157' }} /> Wind</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#9f1239' }} /> Imports (interconnector flows)</div>
            </div>
          </div>
        </div>
      </details>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        {/* Region selector */}
        <div>
          <label className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
            Region
          </label>
          <div className="flex gap-1">
            {REGION_ORDER.filter(r => r in data.regions).map(region => (
              <button
                key={region}
                onClick={() => setSelectedRegion(region)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedRegion === region
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)]'
                }`}
              >
                {REGION_SHORT[region]}
              </button>
            ))}
          </div>
        </div>

        {/* Season selector */}
        <div>
          <label className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
            Season
          </label>
          <div className="flex gap-1">
            {SEASON_ORDER.map(season => (
              <button
                key={season}
                onClick={() => setSelectedSeason(season)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedSeason === season
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)]'
                }`}
              >
                {SEASON_ICONS[season]} {season.charAt(0).toUpperCase() + season.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Year selector */}
        <div>
          <label className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
            Year
          </label>
          <select
            value={selectedYear ?? ''}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--color-text)] focus:outline-none focus:border-blue-500"
          >
            {availableYears.map(yr => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>
        </div>

        {/* YoY toggle */}
        <button
          onClick={() => setShowYoY(!showYoY)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            showYoY
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)]'
          }`}
        >
          📊 Year-on-Year
        </button>
      </div>

      {/* Main chart */}
      {selectedProfile && (
        <>
          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-base font-semibold text-[var(--color-text)]">
                  Average Generation by Time of Day — {data.regions[selectedRegion]?.name}
                </h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {selectedProfile.label} · {selectedProfile.period}
                </p>
              </div>
            </div>

            <StackedAreaTOD
              profile={selectedProfile}
              colours={data.colours}
              labels={data.labels}
              stackOrder={data.stack_order}
            />

            <PriceChart prices={selectedProfile.price} />

            {/* Legend */}
            <div className="mt-3">
              <StackLegend fuels={activeFuels} colours={data.colours} labels={data.labels} />
            </div>
          </div>

          {/* Metrics */}
          <MetricsSummary profile={selectedProfile} />

          {/* Insight */}
          <InsightPanel profile={selectedProfile} data={data} regionCode={selectedRegion} />
        </>
      )}

      {/* Year-on-Year comparison */}
      {showYoY && data.regions[selectedRegion] && (
        <YoYComparison
          seasons={data.regions[selectedRegion].seasons}
          colours={data.colours}
          labels={data.labels}
          stackOrder={data.stack_order}
          selectedSeason={selectedSeason}
        />
      )}

      {/* Source note */}
      <div className="text-[10px] text-[var(--color-text-muted)] italic">
        Data sourced from{' '}
        <a href="https://openelectricity.org.au" target="_blank" rel="noopener noreferrer"
          className="text-[var(--color-primary)] hover:underline">Open Electricity</a>{' '}
        (openelectricity.org.au) via AEMO NEM dispatch data. Each data point is the arithmetic mean
        of hourly generation across all days in the selected season (~90 days). Demand shown as dashed line.
        Price chart shows average wholesale spot price by hour.
      </div>
    </div>
  )
}

// ============================================================
// Dynamic Insight Panel
// ============================================================

function InsightPanel({
  profile,
  data,
  regionCode,
}: {
  profile: GenerationSeasonProfile
  data: GenerationProfileData
  regionCode: string
}) {
  const insights: string[] = []

  const batteryProfile = profile.profiles.battery ?? []
  const gasProfile = profile.profiles.gas ?? []
  const windProfile = profile.profiles.wind ?? []
  const solarProfile = profile.profiles.solar_utility ?? []
  const rooftopProfile = profile.profiles.solar_rooftop ?? []

  const batteryPeak = Math.max(...batteryProfile, 0)
  const gasPeak = Math.max(...gasProfile, 0)

  // Battery vs gas insight
  if (batteryPeak > 0 && gasPeak > 0) {
    const morningBattery = batteryProfile.slice(6, 10).reduce((s, v) => s + v, 0) / 4
    const morningGas = gasProfile.slice(6, 10).reduce((s, v) => s + v, 0) / 4
    if (morningBattery > morningGas) {
      insights.push(`Batteries (avg ${Math.round(morningBattery)} MW) are delivering higher peak morning supply than gas (${Math.round(morningGas)} MW) during 6–10am.`)
    }

    const eveningBattery = batteryProfile.slice(17, 21).reduce((s, v) => s + v, 0) / 4
    const eveningGas = gasProfile.slice(17, 21).reduce((s, v) => s + v, 0) / 4
    const ratio = eveningGas / Math.max(eveningBattery, 1)
    if (ratio > 1.5 && ratio < 5) {
      insights.push(`Gas is still ${ratio.toFixed(1)}× larger than batteries in the evening peak (5–9pm), but battery share is growing.`)
    } else if (eveningBattery > eveningGas) {
      insights.push(`Batteries have overtaken gas even in the evening peak — a major milestone.`)
    }
  }

  // Solar duck curve
  const solarMid = [...(solarProfile.slice(10, 14)), ...(rooftopProfile.slice(10, 14))]
  const solarPeakMW = Math.max(...solarMid, 0)
  if (solarPeakMW > 0) {
    const demandMin = Math.min(...profile.demand.slice(10, 14))
    if (solarPeakMW > demandMin * 0.5) {
      insights.push(`Combined solar generation reaches ${solarPeakMW >= 1000 ? `${(solarPeakMW / 1000).toFixed(1)} GW` : `${Math.round(solarPeakMW)} MW`} midday, creating strong battery charging opportunity.`)
    }
  }

  // Wind contribution
  const windAvg = windProfile.reduce((s, v) => s + v, 0) / Math.max(windProfile.length, 1)
  const totalAvg = Object.values(profile.profiles).reduce((sum, arr) => sum + arr.reduce((s, v) => s + v, 0) / 24, 0)
  if (windAvg > 0 && totalAvg > 0) {
    const windShare = (windAvg / totalAvg) * 100
    if (windShare > 25) {
      insights.push(`Wind provides ${windShare.toFixed(0)}% of average generation, with strongest output overnight when solar is unavailable.`)
    }
  }

  // Compare to previous year
  const region = data.regions[regionCode]
  if (region) {
    const prevYear = region.seasons.find(s => s.season === profile.season && s.year === profile.year - 1)
    if (prevYear) {
      const prevBatteryAvg = (prevYear.profiles.battery ?? []).reduce((s, v) => s + v, 0) / 24
      const currBatteryAvg = batteryProfile.reduce((s, v) => s + v, 0) / 24
      if (prevBatteryAvg > 0 && currBatteryAvg > prevBatteryAvg * 1.2) {
        const growth = ((currBatteryAvg - prevBatteryAvg) / prevBatteryAvg * 100)
        insights.push(`Battery output has grown ${growth.toFixed(0)}% compared to the same season last year.`)
      }

      const prevGasAvg = (prevYear.profiles.gas ?? []).reduce((s, v) => s + v, 0) / 24
      const currGasAvg = gasProfile.reduce((s, v) => s + v, 0) / 24
      if (prevGasAvg > 0 && currGasAvg < prevGasAvg * 0.9) {
        const decline = ((prevGasAvg - currGasAvg) / prevGasAvg * 100)
        insights.push(`Gas generation has declined ${decline.toFixed(0)}% year-on-year as batteries and renewables take share.`)
      }
    }
  }

  if (insights.length === 0) return null

  return (
    <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-blue-500/20">
      <h3 className="text-sm font-semibold text-blue-400 mb-2">💡 Key Observations</h3>
      <ul className="space-y-1.5">
        {insights.map((insight, i) => (
          <li key={i} className="text-xs text-[var(--color-text-muted)] flex gap-2">
            <span className="text-blue-400 mt-0.5">•</span>
            <span>{insight}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
