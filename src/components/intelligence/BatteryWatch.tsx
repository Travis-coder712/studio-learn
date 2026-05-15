import { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, ReferenceLine,
} from 'recharts'
import { fetchBatteryWatch } from '../../lib/dataService'
import type { BatteryWatchData, BatteryWatchProject, BatteryWatchMilestone } from '../../lib/types'

// ============================================================
// Colours & constants
// ============================================================

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

function formatMW(mw: number): string {
  if (mw >= 1000) return `${(mw / 1000).toFixed(1)} GW`
  return `${mw.toLocaleString()} MW`
}

function formatMWh(mwh: number): string {
  if (mwh >= 1000) return `${(mwh / 1000).toFixed(1)} GWh`
  return `${mwh.toLocaleString()} MWh`
}

function statusLabel(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ============================================================
// Section components
// ============================================================

type SectionId = 'nsw-timeline' | 'nsw-projects' | 'qld-timeline' | 'qld-projects' | 'vic-timeline' | 'vic-projects' | 'sa-timeline' | 'sa-projects' | 'nem-pipeline' | 'displacement' | 'analysis'

const SectionIcon = ({ section }: { section: SectionId }) => {
  switch (section) {
    case 'nsw-timeline': return (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 011 1v3.586l1.293-1.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L5 11.586V8a1 1 0 011-1z" clipRule="evenodd" />
      </svg>
    )
    case 'nsw-projects': return (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.381z" />
      </svg>
    )
    case 'nem-pipeline': return (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zM14 5.586v12.828l2.293-2.293A1 1 0 0017 16V6a1 1 0 00-.293-.707L14 2.586v3z" clipRule="evenodd" />
      </svg>
    )
    case 'displacement': return (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
      </svg>
    )
    case 'qld-timeline': return (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 011 1v3.586l1.293-1.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L5 11.586V8a1 1 0 011-1z" clipRule="evenodd" />
      </svg>
    )
    case 'qld-projects': return (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.381z" />
      </svg>
    )
    case 'vic-timeline': return (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 011 1v3.586l1.293-1.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L5 11.586V8a1 1 0 011-1z" clipRule="evenodd" />
      </svg>
    )
    case 'vic-projects': return (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.381z" />
      </svg>
    )
    case 'sa-timeline': return (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 011 1v3.586l1.293-1.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L5 11.586V8a1 1 0 011-1z" clipRule="evenodd" />
      </svg>
    )
    case 'sa-projects': return (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.381z" />
      </svg>
    )
    case 'analysis': return (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    )
  }
}

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
// NSW Timeline Chart
// ============================================================

function NSWTimelineChart({ milestones }: { milestones: BatteryWatchMilestone[] }) {
  const data = milestones.map(m => ({
    date: m.date,
    label: m.label,
    mw: m.cumulative_mw,
    event: m.event,
    shortDate: new Date(m.date).toLocaleDateString('en-AU', { month: 'short', year: '2-digit' }),
  }))

  return (
    <div style={{ width: '100%', height: 360 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
          <defs>
            <linearGradient id="bwGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
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
              return item ? `${item.date} — ${item.label}` : ''
            }}
          />
          <ReferenceLine y={2000} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: '2 GW', fill: '#f59e0b', fontSize: 11, position: 'right' }} />
          <ReferenceLine y={4000} stroke="#ef4444" strokeDasharray="5 5" label={{ value: '4 GW', fill: '#ef4444', fontSize: 11, position: 'right' }} />
          <Area
            type="stepAfter"
            dataKey="mw"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#bwGrad)"
            dot={(props) => {
              const { cx, cy, payload } = props as { cx: number; cy: number; payload: { event?: string } }
              if (payload.event === 'setback') {
                return <circle cx={cx} cy={cy} r={6} fill="#ef4444" stroke="#1e293b" strokeWidth={2} key={`dot-${cx}`} />
              }
              return <circle cx={cx} cy={cy} r={4} fill="#10b981" stroke="#1e293b" strokeWidth={2} key={`dot-${cx}`} />
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ============================================================
// NEM Projected Capacity Chart
// ============================================================

function NEMProjectionChart({ projected }: { projected: { date: string; mw: number; label: string }[] }) {
  const data = projected.map(p => ({
    ...p,
    shortDate: p.label,
    gw: p.mw / 1000,
  }))

  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
          <defs>
            <linearGradient id="nemGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="shortDate" tick={{ fill: '#94a3b8', fontSize: 11 }} stroke="#334155" />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            stroke="#334155"
            tickFormatter={(v: number) => `${v.toFixed(0)} GW`}
            domain={[0, 14]}
          />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }}
            formatter={(value) => [`${(value as number).toFixed(1)} GW`, 'NEM Battery Capacity']}
          />
          <Area type="monotone" dataKey="gw" stroke="#3b82f6" strokeWidth={2} fill="url(#nemGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ============================================================
// NEM State Comparison
// ============================================================

function StateComparisonChart({ data }: { data: BatteryWatchData }) {
  const states = ['NSW', 'QLD', 'VIC', 'SA'] as const
  const chartData = states.map(s => ({
    state: s,
    operating: data.nem_wide.operating.by_state[s]?.mw ?? 0,
    construction: data.nem_wide.construction.by_state[s]?.mw ?? 0,
  }))

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
          <Bar dataKey="operating" name="Operating" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="construction" name="Construction" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ============================================================
// State Buildout Chart — cumulative MW with status layers
// ============================================================

function StateBuildoutChart({ projects, stateName }: { projects: BatteryWatchProject[]; stateName: string }) {
  const [showLayers, setShowLayers] = useState({ operating: true, construction: true, development: false })

  const chartData = useMemo(() => {
    // Build timeline points from project COD dates
    type Point = { date: string; label: string; mw: number; status: string }
    const points: Point[] = []

    for (const p of projects) {
      if (!p.cod || p.cod === 'TBD') continue
      points.push({ date: p.cod, label: p.name, mw: p.capacity_mw, status: p.status })
    }

    // Sort by date
    points.sort((a, b) => a.date.localeCompare(b.date))

    // Build cumulative series per layer
    let opCum = 0, conCum = 0, devCum = 0
    const data: { date: string; operating: number; construction: number; development: number; shortDate: string }[] = []

    for (const pt of points) {
      if (pt.status === 'operating' || pt.status === 'commissioning') opCum += pt.mw
      else if (pt.status === 'construction') conCum += pt.mw
      else if (pt.status === 'development') devCum += pt.mw

      data.push({
        date: pt.date,
        operating: opCum,
        construction: opCum + conCum,
        development: opCum + conCum + devCum,
        shortDate: new Date(pt.date).toLocaleDateString('en-AU', { month: 'short', year: '2-digit' }),
      })
    }

    // Deduplicate same shortDate — keep last
    const seen = new Map<string, typeof data[number]>()
    for (const d of data) seen.set(d.shortDate, d)
    return [...seen.values()]
  }, [projects])

  if (chartData.length < 2) return null

  return (
    <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
      <h3 className="text-sm font-semibold mb-1" style={{ color: '#f1f5f9' }}>{stateName} BESS Capacity Buildout</h3>
      <p className="text-xs mb-3" style={{ color: '#94a3b8' }}>
        Cumulative capacity by project COD date. Toggle layers to see operating, construction, and development pipeline.
      </p>
      <div className="flex gap-3 mb-3">
        {[
          { key: 'operating' as const, label: 'Operating', colour: '#10b981' },
          { key: 'construction' as const, label: 'Construction', colour: '#3b82f6' },
          { key: 'development' as const, label: 'Development (FID)', colour: '#8b5cf6' },
        ].map(layer => (
          <label key={layer.key} className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: '#94a3b8' }}>
            <input
              type="checkbox"
              checked={showLayers[layer.key]}
              onChange={() => setShowLayers(s => ({ ...s, [layer.key]: !s[layer.key] }))}
              style={{ accentColor: layer.colour }}
            />
            <span className="w-2 h-2 rounded-full" style={{ background: layer.colour }} />
            {layer.label}
          </label>
        ))}
      </div>
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
            <defs>
              <linearGradient id={`grad-op-${stateName}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id={`grad-con-${stateName}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id={`grad-dev-${stateName}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="shortDate"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              stroke="#334155"
              angle={-45}
              textAnchor="end"
              height={50}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              stroke="#334155"
              tickFormatter={(v: number) => formatMW(v)}
            />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }}
              formatter={(value, name) => [formatMW(value as number), name === 'development' ? 'Incl. Development' : name === 'construction' ? 'Incl. Construction' : 'Operating']}
            />
            {showLayers.development && (
              <Area type="stepAfter" dataKey="development" stroke="#8b5cf6" strokeWidth={1} fill={`url(#grad-dev-${stateName})`} strokeDasharray="4 2" />
            )}
            {showLayers.construction && (
              <Area type="stepAfter" dataKey="construction" stroke="#3b82f6" strokeWidth={1.5} fill={`url(#grad-con-${stateName})`} />
            )}
            {showLayers.operating && (
              <Area type="stepAfter" dataKey="operating" stroke="#10b981" strokeWidth={2} fill={`url(#grad-op-${stateName})`} />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ============================================================
// Project Table
// ============================================================

function ProjectTable({ projects }: { projects: BatteryWatchProject[] }) {
  const [sortBy, setSortBy] = useState<'capacity' | 'storage' | 'cod' | 'status'>('capacity')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const sorted = useMemo(() => {
    const arr = [...projects]
    arr.sort((a, b) => {
      let cmp = 0
      switch (sortBy) {
        case 'capacity': cmp = a.capacity_mw - b.capacity_mw; break
        case 'storage': cmp = a.storage_mwh - b.storage_mwh; break
        case 'cod': cmp = a.cod.localeCompare(b.cod); break
        case 'status': cmp = a.status.localeCompare(b.status); break
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
            <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('capacity')}>
              MW {sortBy === 'capacity' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
            </th>
            <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('storage')}>
              MWh {sortBy === 'storage' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
            </th>
            <th style={{ ...thStyle, textAlign: 'center' }}>Duration</th>
            <th style={{ ...thStyle, textAlign: 'center' }} onClick={() => handleSort('status')}>
              Status {sortBy === 'status' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
            </th>
            <th style={{ ...thStyle, textAlign: 'center' }} onClick={() => handleSort('cod')}>
              COD {sortBy === 'cod' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(p => (
            <tr key={p.id} style={{ background: '#1e293b' }} onMouseEnter={e => (e.currentTarget.style.background = '#263548')} onMouseLeave={e => (e.currentTarget.style.background = '#1e293b')}>
              <td style={tdStyle}>
                <div className="flex flex-col">
                  <span className="font-medium">{p.name}</span>
                  {p.milestone && <span style={{ color: '#f59e0b', fontSize: 11 }}>{p.milestone}</span>}
                </div>
              </td>
              <td style={{ ...tdStyle, color: '#94a3b8' }}>{p.developer}</td>
              <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {p.capacity_mw.toLocaleString()}
                {p.available_mw !== undefined && p.available_mw < p.capacity_mw && (
                  <span style={{ color: '#ef4444', fontSize: 11, display: 'block' }}>({p.available_mw} avail)</span>
                )}
              </td>
              <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{p.storage_mwh.toLocaleString()}</td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{p.duration_hours}h</td>
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
                {new Date(p.cod).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: '#0f172a', borderTop: '2px solid #334155' }}>
            <td style={{ ...tdStyle, fontWeight: 700 }}>Total ({projects.length})</td>
            <td style={tdStyle} />
            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {projects.reduce((s, p) => s + p.capacity_mw, 0).toLocaleString()}
            </td>
            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {projects.reduce((s, p) => s + p.storage_mwh, 0).toLocaleString()}
            </td>
            <td style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8', fontSize: 11 }}>
              {(() => { const totalMW = projects.reduce((s, p) => s + p.capacity_mw, 0); const totalMWh = projects.reduce((s, p) => s + p.storage_mwh, 0); return totalMW > 0 ? `${(totalMWh / totalMW).toFixed(1)}h avg` : '—' })()}
            </td>
            <td style={tdStyle} />
            <td style={tdStyle} />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ============================================================
// Displacement Context
// ============================================================

function DisplacementSection({ data }: { data: BatteryWatchData['displacement_context'] }) {
  return (
    <div className="space-y-4">
      {/* Stat cards row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Evening Peak Share" value={`${data.battery_share_evening_peak_pct}%`} sub="NEM-wide batteries" colour="#10b981" />
        <StatCard label="SA Evening Share" value={`${data.battery_share_evening_peak_sa_pct}%`} sub="World record" colour="#f59e0b" />
        <StatCard label="Negative Price Intervals" value={`${data.negative_price_intervals_pct}%`} sub="Q2 2025 NEM dispatch" colour="#ef4444" />
        <StatCard label="Solar Curtailed (2025)" value={`${data.solar_curtailment_2025_twh} TWh`} sub="Could be absorbed by batteries" colour="#f59e0b" />
        <StatCard label="Total Curtailed (2025)" value={`${data.total_curtailment_2025_twh} TWh`} sub="Solar + wind" colour="#ef4444" />
      </div>

      {/* NSW displacement context bar */}
      <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
        <h4 className="text-sm font-semibold mb-3" style={{ color: '#f1f5f9' }}>NSW Generation Context</h4>
        <div className="space-y-3">
          {[
            { label: 'Coal generation (avg)', mw: data.nsw_coal_generation_avg_mw, colour: '#6b7280', max: 6000 },
            { label: 'Gas generation (avg)', mw: data.nsw_gas_generation_avg_mw, colour: '#ef4444', max: 6000 },
            { label: 'BESS operating (NSW)', mw: 1940, colour: '#10b981', max: 6000 },
            { label: 'BESS by end 2027 (NSW)', mw: 4263, colour: '#3b82f6', max: 6000 },
          ].map(item => (
            <div key={item.label}>
              <div className="flex justify-between mb-1">
                <span className="text-xs" style={{ color: '#94a3b8' }}>{item.label}</span>
                <span className="text-xs font-mono" style={{ color: '#f1f5f9' }}>{formatMW(item.mw)}</span>
              </div>
              <div className="rounded-full h-3" style={{ background: '#0f172a' }}>
                <div className="rounded-full h-3 transition-all" style={{ width: `${Math.min(100, (item.mw / item.max) * 100)}%`, background: item.colour }} />
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs mt-3" style={{ color: '#94a3b8' }}>
          By end 2027, NSW BESS capacity ({formatMW(4263)}) will approach average coal generation ({formatMW(data.nsw_coal_generation_avg_mw)}) and far exceed gas ({formatMW(data.nsw_gas_generation_avg_mw)}).
        </p>
      </div>

      {/* Insights */}
      <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
        <h4 className="text-sm font-semibold mb-3" style={{ color: '#f1f5f9' }}>Key Insights</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {data.insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-2 text-xs" style={{ color: '#cbd5e1' }}>
              <span style={{ color: '#10b981', flexShrink: 0 }}>&#9679;</span>
              <span>{insight}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Key Questions
// ============================================================

function AnalysisSection({ questions, sources }: { questions: BatteryWatchData['displacement_context']['key_questions']; sources: BatteryWatchData['sources'] }) {
  const [expanded, setExpanded] = useState<number | null>(null)

  return (
    <div className="space-y-4">
      {questions.map((q, i) => (
        <div key={i} className="rounded-lg overflow-hidden" style={{ background: '#1e293b', border: '1px solid #334155' }}>
          <button
            className="w-full text-left p-4 flex items-center justify-between"
            style={{ color: '#f1f5f9' }}
            onClick={() => setExpanded(expanded === i ? null : i)}
          >
            <span className="font-semibold text-sm">{q.question}</span>
            <svg className={`w-4 h-4 transition-transform ${expanded === i ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" style={{ color: '#94a3b8', flexShrink: 0 }}>
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          {expanded === i && (
            <div className="px-4 pb-4 text-sm leading-relaxed" style={{ color: '#cbd5e1', borderTop: '1px solid #334155', paddingTop: 12 }}>
              {q.answer}
            </div>
          )}
        </div>
      ))}

      {/* Sources */}
      <div className="rounded-lg p-4" style={{ background: '#0f172a', border: '1px solid #334155' }}>
        <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>Sources</h4>
        <div className="flex flex-wrap gap-3">
          {sources.map(s => (
            <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer"
              className="text-xs px-2 py-1 rounded hover:opacity-80 transition-opacity"
              style={{ background: '#1e293b', color: '#3b82f6', border: '1px solid #334155' }}>
              {s.name} ↗
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Main Component
// ============================================================

export default function BatteryWatch() {
  const [data, setData] = useState<BatteryWatchData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<SectionId>('nsw-timeline')

  useEffect(() => {
    fetchBatteryWatch().then(d => { setData(d); setLoading(false) })
  }, [])

  const operatingProjects = useMemo(() =>
    data?.nsw_focus.projects.filter(p => p.status === 'operating') ?? [], [data])

  const pipelineProjects = useMemo(() =>
    data?.nsw_focus.projects.filter(p => p.status !== 'operating') ?? [], [data])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#10b981' }} />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rounded-lg p-8 text-center" style={{ background: '#1e293b', border: '1px solid #334155' }}>
        <p style={{ color: '#94a3b8' }}>Battery Watch data not available.</p>
      </div>
    )
  }

  const SECTIONS: { id: SectionId; label: string }[] = [
    { id: 'nsw-timeline', label: 'NSW Timeline' },
    { id: 'nsw-projects', label: 'NSW Projects' },
    ...(data.qld_focus ? [
      { id: 'qld-timeline' as SectionId, label: 'QLD Timeline' },
      { id: 'qld-projects' as SectionId, label: 'QLD Projects' },
    ] : []),
    ...(data.vic_focus ? [
      { id: 'vic-timeline' as SectionId, label: 'VIC Timeline' },
      { id: 'vic-projects' as SectionId, label: 'VIC Projects' },
    ] : []),
    ...(data.sa_focus ? [
      { id: 'sa-timeline' as SectionId, label: 'SA Timeline' },
      { id: 'sa-projects' as SectionId, label: 'SA Projects' },
    ] : []),
    { id: 'nem-pipeline', label: 'NEM Pipeline' },
    { id: 'displacement', label: 'Displacement' },
    { id: 'analysis', label: 'Analysis' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg p-5" style={{ background: 'linear-gradient(135deg, #064e3b 0%, #1e293b 100%)', border: '1px solid #334155' }}>
        <div className="flex items-center gap-3 mb-2">
          <svg className="w-6 h-6" viewBox="0 0 20 20" fill="#10b981">
            <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.381z" />
          </svg>
          <h2 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>Battery Watch</h2>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#10b98130', color: '#10b981' }}>
            Updated {data.generated_at}
          </span>
        </div>
        <p className="text-sm" style={{ color: '#94a3b8' }}>
          Tracking the battery storage revolution across the NEM. NSW is adding {formatMW(data.nsw_focus.total_construction_mw)} of new
          battery capacity, transforming the grid from coal-dependent to storage-backed renewables.
        </p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="NSW Operating" value={formatMW(data.nsw_focus.total_operating_mw)} sub={formatMWh(data.nsw_focus.total_operating_mwh)} colour="#10b981" />
        <StatCard label="NSW Construction" value={formatMW(data.nsw_focus.total_construction_mw)} sub={formatMWh(data.nsw_focus.total_construction_mwh)} colour="#3b82f6" />
        <StatCard label="NEM Operating" value={formatMW(data.nem_wide.operating.total_mw)} sub={`${data.nem_wide.operating.total_mw > 0 ? Object.keys(data.nem_wide.operating.by_state).filter(s => (data.nem_wide.operating.by_state[s]?.mw ?? 0) > 0).length : 0} states`} colour="#f59e0b" />
        <StatCard label="NEM Pipeline" value={formatMW(data.nem_wide.construction.total_mw)} sub="Under construction" colour="#8b5cf6" />
      </div>

      {/* Section navigation */}
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: activeSection === s.id ? '#10b98120' : '#1e293b',
              color: activeSection === s.id ? '#10b981' : '#94a3b8',
              border: `1px solid ${activeSection === s.id ? '#10b98140' : '#334155'}`,
            }}
          >
            <SectionIcon section={s.id} />
            {s.label}
          </button>
        ))}
      </div>

      {/* Active section content */}
      {activeSection === 'nsw-timeline' && (
        <div className="space-y-4">
          <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <h3 className="text-sm font-semibold mb-1" style={{ color: '#f1f5f9' }}>NSW Battery Capacity Timeline</h3>
            <p className="text-xs mb-4" style={{ color: '#94a3b8' }}>
              Cumulative operating battery capacity in NSW from first utility-scale deployment to projected 4.3 GW by end 2027.
              Red dots indicate setback events.
            </p>
            <NSWTimelineChart milestones={data.nsw_focus.timeline_milestones} />
          </div>

          <StateBuildoutChart projects={data.nsw_focus.projects} stateName="NSW" />

          {/* Timeline events list */}
          <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: '#f1f5f9' }}>Milestone Events</h3>
            <div className="relative ml-3">
              <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: '#334155' }} />
              {data.nsw_focus.timeline_milestones.map((m, i) => {
                const isPast = new Date(m.date) <= new Date()
                const isSetback = m.event === 'setback'
                return (
                  <div key={i} className="relative pl-6 pb-4">
                    <div className="absolute left-0 top-1 w-2.5 h-2.5 rounded-full -translate-x-1" style={{
                      background: isSetback ? '#ef4444' : isPast ? '#10b981' : '#3b82f6',
                      border: '2px solid #1e293b',
                    }} />
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-mono" style={{ color: isPast ? '#10b981' : '#3b82f6', minWidth: 80 }}>
                        {new Date(m.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="text-xs" style={{ color: isSetback ? '#ef4444' : '#cbd5e1' }}>{m.label}</span>
                      <span className="text-xs font-mono" style={{ color: '#94a3b8' }}>{formatMW(m.cumulative_mw)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {activeSection === 'nsw-projects' && (
        <div className="space-y-4">
          {/* Operating */}
          <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} />
              <h3 className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>Operating ({operatingProjects.length} projects, {formatMW(data.nsw_focus.total_operating_mw)})</h3>
            </div>
            <ProjectTable projects={operatingProjects} />
          </div>

          {/* Pipeline */}
          <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full" style={{ background: '#3b82f6' }} />
              <h3 className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>Pipeline ({pipelineProjects.length} projects, {formatMW(data.nsw_focus.total_construction_mw)})</h3>
            </div>
            <ProjectTable projects={pipelineProjects} />
          </div>

          {/* Project detail cards for major projects */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.nsw_focus.projects.filter(p => p.note).map(p => (
              <div key={p.id} className="rounded-lg p-4" style={{ background: '#0f172a', border: '1px solid #334155' }}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>{p.name}</h4>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{
                    background: `${STATUS_COLOURS[p.status] ?? '#636e72'}20`,
                    color: STATUS_COLOURS[p.status] ?? '#636e72',
                  }}>{statusLabel(p.status)}</span>
                </div>
                <div className="flex gap-4 mb-2 text-xs" style={{ color: '#94a3b8' }}>
                  <span>{p.developer}</span>
                  <span>{formatMW(p.capacity_mw)} / {formatMWh(p.storage_mwh)}</span>
                  <span>{p.duration_hours}h</span>
                </div>
                <p className="text-xs" style={{ color: '#cbd5e1' }}>{p.note}</p>
                {p.phases && (
                  <div className="mt-2 space-y-1">
                    {p.phases.map(ph => (
                      <div key={ph.label} className="flex items-center gap-2 text-xs">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLOURS[ph.status] ?? '#636e72' }} />
                        <span style={{ color: '#94a3b8' }}>{ph.label}: {ph.mw} MW — {ph.date}</span>
                        <span style={{ color: STATUS_COLOURS[ph.status] ?? '#636e72' }}>{statusLabel(ph.status)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QLD Timeline */}
      {activeSection === 'qld-timeline' && data.qld_focus && (
        <div className="space-y-4">
          {/* QLD stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="QLD Operating" value={formatMW(data.qld_focus.total_operating_mw)} sub={formatMWh(data.qld_focus.total_operating_mwh)} colour="#f59e0b" />
            <StatCard label="QLD Construction" value={formatMW(data.qld_focus.total_construction_mw)} sub={formatMWh(data.qld_focus.total_construction_mwh)} colour="#3b82f6" />
            {data.qld_focus.demand_context && (
              <>
                <StatCard label="QLD Max Demand" value={formatMW(data.qld_focus.demand_context.max_demand_mw)} sub={`BESS = ${data.qld_focus.demand_context.bess_pct_max.toFixed(1)}% of peak`} colour="#ef4444" />
                <StatCard label="QLD Avg Demand" value={formatMW(data.qld_focus.demand_context.avg_demand_mw)} colour="#94a3b8" />
              </>
            )}
          </div>

          {/* Demand context by season */}
          {data.qld_focus.demand_context?.seasonal && (
            <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#f1f5f9' }}>QLD Demand by Season</h3>
              <p className="text-xs mb-3" style={{ color: '#94a3b8' }}>
                BESS capacity ({formatMW(data.qld_focus.total_operating_mw)} operating) relative to seasonal demand
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {data.qld_focus.demand_context.seasonal.map(s => (
                  <div key={s.season} className="rounded-lg p-3" style={{ background: '#0f172a', border: '1px solid #334155' }}>
                    <div className="text-xs uppercase tracking-wider mb-1" style={{ color: '#94a3b8' }}>{s.season}</div>
                    <div className="text-sm font-bold" style={{ color: '#f1f5f9' }}>Max: {formatMW(s.max_demand_mw)}</div>
                    <div className="text-xs" style={{ color: '#94a3b8' }}>Avg: {formatMW(s.avg_demand_mw)}</div>
                    <div className="text-xs mt-1" style={{ color: '#f59e0b' }}>
                      BESS: {((data.qld_focus!.total_operating_mw / s.max_demand_mw) * 100).toFixed(1)}% of peak
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <StateBuildoutChart projects={data.qld_focus.projects} stateName="QLD" />

          {/* QLD timeline milestones */}
          {data.qld_focus.timeline_milestones.length > 0 && (
            <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#f1f5f9' }}>QLD Battery Milestones</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {data.qld_focus.timeline_milestones.slice().reverse().map((m, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className="text-xs font-mono flex-shrink-0" style={{ color: '#94a3b8', minWidth: 80 }}>{m.date}</span>
                    <span style={{ color: '#f1f5f9' }}>{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* QLD Projects */}
      {activeSection === 'qld-projects' && data.qld_focus && (() => {
        const qldOp = data.qld_focus!.projects.filter(p => p.status === 'operating')
        const qldCon = data.qld_focus!.projects.filter(p => p.status === 'construction' || p.status === 'commissioning')
        const qldDev = data.qld_focus!.projects.filter(p => p.status === 'development').slice(0, 20)
        const qldDevTotal = data.qld_focus!.projects.filter(p => p.status === 'development').length
        return (
          <div className="space-y-4">
            {qldOp.length > 0 && (
              <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} />
                  <h3 className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>Operating ({qldOp.length} projects, {formatMW(data.qld_focus!.total_operating_mw)})</h3>
                </div>
                <ProjectTable projects={qldOp} />
              </div>
            )}
            {qldCon.length > 0 && (
              <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full" style={{ background: '#3b82f6' }} />
                  <h3 className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>Construction & Commissioning ({qldCon.length} projects, {formatMW(data.qld_focus!.total_construction_mw)})</h3>
                </div>
                <ProjectTable projects={qldCon} />
              </div>
            )}
            <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full" style={{ background: '#8b5cf6' }} />
                <h3 className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>Development Pipeline (Top 20 of {qldDevTotal})</h3>
              </div>
              <ProjectTable projects={qldDev} />
            </div>
          </div>
        )
      })()}

      {/* VIC Timeline */}
      {activeSection === 'vic-timeline' && data.vic_focus && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="VIC Operating" value={formatMW(data.vic_focus.total_operating_mw)} sub={formatMWh(data.vic_focus.total_operating_mwh)} colour="#8b5cf6" />
            <StatCard label="VIC Construction" value={formatMW(data.vic_focus.total_construction_mw)} sub={formatMWh(data.vic_focus.total_construction_mwh)} colour="#3b82f6" />
          </div>
          <StateBuildoutChart projects={data.vic_focus.projects} stateName="VIC" />
          {data.vic_focus.timeline_milestones.length > 0 && (
            <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#f1f5f9' }}>VIC Battery Milestones</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {data.vic_focus.timeline_milestones.slice().reverse().map((m, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className="text-xs font-mono flex-shrink-0" style={{ color: '#94a3b8', minWidth: 80 }}>{m.date}</span>
                    <span style={{ color: '#f1f5f9' }}>{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIC Projects */}
      {activeSection === 'vic-projects' && data.vic_focus && (() => {
        const vicOp = data.vic_focus!.projects.filter(p => p.status === 'operating')
        const vicCon = data.vic_focus!.projects.filter(p => p.status === 'construction' || p.status === 'commissioning')
        const vicDev = data.vic_focus!.projects.filter(p => p.status === 'development').slice(0, 20)
        const vicDevTotal = data.vic_focus!.projects.filter(p => p.status === 'development').length
        return (
          <div className="space-y-4">
            {vicOp.length > 0 && (
              <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} />
                  <h3 className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>Operating ({vicOp.length} projects, {formatMW(data.vic_focus!.total_operating_mw)})</h3>
                </div>
                <ProjectTable projects={vicOp} />
              </div>
            )}
            {vicCon.length > 0 && (
              <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full" style={{ background: '#3b82f6' }} />
                  <h3 className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>Construction & Commissioning ({vicCon.length} projects, {formatMW(data.vic_focus!.total_construction_mw)})</h3>
                </div>
                <ProjectTable projects={vicCon} />
              </div>
            )}
            <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full" style={{ background: '#8b5cf6' }} />
                <h3 className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>Development Pipeline (Top 20 of {vicDevTotal})</h3>
              </div>
              <ProjectTable projects={vicDev} />
            </div>
          </div>
        )
      })()}

      {/* SA Timeline */}
      {activeSection === 'sa-timeline' && data.sa_focus && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="SA Operating" value={formatMW(data.sa_focus.total_operating_mw)} sub={formatMWh(data.sa_focus.total_operating_mwh)} colour="#10b981" />
            <StatCard label="SA Construction" value={formatMW(data.sa_focus.total_construction_mw)} sub={formatMWh(data.sa_focus.total_construction_mwh)} colour="#3b82f6" />
          </div>
          <StateBuildoutChart projects={data.sa_focus.projects} stateName="SA" />
          {data.sa_focus.timeline_milestones.length > 0 && (
            <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#f1f5f9' }}>SA Battery Milestones</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {data.sa_focus.timeline_milestones.slice().reverse().map((m, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className="text-xs font-mono flex-shrink-0" style={{ color: '#94a3b8', minWidth: 80 }}>{m.date}</span>
                    <span style={{ color: '#f1f5f9' }}>{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SA Projects */}
      {activeSection === 'sa-projects' && data.sa_focus && (() => {
        const saOp = data.sa_focus!.projects.filter(p => p.status === 'operating')
        const saCon = data.sa_focus!.projects.filter(p => p.status === 'construction' || p.status === 'commissioning')
        const saDev = data.sa_focus!.projects.filter(p => p.status === 'development').slice(0, 20)
        const saDevTotal = data.sa_focus!.projects.filter(p => p.status === 'development').length
        return (
          <div className="space-y-4">
            {saOp.length > 0 && (
              <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} />
                  <h3 className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>Operating ({saOp.length} projects, {formatMW(data.sa_focus!.total_operating_mw)})</h3>
                </div>
                <ProjectTable projects={saOp} />
              </div>
            )}
            {saCon.length > 0 && (
              <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full" style={{ background: '#3b82f6' }} />
                  <h3 className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>Construction & Commissioning ({saCon.length} projects, {formatMW(data.sa_focus!.total_construction_mw)})</h3>
                </div>
                <ProjectTable projects={saCon} />
              </div>
            )}
            <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full" style={{ background: '#8b5cf6' }} />
                <h3 className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>Development Pipeline (Top 20 of {saDevTotal})</h3>
              </div>
              <ProjectTable projects={saDev} />
            </div>
          </div>
        )
      })()}

      {activeSection === 'nem-pipeline' && (
        <div className="space-y-4">
          {/* NEM projection */}
          <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <h3 className="text-sm font-semibold mb-1" style={{ color: '#f1f5f9' }}>NEM Battery Capacity Trajectory</h3>
            <p className="text-xs mb-4" style={{ color: '#94a3b8' }}>
              Total NEM-wide battery storage capacity projected to reach {formatMW(12500)} by end 2027 — approaching the capacity of the remaining coal fleet.
            </p>
            <NEMProjectionChart projected={data.nem_wide.projected_capacity_mw} />
          </div>

          {/* State comparison */}
          <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <h3 className="text-sm font-semibold mb-1" style={{ color: '#f1f5f9' }}>BESS Capacity by State</h3>
            <p className="text-xs mb-4" style={{ color: '#94a3b8' }}>Operating capacity vs projects under construction across NEM states.</p>
            <StateComparisonChart data={data} />
            <div className="flex items-center justify-center gap-6 mt-2">
              <span className="flex items-center gap-1.5 text-xs" style={{ color: '#94a3b8' }}>
                <span className="w-3 h-3 rounded" style={{ background: '#10b981' }} /> Operating
              </span>
              <span className="flex items-center gap-1.5 text-xs" style={{ color: '#94a3b8' }}>
                <span className="w-3 h-3 rounded" style={{ background: '#3b82f6' }} /> Construction
              </span>
            </div>
          </div>

          {/* State detail cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(['NSW', 'VIC', 'QLD', 'SA'] as const).map(state => {
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
                    <div className="flex justify-between">
                      <span style={{ color: '#94a3b8' }}>Pipeline</span>
                      <span style={{ color: '#f1f5f9' }}>{con?.projects ?? 0}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {activeSection === 'displacement' && (
        <DisplacementSection data={data.displacement_context} />
      )}

      {activeSection === 'analysis' && (
        <AnalysisSection questions={data.displacement_context.key_questions} sources={data.sources} />
      )}
    </div>
  )
}
