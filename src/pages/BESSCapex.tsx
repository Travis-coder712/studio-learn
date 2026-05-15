import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, LineChart, Line, ReferenceLine,
} from 'recharts'
import { fetchBESSCapex } from '../lib/dataService'
import { exportElementToPdf } from '../lib/exportPdf'
import type { BESSCapexData, BESSCapexProject } from '../lib/types'
import DataProvenance from '../components/common/DataProvenance'

// ============================================================
// Icons — defined BEFORE const arrays per project pattern
// ============================================================

const ChartIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
    <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
  </svg>
)

const TableIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z" clipRule="evenodd" />
  </svg>
)

// ============================================================
// OEM colour map
// ============================================================

const OEM_COLOURS: Record<string, string> = {
  'Tesla': '#e74c3c',
  'Fluence': '#3498db',
  'Wartsila': '#2ecc71',
  'CATL': '#f39c12',
  'Canadian Solar e-STORAGE': '#9b59b6',
  'Powin': '#1abc9c',
  'Samsung SDI': '#e67e22',
  'Sungrow': '#e84393',
  'Hithium': '#00b894',
  'Doosan GridTech': '#6c5ce7',
  'Unknown': '#636e72',
}

const getOEMColour = (oem: string) => OEM_COLOURS[oem] || '#636e72'

// ============================================================
// View type
// ============================================================

type ViewMode = 'charts' | 'table'
type CostMetric = 'per_mw' | 'per_mwh'

export default function BESSCapex() {
  const [data, setData] = useState<BESSCapexData | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('charts')
  const [metric, setMetric] = useState<CostMetric>('per_mw')
  const [selectedOEMs, setSelectedOEMs] = useState<string[]>([])
  const [exporting, setExporting] = useState(false)
  const pdfRef = useRef<HTMLDivElement>(null)

  const handleExportPdf = useCallback(async () => {
    if (!pdfRef.current || exporting) return
    setExporting(true)
    try {
      await exportElementToPdf(pdfRef.current, {
        filename: 'BESS-Capex-Tomago-Benchmark',
        title: 'BESS Capex — Tomago Benchmark & Market Outlook',
        subtitle: `AURES Intelligence · ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      })
    } finally {
      setExporting(false)
    }
  }, [exporting])

  useEffect(() => {
    fetchBESSCapex().then(d => { setData(d); setLoading(false) })
  }, [])

  function toggleOEM(oem: string) {
    setSelectedOEMs(prev => prev.includes(oem) ? prev.filter(v => v !== oem) : [...prev, oem])
  }

  const filteredProjects = useMemo(() => {
    if (!data) return []
    let projects = data.projects
    if (selectedOEMs.length > 0) {
      projects = projects.filter(p => selectedOEMs.includes(p.bess_oem))
    }
    return projects
  }, [data, selectedOEMs])

  const navigate = useNavigate()

  const oems = useMemo(() => {
    if (!data) return []
    const uniqueOEMs = [...new Set(data.projects.map(p => p.bess_oem))].filter(Boolean)
    return uniqueOEMs.sort()
  }, [data])

  // Navigate to filtered project list
  const navigateToProjects = useCallback((ids: string[], title: string) => {
    const params = new URLSearchParams({
      ids: ids.join(','),
      title,
      from: 'intelligence/bess-capex',
      fromLabel: 'Back to BESS Capex',
    })
    navigate(`/projects?${params.toString()}`)
  }, [navigate])

  // Scatter data: x = capex_year, y = $/MW or $/MWh
  const scatterData = useMemo(() => {
    return filteredProjects.map(p => ({
      ...p,
      x: p.capex_year,
      y: metric === 'per_mw' ? p.capex_per_mw : p.capex_per_mwh,
      size: Math.max(Math.sqrt(p.capacity_mw) * 2, 8),
      colour: getOEMColour(p.bess_oem),
    })).filter(p => p.y != null && p.y > 0 && p.y < 10) // filter outliers
  }, [filteredProjects, metric])

  // Year trend bar data
  const yearBarData = useMemo(() => {
    if (!data) return []
    return Object.entries(data.by_year).map(([year, v]) => ({
      year,
      avg_per_mw: v.avg_capex_per_mw,
      avg_per_mwh: v.avg_capex_per_mwh,
      count: v.count,
      total_mw: v.total_mw,
    })).sort((a, b) => a.year.localeCompare(b.year))
  }, [data])

  // OEM comparison bar data
  const oemBarData = useMemo(() => {
    if (!data) return []
    return Object.entries(data.by_oem)
      .filter(([, v]) => v.count >= 1)
      .map(([oem, v]) => ({
        oem,
        avg_per_mw: v.avg_capex_per_mw,
        avg_per_mwh: v.avg_capex_per_mwh,
        count: v.count,
        total_mw: v.total_mw,
        colour: getOEMColour(oem),
      }))
      .sort((a, b) => (b.total_mw) - (a.total_mw))
  }, [data])

  // ── Timeline trend: individual projects over time with trend line ──
  const timelineData = useMemo(() => {
    if (!data) return []
    return data.projects
      .filter(p => p.capex_per_mwh != null && p.capex_per_mwh > 0 && p.capex_per_mwh < 5)
      .sort((a, b) => (a.capex_year || 0) - (b.capex_year || 0))
      .map(p => ({
        ...p,
        year: p.capex_year,
        per_mwh: p.capex_per_mwh,
        per_mw: p.capex_per_mw,
        label: p.name.replace(/ BESS| Battery| Energy Storage System| Grid Battery project| Battery project/g, ''),
        isTomago: p.id === 'tomago-bess',
      }))
  }, [data])

  // ── OEM cost evolution: per-OEM trend lines ──
  const oemTimelineData = useMemo(() => {
    if (!data) return { chartData: [], oems: [] as string[] }
    const oemProjects: Record<string, { year: number; per_mwh: number; name: string }[]> = {}
    for (const p of data.projects) {
      if (!p.bess_oem || !p.capex_per_mwh || p.capex_per_mwh >= 5) continue
      if (!oemProjects[p.bess_oem]) oemProjects[p.bess_oem] = []
      oemProjects[p.bess_oem].push({ year: p.capex_year, per_mwh: p.capex_per_mwh, name: p.name })
    }
    // Only include OEMs with 2+ projects
    const multiOems = Object.keys(oemProjects).filter(o => oemProjects[o].length >= 2).sort()
    // Build chart data: one point per year per OEM
    const allYears = [...new Set(data.projects.map(p => p.capex_year).filter(Boolean))].sort()
    const chartData = allYears.map(year => {
      const row: Record<string, number | string | null> = { year }
      for (const oem of multiOems) {
        const pts = oemProjects[oem].filter(p => p.year === year)
        row[oem] = pts.length > 0 ? Math.round(pts.reduce((s, p) => s + p.per_mwh, 0) / pts.length * 100) / 100 : null
      }
      return row
    })
    return { chartData, oems: multiOems }
  }, [data])

  // ── Tomago comparable projects ──
  const tomagoComparables = useMemo(() => {
    if (!data) return null
    const tomago = data.projects.find(p => p.id === 'tomago-bess')
    if (!tomago) return null
    // Find comparable: 4hr duration OR >= 400 MW OR same OEM (Fluence)
    const comparables = data.projects
      .filter(p => p.id !== 'tomago-bess' && p.capex_per_mwh && p.capex_per_mwh > 0 && p.capex_per_mwh < 5)
      .map(p => {
        const perMwh = p.capex_per_mwh!
        const tomagoPerMwh = tomago.capex_per_mwh!
        const premiumPct = ((perMwh - tomagoPerMwh) / tomagoPerMwh) * 100
        const normMwh = 2000 // 500MW * 4hr
        const normPremiumAbs = (perMwh - tomagoPerMwh) * normMwh
        // Comparability score: higher = more comparable
        let score = 0
        if (p.duration_hours && p.duration_hours >= 3.5) score += 3 // same duration class
        if (p.capacity_mw >= 300) score += 2 // similar scale
        if (p.bess_oem === 'Fluence') score += 1 // same OEM
        if (p.capex_year && p.capex_year >= 2023) score += 1 // recent
        return {
          ...p,
          premiumPct: Math.round(premiumPct * 10) / 10,
          normPremiumAbsM: Math.round(normPremiumAbs),
          comparabilityScore: score,
          label: p.name.replace(/ BESS| Battery| Energy Storage System/g, ''),
        }
      })
      .filter(p => p.comparabilityScore >= 2) // at least somewhat comparable
      .sort((a, b) => b.comparabilityScore - a.comparabilityScore || b.premiumPct - a.premiumPct)

    return { tomago, comparables }
  }, [data])

  // Pre-compute key insight numbers from actual data
  const keyInsights = useMemo(() => {
    if (!data) return null
    const ps = data.projects
    const byYear = data.by_year as Record<string, { count: number; total_mw: number; avg_capex_per_mwh: number | null; avg_capex_per_mw: number | null }>

    // OEM-specific project trajectories
    const oemProjects = (oem: string) =>
      ps.filter(p => p.bess_oem === oem).sort((a, b) => (a.capex_year || 0) - (b.capex_year || 0))

    const tesla = oemProjects('Tesla')
    const fluence = oemProjects('Fluence')
    const wartsila = oemProjects('Wartsila')

    const earliest = (arr: BESSCapexProject[]) => arr[0]
    const latest = (arr: BESSCapexProject[]) => arr[arr.length - 1]
    const pctDrop = (from: number, to: number) => Math.round(((from - to) / from) * 100)

    // Duration analysis
    const oneHr = ps.filter(p => (p.duration_hours || 0) <= 1.5)
    const twoHr = ps.filter(p => (p.duration_hours || 0) > 1.5 && (p.duration_hours || 0) <= 2.5)
    const fourHr = ps.filter(p => (p.duration_hours || 0) >= 3.5)
    const avgMwh = (arr: BESSCapexProject[]) => {
      const vals = arr.filter(p => p.capex_per_mwh).map(p => p.capex_per_mwh!)
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
    }

    const tomago = ps.find(p => p.id === 'tomago-bess')
    // 4hr projects excluding Tomago, for comparison
    const fourHrOthers = fourHr.filter(p => p.id !== 'tomago-bess')

    return {
      byYear,
      tesla, fluence, wartsila,
      earliest, latest, pctDrop,
      oneHr, twoHr, fourHr, avgMwh,
      tomago, fourHrOthers,
    }
  }, [data])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  if (!data) {
    return <div className="p-6 text-center text-[var(--color-text-muted)]">No capex data available</div>
  }

  const metricLabel = metric === 'per_mw' ? 'A$/MW (M)' : 'A$/MWh (M)'
  const metricKey = metric === 'per_mw' ? 'avg_per_mw' : 'avg_per_mwh'

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">BESS Capex Analytics</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Capital cost trends for{' '}
          <button
            onClick={() => navigateToProjects(data.projects.map(p => p.id), 'BESS with Capex Data')}
            className="text-blue-400 hover:text-blue-300 underline"
          >
            {data.projects.length} grid-scale batteries
          </button>
          {' '}in operation, construction & commissioning
        </p>
        <div className="mt-3">
          <DataProvenance page="bess-capex" />
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* View toggle */}
        <div className="flex rounded-lg overflow-hidden border border-[var(--color-border)]">
          <button
            onClick={() => setView('charts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${view === 'charts' ? 'bg-blue-600 text-white' : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)]'}`}
          >
            <ChartIcon /> Charts
          </button>
          <button
            onClick={() => setView('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${view === 'table' ? 'bg-blue-600 text-white' : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)]'}`}
          >
            <TableIcon /> Table
          </button>
        </div>

        {/* Metric toggle */}
        <div className="flex rounded-lg overflow-hidden border border-[var(--color-border)]">
          <button
            onClick={() => setMetric('per_mw')}
            className={`px-3 py-1.5 text-sm ${metric === 'per_mw' ? 'bg-blue-600 text-white' : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)]'}`}
          >
            $/MW
          </button>
          <button
            onClick={() => setMetric('per_mwh')}
            className={`px-3 py-1.5 text-sm ${metric === 'per_mwh' ? 'bg-blue-600 text-white' : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)]'}`}
          >
            $/MWh
          </button>
        </div>

      </div>

      {/* OEM multi-select chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] w-12">
          OEM
        </span>
        {oems.map(oem => {
          const isActive = selectedOEMs.includes(oem)
          const colour = getOEMColour(oem)
          return (
            <button
              key={oem}
              onClick={() => toggleOEM(oem)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                isActive
                  ? 'border-transparent font-medium'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
              }`}
              style={
                isActive
                  ? { backgroundColor: `${colour}20`, color: colour }
                  : undefined
              }
            >
              {oem}
            </button>
          )
        })}
        {selectedOEMs.length > 0 && (
          <button
            onClick={() => setSelectedOEMs([])}
            className="text-xs text-[var(--color-primary)] hover:underline ml-1"
          >
            Clear ×
          </button>
        )}
      </div>

      {view === 'charts' ? (
        <div className="space-y-6">
          {/* Scatter: Cost over time */}
          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">
              Cost per {metric === 'per_mw' ? 'MW' : 'MWh'} Over Time
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] mb-4">
              Bubble size = project capacity. Colour = OEM. Year = FID/announcement year.
            </p>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="x" type="number" name="Year"
                  domain={[2016, 2026]} tickCount={11}
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                  label={{ value: 'FID / Announcement Year', position: 'insideBottom', offset: -10, fill: 'var(--color-text-muted)', fontSize: 12 }}
                />
                <YAxis
                  dataKey="y" type="number" name={metricLabel}
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                  label={{ value: `${metricLabel}`, angle: -90, position: 'insideLeft', fill: 'var(--color-text-muted)', fontSize: 12 }}
                />
                <Tooltip
                  content={({ payload }) => {
                    if (!payload?.length) return null
                    const p = payload[0].payload as BESSCapexProject & { y: number }
                    return (
                      <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-3 shadow-lg text-sm max-w-xs">
                        <div className="font-semibold text-[var(--color-text)]">{p.name}</div>
                        <div className="text-[var(--color-text-muted)]">{p.bess_oem} — {p.bess_model}</div>
                        <div className="text-[var(--color-text-muted)]">{p.capacity_mw} MW / {p.storage_mwh} MWh ({p.duration_hours}h)</div>
                        <div className="text-[var(--color-text-muted)]">Capex: A${p.capex_aud_m}M</div>
                        <div className="font-medium text-blue-400">${p.capex_per_mw}M/MW &middot; ${p.capex_per_mwh}M/MWh</div>
                        <div className="text-xs text-[var(--color-text-muted)]">{p.current_developer} &middot; {p.state} &middot; {p.status}</div>
                        {p.capex_source && <div className="text-xs text-[var(--color-text-muted)] italic mt-1">Source: {p.capex_source}</div>}
                        {p.stages && p.stages.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-[var(--color-border)]">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Stages</div>
                            {p.stages.map((s, i) => (
                              <div key={i} className="text-xs text-[var(--color-text-muted)]">
                                {s.name}: {s.capacity_mw}MW/{s.storage_mwh}MWh — {s.status}
                                {s.capex_aud_m ? ` ($${s.capex_aud_m}M)` : ''}
                              </div>
                            ))}
                            {p.capex_scope_note && (
                              <div className="text-[10px] text-amber-400 mt-1 italic">{p.capex_scope_note}</div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  }}
                />
                <Scatter
                  data={scatterData}
                  onClick={(data: any) => {
                    if (data?.id) navigate(`/projects/${data.id}?from=intelligence/bess-capex&fromLabel=Back to BESS Capex`)
                  }}
                  cursor="pointer"
                  shape={
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ((props: any) => {
                      const { cx, cy, payload } = props
                      return (
                        <circle
                          cx={cx} cy={cy}
                          r={payload.size}
                          fill={payload.colour}
                          fillOpacity={0.7}
                          stroke={payload.colour}
                          strokeWidth={1}
                          className="hover:fill-opacity-100 transition-opacity"
                        />
                      )
                    }) as any
                  }
                />
              </ScatterChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-3 justify-center">
              {Object.entries(OEM_COLOURS).filter(([oem]) =>
                data.projects.some(p => p.bess_oem === oem)
              ).map(([oem, colour]) => (
                <button
                  key={oem}
                  onClick={() => toggleOEM(oem)}
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${selectedOEMs.includes(oem) ? 'border-blue-500 bg-blue-500/20' : 'border-[var(--color-border)]'}`}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colour }} />
                  <span className="text-[var(--color-text-muted)]">{oem}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Two column: Year trend + OEM comparison */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Year trend */}
            <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
              <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">
                Average Cost by Year
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mb-4">
                {metric === 'per_mw' ? 'A$M per MW' : 'A$M per MWh'} — averaged across projects with that FID year
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={yearBarData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                    labelStyle={{ color: 'var(--color-text)' }}
                    formatter={(value) => [`$${Number(value)?.toFixed(2)}M`, metricLabel]}
                    labelFormatter={(label) => {
                      const yr = yearBarData.find(y => y.year === label)
                      return `${label} (${yr?.count} projects, ${yr?.total_mw?.toLocaleString()} MW)`
                    }}
                  />
                  <Bar
                    dataKey={metricKey} fill="#3b82f6" radius={[4, 4, 0, 0]}
                    cursor="pointer"
                    onClick={(data: any) => {
                      if (!data?.year) return
                      const yearProjects = filteredProjects.filter(p => String(p.capex_year) === String(data.year))
                      navigateToProjects(yearProjects.map(p => p.id), `BESS Capex — FID Year ${data.year}`)
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* OEM comparison */}
            <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
              <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">
                Average Cost by OEM
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mb-4">
                {metric === 'per_mw' ? 'A$M per MW' : 'A$M per MWh'} — averaged across each OEM's projects
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={oemBarData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
                  <YAxis type="category" dataKey="oem" width={120} tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                    labelStyle={{ color: 'var(--color-text)' }}
                    formatter={(value) => [`$${Number(value)?.toFixed(2)}M`, metricLabel]}
                    labelFormatter={(label) => {
                      const o = oemBarData.find(x => x.oem === label)
                      return `${label} (${o?.count} projects, ${o?.total_mw?.toLocaleString()} MW)`
                    }}
                  />
                  <Bar
                    dataKey={metricKey} radius={[0, 4, 4, 0]}
                    cursor="pointer"
                    onClick={(data: any) => {
                      if (!data?.oem) return
                      const oemProjects = filteredProjects.filter(p => p.bess_oem === data.oem)
                      navigateToProjects(oemProjects.map(p => p.id), `BESS Capex — ${data.oem}`)
                    }}
                  >
                    {oemBarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.colour} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ═══════════════════════════════════════════ */}
          {/* (1) Cost Timeline — $/MWh declining over time */}
          {/* ═══════════════════════════════════════════ */}
          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">
              BESS Cost Timeline — $/MWh Declining Over Time
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] mb-4">
              Each bar represents one project, ordered by FID/announcement year. The green dashed line shows the year average.
              Tomago BESS (2025) sets a new NEM low at $0.40M/MWh.
            </p>
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={timelineData} margin={{ top: 10, right: 10, bottom: 80, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 9 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                />
                <YAxis
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                  label={{ value: 'A$M / MWh', angle: -90, position: 'insideLeft', fill: 'var(--color-text-muted)', fontSize: 11 }}
                  domain={[0, 'auto']}
                />
                <Tooltip
                  content={({ payload }) => {
                    if (!payload?.length) return null
                    const p = payload[0].payload
                    return (
                      <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-3 shadow-lg text-sm max-w-xs">
                        <div className="font-semibold text-[var(--color-text)]">{p.name}</div>
                        <div className="text-[var(--color-text-muted)]">{p.bess_oem} — {p.capacity_mw} MW / {p.storage_mwh} MWh ({p.duration_hours}h)</div>
                        <div className="text-[var(--color-text-muted)]">Capex: A${p.capex_aud_m}M</div>
                        <div className="font-medium text-blue-400">${p.per_mwh?.toFixed(2)}M/MWh &middot; ${p.per_mw?.toFixed(2)}M/MW</div>
                        <div className="text-xs text-[var(--color-text-muted)]">{p.current_developer} &middot; {p.state} &middot; FID {p.year}</div>
                        {p.stages && p.stages.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-[var(--color-border)]">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Stages</div>
                            {p.stages.map((s: any, i: number) => (
                              <div key={i} className="text-xs text-[var(--color-text-muted)]">
                                {s.name}: {s.capacity_mw}MW/{s.storage_mwh}MWh — {s.status}
                                {s.capex_aud_m ? ` ($${s.capex_aud_m}M)` : ''}
                              </div>
                            ))}
                            {p.capex_scope_note && (
                              <div className="text-[10px] text-amber-400 mt-1 italic">{p.capex_scope_note}</div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  }}
                />
                <Bar
                  dataKey="per_mwh"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={24}
                  cursor="pointer"
                  onClick={(d: any) => { if (d?.id) navigate(`/projects/${d.id}?from=intelligence/bess-capex&fromLabel=Back to BESS Capex`) }}
                >
                  {timelineData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.isTomago ? '#10b981' : getOEMColour(entry.bess_oem)}
                      fillOpacity={entry.isTomago ? 1 : 0.7}
                      stroke={entry.isTomago ? '#10b981' : undefined}
                      strokeWidth={entry.isTomago ? 2 : 0}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* Year average trend annotation */}
            <div className="flex flex-wrap gap-3 mt-2 justify-center text-xs">
              {Object.entries(data.by_year).sort(([a], [b]) => a.localeCompare(b)).map(([year, v]) => (
                <div key={year} className="flex items-center gap-1">
                  <span className="text-[var(--color-text-muted)]">{year}:</span>
                  <span className="font-mono text-[var(--color-text)]">${v.avg_capex_per_mwh?.toFixed(2)}M/MWh</span>
                  <span className="text-[var(--color-text-muted)]">({v.count})</span>
                </div>
              ))}
            </div>
          </div>

          {/* ═══════════════════════════════════════════ */}
          {/* (2) OEM Cost Evolution — per-OEM trend lines */}
          {/* ═══════════════════════════════════════════ */}
          {oemTimelineData.oems.length > 0 && (
            <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
              <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">
                OEM Cost Evolution — $/MWh by Supplier Over Time
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mb-4">
                How each OEM's average project cost has changed across announcement years. Only OEMs with 2+ projects shown.
                Fluence's latest (Tomago, 2025) represents a 62% drop from their 2017 entry (Ballarat).
              </p>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={oemTimelineData.chartData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                  <YAxis
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                    label={{ value: 'A$M / MWh', angle: -90, position: 'insideLeft', fill: 'var(--color-text-muted)', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                    labelStyle={{ color: 'var(--color-text)' }}
                    formatter={(value, name) => [value != null ? `$${Number(value).toFixed(2)}M/MWh` : '—', name]}
                  />
                  {oemTimelineData.oems.map(oem => (
                    <Line
                      key={oem}
                      type="monotone"
                      dataKey={oem}
                      stroke={getOEMColour(oem)}
                      strokeWidth={2}
                      dot={{ fill: getOEMColour(oem), r: 5 }}
                      connectNulls
                      activeDot={{ r: 7, strokeWidth: 2 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 mt-3 justify-center">
                {oemTimelineData.oems.map(oem => (
                  <div key={oem} className="flex items-center gap-1.5 text-xs">
                    <span className="w-3 h-1 rounded" style={{ backgroundColor: getOEMColour(oem) }} />
                    <span className="text-[var(--color-text-muted)]">{oem}</span>
                  </div>
                ))}
              </div>

              {/* OEM reduction summary table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="text-left p-2 text-[var(--color-text-muted)]">OEM</th>
                      <th className="text-right p-2 text-[var(--color-text-muted)]">Projects</th>
                      <th className="text-right p-2 text-[var(--color-text-muted)]">Total MW</th>
                      <th className="text-right p-2 text-[var(--color-text-muted)]">First $/MWh</th>
                      <th className="text-right p-2 text-[var(--color-text-muted)]">Latest $/MWh</th>
                      <th className="text-right p-2 text-[var(--color-text-muted)]">Reduction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {oemTimelineData.oems.map(oem => {
                      const pts = data.projects
                        .filter(p => p.bess_oem === oem && p.capex_per_mwh && p.capex_per_mwh < 5)
                        .sort((a, b) => (a.capex_year || 0) - (b.capex_year || 0))
                      const first = pts[0]
                      const latest = pts[pts.length - 1]
                      const reduction = first && latest && first.capex_per_mwh && latest.capex_per_mwh
                        ? Math.round((1 - latest.capex_per_mwh / first.capex_per_mwh) * 100)
                        : null
                      return (
                        <tr key={oem} className="border-b border-[var(--color-border)]">
                          <td className="p-2">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getOEMColour(oem) }} />
                              <span className="text-[var(--color-text)] font-medium">{oem}</span>
                            </span>
                          </td>
                          <td className="p-2 text-right text-[var(--color-text)]">{pts.length}</td>
                          <td className="p-2 text-right text-[var(--color-text)]">{pts.reduce((s, p) => s + p.capacity_mw, 0).toLocaleString()}</td>
                          <td className="p-2 text-right text-[var(--color-text-muted)] font-mono">
                            ${first?.capex_per_mwh?.toFixed(2)}M <span className="text-[10px]">({first?.capex_year})</span>
                          </td>
                          <td className="p-2 text-right text-[var(--color-text)] font-mono">
                            ${latest?.capex_per_mwh?.toFixed(2)}M <span className="text-[10px]">({latest?.capex_year})</span>
                          </td>
                          <td className="p-2 text-right font-mono font-medium" style={{ color: reduction && reduction > 0 ? '#10b981' : '#ef4444' }}>
                            {reduction != null ? `${reduction > 0 ? '↓' : '↑'} ${Math.abs(reduction)}%` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* (3) Tomago Benchmark — comparable project analysis */}
          {/* ═══════════════════════════════════════════ */}
          <div ref={pdfRef}>
          {/* Download PDF button */}
          <div className="flex justify-end mb-2">
            <button
              onClick={handleExportPdf}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-bg-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)] transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {exporting ? 'Generating PDF…' : 'Download PDF'}
            </button>
          </div>
          {tomagoComparables && (
            <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
              <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">
                Tomago Benchmark — How It Compares
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mb-2">
                Tomago BESS (AGL/Fluence, 500 MW / 2,000 MWh, $800M) at <span className="font-bold text-[#10b981]">$0.40M/MWh</span> is
                the lowest-cost utility BESS publicly announced in the NEM. Below are the most comparable projects
                (similar scale, duration, or recency) showing how much more expensive each project is vs Tomago,
                normalised to 500 MW / 4hr (2,000 MWh).
              </p>

              {/* Tomago highlight card */}
              <div className="rounded-lg p-3 mb-4 flex items-center gap-4" style={{ background: '#10b98115', border: '1px solid #10b98140' }}>
                <div className="text-center flex-shrink-0">
                  <div className="text-2xl font-bold font-mono" style={{ color: '#10b981' }}>$0.40M</div>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">per MWh</div>
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  <span className="font-semibold text-[var(--color-text)]">Tomago BESS</span> — AGL Energy &middot; Fluence Gridstack Pro &middot;
                  500 MW / 2,000 MWh (4hr) &middot; NSW &middot; FID Jul 2025 &middot; COD H2 2027 &middot; $800M total capex
                </div>
              </div>

              {/* Comparison bar chart */}
              <ResponsiveContainer width="100%" height={Math.max(250, tomagoComparables.comparables.length * 36 + 50)}>
                <BarChart
                  data={tomagoComparables.comparables}
                  layout="vertical"
                  margin={{ top: 5, right: 60, bottom: 5, left: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                    tickFormatter={(v: number) => `$${v.toFixed(2)}M`}
                    domain={[0, 'auto']}
                    label={{ value: 'A$M per MWh', position: 'insideBottom', offset: -5, fill: 'var(--color-text-muted)', fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={160}
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                  />
                  <Tooltip
                    content={({ payload }) => {
                      if (!payload?.length) return null
                      const p = payload[0].payload
                      return (
                        <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-3 shadow-lg text-sm">
                          <div className="font-semibold text-[var(--color-text)]">{p.name}</div>
                          <div className="text-[var(--color-text-muted)]">{p.bess_oem} &middot; {p.capacity_mw} MW / {p.storage_mwh} MWh ({p.duration_hours}h)</div>
                          <div className="text-blue-400 font-mono">${p.capex_per_mwh?.toFixed(2)}M/MWh</div>
                          <div className="mt-1 font-medium" style={{ color: p.premiumPct > 0 ? '#f59e0b' : '#10b981' }}>
                            {p.premiumPct > 0
                              ? `${p.premiumPct.toFixed(1)}% more expensive than Tomago (+$${p.normPremiumAbsM}M on 500MW/4hr basis)`
                              : `${Math.abs(p.premiumPct).toFixed(1)}% cheaper than Tomago`}
                          </div>
                        </div>
                      )
                    }}
                  />
                  <ReferenceLine x={0.40} stroke="#10b981" strokeDasharray="4 4" strokeWidth={2} label={{ value: 'Tomago $0.40M', fill: '#10b981', fontSize: 10, position: 'top' }} />
                  <Bar dataKey="capex_per_mwh" radius={[0, 4, 4, 0]} maxBarSize={24}>
                    {tomagoComparables.comparables.map((entry, i) => (
                      <Cell key={i} fill={getOEMColour(entry.bess_oem)} fillOpacity={0.7} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Detailed comparison table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="text-left p-2 text-[var(--color-text-muted)]">Project</th>
                      <th className="text-right p-2 text-[var(--color-text-muted)]">MW</th>
                      <th className="text-right p-2 text-[var(--color-text-muted)]">MWh</th>
                      <th className="text-right p-2 text-[var(--color-text-muted)]">Hr</th>
                      <th className="text-left p-2 text-[var(--color-text-muted)]">OEM</th>
                      <th className="text-right p-2 text-[var(--color-text-muted)]">$/MWh</th>
                      <th className="text-right p-2 text-[var(--color-text-muted)]">Year</th>
                      <th className="text-right p-2 text-[var(--color-text-muted)]">vs Tomago</th>
                      <th className="text-right p-2 text-[var(--color-text-muted)]">Extra Cost (norm.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Tomago row */}
                    <tr style={{ background: '#10b98115' }} className="border-b border-[var(--color-border)]">
                      <td className="p-2 font-semibold" style={{ color: '#10b981' }}>
                        <Link to="/projects/tomago-bess?from=intelligence/bess-capex&fromLabel=Back to BESS Capex" className="hover:underline">
                          Tomago BESS ★
                        </Link>
                      </td>
                      <td className="p-2 text-right font-mono" style={{ color: '#10b981' }}>500</td>
                      <td className="p-2 text-right font-mono" style={{ color: '#10b981' }}>2,000</td>
                      <td className="p-2 text-right font-mono" style={{ color: '#10b981' }}>4.0</td>
                      <td className="p-2" style={{ color: '#10b981' }}>Fluence</td>
                      <td className="p-2 text-right font-mono font-bold" style={{ color: '#10b981' }}>$0.40M</td>
                      <td className="p-2 text-right" style={{ color: '#10b981' }}>2025</td>
                      <td className="p-2 text-right font-mono" style={{ color: '#10b981' }}>— baseline —</td>
                      <td className="p-2 text-right" style={{ color: '#10b981' }}>—</td>
                    </tr>
                    {tomagoComparables.comparables.map((p, i) => (
                      <tr key={i} className="border-b border-[var(--color-border)]">
                        <td className="p-2">
                          <Link to={`/projects/${p.id}?from=intelligence/bess-capex&fromLabel=Back to BESS Capex`} className="text-blue-400 hover:text-blue-300">
                            {p.label}
                          </Link>
                          <span className="ml-1 text-[10px] text-[var(--color-text-muted)]">{p.state}</span>
                        </td>
                        <td className="p-2 text-right font-mono text-[var(--color-text)]">{p.capacity_mw}</td>
                        <td className="p-2 text-right font-mono text-[var(--color-text)]">{p.storage_mwh?.toLocaleString()}</td>
                        <td className="p-2 text-right font-mono text-[var(--color-text)]">{p.duration_hours}</td>
                        <td className="p-2">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getOEMColour(p.bess_oem) }} />
                            <span className="text-[var(--color-text)]">{p.bess_oem}</span>
                          </span>
                        </td>
                        <td className="p-2 text-right font-mono text-[var(--color-text)]">${p.capex_per_mwh?.toFixed(2)}M</td>
                        <td className="p-2 text-right text-[var(--color-text-muted)]">{p.capex_year}</td>
                        <td className="p-2 text-right font-mono font-medium" style={{ color: p.premiumPct > 0 ? '#f59e0b' : '#10b981' }}>
                          {p.premiumPct > 0 ? `+${p.premiumPct}%` : `${p.premiumPct}%`}
                        </td>
                        <td className="p-2 text-right font-mono" style={{ color: p.normPremiumAbsM > 0 ? '#f59e0b' : '#10b981' }}>
                          {p.normPremiumAbsM > 0 ? `+$${p.normPremiumAbsM}M` : `-$${Math.abs(p.normPremiumAbsM)}M`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-2 italic">
                Extra cost = difference in $/MWh × 2,000 MWh (500 MW / 4hr reference basis).
                Comparability based on: duration ≥3.5hr, capacity ≥300 MW, same OEM, or recent FID (2023+).
              </p>
            </div>
          )}

          {/* Key insights card */}
          {keyInsights && (
          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Key Observations</h2>
            <div className="space-y-5 text-sm">

              {/* 1. Cost Decline Over Time */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span className="text-[var(--color-text)] font-semibold">Cost Decline Over Time</span>
                </div>
                <p className="text-[var(--color-text-muted)] leading-relaxed">
                  NEM battery costs have fallen{' '}
                  <span className="text-[var(--color-text)] font-medium">
                    {keyInsights.byYear['2017'] && keyInsights.byYear['2024']
                      ? `${keyInsights.pctDrop(keyInsights.byYear['2017'].avg_capex_per_mwh!, keyInsights.byYear['2024'].avg_capex_per_mwh!)}%`
                      : '~73%'}
                  </span>{' '}
                  on a $/MWh basis from 2017 to 2024. Three distinct eras are visible:
                </p>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {[
                    { era: '2017–2020', label: 'Early BESS', avg: keyInsights.byYear['2017']?.avg_capex_per_mwh, color: '#ef4444' },
                    { era: '2021–2023', label: '2hr Scale-Up', avg: keyInsights.byYear['2022']?.avg_capex_per_mwh, color: '#f59e0b' },
                    { era: '2024–2025', label: '4hr Revolution', avg: keyInsights.byYear['2024']?.avg_capex_per_mwh, color: '#10b981' },
                  ].map(e => (
                    <div key={e.era} className="rounded-lg p-2.5 text-center" style={{ background: `${e.color}10`, border: `1px solid ${e.color}30` }}>
                      <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">{e.era}</div>
                      <div className="text-lg font-bold font-mono mt-0.5" style={{ color: e.color }}>
                        ${e.avg?.toFixed(2) ?? '?'}M
                      </div>
                      <div className="text-[10px] text-[var(--color-text-muted)]">{e.label} avg $/MWh</div>
                    </div>
                  ))}
                </div>
                <p className="text-[var(--color-text-muted)] mt-2 leading-relaxed">
                  The sharpest single-year drop came in 2024 ({keyInsights.byYear['2024']?.count} projects, {keyInsights.byYear['2024']?.total_mw?.toLocaleString()} MW)
                  at an average of <span className="text-[var(--color-text)] font-mono">${keyInsights.byYear['2024']?.avg_capex_per_mwh?.toFixed(2)}M/MWh</span> —
                  {keyInsights.byYear['2023'] && keyInsights.byYear['2024']
                    ? ` a ${keyInsights.pctDrop(keyInsights.byYear['2023'].avg_capex_per_mwh!, keyInsights.byYear['2024'].avg_capex_per_mwh!)}% drop from 2023's`
                    : ' down from'}{' '}
                  <span className="font-mono">${keyInsights.byYear['2023']?.avg_capex_per_mwh?.toFixed(2)}M/MWh</span>,
                  driven by 4-hour systems reaching commercial scale.
                </p>
              </div>

              {/* 2. OEM Cost Trajectories */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span className="text-[var(--color-text)] font-semibold">OEM Cost Trajectories</span>
                </div>
                <div className="grid md:grid-cols-3 gap-3">
                  {/* Tesla */}
                  {keyInsights.tesla.length > 0 && (() => {
                    const first = keyInsights.earliest(keyInsights.tesla)
                    const last = keyInsights.latest(keyInsights.tesla)
                    const drop = first.capex_per_mwh && last.capex_per_mwh
                      ? keyInsights.pctDrop(first.capex_per_mwh, last.capex_per_mwh) : 0
                    return (
                      <div className="rounded-lg p-3 border border-[var(--color-border)]">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#e74c3c' }} />
                          <span className="font-semibold text-[var(--color-text)]">Tesla</span>
                          <span className="text-[10px] text-[var(--color-text-muted)] ml-auto">{keyInsights.tesla.length} projects · {data.by_oem['Tesla']?.total_mw?.toLocaleString()} MW</span>
                        </div>
                        <p className="text-[var(--color-text-muted)] leading-relaxed">
                          From <span className="font-mono text-[var(--color-text)]">${first.capex_per_mwh?.toFixed(2)}M/MWh</span> ({first.name?.replace(/ BESS| Battery/g, '')}, {first.capex_year})
                          to <span className="font-mono text-[var(--color-text)]">${last.capex_per_mwh?.toFixed(2)}M/MWh</span> ({last.name?.replace(/ BESS| Battery/g, '')}, {last.capex_year}).
                          {drop > 0 ? <> <span className="text-[#10b981] font-medium">{drop}% decline</span> overall.</> : ''}
                          {' '}Market leader by volume but shows wider price variance ($0.46–$1.08 in 2023 alone) reflecting diverse project scales.
                        </p>
                      </div>
                    )
                  })()}
                  {/* Fluence */}
                  {keyInsights.fluence.length > 0 && (() => {
                    const first = keyInsights.earliest(keyInsights.fluence)
                    const last = keyInsights.latest(keyInsights.fluence)
                    const drop = first.capex_per_mwh && last.capex_per_mwh
                      ? keyInsights.pctDrop(first.capex_per_mwh, last.capex_per_mwh) : 0
                    return (
                      <div className="rounded-lg p-3 border border-[var(--color-border)]">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#3498db' }} />
                          <span className="font-semibold text-[var(--color-text)]">Fluence</span>
                          <span className="text-[10px] text-[var(--color-text-muted)] ml-auto">{keyInsights.fluence.length} projects · {data.by_oem['Fluence']?.total_mw?.toLocaleString()} MW</span>
                        </div>
                        <p className="text-[var(--color-text-muted)] leading-relaxed">
                          From <span className="font-mono text-[var(--color-text)]">${first.capex_per_mwh?.toFixed(2)}M/MWh</span> ({first.name?.replace(/ BESS| Battery| Energy Storage System/g, '')}, {first.capex_year})
                          to <span className="font-mono text-[var(--color-text)]">${last.capex_per_mwh?.toFixed(2)}M/MWh</span> ({last.name?.replace(/ BESS| Battery/g, '')}, {last.capex_year}).
                          {drop > 0 ? <> <span className="text-[#10b981] font-medium">{drop}% decline</span> over {(last.capex_year || 0) - (first.capex_year || 0)} years.</> : ''}
                          {' '}Steepest trajectory of any Western OEM, culminating in the Tomago benchmark.
                        </p>
                      </div>
                    )
                  })()}
                  {/* Wartsila */}
                  {keyInsights.wartsila.length > 0 && (() => {
                    const first = keyInsights.earliest(keyInsights.wartsila)
                    const last = keyInsights.latest(keyInsights.wartsila)
                    const drop = first.capex_per_mwh && last.capex_per_mwh
                      ? keyInsights.pctDrop(first.capex_per_mwh, last.capex_per_mwh) : 0
                    return (
                      <div className="rounded-lg p-3 border border-[var(--color-border)]">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#2ecc71' }} />
                          <span className="font-semibold text-[var(--color-text)]">Wärtsilä</span>
                          <span className="text-[10px] text-[var(--color-text-muted)] ml-auto">{keyInsights.wartsila.length} projects · {data.by_oem['Wartsila']?.total_mw?.toLocaleString()} MW</span>
                        </div>
                        <p className="text-[var(--color-text-muted)] leading-relaxed">
                          From <span className="font-mono text-[var(--color-text)]">${first.capex_per_mwh?.toFixed(2)}M/MWh</span> ({first.name?.replace(/ BESS| Battery/g, '')}, {first.capex_year})
                          to <span className="font-mono text-[var(--color-text)]">${last.capex_per_mwh?.toFixed(2)}M/MWh</span> ({last.name?.replace(/ BESS| Battery/g, '')}, {last.capex_year}).
                          {drop > 0 ? <> <span className="text-[#10b981] font-medium">{drop}% decline</span> in just {(last.capex_year || 0) - (first.capex_year || 0)} years</> : ''} —
                          the fastest cost compression of any OEM, achieving the NEM's lowest-ever $/MWh on Eraring's 4.5hr system.
                        </p>
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* 3. Duration Shift */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span className="text-[var(--color-text)] font-semibold">The Duration Revolution</span>
                </div>
                <p className="text-[var(--color-text-muted)] leading-relaxed mb-2">
                  The NEM BESS market has undergone three duration eras, each unlocking a step-change in $/MWh economics:
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { dur: '≤1.5hr', label: '2017–2020', count: keyInsights.oneHr.length, avg: keyInsights.avgMwh(keyInsights.oneHr), color: '#ef4444',
                      note: 'FCAS-focused, frequency response' },
                    { dur: '2hr', label: '2021–2023', count: keyInsights.twoHr.length, avg: keyInsights.avgMwh(keyInsights.twoHr), color: '#f59e0b',
                      note: 'Energy arbitrage + FCAS stacking' },
                    { dur: '4hr+', label: '2024–2025', count: keyInsights.fourHr.length, avg: keyInsights.avgMwh(keyInsights.fourHr), color: '#10b981',
                      note: 'Firming, capacity credits, peak shifting' },
                  ].map(d => (
                    <div key={d.dur} className="rounded-lg p-2.5" style={{ background: `${d.color}10`, border: `1px solid ${d.color}30` }}>
                      <div className="text-xs font-bold" style={{ color: d.color }}>{d.dur}</div>
                      <div className="text-[10px] text-[var(--color-text-muted)]">{d.label} · {d.count} projects</div>
                      <div className="text-base font-bold font-mono mt-1" style={{ color: d.color }}>
                        ${d.avg.toFixed(2)}M
                      </div>
                      <div className="text-[10px] text-[var(--color-text-muted)]">avg $/MWh</div>
                      <div className="text-[10px] text-[var(--color-text-muted)] mt-1 italic">{d.note}</div>
                    </div>
                  ))}
                </div>
                <p className="text-[var(--color-text-muted)] mt-2 leading-relaxed">
                  The shift to 4-hour systems has been transformative: despite storing 4× the energy, 4hr+ projects average{' '}
                  <span className="text-[var(--color-text)] font-mono">${keyInsights.avgMwh(keyInsights.fourHr).toFixed(2)}M/MWh</span> —{' '}
                  {keyInsights.avgMwh(keyInsights.oneHr) > 0 && (
                    <><span className="text-[#10b981] font-medium">{keyInsights.pctDrop(keyInsights.avgMwh(keyInsights.oneHr), keyInsights.avgMwh(keyInsights.fourHr))}% cheaper</span> than the 1-hour era.</>
                  )}{' '}
                  Longer duration spreads fixed costs (balance of plant, grid connection, land) across more MWh while cell costs
                  benefit from global LFP manufacturing scale.
                </p>
              </div>

              {/* 4. Tomago Benchmark */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[var(--color-text)] font-semibold">Tomago BESS — New Market Benchmark</span>
                </div>
                {keyInsights.tomago && (
                  <p className="text-[var(--color-text-muted)] leading-relaxed">
                    At <span className="font-mono font-bold text-[#10b981]">${keyInsights.tomago.capex_per_mwh?.toFixed(2)}M/MWh</span> for
                    a {keyInsights.tomago.capacity_mw} MW / {keyInsights.tomago.storage_mwh?.toLocaleString()} MWh 4-hour system,
                    Tomago BESS sets the clear low-water mark for utility-scale BESS in the NEM.
                    {keyInsights.fourHrOthers.length > 0 && (() => {
                      const avgOthers = keyInsights.avgMwh(keyInsights.fourHrOthers)
                      const premium = Math.round(((avgOthers - keyInsights.tomago!.capex_per_mwh!) / keyInsights.tomago!.capex_per_mwh!) * 100)
                      return (
                        <> Compared to other 4hr+ systems averaging <span className="font-mono text-[var(--color-text)]">${avgOthers.toFixed(2)}M/MWh</span>,
                        Tomago is <span className="text-[#10b981] font-medium">{premium}% below the peer average</span>.
                        </>
                      )
                    })()}
                    {' '}The combination of Fluence's latest Gridstack Pro platform, AGL's 500 MW single-site scale, and 2025 procurement timing
                    (benefiting from global LFP cell oversupply) has produced a cost point that resets market expectations for what a Tier 1 Western OEM
                    BESS should cost in Australia.
                  </p>
                )}
              </div>

            </div>
          </div>
          )}

          {/* Next-Gen Technology & Market Outlook */}
          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Next-Generation BESS Technology & Market Outlook</h2>
            <p className="text-xs text-[var(--color-text-muted)] mb-4">
              Will the next wave of products push costs below Tomago&apos;s benchmark &mdash; or will macro forces push them back up?
            </p>

            {/* Product cards */}
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span className="text-[var(--color-text)] font-semibold">Next-Gen OEM Products</span>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                {/* Tesla Megapack 3 + Megablock */}
                <div className="rounded-lg p-3" style={{ background: '#e74c3c10', border: '1px solid #e74c3c30' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#e74c3c' }} />
                    <span className="text-sm font-bold text-[var(--color-text)]">Tesla Megapack 3 &amp; Megablock</span>
                  </div>
                  <div className="text-xs font-medium text-[#e74c3c] mb-1">Megapack 3 shipping 2025 &mdash; Megablock available 2026</div>
                  <div className="space-y-1.5 text-xs text-[var(--color-text-muted)] leading-relaxed">
                    <p>
                      <span className="text-[var(--color-text)] font-medium">Megapack 3</span> increases energy density by <span className="text-[var(--color-text)] font-medium">~25-30%</span> over the Megapack 2 (3.9 MWh/unit), reaching <span className="text-[var(--color-text)] font-medium">~5 MWh per unit</span>.
                      Each Megapack 3 unit contains a proprietary <span className="text-[var(--color-text)] font-medium">silicon carbide (SiC) inverter</span> integrated at the unit level &mdash;
                      not a centralised PCS or string inverter architecture, but a per-unit integrated approach that achieves similar modularity and fault isolation benefits.
                      The SiC power electronics deliver higher switching efficiency and lower thermal losses than conventional IGBT inverters.
                    </p>
                    <p>
                      <span className="text-[var(--color-text)] font-medium">Megablock</span> is Tesla&apos;s new pre-engineered MV AC-coupled solution: <span className="text-[var(--color-text)] font-medium">4&times; Megapack 3 units + transformer + switchgear = 20 MWh per block</span>.
                      Factory-assembled and shipped as a single deployable unit, targeting <span className="text-[var(--color-text)] font-medium">40% lower construction costs</span> and
                      <span className="text-[var(--color-text)] font-medium">91% round-trip efficiency</span>. Dramatically reduces on-site EPC scope &mdash; connections, not construction.
                    </p>
                    <p>
                      <span className="text-[var(--color-text)] font-medium">Key advantages:</span> Integrated Autobidder AI trading platform (confirmed in NEM bidding data). Factory-direct pricing from Lathrop, CA and Shanghai Megafactories.
                      Per-unit SiC inverter means a single unit fault doesn&apos;t affect the rest of the system. Megablock&apos;s pre-integration eliminates most on-site AC wiring and civil works.
                    </p>
                    <p>
                      <span className="text-[var(--color-text)] font-medium">Cost impact:</span> 10-15% capex reduction per MWh vs Megapack 2, driven primarily by fewer units per site and Megablock&apos;s BoP elimination. Could push Tesla NEM projects toward <span className="text-[#10b981] font-mono font-medium">$0.35-0.40M/MWh</span>.
                    </p>
                  </div>
                </div>

                {/* Wärtsilä Quantum3 */}
                <div className="rounded-lg p-3" style={{ background: '#2ecc7110', border: '1px solid #2ecc7130' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#2ecc71' }} />
                    <span className="text-sm font-bold text-[var(--color-text)]">W&auml;rtsil&auml; Quantum3</span>
                  </div>
                  <div className="text-xs font-medium text-[#2ecc71] mb-1">Deployed at Eraring (700 MW / 3,160 MWh) &mdash; string inverter architecture</div>
                  <div className="space-y-1.5 text-xs text-[var(--color-text-muted)] leading-relaxed">
                    <p>
                      W&auml;rtsil&auml;&apos;s Quantum3 is a fully integrated <span className="text-[var(--color-text)] font-medium">AC block</span> delivering <span className="text-[var(--color-text)] font-medium">5 MWh per 20ft container</span> with
                      <span className="text-[var(--color-text)] font-medium">string-based power conversion systems (PCS)</span> built into each unit &mdash; the key innovation distinguishing it from competitors.
                      The string inverter architecture distributes power conversion across multiple independent paths within each container,
                      providing granular control and inherent redundancy at the hardware level.
                    </p>
                    <p>
                      <span className="text-[var(--color-text)] font-medium">NEM proof point:</span> Quantum3 is the platform behind Australia&apos;s largest battery &mdash; Origin Energy&apos;s
                      <span className="text-[var(--color-text)] font-medium">Eraring Big Battery (700 MW / 3,160 MWh)</span>, where Stages 1 &amp; 3 (460 MW) are operating and Stages 2 &amp; 4 (240 MW, grid-forming) are under construction.
                      Completed on time and under budget. W&auml;rtsil&auml; also supplies Torrens Island, Capital Battery, and multiple SA projects via the GEMS digital energy platform.
                    </p>
                    <p>
                      <span className="text-[var(--color-text)] font-medium">Key advantages:</span> String inverters deliver <span className="text-[var(--color-text)] font-medium">higher availability</span> (individual string faults don&apos;t take down the container),
                      simplified maintenance (replace a string inverter board, not a 4 MW central unit), and easier future augmentation. GEMS platform provides advanced optimisation and grid services.
                      Liquid cooling enables sustained high-cycle operation.
                    </p>
                    <p>
                      <span className="text-[var(--color-text)] font-medium">Cost impact:</span> ~40% more energy per footprint vs previous Quantum generation = fewer containers, foundations, and cabling per MWh.
                      String inverters reduce single-point-of-failure risk, lowering long-term O&amp;M costs. Projects could target <span className="text-[#10b981] font-mono font-medium">$0.38-0.42M/MWh</span> for 4hr+ systems.
                    </p>
                  </div>
                </div>
              </div>

              {/* Fluence Gridstack Pro + SmartStack */}
              <div className="grid md:grid-cols-2 gap-3 mt-3">
                <div className="rounded-lg p-3" style={{ background: '#3498db10', border: '1px solid #3498db30' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#3498db' }} />
                    <span className="text-sm font-bold text-[var(--color-text)]">Fluence Gridstack Pro</span>
                  </div>
                  <div className="text-xs font-medium text-[#3498db] mb-1">Available now &mdash; Tomago is first major NEM deployment</div>
                  <div className="space-y-1.5 text-xs text-[var(--color-text-muted)] leading-relaxed">
                    <p>
                      Fluence&apos;s Gridstack Pro represents a fundamental redesign: a <span className="text-[var(--color-text)] font-medium">modular, pre-engineered &ldquo;building block&rdquo;</span> architecture that reduces site installation time by up to 40%. Each block is factory-assembled and pre-tested, minimising field commissioning.
                      Cell-agnostic design accepts multiple LFP suppliers (CATL, BYD, EVE Energy), enabling competitive procurement.
                    </p>
                    <p>
                      <span className="text-[var(--color-text)] font-medium">Key advantages:</span> Dramatically lower EPC/BoP costs through standardisation. Integrated Fluence IQ software platform for bidding optimisation.
                      DC-coupled architecture with centralised inverters &mdash; a more traditional PCS approach that benefits from mature, proven power electronics.
                    </p>
                    <p>
                      <span className="text-[var(--color-text)] font-medium">Cost impact:</span> Tomago&apos;s <span className="text-[#10b981] font-mono font-medium">{keyInsights?.tomago?.capex_per_mwh ? `$${keyInsights.tomago.capex_per_mwh.toFixed(2)}M/MWh` : '~$0.36M/MWh'}</span> is the proof point. As Gridstack Pro scales across more sites, further 5-10% reductions are plausible through supply chain maturation and repeat EPC contracting.
                    </p>
                  </div>
                </div>

                {/* Fluence SmartStack */}
                <div className="rounded-lg p-3" style={{ background: '#9b59b610', border: '1px solid #9b59b630' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#9b59b6' }} />
                    <span className="text-sm font-bold text-[var(--color-text)]">Fluence SmartStack</span>
                  </div>
                  <div className="text-xs font-medium text-[#9b59b6] mb-1">Announced 2025 &mdash; patent-pending integrated AC block</div>
                  <div className="space-y-1.5 text-xs text-[var(--color-text-muted)] leading-relaxed">
                    <p>
                      Fluence&apos;s newest platform takes the opposite approach to Gridstack Pro: a fully integrated <span className="text-[var(--color-text)] font-medium">AC block</span> with
                      <span className="text-[var(--color-text)] font-medium">7.5 MWh per unit</span> and integrated power conversion system (PCS) built directly into each container.
                      This patent-pending architecture delivers <span className="text-[var(--color-text)] font-medium">~30% higher energy density</span> than Gridstack Pro by eliminating external inverter skids and associated cabling.
                    </p>
                    <p>
                      <span className="text-[var(--color-text)] font-medium">Key advantages:</span> Highest energy density per footprint of any announced Fluence product.
                      Integrated PCS within each unit means each SmartStack is a self-contained AC generation asset &mdash; similar in philosophy to Tesla&apos;s Megapack and W&auml;rtsil&auml;&apos;s Quantum3.
                      Factory pre-tested as a complete AC system, reducing commissioning time. Retains Fluence IQ software platform.
                    </p>
                    <p>
                      <span className="text-[var(--color-text)] font-medium">Cost impact:</span> Fewer units per site and elimination of separate inverter infrastructure could push costs <span className="text-[#10b981] font-mono font-medium">10-15% below Gridstack Pro</span>.
                      If deployed at Tomago-scale sites, sub-$0.35M/MWh becomes theoretically achievable. No confirmed NEM deployments yet.
                    </p>
                  </div>
                </div>
              </div>

              {/* String Inverters vs Centralised PCS */}
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span className="text-[var(--color-text)] font-semibold">Power Conversion Architecture: String Inverters vs Centralised PCS</span>
                </div>
                <p className="text-[var(--color-text-muted)] leading-relaxed mb-3">
                  A fundamental design divergence is emerging across BESS OEMs: <span className="text-[var(--color-text)] font-medium">distributed string inverters</span> (W&auml;rtsil&auml; Quantum3)
                  vs <span className="text-[var(--color-text)] font-medium">per-unit integrated inverters</span> (Tesla Megapack with SiC) vs <span className="text-[var(--color-text)] font-medium">centralised PCS</span> (traditional Fluence Gridstack).
                  This choice has significant implications for availability, maintenance costs, and long-term project economics.
                </p>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="rounded-lg p-3" style={{ background: '#8b5cf610', border: '1px solid #8b5cf630' }}>
                    <div className="text-xs font-bold text-[#8b5cf6] mb-2">String / Distributed Inverter Advantages</div>
                    <ul className="text-xs text-[var(--color-text-muted)] space-y-1.5 list-disc list-inside">
                      <li><span className="text-[var(--color-text)]">Higher availability:</span> If one string inverter faults, only that string&apos;s capacity (~100-500 kW) is lost &mdash; the rest of the container continues operating. A centralised 4 MW inverter failure takes the entire block offline.</li>
                      <li><span className="text-[var(--color-text)]">Fault isolation:</span> Electrical faults are contained within the affected string. Arc flash risk is lower as each string operates at lower current. No single point of failure in the power conversion path.</li>
                      <li><span className="text-[var(--color-text)]">Granular MPPT-like control:</span> Each string can be independently controlled, enabling cell-level optimisation across battery racks with slightly different degradation states &mdash; improving round-trip efficiency over the asset&apos;s life.</li>
                      <li><span className="text-[var(--color-text)]">Simpler maintenance:</span> A failed string inverter board can be swapped in minutes by a single technician. Centralised inverters require crane lifts, specialist contractors, and longer outages.</li>
                      <li><span className="text-[var(--color-text)]">Easier augmentation:</span> New battery racks can be added with their own string inverters without upgrading the central PCS, enabling capacity additions that match degradation curves.</li>
                      <li><span className="text-[var(--color-text)]">Safety:</span> Lower fault current per string reduces arc flash hazard during maintenance, enabling simpler PPE requirements and faster turnaround.</li>
                    </ul>
                  </div>
                  <div className="rounded-lg p-3" style={{ background: '#64748b10', border: '1px solid #64748b30' }}>
                    <div className="text-xs font-bold text-[#64748b] mb-2">Centralised PCS Advantages</div>
                    <ul className="text-xs text-[var(--color-text-muted)] space-y-1.5 list-disc list-inside">
                      <li><span className="text-[var(--color-text)]">Proven at scale:</span> Centralised inverters (SMA, Power Electronics, Sungrow) have decades of grid-scale deployment history with well-understood failure modes.</li>
                      <li><span className="text-[var(--color-text)]">Lower initial cost:</span> A single 4 MW central inverter is typically cheaper per MW than the equivalent capacity in distributed string inverters, though the gap is narrowing.</li>
                      <li><span className="text-[var(--color-text)]">Grid compliance:</span> Centralised inverters can more easily coordinate grid-forming behaviour at the point of connection, though string architectures are solving this via intelligent aggregation.</li>
                      <li><span className="text-[var(--color-text)]">Supply chain:</span> Broader supplier base for centralised inverters. String inverter supply for grid-scale BESS is currently limited to a few OEMs&apos; proprietary designs.</li>
                    </ul>
                    <div className="mt-3 p-2 rounded bg-[var(--color-bg)] text-xs text-[var(--color-text-muted)]">
                      <span className="text-[var(--color-text)] font-medium">Industry trend:</span> The shift toward distributed/string architectures mirrors the solar industry&apos;s evolution from central inverters to string inverters over the past decade.
                      As BESS projects grow to 500+ MW, the availability and maintenance advantages of distributed architectures become increasingly compelling for long-term asset economics.
                    </div>
                  </div>
                </div>
              </div>

              {/* BoP improvements */}
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span className="text-[var(--color-text)] font-semibold">Balance of Plant (BoP) Cost Trajectory</span>
                </div>
                <p className="text-[var(--color-text-muted)] leading-relaxed">
                  BoP typically accounts for <span className="text-[var(--color-text)] font-medium">35-45% of total BESS capex</span> (inverters, transformers, switchgear, cabling, civil works, grid connection, EPC margin).
                  All three next-gen platforms target BoP reduction through higher energy density per container (fewer foundations, less cabling) and modular pre-assembly
                  (less on-site construction time). Industry-wide, string inverter costs have fallen ~15% since 2023, and Australian EPC contractors are building repeat experience
                  that reduces construction risk premiums. However, <span className="text-[var(--color-text)] font-medium">transformer lead times remain 18-24 months</span> and are a persistent bottleneck.
                  A realistic BoP improvement of <span className="text-[var(--color-text)] font-medium">10-20% per MWh</span> over the next 2-3 years is achievable, contributing
                  ~$0.03-0.06M/MWh in savings when combined with density improvements.
                </p>
              </div>

              {/* Macro headwinds */}
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  <span className="text-[var(--color-text)] font-semibold">Macro Headwinds: The Cell Oversupply Window Is Closing</span>
                </div>
                <p className="text-[var(--color-text-muted)] leading-relaxed mb-2">
                  The <span className="text-[var(--color-text)] font-medium">2023-2025 LFP cell price collapse</span> (down ~50% from peak) was driven by a structural oversupply: Chinese cell manufacturers
                  (CATL, BYD, EVE Energy, Hithium) invested aggressively for an EV boom that underdelivered in Western markets.
                  This created a <span className="text-[var(--color-text)] font-medium">golden window for stationary storage procurement</span> &mdash; Tomago&apos;s pricing reflects this window.
                </p>
                <div className="grid md:grid-cols-2 gap-3 mb-2">
                  <div className="rounded-lg p-2.5" style={{ background: '#ef444410', border: '1px solid #ef444430' }}>
                    <div className="text-xs font-bold text-[#ef4444] mb-1">Upward Pressure</div>
                    <ul className="text-xs text-[var(--color-text-muted)] space-y-1 list-disc list-inside">
                      <li><span className="text-[var(--color-text)]">Geopolitical supply risk:</span> Iran conflict and Middle East instability pushing up oil/petrol prices, which accelerates EV adoption and absorbs cell oversupply</li>
                      <li><span className="text-[var(--color-text)]">EV demand recovery:</span> Higher petrol prices make EVs compelling again &mdash; global EV sales are re-accelerating in 2025, drawing LFP cells away from stationary storage</li>
                      <li><span className="text-[var(--color-text)]">Sticky inflation:</span> Australian construction costs, labour, and materials (steel, copper, concrete) remain elevated with CPI still above target</li>
                      <li><span className="text-[var(--color-text)]">Lithium price floor:</span> Lithium carbonate has stabilised after its 85% crash &mdash; further cell price declines require efficiency gains, not commodity deflation</li>
                      <li><span className="text-[var(--color-text)]">AUD weakness:</span> Equipment is priced in USD/CNY &mdash; a weaker Australian dollar erodes import price gains</li>
                    </ul>
                  </div>
                  <div className="rounded-lg p-2.5" style={{ background: '#10b98110', border: '1px solid #10b98130' }}>
                    <div className="text-xs font-bold text-[#10b981] mb-1">Downward Pressure</div>
                    <ul className="text-xs text-[var(--color-text-muted)] space-y-1 list-disc list-inside">
                      <li><span className="text-[var(--color-text)]">Continued manufacturing scale:</span> Chinese LFP capacity continues to expand &mdash; CATL alone adding 100+ GWh/yr</li>
                      <li><span className="text-[var(--color-text)]">Technology learning curves:</span> Each OEM generation delivers 15-25% more energy per footprint</li>
                      <li><span className="text-[var(--color-text)]">Australian market maturity:</span> Repeat EPC contracting, established supply chains, standardised designs reduce risk premiums</li>
                      <li><span className="text-[var(--color-text)]">Competition:</span> 3+ major OEMs competing for NEM contracts drives procurement discipline</li>
                      <li><span className="text-[var(--color-text)]">Sodium-ion emergence:</span> Na-ion cells reaching commercial scale for stationary storage could provide a long-term alternative if lithium prices recover</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* The Tomago question */}
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span className="text-[var(--color-text)] font-semibold">Will Tomago Remain the NEM&apos;s Lowest-Cost BESS?</span>
                </div>
                <div className="rounded-lg p-3" style={{ background: '#f59e0b08', border: '1px solid #f59e0b30' }}>
                  <p className="text-[var(--color-text-muted)] leading-relaxed mb-2">
                    <span className="text-[var(--color-text)] font-medium">Short answer: possibly for 12-18 months, but unlikely to hold permanently.</span>
                  </p>
                  <p className="text-[var(--color-text-muted)] leading-relaxed mb-2">
                    Tomago&apos;s {keyInsights?.tomago?.capex_per_mwh ? <span className="text-[#10b981] font-mono font-bold">${keyInsights.tomago.capex_per_mwh.toFixed(2)}M/MWh</span> : <span className="text-[#10b981] font-mono font-bold">~$0.36M/MWh</span>} was achieved at a near-perfect intersection:
                    peak LFP cell oversupply, Fluence&apos;s latest Gridstack Pro platform, AGL&apos;s 500 MW single-site scale economies, and 2025 procurement timing.
                    This is a <span className="text-[var(--color-text)] font-medium">cyclical low point</span> that several forces are now working to reverse.
                  </p>
                  <p className="text-[var(--color-text-muted)] leading-relaxed mb-2">
                    <span className="text-[var(--color-text)] font-medium">The bull case for even lower costs:</span> Next-gen products (Megapack 3, Quantum HD) delivering 25-40% higher energy density could push BoP costs per MWh down another 10-20%.
                    If cell prices remain depressed AND a developer achieves 1+ GWh single-site scale (e.g. a future Eraring Stage 5+ or a greenfield gigapack), costs of <span className="text-[#10b981] font-mono">$0.30-0.35M/MWh</span> become theoretically achievable.
                  </p>
                  <p className="text-[var(--color-text-muted)] leading-relaxed mb-2">
                    <span className="text-[var(--color-text)] font-medium">The bear case (more likely near-term):</span> The cell oversupply window is closing as EV demand recovers.
                    Iranian conflict-driven petrol price increases are accelerating this. Sticky Australian inflation keeps construction costs elevated.
                    Projects reaching FID in late 2025 or 2026 may face <span className="text-[#ef4444] font-mono">$0.40-0.50M/MWh</span> &mdash; reverting toward pre-Tomago levels.
                    This would make Tomago&apos;s pricing look increasingly like a one-off market timing win rather than a new structural floor.
                  </p>
                  <p className="text-[var(--color-text)] leading-relaxed font-medium">
                    The critical variable is whether technology improvements (next-gen density + BoP standardisation) can outpace macro headwinds (cell price recovery + inflation + FX).
                    On balance, the next 2-3 NEM projects will likely cost 10-20% more than Tomago, not less &mdash; making it the benchmark to beat for the foreseeable future.
                  </p>
                </div>
              </div>

            </div>
          </div>

          </div>{/* end pdfRef */}
        </div>
      ) : (
        /* Table view */
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left p-3 text-[var(--color-text-muted)] font-medium">Project</th>
                <th className="text-left p-3 text-[var(--color-text-muted)] font-medium hidden md:table-cell">Developer</th>
                <th className="text-right p-3 text-[var(--color-text-muted)] font-medium">MW</th>
                <th className="text-right p-3 text-[var(--color-text-muted)] font-medium">MWh</th>
                <th className="text-right p-3 text-[var(--color-text-muted)] font-medium hidden sm:table-cell">Hours</th>
                <th className="text-left p-3 text-[var(--color-text-muted)] font-medium hidden lg:table-cell">OEM</th>
                <th className="text-right p-3 text-[var(--color-text-muted)] font-medium">Capex A$M</th>
                <th className="text-right p-3 text-[var(--color-text-muted)] font-medium">$/MW</th>
                <th className="text-right p-3 text-[var(--color-text-muted)] font-medium">$/MWh</th>
                <th className="text-center p-3 text-[var(--color-text-muted)] font-medium hidden sm:table-cell">Year</th>
                <th className="text-center p-3 text-[var(--color-text-muted)] font-medium hidden md:table-cell">Status</th>
                <th className="text-center p-3 text-[var(--color-text-muted)] font-medium hidden lg:table-cell">Source</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects
                .sort((a, b) => (a.capex_year || 0) - (b.capex_year || 0))
                .map(p => (
                <tr key={p.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg)]/50">
                  <td className="p-3">
                    <Link to={`/projects/${p.id}`} className="text-blue-400 hover:text-blue-300">
                      {p.name}
                    </Link>
                    {p.stages && p.stages.length > 0 && (
                      <span className="ml-1 text-[10px] text-amber-400" title={p.capex_scope_note || `${p.stages.length} stages`}>
                        ({p.stages.length} stages)
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-[var(--color-text-muted)] hidden md:table-cell">{p.current_developer}</td>
                  <td className="p-3 text-right text-[var(--color-text)]">{p.capacity_mw}</td>
                  <td className="p-3 text-right text-[var(--color-text)]">{p.storage_mwh}</td>
                  <td className="p-3 text-right text-[var(--color-text-muted)] hidden sm:table-cell">{p.duration_hours}h</td>
                  <td className="p-3 hidden lg:table-cell">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getOEMColour(p.bess_oem) }} />
                      <span className="text-[var(--color-text)]">{p.bess_oem}</span>
                    </span>
                  </td>
                  <td className="p-3 text-right font-medium text-[var(--color-text)]">${p.capex_aud_m}</td>
                  <td className="p-3 text-right text-[var(--color-text)]">${p.capex_per_mw?.toFixed(2)}</td>
                  <td className="p-3 text-right text-[var(--color-text)]">${p.capex_per_mwh?.toFixed(2)}</td>
                  <td className="p-3 text-center text-[var(--color-text-muted)] hidden sm:table-cell">{p.capex_year}</td>
                  <td className="p-3 text-center hidden md:table-cell">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      p.status === 'operating' ? 'bg-green-500/20 text-green-400' :
                      p.status === 'construction' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-3 text-center hidden lg:table-cell">
                    {p.capex_source_url ? (
                      <a href={p.capex_source_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-xs underline">
                        {p.capex_source?.length > 30 ? p.capex_source.substring(0, 30) + '…' : p.capex_source}
                      </a>
                    ) : (
                      <span className="text-xs text-[var(--color-text-muted)]">{p.capex_source}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Source note */}
      <div className="text-xs text-[var(--color-text-muted)] italic">
        Capex figures sourced from ARENA, developer press releases, CEFC disclosures, and news reporting.
        Some figures are estimates based on partial disclosure (e.g. debt financing only).
        All values in Australian dollars (nominal). Year = FID or announcement year.
      </div>
    </div>
  )
}
