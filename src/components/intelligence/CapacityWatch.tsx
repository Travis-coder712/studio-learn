import { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, ReferenceLine,
} from 'recharts'
import { fetchBatteryWatch, fetchWindWatch, fetchSolarWatch } from '../../lib/dataService'
import type { BatteryWatchData, CapacityWatchData, CapacityWatchProject } from '../../lib/types'

// ============================================================
// Constants & colours
// ============================================================

type TechTab = 'bess' | 'solar' | 'wind' | 'all'

const TECH_COLOURS: Record<string, string> = {
  bess: '#10b981',
  solar: '#f59e0b',
  wind: '#3b82f6',
  all: '#8b5cf6',
}

const STATUS_COLOURS: Record<string, string> = {
  operating: '#10b981',
  commissioning: '#f59e0b',
  construction: '#3b82f6',
  development: '#8b5cf6',
}

const STATE_COLOURS: Record<string, string> = {
  NSW: '#3b82f6',
  QLD: '#f59e0b',
  VIC: '#8b5cf6',
  SA: '#10b981',
  TAS: '#ec4899',
}

const NEM_STATES = ['NSW', 'QLD', 'VIC', 'SA', 'TAS'] as const

function formatMW(mw: number): string {
  if (mw >= 1000) return `${(mw / 1000).toFixed(1)} GW`
  return `${mw.toLocaleString()} MW`
}

function statusLabel(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ============================================================
// Today's date for reference lines
// ============================================================

const TODAY = new Date().toISOString().slice(0, 10)
const TODAY_SHORT = new Date().toLocaleDateString('en-AU', { month: 'short', year: '2-digit' })

// ============================================================
// Stat Card
// ============================================================

function StatCard({ label, value, sub, colour }: { label: string; value: string; sub?: string; colour?: string }) {
  return (
    <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
      <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#94a3b8' }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color: colour ?? '#f1f5f9' }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>{sub}</p>}
    </div>
  )
}

// ============================================================
// Multi-state filter
// ============================================================

function StateFilter({ selected, onChange }: { selected: Set<string>; onChange: (s: Set<string>) => void }) {
  const toggleState = (state: string) => {
    const next = new Set(selected)
    if (next.has(state)) next.delete(state)
    else next.add(state)
    onChange(next)
  }

  const allSelected = NEM_STATES.every(s => selected.has(s))

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      <span className="text-xs mr-1" style={{ color: '#94a3b8' }}>States:</span>
      <button
        onClick={() => onChange(allSelected ? new Set() : new Set(NEM_STATES))}
        className="px-2 py-1 rounded text-xs font-medium transition-colors"
        style={{
          background: allSelected ? '#64748b30' : '#1e293b',
          color: allSelected ? '#f1f5f9' : '#94a3b8',
          border: `1px solid ${allSelected ? '#64748b' : '#334155'}`,
        }}
      >
        All
      </button>
      {NEM_STATES.map(state => {
        const isSelected = selected.has(state)
        return (
          <button
            key={state}
            onClick={() => toggleState(state)}
            className="px-2 py-1 rounded text-xs font-medium transition-colors"
            style={{
              background: isSelected ? `${STATE_COLOURS[state]}20` : '#1e293b',
              color: isSelected ? STATE_COLOURS[state] : '#94a3b8',
              border: `1px solid ${isSelected ? `${STATE_COLOURS[state]}60` : '#334155'}`,
            }}
          >
            {state}
          </button>
        )
      })}
    </div>
  )
}

// ============================================================
// Timeline Chart (generic for any tech)
// ============================================================

interface TimelinePoint {
  date: string
  label: string
  mw: number
  event?: string
  shortDate: string
  isToday?: boolean
}

function CapacityTimelineChart({ milestones, colour, techLabel }: {
  milestones: { date: string; label: string; cumulative_mw: number; event?: string }[]
  colour: string
  techLabel: string
}) {
  const gradientId = `cwGrad-${techLabel.replace(/\s/g, '')}`

  // Build data with "today" marker inserted
  const raw: TimelinePoint[] = milestones.map(m => ({
    date: m.date,
    label: m.label,
    mw: m.cumulative_mw,
    event: m.event,
    shortDate: new Date(m.date).toLocaleDateString('en-AU', { month: 'short', year: '2-digit' }),
  }))

  // Insert a "Today" point if it falls within the range
  const data = [...raw]
  const todayIdx = data.findIndex(d => d.date > TODAY)
  if (todayIdx > 0) {
    // Interpolate — use the previous point's MW (step function)
    const prevMW = data[todayIdx - 1].mw
    data.splice(todayIdx, 0, {
      date: TODAY,
      label: 'Today',
      mw: prevMW,
      shortDate: TODAY_SHORT,
      isToday: true,
    })
  }

  // Calculate reference line thresholds based on max value
  const maxMW = Math.max(...data.map(d => d.mw))
  const ref1 = maxMW > 10000 ? 10000 : maxMW > 5000 ? 5000 : maxMW > 2000 ? 2000 : 1000
  const ref2 = maxMW > 10000 ? 15000 : maxMW > 5000 ? 10000 : maxMW > 2000 ? 4000 : 2000

  return (
    <div style={{ width: '100%', height: 360 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colour} stopOpacity={0.4} />
              <stop offset="100%" stopColor={colour} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="shortDate"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            stroke="#334155"
            angle={-45}
            textAnchor="end"
            height={50}
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            stroke="#334155"
            tickFormatter={(v: number) => formatMW(v)}
          />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }}
            labelStyle={{ color: '#94a3b8' }}
            formatter={(value) => [formatMW(value as number), 'Cumulative']}
            labelFormatter={(_label, payload) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const item = (payload as any)?.[0]?.payload
              if (!item) return ''
              if (item.isToday) return `TODAY (${item.date}) — ${formatMW(item.mw)} operating`
              return `${item.date} — ${item.label}`
            }}
          />
          {ref1 < maxMW && (
            <ReferenceLine y={ref1} stroke="#f59e0b" strokeDasharray="5 5"
              label={{ value: formatMW(ref1), fill: '#f59e0b', fontSize: 11, position: 'right' }} />
          )}
          {ref2 < maxMW * 1.2 && (
            <ReferenceLine y={ref2} stroke="#ef4444" strokeDasharray="5 5"
              label={{ value: formatMW(ref2), fill: '#ef4444', fontSize: 11, position: 'right' }} />
          )}
          <Area
            type="stepAfter"
            dataKey="mw"
            stroke={colour}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={(props) => {
              const { cx, cy, payload } = props as { cx: number; cy: number; payload: TimelinePoint }
              if (payload.isToday) {
                return (
                  <g key={`dot-today-${cx}`}>
                    <line x1={cx} y1={0} x2={cx} y2={cy} stroke="#f1f5f9" strokeDasharray="3 3" strokeWidth={1} opacity={0.5} />
                    <circle cx={cx} cy={cy} r={7} fill="#f1f5f9" stroke={colour} strokeWidth={2} />
                    <text x={cx} y={cy - 12} textAnchor="middle" fill="#f1f5f9" fontSize={10} fontWeight="bold">TODAY</text>
                  </g>
                )
              }
              if (payload.event === 'setback') {
                return <circle cx={cx} cy={cy} r={6} fill="#ef4444" stroke="#1e293b" strokeWidth={2} key={`dot-${cx}`} />
              }
              return <circle cx={cx} cy={cy} r={3} fill={colour} stroke="#1e293b" strokeWidth={1.5} key={`dot-${cx}`} />
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ============================================================
// Milestone Event List (reusable)
// ============================================================

function MilestoneList({ milestones, colour }: {
  milestones: { date: string; label: string; cumulative_mw: number; event?: string }[]
  colour: string
}) {
  // Limit display to avoid overwhelming lists — show last 20 milestones
  const display = milestones.length > 25 ? milestones.slice(-25) : milestones
  const hiddenCount = milestones.length - display.length

  return (
    <div className="mt-4 relative ml-3">
      <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: '#334155' }} />
      {hiddenCount > 0 && (
        <div className="relative pl-6 pb-3">
          <div className="absolute left-0 top-1 w-2.5 h-2.5 rounded-full -translate-x-1" style={{
            background: '#64748b', border: '2px solid #1e293b',
          }} />
          <span className="text-xs" style={{ color: '#64748b' }}>+ {hiddenCount} earlier milestones</span>
        </div>
      )}
      {display.map((m, i) => {
        const isPast = new Date(m.date) <= new Date()
        const isSetback = m.event === 'setback'
        return (
          <div key={i} className="relative pl-6 pb-3">
            <div className="absolute left-0 top-1 w-2.5 h-2.5 rounded-full -translate-x-1" style={{
              background: isSetback ? '#ef4444' : isPast ? colour : '#3b82f6',
              border: '2px solid #1e293b',
            }} />
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-xs font-mono" style={{ color: isPast ? colour : '#3b82f6', minWidth: 80 }}>
                {new Date(m.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <span className="text-xs" style={{ color: isSetback ? '#ef4444' : '#cbd5e1' }}>{m.label}</span>
              <span className="text-xs font-mono" style={{ color: '#94a3b8' }}>{formatMW(m.cumulative_mw)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================
// State Comparison Chart
// ============================================================

function StateComparisonChart({ operatingByState, constructionByState, colour }: {
  operatingByState: Record<string, { mw: number; projects: number }>
  constructionByState: Record<string, { mw: number; projects: number }>
  colour: string
}) {
  const chartData = NEM_STATES.map(s => ({
    state: s,
    operating: operatingByState[s]?.mw ?? 0,
    construction: constructionByState[s]?.mw ?? 0,
  })).filter(d => d.operating > 0 || d.construction > 0)

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="state" tick={{ fill: '#94a3b8', fontSize: 12 }} stroke="#334155" />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} stroke="#334155" tickFormatter={(v: number) => formatMW(v)} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }}
            formatter={(value) => [formatMW(value as number)]}
          />
          <Bar dataKey="operating" name="Operating" fill={colour} radius={[4, 4, 0, 0]} />
          <Bar dataKey="construction" name="Construction" fill={`${colour}60`} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ============================================================
// Project Table (for wind/solar — different from battery)
// ============================================================

function ProjectTable({ projects, showState }: { projects: CapacityWatchProject[]; showState?: boolean }) {
  const [sortBy, setSortBy] = useState<'capacity' | 'cod' | 'status' | 'state'>('capacity')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const sorted = useMemo(() => {
    const arr = [...projects]
    arr.sort((a, b) => {
      let cmp = 0
      switch (sortBy) {
        case 'capacity': cmp = a.capacity_mw - b.capacity_mw; break
        case 'cod': cmp = a.cod.localeCompare(b.cod); break
        case 'status': cmp = a.status.localeCompare(b.status); break
        case 'state': cmp = a.state.localeCompare(b.state); break
      }
      return sortDir === 'desc' ? -cmp : cmp
    })
    return arr
  }, [projects, sortBy, sortDir])

  function handleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const thStyle = { color: '#94a3b8', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.05em', cursor: 'pointer', padding: '8px 12px', borderBottom: '1px solid #334155' }
  const tdStyle = { padding: '8px 12px', borderBottom: '1px solid #1e293b', color: '#f1f5f9', fontSize: 13 }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#0f172a' }}>
            <th style={{ ...thStyle, textAlign: 'left' }}>Project</th>
            <th style={{ ...thStyle, textAlign: 'left' }}>Developer</th>
            {showState && (
              <th style={{ ...thStyle, textAlign: 'center' }} onClick={() => handleSort('state')}>
                State {sortBy === 'state' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
              </th>
            )}
            <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('capacity')}>
              MW {sortBy === 'capacity' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
            </th>
            <th style={{ ...thStyle, textAlign: 'center' }} onClick={() => handleSort('status')}>
              Status {sortBy === 'status' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
            </th>
            <th style={{ ...thStyle, textAlign: 'center' }} onClick={() => handleSort('cod')}>
              COD {sortBy === 'cod' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
            </th>
            <th style={{ ...thStyle, textAlign: 'left' }}>Source</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(p => (
            <tr key={p.id} style={{ background: '#1e293b' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#263548')}
              onMouseLeave={e => (e.currentTarget.style.background = '#1e293b')}>
              <td style={tdStyle}>
                <div className="flex flex-col">
                  <span className="font-medium">{p.name}</span>
                  {p.note && <span className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{p.note}</span>}
                </div>
              </td>
              <td style={{ ...tdStyle, color: '#94a3b8', maxWidth: 160 }}>
                <span className="truncate block">{p.developer}</span>
              </td>
              {showState && (
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{
                    background: `${STATE_COLOURS[p.state] ?? '#636e72'}20`,
                    color: STATE_COLOURS[p.state] ?? '#94a3b8',
                  }}>{p.state}</span>
                </td>
              )}
              <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {p.capacity_mw.toLocaleString()}
              </td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>
                <span style={{
                  display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                  background: `${STATUS_COLOURS[p.status] ?? '#636e72'}20`,
                  color: STATUS_COLOURS[p.status] ?? '#636e72',
                }}>
                  {statusLabel(p.status)}
                </span>
              </td>
              <td style={{ ...tdStyle, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                {p.cod ? new Date(p.cod).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' }) : '—'}
              </td>
              <td style={{ ...tdStyle, fontSize: 11, color: '#94a3b8', maxWidth: 180 }}>
                <span className="truncate block">{p.source}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ============================================================
// Unified project type for All Assets tab
// ============================================================

interface UnifiedProject {
  name: string; id: string; developer: string
  capacity_mw: number; status: string; state: string
  cod: string; source: string; note?: string
  technology: string
}

// ============================================================
// All Assets Timeline Chart (stacked by tech)
// ============================================================

function AllAssetsTimelineChart({ bess, wind, solar }: {
  bess: { date: string; label: string; cumulative_mw: number; event?: string }[]
  wind: { date: string; label: string; cumulative_mw: number; event?: string }[]
  solar: { date: string; label: string; cumulative_mw: number; event?: string }[]
}) {
  // Build a combined timeline with all dates, showing cumulative per tech
  const allDates = new Set<string>()
  bess.forEach(m => allDates.add(m.date))
  wind.forEach(m => allDates.add(m.date))
  solar.forEach(m => allDates.add(m.date))

  // Add today
  allDates.add(TODAY)

  const sortedDates = Array.from(allDates).sort()

  // For each date, get the latest cumulative value for each tech
  function getCumulative(milestones: { date: string; cumulative_mw: number }[], targetDate: string): number {
    let last = 0
    for (const m of milestones) {
      if (m.date <= targetDate) last = m.cumulative_mw
      else break
    }
    return last
  }

  const data = sortedDates.map(date => ({
    date,
    shortDate: new Date(date).toLocaleDateString('en-AU', { month: 'short', year: '2-digit' }),
    bess: getCumulative(bess, date),
    wind: getCumulative(wind, date),
    solar: getCumulative(solar, date),
    isToday: date === TODAY,
  }))

  // Thin out data points if too many (keep first, last, today, and every Nth)
  let thinned = data
  if (data.length > 40) {
    const step = Math.ceil(data.length / 30)
    thinned = data.filter((d, i) =>
      i === 0 || i === data.length - 1 || d.isToday || i % step === 0
    )
  }

  return (
    <div style={{ width: '100%', height: 400 }}>
      <ResponsiveContainer>
        <AreaChart data={thinned} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
          <defs>
            <linearGradient id="allBessGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="allWindGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="allSolarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="shortDate"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            stroke="#334155"
            angle={-45}
            textAnchor="end"
            height={50}
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            stroke="#334155"
            tickFormatter={(v: number) => formatMW(v)}
          />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }}
            labelStyle={{ color: '#94a3b8' }}
            formatter={(value, name) => {
              const techName = name === 'bess' ? 'BESS' : name === 'wind' ? 'Wind' : 'Solar'
              return [formatMW(value as number), techName]
            }}
            labelFormatter={(_label, payload) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const item = (payload as any)?.[0]?.payload
              if (!item) return ''
              const total = (item.bess || 0) + (item.wind || 0) + (item.solar || 0)
              const prefix = item.isToday ? 'TODAY — ' : ''
              return `${prefix}${item.date} (Total: ${formatMW(total)})`
            }}
          />
          <Area type="stepAfter" dataKey="wind" name="wind" stackId="1" stroke="#3b82f6" strokeWidth={1.5} fill="url(#allWindGrad)" />
          <Area type="stepAfter" dataKey="solar" name="solar" stackId="1" stroke="#f59e0b" strokeWidth={1.5} fill="url(#allSolarGrad)" />
          <Area type="stepAfter" dataKey="bess" name="bess" stackId="1" stroke="#10b981" strokeWidth={1.5} fill="url(#allBessGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ============================================================
// Tab Icons
// ============================================================

const BessIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
    <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.381z" />
  </svg>
)

const WindIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
    <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z" />
  </svg>
)

const SolarIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
  </svg>
)

const AllIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
    <path d="M2 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4zm5 2a1 1 0 011-1h2a1 1 0 011 1v10a1 1 0 01-1 1H8a1 1 0 01-1-1V6zm5-4a1 1 0 011-1h2a1 1 0 011 1v14a1 1 0 01-1 1h-2a1 1 0 01-1-1V2z" />
  </svg>
)

const TECH_TABS: { id: TechTab; label: string; icon: React.ReactNode }[] = [
  { id: 'bess', label: 'BESS', icon: <BessIcon /> },
  { id: 'solar', label: 'Solar', icon: <SolarIcon /> },
  { id: 'wind', label: 'Wind', icon: <WindIcon /> },
  { id: 'all', label: 'All Assets', icon: <AllIcon /> },
]

// ============================================================
// Convert battery watch data to capacity watch format
// ============================================================

function batteryToCapacityProjects(bw: BatteryWatchData): CapacityWatchProject[] {
  return bw.nsw_focus.projects.map(p => ({
    name: p.name,
    id: p.id,
    developer: p.developer,
    capacity_mw: p.capacity_mw,
    status: p.status,
    state: 'NSW', // battery-watch is NSW-focused
    cod: p.cod,
    source: 'AEMO Generation Information',
    note: p.note,
  }))
}

// ============================================================
// Main Component
// ============================================================

export default function CapacityWatch() {
  const [activeTab, setActiveTab] = useState<TechTab>('bess')
  const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set(NEM_STATES))
  const [batteryData, setBatteryData] = useState<BatteryWatchData | null>(null)
  const [windData, setWindData] = useState<CapacityWatchData | null>(null)
  const [solarData, setSolarData] = useState<CapacityWatchData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchBatteryWatch(), fetchWindWatch(), fetchSolarWatch()])
      .then(([bw, ww, sw]) => {
        setBatteryData(bw)
        setWindData(ww)
        setSolarData(sw)
        setLoading(false)
      })
  }, [])

  // ---- Derived data based on state filter ----

  const filteredWindProjects = useMemo(() =>
    windData?.projects.filter(p => selectedStates.has(p.state)) ?? []
  , [windData, selectedStates])

  const filteredSolarProjects = useMemo(() =>
    solarData?.projects.filter(p => selectedStates.has(p.state)) ?? []
  , [solarData, selectedStates])

  // Recalculate milestones for filtered states
  const filteredWindMilestones = useMemo(() => {
    if (!windData) return []
    const stateProjects = windData.projects.filter(p => selectedStates.has(p.state) && p.status === 'operating')
    if (selectedStates.size === NEM_STATES.length) return windData.timeline_milestones
    // Rebuild milestones from filtered projects
    return rebuildMilestones(stateProjects, windData.projects.filter(p => selectedStates.has(p.state) && (p.status === 'construction' || p.status === 'commissioning')))
  }, [windData, selectedStates])

  const filteredSolarMilestones = useMemo(() => {
    if (!solarData) return []
    if (selectedStates.size === NEM_STATES.length) return solarData.timeline_milestones
    const stateProjects = solarData.projects.filter(p => selectedStates.has(p.state) && p.status === 'operating')
    return rebuildMilestones(stateProjects, solarData.projects.filter(p => selectedStates.has(p.state) && (p.status === 'construction' || p.status === 'commissioning')))
  }, [solarData, selectedStates])

  // Battery milestones (NSW only in current data — filter doesn't apply as meaningfully)
  const bessMilestones = useMemo(() =>
    batteryData?.nsw_focus.timeline_milestones ?? []
  , [batteryData])

  // All unified projects for the All tab
  const allProjects = useMemo((): UnifiedProject[] => {
    const result: UnifiedProject[] = []
    if (batteryData) {
      batteryToCapacityProjects(batteryData).filter(p => selectedStates.has(p.state)).forEach(p =>
        result.push({ ...p, technology: 'bess' })
      )
    }
    filteredWindProjects.forEach(p => result.push({ ...p, technology: 'wind' }))
    filteredSolarProjects.forEach(p => result.push({ ...p, technology: 'solar' }))
    return result
  }, [batteryData, filteredWindProjects, filteredSolarProjects, selectedStates])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#10b981' }} />
      </div>
    )
  }

  const tabColour = TECH_COLOURS[activeTab]

  // Compute summary stats for current tab
  const summaryStats = getSummaryStats(activeTab, batteryData, windData, solarData, selectedStates)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg p-5" style={{
        background: `linear-gradient(135deg, ${tabColour}15 0%, #1e293b 100%)`,
        border: '1px solid #334155',
      }}>
        <div className="flex items-center gap-3 mb-2">
          {TECH_TABS.find(t => t.id === activeTab)?.icon}
          <h2 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>Capacity Watch</h2>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${tabColour}30`, color: tabColour }}>
            {activeTab === 'all' ? 'All Technologies' : TECH_TABS.find(t => t.id === activeTab)?.label}
          </span>
        </div>
        <p className="text-sm" style={{ color: '#94a3b8' }}>
          {activeTab === 'bess' && 'Tracking the battery storage revolution across the NEM — from first utility-scale deployments to a projected 12+ GW fleet.'}
          {activeTab === 'wind' && `Tracking ${summaryStats.operatingProjects} operating wind farms (${formatMW(summaryStats.operatingMW)}) with ${formatMW(summaryStats.constructionMW)} under construction.`}
          {activeTab === 'solar' && `Tracking ${summaryStats.operatingProjects} operating solar farms (${formatMW(summaryStats.operatingMW)}) with ${formatMW(summaryStats.constructionMW)} under construction.`}
          {activeTab === 'all' && `Combined NEM renewable capacity: ${formatMW(summaryStats.operatingMW)} operating across BESS, wind and solar.`}
        </p>
      </div>

      {/* Tech tabs */}
      <div className="flex flex-wrap gap-2">
        {TECH_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: activeTab === tab.id ? `${TECH_COLOURS[tab.id]}20` : '#1e293b',
              color: activeTab === tab.id ? TECH_COLOURS[tab.id] : '#94a3b8',
              border: `1px solid ${activeTab === tab.id ? `${TECH_COLOURS[tab.id]}40` : '#334155'}`,
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* State filter */}
      <StateFilter selected={selectedStates} onChange={setSelectedStates} />

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Operating" value={formatMW(summaryStats.operatingMW)} sub={`${summaryStats.operatingProjects} projects`} colour={tabColour} />
        <StatCard label="Construction" value={formatMW(summaryStats.constructionMW)} sub={`${summaryStats.constructionProjects} projects`} colour="#3b82f6" />
        <StatCard label="States Active" value={`${summaryStats.statesActive}`} sub="with operating capacity" colour="#f59e0b" />
        <StatCard label="Since 2022" value={formatMW(summaryStats.addedSince2022)} sub="new capacity added" colour="#8b5cf6" />
      </div>

      {/* Content based on active tab */}
      {activeTab === 'bess' && batteryData && (
        <BESSTabContent data={batteryData} selectedStates={selectedStates} />
      )}

      {activeTab === 'wind' && windData && (
        <TechTabContent
          data={windData}
          projects={filteredWindProjects}
          milestones={filteredWindMilestones}
          colour="#3b82f6"
          techLabel="Wind"
          selectedStates={selectedStates}
        />
      )}

      {activeTab === 'solar' && solarData && (
        <TechTabContent
          data={solarData}
          projects={filteredSolarProjects}
          milestones={filteredSolarMilestones}
          colour="#f59e0b"
          techLabel="Solar"
          selectedStates={selectedStates}
        />
      )}

      {activeTab === 'all' && (
        <AllAssetsTabContent
          batteryData={batteryData}
          windData={windData}
          solarData={solarData}
          allProjects={allProjects}
          bessMilestones={bessMilestones}
          windMilestones={filteredWindMilestones}
          solarMilestones={filteredSolarMilestones}
          selectedStates={selectedStates}
        />
      )}
    </div>
  )
}

// ============================================================
// Helper: rebuild milestones from filtered projects
// ============================================================

function rebuildMilestones(
  operatingProjects: CapacityWatchProject[],
  pipelineProjects: CapacityWatchProject[]
) {
  const sorted = [...operatingProjects].sort((a, b) => a.cod.localeCompare(b.cod))
  const milestones: { date: string; label: string; cumulative_mw: number; event?: string }[] = []

  // Pre-2022 fleet
  const pre2022 = sorted.filter(p => p.cod < '2022-01-01')
  let cumulative = pre2022.reduce((sum, p) => sum + p.capacity_mw, 0)

  if (cumulative > 0) {
    milestones.push({
      date: '2022-01-01',
      label: `Pre-2022 fleet: ${pre2022.length} projects`,
      cumulative_mw: Math.round(cumulative),
    })
  }

  const post2022 = sorted.filter(p => p.cod >= '2022-01-01')
  for (const p of post2022) {
    cumulative += p.capacity_mw
    milestones.push({
      date: p.cod,
      label: `${p.name} online (${Math.round(p.capacity_mw)} MW)`,
      cumulative_mw: Math.round(cumulative),
    })
  }

  // Pipeline
  const sortedPipeline = [...pipelineProjects].sort((a, b) => (a.cod || '9999').localeCompare(b.cod || '9999'))
  for (const p of sortedPipeline) {
    if (p.cod) {
      cumulative += p.capacity_mw
      milestones.push({
        date: p.cod,
        label: `${p.name} expected (${Math.round(p.capacity_mw)} MW)`,
        cumulative_mw: Math.round(cumulative),
      })
    }
  }

  return milestones
}

// ============================================================
// Helper: compute summary stats
// ============================================================

function getSummaryStats(
  tab: TechTab,
  battery: BatteryWatchData | null,
  wind: CapacityWatchData | null,
  solar: CapacityWatchData | null,
  selectedStates: Set<string>,
) {
  let operatingMW = 0, operatingProjects = 0
  let constructionMW = 0, constructionProjects = 0
  let statesActive = 0
  let addedSince2022 = 0

  const stateSet = new Set<string>()

  function addTech(data: CapacityWatchData | null) {
    if (!data) return
    const filtered = data.projects.filter(p => selectedStates.has(p.state))
    const op = filtered.filter(p => p.status === 'operating')
    const con = filtered.filter(p => p.status === 'construction' || p.status === 'commissioning')
    operatingMW += op.reduce((s, p) => s + p.capacity_mw, 0)
    operatingProjects += op.length
    constructionMW += con.reduce((s, p) => s + p.capacity_mw, 0)
    constructionProjects += con.length
    op.forEach(p => stateSet.add(p.state))
    addedSince2022 += op.filter(p => p.cod >= '2022-01-01').reduce((s, p) => s + p.capacity_mw, 0)
  }

  function addBattery(data: BatteryWatchData | null) {
    if (!data) return
    // Battery data is NEM-wide for totals
    for (const state of Array.from(selectedStates)) {
      const opState = data.nem_wide.operating.by_state[state]
      const conState = data.nem_wide.construction.by_state[state]
      if (opState) {
        operatingMW += opState.mw
        operatingProjects += opState.projects
        if (opState.mw > 0) stateSet.add(state)
      }
      if (conState) {
        constructionMW += conState.mw
        constructionProjects += conState.projects
      }
    }
    // Since 2022 for BESS
    const milestones = data.nsw_focus.timeline_milestones
    if (milestones.length > 0) {
      const pre2022 = milestones.find(m => m.date >= '2022-01-01')
      const latest = milestones.filter(m => m.date <= TODAY)
      if (pre2022 && latest.length > 0) {
        const startMW = milestones[0]?.cumulative_mw ?? 0
        const currentMW = latest[latest.length - 1].cumulative_mw
        addedSince2022 += currentMW - startMW
      }
    }
  }

  if (tab === 'bess') {
    addBattery(battery)
  } else if (tab === 'wind') {
    addTech(wind)
  } else if (tab === 'solar') {
    addTech(solar)
  } else {
    addBattery(battery)
    addTech(wind)
    addTech(solar)
  }

  statesActive = stateSet.size

  return {
    operatingMW: Math.round(operatingMW),
    operatingProjects,
    constructionMW: Math.round(constructionMW),
    constructionProjects,
    statesActive,
    addedSince2022: Math.round(addedSince2022),
  }
}

// ============================================================
// BESS Tab Content (wraps existing BatteryWatch features)
// ============================================================

function BESSTabContent({ data, selectedStates }: { data: BatteryWatchData; selectedStates: Set<string> }) {
  const [section, setSection] = useState<'timeline' | 'projects' | 'states'>('timeline')

  return (
    <div className="space-y-4">
      {/* Section nav */}
      <div className="flex gap-2">
        {[
          { id: 'timeline' as const, label: 'Capacity Timeline' },
          { id: 'projects' as const, label: 'Projects' },
          { id: 'states' as const, label: 'By State' },
        ].map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: section === s.id ? '#10b98120' : '#0f172a',
              color: section === s.id ? '#10b981' : '#94a3b8',
              border: `1px solid ${section === s.id ? '#10b98140' : '#334155'}`,
            }}>
            {s.label}
          </button>
        ))}
      </div>

      {section === 'timeline' && (() => {
        const showNswNote = selectedStates.size < NEM_STATES.length && selectedStates.has('NSW')
        const noNsw = !selectedStates.has('NSW')
        return (
          <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <h3 className="text-sm font-semibold mb-1" style={{ color: '#f1f5f9' }}>
              BESS Capacity Timeline {selectedStates.size < NEM_STATES.length ? `(NSW project-level detail)` : '(NSW)'}
            </h3>
            <p className="text-xs mb-4" style={{ color: '#94a3b8' }}>
              Cumulative operating battery capacity in NSW. The white dot marks today.
              {showNswNote && ' BESS timeline data is currently NSW-focused — state filter applies to stats and project tables.'}
            </p>
            {noNsw ? (
              <div className="py-12 text-center">
                <p className="text-sm" style={{ color: '#94a3b8' }}>BESS timeline data is currently NSW-focused.</p>
                <p className="text-xs mt-1" style={{ color: '#64748b' }}>Select NSW in the state filter to view the capacity timeline, or use the By State section for NEM-wide breakdown.</p>
              </div>
            ) : (
              <>
                <CapacityTimelineChart
                  milestones={data.nsw_focus.timeline_milestones}
                  colour="#10b981"
                  techLabel="BESS"
                />
                <MilestoneList milestones={data.nsw_focus.timeline_milestones} colour="#10b981" />
              </>
            )}
          </div>
        )
      })()}

      {section === 'projects' && (
        <div className="space-y-4">
          <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} />
              <h3 className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>
                Operating ({data.nsw_focus.projects.filter(p => p.status === 'operating').length} projects)
              </h3>
            </div>
            <ProjectTable
              projects={data.nsw_focus.projects.filter(p => p.status === 'operating').map(p => ({
                name: p.name, id: p.id, developer: p.developer,
                capacity_mw: p.capacity_mw, status: p.status, state: 'NSW',
                cod: p.cod, source: 'AEMO Generation Information',
                note: p.milestone,
              }))}
            />
          </div>
          <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full" style={{ background: '#3b82f6' }} />
              <h3 className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>
                Pipeline ({data.nsw_focus.projects.filter(p => p.status !== 'operating').length} projects)
              </h3>
            </div>
            <ProjectTable
              projects={data.nsw_focus.projects.filter(p => p.status !== 'operating').map(p => ({
                name: p.name, id: p.id, developer: p.developer,
                capacity_mw: p.capacity_mw, status: p.status, state: 'NSW',
                cod: p.cod, source: 'AEMO Generation Information',
                note: p.note,
              }))}
            />
          </div>
        </div>
      )}

      {section === 'states' && (
        <div className="space-y-4">
          <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <h3 className="text-sm font-semibold mb-1" style={{ color: '#f1f5f9' }}>BESS Capacity by State</h3>
            <p className="text-xs mb-4" style={{ color: '#94a3b8' }}>Operating vs construction across NEM states.</p>
            <StateComparisonChart
              operatingByState={Object.fromEntries(
                Object.entries(data.nem_wide.operating.by_state)
                  .filter(([s]) => selectedStates.has(s))
                  .map(([s, v]) => [s, { mw: v.mw, projects: v.projects }])
              )}
              constructionByState={Object.fromEntries(
                Object.entries(data.nem_wide.construction.by_state)
                  .filter(([s]) => selectedStates.has(s))
                  .map(([s, v]) => [s, { mw: v.mw, projects: v.projects }])
              )}
              colour="#10b981"
            />
            <div className="flex items-center justify-center gap-6 mt-2">
              <span className="flex items-center gap-1.5 text-xs" style={{ color: '#94a3b8' }}>
                <span className="w-3 h-3 rounded" style={{ background: '#10b981' }} /> Operating
              </span>
              <span className="flex items-center gap-1.5 text-xs" style={{ color: '#94a3b8' }}>
                <span className="w-3 h-3 rounded" style={{ background: '#10b98160' }} /> Construction
              </span>
            </div>
          </div>

          {/* State cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {NEM_STATES.filter(s => selectedStates.has(s)).map(state => {
              const op = data.nem_wide.operating.by_state[state]
              const con = data.nem_wide.construction.by_state[state]
              return (
                <div key={state} className="rounded-lg p-3" style={{ background: '#1e293b', border: '1px solid #334155' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATE_COLOURS[state] }} />
                    <span className="text-sm font-bold" style={{ color: '#f1f5f9' }}>{state}</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span style={{ color: '#94a3b8' }}>Operating</span>
                      <span style={{ color: '#10b981' }}>{formatMW(op?.mw ?? 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: '#94a3b8' }}>Projects</span>
                      <span style={{ color: '#f1f5f9' }}>{op?.projects ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: '#94a3b8' }}>Construction</span>
                      <span style={{ color: '#3b82f6' }}>{formatMW(con?.mw ?? 0)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Wind / Solar Tab Content (generic)
// ============================================================

function TechTabContent({ data, projects, milestones, colour, techLabel, selectedStates }: {
  data: CapacityWatchData
  projects: CapacityWatchProject[]
  milestones: { date: string; label: string; cumulative_mw: number; event?: string }[]
  colour: string
  techLabel: string
  selectedStates: Set<string>
}) {
  const [section, setSection] = useState<'timeline' | 'projects' | 'states'>('timeline')

  const operatingProjects = useMemo(() =>
    projects.filter(p => p.status === 'operating').sort((a, b) => b.capacity_mw - a.capacity_mw)
  , [projects])

  const pipelineProjects = useMemo(() =>
    projects.filter(p => p.status !== 'operating').sort((a, b) => b.capacity_mw - a.capacity_mw)
  , [projects])

  return (
    <div className="space-y-4">
      {/* Section nav */}
      <div className="flex gap-2">
        {[
          { id: 'timeline' as const, label: 'Capacity Timeline' },
          { id: 'projects' as const, label: `Projects (${projects.length})` },
          { id: 'states' as const, label: 'By State' },
        ].map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: section === s.id ? `${colour}20` : '#0f172a',
              color: section === s.id ? colour : '#94a3b8',
              border: `1px solid ${section === s.id ? `${colour}40` : '#334155'}`,
            }}>
            {s.label}
          </button>
        ))}
      </div>

      {section === 'timeline' && (
        <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
          <h3 className="text-sm font-semibold mb-1" style={{ color: '#f1f5f9' }}>
            {techLabel} Capacity Timeline {selectedStates.size < NEM_STATES.length ? `(${Array.from(selectedStates).join(', ')})` : '(NEM)'}
          </h3>
          <p className="text-xs mb-4" style={{ color: '#94a3b8' }}>
            Cumulative {techLabel.toLowerCase()} capacity from 2022 onwards. The white dot marks today.
            {milestones.length > 25 && ' Data points grouped by quarter where dense.'}
          </p>
          <CapacityTimelineChart milestones={milestones} colour={colour} techLabel={techLabel} />
          <MilestoneList milestones={milestones} colour={colour} />
        </div>
      )}

      {section === 'projects' && (
        <div className="space-y-4">
          <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} />
              <h3 className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>
                Operating ({operatingProjects.length} projects, {formatMW(operatingProjects.reduce((s, p) => s + p.capacity_mw, 0))})
              </h3>
            </div>
            <ProjectTable projects={operatingProjects} showState />
          </div>

          {pipelineProjects.length > 0 && (
            <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full" style={{ background: '#3b82f6' }} />
                <h3 className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>
                  Pipeline ({pipelineProjects.length} projects, {formatMW(pipelineProjects.reduce((s, p) => s + p.capacity_mw, 0))})
                </h3>
              </div>
              <ProjectTable projects={pipelineProjects} showState />
            </div>
          )}
        </div>
      )}

      {section === 'states' && (
        <div className="space-y-4">
          <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <h3 className="text-sm font-semibold mb-1" style={{ color: '#f1f5f9' }}>{techLabel} Capacity by State</h3>
            <StateComparisonChart
              operatingByState={Object.fromEntries(
                NEM_STATES.filter(s => selectedStates.has(s)).map(s => [s, data.by_state.operating[s] ?? { mw: 0, projects: 0 }])
              )}
              constructionByState={Object.fromEntries(
                NEM_STATES.filter(s => selectedStates.has(s)).map(s => [s, data.by_state.construction[s] ?? { mw: 0, projects: 0 }])
              )}
              colour={colour}
            />
            <div className="flex items-center justify-center gap-6 mt-2">
              <span className="flex items-center gap-1.5 text-xs" style={{ color: '#94a3b8' }}>
                <span className="w-3 h-3 rounded" style={{ background: colour }} /> Operating
              </span>
              <span className="flex items-center gap-1.5 text-xs" style={{ color: '#94a3b8' }}>
                <span className="w-3 h-3 rounded" style={{ background: `${colour}60` }} /> Construction
              </span>
            </div>
          </div>

          {/* State cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {NEM_STATES.filter(s => selectedStates.has(s)).map(state => {
              const op = data.by_state.operating[state]
              const con = data.by_state.construction[state]
              return (
                <div key={state} className="rounded-lg p-3" style={{ background: '#1e293b', border: '1px solid #334155' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATE_COLOURS[state] }} />
                    <span className="text-sm font-bold" style={{ color: '#f1f5f9' }}>{state}</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span style={{ color: '#94a3b8' }}>Operating</span>
                      <span style={{ color: colour }}>{formatMW(op?.mw ?? 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: '#94a3b8' }}>Projects</span>
                      <span style={{ color: '#f1f5f9' }}>{op?.projects ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: '#94a3b8' }}>Construction</span>
                      <span style={{ color: '#3b82f6' }}>{formatMW(con?.mw ?? 0)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// All Assets Tab
// ============================================================

function AllAssetsTabContent({ batteryData, windData, solarData, allProjects, bessMilestones, windMilestones, solarMilestones, selectedStates }: {
  batteryData: BatteryWatchData | null
  windData: CapacityWatchData | null
  solarData: CapacityWatchData | null
  allProjects: UnifiedProject[]
  bessMilestones: { date: string; label: string; cumulative_mw: number; event?: string }[]
  windMilestones: { date: string; label: string; cumulative_mw: number; event?: string }[]
  solarMilestones: { date: string; label: string; cumulative_mw: number; event?: string }[]
  selectedStates: Set<string>
}) {
  const [section, setSection] = useState<'timeline' | 'projects' | 'breakdown'>('timeline')

  // Tech breakdown for the summary bar chart
  const techBreakdown = useMemo(() => {
    const result: { tech: string; operating: number; construction: number }[] = []

    if (batteryData) {
      let opMW = 0, conMW = 0
      for (const state of Array.from(selectedStates)) {
        opMW += batteryData.nem_wide.operating.by_state[state]?.mw ?? 0
        conMW += batteryData.nem_wide.construction.by_state[state]?.mw ?? 0
      }
      result.push({ tech: 'BESS', operating: opMW, construction: conMW })
    }
    if (windData) {
      const wop = windData.projects.filter(p => selectedStates.has(p.state) && p.status === 'operating')
      const wcon = windData.projects.filter(p => selectedStates.has(p.state) && (p.status === 'construction' || p.status === 'commissioning'))
      result.push({ tech: 'Wind', operating: Math.round(wop.reduce((s, p) => s + p.capacity_mw, 0)), construction: Math.round(wcon.reduce((s, p) => s + p.capacity_mw, 0)) })
    }
    if (solarData) {
      const sop = solarData.projects.filter(p => selectedStates.has(p.state) && p.status === 'operating')
      const scon = solarData.projects.filter(p => selectedStates.has(p.state) && (p.status === 'construction' || p.status === 'commissioning'))
      result.push({ tech: 'Solar', operating: Math.round(sop.reduce((s, p) => s + p.capacity_mw, 0)), construction: Math.round(scon.reduce((s, p) => s + p.capacity_mw, 0)) })
    }
    return result
  }, [batteryData, windData, solarData, selectedStates])

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[
          { id: 'timeline' as const, label: 'Stacked Timeline' },
          { id: 'breakdown' as const, label: 'Tech Breakdown' },
          { id: 'projects' as const, label: `All Projects (${allProjects.length})` },
        ].map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: section === s.id ? '#8b5cf620' : '#0f172a',
              color: section === s.id ? '#8b5cf6' : '#94a3b8',
              border: `1px solid ${section === s.id ? '#8b5cf640' : '#334155'}`,
            }}>
            {s.label}
          </button>
        ))}
      </div>

      {section === 'timeline' && (
        <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
          <h3 className="text-sm font-semibold mb-1" style={{ color: '#f1f5f9' }}>
            Combined Renewable Capacity Timeline
          </h3>
          <p className="text-xs mb-4" style={{ color: '#94a3b8' }}>
            Stacked area chart showing cumulative BESS, wind and solar capacity from 2022.
          </p>
          <AllAssetsTimelineChart
            bess={bessMilestones}
            wind={windMilestones}
            solar={solarMilestones}
          />
          <div className="flex items-center justify-center gap-6 mt-2">
            <span className="flex items-center gap-1.5 text-xs" style={{ color: '#94a3b8' }}>
              <span className="w-3 h-3 rounded" style={{ background: '#3b82f6' }} /> Wind
            </span>
            <span className="flex items-center gap-1.5 text-xs" style={{ color: '#94a3b8' }}>
              <span className="w-3 h-3 rounded" style={{ background: '#f59e0b' }} /> Solar
            </span>
            <span className="flex items-center gap-1.5 text-xs" style={{ color: '#94a3b8' }}>
              <span className="w-3 h-3 rounded" style={{ background: '#10b981' }} /> BESS
            </span>
          </div>
        </div>
      )}

      {section === 'breakdown' && (
        <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
          <h3 className="text-sm font-semibold mb-1" style={{ color: '#f1f5f9' }}>Technology Breakdown</h3>
          <p className="text-xs mb-4" style={{ color: '#94a3b8' }}>Operating vs construction capacity by technology.</p>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={techBreakdown} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="tech" tick={{ fill: '#94a3b8', fontSize: 12 }} stroke="#334155" />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} stroke="#334155" tickFormatter={(v: number) => formatMW(v)} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }}
                  formatter={(value) => [formatMW(value as number)]}
                />
                <Bar dataKey="operating" name="Operating" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="construction" name="Construction" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {section === 'projects' && (
        <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: '#f1f5f9' }}>
            All Renewable Projects ({allProjects.length})
          </h3>
          <AllProjectsTable projects={allProjects} />
        </div>
      )}
    </div>
  )
}

// ============================================================
// All Projects Table (with tech column)
// ============================================================

function AllProjectsTable({ projects }: { projects: UnifiedProject[] }) {
  const [sortBy, setSortBy] = useState<'capacity' | 'cod' | 'tech' | 'state'>('capacity')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const sorted = useMemo(() => {
    const arr = [...projects]
    arr.sort((a, b) => {
      let cmp = 0
      switch (sortBy) {
        case 'capacity': cmp = a.capacity_mw - b.capacity_mw; break
        case 'cod': cmp = (a.cod || '9999').localeCompare(b.cod || '9999'); break
        case 'tech': cmp = a.technology.localeCompare(b.technology); break
        case 'state': cmp = a.state.localeCompare(b.state); break
      }
      return sortDir === 'desc' ? -cmp : cmp
    })
    return arr
  }, [projects, sortBy, sortDir])

  function handleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const thStyle = { color: '#94a3b8', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.05em', cursor: 'pointer', padding: '8px 10px', borderBottom: '1px solid #334155' }
  const tdStyle = { padding: '8px 10px', borderBottom: '1px solid #1e293b', color: '#f1f5f9', fontSize: 12 }

  // Paginate to handle large lists
  const [page, setPage] = useState(0)
  const pageSize = 50
  const totalPages = Math.ceil(sorted.length / pageSize)
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize)

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#0f172a' }}>
              <th style={{ ...thStyle, textAlign: 'left' }}>Project</th>
              <th style={{ ...thStyle, textAlign: 'center' }} onClick={() => handleSort('tech')}>
                Tech {sortBy === 'tech' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th style={{ ...thStyle, textAlign: 'center' }} onClick={() => handleSort('state')}>
                State {sortBy === 'state' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('capacity')}>
                MW {sortBy === 'capacity' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
              <th style={{ ...thStyle, textAlign: 'center' }} onClick={() => handleSort('cod')}>
                COD {sortBy === 'cod' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
              </th>
            </tr>
          </thead>
          <tbody>
            {paged.map(p => (
              <tr key={`${p.technology}-${p.id}`} style={{ background: '#1e293b' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#263548')}
                onMouseLeave={e => (e.currentTarget.style.background = '#1e293b')}>
                <td style={tdStyle}>
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs ml-2" style={{ color: '#94a3b8' }}>{p.developer}</span>
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{
                    background: `${TECH_COLOURS[p.technology] ?? '#636e72'}20`,
                    color: TECH_COLOURS[p.technology] ?? '#94a3b8',
                  }}>
                    {p.technology === 'bess' ? 'BESS' : p.technology.charAt(0).toUpperCase() + p.technology.slice(1)}
                  </span>
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <span className="px-1.5 py-0.5 rounded text-xs" style={{
                    background: `${STATE_COLOURS[p.state] ?? '#636e72'}20`,
                    color: STATE_COLOURS[p.state] ?? '#94a3b8',
                  }}>{p.state}</span>
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {p.capacity_mw.toLocaleString()}
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-block', padding: '2px 6px', borderRadius: 12, fontSize: 10, fontWeight: 600,
                    background: `${STATUS_COLOURS[p.status] ?? '#636e72'}20`,
                    color: STATUS_COLOURS[p.status] ?? '#636e72',
                  }}>
                    {statusLabel(p.status)}
                  </span>
                </td>
                <td style={{ ...tdStyle, textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>
                  {p.cod ? new Date(p.cod).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' }) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-3">
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
            className="px-2 py-1 rounded text-xs" style={{ background: '#0f172a', color: page === 0 ? '#334155' : '#94a3b8', border: '1px solid #334155' }}>
            Prev
          </button>
          <span className="text-xs" style={{ color: '#94a3b8' }}>Page {page + 1} of {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
            className="px-2 py-1 rounded text-xs" style={{ background: '#0f172a', color: page >= totalPages - 1 ? '#334155' : '#94a3b8', border: '1px solid #334155' }}>
            Next
          </button>
        </div>
      )}
    </div>
  )
}
