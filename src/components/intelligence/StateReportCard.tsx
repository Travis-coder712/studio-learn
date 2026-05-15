/**
 * State Report Card — fleet-level view of a state's wind / solar / BESS portfolio.
 *
 * Reuses the same value-summary data as the individual project analyses
 * (wind-value.json, solar-value.json, bess-value.json) but pivots from
 * "deep dive on one project" to "compare every project in this state".
 *
 * Renders:
 *   - State headline KPIs (capacity-weighted)
 *   - Grade distribution
 *   - Top performers by chosen metric
 *   - Full project list with grade + key metric chips
 *   - Comprehensive PDF export
 */
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, ReferenceLine } from 'recharts'
import { fetchWindValue, fetchSolarValue, fetchBessValue } from '../../lib/dataService'
import { exportElementToPdf } from '../../lib/exportPdf'

export type ReportTech = 'wind' | 'solar' | 'bess'

const STATES = ['NSW', 'VIC', 'QLD', 'SA', 'TAS', 'WA'] as const

const TECH_CONFIG: Record<ReportTech, { label: string; icon: string; color: string }> = {
  wind:  { label: 'Wind',  icon: '💨', color: '#3b82f6' },
  solar: { label: 'Solar', icon: '☀️', color: '#f59e0b' },
  bess:  { label: 'BESS',  icon: '🔋', color: '#10b981' },
}

const GRADE_COLORS: Record<string, { bg: string; text: string }> = {
  A: { bg: '#dcfce7', text: '#166534' },
  B: { bg: '#dbeafe', text: '#1d4ed8' },
  C: { bg: '#fef3c7', text: '#92400e' },
  D: { bg: '#fee2e2', text: '#991b1b' },
}

const gradeLetter = (g?: string) => (g ? g.charAt(0).toUpperCase() : '–')

// Metric drivers per tech — what to rank by, what to display in tables, what to chart
type MetricKey = string
interface MetricDef {
  key: MetricKey
  label: string
  short: string
  fmt: (v: number | null | undefined) => string
  sub?: (v: number | null | undefined) => string
}

const WIND_METRICS: Record<string, MetricDef> = {
  cf:        { key: 'avg_cf_pct',          label: 'Capacity Factor',     short: 'CF',     fmt: v => v != null ? `${v.toFixed(1)}%` : '–' },
  capture:   { key: 'avg_capture_price',   label: 'Capture Price',       short: 'Cap.',   fmt: v => v != null ? `$${v.toFixed(0)}` : '–' },
  vf:        { key: 'avg_value_factor',    label: 'Value Factor',        short: 'VF',     fmt: v => v != null ? v.toFixed(2) : '–' },
  revenue:   { key: 'latest_revenue_per_mw', label: 'Revenue / MW',      short: 'Rev/MW', fmt: v => v != null ? `$${(v / 1000).toFixed(0)}k` : '–' },
}

const SOLAR_METRICS: Record<string, MetricDef> = {
  cf:        { key: 'avg_cf_pct',          label: 'Capacity Factor',     short: 'CF',     fmt: v => v != null ? `${v.toFixed(1)}%` : '–' },
  capture:   { key: 'avg_capture_price',   label: 'Capture Price',       short: 'Cap.',   fmt: v => v != null ? `$${v.toFixed(0)}` : '–' },
  vf:        { key: 'avg_value_factor',    label: 'Value Factor',        short: 'VF',     fmt: v => v != null ? v.toFixed(2) : '–' },
  revenue:   { key: 'avg_revenue_per_mw',  label: 'Revenue / MW',        short: 'Rev/MW', fmt: v => v != null ? `$${(v / 1000).toFixed(0)}k` : '–' },
}

const BESS_METRICS: Record<string, MetricDef> = {
  spread:    { key: 'avg_spread',          label: 'Arbitrage Spread',    short: 'Spread', fmt: v => v != null ? `$${v.toFixed(0)}` : '–' },
  rte:       { key: 'avg_round_trip_efficiency', label: 'Round-trip Eff.', short: 'RTE',  fmt: v => v != null ? `${(v * 100).toFixed(0)}%` : '–' },
  cycles:    { key: 'avg_cycles_per_year', label: 'Cycles / Year',       short: 'Cycles', fmt: v => v != null ? v.toFixed(0) : '–' },
  revenue:   { key: 'avg_revenue_per_mw',  label: 'Revenue / MW',        short: 'Rev/MW', fmt: v => v != null ? `$${(v / 1000).toFixed(0)}k` : '–' },
}

const METRICS_BY_TECH: Record<ReportTech, Record<string, MetricDef>> = {
  wind:  WIND_METRICS,
  solar: SOLAR_METRICS,
  bess:  BESS_METRICS,
}

// Default sort metric per tech
const DEFAULT_SORT: Record<ReportTech, string> = {
  wind:  'cf',
  solar: 'vf',
  bess:  'spread',
}

interface Project {
  id: string
  name: string
  state: string
  capacity_mw: number
  cod?: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value_summary?: any
  pros_cons?: { grade?: string; score?: number; pros?: string[]; cons?: string[] }
}

interface Props {
  tech: ReportTech
  state: string
  onTechChange: (t: ReportTech) => void
  onStateChange: (s: string) => void
}

export default function StateReportCard({ tech, state, onTechChange, onStateChange }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [sortMetric, setSortMetric] = useState<string>(DEFAULT_SORT[tech])
  const pdfRef = useRef<HTMLDivElement>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [showPdf, setShowPdf] = useState(false)

  // Reset sort metric when tech changes
  useEffect(() => { setSortMetric(DEFAULT_SORT[tech]) }, [tech])

  // Load value JSON for the selected tech
  useEffect(() => {
    setLoading(true)
    const fetcher = tech === 'wind' ? fetchWindValue : tech === 'solar' ? fetchSolarValue : fetchBessValue
    fetcher().then(d => { setData(d); setLoading(false) })
  }, [tech])

  const projectMap = data?.projects ?? {}
  const allProjects: Project[] = useMemo(() => {
    const arr: Project[] = []
    if (Array.isArray(projectMap)) {
      arr.push(...projectMap)
    } else if (projectMap && typeof projectMap === 'object') {
      for (const v of Object.values(projectMap)) arr.push(v as Project)
    }
    return arr
  }, [projectMap])

  const stateProjects = useMemo(() =>
    allProjects.filter(p => (p.state || '').toUpperCase() === state),
    [allProjects, state]
  )

  const stateAvg = data?.state_averages?.[state] ?? null

  const metrics = METRICS_BY_TECH[tech]
  const metricKeys = Object.keys(metrics)

  // Sorted by selected metric, descending
  const sortedProjects = useMemo(() => {
    const m = metrics[sortMetric]
    if (!m) return stateProjects
    return [...stateProjects].sort((a, b) => {
      const av = a.value_summary?.[m.key] ?? -Infinity
      const bv = b.value_summary?.[m.key] ?? -Infinity
      return (bv as number) - (av as number)
    })
  }, [stateProjects, sortMetric, metrics])

  // Grade distribution
  const gradeDist = useMemo(() => {
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, '–': 0 }
    for (const p of stateProjects) {
      const g = gradeLetter(p.pros_cons?.grade)
      counts[g] = (counts[g] || 0) + 1
    }
    return counts
  }, [stateProjects])

  // Capacity-weighted state KPIs
  const kpis = useMemo(() => computeKpis(stateProjects, tech), [stateProjects, tech])

  const handleExportPdf = useCallback(async () => {
    setPdfLoading(true)
    setShowPdf(true)
    await new Promise(r => setTimeout(r, 600))
    if (!pdfRef.current) {
      setShowPdf(false)
      setPdfLoading(false)
      return
    }
    try {
      const cfg = TECH_CONFIG[tech]
      await exportElementToPdf(pdfRef.current, {
        filename: `${state}_${tech}_state_report_card`,
        title: `${state} ${cfg.label} Fleet — State Report Card`,
        subtitle: `${stateProjects.length} projects · AURES Intelligence · ${new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      })
    } catch (err) {
      console.error('PDF export failed:', err)
      alert('PDF generation failed — please try again.')
    } finally {
      setShowPdf(false)
      setPdfLoading(false)
    }
  }, [tech, state, stateProjects.length])

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  const cfg = TECH_CONFIG[tech]

  return (
    <div className="space-y-4">
      {/* Tech + state selectors + Export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg overflow-hidden border border-[var(--color-border)]">
            {(Object.keys(TECH_CONFIG) as ReportTech[]).map(t => (
              <button key={t} onClick={() => onTechChange(t)}
                className={`px-3 py-1.5 text-xs font-medium ${tech === t ? 'text-white' : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)]'}`}
                style={tech === t ? { backgroundColor: TECH_CONFIG[t].color } : {}}
              >
                {TECH_CONFIG[t].icon} {TECH_CONFIG[t].label}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg overflow-hidden border border-[var(--color-border)]">
            {STATES.map(s => (
              <button key={s} onClick={() => onStateChange(s)}
                className={`px-2.5 py-1.5 text-xs ${state === s ? 'bg-blue-600 text-white' : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)]'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleExportPdf}
          disabled={pdfLoading || stateProjects.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pdfLoading ? <><span className="animate-spin inline-block">⏳</span> Generating…</> : <><span>📄</span> Export PDF</>}
        </button>
      </div>

      {stateProjects.length === 0 ? (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] border-dashed rounded-xl p-8 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            No {cfg.label.toLowerCase()} projects with operating value data in {state}.
          </p>
        </div>
      ) : (
        <>
          {/* State KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {kpis.map(k => (
              <div key={k.label} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
                <p className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)]">{k.label}</p>
                <p className="text-lg font-bold mt-0.5" style={{ color: k.color || 'var(--color-text)' }}>{k.value}</p>
                {k.sub && <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{k.sub}</p>}
              </div>
            ))}
          </div>

          {/* Grade distribution */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Grade Distribution — {stateProjects.length} {cfg.label} farms in {state}</p>
            <div className="flex h-8 rounded-lg overflow-hidden">
              {(['A', 'B', 'C', 'D', '–'] as const).map(g => {
                const n = gradeDist[g] || 0
                const pct = n / Math.max(stateProjects.length, 1) * 100
                if (pct === 0) return null
                const c = g === '–' ? { bg: '#475569', text: '#fff' } : GRADE_COLORS[g]
                return (
                  <div key={g} title={`Grade ${g}: ${n} farm${n === 1 ? '' : 's'}`}
                    className="flex items-center justify-center text-[11px] font-bold"
                    style={{ width: `${pct}%`, backgroundColor: c.bg, color: c.text }}>
                    {pct >= 8 ? `${g}: ${n}` : n}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">Rank by</span>
            <div className="flex rounded-lg overflow-hidden border border-[var(--color-border)]">
              {metricKeys.map(k => (
                <button key={k} onClick={() => setSortMetric(k)}
                  className={`px-2.5 py-1 text-[10px] font-medium ${sortMetric === k ? 'bg-blue-600 text-white' : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)]'}`}>
                  {metrics[k].label}
                </button>
              ))}
            </div>
          </div>

          {/* Project ranking table */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left p-3 text-[var(--color-text-muted)] font-medium text-xs">#</th>
                  <th className="text-left p-3 text-[var(--color-text-muted)] font-medium text-xs">Project</th>
                  <th className="text-center p-3 text-[var(--color-text-muted)] font-medium text-xs">Grade</th>
                  <th className="text-right p-3 text-[var(--color-text-muted)] font-medium text-xs">MW</th>
                  {metricKeys.map(k => (
                    <th key={k} className="text-right p-3 text-[var(--color-text-muted)] font-medium text-xs hidden md:table-cell">
                      {metrics[k].short}
                    </th>
                  ))}
                  <th className="text-left p-3 text-[var(--color-text-muted)] font-medium text-xs hidden lg:table-cell">Top strength / risk</th>
                </tr>
              </thead>
              <tbody>
                {sortedProjects.map((p, i) => {
                  const g = gradeLetter(p.pros_cons?.grade)
                  const gc = GRADE_COLORS[g] ?? { bg: '#475569', text: '#fff' }
                  const topPro = p.pros_cons?.pros?.[0]
                  const topCon = p.pros_cons?.cons?.[0]
                  return (
                    <tr key={p.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg)]/40">
                      <td className="p-3 text-[var(--color-text-muted)] text-xs">{i + 1}</td>
                      <td className="p-3">
                        <Link to={`/projects/${p.id}`} className="text-[var(--color-text)] hover:text-[var(--color-primary)] font-medium text-sm">
                          {p.name}
                        </Link>
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{ backgroundColor: gc.bg, color: gc.text }}>
                          {g}{p.pros_cons?.score != null ? ` · ${p.pros_cons.score.toFixed(1)}` : ''}
                        </span>
                      </td>
                      <td className="p-3 text-right text-[var(--color-text-muted)] text-xs">{Math.round(p.capacity_mw)}</td>
                      {metricKeys.map(k => {
                        const m = metrics[k]
                        const v = p.value_summary?.[m.key]
                        return (
                          <td key={k} className="p-3 text-right text-[var(--color-text)] text-xs hidden md:table-cell">
                            {m.fmt(v)}
                          </td>
                        )
                      })}
                      <td className="p-3 text-[10px] hidden lg:table-cell max-w-md">
                        {topPro && <p className="text-emerald-400 truncate">+ {topPro}</p>}
                        {topCon && <p className="text-rose-400 truncate">− {topCon}</p>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Hidden PDF — rendered off-screen for capture */}
          {showPdf && (
            <div ref={pdfRef} style={{ position: 'fixed', top: 0, left: '-10000px', pointerEvents: 'none', zIndex: 9999, width: 900 }}>
              <StateReportPdfSummary
                tech={tech}
                state={state}
                projects={sortedProjects}
                kpis={kpis}
                gradeDist={gradeDist}
                stateAvg={stateAvg}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ============================================================
// State KPIs
// ============================================================

interface KpiCard {
  label: string
  value: string
  sub?: string
  color?: string
}

function computeKpis(projects: Project[], tech: ReportTech): KpiCard[] {
  const totalMw = projects.reduce((a, p) => a + (p.capacity_mw || 0), 0)
  const fleetCount = projects.length

  // Capacity-weighted average for a given metric key
  const weighted = (key: string): number | null => {
    let num = 0, den = 0
    for (const p of projects) {
      const v = p.value_summary?.[key]
      const mw = p.capacity_mw || 0
      if (v != null && mw > 0) { num += v * mw; den += mw }
    }
    return den > 0 ? num / den : null
  }

  const fleetGrade = avgGradeScore(projects)

  const cards: KpiCard[] = [
    {
      label: 'Fleet Size',
      value: `${fleetCount} farms`,
      sub: `${(totalMw / 1000).toFixed(1)} GW total`,
    },
    {
      label: 'Avg Grade',
      value: fleetGrade.letter,
      sub: `${fleetGrade.score.toFixed(2)}/5.0`,
      color: GRADE_COLORS[fleetGrade.letter]?.text ?? '#475569',
    },
  ]

  if (tech === 'wind' || tech === 'solar') {
    const cf = weighted('avg_cf_pct')
    const vf = weighted('avg_value_factor')
    cards.push(
      { label: 'Cap-wtd CF', value: cf != null ? `${cf.toFixed(1)}%` : '–', color: '#3b82f6' },
      { label: 'Cap-wtd VF', value: vf != null ? vf.toFixed(2) : '–', sub: vf != null ? (vf >= 0.85 ? 'low cann.' : vf >= 0.65 ? 'moderate' : 'high cann.') : undefined, color: vf != null ? (vf >= 0.85 ? '#22c55e' : vf >= 0.65 ? '#f59e0b' : '#ef4444') : '#475569' },
    )
  } else {
    const spread = weighted('avg_spread')
    const rte = weighted('avg_round_trip_efficiency')
    cards.push(
      { label: 'Cap-wtd Spread', value: spread != null ? `$${spread.toFixed(0)}/MWh` : '–', color: '#22c55e' },
      { label: 'Cap-wtd RTE', value: rte != null ? `${(rte * 100).toFixed(0)}%` : '–', color: rte != null ? (rte >= 0.85 ? '#22c55e' : rte >= 0.75 ? '#f59e0b' : '#ef4444') : '#475569' },
    )
  }
  return cards
}

function avgGradeScore(projects: Project[]): { letter: string; score: number } {
  let sum = 0, n = 0, mw = 0
  for (const p of projects) {
    const s = p.pros_cons?.score
    const cap = p.capacity_mw || 0
    if (s != null && cap > 0) { sum += s * cap; mw += cap; n++ }
  }
  if (mw === 0) return { letter: '–', score: 0 }
  const avg = sum / mw
  const letter = avg >= 4 ? 'A' : avg >= 3 ? 'B' : avg >= 2 ? 'C' : 'D'
  return { letter, score: avg }
}

// ============================================================
// PDF summary — flat light-mode layout for export
// ============================================================

function StateReportPdfSummary({
  tech, state, projects, kpis, gradeDist,
}: {
  tech: ReportTech
  state: string
  projects: Project[]
  kpis: KpiCard[]
  gradeDist: Record<string, number>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stateAvg: any
}) {
  const cfg = TECH_CONFIG[tech]
  const today = new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })
  const metrics = METRICS_BY_TECH[tech]
  const metricKeys = Object.keys(metrics)

  const top5 = projects.slice(0, 5)
  const totalMw = projects.reduce((a, p) => a + (p.capacity_mw || 0), 0)

  // Distribution chart data — depends on tech
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const distMetric = tech === 'bess' ? metrics.spread : (metrics as any).cf
  const distLabel  = tech === 'bess' ? 'Spread $/MWh' : 'Capacity Factor %'
  const distData = projects
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((p: any) => ({
      name: p.name.replace(/ Wind Farm$| Solar Farm$| BESS$| Battery$/i, '').slice(0, 18),
      v: p.value_summary?.[distMetric.key] ?? 0,
      grade: gradeLetter(p.pros_cons?.grade),
    }))
    .filter((d: { v: number }) => d.v != null && d.v > 0)
    .sort((a: { v: number }, b: { v: number }) => b.v - a.v)
    .slice(0, 12)

  return (
    <div style={{ width: 900, backgroundColor: '#ffffff', color: '#0f172a', fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #e2e8f0' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>
            {state} {cfg.label} Fleet — State Report Card
          </h2>
          <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 0 0' }}>
            {projects.length} operating projects · {(totalMw / 1000).toFixed(2)} GW total · AURES Intelligence · {today}
          </p>
        </div>
        <div style={{ backgroundColor: cfg.color + '20', color: cfg.color, padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700 }}>
          {cfg.icon} {cfg.label}
        </div>
      </div>

      {/* State KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px' }}>
            <p style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{k.label}</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: k.color ?? '#0f172a', margin: '3px 0 2px 0' }}>{k.value}</p>
            {k.sub && <p style={{ fontSize: 9, color: '#64748b', margin: 0 }}>{k.sub}</p>}
          </div>
        ))}
      </div>

      {/* Methodology context */}
      <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: 12, marginBottom: 14 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>How Grades Are Assigned</p>
        <p style={{ fontSize: 10, color: '#475569', lineHeight: 1.5, margin: 0 }}>
          Each project receives an A/B/C/D grade based on a composite score across {tech === 'bess' ? 'arbitrage spread, round-trip efficiency, cycling rate, revenue per MW' : 'capacity factor, capture price, value factor (cannibalisation), and revenue per MW'}.
          Grades are <strong>relative</strong> to the {state} {cfg.label.toLowerCase()} fleet — an A-grade in {state} reflects strong performance in this state's specific market dynamics, not absolute outperformance vs national peers.
          Each project's strengths and risks below summarise the qualitative drivers behind that score.
        </p>
      </div>

      {/* Grade distribution bar */}
      <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 14 }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Grade Distribution — {projects.length} farms</p>
        <div style={{ display: 'flex', height: 28, borderRadius: 6, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          {(['A', 'B', 'C', 'D', '–'] as const).map(g => {
            const n = gradeDist[g] || 0
            const pct = n / Math.max(projects.length, 1) * 100
            if (pct === 0) return null
            const c = g === '–' ? { bg: '#cbd5e1', text: '#475569' } : GRADE_COLORS[g]
            return (
              <div key={g} style={{ width: `${pct}%`, backgroundColor: c.bg, color: c.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                {pct >= 6 ? `${g === '–' ? '?' : g}: ${n}` : n}
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 9, color: '#64748b' }}>
          {(['A', 'B', 'C', 'D'] as const).map(g => (
            <span key={g}>
              <span style={{ display: 'inline-block', width: 8, height: 8, backgroundColor: GRADE_COLORS[g].bg, borderRadius: 2, marginRight: 4 }}></span>
              Grade {g}: {gradeDist[g] || 0}
            </span>
          ))}
        </div>
      </div>

      {/* Top 5 with rationale */}
      <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 14 }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
          Top Performers — {state} {cfg.label}
        </p>
        {top5.map((p, i) => {
          const g = gradeLetter(p.pros_cons?.grade)
          const gc = GRADE_COLORS[g] ?? { bg: '#cbd5e1', text: '#475569' }
          const pros = p.pros_cons?.pros?.slice(0, 2) ?? []
          const cons = p.pros_cons?.cons?.slice(0, 2) ?? []
          return (
            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '20px 1fr auto', gap: 8, padding: '8px 0', borderTop: i === 0 ? 'none' : '1px solid #e2e8f0', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, lineHeight: '20px' }}>#{i + 1}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', margin: 0 }}>{p.name}</p>
                  <span style={{ backgroundColor: gc.bg, color: gc.text, padding: '1px 6px', borderRadius: 10, fontSize: 9, fontWeight: 700 }}>
                    {g}{p.pros_cons?.score != null ? ` · ${p.pros_cons.score.toFixed(1)}` : ''}
                  </span>
                  <span style={{ fontSize: 9, color: '#64748b' }}>{Math.round(p.capacity_mw)} MW</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {pros.length > 0 && (
                    <div>
                      {pros.map((s, j) => <p key={j} style={{ fontSize: 9, color: '#15803d', margin: '1px 0', lineHeight: 1.35 }}>+ {s}</p>)}
                    </div>
                  )}
                  {cons.length > 0 && (
                    <div>
                      {cons.map((s, j) => <p key={j} style={{ fontSize: 9, color: '#b91c1c', margin: '1px 0', lineHeight: 1.35 }}>− {s}</p>)}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, fontSize: 9, color: '#475569' }}>
                {metricKeys.slice(0, 2).map(k => {
                  const m = metrics[k]
                  return (
                    <div key={k} style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, color: '#94a3b8' }}>{m.short}</p>
                      <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>{m.fmt(p.value_summary?.[m.key])}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Distribution chart */}
      {distData.length > 1 && (
        <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
            Top {distData.length} Farms by {distLabel}
          </p>
          <BarChart width={848} height={Math.min(380, distData.length * 28 + 30)} data={distData} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 110 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 9, fill: '#475569' }} tickFormatter={(v: number) => tech === 'bess' ? `$${v}` : `${v.toFixed(0)}%`} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#475569' }} width={110} />
            <Bar dataKey="v" radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {distData.map((d: { grade: string }, i: number) => {
                const c = GRADE_COLORS[d.grade] ?? { bg: '#cbd5e1', text: '#475569' }
                return <Cell key={i} fill={c.bg} stroke={c.text} strokeWidth={1} />
              })}
            </Bar>
            {kpis.find(k => k.label.includes('Cap-wtd')) && tech !== 'bess' && (
              <ReferenceLine x={parseFloat(kpis[2].value)} stroke="#64748b" strokeDasharray="4 3"
                label={{ value: 'fleet avg', fill: '#475569', fontSize: 9, position: 'right' }} />
            )}
          </BarChart>
          <p style={{ fontSize: 9, color: '#64748b', margin: '4px 0 0 0', lineHeight: 1.5 }}>
            Bar colour reflects each farm's grade (green = A, blue = B, amber = C, red = D, grey = ungraded). Top {distData.length} of {projects.length} {state} {cfg.label.toLowerCase()} farms.
          </p>
        </div>
      )}

      {/* Full project list */}
      <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 14 }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
          All {state} {cfg.label} Farms — by Grade
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', color: '#64748b', paddingBottom: 5, fontWeight: 600, fontSize: 9 }}>#</th>
              <th style={{ textAlign: 'left', color: '#64748b', paddingBottom: 5, fontWeight: 600, fontSize: 9 }}>Project</th>
              <th style={{ textAlign: 'center', color: '#64748b', paddingBottom: 5, fontWeight: 600, fontSize: 9 }}>Grade</th>
              <th style={{ textAlign: 'right', color: '#64748b', paddingBottom: 5, fontWeight: 600, fontSize: 9 }}>MW</th>
              {metricKeys.map(k => (
                <th key={k} style={{ textAlign: 'right', color: '#64748b', paddingBottom: 5, fontWeight: 600, fontSize: 9 }}>{metrics[k].short}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projects.map((p, i) => {
              const g = gradeLetter(p.pros_cons?.grade)
              const gc = GRADE_COLORS[g] ?? { bg: '#cbd5e1', text: '#475569' }
              return (
                <tr key={p.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '4px 0', color: '#94a3b8', fontSize: 9 }}>{i + 1}</td>
                  <td style={{ padding: '4px 6px', color: '#0f172a', fontWeight: 500 }}>{p.name}</td>
                  <td style={{ padding: '4px 0', textAlign: 'center' }}>
                    <span style={{ backgroundColor: gc.bg, color: gc.text, padding: '1px 6px', borderRadius: 10, fontSize: 9, fontWeight: 700 }}>
                      {g}{p.pros_cons?.score != null ? ` · ${p.pros_cons.score.toFixed(1)}` : ''}
                    </span>
                  </td>
                  <td style={{ padding: '4px 0', textAlign: 'right', color: '#475569' }}>{Math.round(p.capacity_mw)}</td>
                  {metricKeys.map(k => {
                    const m = metrics[k]
                    const v = p.value_summary?.[m.key]
                    return (
                      <td key={k} style={{ padding: '4px 0', textAlign: 'right', color: '#0f172a' }}>{m.fmt(v)}</td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10 }}>
        <p style={{ fontSize: 9, color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: '#475569' }}>Data:</strong> AEMO dispatch &amp; settlement via OpenElectricity API.
          Grades are composite scores out of 5.0, derived from {tech === 'bess' ? 'arbitrage spread, round-trip efficiency, cycling rate, and revenue per MW' : 'capacity factor, capture price, value factor, and revenue per MW'} relative to the {state} fleet.
          Capacity-weighted means each project's contribution is scaled by its MW.
          Generated by AURES Intelligence.
        </p>
      </div>
    </div>
  )
}
