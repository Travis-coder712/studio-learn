// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TF = (v: any, n: any) => [string, string]
import { useState, useMemo, useRef, useCallback } from 'react'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend, Cell,
} from 'recharts'
import { useBessValueProject } from '../../hooks/useBessValue'
import { exportElementToPdf } from '../../lib/exportPdf'
import { fetchProject } from '../../lib/dataService'
import type { Project } from '../../lib/types'
import {
  ProjectProfileSection,
  ProjectEvolutionTimelineSection,
  NemSiteDataEssentialsSection,
} from './ValuePdfSections'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// ============================================================
// Constants
// ============================================================

const BAND_COLORS: Record<string, string> = {
  'negative': '#ef4444',
  '$0-50':    '#f59e0b',
  '$50-100':  '#84cc16',
  '$100-300': '#22c55e',
  '$300-1000':'#3b82f6',
  '$1000+':   '#8b5cf6',
}
const YEAR_COLORS: Record<number, string> = {
  2021: '#ec4899', 2022: '#f43f5e', 2023: '#f59e0b',
  2024: '#22c55e', 2025: '#3b82f6', 2026: '#06b6d4',
}
const tooltipStyle = {
  backgroundColor: '#111827', border: '1px solid #374151',
  borderRadius: '8px', fontSize: '11px', color: '#f1f5f9',
}
const tooltipLabelStyle = { color: '#94a3b8', marginBottom: 2, fontSize: 10 }

type TabId = 'valuation' | 'spread' | 'bands' | 'annual' | 'peers'

// ============================================================
// Shared helpers
// ============================================================

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
      {children}
    </p>
  )
}

function MetricCard({ label, value, sub, highlight }: {
  label: string; value: string; sub?: string
  highlight?: 'green' | 'yellow' | 'red' | 'blue' | 'purple'
}) {
  const colorMap = {
    green: '#22c55e', yellow: '#f59e0b', red: '#ef4444', blue: '#3b82f6', purple: '#8b5cf6',
  }
  const color = highlight ? colorMap[highlight] : 'var(--color-text)'
  return (
    <div className="bg-[var(--color-bg-elevated)] rounded-xl p-3 text-center">
      <p className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1">{label}</p>
      <p className="text-base font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5">{sub}</p>}
    </div>
  )
}

function GradeChip({ grade, score }: { grade?: string; score?: number }) {
  if (!grade) return null
  const color = grade.startsWith('A') ? '#22c55e' : grade.startsWith('B') ? '#3b82f6'
    : grade.startsWith('C') ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-[var(--color-text-muted)]">Value rating</span>
      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
        style={{ backgroundColor: `${color}20`, color }}>
        {grade}
      </span>
      {score !== undefined && (
        <span className="text-[10px] text-[var(--color-text-muted)]">{score.toFixed(1)}/5.0</span>
      )}
    </div>
  )
}

function ConfidenceBadge({ confidence }: { confidence?: string }) {
  if (!confidence) return null
  const cfg: Record<string, { label: string; color: string }> = {
    high:   { label: 'High confidence',   color: '#22c55e' },
    medium: { label: 'Medium confidence', color: '#f59e0b' },
    low:    { label: 'Low confidence',    color: '#ef4444' },
  }
  const c = cfg[confidence] ?? cfg.low
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold border"
      style={{ borderColor: `${c.color}40`, backgroundColor: `${c.color}15`, color: c.color }}>
      {c.label}
    </span>
  )
}

// ============================================================
// Main component
// ============================================================

interface Props { projectId: string }

export default function BessValueAnalysis({ projectId }: Props) {
  const { project, stateAvg, allStateProjects, loading } = useBessValueProject(projectId)
  const [activeTab, setActiveTab] = useState<TabId>('valuation')
  const pdfRef = useRef<HTMLDivElement>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [showPdf, setShowPdf] = useState(false)
  const [projectMeta, setProjectMeta] = useState<Project | null>(null)

  const handleExportPdf = useCallback(async () => {
    if (!project) return
    setPdfLoading(true)
    // Fetch full project JSON for the Project Profile section in the PDF
    const meta = await fetchProject('bess', projectId)
    setProjectMeta(meta)
    setShowPdf(true)
    await new Promise(r => setTimeout(r, 600))
    if (!pdfRef.current) {
      setShowPdf(false)
      setPdfLoading(false)
      return
    }
    try {
      await exportElementToPdf(pdfRef.current, {
        filename: `${project.name.replace(/\s+/g, '_')}_bess_value_analysis`,
        title: `BESS Value Analysis — ${project.name}`,
        subtitle: `${project.state} · ${project.capacity_mw} MW${project.duration_h ? ` · ${project.duration_h}h` : ''} · AURES Intelligence · ${new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      })
    } catch (err) {
      console.error('PDF export failed:', err)
      alert('PDF generation failed — please try again.')
    } finally {
      setShowPdf(false)
      setPdfLoading(false)
    }
  }, [project, projectId])

  if (loading) {
    return (
      <div className="space-y-3 mt-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }
  if (!project) {
    return (
      <div className="mt-4 bg-[var(--color-bg-card)] border border-[var(--color-border)] border-dashed rounded-xl p-6 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">BESS value data not yet available for this project.</p>
        <p className="text-[10px] text-[var(--color-text-muted)] mt-1">Run: python3 pipeline/importers/export_bess_value.py</p>
      </div>
    )
  }

  const tabs: { key: TabId; label: string }[] = [
    { key: 'valuation', label: '⚡ Valuation' },
    { key: 'spread',    label: '📈 Spread' },
    { key: 'bands',     label: '📊 Dispatch' },
    { key: 'annual',    label: '📅 Annual' },
    { key: 'peers',     label: '🏆 Peers' },
  ]

  return (
    <div className="mt-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2">
          <span>🔋</span> BESS Value Analysis
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPdf}
            disabled={pdfLoading}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pdfLoading ? <><span className="animate-spin inline-block">⏳</span> Generating…</> : <><span>📄</span> Export PDF</>}
          </button>
          <ConfidenceBadge confidence={project.value_summary?.data_confidence} />
          <GradeChip grade={project.pros_cons?.grade} score={project.pros_cons?.score} />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0.5 bg-[var(--color-bg-card)] rounded-lg p-0.5 border border-[var(--color-border)] overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex-none px-3 py-1.5 rounded-md text-[10px] font-medium whitespace-nowrap transition-colors ${
              activeTab === t.key
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'valuation' && <ValuationTab project={project} stateAvg={stateAvg} />}
      {activeTab === 'spread'    && <SpreadTab project={project} />}
      {activeTab === 'bands'     && <BandsTab project={project} />}
      {activeTab === 'annual'    && <AnnualTab project={project} />}
      {activeTab === 'peers'     && <PeersTab project={project} allStateProjects={allStateProjects} />}

      {/* Hidden PDF summary — rendered off-screen during export */}
      {showPdf && (
        <div ref={pdfRef} style={{ position: 'fixed', top: 0, left: '-10000px', pointerEvents: 'none', zIndex: 9999, width: 900 }}>
          <BessValuePdfSummary project={project} stateAvg={stateAvg} allStateProjects={allStateProjects} projectMeta={projectMeta} />
        </div>
      )}
    </div>
  )
}

// ============================================================
// Valuation tab
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ValuationTab({ project, stateAvg }: { project: any; stateAvg: any }) {
  const vs = project.value_summary ?? {}
  const pc = project.pros_cons
  const sr = project.state_rank

  const spreadHighlight = (spread: number | null) => {
    if (spread == null) return undefined
    return spread >= 200 ? 'green' : spread >= 100 ? 'yellow' : 'red' as const
  }

  const dimensions = [
    {
      icon: '💱',
      title: 'Price Spread',
      explain: `The core BESS profit driver: average discharge (sell) price minus average charge (buy) price. A spread of $100/MWh means the battery earns $100 for every MWh of stored energy cycled. Higher spread = more valuable arbitrage opportunity.`,
      value: vs.avg_spread != null ? `$${vs.avg_spread.toFixed(0)}/MWh` : '–',
      bench: stateAvg?.median_spread != null ? `$${stateAvg.median_spread.toFixed(0)} state median` : null,
      signal: vs.avg_spread != null ? (vs.avg_spread >= 200 ? 'good' : vs.avg_spread >= 100 ? 'ok' : 'warn') : 'neutral',
    },
    {
      icon: '📈',
      title: 'Spread Trend',
      explain: `Whether the arbitrage spread is widening (improving) or compressing (declining). As more batteries enter the market, they reduce the price spikes that BESS profits from. Declining trends indicate increasing competition from storage.`,
      value: vs.spread_trend ? vs.spread_trend.charAt(0).toUpperCase() + vs.spread_trend.slice(1) : '–',
      bench: null,
      signal: vs.spread_trend === 'improving' ? 'good' : vs.spread_trend === 'declining' ? 'warn' : 'ok',
    },
    {
      icon: '⚡',
      title: 'Utilisation',
      explain: `Percentage of time the battery was actively discharging energy to the grid. Higher utilisation means more cycles and more revenue opportunities captured. Low utilisation may indicate FCAS-focused operation or dispatch limitations.`,
      value: vs.avg_utilisation_pct != null ? `${vs.avg_utilisation_pct.toFixed(1)}%` : '–',
      bench: stateAvg?.median_utilisation_pct != null ? `${stateAvg.median_utilisation_pct.toFixed(1)}% state median` : null,
      signal: sr?.utilisation_percentile != null
        ? (sr.utilisation_percentile >= 60 ? 'good' : sr.utilisation_percentile >= 35 ? 'ok' : 'warn') : 'neutral',
    },
    {
      icon: '🔄',
      title: 'Annual Cycles',
      explain: `Full charge-discharge cycles per year. One cycle = fully depleting the battery's storage capacity once. More cycles = more revenue. Note: cycles may appear low if the battery operates in FCAS reserve mode (charging/discharging frequently but in small amounts).`,
      value: vs.avg_cycles_per_year != null ? `${vs.avg_cycles_per_year.toFixed(0)} cycles/yr` : '–',
      bench: null,
      signal: vs.avg_cycles_per_year != null
        ? (vs.avg_cycles_per_year >= 200 ? 'good' : vs.avg_cycles_per_year >= 50 ? 'ok' : 'warn') : 'neutral',
    },
    {
      icon: '💰',
      title: 'Revenue per MW',
      explain: `Annualised market revenue per MW of discharge capacity. Combines both frequency of use (cycles) and spread quality. Comparable across batteries of different sizes. FCAS revenue is not included here — actual revenue may be higher.`,
      value: vs.avg_revenue_per_mw != null ? `$${(vs.avg_revenue_per_mw / 1000).toFixed(0)}k/MW/yr` : '–',
      bench: stateAvg?.median_revenue_per_mw != null ? `$${(stateAvg.median_revenue_per_mw / 1000).toFixed(0)}k state median` : null,
      signal: sr?.revenue_per_mw_rank != null && sr?.revenue_per_mw_total != null
        ? (sr.revenue_per_mw_rank / sr.revenue_per_mw_total < 0.4 ? 'good' : sr.revenue_per_mw_rank / sr.revenue_per_mw_total < 0.7 ? 'ok' : 'warn')
        : 'neutral',
    },
  ]

  const signalDot = (s: string) => ({
    good: '🟢', ok: '🟡', warn: '🔴', neutral: '⚪',
  }[s] ?? '⚪')

  return (
    <div className="space-y-5">
      {/* Headline metrics */}
      <div className="grid grid-cols-3 gap-2">
        <MetricCard
          label="Avg Spread"
          value={vs.avg_spread != null ? `$${vs.avg_spread.toFixed(0)}` : '–'}
          sub={stateAvg?.median_spread != null ? `$${stateAvg.median_spread.toFixed(0)} state` : undefined}
          highlight={spreadHighlight(vs.avg_spread)}
        />
        <MetricCard
          label="Utilisation"
          value={vs.avg_utilisation_pct != null ? `${vs.avg_utilisation_pct.toFixed(1)}%` : '–'}
          sub="time discharging"
          highlight="blue"
        />
        <MetricCard
          label="Rev/MW"
          value={vs.avg_revenue_per_mw != null ? `$${(vs.avg_revenue_per_mw / 1000).toFixed(0)}k` : '–'}
          sub="energy revenue only"
          highlight="purple"
        />
      </div>

      {/* BESS value framework */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
        <p className="text-[11px] font-semibold text-blue-400 mb-1">🔋 How BESS Creates Value</p>
        <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
          A battery earns by buying cheap energy (charging when prices are low or negative) and
          selling it at high prices (discharging during demand peaks or constraint events).
          The <strong className="text-[var(--color-text)]">spread</strong> measures this arbitrage margin.
          Revenue is also earned through <strong className="text-[var(--color-text)]">FCAS</strong> (frequency
          regulation) services — which can exceed energy arbitrage revenue for well-positioned batteries —
          though FCAS revenue is not captured in this analysis. Data shown here is wholesale energy market only.
        </p>
      </div>

      {/* Value dimensions */}
      <div>
        <SectionTitle>Value drivers</SectionTitle>
        <div className="space-y-2">
          {dimensions.map(d => (
            <div key={d.title} className="bg-[var(--color-bg-elevated)] rounded-xl p-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-[var(--color-text)]">
                  {d.icon} {d.title}
                </span>
                <div className="flex items-center gap-2">
                  {d.bench && (
                    <span className="text-[9px] text-[var(--color-text-muted)]">{d.bench}</span>
                  )}
                  <span className="text-xs font-bold text-[var(--color-text)]">{d.value}</span>
                  <span className="text-xs">{signalDot(d.signal)}</span>
                </div>
              </div>
              <p className="text-[9px] text-[var(--color-text-muted)] leading-relaxed">{d.explain}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pros / Cons */}
      {pc && (pc.pros.length > 0 || pc.cons.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {pc.pros.length > 0 && (
            <div className="bg-[var(--color-bg-card)] border border-green-500/20 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-green-400 uppercase tracking-wider mb-2">
                ✅ Value Strengths
              </p>
              <ul className="space-y-1.5">
                {pc.pros.map((p: string, i: number) => (
                  <li key={i} className="text-[11px] text-[var(--color-text)] leading-relaxed flex gap-2">
                    <span className="text-green-400 shrink-0">+</span><span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {pc.cons.length > 0 && (
            <div className="bg-[var(--color-bg-card)] border border-red-500/20 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-2">
                ⚠️ Value Risks
              </p>
              <ul className="space-y-1.5">
                {pc.cons.map((c: string, i: number) => (
                  <li key={i} className="text-[11px] text-[var(--color-text)] leading-relaxed flex gap-2">
                    <span className="text-red-400 shrink-0">−</span><span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <p className="text-[9px] text-[var(--color-text-muted)] italic">
        ⚠️ Note: FCAS (frequency control ancillary services) revenue is not included in this analysis.
        For many batteries, FCAS contributes significantly to total revenue and may substantially exceed the energy arbitrage figures shown here.
      </p>
    </div>
  )
}

// ============================================================
// Spread tab — monthly spread, discharge and charge prices
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SpreadTab({ project }: { project: any }) {
  const monthlyData = useMemo(() => {
    const raw = project.monthly_data ?? []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return raw.map((m: any) => ({
      period: `${m.year}-${String(m.month).padStart(2, '0')}`,
      label: `${m.month}/${String(m.year).slice(2)}`,
      discharge: m.avg_discharge_price ?? null,
      charge: m.avg_charge_price ?? null,
      spread: m.spread ?? null,
      pool: m.pool_price ?? null,
    })).filter((m: { spread: number | null }) => m.spread != null)
  }, [project])

  if (monthlyData.length === 0) {
    return <p className="text-xs text-[var(--color-text-muted)] py-4">No monthly spread data available.</p>
  }

  // Show only last 24 months to keep chart readable
  const displayData = monthlyData.slice(-24)

  return (
    <div className="space-y-5">
      {/* Spread over time */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
        <p className="text-[11px] font-semibold text-[var(--color-text)] mb-0.5">Monthly Price Spread</p>
        <p className="text-[9px] text-[var(--color-text-muted)] mb-3">
          Discharge price − charge price per month. Positive = earning. Negative = charging cost exceeded revenue in that month (often due to FCAS strategy or low-cycle months with atypical pricing).
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={displayData} margin={{ top: 4, right: 16, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 8 }}
              interval={Math.floor(displayData.length / 6)} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 9 }} tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle}
              formatter={((v: number, n: string) => [`$${v?.toFixed(0)}/MWh`, n]) as TF} />
            <Legend wrapperStyle={{ fontSize: 9 }}
              formatter={(v: string) => v === 'discharge' ? 'Discharge price' : v === 'charge' ? 'Charge price' : 'Spread'} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
            <Line type="monotone" dataKey="discharge" stroke="#22c55e" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="charge" stroke="#ef4444" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="spread" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 2, fill: '#3b82f6' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Pool price reference */}
      {displayData.some((d: { pool: number | null }) => d.pool != null) && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
          <p className="text-[11px] font-semibold text-[var(--color-text)] mb-0.5">Discharge vs Pool Price</p>
          <p className="text-[9px] text-[var(--color-text-muted)] mb-3">
            How the battery's discharge price compares to the regional pool average. A battery discharging above pool price is capturing high-value events — spikes, constraints, evening ramps.
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={displayData} margin={{ top: 4, right: 16, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 8 }}
                interval={Math.floor(displayData.length / 6)} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 9 }} tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle}
                formatter={((v: number, n: string) => [`$${v?.toFixed(0)}/MWh`, n === 'discharge' ? 'Discharge price' : 'Pool price']) as TF} />
              <Legend wrapperStyle={{ fontSize: 9 }}
                formatter={(v: string) => v === 'discharge' ? 'Discharge price' : 'Pool avg'} />
              <Line type="monotone" dataKey="pool" stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
              <Line type="monotone" dataKey="discharge" stroke="#22c55e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Bands tab — GEN vs LOAD dispatch by price band
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BandsTab({ project }: { project: any }) {
  const bandData = useMemo(() => {
    const bbd = project.bess_band_data
    if (!bbd?.monthly) return null

    const BAND_ORDER = ['negative', '$0-50', '$50-100', '$100-300', '$300-1000', '$1000+']
    const totals: Record<string, { gen: number; load: number }> = {}
    for (const label of BAND_ORDER) totals[label] = { gen: 0, load: 0 }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const monthData of Object.values(bbd.monthly) as any[]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const band of (monthData.GEN ?? []) as any[]) {
        if (totals[band.label]) totals[band.label].gen += band.energy_mwh ?? 0
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const band of (monthData.LOAD ?? []) as any[]) {
        if (totals[band.label]) totals[band.label].load += band.energy_mwh ?? 0
      }
    }

    const totalGen = BAND_ORDER.reduce((s, l) => s + totals[l].gen, 0)
    const totalLoad = BAND_ORDER.reduce((s, l) => s + totals[l].load, 0)

    return BAND_ORDER.map(label => ({
      label,
      gen_pct: totalGen > 0 ? Math.round(totals[label].gen / totalGen * 1000) / 10 : 0,
      load_pct: totalLoad > 0 ? Math.round(totals[label].load / totalLoad * 1000) / 10 : 0,
      fill: BAND_COLORS[label] ?? '#6b7280',
    }))
  }, [project])

  if (!bandData) {
    return (
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] border-dashed rounded-xl p-6 text-center mt-2">
        <p className="text-xs text-[var(--color-text-muted)]">5-minute dispatch band data not yet available for this battery.</p>
        <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
          Run: python3 pipeline/importers/import_bess_band_capture.py --all-cached
        </p>
      </div>
    )
  }

  // Score: ideal BESS dispatches at high price bands and charges at low/negative bands
  const genHighPct = (bandData.find(d => d.label === '$100-300')?.gen_pct ?? 0)
    + (bandData.find(d => d.label === '$300-1000')?.gen_pct ?? 0)
    + (bandData.find(d => d.label === '$1000+')?.gen_pct ?? 0)
  const loadLowPct = (bandData.find(d => d.label === 'negative')?.load_pct ?? 0)
    + (bandData.find(d => d.label === '$0-50')?.load_pct ?? 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Discharge (GEN) by price band */}
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
          <p className="text-[11px] font-semibold text-green-400 mb-0.5">⬆ Discharge (GEN) by Price Band</p>
          <p className="text-[9px] text-[var(--color-text-muted)] mb-3">
            Where the battery sells energy. More in high-price bands = better arbitrage.
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={bandData} layout="vertical" margin={{ top: 4, right: 32, bottom: 0, left: 44 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 9 }} tickFormatter={(v: number) => `${v}%`} />
              <YAxis type="category" dataKey="label" tick={{ fill: '#9ca3af', fontSize: 8 }} width={56} />
              <Tooltip contentStyle={tooltipStyle}
                formatter={((v: number) => [`${v?.toFixed(1)}%`, 'Discharge %']) as TF} />
              <Bar dataKey="gen_pct" radius={[0, 3, 3, 0]}>
                {bandData.map(d => <Cell key={d.label} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Charge (LOAD) by price band */}
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
          <p className="text-[11px] font-semibold text-red-400 mb-0.5">⬇ Charge (LOAD) by Price Band</p>
          <p className="text-[9px] text-[var(--color-text-muted)] mb-3">
            Where the battery buys energy. More in low/negative bands = smarter charging.
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={bandData} layout="vertical" margin={{ top: 4, right: 32, bottom: 0, left: 44 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 9 }} tickFormatter={(v: number) => `${v}%`} />
              <YAxis type="category" dataKey="label" tick={{ fill: '#9ca3af', fontSize: 8 }} width={56} />
              <Tooltip contentStyle={tooltipStyle}
                formatter={((v: number) => [`${v?.toFixed(1)}%`, 'Charge %']) as TF} />
              <Bar dataKey="load_pct" radius={[0, 3, 3, 0]}>
                {bandData.map(d => <Cell key={d.label} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary insight */}
      <div className={`border rounded-xl p-3 ${genHighPct >= 30 && loadLowPct >= 30 ? 'bg-green-500/10 border-green-500/30' : 'bg-[var(--color-bg-card)] border-[var(--color-border)]'}`}>
        <p className="text-[10px] font-semibold text-[var(--color-text)] mb-1">Dispatch quality</p>
        <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
          {genHighPct.toFixed(1)}% of discharge is at prices above $100/MWh.{' '}
          {loadLowPct.toFixed(1)}% of charging is at prices below $50/MWh or negative.{' '}
          {genHighPct >= 30 && loadLowPct >= 30
            ? 'This battery is effectively capturing high-price discharge and low-price charge opportunities.'
            : genHighPct < 20
            ? 'Relatively low proportion of high-price dispatch — the battery may be missing price spikes or operating primarily in FCAS mode.'
            : 'Moderate dispatch profile.'}
        </p>
      </div>
    </div>
  )
}

// ============================================================
// Annual tab — cycles, utilisation, revenue by year
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AnnualTab({ project }: { project: any }) {
  const annualData = useMemo(() => {
    const raw = project.annual_data ?? []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return raw.map((a: any) => ({
      year: String(a.year),
      spread: a.spread ?? null,
      cycles: a.cycles ?? null,
      utilisation: a.utilisation_pct ?? null,
      revMw: a.revenue_per_mw != null ? Math.round(a.revenue_per_mw / 1000) : null,
    })).filter((a: { spread: number | null; cycles: number | null }) => a.spread != null || a.cycles != null)
  }, [project])

  if (annualData.length === 0) {
    return <p className="text-xs text-[var(--color-text-muted)] py-4">No annual data available.</p>
  }

  return (
    <div className="space-y-5">
      {/* Annual spread */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
        <p className="text-[11px] font-semibold text-[var(--color-text)] mb-0.5">Annual Average Spread</p>
        <p className="text-[9px] text-[var(--color-text-muted)] mb-3">
          Average discharge minus charge price per year. Shows whether arbitrage margins are widening or compressing as more storage enters.
        </p>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={annualData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="year" tick={{ fill: '#9ca3af', fontSize: 9 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 9 }} tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle}
              formatter={((v: number) => [`$${v?.toFixed(0)}/MWh`, 'Spread']) as TF} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
            <Bar dataKey="spread" radius={[3, 3, 0, 0]}>
              {annualData.map((d: { year: string; spread: number | null; [k: string]: unknown }) => (
                <Cell key={d.year}
                  fill={(d.spread ?? 0) >= 0 ? (YEAR_COLORS[Number(d.year)] ?? '#22c55e') : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Annual cycles + revenue */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
        <p className="text-[11px] font-semibold text-[var(--color-text)] mb-0.5">Annual Cycles &amp; Revenue/MW</p>
        <p className="text-[9px] text-[var(--color-text-muted)] mb-3">
          Full cycles per year (bars) and revenue per MW in $k (line). Growing cycles indicate the battery is being dispatched more actively as it ramps up operations.
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={annualData} margin={{ top: 4, right: 48, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="year" tick={{ fill: '#9ca3af', fontSize: 9 }} />
            <YAxis yAxisId="left" tick={{ fill: '#9ca3af', fontSize: 9 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: '#9ca3af', fontSize: 9 }}
              tickFormatter={(v: number) => `$${v}k`} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle}
              formatter={((v: number, n: string) => [
                n === 'cycles' ? `${v?.toFixed(0)} cycles` : `$${v?.toFixed(0)}k/MW`, n,
              ]) as TF} />
            <Legend wrapperStyle={{ fontSize: 9 }} />
            <Bar yAxisId="left" dataKey="cycles" name="cycles" fill="#3b82f6" radius={[3, 3, 0, 0]} opacity={0.8} />
            <Line yAxisId="right" type="monotone" dataKey="revMw" name="Rev/MW ($k)"
              stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ============================================================
// Peers tab — state comparison
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PeersTab({ project, allStateProjects }: { project: any; allStateProjects: any[] }) {
  const peers = useMemo(() => {
    return allStateProjects
      .map(p => ({
        name: p.name as string,
        id: p.id as string,
        spread: p.value_summary?.avg_spread as number | null,
        util: p.value_summary?.avg_utilisation_pct as number | null,
        revMw: p.value_summary?.avg_revenue_per_mw as number | null,
        isSelf: p.id === project.id,
      }))
      .filter(p => p.spread != null)
      .sort((a, b) => (b.spread ?? 0) - (a.spread ?? 0))
  }, [allStateProjects, project.id])

  if (peers.length <= 1) {
    return <p className="text-xs text-[var(--color-text-muted)] py-4">Not enough peer data available.</p>
  }

  return (
    <div className="space-y-4">
      {/* Spread by peer */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
        <p className="text-[11px] font-semibold text-[var(--color-text)] mb-0.5">
          Average Spread — {project.state} Peers
        </p>
        <p className="text-[9px] text-[var(--color-text-muted)] mb-3">
          Average discharge − charge price. Higher spread = more valuable arbitrage. Note: FCAS revenue not included.
        </p>
        <ResponsiveContainer width="100%" height={Math.max(120, peers.length * 24)}>
          <BarChart data={peers} layout="vertical" margin={{ top: 4, right: 48, bottom: 0, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 9 }}
              tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
            <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 8 }} width={130}
              tickFormatter={(v: string) => v.length > 20 ? v.slice(0, 18) + '…' : v} />
            <Tooltip contentStyle={tooltipStyle}
              formatter={((v: number) => [`$${v?.toFixed(0)}/MWh`, 'Avg Spread']) as TF} />
            <ReferenceLine x={0} stroke="rgba(255,255,255,0.15)" />
            <Bar dataKey="spread" radius={[0, 3, 3, 0]}>
              {peers.map(p => (
                <Cell key={p.id} fill={p.isSelf ? '#f59e0b' : '#3b82f6'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-3 mt-2 text-[9px] text-[var(--color-text-muted)]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#f59e0b] inline-block" /> This project</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#3b82f6] inline-block" /> State peers</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// PDF summary — flat light-mode layout for export
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function computeBessKeyFindings(project: any, stateAvg: any): string[] {
  const vs = project.value_summary ?? {}
  const sr = project.state_rank
  const findings: string[] = []

  if (vs.avg_spread != null) {
    const stateSpread = stateAvg?.avg_spread
    const rank = sr?.spread_percentile != null ? ` — top ${Math.round(100 - sr.spread_percentile)}% of ${project.state} fleet` : ''
    if (stateSpread != null) {
      const diff = vs.avg_spread - stateSpread
      if (Math.abs(diff) >= 5) {
        findings.push(`Arbitrage spread: $${vs.avg_spread.toFixed(0)}/MWh (${diff > 0 ? '+' : ''}$${diff.toFixed(0)} vs ${project.state} average $${stateSpread.toFixed(0)})${rank}.`)
      } else {
        findings.push(`Arbitrage spread: $${vs.avg_spread.toFixed(0)}/MWh — in line with ${project.state} fleet ($${stateSpread.toFixed(0)})${rank}.`)
      }
    } else {
      findings.push(`Arbitrage spread: $${vs.avg_spread.toFixed(0)}/MWh${rank}.`)
    }
  }

  if (vs.spread_trend) {
    const t = vs.spread_trend
    if (t === 'improving') findings.push(`Trend: arbitrage spread is widening — discharge prices climbing or charge prices falling. Often reflects deeper midday solar troughs and stronger evening peaks.`)
    else if (t === 'declining') findings.push(`Trend: arbitrage spread is narrowing — more BESS competing for the same arbitrage may be eroding returns.`)
    else findings.push(`Trend: arbitrage spread is stable — no material change in the discharge/charge gap year-on-year.`)
  }

  if (vs.avg_round_trip_efficiency != null) {
    const rte = vs.avg_round_trip_efficiency * 100
    if (rte >= 85) findings.push(`Round-trip efficiency ${rte.toFixed(0)}% — strong, consistent with modern Li-ion BESS in good operating condition.`)
    else if (rte >= 75) findings.push(`Round-trip efficiency ${rte.toFixed(0)}% — moderate. Some opportunity loss vs ideal, may reflect older chemistry or transmission auxiliary loads.`)
    else findings.push(`Round-trip efficiency ${rte.toFixed(0)}% — low. Significant value leakage; investigate chemistry, age, and operating profile.`)
  }

  if (vs.avg_cycles_per_year != null) {
    const c = vs.avg_cycles_per_year
    if (c >= 350) findings.push(`Cycling rate ${c.toFixed(0)} full-equivalent cycles/yr — heavy use, near or above warranty assumptions; revenue/MW likely strong but watch degradation.`)
    else if (c >= 200) findings.push(`Cycling rate ${c.toFixed(0)} cycles/yr — typical merchant arbitrage operation.`)
    else findings.push(`Cycling rate ${c.toFixed(0)} cycles/yr — light use; either FCAS-focused, contracted, or under-dispatching merchant opportunity.`)
  }

  if (vs.avg_utilisation_pct != null) {
    findings.push(`Utilisation ${vs.avg_utilisation_pct.toFixed(0)}% — share of available power-hours used for energy arbitrage (excludes idle and FCAS-only intervals).`)
  }

  if (vs.avg_revenue_per_mw != null) {
    findings.push(`Revenue per MW: $${(vs.avg_revenue_per_mw / 1000).toFixed(0)}k/MW/yr from arbitrage. Excludes FCAS, capacity payments, and offtake contract uplift.`)
  }

  return findings
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BessValuePdfSummary({ project, stateAvg, allStateProjects, projectMeta }: { project: any; stateAvg: any; allStateProjects: any[]; projectMeta: Project | null }) {
  const vs = project.value_summary ?? {}
  const sr = project.state_rank
  const pc = project.pros_cons
  const today = new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })

  const annualData = (project.annual_data || []).map((a: { year: number; spread?: number | null; avg_discharge_price?: number | null; avg_charge_price?: number | null }) => ({
    year: String(a.year),
    spread: a.spread ?? null,
    discharge: a.avg_discharge_price ?? null,
    charge: a.avg_charge_price ?? null,
  }))

  const monthlySpread = (project.monthly_data || []).slice(-24).map((m: { year: number; month: number; spread?: number | null }) => ({
    label: `${MONTH_LABELS[(m.month - 1) || 0]?.slice(0, 3)} ${String(m.year).slice(-2)}`,
    spread: m.spread ?? null,
  }))

  const peerData = [...allStateProjects]
    .sort((a: { value_summary?: { avg_spread?: number | null } }, b: { value_summary?: { avg_spread?: number | null } }) => (b.value_summary?.avg_spread ?? 0) - (a.value_summary?.avg_spread ?? 0))
    .slice(0, 8)
    .map((p: { id: string; name: string; value_summary?: { avg_spread?: number | null } }) => ({
      name: p.name.replace(/ BESS$/i, '').replace(/ Battery$/i, '').slice(0, 18),
      spread: p.value_summary?.avg_spread ?? 0,
      isThis: p.id === project.id,
    }))

  const gradeColor = pc?.grade?.startsWith('A') ? '#166534' : pc?.grade?.startsWith('B') ? '#1d4ed8' : '#92400e'
  const gradeBg    = pc?.grade?.startsWith('A') ? '#dcfce7' : pc?.grade?.startsWith('B') ? '#dbeafe' : '#fef3c7'

  const keyFindings = computeBessKeyFindings(project, stateAvg)

  return (
    <div style={{ width: 900, backgroundColor: '#ffffff', color: '#0f172a', fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #e2e8f0' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>{project.name}</h2>
          <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 0 0' }}>
            {project.state} · {project.capacity_mw} MW{project.duration_h ? ` · ${project.duration_h}h` : ''}{project.storage_mwh ? ` (${project.storage_mwh} MWh)` : ''} · BESS Value Analysis · {today}
          </p>
        </div>
        {pc?.grade && (
          <div style={{ backgroundColor: gradeBg, color: gradeColor, padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700 }}>
            {pc.grade} · {pc.score?.toFixed(1)}/5.0
          </div>
        )}
      </div>

      {/* Project Profile · Evolution Timeline (shared) */}
      <ProjectProfileSection projectMeta={projectMeta} tech="bess" />
      <ProjectEvolutionTimelineSection projectMeta={projectMeta} />

      {/* Headline metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Arbitrage Spread', value: vs.avg_spread != null ? `$${vs.avg_spread.toFixed(0)}/MWh` : '–', sub: stateAvg?.avg_spread != null ? `$${stateAvg.avg_spread.toFixed(0)} state avg` : undefined, color: '#22c55e' },
          { label: 'Round-trip Efficiency', value: vs.avg_round_trip_efficiency != null ? `${(vs.avg_round_trip_efficiency * 100).toFixed(0)}%` : '–', sub: vs.avg_round_trip_efficiency != null ? (vs.avg_round_trip_efficiency >= 0.85 ? 'Strong' : vs.avg_round_trip_efficiency >= 0.75 ? 'Moderate' : 'Low') : undefined, color: vs.avg_round_trip_efficiency != null ? (vs.avg_round_trip_efficiency >= 0.85 ? '#22c55e' : vs.avg_round_trip_efficiency >= 0.75 ? '#f59e0b' : '#ef4444') : '#475569' },
          { label: 'Cycles per Year', value: vs.avg_cycles_per_year != null ? `${vs.avg_cycles_per_year.toFixed(0)}` : '–', sub: vs.avg_cycles_per_year != null ? (vs.avg_cycles_per_year >= 350 ? 'Heavy' : vs.avg_cycles_per_year >= 200 ? 'Typical' : 'Light') : undefined, color: '#8b5cf6' },
          { label: 'Revenue per MW', value: vs.avg_revenue_per_mw != null ? `$${(vs.avg_revenue_per_mw / 1000).toFixed(0)}k/yr` : '–', sub: stateAvg?.avg_revenue_per_mw != null ? `$${(stateAvg.avg_revenue_per_mw / 1000).toFixed(0)}k state` : undefined, color: '#3b82f6' },
        ].map((m, i) => (
          <div key={i} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px' }}>
            <p style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{m.label}</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: m.color, margin: '3px 0 2px 0' }}>{m.value}</p>
            {m.sub && <p style={{ fontSize: 9, color: '#64748b', margin: 0 }}>{m.sub}</p>}
          </div>
        ))}
      </div>

      {/* Arbitrage context */}
      <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: 12, marginBottom: 14 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>How BESS Earns</p>
        <p style={{ fontSize: 10, color: '#475569', lineHeight: 1.5, margin: 0 }}>
          BESS revenue comes from buying low and selling high — the <strong>arbitrage spread</strong> = average discharge price − average charge price. Discharge prices climb in the evening peak and during scarcity events; charge prices fall in midday solar troughs and overnight lulls. Round-trip efficiency (typical Li-ion: 80–88%) reduces realised spread because some energy is lost charging then discharging. Cycles per year drives total revenue; warranty assumptions are typically 350–500 full cycles/yr.
        </p>
      </div>

      {/* Key findings */}
      {keyFindings.length > 0 && (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px 0' }}>Key Findings</p>
          <ul style={{ margin: 0, padding: '0 0 0 14px' }}>
            {keyFindings.map((f, i) => (
              <li key={i} style={{ fontSize: 10, color: '#0f172a', lineHeight: 1.6, marginBottom: 4 }}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Annual spread trend */}
      {annualData.length > 0 && (
        <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Annual Discharge / Charge / Spread ($/MWh)</p>
          <BarChart width={848} height={170} data={annualData} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#475569' }} />
            <YAxis tick={{ fontSize: 10, fill: '#475569' }} tickFormatter={v => `$${v}`} />
            <Bar dataKey="discharge" fill="#22c55e" name="Discharge" isAnimationActive={false} />
            <Bar dataKey="charge"    fill="#ef4444" name="Charge"    isAnimationActive={false} />
            <Bar dataKey="spread"    fill="#3b82f6" name="Spread"    isAnimationActive={false} />
          </BarChart>
          <p style={{ fontSize: 9, color: '#64748b', margin: '6px 0 0 0', lineHeight: 1.5 }}>
            Green bar = average $/MWh received when discharging, red = average $/MWh paid when charging, blue = the spread (= revenue per MWh delivered, before efficiency losses). A widening spread year-on-year indicates strengthening arbitrage opportunity.
          </p>
        </div>
      )}

      {/* Monthly spread trend */}
      {monthlySpread.filter((d: { spread: number | null }) => d.spread != null).length > 3 && (
        <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Monthly Spread — last 24 months</p>
          <LineChart width={848} height={140} data={monthlySpread} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 8, fill: '#475569' }} />
            <YAxis tick={{ fontSize: 9, fill: '#475569' }} tickFormatter={v => `$${v}`} />
            <Line dataKey="spread" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
            {vs.avg_spread != null && (
              <ReferenceLine y={vs.avg_spread} stroke="#0f172a40" strokeDasharray="4 3"
                label={{ value: `avg $${vs.avg_spread.toFixed(0)}`, fill: '#475569', fontSize: 8, position: 'right' }} />
            )}
          </LineChart>
          <p style={{ fontSize: 9, color: '#64748b', margin: '6px 0 0 0', lineHeight: 1.5 }}>
            Monthly arbitrage spread highlights seasonality — winter months typically deliver tighter spreads (less solar trough); summer/shoulder months deliver wider spreads.
          </p>
        </div>
      )}

      {/* State ranking + pros/cons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        {sr && (
          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>State Rankings — {project.state}</p>
            {[
              { label: 'Arbitrage Spread', rank: sr.spread_rank, total: sr.spread_total, pct: sr.spread_percentile },
              { label: 'Revenue per MW',   rank: sr.revenue_per_mw_rank, total: sr.revenue_per_mw_total, pct: undefined },
              { label: 'Cycles / Year',    rank: sr.cycles_rank, total: sr.cycles_total, pct: sr.cycles_percentile },
            ].filter(r => r.rank != null && r.total != null).map((r, i) => {
              const pct = r.pct ?? Math.round(((r.total as number) - (r.rank as number)) / (r.total as number) * 100)
              const bg = pct >= 75 ? '#22c55e' : pct >= 50 ? '#3b82f6' : pct >= 25 ? '#f59e0b' : '#ef4444'
              const col = pct >= 75 ? '#166534' : pct >= 50 ? '#1d4ed8' : pct >= 25 ? '#92400e' : '#991b1b'
              return (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: '#475569' }}>{r.label}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: col }}>#{r.rank}/{r.total}</span>
                  </div>
                  <div style={{ height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, backgroundColor: bg, borderRadius: 3 }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {pc && (pc.pros?.length > 0 || pc.cons?.length > 0) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pc.pros?.length > 0 && (
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 12, flex: 1 }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Value Strengths</p>
                {pc.pros.map((p: string, i: number) => <p key={i} style={{ fontSize: 10, color: '#15803d', margin: '2px 0' }}>+ {p}</p>)}
              </div>
            )}
            {pc.cons?.length > 0 && (
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 12, flex: 1 }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Value Risks</p>
                {pc.cons.map((c: string, i: number) => <p key={i} style={{ fontSize: 10, color: '#b91c1c', margin: '2px 0' }}>− {c}</p>)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Peer spread rankings */}
      {peerData.length > 1 && (
        <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
            {project.state} BESS Rankings — Avg Spread $/MWh (Top {peerData.length})
          </p>
          <BarChart width={848} height={120} data={peerData} layout="vertical" margin={{ top: 4, right: 8, bottom: 0, left: 100 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 9, fill: '#475569' }} tickFormatter={v => `$${v}`} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 8, fill: '#475569' }} width={100} />
            <Bar dataKey="spread" radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {peerData.map((d, i) => <Cell key={i} fill={d.isThis ? '#0f172a' : '#3b82f640'} />)}
            </Bar>
          </BarChart>
          <p style={{ fontSize: 9, color: '#64748b', margin: '6px 0 0 0', lineHeight: 1.5 }}>
            Top {peerData.length} {project.state} BESS by average arbitrage spread. This battery shown in dark; peers in blue. Higher spread = stronger merchant performance.
          </p>
        </div>
      )}

      {/* NEM Lens · Site Data Essentials (shared) */}
      <NemSiteDataEssentialsSection
        tech="bess"
        projectMeta={projectMeta}
        projectName={project.name}
        stateName={project.state}
        avgCfPct={vs.avg_cf_pct ?? null}
        avgCapture={vs.avg_discharge_price ?? vs.avg_capture_price ?? null}
        avgVf={vs.avg_value_factor ?? null}
        dataFirstYear={vs.data_first_year ?? null}
        dataLastYear={vs.data_last_year ?? null}
      />

      {/* Footer */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10 }}>
        <p style={{ fontSize: 9, color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: '#475569' }}>Data:</strong> AEMO 5-min DISPATCHLOAD &amp; DISPATCHPRICE.
          Arbitrage spread = volume-weighted avg discharge price − avg charge price.
          Cycles = sum of daily charge MWh ÷ rated storage MWh.
          Excludes FCAS, capacity payments, and contracted offtake uplift.
          Generated by AURES Intelligence.
        </p>
      </div>
    </div>
  )
}
