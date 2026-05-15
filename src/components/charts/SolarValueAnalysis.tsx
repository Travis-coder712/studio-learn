// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TF = (v: any, n: any) => [string, string]
import { useState, useMemo, useRef, useCallback } from 'react'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, ScatterChart, Scatter, Cell,
} from 'recharts'
import { useSolarValueProject } from '../../hooks/useSolarValue'
import { exportElementToPdf } from '../../lib/exportPdf'
import { fetchProject } from '../../lib/dataService'
import type { Project } from '../../lib/types'
import {
  ProjectProfileSection,
  ProjectEvolutionTimelineSection,
  NemSiteDataEssentialsSection,
} from './ValuePdfSections'

// ============================================================
// Constants
// ============================================================

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
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

type TabId = 'valuation' | 'monthly' | 'trend' | 'bands' | 'peers'

// ============================================================
// Shared small helpers
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
  highlight?: 'green' | 'yellow' | 'red' | 'blue'
}) {
  const colorMap = { green: '#22c55e', yellow: '#f59e0b', red: '#ef4444', blue: '#3b82f6' }
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

export default function SolarValueAnalysis({ projectId }: Props) {
  const { project, stateAvg, allStateProjects, poolPrices, loading } = useSolarValueProject(projectId)
  const [activeTab, setActiveTab] = useState<TabId>('valuation')
  const pdfRef = useRef<HTMLDivElement>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [showPdf, setShowPdf] = useState(false)
  const [projectMeta, setProjectMeta] = useState<Project | null>(null)

  const handleExportPdf = useCallback(async () => {
    if (!project) return
    setPdfLoading(true)
    // Fetch full project JSON for the Project Profile section in the PDF
    const meta = await fetchProject('solar', projectId)
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
        filename: `${project.name.replace(/\s+/g, '_')}_solar_value_analysis`,
        title: `Solar Value Analysis — ${project.name}`,
        subtitle: `${project.state} · ${project.capacity_mw} MW · AURES Intelligence · ${new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })}`,
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
        <p className="text-sm text-[var(--color-text-muted)]">Solar value data not yet available for this project.</p>
        <p className="text-[10px] text-[var(--color-text-muted)] mt-1">Run: python3 pipeline/importers/export_solar_value.py</p>
      </div>
    )
  }

  const tabs: { key: TabId; label: string }[] = [
    { key: 'valuation', label: '☀️ Valuation' },
    { key: 'monthly',   label: '📆 Monthly' },
    { key: 'trend',     label: '📈 Trend' },
    { key: 'bands',     label: '📊 Price Bands' },
    { key: 'peers',     label: '🏆 Peers' },
  ]

  return (
    <div className="mt-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2">
          <span>☀️</span> Solar Value Analysis
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
      {activeTab === 'monthly'   && <MonthlyTab project={project} />}
      {activeTab === 'trend'     && <TrendTab project={project} poolPrices={poolPrices} />}
      {activeTab === 'bands'     && <BandsTab project={project} />}
      {activeTab === 'peers'     && <PeersTab project={project} allStateProjects={allStateProjects} />}

      {/* Hidden PDF summary — rendered off-screen during export */}
      {showPdf && (
        <div ref={pdfRef} style={{ position: 'fixed', top: 0, left: '-10000px', pointerEvents: 'none', zIndex: 9999, width: 900 }}>
          <SolarValuePdfSummary project={project} stateAvg={stateAvg} allStateProjects={allStateProjects} projectMeta={projectMeta} />
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

  const vfHighlight = (vf: number | null) => {
    if (vf == null) return undefined
    return vf >= 0.90 ? 'green' : vf >= 0.75 ? 'yellow' : 'red' as const
  }

  const dimensions = [
    {
      icon: '⚡',
      title: 'Capacity Factor',
      explain: `How much electricity the farm produces vs its rated capacity. Solar CF is typically 18–28%. Higher is better — determined by irradiance, latitude, tracking, and local weather. ${project.name}'s current average is ${vs.avg_cf_pct?.toFixed(1) ?? '—'}%.`,
      value: vs.avg_cf_pct != null ? `${vs.avg_cf_pct.toFixed(1)}%` : '–',
      bench: stateAvg?.avg_cf_pct != null ? `${stateAvg.avg_cf_pct.toFixed(1)}% state avg` : null,
      signal: sr?.cf_percentile != null ? (sr.cf_percentile >= 60 ? 'good' : sr.cf_percentile >= 35 ? 'ok' : 'warn') : 'neutral',
    },
    {
      icon: '📊',
      title: 'Value Factor (Cannibalisation)',
      explain: `The key solar-specific metric. All solar farms generate heavily around midday, competing at the same time and driving spot prices down. Value factor = capture price ÷ pool average. A value of 0.60 means the farm earns 60% of the pool average — the 40% discount is the cannibalisation penalty. This discount grows as more solar enters the region.`,
      value: vs.avg_value_factor != null ? vs.avg_value_factor.toFixed(3) : '–',
      bench: stateAvg?.avg_value_factor != null ? `${stateAvg.avg_value_factor.toFixed(3)} state avg` : null,
      signal: vs.avg_value_factor != null ? (vs.avg_value_factor >= 0.80 ? 'good' : vs.avg_value_factor >= 0.65 ? 'ok' : 'warn') : 'neutral',
    },
    {
      icon: '💵',
      title: 'Capture Price',
      explain: `The average $/MWh received when generating, weighted by output volume. Solar's midday generation profile means it typically receives below-average prices. Best months are autumn/spring when solar output is still reasonable but fewer competitors are at peak.`,
      value: vs.avg_capture_price != null ? `$${vs.avg_capture_price.toFixed(0)}/MWh` : '–',
      bench: stateAvg?.avg_capture_price != null ? `$${stateAvg.avg_capture_price.toFixed(0)}/MWh state avg` : null,
      signal: sr?.capture_price_percentile != null ? (sr.capture_price_percentile >= 60 ? 'good' : sr.capture_price_percentile >= 35 ? 'ok' : 'warn') : 'neutral',
    },
    {
      icon: '📉',
      title: 'Value Factor Trend',
      explain: `Whether cannibalisation is worsening (declining VF) or improving. As more solar enters the market, VF typically declines. An improving trend may reflect strategic curtailment, storage co-location, or favourable regional dynamics.`,
      value: vs.value_factor_trend ? vs.value_factor_trend.charAt(0).toUpperCase() + vs.value_factor_trend.slice(1) : '–',
      bench: null,
      signal: vs.value_factor_trend === 'improving' ? 'good' : vs.value_factor_trend === 'declining' ? 'warn' : 'ok',
    },
    {
      icon: '📅',
      title: 'Best vs Worst Capture Month',
      explain: `The month with the highest and lowest average capture price. Solar projects in the NEM typically earn most in autumn and winter (May–Aug) when solar penetration is lower and prices are firmer. Summer midday prices can turn negative.`,
      value: vs.best_capture_month && vs.worst_capture_month ? `${vs.best_capture_month} best / ${vs.worst_capture_month} worst` : '–',
      bench: null,
      signal: 'neutral' as const,
    },
    {
      icon: '💰',
      title: 'Revenue per MW',
      explain: `Total annual market revenue divided by nameplate capacity. Combines both output volume and price quality. The cannibalisation penalty reduces this significantly for solar farms in high-penetration markets.`,
      value: vs.avg_revenue_per_mw != null ? `$${(vs.avg_revenue_per_mw / 1000).toFixed(0)}k/MW/yr` : '–',
      bench: stateAvg?.avg_revenue_per_mw != null ? `$${(stateAvg.avg_revenue_per_mw / 1000).toFixed(0)}k state avg` : null,
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
          label="Avg CF"
          value={vs.avg_cf_pct != null ? `${vs.avg_cf_pct.toFixed(1)}%` : '–'}
          sub={stateAvg?.avg_cf_pct != null ? `${stateAvg.avg_cf_pct.toFixed(1)}% state` : undefined}
          highlight={sr?.cf_percentile >= 60 ? 'green' : sr?.cf_percentile >= 35 ? 'yellow' : 'red'}
        />
        <MetricCard
          label="Value Factor"
          value={vs.avg_value_factor != null ? vs.avg_value_factor.toFixed(3) : '–'}
          sub={vs.avg_value_factor != null
            ? (vs.avg_value_factor >= 0.80 ? 'low cannibalisation' : vs.avg_value_factor >= 0.65 ? 'moderate' : 'high cannibalisation')
            : undefined}
          highlight={vfHighlight(vs.avg_value_factor)}
        />
        <MetricCard
          label="Rev/MW"
          value={vs.avg_revenue_per_mw != null ? `$${(vs.avg_revenue_per_mw / 1000).toFixed(0)}k` : '–'}
          sub={stateAvg?.avg_revenue_per_mw != null ? `$${(stateAvg.avg_revenue_per_mw / 1000).toFixed(0)}k state` : undefined}
          highlight="blue"
        />
      </div>

      {/* Cannibalisation explainer */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
        <p className="text-[11px] font-semibold text-amber-400 mb-1">☀️ The Solar Cannibalisation Problem</p>
        <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
          Solar farms generate most energy around midday — and so does every other solar farm in the region.
          This collective peak floods the market at the same time, pushing the spot price down exactly when
          solar farms need it to be high. The <strong className="text-[var(--color-text)]">value factor</strong> measures
          how much this costs: {vs.avg_value_factor != null
            ? `${project.name} earns ${vs.avg_value_factor.toFixed(0)}/1.0 of the pool average — a ${((1 - vs.avg_value_factor) * 100).toFixed(0)}% cannibalisation discount.`
            : 'a value below 1.0 means earning less than the pool average.'
          } As more solar enters the NEM, this discount grows.
        </p>
      </div>

      {/* Valuation dimensions */}
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
    </div>
  )
}

// ============================================================
// Monthly tab — CF% and Value Factor by calendar month
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MonthlyTab({ project }: { project: any }) {
  const ma = project.monthly_averages ?? {}
  const cfData = MONTH_LABELS.map((label, i) => {
    const entry = ma[String(i + 1)]
    return { month: label, cf: entry?.avg_cf_pct ?? null, vf: entry?.avg_value_factor ?? null }
  }).filter(d => d.cf != null || d.vf != null)

  if (cfData.length === 0) {
    return <p className="text-xs text-[var(--color-text-muted)] py-4">No monthly average data available.</p>
  }

  return (
    <div className="space-y-5">
      {/* CF by month */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
        <p className="text-[11px] font-semibold text-[var(--color-text)] mb-0.5">Capacity Factor by Month</p>
        <p className="text-[9px] text-[var(--color-text-muted)] mb-3">
          Average CF% for each calendar month across all years of operation. Summer months peak, but value factor is often worst then.
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={cfData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 9 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 9 }} tickFormatter={(v: number) => `${v.toFixed(0)}%`} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle}
              formatter={((v: number) => [`${v?.toFixed(1)}%`, 'Avg CF']) as TF} />
            <Bar dataKey="cf" fill="#f59e0b" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Value Factor by month */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
        <p className="text-[11px] font-semibold text-[var(--color-text)] mb-0.5">Value Factor by Month</p>
        <p className="text-[9px] text-[var(--color-text-muted)] mb-3">
          Capture price ÷ pool average by calendar month. Lower in summer (more solar competing at midday); higher in winter/autumn when cannibalisation is weaker.
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={cfData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 9 }} />
            <YAxis domain={[0, 1.2]} tick={{ fill: '#9ca3af', fontSize: 9 }} tickFormatter={(v: number) => v.toFixed(2)} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle}
              formatter={((v: number) => [v?.toFixed(3) ?? '—', 'Value Factor']) as TF} />
            <ReferenceLine y={1.0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 2" label={{ value: 'Pool parity', fill: '#6b7280', fontSize: 9 }} />
            <Line type="monotone" dataKey="vf" stroke="#8b5cf6" strokeWidth={2.5}
              dot={{ r: 3, fill: '#8b5cf6' }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-[9px] text-[var(--color-text-muted)] mt-2 text-center italic">
          Value factor below the dashed line (1.0) = earning less than the pool average
        </p>
      </div>
    </div>
  )
}

// ============================================================
// Trend tab — annual CF% and value factor over years
// ============================================================

function TrendTab({ project, poolPrices }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  project: any
  poolPrices: Record<string, Record<string, number>>
}) {
  const annualData = useMemo(() => {
    const raw = project.annual_data ?? []
    const state = project.state as string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return raw.map((a: any) => {
      const pool = poolPrices[state]?.[String(a.year)]
      const vf = pool && a.capture_price && pool > 0 ? a.capture_price / pool : null
      return {
        year: String(a.year),
        cf: a.cf_pct ?? null,
        vf: vf != null ? Math.round(vf * 1000) / 1000 : null,
        capture: a.capture_price ?? null,
        revMw: a.revenue_per_mw ? Math.round(a.revenue_per_mw / 1000) : null,
        months: a.months ?? 12,
      }
    }).filter((a: { cf: number | null; vf: number | null }) => a.cf != null || a.vf != null)
  }, [project, poolPrices])

  if (annualData.length === 0) {
    return <p className="text-xs text-[var(--color-text-muted)] py-4">No annual trend data available.</p>
  }

  return (
    <div className="space-y-5">
      {/* Annual CF trend */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
        <p className="text-[11px] font-semibold text-[var(--color-text)] mb-0.5">Annual Capacity Factor</p>
        <p className="text-[9px] text-[var(--color-text-muted)] mb-3">
          CF% each year. A declining trend may indicate equipment ageing, increasing curtailment, or worsening dispatch conditions.
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={annualData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="year" tick={{ fill: '#9ca3af', fontSize: 9 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 9 }} tickFormatter={(v: number) => `${v.toFixed(0)}%`} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle}
              formatter={((v: number, _n: string, p: { payload?: { months?: number } }) => [
                `${v?.toFixed(1)}%${(p.payload?.months ?? 12) < 11 ? ' (partial)' : ''}`, 'CF'
              ]) as TF} />
            <Bar dataKey="cf" radius={[3, 3, 0, 0]}>
              {annualData.map((d: { year: string }) => (
                <Cell key={d.year} fill={YEAR_COLORS[Number(d.year)] ?? '#6366f1'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Annual Value Factor trend */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
        <p className="text-[11px] font-semibold text-[var(--color-text)] mb-0.5">Annual Value Factor — Cannibalisation Drift</p>
        <p className="text-[9px] text-[var(--color-text-muted)] mb-3">
          Capture price ÷ annual pool average per year. A declining trend is the cannibalisation signal — as solar penetration grows, this discount deepens.
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={annualData} margin={{ top: 4, right: 16, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="year" tick={{ fill: '#9ca3af', fontSize: 9 }} />
            <YAxis domain={[0.2, 1.1]} tick={{ fill: '#9ca3af', fontSize: 9 }} tickFormatter={(v: number) => v.toFixed(2)} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle}
              formatter={((v: number) => [v?.toFixed(3) ?? '—', 'Value Factor']) as TF} />
            <ReferenceLine y={1.0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 2" />
            <ReferenceLine y={0.7} stroke="rgba(245,158,11,0.25)" strokeDasharray="4 2" label={{ value: '0.70 threshold', fill: '#6b7280', fontSize: 8 }} />
            <Line type="monotone" dataKey="vf" stroke="#8b5cf6" strokeWidth={2.5}
              dot={{ r: 4, fill: '#8b5cf6' }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ============================================================
// Price Bands tab — where does the energy actually get sold?
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BandsTab({ project }: { project: any }) {
  const pbd = project.price_band_data
  const bandData = useMemo(() => {
    if (!pbd?.monthly) return []
    // Aggregate all months into totals per band
    const totals: Record<string, { mwh: number; pct_sum: number; count: number }> = {}
    for (const monthBands of Object.values(pbd.monthly) as any[][]) {
      for (const band of monthBands) {
        if (!totals[band.label]) totals[band.label] = { mwh: 0, pct_sum: 0, count: 0 }
        totals[band.label].mwh += band.gen_mwh ?? 0
        totals[band.label].pct_sum += band.gen_pct ?? 0
        totals[band.label].count++
      }
    }
    const totalMwh = Object.values(totals).reduce((s, v) => s + v.mwh, 0)
    const BAND_ORDER = ['negative', '$0-50', '$50-100', '$100-300', '$300-1000', '$1000+']
    return BAND_ORDER.map(label => ({
      label,
      pct: totalMwh > 0 ? Math.round(totals[label]?.mwh / totalMwh * 1000) / 10 : 0,
      mwh: Math.round(totals[label]?.mwh ?? 0),
      fill: BAND_COLORS[label] ?? '#6b7280',
    })).filter(d => d.pct > 0)
  }, [pbd])

  if (bandData.length === 0) {
    return (
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] border-dashed rounded-xl p-6 text-center mt-2">
        <p className="text-xs text-[var(--color-text-muted)]">5-minute NEMWEB price band data not yet available.</p>
        <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
          Run: python3 pipeline/importers/import_price_band_capture.py --tech solar --all-cached
        </p>
      </div>
    )
  }

  const negPct = bandData.find(d => d.label === 'negative')?.pct ?? 0
  const lowPct = bandData.find(d => d.label === '$0-50')?.pct ?? 0

  return (
    <div className="space-y-4">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
        <p className="text-[11px] font-semibold text-[var(--color-text)] mb-0.5">Generation by Price Band</p>
        <p className="text-[9px] text-[var(--color-text-muted)] mb-3">
          Where this farm's output is dispatched relative to the spot price. High proportions at negative or sub-$50 prices
          indicate cannibalisation. Sourced from AEMO 5-minute NEMWEB dispatch data.
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={bandData} layout="vertical" margin={{ top: 4, right: 32, bottom: 0, left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 9 }} tickFormatter={(v: number) => `${v}%`} />
            <YAxis type="category" dataKey="label" tick={{ fill: '#9ca3af', fontSize: 9 }} width={56} />
            <Tooltip contentStyle={tooltipStyle}
              formatter={((v: number, _n: string, p: { payload?: { mwh?: number } }) => [
                `${v?.toFixed(1)}% of energy (${p.payload?.mwh?.toLocaleString() ?? 0} MWh total)`,
                'Energy dispatched',
              ]) as TF} />
            <Bar dataKey="pct" radius={[0, 3, 3, 0]}>
              {bandData.map(d => <Cell key={d.label} fill={d.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Callout insight */}
      {negPct + lowPct > 30 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
          <p className="text-[10px] text-red-400 font-semibold mb-0.5">⚠️ High cannibalisation exposure</p>
          <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
            {(negPct + lowPct).toFixed(1)}% of this farm's generation occurs at prices below $50/MWh (including {negPct.toFixed(1)}% at negative prices).
            This significantly depresses average capture price and value factor.
            Battery co-location or time-shifting strategies could improve revenue quality.
          </p>
        </div>
      )}
      {negPct + lowPct <= 15 && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3">
          <p className="text-[10px] text-green-400 font-semibold mb-0.5">✅ Low cannibalisation exposure</p>
          <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
            Only {(negPct + lowPct).toFixed(1)}% of generation at prices below $50/MWh. This farm has a relatively favourable dispatch profile compared to the solar fleet average.
          </p>
        </div>
      )}
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
        vf: p.value_summary?.avg_value_factor as number | null,
        cf: p.value_summary?.avg_cf_pct as number | null,
        isSelf: p.id === project.id,
      }))
      .filter(p => p.vf != null && p.cf != null)
      .sort((a, b) => (b.vf ?? 0) - (a.vf ?? 0))
  }, [allStateProjects, project.id])

  if (peers.length <= 1) {
    return <p className="text-xs text-[var(--color-text-muted)] py-4">Not enough peer data available for comparison.</p>
  }

  return (
    <div className="space-y-4">
      {/* VF comparison bar */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
        <p className="text-[11px] font-semibold text-[var(--color-text)] mb-0.5">
          Value Factor — {project.state} State Peers
        </p>
        <p className="text-[9px] text-[var(--color-text-muted)] mb-3">
          Average value factor by project in {project.state}. Higher = less cannibalised.
        </p>
        <ResponsiveContainer width="100%" height={Math.max(120, peers.length * 22)}>
          <BarChart data={peers} layout="vertical" margin={{ top: 4, right: 48, bottom: 0, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 9 }} domain={[0, 1.1]}
              tickFormatter={(v: number) => v.toFixed(2)} />
            <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 8 }} width={120}
              tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 16) + '…' : v} />
            <Tooltip contentStyle={tooltipStyle}
              formatter={((v: number) => [v.toFixed(3), 'Value Factor']) as TF} />
            <ReferenceLine x={1.0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 2" />
            <Bar dataKey="vf" radius={[0, 3, 3, 0]}>
              {peers.map(p => (
                <Cell key={p.id} fill={p.isSelf ? '#f59e0b' : '#6366f1'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-3 mt-2 text-[9px] text-[var(--color-text-muted)]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#f59e0b] inline-block" /> This project</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#6366f1] inline-block" /> State peers</span>
        </div>
      </div>

      {/* Scatter: CF vs VF */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
        <p className="text-[11px] font-semibold text-[var(--color-text)] mb-0.5">CF% vs Value Factor — State Portfolio</p>
        <p className="text-[9px] text-[var(--color-text-muted)] mb-3">
          Top-right = high output AND good price capture (best position). Top-left = low CF. Bottom-right = high output but heavily cannibalised.
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis type="number" dataKey="cf" name="CF%" tick={{ fill: '#9ca3af', fontSize: 9 }}
              label={{ value: 'CF%', position: 'insideBottomRight', fill: '#6b7280', fontSize: 9, offset: -4 }} />
            <YAxis type="number" dataKey="vf" name="VF" tick={{ fill: '#9ca3af', fontSize: 9 }} domain={[0.3, 1.1]}
              label={{ value: 'Value Factor', angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 9 }} />
            <Tooltip contentStyle={tooltipStyle}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              content={({ active, payload }: any) => {
                if (!active || !payload?.[0]) return null
                const d = payload[0].payload
                return (
                  <div style={{ ...tooltipStyle, padding: '6px 10px' }}>
                    <p style={{ color: '#f1f5f9', fontWeight: 600, marginBottom: 2, fontSize: 11 }}>{d.name}</p>
                    <p style={{ fontSize: 10, color: '#94a3b8' }}>CF: {d.cf?.toFixed(1)}%</p>
                    <p style={{ fontSize: 10, color: '#94a3b8' }}>VF: {d.vf?.toFixed(3)}</p>
                  </div>
                )
              }}
            />
            <ReferenceLine y={1.0} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 2" />
            <Scatter data={peers} name="Projects">
              {peers.map(p => (
                <Cell key={p.id} fill={p.isSelf ? '#f59e0b' : '#6366f1'} opacity={p.isSelf ? 1 : 0.6} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ============================================================
// PDF summary — flat light-mode layout for export
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function computeSolarKeyFindings(project: any, stateAvg: any): string[] {
  const vs = project.value_summary ?? {}
  const sr = project.state_rank
  const findings: string[] = []

  if (vs.avg_cf_pct != null) {
    const stateCf = stateAvg?.avg_cf_pct
    const rank = sr?.cf_percentile != null ? ` — top ${Math.round(100 - sr.cf_percentile)}% of ${project.state} fleet` : ''
    if (stateCf != null) {
      const diff = vs.avg_cf_pct - stateCf
      if (Math.abs(diff) >= 1) {
        findings.push(`Capacity factor: ${vs.avg_cf_pct.toFixed(1)}% (${diff > 0 ? '+' : ''}${diff.toFixed(1)}pp vs ${project.state} average ${stateCf.toFixed(1)}%)${rank}.`)
      } else {
        findings.push(`Capacity factor: ${vs.avg_cf_pct.toFixed(1)}% — in line with ${project.state} fleet average${rank}.`)
      }
    } else {
      findings.push(`Capacity factor: ${vs.avg_cf_pct.toFixed(1)}%${rank}.`)
    }
  }

  if (vs.avg_value_factor != null) {
    const disc = ((1 - vs.avg_value_factor) * 100).toFixed(0)
    if (vs.avg_value_factor >= 0.85) {
      findings.push(`Capture quality: value factor ${vs.avg_value_factor.toFixed(2)} — limited cannibalisation, earning close to pool price.`)
    } else if (vs.avg_value_factor >= 0.65) {
      findings.push(`Capture quality: value factor ${vs.avg_value_factor.toFixed(2)} — earns ~${disc}% below pool, typical solar cannibalisation discount in ${project.state}.`)
    } else {
      findings.push(`Capture quality: value factor ${vs.avg_value_factor.toFixed(2)} — earns ${disc}% below pool; severe midday cannibalisation. Co-location with storage may help.`)
    }
  }

  if (vs.value_factor_trend) {
    const t = vs.value_factor_trend
    if (t === 'declining') findings.push(`Trend: value factor is declining as more solar enters the ${project.state} market — capture risk increasing.`)
    else if (t === 'improving') findings.push(`Trend: value factor is improving — unusual for solar; may reflect curtailment, storage co-location or favourable regional dynamics.`)
    else findings.push(`Trend: value factor stable — cannibalisation pressure not yet worsening materially.`)
  }

  if (vs.degradation_rate_pct_per_yr != null && Math.abs(vs.degradation_rate_pct_per_yr) >= 0.3) {
    const d = vs.degradation_rate_pct_per_yr
    if (d > 0) findings.push(`CF declining at ${d.toFixed(2)}%/yr — within normal panel degradation (0.3–0.7%/yr).`)
    else findings.push(`CF improving at ${Math.abs(d).toFixed(2)}%/yr — likely reflects ramp-up out of commissioning.`)
  }

  if (vs.best_capture_month && vs.worst_capture_month) {
    findings.push(`Capture timing: best $/MWh in ${vs.best_capture_month}, worst in ${vs.worst_capture_month}. Solar earns more outside peak-solar months when fewer competitors run flat-out.`)
  }

  return findings
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SolarValuePdfSummary({ project, stateAvg, allStateProjects, projectMeta }: { project: any; stateAvg: any; allStateProjects: any[]; projectMeta: Project | null }) {
  const vs = project.value_summary ?? {}
  const sr = project.state_rank
  const pc = project.pros_cons
  const today = new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })

  const annualData = (project.annual_data || []).map((a: { year: number; cf_pct: number | null }) => ({ year: String(a.year), cf: a.cf_pct }))

  const monthlyCapture = MONTH_LABELS.map((label, i) => {
    const avg = project.monthly_averages?.[String(i + 1)]
    return { month: label, capture: avg?.avg_capture_price ?? null, vf: avg?.avg_value_factor ?? null }
  })

  const seasons = ['summer', 'autumn', 'winter', 'spring']
  const seasonRows = seasons.map(s => ({
    label: s.charAt(0).toUpperCase() + s.slice(1),
    cf: project.seasonal_averages?.[s]?.avg_cf_pct ?? null,
    capture: project.seasonal_averages?.[s]?.avg_capture_price ?? null,
    vf: project.seasonal_averages?.[s]?.avg_value_factor ?? null,
    pct: project.seasonal_averages?.[s]?.pct_of_annual_energy ?? null,
  }))

  const peerData = [...allStateProjects]
    .sort((a: { value_summary?: { avg_cf_pct?: number | null } }, b: { value_summary?: { avg_cf_pct?: number | null } }) => (b.value_summary?.avg_cf_pct ?? 0) - (a.value_summary?.avg_cf_pct ?? 0))
    .slice(0, 8)
    .map((p: { id: string; name: string; value_summary?: { avg_cf_pct?: number | null } }) => ({
      name: p.name.replace(/ Solar Farm$/i, '').replace(/ SF$/i, '').slice(0, 18),
      cf: p.value_summary?.avg_cf_pct ?? 0,
      isThis: p.id === project.id,
    }))

  const gradeColor = pc?.grade?.startsWith('A') ? '#166534' : pc?.grade?.startsWith('B') ? '#1d4ed8' : '#92400e'
  const gradeBg    = pc?.grade?.startsWith('A') ? '#dcfce7' : pc?.grade?.startsWith('B') ? '#dbeafe' : '#fef3c7'

  const keyFindings = computeSolarKeyFindings(project, stateAvg)

  return (
    <div style={{ width: 900, backgroundColor: '#ffffff', color: '#0f172a', fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #e2e8f0' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>{project.name}</h2>
          <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 0 0' }}>
            {project.state} · {project.capacity_mw} MW · Solar Value Analysis · {today}
          </p>
        </div>
        {pc?.grade && (
          <div style={{ backgroundColor: gradeBg, color: gradeColor, padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700 }}>
            {pc.grade} · {pc.score?.toFixed(1)}/5.0
          </div>
        )}
      </div>

      {/* Project Profile · Evolution Timeline (shared) */}
      <ProjectProfileSection projectMeta={projectMeta} tech="solar" />
      <ProjectEvolutionTimelineSection projectMeta={projectMeta} />

      {/* Headline metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Avg Capacity Factor', value: vs.avg_cf_pct != null ? `${vs.avg_cf_pct.toFixed(1)}%` : '–', sub: stateAvg?.avg_cf_pct != null ? `${stateAvg.avg_cf_pct.toFixed(1)}% state avg` : undefined, color: '#3b82f6' },
          { label: 'Capture Price (VWAP)', value: vs.avg_capture_price != null ? `$${vs.avg_capture_price.toFixed(0)}/MWh` : '–', sub: stateAvg?.avg_capture_price != null ? `$${stateAvg.avg_capture_price.toFixed(0)} state` : undefined, color: '#22c55e' },
          { label: 'Value Factor', value: vs.avg_value_factor != null ? vs.avg_value_factor.toFixed(3) : '–', sub: vs.avg_value_factor != null ? (vs.avg_value_factor >= 0.85 ? 'Low cann.' : vs.avg_value_factor >= 0.65 ? 'Moderate' : 'High cann.') : undefined, color: vs.avg_value_factor != null ? (vs.avg_value_factor >= 0.85 ? '#22c55e' : vs.avg_value_factor >= 0.65 ? '#f59e0b' : '#ef4444') : '#475569' },
          { label: 'Revenue per MW', value: vs.avg_revenue_per_mw != null ? `$${(vs.avg_revenue_per_mw / 1000).toFixed(0)}k/yr` : '–', sub: stateAvg?.avg_revenue_per_mw != null ? `$${(stateAvg.avg_revenue_per_mw / 1000).toFixed(0)}k state` : undefined, color: '#8b5cf6' },
        ].map((m, i) => (
          <div key={i} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px' }}>
            <p style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{m.label}</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: m.color, margin: '3px 0 2px 0' }}>{m.value}</p>
            {m.sub && <p style={{ fontSize: 9, color: '#64748b', margin: 0 }}>{m.sub}</p>}
          </div>
        ))}
      </div>

      {/* Cannibalisation context */}
      <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 12, marginBottom: 14 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>The Solar Cannibalisation Problem</p>
        <p style={{ fontSize: 10, color: '#475569', lineHeight: 1.5, margin: 0 }}>
          Solar farms generate most energy around midday — and so does every other solar farm in the region. This collective peak floods the market and pushes spot prices down precisely when this farm is generating most. The value factor (VF) measures the resulting discount: VF = capture price ÷ pool average. As more solar enters the {project.state} market, VF typically declines.
        </p>
      </div>

      {/* Key findings */}
      {keyFindings.length > 0 && (
        <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px 0' }}>Key Findings</p>
          <ul style={{ margin: 0, padding: '0 0 0 14px' }}>
            {keyFindings.map((f, i) => (
              <li key={i} style={{ fontSize: 10, color: '#0f172a', lineHeight: 1.6, marginBottom: 4 }}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Annual CF chart */}
      {annualData.length > 0 && (
        <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Annual Capacity Factor Trend</p>
          <BarChart width={848} height={150} data={annualData} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#475569' }} />
            <YAxis tick={{ fontSize: 10, fill: '#475569' }} tickFormatter={v => `${v}%`} domain={['auto', 'auto']} />
            <Bar dataKey="cf" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {annualData.map((d: { year: string }, i: number) => <Cell key={i} fill={YEAR_COLORS[parseInt(d.year)] ?? '#3b82f6'} />)}
            </Bar>
          </BarChart>
          <p style={{ fontSize: 9, color: '#64748b', margin: '6px 0 0 0', lineHeight: 1.5 }}>
            Annual capacity factor (% of nameplate). Solar CF typically settles in the high-teens to high-twenties depending on latitude, tracking and curtailment. Year-on-year decline ({vs.degradation_rate_pct_per_yr ? `${vs.degradation_rate_pct_per_yr.toFixed(2)}%/yr` : '—'}) reflects panel degradation plus curtailment growth.
          </p>
        </div>
      )}

      {/* Monthly capture + seasonal */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 12, marginBottom: 14 }}>
        {monthlyCapture.some(d => d.capture != null) && (
          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Monthly Capture Price ($/MWh avg)</p>
            <BarChart width={520} height={140} data={monthlyCapture} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#475569' }} />
              <YAxis tick={{ fontSize: 9, fill: '#475569' }} tickFormatter={v => `$${v}`} />
              <Bar dataKey="capture" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                {monthlyCapture.map((d, i) => <Cell key={i} fill={d.vf == null ? '#3b82f6' : d.vf >= 0.85 ? '#22c55e' : d.vf >= 0.65 ? '#f59e0b' : '#ef4444'} />)}
              </Bar>
              {vs.avg_capture_price != null && (
                <ReferenceLine y={vs.avg_capture_price} stroke="#0f172a40" strokeDasharray="4 3"
                  label={{ value: `$${vs.avg_capture_price.toFixed(0)}`, fill: '#475569', fontSize: 8, position: 'right' }} />
              )}
            </BarChart>
            <p style={{ fontSize: 9, color: '#64748b', margin: '6px 0 0 0', lineHeight: 1.5 }}>
              Bar colour: green = VF ≥ 0.85, amber = 0.65–0.85, red {'<'} 0.65 (heavy cannibalisation). Dashed line = annual VWAP.
            </p>
          </div>
        )}
        {seasonRows.some(s => s.cf != null) && (
          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Seasonal Performance</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
              <thead>
                <tr>{['Season', 'CF%', 'Cap.', 'VF', '%Egy'].map(h => (
                  <th key={h} style={{ textAlign: h === 'Season' ? 'left' : 'right', color: '#64748b', paddingBottom: 5, fontWeight: 600, fontSize: 9 }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {seasonRows.map((s, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '3px 0', fontWeight: 600, color: '#0f172a' }}>{s.label}</td>
                    <td style={{ textAlign: 'right', color: '#0f172a' }}>{s.cf != null ? `${s.cf.toFixed(1)}%` : '–'}</td>
                    <td style={{ textAlign: 'right', color: '#0f172a' }}>{s.capture != null ? `$${s.capture.toFixed(0)}` : '–'}</td>
                    <td style={{ textAlign: 'right', color: s.vf != null ? (s.vf >= 0.85 ? '#166534' : s.vf >= 0.65 ? '#92400e' : '#991b1b') : '#475569' }}>{s.vf != null ? s.vf.toFixed(2) : '–'}</td>
                    <td style={{ textAlign: 'right', color: '#475569' }}>{s.pct != null ? `${s.pct.toFixed(0)}%` : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: 9, color: '#64748b', margin: '8px 0 0 0', lineHeight: 1.4 }}>
              Solar typically peaks in summer for output (CF) but earns better $/MWh in autumn/winter when fewer farms compete at midday.
            </p>
          </div>
        )}
      </div>

      {/* State ranking + pros/cons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        {sr && (
          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>State Rankings — {project.state}</p>
            {[
              { label: 'Capacity Factor', rank: sr.cf_rank, total: sr.cf_total, pct: sr.cf_percentile },
              { label: 'Capture Price', rank: sr.capture_price_rank, total: sr.capture_price_total, pct: sr.capture_price_percentile },
              { label: 'Revenue/MW', rank: sr.revenue_per_mw_rank, total: sr.revenue_per_mw_total, pct: undefined },
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

      {/* Peer CF rankings */}
      {peerData.length > 1 && (
        <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
            {project.state} Solar Farm Rankings — Avg CF% (Top {peerData.length})
          </p>
          <BarChart width={848} height={120} data={peerData} layout="vertical" margin={{ top: 4, right: 8, bottom: 0, left: 100 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 9, fill: '#475569' }} tickFormatter={v => `${v}%`} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 8, fill: '#475569' }} width={100} />
            <Bar dataKey="cf" radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {peerData.map((d, i) => <Cell key={i} fill={d.isThis ? '#0f172a' : '#f59e0b40'} />)}
            </Bar>
          </BarChart>
          <p style={{ fontSize: 9, color: '#64748b', margin: '6px 0 0 0', lineHeight: 1.5 }}>
            Top {peerData.length} {project.state} solar farms by avg CF (full operational history). This farm shown in dark; peers in amber.
          </p>
        </div>
      )}

      {/* NEM Lens · Site Data Essentials (shared) */}
      <NemSiteDataEssentialsSection
        tech="solar"
        projectMeta={projectMeta}
        projectName={project.name}
        stateName={project.state}
        avgCfPct={vs.avg_cf_pct ?? null}
        avgCapture={vs.avg_capture_price ?? null}
        avgVf={vs.avg_value_factor ?? null}
        dataFirstYear={vs.data_first_year ?? null}
        dataLastYear={vs.data_last_year ?? null}
      />

      {/* Footer */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10 }}>
        <p style={{ fontSize: 9, color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: '#475569' }}>Data:</strong> AEMO dispatch & settlement via OpenElectricity API.
          CF: full operational history{vs.data_first_year && vs.data_last_year ? ` (${vs.data_first_year}–${vs.data_last_year})` : ''}.
          Capture price &amp; value factor from Aug 2024+ (AEMO MMSDM).
          Revenue = gross energy revenue, pre-MLF. Excludes LGC, FCAS, and PPA adjustments.
          Generated by AURES Intelligence.
        </p>
      </div>
    </div>
  )
}
