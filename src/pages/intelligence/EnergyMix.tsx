import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { fetchEnergyMix } from '../../lib/dataService'
import type { EnergyMixData } from '../../lib/types'
import EnergyTransitionSimulator from '../../components/intelligence/EnergyTransitionSimulator'
import GenerationStack from '../../components/intelligence/GenerationStack'
import CapacityWatch from '../../components/intelligence/CapacityWatch'
import CoalWatch from '../../components/intelligence/CoalWatch'
import EnergyTransition from '../../components/intelligence/EnergyTransition'
import WattClarity from '../../components/intelligence/WattClarity'
import DataProvenance from '../../components/common/DataProvenance'

// ============================================================
// Icons — defined BEFORE const arrays per project pattern
// ============================================================

const BoltIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.381z" />
  </svg>
)

const MapIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zM14 5.586v12.828l2.293-2.293A1 1 0 0017 16V6a1 1 0 00-.293-.707L14 2.586v3z" clipRule="evenodd" />
  </svg>
)

const TrendIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
  </svg>
)

const ChipIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M13 7H7v6h6V7z" />
    <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h1a2 2 0 012 2v1h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v1a2 2 0 01-2 2h-1v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H6a2 2 0 01-2-2v-1H3a1 1 0 110-2h1V9H3a1 1 0 010-2h1V6a2 2 0 012-2h1V2zM6 6v8h8V6H6z" clipRule="evenodd" />
  </svg>
)

const SimulatorIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
)

const MixIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
    <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
  </svg>
)

const StackIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M2 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4zm5 2a1 1 0 011-1h2a1 1 0 011 1v10a1 1 0 01-1 1H8a1 1 0 01-1-1V6zm5-4a1 1 0 011-1h2a1 1 0 011 1v14a1 1 0 01-1 1h-2a1 1 0 01-1-1V2z" />
  </svg>
)

const BatteryIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.381z" />
  </svg>
)

const CoalIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
  </svg>
)

const WattClarityIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const ScoreboardIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm5-5a1 1 0 011-1h2a1 1 0 011 1v10a1 1 0 01-1 1H8a1 1 0 01-1-1V6zm5-3a1 1 0 011-1h2a1 1 0 011 1v13a1 1 0 01-1 1h-2a1 1 0 01-1-1V3z" />
  </svg>
)

// ============================================================
// Tab types and config — defined AFTER icons
// ============================================================

type TabId = 'simulator' | 'transition-scoreboard' | 'generation-stack' | 'battery-watch' | 'coal-watch' | 'watt-clarity' | 'current-mix'

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'simulator', label: 'Simulator', icon: <SimulatorIcon /> },
  { id: 'transition-scoreboard', label: 'Transition Scoreboard', icon: <ScoreboardIcon /> },
  { id: 'generation-stack', label: 'Generation Stack', icon: <StackIcon /> },
  { id: 'battery-watch', label: 'Capacity Watch', icon: <BatteryIcon /> },
  { id: 'coal-watch', label: 'Coal Watch', icon: <CoalIcon /> },
  { id: 'watt-clarity', label: 'Watt Clarity', icon: <WattClarityIcon /> },
  { id: 'current-mix', label: 'Current Mix', icon: <MixIcon /> },
]

// ============================================================
// Tech colours & helpers
// ============================================================

const TECH_COLOURS: Record<string, string> = {
  wind: '#3b82f6',
  solar: '#f59e0b',
  bess: '#10b981',
  pumped_hydro: '#8b5cf6',
  hybrid: '#ec4899',
}

const TECH_ORDER = ['wind', 'solar', 'bess', 'pumped_hydro', 'hybrid']

const STATE_ORDER = ['NSW', 'QLD', 'VIC', 'SA', 'TAS']

function formatTech(tech: string): string {
  const map: Record<string, string> = {
    bess: 'BESS',
    pumped_hydro: 'Pumped Hydro',
  }
  return map[tech] ?? tech.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatMW(mw: number): string {
  if (mw >= 1000) return `${(mw / 1000).toFixed(1)} GW`
  return `${mw.toLocaleString()} MW`
}

function getTechColour(tech: string): string {
  return TECH_COLOURS[tech] ?? '#636e72'
}

// ============================================================
// Custom tooltip for charts
// ============================================================

interface TooltipPayload {
  dataKey?: string
  value?: number
  color?: string
  name?: string
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-3 text-sm shadow-lg">
      <div className="font-medium text-[var(--color-text)] mb-1">{label}</div>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-[var(--color-text-muted)]">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
          <span>{formatTech(entry.dataKey ?? entry.name ?? '')}</span>
          <span className="ml-auto font-medium text-[var(--color-text)]">
            {formatMW(entry.value ?? 0)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// Component
// ============================================================

export default function EnergyMix() {
  const [activeTab, setActiveTab] = useState<TabId>('simulator')
  const [data, setData] = useState<EnergyMixData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedState, setSelectedState] = useState<string | null>(null)

  useEffect(() => {
    fetchEnergyMix().then(d => { setData(d ?? null); setLoading(false) })
  }, [])

  // ============================================================
  // Derived data
  // ============================================================

  // Technologies present in data
  const techs = useMemo(() => {
    if (!data) return []
    const set = new Set<string>()
    for (const stateData of Object.values(data.current_mix)) {
      for (const tech of Object.keys(stateData)) set.add(tech)
    }
    return TECH_ORDER.filter(t => set.has(t))
  }, [data])

  // Summary stats
  const summary = useMemo(() => {
    if (!data) return null
    const totalMW = Object.values(data.state_totals).reduce((sum, s) => sum + s.operating_mw, 0)
    const stateCount = Object.keys(data.state_totals).length
    const pipelineMW = data.pipeline.reduce((sum, p) => sum + p.mw, 0)

    // Most deployed tech nationally
    const techTotals: Record<string, number> = {}
    for (const stateData of Object.values(data.current_mix)) {
      for (const [tech, val] of Object.entries(stateData)) {
        techTotals[tech] = (techTotals[tech] ?? 0) + val.mw
      }
    }
    const topTech = Object.entries(techTotals).sort((a, b) => b[1] - a[1])[0]

    return { totalMW, stateCount, pipelineMW, topTech: topTech?.[0] ?? '', topTechMW: topTech?.[1] ?? 0 }
  }, [data])

  // Stacked bar data: current mix by state
  const stateBarData = useMemo(() => {
    if (!data) return []
    return STATE_ORDER
      .filter(s => s in data.current_mix)
      .map(state => {
        const entry: Record<string, string | number> = { state }
        const mix = data.current_mix[state]
        for (const tech of techs) {
          entry[tech] = mix[tech]?.mw ?? 0
        }
        return entry
      })
  }, [data, techs])

  // Pipeline by year
  const pipelineByYear = useMemo(() => {
    if (!data) return []
    const yearMap: Record<string, Record<string, number>> = {}
    for (const item of data.pipeline) {
      const yr = item.cod_year || 'Unknown'
      if (!yearMap[yr]) yearMap[yr] = {}
      yearMap[yr][item.technology] = (yearMap[yr][item.technology] ?? 0) + item.mw
    }
    return Object.entries(yearMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, techMW]) => {
        const entry: Record<string, string | number> = { year }
        for (const tech of techs) {
          entry[tech] = techMW[tech] ?? 0
        }
        return entry
      })
  }, [data, techs])

  // Pipeline technologies present
  const pipelineTechs = useMemo(() => {
    if (!data) return []
    const set = new Set<string>()
    for (const item of data.pipeline) set.add(item.technology)
    return TECH_ORDER.filter(t => set.has(t))
  }, [data])

  // National pie chart data
  const nationalPie = useMemo(() => {
    if (!data) return []
    const totals: Record<string, number> = {}
    for (const stateData of Object.values(data.current_mix)) {
      for (const [tech, val] of Object.entries(stateData)) {
        totals[tech] = (totals[tech] ?? 0) + val.mw
      }
    }
    return TECH_ORDER
      .filter(t => (totals[t] ?? 0) > 0)
      .map(tech => ({
        name: formatTech(tech),
        tech,
        value: totals[tech],
      }))
  }, [data])

  // Selected state detail
  const stateDetail = useMemo(() => {
    if (!data || !selectedState) return null
    const mix = data.current_mix[selectedState]
    const totals = data.state_totals[selectedState]
    if (!mix || !totals) return null

    const techBreakdown = TECH_ORDER
      .filter(t => mix[t])
      .map(tech => ({
        tech,
        count: mix[tech].count,
        mw: mix[tech].mw,
        mwh: mix[tech].mwh,
        pct: totals.operating_mw > 0 ? (mix[tech].mw / totals.operating_mw) * 100 : 0,
      }))

    const pipeline = data.pipeline.filter(p => p.state === selectedState)

    return { mix, totals, techBreakdown, pipeline }
  }, [data, selectedState])

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Energy Mix Transition</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Operating capacity, pipeline analysis, and transition modelling across the NEM
        </p>
        <div className="mt-3">
          <DataProvenance page="energy-mix" />
        </div>
      </div>

      {/* Tab navigation */}
      <style>{`[data-tabs-row]::-webkit-scrollbar { display: none; }`}</style>
      <div
        data-tabs-row
        className="flex gap-1 overflow-x-auto pb-1 -mb-3"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-[var(--color-bg-card)] text-[var(--color-text)] border border-b-0 border-[var(--color-border)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-card)]/50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Simulator Tab ─── */}
      {activeTab === 'simulator' && <EnergyTransitionSimulator />}

      {activeTab === 'transition-scoreboard' && <EnergyTransition />}

      {/* ─── Generation Stack Tab ─── */}
      {activeTab === 'generation-stack' && <GenerationStack />}

      {/* ─── Battery Watch Tab ─── */}
      {activeTab === 'battery-watch' && <CapacityWatch />}

      {/* ─── Coal Watch Tab ─── */}
      {activeTab === 'coal-watch' && <CoalWatch />}

      {/* ─── Watt Clarity Tab ─── */}
      {activeTab === 'watt-clarity' && <WattClarity />}

      {/* ─── Current Mix Tab ─── */}
      {activeTab === 'current-mix' && (
        <>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : !data || Object.keys(data.current_mix).length === 0 ? (
            <div className="p-6 text-center text-[var(--color-text-muted)]">
              <BoltIcon />
              <p className="mt-2">No energy mix data available</p>
            </div>
          ) : (
            <div className="space-y-6">

      {/* Rationale */}
      <details className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 mb-6">
        <summary className="text-sm font-medium text-[var(--color-text)] cursor-pointer">What does this page show?</summary>
        <div className="mt-3 text-xs text-[var(--color-text-muted)] space-y-2">
          <p><strong className="text-[var(--color-text)]">Operating capacity</strong> shows the current generation mix by state, based on commissioned projects in the NEM. This reveals whether renewable deployment is balanced across technologies or concentrated in a single type.</p>
          <p><strong className="text-[var(--color-text)]">Pipeline data</strong> shows what is expected to come online based on announced COD dates for projects under construction or in development. This provides a forward-looking view of where capacity growth is heading.</p>
          <p><strong className="text-[var(--color-text)]">State-level detail</strong> allows comparison of how each jurisdiction is progressing toward its renewable energy targets, and whether any states are under- or over-represented in particular technologies.</p>
          <p>Together, this helps stakeholders understand whether the energy transition is proceeding in a balanced way or whether gaps and risks are emerging in the deployment pipeline.</p>
        </div>
      </details>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <BoltIcon />
              <span className="text-xs font-medium uppercase tracking-wider">NEM Operating</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-[var(--color-text)]">
              {formatMW(summary.totalMW)}
            </div>
            <div className="text-xs text-[var(--color-text-muted)] mt-1">Total operating capacity</div>
          </div>

          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
              <MapIcon />
              <span className="text-xs font-medium uppercase tracking-wider">States</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-[var(--color-text)]">
              {summary.stateCount}
            </div>
            <div className="text-xs text-[var(--color-text-muted)] mt-1">NEM states tracked</div>
          </div>

          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <div className="flex items-center gap-2 text-amber-400 mb-2">
              <TrendIcon />
              <span className="text-xs font-medium uppercase tracking-wider">Pipeline</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-[var(--color-text)]">
              {formatMW(summary.pipelineMW)}
            </div>
            <div className="text-xs text-[var(--color-text-muted)] mt-1">Under construction / development</div>
          </div>

          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <div className="flex items-center gap-2 text-purple-400 mb-2">
              <ChipIcon />
              <span className="text-xs font-medium uppercase tracking-wider">Top Tech</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-[var(--color-text)]">
              {formatTech(summary.topTech)}
            </div>
            <div className="text-xs text-[var(--color-text-muted)] mt-1">{formatMW(summary.topTechMW)} deployed</div>
          </div>
        </div>
      )}

      {/* Current mix by state — stacked bar */}
      <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">
          Operating Capacity by State
        </h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Stacked by technology. Click a state bar to see detailed breakdown.
        </p>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={stateBarData}
            margin={{ top: 10, right: 20, bottom: 5, left: 10 }}
            onClick={(e) => {
              if (e?.activeLabel) {
                const label = String(e.activeLabel)
                setSelectedState(prev => prev === label ? null : label)
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="state"
              tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
            />
            <YAxis
              tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
              label={{ value: 'MW', angle: -90, position: 'insideLeft', fill: 'var(--color-text-muted)', fontSize: 12 }}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend
              formatter={(value) => formatTech(value as string)}
              wrapperStyle={{ fontSize: 12, color: 'var(--color-text-muted)' }}
            />
            {techs.map(tech => (
              <Bar
                key={tech}
                dataKey={tech}
                stackId="capacity"
                fill={getTechColour(tech)}
                fillOpacity={0.85}
                radius={tech === techs[techs.length - 1] ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                cursor="pointer"
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* State comparison table */}
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] overflow-x-auto">
        <div className="p-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">State Comparison</h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Operating capacity breakdown by technology per state (MW)
          </p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="text-left p-3 text-[var(--color-text-muted)] font-medium">State</th>
              <th className="text-right p-3 text-[var(--color-text-muted)] font-medium">Total MW</th>
              {techs.map(tech => (
                <th key={tech} className="text-right p-3 text-[var(--color-text-muted)] font-medium hidden sm:table-cell">
                  <span style={{ color: getTechColour(tech) }}>{formatTech(tech)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STATE_ORDER.filter(s => s in data.state_totals).map(state => {
              const total = data.state_totals[state]
              const mix = data.current_mix[state]
              const isSelected = selectedState === state
              return (
                <tr
                  key={state}
                  className={`border-b border-[var(--color-border)] cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-500/10' : 'hover:bg-[var(--color-bg)]/50'
                  }`}
                  onClick={() => setSelectedState(prev => prev === state ? null : state)}
                >
                  <td className="p-3 font-medium text-[var(--color-text)]">
                    {state}
                    {isSelected && <span className="ml-2 text-xs text-blue-400">Selected</span>}
                  </td>
                  <td className="p-3 text-right font-semibold text-[var(--color-text)]">
                    {total.operating_mw.toLocaleString()}
                  </td>
                  {techs.map(tech => (
                    <td key={tech} className="p-3 text-right text-[var(--color-text-muted)] hidden sm:table-cell">
                      {mix?.[tech]?.mw ? mix[tech].mw.toLocaleString() : '—'}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[var(--color-border)]">
              <td className="p-3 font-semibold text-[var(--color-text)]">NEM Total</td>
              <td className="p-3 text-right font-bold text-[var(--color-text)]">
                {Object.values(data.state_totals).reduce((s, t) => s + t.operating_mw, 0).toLocaleString()}
              </td>
              {techs.map(tech => {
                const total = Object.values(data.current_mix).reduce((s, m) => s + (m[tech]?.mw ?? 0), 0)
                return (
                  <td key={tech} className="p-3 text-right font-semibold hidden sm:table-cell" style={{ color: getTechColour(tech) }}>
                    {total > 0 ? total.toLocaleString() : '—'}
                  </td>
                )
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* State detail panel */}
      {selectedState && stateDetail && (
        <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-blue-500/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">
              {selectedState} — Detailed Breakdown
            </h2>
            <button
              onClick={() => setSelectedState(null)}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] px-2 py-1 rounded border border-[var(--color-border)]"
            >
              Close
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Tech breakdown */}
            <div>
              <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-2">Technology Breakdown</h3>
              <div className="space-y-2">
                {stateDetail.techBreakdown.map(tb => (
                  <div key={tb.tech}>
                    <div className="flex items-center justify-between text-sm mb-0.5">
                      <span className="text-[var(--color-text)] font-medium">{formatTech(tb.tech)}</span>
                      <span className="text-[var(--color-text-muted)]">
                        {tb.mw.toLocaleString()} MW · <Link to={`/projects?state=${selectedState}&tech=${tb.tech}`} className="text-[var(--color-primary)] hover:underline">{tb.count} projects</Link> · {tb.pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[var(--color-bg)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${tb.pct}%`, backgroundColor: getTechColour(tb.tech) }}
                      />
                    </div>
                    {tb.mwh != null && tb.mwh > 0 && (
                      <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        {tb.mwh.toLocaleString()} MWh storage
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-[var(--color-border)] text-sm text-[var(--color-text)]">
                <span className="font-semibold">{stateDetail.totals.operating_mw.toLocaleString()} MW</span>
                <span className="text-[var(--color-text-muted)]"> total operating capacity</span>
              </div>
            </div>

            {/* Pipeline for this state */}
            <div>
              <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-2">Pipeline Projects</h3>
              {stateDetail.pipeline.length > 0 ? (
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {stateDetail.pipeline
                    .sort((a, b) => (a.cod_year ?? 'zzzz').localeCompare(b.cod_year ?? 'zzzz'))
                    .map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm bg-[var(--color-bg)] rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: getTechColour(p.technology) }}
                        />
                        <span className="text-[var(--color-text)]">{formatTech(p.technology)}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          p.status === 'construction'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                      <div className="text-right text-[var(--color-text-muted)]">
                        <span className="font-medium text-[var(--color-text)]">{p.mw.toLocaleString()} MW</span>
                        <span className="ml-2 text-xs">COD {p.cod_year ?? 'TBD'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--color-text-muted)]">No pipeline projects for {selectedState}</p>
              )}
              {stateDetail.pipeline.length > 0 && (
                <div className="mt-2 text-xs text-[var(--color-text-muted)]">
                  {stateDetail.pipeline.length} pipeline projects totalling{' '}
                  {formatMW(stateDetail.pipeline.reduce((s, p) => s + p.mw, 0))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Two-column: Pipeline by year + Technology donut */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Pipeline by year */}
        <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">
            Pipeline by COD Year
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mb-4">
            Construction and development projects by expected commissioning year
          </p>
          {pipelineByYear.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={pipelineByYear}
                margin={{ top: 10, right: 10, bottom: 5, left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="year"
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                />
                <YAxis
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  formatter={(value) => formatTech(value as string)}
                  wrapperStyle={{ fontSize: 11, color: 'var(--color-text-muted)' }}
                />
                {pipelineTechs.map(tech => (
                  <Bar
                    key={tech}
                    dataKey={tech}
                    stackId="pipeline"
                    fill={getTechColour(tech)}
                    fillOpacity={0.85}
                    radius={tech === pipelineTechs[pipelineTechs.length - 1] ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)] text-center py-8">No pipeline data available</p>
          )}
        </div>

        {/* Technology donut */}
        <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">
            National Technology Mix
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mb-4">
            Share of total operating capacity by technology
          </p>
          {nationalPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={nationalPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  strokeWidth={0}
                >
                  {nationalPie.map((entry, i) => (
                    <Cell key={i} fill={getTechColour(entry.tech)} fillOpacity={0.85} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                  labelStyle={{ color: 'var(--color-text)' }}
                  itemStyle={{ color: 'var(--color-text)' }}
                  formatter={(value) => [formatMW(Number(value)), 'Capacity']}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                  formatter={(value) => {
                    const item = nationalPie.find(p => p.name === value)
                    return item ? `${value} (${formatMW(item.value)})` : value
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)] text-center py-8">No technology data available</p>
          )}
        </div>
      </div>

      {/* Source note */}
      <div className="text-xs text-[var(--color-text-muted)] italic">
        Data sourced from AEMO generation information, ARENA project tracker, and state planning registers.
        Operating capacity reflects currently commissioned projects across the NEM.
      </div>

            </div>
          )}
        </>
      )}
    </div>
  )
}
