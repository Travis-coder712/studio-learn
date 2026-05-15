import { useState, useMemo } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

type Season = 'summer' | 'annual' | 'winter'

interface HourlyData {
  hour: number
  demand: number
  solar: number
  wind: number
  charge: number
  discharge: number
  gas: number
  curtailed: number
  soc: number
}

interface DispatchResult {
  solarGW: number
  windGW: number
  bessGW: number
  bessGWh: number
  gasGW: number
  targetEnergy_TWh: number
  costB: number
  co2_Mt: number
  totalNewGW: number
  hourlyData: HourlyData[]
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SOLAR_PROFILE = [0, 0, 0, 0, 0, 0.05, 0.2, 0.5, 0.75, 0.9, 0.97, 1.0, 0.98, 0.92, 0.8, 0.6, 0.35, 0.1, 0, 0, 0, 0, 0, 0]
const WIND_PROFILE = [0.42, 0.44, 0.45, 0.44, 0.42, 0.38, 0.34, 0.30, 0.28, 0.27, 0.28, 0.30, 0.32, 0.33, 0.34, 0.35, 0.36, 0.37, 0.38, 0.39, 0.40, 0.41, 0.42, 0.42]
const DEMAND_PROFILE = [0.65, 0.60, 0.58, 0.57, 0.58, 0.62, 0.72, 0.85, 0.92, 0.95, 0.93, 0.90, 0.88, 0.87, 0.88, 0.92, 0.97, 1.00, 0.98, 0.92, 0.85, 0.78, 0.72, 0.68]

const CF = {
  solar_summer: 0.28,
  solar_winter: 0.16,
  solar_annual: 0.22,
  wind_annual: 0.33,
  wind_drought: 0.08,
  bess_rte: 0.87,
}

const CAPEX = {
  solar_per_GW: 1.2,
  wind_per_GW: 2.0,
  bess_power_per_GW: 0.8,
  bess_energy_per_GWh: 0.4,
  gas_per_GW: 0.9,
}

const NEM_MIX = [
  { label: 'Coal', pct: 45, color: '#4a5568' },
  { label: 'Gas', pct: 17, color: '#ed8936' },
  { label: 'Solar', pct: 18, color: '#ecc94b' },
  { label: 'Wind', pct: 12, color: '#48bb78' },
  { label: 'Hydro', pct: 5, color: '#4299e1' },
  { label: 'Other', pct: 3, color: '#a0aec0' },
]

const AEMO_ISP = {
  solarGW: 46,
  windGW: 32,
  bessGW: 18,
  label: 'AEMO ISP 2050',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtGW(v: number): string {
  return v < 1 ? `${(v * 1000).toFixed(0)} MW` : `${v.toFixed(1)} GW`
}

function fmtGWh(v: number): string {
  return v < 1 ? `${(v * 1000).toFixed(0)} MWh` : `${v.toFixed(1)} GWh`
}

function fmtTWh(v: number): string {
  return `${v.toFixed(1)} TWh`
}

function fmtCost(v: number): string {
  return `$${v.toFixed(1)}B`
}

function fmtMt(v: number): string {
  return `${v.toFixed(1)} Mt`
}

// ─── Dispatch Simulation ─────────────────────────────────────────────────────

function simulateDispatch(
  coalGW: number,
  solarPct: number,
  season: Season,
  windDrought: boolean,
): DispatchResult {
  const targetEnergy_TWh = coalGW * 0.70 * 8.76
  const solarCF = season === 'summer' ? CF.solar_summer : season === 'winter' ? CF.solar_winter : CF.solar_annual
  const windCF = windDrought ? CF.wind_drought : CF.wind_annual
  const windPct = 1 - solarPct

  const solarGW = solarPct > 0 ? (targetEnergy_TWh * solarPct) / (solarCF * 8.76) : 0
  const windGW = windPct > 0 ? (targetEnergy_TWh * windPct) / (windCF * 8.76) : 0

  const avgDemand = coalGW * 0.70
  const demandAvg = DEMAND_PROFILE.reduce((a, b) => a + b, 0) / 24

  let maxCharge = 0
  let maxDischarge = 0
  let maxGas = 0
  let soc = 0
  let maxSOC = 0
  const hourlyData: HourlyData[] = []

  for (let h = 0; h < 24; h++) {
    const demand = avgDemand * DEMAND_PROFILE[h] / demandAvg
    const solar = solarGW * SOLAR_PROFILE[h] * (solarCF / CF.solar_annual)
    const wind = windGW * WIND_PROFILE[h] * (windCF / CF.wind_annual)
    const renewable = solar + wind
    const surplus = renewable - demand

    let charge = 0
    let discharge = 0
    let gas = 0
    let curtailed = 0

    if (surplus > 0) {
      const maxChargeRate = Math.max(solarGW * 0.5, 0.5)
      charge = Math.min(surplus, maxChargeRate)
      soc += charge * CF.bess_rte
      curtailed = Math.max(0, surplus - charge)
      maxCharge = Math.max(maxCharge, charge)
      maxSOC = Math.max(maxSOC, soc)
    } else {
      const deficit = -surplus
      const maxDischargeRate = maxCharge > 0 ? maxCharge : 0.5
      discharge = Math.min(deficit, soc, maxDischargeRate)
      soc -= discharge
      maxDischarge = Math.max(maxDischarge, discharge)
      gas = deficit - discharge
      maxGas = Math.max(maxGas, gas)
    }

    hourlyData.push({ hour: h, demand, solar, wind, charge, discharge, gas, curtailed, soc })
  }

  const bessGW = Math.max(maxCharge, maxDischarge)
  const bessGWh = maxSOC * 1.15
  const gasGW = maxGas * 1.1

  const costB =
    solarGW * CAPEX.solar_per_GW +
    windGW * CAPEX.wind_per_GW +
    bessGW * CAPEX.bess_power_per_GW +
    bessGWh * CAPEX.bess_energy_per_GWh +
    gasGW * CAPEX.gas_per_GW

  const co2_Mt = targetEnergy_TWh * 0.9
  const totalNewGW = solarGW + windGW + bessGW + gasGW

  return { solarGW, windGW, bessGW, bessGWh, gasGW, targetEnergy_TWh, costB, co2_Mt, totalNewGW, hourlyData }
}

function simulateForSeason(coalGW: number, solarPct: number, s: Season): HourlyData[] {
  return simulateDispatch(coalGW, solarPct, s, false).hourlyData
}

function simulateWindDroughtWeek(coalGW: number, solarPct: number): HourlyData[][] {
  const days: HourlyData[][] = []
  for (let d = 0; d < 7; d++) {
    const dayData = simulateDispatch(coalGW, solarPct, 'annual', true).hourlyData
    days.push(dayData)
  }
  return days
}

// ─── SVG Chart Components ────────────────────────────────────────────────────

function StackedAreaChart({
  hourlyData,
  width = 800,
  height = 400,
  showLabels = true,
  compact = false,
}: {
  hourlyData: HourlyData[]
  width?: number
  height?: number
  showLabels?: boolean
  compact?: boolean
}) {
  if (!hourlyData || hourlyData.length === 0) return null

  const padL = compact ? 35 : 50
  const padR = compact ? 10 : 20
  const padT = compact ? 15 : 25
  const padB = compact ? 25 : 40
  const chartW = width - padL - padR
  const chartH = height - padT - padB

  const maxGenStack = Math.max(
    ...hourlyData.map(d => d.wind + d.solar + d.discharge + d.gas),
    ...hourlyData.map(d => d.demand),
  )
  const maxCharge = Math.max(...hourlyData.map(d => d.charge))
  const yMax = Math.max(maxGenStack, 1) * 1.1
  const yMin = maxCharge > 0 ? -maxCharge * 1.15 : 0
  const yRange = yMax - yMin

  function xPos(h: number): number { return padL + (h / 23) * chartW }
  function yPos(v: number): number { return padT + chartH * (1 - (v - yMin) / yRange) }

  const windY = hourlyData.map(d => d.wind)
  const solarY = hourlyData.map(d => d.wind + d.solar)
  const batteryY = hourlyData.map(d => d.wind + d.solar + d.discharge)
  const gasY = hourlyData.map(d => d.wind + d.solar + d.discharge + d.gas)

  function areaPath(topVals: number[], bottomVals: number[]): string {
    let path = ''
    for (let i = 0; i < 24; i++) {
      path += i === 0 ? `M ${xPos(i)} ${yPos(topVals[i])}` : ` L ${xPos(i)} ${yPos(topVals[i])}`
    }
    for (let i = 23; i >= 0; i--) {
      path += ` L ${xPos(i)} ${yPos(bottomVals[i])}`
    }
    return path + ' Z'
  }

  function linePath(vals: number[]): string {
    let path = ''
    for (let i = 0; i < 24; i++) {
      path += i === 0 ? `M ${xPos(i)} ${yPos(vals[i])}` : ` L ${xPos(i)} ${yPos(vals[i])}`
    }
    return path
  }

  const zeros = new Array(24).fill(0)
  const chargeVals = hourlyData.map(d => -d.charge)
  const demandVals = hourlyData.map(d => d.demand)

  const yTickCount = compact ? 3 : 5
  const yStep = yMax / yTickCount
  const yTicks: number[] = []
  for (let i = 0; i <= yTickCount; i++) yTicks.push(Math.round(yStep * i * 10) / 10)

  const xLabels = compact ? [0, 6, 12, 18, 23] : [0, 3, 6, 9, 12, 15, 18, 21]
  const hourLabels: Record<number, string> = {
    0: '12am', 3: '3am', 6: '6am', 9: '9am',
    12: '12pm', 15: '3pm', 18: '6pm', 21: '9pm', 23: '11pm',
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {yTicks.map(tick => (
        <line key={tick} x1={padL} x2={width - padR} y1={yPos(tick)} y2={yPos(tick)} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
      ))}
      {yMin < 0 && <line x1={padL} x2={width - padR} y1={yPos(0)} y2={yPos(0)} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />}

      <path d={areaPath(windY, zeros)} fill="#48bb78" opacity={0.8} />
      <path d={areaPath(solarY, windY)} fill="#ecc94b" opacity={0.8} />
      <path d={areaPath(batteryY, solarY)} fill="#9f7aea" opacity={0.8} />
      <path d={areaPath(gasY, batteryY)} fill="#ed8936" opacity={0.8} />
      {maxCharge > 0 && <path d={areaPath(zeros, chargeVals)} fill="#9f7aea" opacity={0.4} />}
      <path d={linePath(demandVals)} fill="none" stroke="white" strokeWidth={2} strokeDasharray="6 3" />

      {yTicks.map(tick => (
        <text key={tick} x={padL - 6} y={yPos(tick) + 4} textAnchor="end" fill="rgba(255,255,255,0.4)" fontSize={compact ? 9 : 11} fontFamily="monospace">
          {tick.toFixed(1)}
        </text>
      ))}
      {showLabels && (
        <text x={12} y={padT + chartH / 2} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={11} fontFamily="monospace" transform={`rotate(-90, 12, ${padT + chartH / 2})`}>GW</text>
      )}
      {xLabels.map(h => (
        <text key={h} x={xPos(h)} y={height - (compact ? 5 : 10)} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={compact ? 9 : 11} fontFamily="monospace">
          {hourLabels[h] || `${h}`}
        </text>
      ))}

      {showLabels && (
        <g transform={`translate(${padL + 10}, ${padT + 5})`}>
          {[
            { label: 'Wind', color: '#48bb78' },
            { label: 'Solar', color: '#ecc94b' },
            { label: 'Battery', color: '#9f7aea' },
            { label: 'Gas', color: '#ed8936' },
            { label: 'Demand', color: '#ffffff', dashed: true },
          ].map((item, i) => (
            <g key={item.label} transform={`translate(${i * 90}, 0)`}>
              {item.dashed ? (
                <line x1={0} y1={6} x2={14} y2={6} stroke={item.color} strokeWidth={2} strokeDasharray="4 2" />
              ) : (
                <rect x={0} y={1} width={14} height={10} fill={item.color} rx={2} opacity={0.8} />
              )}
              <text x={18} y={10} fill="rgba(255,255,255,0.6)" fontSize={10} fontFamily="monospace">{item.label}</text>
            </g>
          ))}
        </g>
      )}

      {maxCharge > 0 && showLabels && (
        <text x={padL + chartW / 2} y={yPos(-maxCharge / 2) + 4} textAnchor="middle" fill="#9f7aea" fontSize={10} fontFamily="monospace" opacity={0.7}>Charging</text>
      )}
    </svg>
  )
}

function WindDroughtChart({ coalGW, solarPct }: { coalGW: number; solarPct: number }) {
  const weekData = useMemo(() => simulateWindDroughtWeek(coalGW, solarPct), [coalGW, solarPct])

  const w = 800, h = 300
  const padL = 50, padR = 20, padT = 25, padB = 35
  const chartW = w - padL - padR
  const chartH = h - padT - padB
  const totalHours = 7 * 24

  const flatData: HourlyData[] = []
  for (const day of weekData) for (const hourData of day) flatData.push(hourData)

  const maxStack = Math.max(...flatData.map(d => d.wind + d.solar + d.discharge + d.gas), ...flatData.map(d => d.demand))
  const yMax = Math.max(maxStack, 1) * 1.1

  function xPos(idx: number): number { return padL + (idx / (totalHours - 1)) * chartW }
  function yPos(v: number): number { return padT + chartH * (1 - v / yMax) }

  function buildArea(topFn: (d: HourlyData) => number, bottomFn: (d: HourlyData) => number): string {
    let path = ''
    for (let i = 0; i < flatData.length; i++) {
      path += i === 0 ? `M ${xPos(i)} ${yPos(topFn(flatData[i]))}` : ` L ${xPos(i)} ${yPos(topFn(flatData[i]))}`
    }
    for (let i = flatData.length - 1; i >= 0; i--) {
      path += ` L ${xPos(i)} ${yPos(bottomFn(flatData[i]))}`
    }
    return path + ' Z'
  }

  function buildLine(fn: (d: HourlyData) => number): string {
    let path = ''
    for (let i = 0; i < flatData.length; i++) {
      path += i === 0 ? `M ${xPos(i)} ${yPos(fn(flatData[i]))}` : ` L ${xPos(i)} ${yPos(fn(flatData[i]))}`
    }
    return path
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {[1, 2, 3, 4, 5, 6].map(d => (
        <line key={d} x1={xPos(d * 24)} x2={xPos(d * 24)} y1={padT} y2={padT + chartH} stroke="rgba(255,255,255,0.08)" strokeWidth={1} strokeDasharray="4 4" />
      ))}
      <path d={buildArea(d => d.wind, () => 0)} fill="#48bb78" opacity={0.5} />
      <path d={buildArea(d => d.wind + d.solar, d => d.wind)} fill="#ecc94b" opacity={0.8} />
      <path d={buildArea(d => d.wind + d.solar + d.discharge, d => d.wind + d.solar)} fill="#9f7aea" opacity={0.8} />
      <path d={buildArea(d => d.wind + d.solar + d.discharge + d.gas, d => d.wind + d.solar + d.discharge)} fill="#ed8936" opacity={0.8} />
      <path d={buildLine(d => d.demand)} fill="none" stroke="white" strokeWidth={1.5} strokeDasharray="6 3" />
      {[0, 1, 2, 3, 4, 5, 6].map(d => (
        <text key={d} x={xPos(d * 24 + 12)} y={h - 8} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={11} fontFamily="monospace">Day {d + 1}</text>
      ))}
      {[0, 0.25, 0.5, 0.75, 1].map(frac => {
        const val = frac * yMax
        return (
          <g key={frac}>
            <line x1={padL} x2={w - padR} y1={yPos(val)} y2={yPos(val)} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
            <text x={padL - 6} y={yPos(val) + 4} textAnchor="end" fill="rgba(255,255,255,0.4)" fontSize={10} fontFamily="monospace">{val.toFixed(1)}</text>
          </g>
        )
      })}
      <text x={12} y={padT + chartH / 2} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={10} fontFamily="monospace" transform={`rotate(-90, 12, ${padT + chartH / 2})`}>GW</text>
      <text x={padL + chartW / 2} y={padT + 16} textAnchor="middle" fill="#f56565" fontSize={12} fontWeight="bold" fontFamily="monospace">Wind Drought: Wind CF at 8%</text>
    </svg>
  )
}

// ─── NEM Donut Chart ─────────────────────────────────────────────────────────

function DonutChart({ segments }: { segments: { label: string; pct: number; color: string }[] }) {
  const size = 200, cx = size / 2, cy = size / 2, outerR = 85, innerR = 55
  let cumAngle = -90
  const paths: { d: string; color: string; label: string; pct: number }[] = []

  for (const seg of segments) {
    const startAngle = cumAngle
    const sweep = (seg.pct / 100) * 360
    const endAngle = startAngle + sweep
    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180
    const x1o = cx + outerR * Math.cos(startRad), y1o = cy + outerR * Math.sin(startRad)
    const x2o = cx + outerR * Math.cos(endRad), y2o = cy + outerR * Math.sin(endRad)
    const x1i = cx + innerR * Math.cos(endRad), y1i = cy + innerR * Math.sin(endRad)
    const x2i = cx + innerR * Math.cos(startRad), y2i = cy + innerR * Math.sin(startRad)
    const largeArc = sweep > 180 ? 1 : 0
    const d = `M ${x1o} ${y1o} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2o} ${y2o} L ${x1i} ${y1i} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x2i} ${y2i} Z`
    paths.push({ d, color: seg.color, label: seg.label, pct: seg.pct })
    cumAngle = endAngle
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-48 h-48">
        {paths.map((p, i) => <path key={i} d={p.d} fill={p.color} stroke="rgba(0,0,0,0.3)" strokeWidth={1} />)}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="#f1f5f9" fontSize={14} fontWeight="bold" fontFamily="monospace">NEM</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={10} fontFamily="monospace">284 TWh</text>
      </svg>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {segments.map(seg => (
          <div key={seg.label} className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: seg.color }} />
            <span className="text-[var(--color-text-muted)]">{seg.label}</span>
            <span className="text-[var(--color-text)] font-mono font-medium">{seg.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Comparison Bar Chart ────────────────────────────────────────────────────

function ComparisonBarChart({ playerSolar, playerWind, playerBESS }: { playerSolar: number; playerWind: number; playerBESS: number }) {
  const categories = [
    { label: 'Solar', player: playerSolar, aemo: AEMO_ISP.solarGW, color: '#ecc94b' },
    { label: 'Wind', player: playerWind, aemo: AEMO_ISP.windGW, color: '#48bb78' },
    { label: 'BESS', player: playerBESS, aemo: AEMO_ISP.bessGW, color: '#9f7aea' },
  ]
  const maxVal = Math.max(...categories.flatMap(c => [c.player, c.aemo]))

  return (
    <div className="space-y-4">
      {categories.map(cat => (
        <div key={cat.label} className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-[var(--color-text)] font-medium">{cat.label}</span>
            <span className="text-[var(--color-text-muted)] font-mono">{cat.player.toFixed(1)} vs {cat.aemo} GW</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-[var(--color-text-muted)] w-10">You</span>
              <div className="flex-1 h-4 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${(cat.player / maxVal) * 100}%`, backgroundColor: cat.color }} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-[var(--color-text-muted)] w-10">ISP</span>
              <div className="flex-1 h-4 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full opacity-50" style={{ width: `${(cat.aemo / maxVal) * 100}%`, backgroundColor: cat.color }} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Gradient Slider ─────────────────────────────────────────────────────────

function GradientSlider({ value, onChange, min, max, step, leftLabel, rightLabel, leftColor, rightColor }: {
  value: number; onChange: (v: number) => void; min: number; max: number; step: number
  leftLabel: string; rightLabel: string; leftColor: string; rightColor: string
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
      <div className="relative">
        <div className="w-full h-3 rounded-full" style={{ background: `linear-gradient(to right, ${leftColor}, ${rightColor})`, opacity: 0.4 }} />
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-3 opacity-0 cursor-pointer" style={{ margin: 0 }} />
        <div className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-lg border-2 border-white/80 pointer-events-none" style={{ left: `calc(${pct}% - 10px)` }} />
      </div>
    </div>
  )
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function SimStatCard({ label, value, subValue, color }: { label: string; value: string; subValue?: string; color: string }) {
  return (
    <div className="bg-[var(--color-bg-elevated)]/50 border border-[var(--color-border)] rounded-xl p-3">
      <div className="text-[var(--color-text-muted)] text-xs mb-1">{label}</div>
      <div className="font-mono font-bold text-lg leading-tight" style={{ color }}>{value}</div>
      {subValue && <div className="text-[var(--color-text-muted)] text-xs mt-0.5 font-mono">{subValue}</div>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function EnergyTransitionSimulator() {
  const [coalGW, setCoalGW] = useState(10)
  const [solarPct, setSolarPct] = useState(0.60)
  const [season, setSeason] = useState<Season>('annual')
  const [windDrought, setWindDrought] = useState(false)
  const [showScenario, setShowScenario] = useState(false)

  const dispatch = useMemo(
    () => simulateDispatch(coalGW, solarPct, season, windDrought),
    [coalGW, solarPct, season, windDrought],
  )

  const summerData = useMemo(() => simulateForSeason(coalGW, solarPct, 'summer'), [coalGW, solarPct])
  const winterData = useMemo(() => simulateForSeason(coalGW, solarPct, 'winter'), [coalGW, solarPct])

  const insight = useMemo(() => {
    if (solarPct > 0.70) return {
      type: 'solar-heavy', icon: '☀️',
      text: `Heavy solar mix requires ${fmtGW(dispatch.bessGW)} of batteries for daily shifting. That's ${(dispatch.bessGW / 1.4).toFixed(0)}x the current NEM battery fleet.`,
      color: '#ecc94b',
    }
    if (solarPct < 0.30) return {
      type: 'wind-heavy', icon: '💨',
      text: `Wind-heavy mix cuts battery needs but requires ${fmtGW(dispatch.gasGW)} of gas backup for drought events. Wind droughts can last days-to-weeks.`,
      color: '#48bb78',
    }
    return {
      type: 'balanced', icon: '⚖️',
      text: `Balanced mix minimises total system cost. Solar and wind complement each other: solar handles daytime, wind fills the gaps at night.`,
      color: '#0ea5e9',
    }
  }, [solarPct, dispatch.bessGW, dispatch.gasGW])

  const scenarioTable = useMemo(() => ({
    solar: { required: dispatch.solarGW, built: 18, needed: Math.max(0, dispatch.solarGW - 18) },
    wind: { required: dispatch.windGW, built: 14, needed: Math.max(0, dispatch.windGW - 14) },
    bess: { required: dispatch.bessGW, built: 1.4, needed: Math.max(0, dispatch.bessGW - 1.4) },
    gas: { required: dispatch.gasGW, built: 14, needed: Math.max(0, dispatch.gasGW - 14) },
  }), [dispatch])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-[var(--color-text-muted)]">
          Adjust the sliders to design your coal replacement strategy. See the impact on generation profile, battery needs, gas backup, cost and emissions in real time.
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left: Controls */}
        <div className="lg:col-span-4 space-y-4">

          {/* Coal to Replace */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-[var(--color-text)]">Coal to Replace</label>
              <span className="text-[var(--color-primary)] font-mono font-bold text-lg">{coalGW} GW</span>
            </div>
            <input
              type="range" min={1} max={21} step={1} value={coalGW}
              onChange={(e) => setCoalGW(Number(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg
                [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--color-primary)]"
            />
            <div className="flex justify-between text-xs text-[var(--color-text-muted)] mt-1">
              <span>1 GW</span>
              <span>21 GW (all)</span>
            </div>
            <div className="mt-2 text-[var(--color-text-muted)] text-xs font-mono">
              = {fmtTWh(coalGW * 0.70 * 8.76)} / year to replace
            </div>
          </div>

          {/* Solar/Wind Mix */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
            <label className="text-sm font-semibold text-[var(--color-text)] block mb-2">Solar / Wind Mix</label>
            <div className="text-center mb-3">
              <span className="font-mono font-bold text-lg">
                <span style={{ color: '#ecc94b' }}>{Math.round(solarPct * 100)}% Solar</span>
                {' / '}
                <span style={{ color: '#48bb78' }}>{Math.round((1 - solarPct) * 100)}% Wind</span>
              </span>
            </div>
            <GradientSlider
              value={solarPct * 100} onChange={(v) => setSolarPct(v / 100)}
              min={0} max={100} step={5}
              leftLabel="All Wind" rightLabel="All Solar"
              leftColor="#48bb78" rightColor="#ecc94b"
            />
          </div>

          {/* Season */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
            <label className="text-sm font-semibold text-[var(--color-text)] mb-3 block">Season</label>
            <div className="grid grid-cols-3 gap-2">
              {(['summer', 'annual', 'winter'] as Season[]).map(s => (
                <button
                  key={s}
                  onClick={() => setSeason(s)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    season === s
                      ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/30'
                      : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] border border-[var(--color-border)] hover:text-[var(--color-text)]'
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-[var(--color-text-muted)] mt-2 font-mono">
              Solar CF: {season === 'summer' ? '28%' : season === 'winter' ? '16%' : '22%'}
            </div>
          </div>

          {/* Wind Drought */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-[var(--color-text)]">Wind Drought</label>
              {windDrought && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium animate-pulse">ACTIVE</span>
              )}
            </div>
            <p className="text-[var(--color-text-muted)] text-xs mt-1 mb-3">Reduces wind CF to 8% — simulating a multi-day calm</p>
            <button
              onClick={() => setWindDrought(!windDrought)}
              className={`w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                windDrought
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                  : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] border border-[var(--color-border)] hover:text-[var(--color-text)]'
              }`}
            >
              {windDrought ? 'Disable Wind Drought' : 'Simulate Wind Drought'}
            </button>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <SimStatCard label="Solar Required" value={fmtGW(dispatch.solarGW)} color="#ecc94b" />
            <SimStatCard label="Wind Required" value={fmtGW(dispatch.windGW)} color="#48bb78" />
            <SimStatCard label="Battery Storage" value={fmtGW(dispatch.bessGW)} subValue={fmtGWh(dispatch.bessGWh)} color="#9f7aea" />
            <SimStatCard label="Gas Backup" value={fmtGW(dispatch.gasGW)} color="#ed8936" />
            <SimStatCard label="Total New Capacity" value={fmtGW(dispatch.totalNewGW)} color="#f1f5f9" />
            <SimStatCard label="Estimated CapEx" value={fmtCost(dispatch.costB)} color="#3b82f6" />
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
            <div className="text-[var(--color-text-muted)] text-xs">CO₂ Avoided</div>
            <div className="text-emerald-400 font-mono font-bold text-xl">{fmtMt(dispatch.co2_Mt)} / year</div>
          </div>
        </div>

        {/* Right: Charts */}
        <div className="lg:col-span-8 space-y-5">

          {/* Main 24-hour chart */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
            <h3 className="text-[var(--color-text)] font-bold text-base mb-1">24-Hour Generation Profile</h3>
            <p className="text-[var(--color-text-muted)] text-xs mb-4 font-mono">
              {season.charAt(0).toUpperCase() + season.slice(1)}
              {windDrought ? ' · Wind Drought' : ''}
              {' · Replacing '}{coalGW} GW coal
            </p>
            <StackedAreaChart hourlyData={dispatch.hourlyData} />
          </div>

          {/* Seasonal Comparison */}
          {!windDrought && (
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
              <h3 className="text-[var(--color-text)] font-bold text-sm mb-3">Seasonal Comparison</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-center text-xs text-[var(--color-text-muted)] font-mono mb-1">Summer (Solar CF: 28%)</div>
                  <StackedAreaChart hourlyData={summerData} width={400} height={220} showLabels={false} compact />
                </div>
                <div>
                  <div className="text-center text-xs text-[var(--color-text-muted)] font-mono mb-1">Winter (Solar CF: 16%)</div>
                  <StackedAreaChart hourlyData={winterData} width={400} height={220} showLabels={false} compact />
                </div>
              </div>
              <div className="text-center text-[var(--color-text-muted)] text-xs mt-2">
                Winter requires significantly more gas backup due to reduced solar output
              </div>
            </div>
          )}

          {/* Wind Drought 7-day view */}
          {windDrought && (
            <div className="bg-[var(--color-bg-card)] border border-red-500/20 rounded-xl p-4">
              <h3 className="text-[var(--color-text)] font-bold text-sm mb-1">7-Day Wind Drought</h3>
              <p className="text-[var(--color-text-muted)] text-xs mb-3">
                Wind output collapses to 8% CF. Solar still produces daily, but gas fills the massive gap.
              </p>
              <WindDroughtChart coalGW={coalGW} solarPct={solarPct} />
            </div>
          )}

          {/* Dynamic Insight */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl shrink-0">{insight.icon}</div>
              <div>
                <div className="font-semibold text-sm mb-0.5" style={{ color: insight.color }}>
                  {insight.type === 'solar-heavy' ? 'Solar-Heavy Mix' : insight.type === 'wind-heavy' ? 'Wind-Heavy Mix' : 'Balanced Mix'}
                </div>
                <p className="text-[var(--color-text-muted)] text-sm">{insight.text}</p>
              </div>
            </div>
          </div>

          {/* NEM Reality Check (collapsible) */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
            <button
              onClick={() => setShowScenario(!showScenario)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
            >
              <span className="text-sm font-semibold text-[var(--color-text)]">
                {showScenario ? '▾' : '▸'} NEM Reality Check — Compare to AEMO ISP 2050
              </span>
            </button>

            {showScenario && (
              <div className="px-4 pb-4 space-y-5">
                {/* Current NEM Mix */}
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <DonutChart segments={NEM_MIX} />
                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-[var(--color-bg-elevated)] rounded-lg p-3 text-center">
                        <div className="text-[var(--color-text)] font-mono font-bold text-lg">284</div>
                        <div className="text-[var(--color-text-muted)] text-xs">TWh total</div>
                      </div>
                      <div className="bg-[var(--color-bg-elevated)] rounded-lg p-3 text-center">
                        <div className="text-[var(--color-text)] font-mono font-bold text-lg">21</div>
                        <div className="text-[var(--color-text-muted)] text-xs">GW coal</div>
                      </div>
                      <div className="bg-[var(--color-bg-elevated)] rounded-lg p-3 text-center">
                        <div className="text-red-400 font-mono font-bold text-lg">6</div>
                        <div className="text-[var(--color-text-muted)] text-xs">GW retiring 3yr</div>
                      </div>
                    </div>
                    <p className="text-[var(--color-text-muted)] text-sm">
                      The NEM supplies ~10 million customers across QLD, NSW, VIC, SA, TAS and ACT.
                    </p>
                  </div>
                </div>

                {/* Your Plan vs AEMO ISP */}
                <div>
                  <h3 className="text-[var(--color-text)] font-semibold text-sm mb-1">Your Plan vs AEMO ISP 2050</h3>
                  <p className="text-[var(--color-text-muted)] text-xs mb-3 font-mono">
                    Replacing {coalGW} GW · {Math.round(solarPct * 100)}% Solar / {Math.round((1 - solarPct) * 100)}% Wind
                  </p>
                  <ComparisonBarChart playerSolar={dispatch.solarGW} playerWind={dispatch.windGW} playerBESS={dispatch.bessGW} />
                </div>

                {/* Gap Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[var(--color-border)]">
                        <th className="text-left text-[var(--color-text-muted)] py-2 pr-4">Technology</th>
                        <th className="text-right text-[var(--color-text-muted)] py-2 px-4">Required</th>
                        <th className="text-right text-[var(--color-text-muted)] py-2 px-4">Already Built</th>
                        <th className="text-right text-[var(--color-text-muted)] py-2 px-4">Still Needed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: 'Solar', color: '#ecc94b', ...scenarioTable.solar },
                        { label: 'Wind', color: '#48bb78', ...scenarioTable.wind },
                        { label: 'BESS', color: '#9f7aea', ...scenarioTable.bess },
                        { label: 'Gas', color: '#ed8936', ...scenarioTable.gas },
                      ].map(row => (
                        <tr key={row.label} className="border-b border-[var(--color-border)]/30">
                          <td className="py-2 pr-4">
                            <span className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: row.color }} />
                              <span className="text-[var(--color-text)]">{row.label}</span>
                            </span>
                          </td>
                          <td className="text-right font-mono text-[var(--color-text)] py-2 px-4">{row.required.toFixed(1)} GW</td>
                          <td className="text-right font-mono text-[var(--color-text-muted)] py-2 px-4">{row.built} GW</td>
                          <td className="text-right font-mono py-2 px-4">
                            <span className={row.needed > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                              {row.needed > 0 ? `${row.needed.toFixed(1)} GW` : 'Covered'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Methodology note */}
      <div className="text-[9px] text-[var(--color-text-muted)] italic">
        Simplified dispatch model using 24-hour profiles. Assumes coal capacity factor of 70%, battery round-trip efficiency of 87%.
        CapEx estimates: Solar $1.2B/GW, Wind $2.0B/GW, BESS $0.8B/GW + $0.4B/GWh, Gas $0.9B/GW.
        CO₂ avoided estimated at 0.9 Mt per TWh replaced. Based on AEMO NEM data and ISP 2050 projections.
      </div>
    </div>
  )
}
