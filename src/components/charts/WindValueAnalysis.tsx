import { useState, useRef, useCallback, useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TF = (value: any, name: any) => [string, string]
import {
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend, Cell,
} from 'recharts'
import { useWindValueProject } from '../../hooks/useWindValue'
import type { WindValueProject, WindStateAverage, Project } from '../../lib/types'
import { exportElementToPdf } from '../../lib/exportPdf'
import { fetchProject } from '../../lib/dataService'
import {
  ProjectProfileSection,
  ProjectEvolutionTimelineSection,
  NemSiteDataEssentialsSection,
} from './ValuePdfSections'

// ============================================================
// Constants
// ============================================================

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const HOURS = Array.from({ length: 24 }, (_, i) =>
  i === 0 ? '12am' : i < 12 ? `${i}am` : i === 12 ? '12pm' : `${i - 12}pm`)
const SEASON_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  summer: { label: 'Summer', color: '#f59e0b', icon: '☀️' },
  autumn: { label: 'Autumn', color: '#f97316', icon: '🍂' },
  winter: { label: 'Winter', color: '#3b82f6', icon: '❄️' },
  spring: { label: 'Spring', color: '#22c55e', icon: '🌱' },
}
const YEAR_COLORS: Record<number, string> = {
  2018: '#6366f1', 2019: '#8b5cf6', 2020: '#a855f7', 2021: '#ec4899',
  2022: '#f43f5e', 2023: '#f59e0b', 2024: '#22c55e', 2025: '#3b82f6', 2026: '#06b6d4',
}
const tooltipStyle = {
  backgroundColor: '#111827',
  border: '1px solid #374151',
  borderRadius: '8px',
  fontSize: '11px',
  color: '#f1f5f9',
}
const tooltipLabelStyle = { color: '#94a3b8', marginBottom: 2, fontSize: 10 }
const tooltipItemStyle = { color: '#f1f5f9' }

// Info icon with click-to-open popover for chart descriptions
function ChartInfo({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-block ml-1.5 align-middle">
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        className="w-4 h-4 rounded-full bg-[#374151] text-[#9ca3af] hover:bg-[#4b5563] hover:text-[#f1f5f9] text-[9px] font-bold inline-flex items-center justify-center transition-colors leading-none"
        aria-label="Chart information"
      >i</button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 top-5 left-0 w-72 bg-[#111827] border border-[#374151] rounded-lg p-3 shadow-xl"
            style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.6 }}>
            <button onClick={() => setOpen(false)}
              className="absolute top-2 right-2 text-[#6b7280] hover:text-[#f1f5f9] text-xs leading-none">✕</button>
            {children}
          </div>
        </>
      )}
    </span>
  )
}

type TabId = 'explainer' | 'shape' | 'capture' | 'seasonal' | 'trend' | 'peers' | 'nem' | 'diversity' | 'price'

// ============================================================
// Monthly-data adjustments — partial-month + commissioning filter
// ============================================================

/**
 * The data pipeline computes monthly cf_pct as energy ÷ (MW × full-month-hours).
 * For the *current* calendar month, the pipeline has only N-of-D days of data,
 * which makes that month's cf_pct (and energy) look artificially low. This
 * helper detects the latest month in the dataset; if it matches the current
 * calendar month (per `today`), it scales energy + revenue + cf_pct up to a
 * full-month-equivalent so charts compare apples to apples.
 *
 * It also flags `isPartial` so the UI can show a hatched / annotated bar.
 *
 * If `excludeCommissioning` is true, months that fall within the project's
 * commissioning ramp window (within ~6 months of COD, OR in the ramp_year
 * identified by the data pipeline) are removed from the returned array.
 */
import type { WindMonthlyDataPoint, WindValueSummary } from '../../lib/types'

interface AdjustedMonthly extends WindMonthlyDataPoint {
  isPartial?: boolean
  scaleFactor?: number  // applied factor (1.0 means no scaling)
  cfPctAdjusted?: number | null
  energyMwhAdjusted?: number | null
  revenueAudAdjusted?: number | null
  isRampMonth?: boolean
}

function getAdjustedMonthlyData(
  monthly: WindMonthlyDataPoint[],
  vs: WindValueSummary,
  cod: string | null,
  opts: { excludeCommissioning?: boolean } = {},
): AdjustedMonthly[] {
  const today = new Date()

  // Determine the latest year-month present in the data
  let latestKey = ''
  let latestEntry: WindMonthlyDataPoint | undefined
  for (const m of monthly) {
    const k = `${m.year}-${String(m.month).padStart(2, '0')}`
    if (k > latestKey) {
      latestKey = k
      latestEntry = m
    }
  }

  // Build a historical median for each calendar month, used to estimate whether
  // the LATEST entry is partial. We compare the latest entry's cf_pct against
  // the median cf_pct for the same calendar month in prior years. If the
  // latest is <55% of that median, we treat it as partial and scale up.
  const histByMonth: Record<number, number[]> = {}
  for (const m of monthly) {
    if (m.cf_pct == null) continue
    // Exclude the latest entry itself from the historical comparison
    if (latestEntry && m.year === latestEntry.year && m.month === latestEntry.month) continue
    if (!histByMonth[m.month]) histByMonth[m.month] = []
    histByMonth[m.month].push(m.cf_pct)
  }
  const medianOf = (arr: number[]): number | null => {
    if (arr.length === 0) return null
    const sorted = [...arr].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
  }

  let latestScaleFactor = 1
  let latestIsPartial = false
  if (latestEntry && latestEntry.cf_pct != null) {
    const median = medianOf(histByMonth[latestEntry.month] ?? [])
    // If the most-recent calendar month is the actual *current* month per the browser
    // clock, we can use today.getDate() / daysInMonth as the precise scale factor.
    const tYear = today.getFullYear()
    const tMonth = today.getMonth() + 1
    const tDay = today.getDate()
    if (latestEntry.year === tYear && latestEntry.month === tMonth) {
      const daysIn = new Date(tYear, tMonth, 0).getDate()
      if (tDay > 0 && tDay < daysIn) {
        latestIsPartial = true
        latestScaleFactor = daysIn / tDay
      }
    } else if (median != null && median > 0 && latestEntry.cf_pct / median < 0.55) {
      // Otherwise, if the latest entry is materially below historical median,
      // back-out an implied scale factor from the median ratio.
      // Implied scale = median / latest
      latestIsPartial = true
      latestScaleFactor = median / latestEntry.cf_pct
      // Cap at 5x — anything beyond suggests something more than partial data
      if (latestScaleFactor > 5) latestScaleFactor = 5
    }
  }

  // Commissioning cutoff: 6 months after COD (inclusive)
  const codDate = cod ? new Date(cod) : null
  const rampUntil = codDate ? new Date(codDate.getFullYear(), codDate.getMonth() + 6, 1) : null

  return monthly.map(m => {
    const isLatest = latestEntry != null && m.year === latestEntry.year && m.month === latestEntry.month
    const scaleFactor = isLatest && latestIsPartial ? latestScaleFactor : 1
    // isRampMonth: in pipeline's identified ramp_year OR within 6 months of COD
    const monthStart = new Date(m.year, m.month - 1, 1)
    const isRampMonth = (vs.ramp_year != null && m.year === vs.ramp_year)
      || (rampUntil != null && monthStart < rampUntil)

    return {
      ...m,
      isPartial: isLatest && latestIsPartial,
      scaleFactor,
      cfPctAdjusted: m.cf_pct != null ? m.cf_pct * scaleFactor : null,
      energyMwhAdjusted: m.energy_mwh != null ? m.energy_mwh * scaleFactor : null,
      revenueAudAdjusted: m.revenue_aud != null ? m.revenue_aud * scaleFactor : null,
      isRampMonth,
    }
  }).filter(m => {
    if (!opts.excludeCommissioning) return true
    return !m.isRampMonth
  })
}

// ============================================================
// Main component
// ============================================================

interface Props { projectId: string; capacityMw?: number }

export default function WindValueAnalysis({ projectId }: Props) {
  const { project, stateAvg, allStateProjects, poolPrices, loading } = useWindValueProject(projectId)
  const [activeTab, setActiveTab] = useState<TabId>('explainer')
  const pdfRef = useRef<HTMLDivElement>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [showPdf, setShowPdf] = useState(false)
  const [projectMeta, setProjectMeta] = useState<Project | null>(null)

  const handleExportPdf = useCallback(async () => {
    if (!project) return
    setPdfLoading(true)
    // Fetch the full project JSON for the Project Profile section in the PDF
    const meta = await fetchProject('wind', projectId)
    setProjectMeta(meta)
    setShowPdf(true)
    // Wait for React to mount the hidden PDF div and the browser to paint it
    await new Promise(r => setTimeout(r, 600))
    if (!pdfRef.current) {
      setShowPdf(false)
      setPdfLoading(false)
      return
    }
    try {
      await exportElementToPdf(pdfRef.current, {
        filename: `${project.name.replace(/\s+/g, '_')}_wind_value_analysis`,
        title: `Wind Value Analysis — ${project.name}`,
        subtitle: `${project.state} · ${project.capacity_mw} MW · AURES Intelligence · ${new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      })
    } catch (err) {
      console.error('PDF export failed:', err)
      alert('PDF generation failed — please try again. If the issue persists, try a different browser.')
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
        <p className="text-sm text-[var(--color-text-muted)]">Wind value data not yet available for this project.</p>
      </div>
    )
  }

  const tabs: { key: TabId; label: string }[] = [
    { key: 'explainer', label: '📋 Valuation' },
    { key: 'shape', label: '⏰ Daily Shape' },
    { key: 'capture', label: '💰 Capture' },
    { key: 'seasonal', label: '🌀 Seasonal' },
    { key: 'trend', label: '📈 Trend' },
    { key: 'peers', label: '🏆 Peers' },
    { key: 'diversity', label: '🔄 Diversity' },
    { key: 'price', label: '💲 Price Bands' },
    { key: 'nem', label: '🏛️ NEM Lens' },
  ]

  return (
    <div className="mt-6 space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2">
          <span>💨</span> Wind Value Analysis
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPdf}
            disabled={pdfLoading}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pdfLoading ? <><span className="animate-spin inline-block">⏳</span> Generating…</> : <><span>📄</span> Export PDF</>}
          </button>
          <DataConfidenceBadge
            confidence={project.value_summary.data_confidence}
            dataYearsClean={project.value_summary.data_years_clean}
            completeness={project.value_summary.data_completeness_pct}
            yearsAvailable={project.value_summary.data_years}
            yearsSinceCod={project.value_summary.years_since_cod}
          />
          <GradeChip grade={project.pros_cons?.grade} score={project.pros_cons?.score} />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0.5 bg-[var(--color-bg-card)] rounded-lg p-0.5 border border-[var(--color-border)] overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-none px-3 py-1.5 rounded-md text-[10px] font-medium whitespace-nowrap transition-colors ${
              activeTab === t.key
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'explainer' && (
        <ExplainerTab project={project} stateAvg={stateAvg} />
      )}
      {activeTab === 'shape' && (
        <DailyShapeTab project={project} />
      )}
      {activeTab === 'capture' && (
        <CaptureTab project={project} stateAvg={stateAvg} />
      )}
      {activeTab === 'seasonal' && (
        <SeasonalTab project={project} stateAvg={stateAvg} />
      )}
      {activeTab === 'trend' && (
        <TrendTab project={project} />
      )}
      {activeTab === 'peers' && (
        <PeersTab project={project} allStateProjects={allStateProjects} />
      )}
      {activeTab === 'diversity' && (
        <DiversityTab project={project} allStateProjects={allStateProjects} stateAvg={stateAvg} />
      )}
      {activeTab === 'price' && (
        <PriceBandTab project={project} allStateProjects={allStateProjects} poolPrices={poolPrices} />
      )}
      {activeTab === 'nem' && (
        <NemLensTab project={project} stateAvg={stateAvg} />
      )}

      {/* Hidden PDF summary — rendered off-screen during export */}
      {showPdf && (
        <div
          ref={pdfRef}
          style={{
            position: 'fixed', top: 0, left: '-10000px',
            pointerEvents: 'none', zIndex: 9999,
            width: 900,
          }}
        >
          <WindValuePdfSummary
            project={project}
            stateAvg={stateAvg}
            allStateProjects={allStateProjects}
            poolPrices={poolPrices}
            projectMeta={projectMeta}
          />
        </div>
      )}
    </div>
  )
}

// ============================================================
// Grade chip
// ============================================================

function GradeChip({ grade, score }: { grade?: string; score?: number }) {
  if (!grade) return null
  const color = grade.startsWith('A') ? '#22c55e'
    : grade.startsWith('B') ? '#3b82f6'
    : grade.startsWith('C') ? '#f59e0b'
    : '#ef4444'
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-[var(--color-text-muted)]">Value rating</span>
      <span
        className="text-xs font-bold px-2 py-0.5 rounded-full"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {grade}
      </span>
      {score !== undefined && (
        <span className="text-[10px] text-[var(--color-text-muted)]">{score.toFixed(1)}/5.0</span>
      )}
    </div>
  )
}

// ============================================================
// Data confidence badge
// ============================================================

function DataConfidenceBadge({
  confidence, dataYearsClean, completeness, yearsAvailable, yearsSinceCod,
}: {
  confidence?: 'high' | 'medium' | 'low'
  dataYearsClean?: number
  completeness?: number
  yearsAvailable?: number
  yearsSinceCod?: number
}) {
  const [open, setOpen] = useState(false)
  if (!confidence) return null
  const cfg = {
    high:   { label: 'High confidence',   color: '#22c55e', dot: '🟢' },
    medium: { label: 'Medium confidence', color: '#f59e0b', dot: '🟡' },
    low:    { label: 'Low confidence',    color: '#ef4444', dot: '🔴' },
  }[confidence]
  return (
    <span className="relative inline-block">
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold border transition-colors"
        style={{ borderColor: `${cfg.color}40`, backgroundColor: `${cfg.color}15`, color: cfg.color }}
      >
        <span>{cfg.dot}</span>
        <span className="hidden sm:inline">{cfg.label}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 top-7 right-0 w-64 bg-[#111827] border border-[#374151] rounded-lg p-3 shadow-xl text-left"
            style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.6 }}>
            <button onClick={() => setOpen(false)}
              className="absolute top-2 right-2 text-[#6b7280] hover:text-[#f1f5f9] text-xs leading-none">✕</button>
            <p style={{ color: '#f1f5f9', fontWeight: 600, marginBottom: 6 }}>Data confidence: {cfg.dot} {confidence.charAt(0).toUpperCase() + confidence.slice(1)}</p>
            {yearsAvailable != null && yearsSinceCod != null && (
              <p><strong style={{ color: '#f1f5f9' }}>{yearsAvailable} year{yearsAvailable !== 1 ? 's' : ''} of data</strong> available out of {yearsSinceCod} years in operation.</p>
            )}
            {completeness != null && (
              <p>Data completeness: <strong style={{ color: cfg.color }}>{completeness}%</strong></p>
            )}
            {dataYearsClean != null && (
              <p>Clean data years (excl. ramp-up): <strong style={{ color: '#f1f5f9' }}>{dataYearsClean}</strong></p>
            )}
            <p style={{ marginTop: 6 }}>
              {confidence === 'high' && '≥3 full years of clean data. Metrics are statistically reliable.'}
              {confidence === 'medium' && '1–2 clean years available. Treat averages as indicative — more data needed for firm conclusions.'}
              {confidence === 'low' && 'Fewer than 1 clean year available. All metrics are highly uncertain. Farm may be recently commissioned or ramping up.'}
            </p>
          </div>
        </>
      )}
    </span>
  )
}

// ============================================================
// Data coverage card (used in ExplainerTab)
// ============================================================

function DataCoverageCard({ vs }: { vs: import('../../lib/types').WindValueSummary }) {
  if (!vs.commissioning_year) return null
  const hasRamp = vs.ramp_year != null
  const cfDiff = hasRamp && vs.avg_cf_pct != null && vs.avg_cf_excl_ramp != null
    ? vs.avg_cf_excl_ramp - vs.avg_cf_pct
    : null
  const confidenceColor = vs.data_confidence === 'high' ? '#22c55e'
    : vs.data_confidence === 'medium' ? '#f59e0b' : '#ef4444'
  const dots = vs.data_confidence === 'high' ? '●●●' : vs.data_confidence === 'medium' ? '●●○' : '●○○'
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
      <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
        📊 Data Coverage &amp; Reliability
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
        <div>
          <p className="text-[9px] text-[var(--color-text-muted)]">Commissioned</p>
          <p className="text-xs font-bold text-[var(--color-text)]">{vs.commissioning_year}</p>
        </div>
        <div>
          <p className="text-[9px] text-[var(--color-text-muted)]">Years of data</p>
          <p className="text-xs font-bold text-[var(--color-text)]">
            {vs.data_years_clean} clean{vs.ramp_year ? ` (+1 ramp-up)` : ''}
          </p>
        </div>
        <div>
          <p className="text-[9px] text-[var(--color-text-muted)]">Completeness</p>
          <p className="text-xs font-bold" style={{ color: confidenceColor }}>{vs.data_completeness_pct}%</p>
          <p className="text-[9px] text-[var(--color-text-muted)]">{vs.data_years} of {vs.years_since_cod} yrs</p>
        </div>
        <div>
          <p className="text-[9px] text-[var(--color-text-muted)]">Confidence</p>
          <p className="text-xs font-bold" style={{ color: confidenceColor }}>
            <span style={{ letterSpacing: 1 }}>{dots}</span> {vs.data_confidence.charAt(0).toUpperCase() + vs.data_confidence.slice(1)}
          </p>
        </div>
      </div>
      {hasRamp && cfDiff != null && cfDiff > 0.5 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 mt-1">
          <p className="text-[10px] text-amber-400 font-semibold mb-0.5">⚠️ Ramp-up year detected ({vs.ramp_year})</p>
          <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
            The {vs.ramp_year} data year shows very low output ({vs.ramp_year_cf_pct?.toFixed(1)}% CF) consistent
            with commissioning ramp-up rather than full operation. This drags the multi-year average CF down by{' '}
            <strong className="text-amber-400">+{cfDiff.toFixed(1)}%</strong>.{' '}
            Excluding the ramp-up year: <strong className="text-[var(--color-text)]">{vs.avg_cf_excl_ramp?.toFixed(1)}% avg CF</strong>
            {' '}vs reported{' '}<strong className="text-[var(--color-text-muted)]">{vs.avg_cf_pct?.toFixed(1)}%</strong>.
          </p>
        </div>
      )}
      {vs.data_completeness_pct < 60 && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 mt-1">
          <p className="text-[10px] text-blue-400 leading-relaxed">
            <strong>Historical data gap:</strong> {vs.data_years} years of data available but this farm has been operating for {vs.years_since_cod} years
            ({vs.commissioning_year}–present). Pre-2018 records are not yet loaded — earlier data may be backfilled
            via the <code className="bg-white/10 px-0.5 rounded">--backfill-from</code> pipeline flag.
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Explainer tab — educational framework + pros/cons
// ============================================================

function ExplainerTab({ project, stateAvg }: { project: WindValueProject; stateAvg: WindStateAverage | null }) {
  const vs = project.value_summary
  const pc = project.pros_cons
  const sr = project.state_rank

  const valuationDimensions = [
    {
      icon: '⚡',
      title: 'Volume (Capacity Factor)',
      explain: 'How much electricity the farm actually produces vs its rated capacity. Higher CF = more MWh sold = more revenue.',
      value: vs.avg_cf_pct != null ? `${vs.avg_cf_pct.toFixed(1)}%` : '–',
      benchmark: stateAvg?.avg_cf_pct != null ? `${stateAvg.avg_cf_pct.toFixed(1)}% state avg` : null,
      signal: signalFromRank(sr?.cf_percentile),
    },
    {
      icon: '💵',
      title: 'Capture Price',
      explain: 'The average $/MWh actually received when selling into the spot market. Wind farms often sell at a discount to the pool average because they generate heavily during the same periods as other wind farms, pushing prices down (cannibalisation).',
      value: vs.avg_capture_price != null ? `$${vs.avg_capture_price.toFixed(0)}/MWh` : '–',
      benchmark: stateAvg?.avg_capture_price != null ? `$${stateAvg.avg_capture_price.toFixed(0)}/MWh state avg` : null,
      signal: signalFromRank(sr?.capture_price_percentile),
    },
    {
      icon: '📊',
      title: 'Value Factor',
      explain: 'Value factor (VF) = capture price ÷ time-averaged regional reference price (RRP). It is a RATIO (not a percentage). VF = 1.00 means this farm earns exactly the regional average across all hours — no cannibalisation discount. VF = 0.85 means it earns 15% below pool, the typical wind range (0.75–0.95). VF > 1.00 means the farm structurally generates more during higher-price periods than lower ones — rare for wind, sometimes seen in cold-fronted ranges that produce best in winter peaks. VF < 0.65 reflects heavy cannibalisation (concentrated output in low-price renewable hours), common in SA and parts of VIC.',
      value: vs.avg_value_factor != null ? vs.avg_value_factor.toFixed(2) : '–',
      benchmark: stateAvg?.avg_value_factor != null ? `${stateAvg.avg_value_factor.toFixed(2)} state avg` : null,
      signal: vs.avg_value_factor != null
        ? (vs.avg_value_factor >= 0.90 ? 'good' : vs.avg_value_factor >= 0.75 ? 'ok' : 'warn')
        : 'neutral',
    },
    {
      icon: '📅',
      title: 'Seasonal Revenue',
      explain: 'Which seasons deliver the most revenue. Wind farms with strong winter output (when prices are high) earn more than those biased to summer. Understanding this shapes PPA structuring and refinancing risk.',
      value: (() => {
        const winter = project.seasonal_averages['winter']
        const summer = project.seasonal_averages['summer']
        if (!winter?.avg_cf_pct || !summer?.avg_cf_pct) return '–'
        return `${winter.avg_cf_pct.toFixed(0)}% winter / ${summer.avg_cf_pct.toFixed(0)}% summer CF`
      })(),
      benchmark: null,
      signal: (() => {
        const winter = project.seasonal_averages['winter']?.avg_cf_pct
        const summer = project.seasonal_averages['summer']?.avg_cf_pct
        if (!winter || !summer) return 'neutral'
        return winter > summer + 6 ? 'good' : winter < summer - 3 ? 'warn' : 'ok'
      })(),
    },
    {
      icon: '📉',
      title: 'CF Trend',
      explain: 'Whether capacity factor is improving or declining over time. Declining CF can indicate equipment ageing, increasing curtailment, or worsening dispatch conditions as more wind enters the region.',
      value: vs.cf_trend.charAt(0).toUpperCase() + vs.cf_trend.slice(1),
      benchmark: vs.data_years > 0 ? `${vs.data_years} years of data` : null,
      signal: vs.cf_trend === 'improving' ? 'good' : vs.cf_trend === 'declining' ? 'warn' : 'ok',
    },
    {
      icon: '📐',
      title: 'Revenue Variability',
      explain: 'How much annual CF varies year-to-year. High variability (±5%+ CF) makes it harder to forecast revenue, increasing lender margin requirements in project finance. Low variability = more bankable cashflows.',
      value: vs.annual_cf_variability != null ? `±${vs.annual_cf_variability.toFixed(1)}% annual CF` : '–',
      benchmark: null,
      signal: vs.annual_cf_variability != null
        ? (vs.annual_cf_variability <= 3 ? 'good' : vs.annual_cf_variability <= 5 ? 'ok' : 'warn')
        : 'neutral',
    },
  ]

  return (
    <div className="space-y-5">
      {/* Headline metrics */}
      <div className="grid grid-cols-3 gap-2">
        <MetricCard
          label="Avg CF"
          value={vs.avg_cf_pct != null ? `${vs.avg_cf_pct.toFixed(1)}%` : '–'}
          sub={stateAvg?.avg_cf_pct != null ? `${stateAvg.avg_cf_pct.toFixed(1)}% state` : undefined}
          highlight={rankHighlight(sr?.cf_percentile)}
        />
        <MetricCard
          label="Capture Price"
          value={vs.avg_capture_price != null ? `$${vs.avg_capture_price.toFixed(0)}` : '–'}
          sub={stateAvg?.avg_capture_price != null ? `$${stateAvg.avg_capture_price.toFixed(0)} state` : undefined}
          highlight={rankHighlight(sr?.capture_price_percentile)}
        />
        <MetricCard
          label="Value Factor"
          value={vs.avg_value_factor != null ? vs.avg_value_factor.toFixed(2) : '–'}
          sub={vs.avg_value_factor != null
            ? (vs.avg_value_factor >= 0.90 ? 'strong' : vs.avg_value_factor >= 0.75 ? 'moderate' : 'discounted')
            : undefined}
          highlight={vs.avg_value_factor != null
            ? (vs.avg_value_factor >= 0.90 ? 'green' : vs.avg_value_factor >= 0.75 ? 'yellow' : 'red')
            : undefined}
        />
      </div>

      {/* Data coverage card */}
      <DataCoverageCard vs={vs} />

      {/* Valuation framework */}
      <div>
        <SectionTitle>How to value a wind farm</SectionTitle>
        <p className="text-xs text-[var(--color-text-muted)] mb-3 leading-relaxed">
          Wind farm value = <strong className="text-[var(--color-text)]">Volume × Price × Certainty</strong>.
          Each dimension below shows how {project.name} performs across the key valuation drivers.
        </p>
        <div className="space-y-2">
          {valuationDimensions.map(d => (
            <ValuationRow key={d.title} {...d} />
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
                {pc.pros.map((p, i) => (
                  <li key={i} className="text-[11px] text-[var(--color-text)] leading-relaxed flex gap-2">
                    <span className="text-green-400 mt-0.5 shrink-0">+</span>
                    <span>{p}</span>
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
                {pc.cons.map((c, i) => (
                  <li key={i} className="text-[11px] text-[var(--color-text)] leading-relaxed flex gap-2">
                    <span className="text-red-400 mt-0.5 shrink-0">−</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* State ranking bar */}
      {sr && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
          <SectionTitle>State ranking ({project.state})</SectionTitle>
          <div className="grid grid-cols-3 gap-2">
            <RankBar label="Capacity Factor" rank={sr.cf_rank} total={sr.cf_total} percentile={sr.cf_percentile} />
            <RankBar label="Capture Price" rank={sr.capture_price_rank} total={sr.capture_price_total} percentile={sr.capture_price_percentile} />
            <RankBar label="Revenue/MW" rank={sr.revenue_per_mw_rank} total={sr.revenue_per_mw_total} />
          </div>
        </div>
      )}

      <p className="text-[9px] text-[var(--color-text-muted)] italic">
        Analytics from OpenElectricity API performance data {vs.data_first_year}–{vs.data_last_year}.
        Pool prices available Aug 2024 onward (AEMO MMSDM). Value factor calculated where pool price data exists.
      </p>
    </div>
  )
}

function ValuationRow({
  icon, title, explain, value, benchmark, signal,
}: {
  icon: string; title: string; explain: string; value: string
  benchmark: string | null; signal: string
}) {
  const [open, setOpen] = useState(false)
  const dotColor = signal === 'good' ? '#22c55e' : signal === 'ok' ? '#3b82f6' : signal === 'warn' ? '#ef4444' : '#6b7280'
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors"
      >
        <span className="text-sm">{icon}</span>
        <span className="text-xs font-medium text-[var(--color-text)] flex-1">{title}</span>
        <span className="text-xs font-bold" style={{ color: dotColor }}>{value}</span>
        {benchmark && (
          <span className="text-[10px] text-[var(--color-text-muted)] hidden sm:inline ml-1">({benchmark})</span>
        )}
        <span
          className="w-2 h-2 rounded-full ml-1 shrink-0"
          style={{ backgroundColor: dotColor }}
        />
        <span className="text-[10px] text-[var(--color-text-muted)] ml-1">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 text-[11px] text-[var(--color-text-muted)] leading-relaxed border-t border-[var(--color-border)]">
          <p className="mt-2">{explain}</p>
        </div>
      )}
    </div>
  )
}

function RankBar({ label, rank, total, percentile }: { label: string; rank: number; total: number; percentile?: number }) {
  const pct = percentile ?? Math.round((total - rank) / total * 100)
  const color = pct >= 75 ? '#22c55e' : pct >= 50 ? '#3b82f6' : pct >= 25 ? '#f59e0b' : '#ef4444'
  return (
    <div>
      <p className="text-[10px] text-[var(--color-text-muted)] mb-1">{label}</p>
      <div className="flex items-center gap-1.5">
        <div className="flex-1 h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
        <span className="text-[10px] font-medium" style={{ color }}>
          #{rank}/{total}
        </span>
      </div>
    </div>
  )
}

// ============================================================
// Daily shape tab
// ============================================================

type ShapeView = 'annual' | string // month "1"-"12" or season key

function DailyShapeTab({ project }: { project: WindValueProject }) {
  const [view, setView] = useState<ShapeView>('annual')
  const [showState] = useState(false)
  const shape = project.hourly_shape

  if (!shape) {
    return (
      <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-5 space-y-3">
        <p className="text-sm text-[var(--color-text)] font-semibold">Daily shape data temporarily unavailable</p>
        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
          The hourly generation profile is built by a separate pipeline (<code className="bg-white/10 px-1 rounded text-[10px]">import_wind_profiles.py</code>) that aggregates OpenElectricity 30-minute dispatch into hour-of-day capacity-factor curves — annual, monthly, and seasonal. This pipeline has not run for the current data snapshot, so no operating wind farm in AURES currently has hourly_shape attached.
        </p>
        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
          When it returns, this tab will show:
        </p>
        <ul className="text-xs text-[var(--color-text-muted)] list-disc list-inside ml-1 space-y-0.5">
          <li>Hour-of-day CF curve (avg across all operational years)</li>
          <li>View toggles: Annual · Summer/Autumn/Winter/Spring · Jan-Dec</li>
          <li>Solar-correlation R against a representative NEM solar shape (used in the Diversity tab today)</li>
        </ul>
        <p className="text-xs text-[var(--color-text-muted)] italic">
          In the meantime, the Diversity tab still uses the existing shape data for fleet-correlation analysis where available; the Trend tab’s Curtailment & MLF Indicators provides a parallel read on operational performance.
        </p>
      </div>
    )
  }

  const getProfile = (v: ShapeView): (number | null)[] => {
    if (v === 'annual') return shape.annual
    if (['summer', 'autumn', 'winter', 'spring'].includes(v)) return shape.seasons[v] ?? shape.annual
    return shape.months[v] ?? shape.annual
  }

  const activeProfile = getProfile(view)
  const annualAvg = (() => {
    const vals = shape.annual.filter((v): v is number => v != null)
    return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null
  })()

  // Fixed Y-axis domain spanning every profile in this farm's shape data
  // (annual + 4 seasons + 12 months). Holds the axis steady when the user
  // toggles between periods, so curves are visually comparable. Also reused
  // for the seasonal-overlay chart below so a single-period view and the
  // four-season overlay share scale.
  const yDomain = useMemo<[number, number]>(() => {
    const allVals: number[] = []
    const collect = (arr?: (number | null)[]) => {
      if (!arr) return
      for (const v of arr) if (v != null) allVals.push(v)
    }
    collect(shape.annual)
    Object.values(shape.seasons ?? {}).forEach(collect)
    Object.values(shape.months ?? {}).forEach(collect)
    if (annualAvg != null) allVals.push(annualAvg)
    if (allVals.length === 0) return [0, 100]
    const min = Math.min(...allVals)
    const max = Math.max(...allVals)
    // Pad ±2pp for breathing room, clamp to [0, 100] since CF is bounded
    const pad = 2
    return [
      Math.max(0, Math.floor(min - pad)),
      Math.min(100, Math.ceil(max + pad)),
    ]
  }, [shape, annualAvg])

  const chartData = HOURS.map((label, i) => ({
    hour: label,
    cf: activeProfile[i] != null ? Number((activeProfile[i] as number).toFixed(1)) : null,
    flat: annualAvg != null ? Number(annualAvg.toFixed(1)) : null,
  }))

  return (
    <div className="space-y-4">
      {/* Explainer */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
        <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
          <strong className="text-[var(--color-text)]">Daily shape</strong> shows average capacity factor by hour of day
          (AEST, UTC+10). Unlike solar, wind generates around the clock — but still has time-of-day patterns
          driven by local meteorology. The flat line is the annual average CF (what you'd expect with zero diurnal pattern).
          {shape.data_period !== 'sample (not real)' && (
            <span className="block mt-1 text-[9px] opacity-70">Data period: {shape.data_period}</span>
          )}
        </p>
      </div>

      {/* View selector */}
      <div className="flex gap-1 flex-wrap">
        <ViewBtn active={view === 'annual'} onClick={() => setView('annual')} label="Annual avg" />
        <span className="text-[var(--color-border)] self-center text-xs">|</span>
        {Object.entries(SEASON_CONFIG).map(([k, s]) => (
          <ViewBtn key={k} active={view === k} onClick={() => setView(k)} label={s.label} color={s.color} />
        ))}
        <span className="text-[var(--color-border)] self-center text-xs">|</span>
        {MONTH_LABELS.map((m, i) => (
          <ViewBtn key={i} active={view === String(i + 1)} onClick={() => setView(String(i + 1))} label={m} small />
        ))}
      </div>

      {/* Line chart */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
        <p className="text-[10px] font-medium text-[var(--color-text-muted)] mb-3 uppercase tracking-wider flex items-center">
          Hourly CF Profile — {view === 'annual' ? 'Annual Average' : view in SEASON_CONFIG ? SEASON_CONFIG[view].label : `${MONTH_LABELS[parseInt(view) - 1]}`}
          <ChartInfo>
            <p style={{color:'#f1f5f9',fontWeight:600,marginBottom:4}}>Hourly generation shape</p>
            Average capacity factor % by hour of day (AEST, UTC+10). A flat line would mean equal generation at all hours — deviations reveal time-of-day patterns driven by local wind meteorology.<br/><br/>
            <span style={{color:'#f1f5f9',fontWeight:600}}>Data:</span> OpenElectricity API facility-level dispatch, covering approximately May 2025–May 2026 (the 367-day free tier window). Built from 12 × 30-day API calls per project.<br/><br/>
            <span style={{color:'#22c55e',fontWeight:600}}>Strong:</span> Directly from AEMO 5-min dispatch, aggregated to hourly. <span style={{color:'#f59e0b',fontWeight:600}}>Caution:</span> Only one year of recent data — longer-run multi-year patterns not captured here.
          </ChartInfo>
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -14 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }}
              interval={3}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
              tickFormatter={v => `${v}%`}
              domain={yDomain}
              allowDataOverflow={false}
            />
            <Tooltip
              contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
              formatter={((value, name) => [
                `${value?.toFixed(1)}%`,
                name === 'cf' ? 'Capacity Factor' : 'Annual Avg'
              ]) as TF}
            />
            <Line
              type="monotone"
              dataKey="flat"
              stroke="#6b7280"
              strokeWidth={1}
              strokeDasharray="4 3"
              dot={false}
              name="flat"
            />
            <Line
              type="monotone"
              dataKey="cf"
              stroke={view in SEASON_CONFIG ? SEASON_CONFIG[view].color : '#3b82f6'}
              strokeWidth={2.5}
              dot={false}
              connectNulls
              name="cf"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Seasonal overlay comparison */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
        <p className="text-[10px] font-medium text-[var(--color-text-muted)] mb-3 uppercase tracking-wider flex items-center">
          All Seasons Compared
          <ChartInfo>
            <p style={{color:'#f1f5f9',fontWeight:600,marginBottom:4}}>Seasonal shape overlay</p>
            The same hourly CF profile split by meteorological season: <strong style={{color:'#f1f5f9'}}>Summer</strong> (Dec/Jan/Feb), <strong style={{color:'#f1f5f9'}}>Autumn</strong> (Mar/Apr/May), <strong style={{color:'#f1f5f9'}}>Winter</strong> (Jun/Jul/Aug), <strong style={{color:'#f1f5f9'}}>Spring</strong> (Sep/Oct/Nov). Reveals whether the farm's daily generation rhythm changes across seasons.<br/><br/>
            <span style={{color:'#f1f5f9',fontWeight:600}}>Data:</span> Same May 2025–May 2026 OE API dataset. Some seasons may have slightly more or fewer weeks depending on the exact window.<br/><br/>
            <span style={{color:'#f59e0b',fontWeight:600}}>Caution:</span> ~13 weeks per season — individual weather events can noticeably shift the average shape.
          </ChartInfo>
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart
            data={HOURS.map((label, i) => {
              const row: Record<string, string | number | null> = { hour: label }
              Object.keys(SEASON_CONFIG).forEach(s => {
                const v = shape.seasons[s]?.[i]
                row[s] = v != null ? Number(v.toFixed(1)) : null
              })
              return row
            })}
            margin={{ top: 4, right: 8, bottom: 0, left: -14 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="hour" tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} interval={3} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickFormatter={v => `${v}%`} domain={yDomain} />
            <Tooltip
              contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
              formatter={((v, name) => [`${v?.toFixed(1)}%`, SEASON_CONFIG[name]?.label ?? name]) as TF}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} formatter={(v: string) => SEASON_CONFIG[v]?.label ?? v} />
            {Object.entries(SEASON_CONFIG).map(([k, s]) => (
              <Line key={k} type="monotone" dataKey={k} stroke={s.color} strokeWidth={1.8} dot={false} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
        {showState && <p className="text-[9px] text-[var(--color-text-muted)] mt-1">State avg overlay coming soon.</p>}
      </div>
    </div>
  )
}

// ============================================================
// Capture price tab
// ============================================================

function CaptureTab({ project, stateAvg }: { project: WindValueProject; stateAvg: WindStateAverage | null }) {
  const [showYear, setShowYear] = useState<number | 'avg'>('avg')
  const [excludeCommissioning, setExcludeCommissioning] = useState(true)
  const vs = project.value_summary

  // Adjust monthly data: scale current partial month + optionally drop commissioning months
  const adjustedMonthly = useMemo(
    () => getAdjustedMonthlyData(project.monthly_data, vs, project.cod, { excludeCommissioning }),
    [project.monthly_data, project.cod, vs, excludeCommissioning]
  )

  // Avg energy and revenue per calendar month across all years (for 'avg' view)
  // Use adjusted values so the current-partial-month is scaled correctly
  const avgByMonth: Record<number, { energy: number | null; revenue: number | null }> = {}
  for (let mo = 1; mo <= 12; mo++) {
    const withEnergy = adjustedMonthly.filter(m => m.month === mo && m.energyMwhAdjusted != null)
    const withRevenue = adjustedMonthly.filter(m => m.month === mo && m.revenueAudAdjusted != null)
    avgByMonth[mo] = {
      energy: withEnergy.length > 0
        ? withEnergy.reduce((s, e) => s + (e.energyMwhAdjusted ?? 0), 0) / withEnergy.length
        : null,
      revenue: withRevenue.length > 0
        ? withRevenue.reduce((s, e) => s + (e.revenueAudAdjusted ?? 0), 0) / withRevenue.length
        : null,
    }
  }

  // Monthly averaged data (for value factor chart)
  const monthlyAvgData = MONTH_LABELS.map((label, i) => {
    const mo = String(i + 1)
    const avg = project.monthly_averages[mo]
    return {
      month: label,
      capture: avg?.avg_capture_price ?? null,
      value_factor: avg?.avg_value_factor ?? null,
    }
  })

  // Year options — from adjusted (commissioning-filtered) data
  const yearOptions = useMemo(
    () => [...new Set(adjustedMonthly.map(m => m.year))].sort(),
    [adjustedMonthly]
  )

  // Per-month chart data including output and revenue
  const yearData = MONTH_LABELS.map((label, i) => {
    const mo = i + 1
    const entry = showYear === 'avg'
      ? null
      : adjustedMonthly.find(m => m.year === showYear && m.month === mo)
    const avg = project.monthly_averages[String(mo)]

    const capturePrice = showYear === 'avg' ? (avg?.avg_capture_price ?? null) : (entry?.capture_price ?? null)
    const poolPrice = showYear === 'avg' ? null : (entry?.pool_price ?? null)
    const energyMwh = showYear === 'avg' ? (avgByMonth[mo]?.energy ?? null) : (entry?.energyMwhAdjusted ?? null)
    const revenueAud = showYear === 'avg' ? (avgByMonth[mo]?.revenue ?? null) : (entry?.revenueAudAdjusted ?? null)
    const flatAud = energyMwh != null && poolPrice != null ? energyMwh * poolPrice : null

    return {
      month: label,
      capture: capturePrice,
      pool: poolPrice,
      vf: showYear === 'avg' ? (avg?.avg_value_factor ?? null) : (entry?.value_factor ?? null),
      energy: energyMwh != null ? Math.round(energyMwh / 1000 * 10) / 10 : null,        // GWh, 1dp
      revenue: revenueAud != null ? Math.round(revenueAud / 1_000_000 * 10) / 10 : null, // $M, 1dp
      flat: flatAud != null ? Math.round(flatAud / 1_000_000 * 10) / 10 : null,          // $M, 1dp
      isPartial: entry?.isPartial ?? false,
    }
  })

  const hasFlatData = yearData.some(d => d.flat != null)

  // Constant Y-axis maxes across ALL years' adjusted data (so flicking through years keeps axes comparable)
  const globalMaxes = useMemo(() => {
    let maxCapture = 0, maxPool = 0, maxEnergy = 0, maxRevenue = 0, maxFlat = 0
    for (const m of adjustedMonthly) {
      if (m.capture_price != null && m.capture_price > maxCapture) maxCapture = m.capture_price
      if (m.pool_price != null && m.pool_price > maxPool) maxPool = m.pool_price
      if (m.energyMwhAdjusted != null) {
        const e = m.energyMwhAdjusted / 1000
        if (e > maxEnergy) maxEnergy = e
      }
      if (m.revenueAudAdjusted != null) {
        const r = m.revenueAudAdjusted / 1_000_000
        if (r > maxRevenue) maxRevenue = r
      }
      if (m.energyMwhAdjusted != null && m.pool_price != null) {
        const f = (m.energyMwhAdjusted * m.pool_price) / 1_000_000
        if (f > maxFlat) maxFlat = f
      }
    }
    // Round up to a nice tick value
    const niceUp = (v: number) => v <= 0 ? 1 : Math.ceil(v * 1.1)
    return {
      capture: niceUp(Math.max(maxCapture, maxPool)),
      energy: niceUp(maxEnergy),
      revenue: niceUp(Math.max(maxRevenue, maxFlat)),
    }
  }, [adjustedMonthly])

  // Count commissioning months excluded (for UI badge)
  const commissioningCount = useMemo(() => {
    const all = getAdjustedMonthlyData(project.monthly_data, vs, project.cod, { excludeCommissioning: false })
    return all.filter(m => m.isRampMonth).length
  }, [project.monthly_data, project.cod, vs])

  return (
    <div className="space-y-4">
      {/* Explainer */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
        <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
          <strong className="text-[var(--color-text)]">Revenue capture</strong> — a wind farm&apos;s capture price is almost always
          below the pool average. This &quot;value factor discount&quot; comes from <em>cannibalisation</em>: all wind farms
          generate at the same time (windy days), flooding the market and driving prices down.
          The further below 1.0 the value factor, the worse the cannibalisation effect.
        </p>
      </div>

      {/* Headline value metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <MetricCard
          label="Avg Capture Price"
          value={vs.avg_capture_price != null ? `$${vs.avg_capture_price.toFixed(0)}/MWh` : '–'}
          sub={stateAvg?.avg_capture_price != null ? `$${stateAvg.avg_capture_price.toFixed(0)} state avg` : undefined}
        />
        <MetricCard
          label="Value Factor"
          value={vs.avg_value_factor != null ? vs.avg_value_factor.toFixed(2) : '–'}
          sub="capture ÷ pool avg"
          highlight={vs.avg_value_factor != null
            ? (vs.avg_value_factor >= 0.90 ? 'green' : vs.avg_value_factor >= 0.75 ? 'yellow' : 'red')
            : undefined}
        />
        <MetricCard
          label="Best Month"
          value={vs.best_capture_month ? MONTH_LABELS[vs.best_capture_month - 1] : '–'}
          sub={vs.best_capture_month ? (() => {
            const d = project.monthly_averages[String(vs.best_capture_month)]
            return d?.avg_capture_price ? `$${d.avg_capture_price.toFixed(0)}/MWh avg` : undefined
          })() : undefined}
        />
        <MetricCard
          label="Worst Month"
          value={vs.worst_capture_month ? MONTH_LABELS[vs.worst_capture_month - 1] : '–'}
          sub={vs.worst_capture_month ? (() => {
            const d = project.monthly_averages[String(vs.worst_capture_month)]
            return d?.avg_capture_price ? `$${d.avg_capture_price.toFixed(0)}/MWh avg` : undefined
          })() : undefined}
          highlight="red"
        />
      </div>

      {/* Year toggle */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-medium">View:</span>
        <ViewBtn active={showYear === 'avg'} onClick={() => setShowYear('avg')} label="All Years Avg" />
        {yearOptions.map(y => (
          <ViewBtn key={y} active={showYear === y} onClick={() => setShowYear(y)} label={String(y)} small />
        ))}
        <div className="flex-1" />
        {/* Commissioning + partial-month controls */}
        {commissioningCount > 0 && (
          <label className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={excludeCommissioning}
              onChange={(e) => setExcludeCommissioning(e.target.checked)}
              className="cursor-pointer accent-[var(--color-primary)] h-3 w-3"
            />
            Exclude commissioning ramp ({commissioningCount} mo)
          </label>
        )}
      </div>

      {/* Partial-month + commissioning explainer */}
      {(yearData.some(d => d.isPartial) || commissioningCount > 0) && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-md p-2 text-[10px] text-[var(--color-text-muted)] leading-relaxed">
          {yearData.some(d => d.isPartial) && (
            <p>
              <span className="text-amber-400">⚙</span> <strong className="text-[var(--color-text-muted)]">Current month:</strong>{' '}
              partial-month data has been scaled to a full-month-equivalent so CF, output and revenue are
              comparable to historical months. Hatched bar shows the partial-month entry.
            </p>
          )}
          {commissioningCount > 0 && (
            <p className="mt-1">
              <span className="text-amber-400">⚙</span> <strong className="text-[var(--color-text-muted)]">Commissioning filter:</strong>{' '}
              {excludeCommissioning
                ? `${commissioningCount} months from commissioning ramp excluded from averages and per-year views.`
                : `Commissioning months currently INCLUDED — averages will be biased low.`}
            </p>
          )}
        </div>
      )}

      {/* 1. Capture price by month */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
        <p className="text-[10px] font-medium text-[var(--color-text-muted)] mb-3 uppercase tracking-wider flex items-center">
          Monthly Capture Price ($/MWh){showYear !== 'avg' ? ` — ${showYear}` : ' — Multi-Year Average'}
          <ChartInfo>
            <p style={{color:'#f1f5f9',fontWeight:600,marginBottom:4}}>Capture price by month</p>
            Average $/MWh the farm actually received when it sold into the NEM spot market, per calendar month. Derived from AEMO settlement records: <em>total revenue ÷ total output</em> for that month. The dashed reference line is the all-years average.<br/><br/>
            When a specific year is selected, the grey bar shows the regional pool average for that month (available from Aug 2024 only) — a green bar means the farm beat the market that month.<br/><br/>
            <span style={{color:'#f1f5f9',fontWeight:600}}>Data:</span> AEMO dispatch/settlement via OpenElectricity. Full operational history (2018+).<br/>
            <span style={{color:'#22c55e',fontWeight:600}}>Strong:</span> Directly from metered settlement records — no estimation.
          </ChartInfo>
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={yearData} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickFormatter={v => `$${v}`}
              domain={[0, globalMaxes.capture]} />
            <Tooltip
              contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
              formatter={((v, name) => [
                `$${v?.toFixed(0)}/MWh`,
                name === 'capture' ? 'Capture Price' : 'Pool Price',
              ]) as TF}
            />
            {showYear !== 'avg' && (
              <Bar dataKey="pool" name="pool" fill="#6b728040" radius={[2, 2, 0, 0]} />
            )}
            <Bar dataKey="capture" name="capture" radius={[4, 4, 0, 0]}>
              {yearData.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.capture && d.pool
                    ? (d.capture >= d.pool ? '#22c55e' : '#3b82f6')
                    : '#3b82f6'}
                  fillOpacity={d.isPartial ? 0.5 : 1}
                  strokeDasharray={d.isPartial ? '3 3' : undefined}
                  stroke={d.isPartial ? '#fbbf24' : undefined}
                />
              ))}
            </Bar>
            {vs.avg_capture_price != null && (
              <ReferenceLine y={vs.avg_capture_price} stroke="#ffffff50" strokeDasharray="4 3"
                label={{ value: `Avg $${vs.avg_capture_price.toFixed(0)}`, fill: '#9ca3af', fontSize: 9, position: 'right' }} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 2. Monthly output (GWh) */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
        <p className="text-[10px] font-medium text-[var(--color-text-muted)] mb-3 uppercase tracking-wider flex items-center">
          Monthly Output (GWh){showYear !== 'avg' ? ` — ${showYear}` : ' — Avg Per Month'}
          <ChartInfo>
            <p style={{color:'#f1f5f9',fontWeight:600,marginBottom:4}}>Monthly generation volume</p>
            Total electricity generated (GWh) per calendar month. In the "All Years Avg" view this is the mean across all years of operation for each month — useful for understanding typical seasonal output.<br/><br/>
            <span style={{color:'#f1f5f9',fontWeight:600}}>Data:</span> AEMO dispatch records via OpenElectricity. Full operational history.<br/>
            <span style={{color:'#22c55e',fontWeight:600}}>Strong:</span> Directly metered generation — no estimation. Blank months indicate missing records (pre-commissioning or data gaps).
          </ChartInfo>
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={yearData} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickFormatter={v => `${v}`} unit=" GWh"
              domain={[0, globalMaxes.energy]} />
            <Tooltip
              contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
              formatter={((v) => [`${v?.toFixed(1)} GWh`, 'Output']) as TF}
            />
            <Bar dataKey="energy" name="energy" radius={[4, 4, 0, 0]}>
              {yearData.map((d, i) => (
                <Cell key={i} fill="#6366f1"
                  fillOpacity={d.isPartial ? 0.5 : 1}
                  strokeDasharray={d.isPartial ? '3 3' : undefined}
                  stroke={d.isPartial ? '#fbbf24' : undefined} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 3. Monthly revenue vs flat */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
        <p className="text-[10px] font-medium text-[var(--color-text-muted)] mb-1 uppercase tracking-wider flex items-center">
          Monthly Revenue vs Flat ($M){showYear !== 'avg' ? ` — ${showYear}` : ' — Avg Per Month'}
          <ChartInfo>
            <p style={{color:'#f1f5f9',fontWeight:600,marginBottom:4}}>Revenue vs flat — what is "flat"?</p>
            <strong style={{color:'#3b82f6'}}>Actual revenue</strong> = output (MWh) × capture price ($/MWh). This is what the farm actually earned.<br/><br/>
            <strong style={{color:'#6b7280'}}>Flat revenue</strong> = output (MWh) × pool average price ($/MWh). This is a <em>theoretical benchmark</em> — what the farm would have earned if it had captured the regional average price instead of its actual (discounted) price. No real wind farm achieves this.<br/><br/>
            The gap between the two bars is the <strong style={{color:'#f1f5f9'}}>dollar cost of cannibalisation</strong> for that month.<br/><br/>
            <span style={{color:'#f59e0b',fontWeight:600}}>Data limitation:</span> Pool price data is only available from Aug 2024. Select 2024 or 2025 to see both bars — earlier years show actual revenue only.
          </ChartInfo>
        </p>
        <p className="text-[9px] text-[var(--color-text-muted)] mb-3">
          {hasFlatData
            ? 'Flat = output × pool price. Gap between bars = dollar cost of cannibalisation.'
            : showYear === 'avg'
              ? 'Select 2024 or 2025 to see flat comparison (pool price data from Aug 2024).'
              : 'No pool price data for this year — flat comparison requires 2024+.'}
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={yearData} margin={{ top: 4, right: 8, bottom: 0, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickFormatter={v => `$${v}M`}
              domain={[0, globalMaxes.revenue]} />
            <Tooltip
              contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
              formatter={((v, name) => [
                `$${v?.toFixed(1)}M`,
                name === 'flat' ? 'Flat (at pool price)' : 'Actual Revenue',
              ]) as TF}
            />
            {hasFlatData && <Bar dataKey="flat" name="flat" fill="#6b728070" radius={[4, 4, 0, 0]} />}
            <Bar dataKey="revenue" name="revenue" radius={[4, 4, 0, 0]}>
              {yearData.map((d, i) => (
                <Cell key={i} fill="#3b82f6"
                  fillOpacity={d.isPartial ? 0.5 : 1}
                  strokeDasharray={d.isPartial ? '3 3' : undefined}
                  stroke={d.isPartial ? '#fbbf24' : undefined} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 4. Value factor by month */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
        <p className="text-[10px] font-medium text-[var(--color-text-muted)] mb-1 uppercase tracking-wider flex items-center">
          Monthly Value Factor (avg across years)
          <ChartInfo>
            <p style={{color:'#f1f5f9',fontWeight:600,marginBottom:4}}>Value factor — price quality</p>
            Value factor = capture price ÷ pool average price. A value of <strong style={{color:'#22c55e'}}>1.0</strong> means the farm matched the market average exactly. Wind farms typically score below 1.0 — they generate simultaneously (windy days), flooding supply and depressing prices exactly when they produce most.<br/><br/>
            Colour: <span style={{color:'#22c55e'}}>green ≥ 1.0</span> · <span style={{color:'#3b82f6'}}>blue 0.80–1.0</span> · <span style={{color:'#ef4444'}}>red &lt; 0.80</span><br/><br/>
            <span style={{color:'#f59e0b',fontWeight:600}}>Data limitation:</span> Pool price data is only available from Aug 2024, so this "average across years" is actually an average of only recent months. Values shown here reflect a high-price, volatile period and may not represent long-run norms.
          </ChartInfo>
        </p>
        <p className="text-[9px] text-[var(--color-text-muted)] mb-3">
          &gt;1.0 = captured above pool avg · &lt;1.0 = discount to pool avg
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={monthlyAvgData} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} domain={[0, 'auto']} tickFormatter={v => v.toFixed(2)} />
            <Tooltip
              contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
              formatter={((v) => [v?.toFixed(3), 'Value Factor']) as TF}
            />
            <ReferenceLine y={1.0} stroke="#ffffff30" strokeDasharray="4 3" />
            <Bar dataKey="value_factor" radius={[4, 4, 0, 0]}>
              {monthlyAvgData.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.value_factor == null ? '#374151' : d.value_factor >= 1.0 ? '#22c55e' : d.value_factor >= 0.80 ? '#3b82f6' : '#ef4444'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ============================================================
// Seasonal tab
// ============================================================

function SeasonalTab({ project }: { project: WindValueProject; stateAvg?: WindStateAverage | null }) {
  const seasons = ['summer', 'autumn', 'winter', 'spring']

  // Seasonal CF bar chart data
  const cfData = seasons.map(s => ({
    season: SEASON_CONFIG[s].label,
    cf: project.seasonal_averages[s]?.avg_cf_pct ?? null,
    capture: project.seasonal_averages[s]?.avg_capture_price ?? null,
    energy_pct: project.seasonal_averages[s]?.pct_of_annual_energy ?? null,
  }))

  return (
    <div className="space-y-4">
      <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3">
        <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
          <strong className="text-[var(--color-text)]">Seasonal revenue distribution</strong> is critical for project
          finance and PPA design. A farm that earns most of its revenue in winter (when prices are higher in most NEM
          regions) is worth more than one with flat or summer-biased output. The revenue share column shows how much
          of annual energy (and likely revenue) comes from each season.
        </p>
      </div>

      {/* Season cards */}
      <div className="grid grid-cols-2 gap-2">
        {seasons.map(s => {
          const sa = project.seasonal_averages[s]
          const conf = SEASON_CONFIG[s]
          return (
            <div key={s} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{conf.icon}</span>
                <span className="text-xs font-semibold text-[var(--color-text)]">{conf.label}</span>
                <span className="text-[10px] text-[var(--color-text-muted)]">
                  ({sa?.months?.map(m => MONTH_LABELS[m - 1]).join('/') ?? ''})
                </span>
              </div>
              <div className="space-y-1.5">
                <StatRow label="Avg CF" value={sa?.avg_cf_pct != null ? `${sa.avg_cf_pct.toFixed(1)}%` : '–'} color={conf.color} />
                <StatRow label="Capture price" value={sa?.avg_capture_price != null ? `$${sa.avg_capture_price.toFixed(0)}/MWh` : '–'} color={conf.color} />
                <StatRow label="Value factor" value={sa?.avg_value_factor != null ? sa.avg_value_factor.toFixed(2) : '–'} color={conf.color} />
                <StatRow label="% annual energy" value={sa?.pct_of_annual_energy != null ? `${sa.pct_of_annual_energy.toFixed(1)}%` : '–'} color="#6b7280" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Seasonal CF bar chart */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
        <p className="text-[10px] font-medium text-[var(--color-text-muted)] mb-3 uppercase tracking-wider flex items-center">Seasonal CF &amp; Capture Price
          <ChartInfo>
            <p style={{color:'#f1f5f9',fontWeight:600,marginBottom:4}}>Seasonal performance</p>
            Bars (left axis) = average CF% per season. Translucent line (right axis) = average capture price $/MWh. Together they show which seasons deliver the best combination of volume and price.<br/><br/>
            <span style={{color:'#f1f5f9',fontWeight:600}}>Data:</span> Derived from full AEMO monthly history (2018+). CF data is strong across all years. <span style={{color:'#f59e0b',fontWeight:600}}>Caution:</span> Capture price and value factor reflect only months with pool price data (Aug 2024+).
          </ChartInfo>
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={cfData} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="season" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
            <YAxis yAxisId="cf" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickFormatter={v => `${v}%`} />
            <YAxis yAxisId="cp" orientation="right" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickFormatter={v => `$${v}`} />
            <Tooltip
              contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
              formatter={((v, name) => [
                name === 'cf' ? `${v?.toFixed(1)}%` : `$${v?.toFixed(0)}/MWh`,
                name === 'cf' ? 'Capacity Factor' : 'Capture Price',
              ]) as TF}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} formatter={(v: string) => v === 'cf' ? 'Capacity Factor' : 'Capture Price'} />
            <Bar yAxisId="cf" dataKey="cf" radius={[4, 4, 0, 0]} name="cf">
              {cfData.map((_d, i) => (
                <Cell key={i} fill={Object.values(SEASON_CONFIG)[i]?.color ?? '#3b82f6'} />
              ))}
            </Bar>
            <Bar yAxisId="cp" dataKey="capture" fill="#ffffff30" radius={[4, 4, 0, 0]} name="capture" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Energy distribution doughnut-style bar */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
        <p className="text-[10px] font-medium text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">Annual Energy Share by Season</p>
        <div className="flex h-6 rounded-full overflow-hidden gap-0.5">
          {cfData.map((d, i) => {
            const conf = Object.values(SEASON_CONFIG)[i]
            const w = d.energy_pct ?? 25
            return (
              <div
                key={i}
                className="flex items-center justify-center text-[9px] font-bold text-white"
                style={{ width: `${w}%`, backgroundColor: conf.color }}
                title={`${conf.label}: ${d.energy_pct?.toFixed(1)}%`}
              >
                {w > 12 ? `${d.energy_pct?.toFixed(0)}%` : ''}
              </div>
            )
          })}
        </div>
        <div className="flex gap-3 mt-2 flex-wrap">
          {cfData.map((d, i) => {
            const conf = Object.values(SEASON_CONFIG)[i]
            return (
              <span key={i} className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: conf.color }} />
                {conf.label} {d.energy_pct?.toFixed(1)}%
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Trend tab
// ============================================================

function TrendTab({ project }: { project: WindValueProject }) {
  const annualData = project.annual_data
  const vs = project.value_summary

  if (annualData.length === 0) {
    return <EmptyState text="Insufficient data for trend analysis" />
  }

  const rampYear = vs.ramp_year

  const cfTrendData = annualData.map(a => ({
    year: a.year.toString(),
    cf: a.cf_pct,
    capture: a.capture_price,
    rev_mw: a.revenue_per_mw != null ? Math.round(a.revenue_per_mw / 1000) : null,
    energy: a.energy_mwh != null ? Math.round(a.energy_mwh / 1000) : null,
    isRamp: a.year === rampYear,
  }))

  // Adjusted monthly data for heatmap — scales current partial month
  const adjustedMonthly = getAdjustedMonthlyData(project.monthly_data, vs, project.cod)

  // Month-by-month heatmap data
  const heatmapYears = [...new Set(adjustedMonthly.map(m => m.year))].sort()
  const heatmapData = heatmapYears.map(y => {
    const row: Record<string, number | string | null> = { year: String(y) }
    for (let mo = 1; mo <= 12; mo++) {
      const entry = adjustedMonthly.find(m => m.year === y && m.month === mo)
      // Use adjusted CF so the current partial month displays a full-month-equivalent value
      row[`m${mo}`] = entry?.cfPctAdjusted ?? null
    }
    return row
  })

  const allCF = adjustedMonthly.map(m => m.cfPctAdjusted).filter((v): v is number => v != null)
  const minCF = allCF.length > 0 ? Math.min(...allCF) : 0
  const maxCF = allCF.length > 0 ? Math.max(...allCF) : 1
  const cfRange = maxCF - minCF || 1

  const cfHeatColor = (v: number | null): string => {
    if (v == null) return 'transparent'
    const t = (v - minCF) / cfRange
    // Blue (low) → green (high)
    const r = Math.round(59 + (34 - 59) * t)
    const g = Math.round(130 + (197 - 130) * t)
    const b = Math.round(246 + (94 - 246) * t)
    return `rgb(${r},${g},${b})`
  }

  return (
    <div className="space-y-4">
      <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-3">
        <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
          <strong className="text-[var(--color-text)]">Multi-year trend</strong> — watch for declining CF
          (equipment ageing or curtailment creep) and declining capture prices (cannibalisation). Revenue/MW
          combines both effects and is the cleanest single measure of a wind farm&apos;s economic performance over time.
        </p>
      </div>

      {/* Annual CF + revenue trend */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
        <p className="text-[10px] font-medium text-[var(--color-text-muted)] mb-3 uppercase tracking-wider flex items-center">Annual Capacity Factor
          <ChartInfo>
            <p style={{color:'#f1f5f9',fontWeight:600,marginBottom:4}}>Year-over-year CF trend</p>
            Annual capacity factor = total energy generated ÷ (installed capacity × 8,760 hours). A declining trend may indicate equipment ageing, increased curtailment, or worsening dispatch conditions as more wind capacity is added to the state.<br/><br/>
            <span style={{color:'#f1f5f9',fontWeight:600}}>Data:</span> AEMO dispatch records, full operational history.<br/>
            <span style={{color:'#22c55e',fontWeight:600}}>Strong:</span> Complete calendar years only. The current partial year (2026) will update as data arrives.
          </ChartInfo>
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={cfTrendData} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickFormatter={v => `${v}%`} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={((v: any, _name: any, props: any) => {
                const isRamp = props?.payload?.isRamp
                return [`${v?.toFixed(1)}%${isRamp ? ' ⚠ ramp-up year' : ''}`, 'Capacity Factor']
              }) as TF}
            />
            <Bar dataKey="cf" radius={[4, 4, 0, 0]}>
              {cfTrendData.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.isRamp ? '#6b7280' : (YEAR_COLORS[parseInt(d.year)] ?? '#3b82f6')}
                  fillOpacity={d.isRamp ? 0.5 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {rampYear && (
          <p className="text-[9px] text-amber-400 mt-1">
            ⚠ Grey bar ({rampYear}): commissioning ramp-up year — low CF due to partial operation, not indicative of long-run performance.
            {vs.avg_cf_excl_ramp != null && vs.avg_cf_pct != null && (
              <> Clean average: <strong>{vs.avg_cf_excl_ramp.toFixed(1)}%</strong> vs incl. ramp: {vs.avg_cf_pct.toFixed(1)}%.</>
            )}
          </p>
        )}
      </div>

      {/* Revenue/MW trend */}
      {cfTrendData.some(d => d.rev_mw != null) && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
          <p className="text-[10px] font-medium text-[var(--color-text-muted)] mb-3 uppercase tracking-wider flex items-center">Annual Revenue per MW ($k)
            <ChartInfo>
              <p style={{color:'#f1f5f9',fontWeight:600,marginBottom:4}}>Revenue intensity ($/MW/year)</p>
              Total annual revenue divided by installed capacity (MW). This normalises for farm size and is the cleanest single measure of economic performance over time — it captures both volume (CF) and price (capture price) in one number.<br/><br/>
              Revenue = sum of monthly (capture price × output). This is gross revenue before O&amp;M, financing costs, or PPA contract adjustments.<br/><br/>
              <span style={{color:'#f1f5f9',fontWeight:600}}>Data:</span> AEMO settlement records, full history.<br/>
              <span style={{color:'#22c55e',fontWeight:600}}>Strong:</span> Directly derived — no estimation. Partial years not shown.
            </ChartInfo>
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={cfTrendData} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickFormatter={v => `$${v}k`} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} formatter={((v) => [`$${v}k/MW`, 'Revenue']) as TF} />
              <Bar dataKey="rev_mw" radius={[4, 4, 0, 0]}>
                {cfTrendData.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.isRamp ? '#6b7280' : (YEAR_COLORS[parseInt(d.year)] ?? '#22c55e')}
                    fillOpacity={d.isRamp ? 0.4 : 0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Monthly CF heatmap */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
        <p className="text-[10px] font-medium text-[var(--color-text-muted)] mb-3 uppercase tracking-wider flex items-center">
          Monthly CF Heatmap (blue=low, green=high)
          <ChartInfo>
            <p style={{color:'#f1f5f9',fontWeight:600,marginBottom:4}}>Month-by-month CF heatmap</p>
            Each cell = one calendar month's capacity factor %. The colour scale is relative to this project's own range (blue = its lowest months, green = its highest) — so it shows relative performance within the farm's own history, not against other farms.<br/><br/>
            Hover any cell to see the exact value. Blank cells = no data (pre-commissioning or missing records).<br/><br/>
            <span style={{color:'#f1f5f9',fontWeight:600}}>Data:</span> AEMO dispatch records, full operational history.<br/>
            <span style={{color:'#22c55e',fontWeight:600}}>Strong:</span> Raw AEMO data — no estimation or imputation.
          </ChartInfo>
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr>
                <th className="text-left text-[var(--color-text-muted)] font-medium pr-2 w-10">Year</th>
                {MONTH_LABELS.map(m => (
                  <th key={m} className="text-center text-[var(--color-text-muted)] font-medium px-0.5 w-8">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmapData.map(row => (
                <tr key={row.year}>
                  <td className="text-[var(--color-text-muted)] pr-2 py-0.5 font-mono">{row.year}</td>
                  {MONTH_LABELS.map((_, i) => {
                    const val = row[`m${i + 1}`] as number | null
                    return (
                      <td
                        key={i}
                        className="text-center py-0.5 px-0.5 rounded text-white font-bold"
                        style={{ backgroundColor: cfHeatColor(val) }}
                        title={val != null ? `${val.toFixed(1)}%` : 'No data'}
                      >
                        {val != null ? val.toFixed(0) : ''}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Capture price trend */}
      {cfTrendData.some(d => d.capture != null) && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
          <p className="text-[10px] font-medium text-[var(--color-text-muted)] mb-3 uppercase tracking-wider flex items-center">Annual Capture Price ($/MWh)
            <ChartInfo>
              <p style={{color:'#f1f5f9',fontWeight:600,marginBottom:4}}>Annual capture price trend</p>
              Average $/MWh received per year — the price dimension of the value equation. A declining trend alongside flat CF would suggest increasing cannibalisation as the state adds more wind capacity.<br/><br/>
              <span style={{color:'#f59e0b',fontWeight:600}}>Data limitation:</span> Capture price is only available for years where monthly pool price data exists in the pipeline (from Aug 2024). Only ~2 years of data are shown. This period has been characterised by unusually high and volatile NEM prices — not representative of long-run norms.<br/><br/>
              Pre-2024 capture prices exist in the AEMO records but pool price reference data to compute value factor is not yet loaded for those years.
            </ChartInfo>
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={cfTrendData} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickFormatter={v => `$${v}`} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} formatter={((v) => [`$${v?.toFixed(0)}/MWh`, 'Capture Price']) as TF} />
              <Line type="monotone" dataKey="capture" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <CurtailmentIndicators project={project} />
    </div>
  )
}

// ============================================================
// Curtailment & MLF indicators — proxies derived from existing AURES data
// ============================================================

function CurtailmentIndicators({ project }: { project: WindValueProject }) {
  const vs = project.value_summary
  const annualData = project.annual_data

  // Build year-over-year deltas (skip ramp year so the early dip isn't read as curtailment)
  const yoy = useMemo(() => {
    const rows: { year: string; cfDelta: number | null; captureDelta: number | null; energy: number | null }[] = []
    const sorted = [...annualData].sort((a, b) => a.year - b.year)
    for (let i = 1; i < sorted.length; i++) {
      const a = sorted[i]
      const prev = sorted[i - 1]
      // Skip ramp year as the "prev" (CF would jump artificially)
      const isRampPrev = prev.year === vs.ramp_year
      rows.push({
        year: String(a.year),
        cfDelta: isRampPrev ? null : (a.cf_pct - prev.cf_pct),
        captureDelta: a.capture_price != null && prev.capture_price != null && !isRampPrev
          ? (a.capture_price - prev.capture_price) : null,
        energy: a.energy_mwh / 1000,
      })
    }
    return rows
  }, [annualData, vs.ramp_year])

  // Cumulative CF drift since first non-ramp year
  const cfDriftPp = useMemo(() => {
    const sorted = [...annualData].filter(a => a.year !== vs.ramp_year).sort((a, b) => a.year - b.year)
    if (sorted.length < 2) return null
    return sorted[sorted.length - 1].cf_pct - sorted[0].cf_pct
  }, [annualData, vs.ramp_year])

  // Cumulative capture price drift
  const captureDriftPct = useMemo(() => {
    const sorted = [...annualData].filter(a => a.year !== vs.ramp_year && a.capture_price != null).sort((a, b) => a.year - b.year)
    if (sorted.length < 2) return null
    const first = sorted[0].capture_price!
    const last = sorted[sorted.length - 1].capture_price!
    if (first === 0) return null
    return ((last - first) / first) * 100
  }, [annualData, vs.ramp_year])

  // Revenue impact of CF drift (per MW per year, using avg capture price)
  const revenueImpactPerMwPerYear = useMemo(() => {
    if (cfDriftPp == null || vs.avg_capture_price == null) return null
    // If CF dropped by X pp, MWh per MW per year drops by X/100 × 8760
    // Revenue per MW lost = MWh × capture_price
    return (cfDriftPp / 100) * 8760 * vs.avg_capture_price
  }, [cfDriftPp, vs.avg_capture_price])

  // Annualised aggregate revenue loss (using project capacity)
  const aggregateAnnualLoss = useMemo(() => {
    if (revenueImpactPerMwPerYear == null) return null
    return revenueImpactPerMwPerYear * project.capacity_mw
  }, [revenueImpactPerMwPerYear, project.capacity_mw])

  return (
    <div className="space-y-4">
      <div className="bg-orange-500/5 border border-orange-500/30 rounded-lg p-3">
        <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
          <strong className="text-[var(--color-text)]">Curtailment &amp; MLF proxies.</strong> AURES does not yet
          ingest MLF history or AEMO constraint logs directly. The following indicators use the data we do
          have — year-over-year CF, capture price, and value factor — as proxies for declining settlement
          economics. A persistent decline in any of these is the operational fingerprint of curtailment
          and/or MLF degradation. The forward-looking section flags cluster build-out that would amplify
          both.
        </p>
      </div>

      {/* Cumulative drift summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <MetricCard
          label="CF drift (since op.)"
          value={cfDriftPp != null ? `${cfDriftPp >= 0 ? '+' : ''}${cfDriftPp.toFixed(1)} pp` : '–'}
          sub="capacity factor trend"
          highlight={cfDriftPp == null ? undefined : cfDriftPp < -2 ? 'red' : cfDriftPp < 0 ? 'yellow' : 'green'}
        />
        <MetricCard
          label="Capture price drift"
          value={captureDriftPct != null ? `${captureDriftPct >= 0 ? '+' : ''}${captureDriftPct.toFixed(0)}%` : '–'}
          sub="cumulative since first year"
          highlight={captureDriftPct == null ? undefined : captureDriftPct < -10 ? 'red' : captureDriftPct < 0 ? 'yellow' : 'green'}
        />
        <MetricCard
          label="Implied rev. lost"
          value={revenueImpactPerMwPerYear != null && revenueImpactPerMwPerYear < 0
            ? `$${Math.abs(revenueImpactPerMwPerYear / 1000).toFixed(1)}k/MW/yr`
            : '–'}
          sub="from CF decline alone"
          highlight={revenueImpactPerMwPerYear != null && revenueImpactPerMwPerYear < 0 ? 'red' : undefined}
        />
        <MetricCard
          label="Aggregate annual loss"
          value={aggregateAnnualLoss != null && aggregateAnnualLoss < 0
            ? `$${(Math.abs(aggregateAnnualLoss) / 1_000_000).toFixed(2)}M/yr`
            : '–'}
          sub={`across ${project.capacity_mw} MW`}
          highlight={aggregateAnnualLoss != null && aggregateAnnualLoss < 0 ? 'red' : undefined}
        />
      </div>

      {/* YoY CF and capture price chart */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
        <p className="text-[10px] font-medium text-[var(--color-text-muted)] mb-3 uppercase tracking-wider flex items-center">
          Year-over-Year Δ — CF (pp) and Capture Price ($/MWh)
          <ChartInfo>
            <p style={{color:'#f1f5f9',fontWeight:600,marginBottom:4}}>Reading the YoY chart</p>
            Bars show the change vs the previous year. Persistent negative CF deltas in a region with growing wind/solar fleet are a strong indicator of <em>cluster cannibalisation + curtailment</em>. Negative capture price deltas in the same period mean the asset is selling its energy into a worsening price environment.<br/><br/>
            One year of negative delta is noise — three consecutive years of negative deltas is a structural problem worth investigating with the operator.<br/><br/>
            <span style={{color:'#f59e0b',fontWeight:600}}>Caveat:</span> Wind capacity factor is genuinely weather-volatile year-to-year. A 2-3 pp swing can come from wind resource alone. Cross-reference with adjacent project YoY trends to separate cluster effects from weather noise.
          </ChartInfo>
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={yoy} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
            <YAxis yAxisId="cf" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickFormatter={v => `${v}pp`} />
            <YAxis yAxisId="cp" orientation="right" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickFormatter={v => `$${v}`} />
            <Tooltip
              contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
              formatter={((v, name) => [
                name === 'cfDelta' ? `${(v as number)?.toFixed(1)} pp` : `$${(v as number)?.toFixed(0)}/MWh`,
                name === 'cfDelta' ? 'CF Δ' : 'Capture Price Δ',
              ]) as TF}
            />
            <ReferenceLine yAxisId="cf" y={0} stroke="#ffffff30" />
            <Bar yAxisId="cf" dataKey="cfDelta" name="cfDelta" radius={[3, 3, 0, 0]}>
              {yoy.map((d, i) => (
                <Cell key={i} fill={d.cfDelta == null ? '#374151' : d.cfDelta < 0 ? '#ef4444' : '#22c55e'} />
              ))}
            </Bar>
            <Bar yAxisId="cp" dataKey="captureDelta" name="captureDelta" radius={[3, 3, 0, 0]} fillOpacity={0.4}>
              {yoy.map((d, i) => (
                <Cell key={i} fill={d.captureDelta == null ? '#374151' : d.captureDelta < 0 ? '#f97316' : '#84cc16'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Forward-looking peer cluster context */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
        <p className="text-[10px] font-medium text-[var(--color-text-muted)] mb-3 uppercase tracking-wider">
          Forward-looking — cluster pressure in {project.state}
        </p>
        <ul className="space-y-1.5 text-[11px] text-[var(--color-text-muted)] leading-relaxed">
          <li>
            <strong className="text-[var(--color-text)]">Cumulative CF drift:</strong>{' '}
            {cfDriftPp != null
              ? `${cfDriftPp >= 0 ? '+' : ''}${cfDriftPp.toFixed(1)} pp from first full year to most recent year. ${
                  cfDriftPp < -1.5
                    ? 'This is consistent with curtailment creep — investigate AEMO constraint logs for the project\'s connection point.'
                    : cfDriftPp < 0
                    ? 'Mild drift — likely a mix of wind variability and incremental curtailment.'
                    : 'Stable or improving — limited curtailment impact to date.'
                }`
              : 'Insufficient operational history.'}
          </li>
          <li>
            <strong className="text-[var(--color-text)]">Capture price drift:</strong>{' '}
            {captureDriftPct != null
              ? `${captureDriftPct >= 0 ? '+' : ''}${captureDriftPct.toFixed(0)}% cumulative since first operational year. ${
                  captureDriftPct < -10
                    ? 'Substantial cannibalisation — the project\'s realised price is materially worse than its first-year benchmark.'
                    : captureDriftPct < 0
                    ? 'Modest decline consistent with cluster build-out.'
                    : 'Broadly stable or up — the project has held its price discount well.'
                }`
              : 'Insufficient pool price history to compute capture drift.'}
          </li>
          <li>
            <strong className="text-[var(--color-text)]">What to investigate further:</strong>
            <ul className="ml-4 mt-1 space-y-1 list-disc list-inside">
              <li>
                AEMO Marginal Loss Factor for the connection point — has it moved by {'>'}5 pp since
                commissioning? Source:{' '}
                <a href="https://aemo.com.au/energy-systems/electricity/national-electricity-market-nem/data-nem/market-management-system-mms-data/marginal-loss-factors-mlf-data"
                  target="_blank" rel="noopener"
                  className="text-[var(--color-primary)] hover:underline">AEMO MLF publication</a>.
              </li>
              <li>
                Adjacent or upstream wind/solar projects either commissioning or in CIS/LTESA award —
                each new entrant in the same network branch adds to cluster cannibalisation and increases
                MLF degradation pressure.
              </li>
              <li>
                Curtailment hours from operator quarterly reporting — broken into technical (AEMO
                constraint) vs economic (negative-price avoidance). The Wind Value Analysis can't
                separate these without ops disclosure.
              </li>
              <li>
                Check the{' '}
                <Link to="/intelligence/scheme-tracker" className="text-[var(--color-primary)] hover:underline">
                  Scheme Tracker
                </Link>{' '}
                for upcoming wind/solar awards in {project.state}, and the{' '}
                <Link to="/intelligence/transmission-infra" className="text-[var(--color-primary)] hover:underline">
                  Transmission Infrastructure intelligence
                </Link>{' '}
                for network-upgrade timelines that may relieve constraints.
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  )
}

// ============================================================
// Peers tab
// ============================================================

function PeersTab({ project, allStateProjects }: { project: WindValueProject; allStateProjects: WindValueProject[] }) {
  const [metric, setMetric] = useState<'cf' | 'capture' | 'rev'>('cf')
  const [filterPartial, setFilterPartial] = useState(false)

  const sortKey: Record<string, (p: WindValueProject) => number> = {
    cf: p => {
      // Use clean CF average if ramp year distorts the reported avg
      const vs = p.value_summary
      if (vs.ramp_year != null && vs.avg_cf_excl_ramp != null) return vs.avg_cf_excl_ramp
      return vs.avg_cf_pct ?? 0
    },
    capture: p => p.value_summary.avg_capture_price ?? 0,
    rev: p => p.value_summary.latest_revenue_per_mw ?? 0,
  }

  const peers = filterPartial
    ? allStateProjects.filter(p => (p.value_summary.data_years_clean ?? p.value_summary.data_years) >= 2)
    : allStateProjects

  const sorted = [...peers].sort((a, b) => sortKey[metric](b) - sortKey[metric](a))
  const barData = sorted.map(p => {
    const vs = p.value_summary
    const hasRamp = vs.ramp_year != null
    const displayValue = metric === 'cf' && hasRamp && vs.avg_cf_excl_ramp != null
      ? vs.avg_cf_excl_ramp
      : sortKey[metric](p)
    return {
      name: p.name.replace(' Wind Farm', '').replace(' Wind', '').slice(0, 22),
      value: displayValue,
      rawValue: sortKey[metric](p),
      isThis: p.id === project.id,
      confidence: vs.data_confidence ?? 'high',
      hasRamp,
      rampYear: vs.ramp_year,
      dataYears: vs.data_years_clean ?? vs.data_years,
    }
  })

  const scatterData = peers.map(p => ({
    cf: p.value_summary.avg_cf_pct ?? 0,
    capture: p.value_summary.avg_capture_price ?? 0,
    name: p.name.replace(' Wind Farm', '').slice(0, 20),
    isThis: p.id === project.id,
    cap: p.capacity_mw,
    confidence: p.value_summary.data_confidence ?? 'high',
  }))

  const metricLabel = { cf: 'Avg CF% (clean)', capture: 'Avg Capture $/MWh', rev: 'Revenue/MW $k' }
  const metricFmt: Record<string, (v: number) => string> = {
    cf: v => `${v.toFixed(1)}%`,
    capture: v => `$${v.toFixed(0)}/MWh`,
    rev: v => `$${Math.round(v / 1000)}k/MW`,
  }

  const confDot = (c: string) => c === 'high' ? '🟢' : c === 'medium' ? '🟡' : '🔴'
  const rampAffected = allStateProjects.filter(p => p.value_summary.ramp_year != null)
  const filteredCount = allStateProjects.length - peers.length

  return (
    <div className="space-y-4">
      <div className="bg-teal-500/5 border border-teal-500/20 rounded-lg p-3">
        <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
          <strong className="text-[var(--color-text)]">Peer comparison</strong> across {allStateProjects.length} operating wind
          farms in {project.state}. Highlighted in white below. Rankings use clean CF averages (excluding ramp-up years)
          so newly commissioned farms are not unfairly penalised.
        </p>
      </div>

      {/* Metric + filter toggles */}
      <div className="flex flex-wrap gap-1 items-center">
        {(['cf', 'capture', 'rev'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              metric === m
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border border-[var(--color-border)] hover:text-[var(--color-text)]'
            }`}
          >
            {metricLabel[m]}
          </button>
        ))}
        <button
          onClick={() => setFilterPartial(v => !v)}
          className={`ml-auto px-2.5 py-1 rounded text-[10px] font-medium transition-colors border ${
            filterPartial
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
              : 'bg-[var(--color-bg-card)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
          title="Exclude farms with fewer than 2 full years of clean data"
        >
          {filterPartial ? `✓ Hiding ${filteredCount} partial` : '🔍 Show all farms'}
        </button>
      </div>

      {/* Horizontal bar chart — ranked peers */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
        <p className="text-[10px] font-medium text-[var(--color-text-muted)] mb-2 uppercase tracking-wider flex items-center">
          {project.state} Wind Farm Rankings — {metricLabel[metric]}
          <ChartInfo>
            <p style={{color:'#f1f5f9',fontWeight:600,marginBottom:4}}>Peer rankings</p>
            All operating wind farms in {project.state}, ranked by the selected metric.<br/><br/>
            <strong style={{color:'#22c55e'}}>CF rankings use clean averages</strong> — ramp-up years (first year of commissioning with anomalously low output) are automatically excluded so newly commissioned farms are not artificially ranked lower than their long-run potential would suggest.<br/><br/>
            🟢 High confidence = ≥3 clean years · 🟡 Medium = 1–2 years · 🔴 Low = &lt;1 year. Use the filter button to hide partial-data farms.<br/><br/>
            <span style={{color:'#f1f5f9',fontWeight:600}}>Data:</span> Same AEMO dispatch pipeline applied to all {project.state} wind farms. Updated when the import pipeline is re-run (typically monthly).
          </ChartInfo>
        </p>
        <div className="space-y-0.5 max-h-80 overflow-y-auto">
          {barData.map((d, i) => {
            const maxVal = barData[0].value || 1
            const w = Math.round((d.value / maxVal) * 100)
            return (
              <div key={i} className="flex items-center gap-1.5">
                <span className={`text-[9px] w-4 shrink-0 text-right ${d.isThis ? 'text-white font-bold' : 'text-[var(--color-text-muted)]'}`}>
                  {i + 1}
                </span>
                <span className="text-[8px] shrink-0 w-3" title={`Data confidence: ${d.confidence}`}>
                  {confDot(d.confidence)}
                </span>
                <div className="flex-1 relative h-5 flex items-center">
                  <div
                    className="absolute inset-y-0.5 left-0 rounded-sm"
                    style={{
                      width: `${w}%`,
                      backgroundColor: d.isThis ? '#ffffff' : '#3b82f640',
                    }}
                  />
                  <span className={`relative z-10 text-[10px] px-1.5 truncate ${d.isThis ? 'font-bold text-[var(--color-bg)]' : 'text-[var(--color-text-muted)]'}`}>
                    {d.name}
                    {d.hasRamp && <span className="ml-1 text-[8px] text-amber-400">*</span>}
                  </span>
                </div>
                <span className={`text-[10px] font-mono shrink-0 ${d.isThis ? 'text-white font-bold' : 'text-[var(--color-text-muted)]'}`}>
                  {metricFmt[metric](d.value)}
                </span>
              </div>
            )
          })}
        </div>
        {rampAffected.length > 0 && (
          <p className="text-[9px] text-amber-400 mt-2">
            * CF excluding ramp-up year (commissioning year anomaly detected).{' '}
            {rampAffected.length} farm{rampAffected.length > 1 ? 's' : ''} affected:{' '}
            {rampAffected.slice(0, 3).map(p => p.name.replace(' Wind Farm', '')).join(', ')}
            {rampAffected.length > 3 && ` +${rampAffected.length - 3} more`}.
          </p>
        )}
      </div>

      {/* Scatter: CF vs capture price */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
        <p className="text-[10px] font-medium text-[var(--color-text-muted)] mb-1 uppercase tracking-wider flex items-center">
          CF vs Capture Price — {project.state} Wind Farms
          <ChartInfo>
            <p style={{color:'#f1f5f9',fontWeight:600,marginBottom:4}}>Volume vs price scatter</p>
            Each dot = one {project.state} wind farm. X-axis = avg CF% (volume), Y-axis = avg capture $/MWh (price). The ideal farm sits in the <strong style={{color:'#22c55e'}}>top-right</strong> — high generation AND high price. <strong style={{color:'#f1f5f9'}}>White dot = this project.</strong><br/><br/>
            A farm in the top-left generates well but sells cheap (strong cannibalisation). Bottom-right generates less but at a premium (possibly better site diversity or contract structure).<br/><br/>
            <span style={{color:'#f59e0b',fontWeight:600}}>Data note:</span> CF data covers full operational history — strong for all farms. Capture price is limited to Aug 2024+ data, so farms with fewer recent months may have less stable positions on the Y-axis.
          </ChartInfo>
        </p>
        <p className="text-[9px] text-[var(--color-text-muted)] mb-2">
          Top-right = best (high CF AND high capture). White dot = this project.
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <ScatterChart margin={{ top: 4, right: 16, bottom: 16, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="cf"
              name="CF"
              type="number"
              tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }}
              tickFormatter={v => `${v}%`}
              label={{ value: 'Avg CF%', position: 'insideBottom', offset: -10, fontSize: 9, fill: '#9ca3af' }}
            />
            <YAxis
              dataKey="capture"
              name="Capture"
              type="number"
              tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }}
              tickFormatter={v => `$${v}`}
              label={{ value: '$/MWh', angle: -90, position: 'insideLeft', fontSize: 9, fill: '#9ca3af' }}
            />
            <Tooltip
              contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
              cursor={{ strokeDasharray: '3 3' }}
              formatter={((v, name) => [
                name === 'cf' ? `${v?.toFixed(1)}%` : `$${v?.toFixed(0)}/MWh`,
                name === 'cf' ? 'Capacity Factor' : 'Capture Price',
              ]) as TF}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload
                return (
                  <div style={tooltipStyle} className="p-2 space-y-0.5">
                    <p style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 11 }}>{d.name}</p>
                    <p style={tooltipItemStyle}>CF: {d.cf?.toFixed(1)}%</p>
                    <p style={tooltipItemStyle}>Capture: ${d.capture?.toFixed(0)}/MWh</p>
                    <p style={{ color: '#94a3b8', fontSize: 10 }}>{d.cap} MW · {confDot(d.confidence)} {d.confidence} confidence</p>
                  </div>
                )
              }}
            />
            <Scatter
              data={scatterData.filter(d => !d.isThis)}
              fill="#3b82f660"
              r={4}
            />
            <Scatter
              data={scatterData.filter(d => d.isThis)}
              fill="#ffffff"
              r={7}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ============================================================
// Diversity / Anti-correlation tab
// ============================================================

function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = xs.length
  if (n < 3) return 0
  const mx = xs.reduce((s, x) => s + x, 0) / n
  const my = ys.reduce((s, y) => s + y, 0) / n
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0)
  const den = Math.sqrt(
    xs.reduce((s, x) => s + (x - mx) ** 2, 0) *
    ys.reduce((s, y) => s + (y - my) ** 2, 0)
  )
  return den === 0 ? 0 : num / den
}

function computeFleetMonthly(projects: WindValueProject[]): Record<string, number> {
  const sums: Record<string, { total: number; count: number }> = {}
  projects.forEach(p => {
    p.monthly_data.forEach(m => {
      if (m.cf_pct == null) return
      const key = `${m.year}-${m.month}`
      if (!sums[key]) sums[key] = { total: 0, count: 0 }
      sums[key].total += m.cf_pct
      sums[key].count += 1
    })
  })
  return Object.fromEntries(Object.entries(sums).map(([k, v]) => [k, v.total / v.count]))
}

// Approximate reference solar generation shape for NEM (% of capacity, by hour AEST)
const SOLAR_REF_SHAPE = [0,0,0,0,0,0.5, 4,12,24,36,46,52, 54,50,42,30,16,5, 0.5,0,0,0,0,0]

const MONTH_SEASON: Record<number, string> = {
  12: 'summer', 1: 'summer', 2: 'summer',
  3: 'autumn',  4: 'autumn',  5: 'autumn',
  6: 'winter',  7: 'winter',  8: 'winter',
  9: 'spring', 10: 'spring', 11: 'spring',
}

// ============================================================
// Price Band Analysis tab
// ============================================================

// Approximate NEM hourly price index (relative, 0–100), based on typical
// NEM dispatch price profiles: low solar hours, high evening peak, moderate overnight
const NEM_PRICE_SHAPE = [
  45, 40, 38, 36, 38, 42,  // 12am–5am: overnight taper
  55, 68, 72, 42, 22, 15,  // 6am–11am: morning ramp, solar dump begins
  12, 14, 18, 30, 52, 72,  // 12pm–5pm: solar low, pre-peak ramp
  88, 100, 92, 78, 62, 52, // 6pm–11pm: evening peak, late decline
]

// Labels must match import_price_band_capture.py PRICE_BANDS
const PRICE_BANDS = [
  { label: 'negative',   dbLabel: 'negative',   min: -Infinity, max: 0,    color: '#7c3aed', display: '< $0'      },
  { label: '$0–$50',     dbLabel: '$0-50',       min: 0,         max: 50,   color: '#3b82f6', display: '$0–$50'    },
  { label: '$50–$100',   dbLabel: '$50-100',     min: 50,        max: 100,  color: '#22c55e', display: '$50–$100'  },
  { label: '$100–$300',  dbLabel: '$100-300',    min: 100,       max: 300,  color: '#f59e0b', display: '$100–$300' },
  { label: '$300–$1k',   dbLabel: '$300-1000',   min: 300,       max: 1000, color: '#f97316', display: '$300–$1k'  },
  { label: '> $1000',    dbLabel: '$1000+',      min: 1000,      max: Infinity, color: '#ef4444', display: '> $1000'  },
]

type PoolPrices = Record<string, Record<string, number>>

function bandFor(price: number) {
  return PRICE_BANDS.find(b => price >= b.min && price < b.max) ?? PRICE_BANDS[1]
}

function computePriceBandDist(monthly: import('../../lib/types').WindMonthlyDataPoint[]) {
  const totals: Record<string, { energy: number }> = {}
  PRICE_BANDS.forEach(b => { totals[b.display] = { energy: 0 } })
  let totalEnergy = 0
  monthly.forEach(m => {
    if (m.capture_price == null || m.energy_mwh == null || m.energy_mwh <= 0) return
    const b = bandFor(m.capture_price)
    totals[b.display].energy += m.energy_mwh
    totalEnergy += m.energy_mwh
  })
  return PRICE_BANDS.map(b => ({
    label: b.display,
    color: b.color,
    pct: totalEnergy > 0 ? (totals[b.display].energy / totalEnergy) * 100 : 0,
  }))
}

function computeFleetPriceBandDist(projects: import('../../lib/types').WindValueProject[]) {
  const totals: Record<string, number> = {}
  PRICE_BANDS.forEach(b => { totals[b.display] = 0 })
  let totalEnergy = 0
  projects.forEach(p => {
    p.monthly_data.forEach(m => {
      if (m.capture_price == null || m.energy_mwh == null || m.energy_mwh <= 0) return
      const b = bandFor(m.capture_price)
      totals[b.display] += m.energy_mwh
      totalEnergy += m.energy_mwh
    })
  })
  return PRICE_BANDS.map(b => ({
    label: b.display,
    color: b.color,
    pct: totalEnergy > 0 ? (totals[b.display] / totalEnergy) * 100 : 0,
  }))
}

function PriceBandTab({
  project, allStateProjects, poolPrices,
}: {
  project: import('../../lib/types').WindValueProject
  allStateProjects: import('../../lib/types').WindValueProject[]
  poolPrices: PoolPrices
}) {
  // State pool prices keyed by region (NSW1, VIC1 etc) — map to project state
  const stateToRegion: Record<string, string> = {
    NSW: 'NSW1', VIC: 'VIC1', QLD: 'QLD1', SA: 'SA1', TAS: 'TAS1',
  }
  const regionKey = stateToRegion[project.state] ?? `${project.state}1`
  const statePricesByMonth = poolPrices[regionKey] ?? {}

  // Monthly data with pool price filled from top-level where missing
  const monthly = project.monthly_data.map(m => ({
    ...m,
    pool_price: m.pool_price ?? statePricesByMonth[`${m.year}-${String(m.month).padStart(2, '0')}`] ?? null,
  }))

  // Price band distributions — prefer real 5-min NEMWEB data, fall back to synthetic
  const realBandData = project.price_band_data
  const dataSource = realBandData ? '5min_nemweb' : 'monthly_proxy'

  const farmBands: Array<{ label: string; color: string; pct: number; avgPrice: number | null }> = (() => {
    if (realBandData) {
      // Aggregate across all covered months from real 5-min data
      const totals: Record<string, { gen_mwh: number; price_sum: number }> = {}
      PRICE_BANDS.forEach(b => { totals[b.dbLabel] = { gen_mwh: 0, price_sum: 0 } })
      let totalMwh = 0
      Object.values(realBandData.monthly).forEach(bands => {
        bands.forEach(b => {
          if (totals[b.label]) {
            totals[b.label].gen_mwh += b.gen_mwh
            totals[b.label].price_sum += (b.avg_price ?? 0) * b.gen_mwh
            totalMwh += b.gen_mwh
          }
        })
      })
      return PRICE_BANDS.map(b => ({
        label: b.display,
        color: b.color,
        pct: totalMwh > 0 ? (totals[b.dbLabel].gen_mwh / totalMwh) * 100 : 0,
        avgPrice: totals[b.dbLabel].gen_mwh > 0
          ? totals[b.dbLabel].price_sum / totals[b.dbLabel].gen_mwh
          : null,
      }))
    }
    return computePriceBandDist(monthly).map(b => ({ ...b, avgPrice: null }))
  })()

  const fleetBands = computeFleetPriceBandDist(allStateProjects)
  const bandData = farmBands.map((f, i) => ({
    label: f.label,
    color: f.color,
    farm: Number(f.pct.toFixed(1)),
    fleet: Number(fleetBands[i]?.pct.toFixed(1) ?? '0'),
    diff: Number((f.pct - (fleetBands[i]?.pct ?? 0)).toFixed(1)),
    avgPrice: f.avgPrice,
  }))

  // Monthly premium/discount (where pool_price exists)
  const premiumData = monthly
    .filter(m => m.capture_price != null && m.pool_price != null)
    .map(m => ({
      label: `${MONTH_LABELS[(m.month ?? 1) - 1]} ${m.year}`,
      premium: Number(((m.capture_price ?? 0) - (m.pool_price ?? 0)).toFixed(1)),
      value_factor: m.value_factor,
      capture: m.capture_price,
      pool: m.pool_price,
    }))
    .sort((a, b) => {
      const [ma, ya] = [a.label.slice(0, 3), a.label.slice(4)]
      const [mb, yb] = [b.label.slice(0, 3), b.label.slice(4)]
      return ya !== yb ? Number(ya) - Number(yb) : MONTH_LABELS.indexOf(ma) - MONTH_LABELS.indexOf(mb)
    })

  // Capture price heatmap (by year + month)
  const heatYears = [...new Set(monthly.map(m => m.year))].sort()
  const captureMin = Math.min(...monthly.map(m => m.capture_price ?? Infinity).filter(isFinite))
  const captureMax = Math.max(...monthly.map(m => m.capture_price ?? -Infinity).filter(isFinite))
  const captureRange = captureMax - captureMin || 1
  const captureColor = (v: number | null) => {
    if (v == null) return 'transparent'
    const t = (v - captureMin) / captureRange
    const r = Math.round(239 + (34 - 239) * t)
    const g = Math.round(68 + (197 - 68) * t)
    const b = Math.round(68 + (94 - 68) * t)
    return `rgb(${r},${g},${b})`
  }

  // Monthly capture by season breakdown
  const seasonBandData = Object.entries(MONTH_SEASON).reduce<Record<string, {count:number;energy:number;bands:Record<string,number>}>>((acc, [mo, season]) => {
    if (!acc[season]) acc[season] = { count: 0, energy: 0, bands: {} }
    monthly.filter(m => m.month === Number(mo) && m.capture_price != null && m.energy_mwh)
      .forEach(m => {
        const b = bandFor(m.capture_price!)
        acc[season].bands[b.display] = (acc[season].bands[b.display] ?? 0) + (m.energy_mwh ?? 0)
        acc[season].energy += (m.energy_mwh ?? 0)
        acc[season].count++
      })
    return acc
  }, {})

  // Time-of-day: farm hourly shape vs NEM price reference
  const farmHourly = project.hourly_shape?.annual
  const todData = HOURS.map((label, i) => ({
    hour: label,
    farmCf: farmHourly ? (farmHourly[i] ?? 0) : null,
    priceIdx: NEM_PRICE_SHAPE[i],
    // price-weighted generation index: how much does this farm earn relative to flat?
    priceWeighted: farmHourly && farmHourly[i] != null
      ? Number(((farmHourly[i] as number) * NEM_PRICE_SHAPE[i] / 50).toFixed(2))
      : null,
  }))

  const hasPremiumData = premiumData.length > 0
  const avgPremium = hasPremiumData
    ? premiumData.reduce((s, d) => s + d.premium, 0) / premiumData.length
    : null

  return (
    <div className="space-y-4">
      {/* Explainer */}
      <div className="bg-violet-500/5 border border-violet-500/20 rounded-lg p-3">
        <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
          <strong className="text-[var(--color-text)]">Price band analysis</strong> shows <em>when</em> this farm generates relative to the NEM spot price.
          A farm that consistently generates during high-price periods earns more revenue per MWh.
          {dataSource === '5min_nemweb'
            ? <> Data sourced from <strong className="text-violet-400">5-min AEMO DISPATCHLOAD × DISPATCHPRICE correlation</strong> — exact interval-level accuracy. Coverage: {realBandData?.coverage_start} to {realBandData?.coverage_end}.</>
            : <> Using monthly average capture price as a proxy — run <code className="text-[10px] bg-[var(--color-bg-elevated)] px-1 rounded">import_price_band_capture.py</code> for 5-min interval accuracy.</>
          }
        </p>
      </div>

      {/* Price band distribution: farm vs fleet */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
        <p className="text-[10px] font-medium text-[var(--color-text-muted)] mb-3 uppercase tracking-wider flex items-center gap-2">
          Generation by Price Band — Farm vs {project.state} Fleet
          {dataSource === '5min_nemweb' && (
            <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 normal-case tracking-normal">5-min exact</span>
          )}
          <ChartInfo>
            <p style={{color:'#f1f5f9',fontWeight:600,marginBottom:4}}>Price band distribution</p>
            {dataSource === '5min_nemweb'
              ? <>Each bar = % of total MWh generated at each price regime, computed by correlating this farm&apos;s
                5-min AEMO dispatch with the 5-min regional spot price (RRP) for every interval in the coverage period.
                This is exact — no approximation. Fleet bar uses monthly-average proxy as 5-min data is only available per-farm.</>
              : <>Each bar = % of total MWh generated during months where the average capture price fell in that band.
                This is a proxy — run import_price_band_capture.py to replace with 5-min exact data.</>
            }
            <br/><br/>
            A farm skewed toward higher price bands earns more revenue per MWh — an effective self-selecting revenue hedge.
          </ChartInfo>
        </p>
        <div className="space-y-2">
          {bandData.map(d => {
            const maxPct = Math.max(...bandData.map(b => Math.max(b.farm, b.fleet)), 1)
            return (
              <div key={d.label}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] text-[var(--color-text-muted)] w-20 shrink-0">{d.label}</span>
                  <div className="flex items-center gap-2 ml-2">
                    {d.avgPrice != null && (
                      <span className="text-[9px] font-mono text-[var(--color-text-muted)]">avg ${d.avgPrice.toFixed(0)}</span>
                    )}
                    <span className={`text-[9px] font-semibold ${d.diff > 1 ? 'text-green-400' : d.diff < -1 ? 'text-red-400' : 'text-[var(--color-text-muted)]'}`}>
                      {d.diff > 0 ? '+' : ''}{d.diff}%
                    </span>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] w-8 text-right text-[var(--color-text-muted)]">Farm</span>
                    <div className="flex-1 h-3 bg-[var(--color-border)] rounded-sm overflow-hidden">
                      <div className="h-full rounded-sm" style={{ width: `${(d.farm / maxPct) * 100}%`, backgroundColor: d.color }} />
                    </div>
                    <span className="text-[9px] w-8 text-right font-mono text-[var(--color-text)]">{d.farm.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] w-8 text-right text-[var(--color-text-muted)]">Fleet</span>
                    <div className="flex-1 h-3 bg-[var(--color-border)] rounded-sm overflow-hidden">
                      <div className="h-full rounded-sm" style={{ width: `${(d.fleet / maxPct) * 100}%`, backgroundColor: d.color, opacity: 0.4 }} />
                    </div>
                    <span className="text-[9px] w-8 text-right font-mono text-[var(--color-text-muted)]">{d.fleet.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-[9px] text-[var(--color-text-muted)] mt-2 italic">
          Bright = this farm. Faded = {project.state} fleet avg. Green/red diff = farm vs fleet skew.
          {dataSource === '5min_nemweb' && ' Avg price shown per band when generating.'}
        </p>
      </div>

      {/* Monthly capture premium/discount */}
      {hasPremiumData && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
          <p className="text-[10px] font-medium text-[var(--color-text-muted)] mb-1 uppercase tracking-wider flex items-center">
            Monthly Capture Premium vs Pool Price ($/MWh)
            <ChartInfo>
              <p style={{color:'#f1f5f9',fontWeight:600,marginBottom:4}}>Capture premium / discount</p>
              Each bar = this farm&apos;s monthly capture price minus the regional pool price (TWAP) for that month.
              <strong style={{color:'#22c55e'}}> Positive = premium</strong> — the farm generated more during higher-price periods than the market average.
              <strong style={{color:'#ef4444'}}> Negative = discount</strong> — it generated into lower prices (cannibalisation or off-peak generation).<br/><br/>
              Pool price data available from Aug 2024. Value factor = capture ÷ pool.
            </ChartInfo>
          </p>
          {avgPremium != null && (
            <p className="text-[10px] text-[var(--color-text-muted)] mb-3">
              Average premium over period:{' '}
              <span className={`font-bold ${avgPremium >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {avgPremium >= 0 ? '+' : ''}${avgPremium.toFixed(1)}/MWh
              </span>
            </p>
          )}
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={premiumData} margin={{ top: 4, right: 8, bottom: 20, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 8, fill: 'var(--color-text-muted)' }} angle={-45} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickFormatter={v => `$${v}`} />
              <ReferenceLine y={0} stroke="var(--color-border)" strokeWidth={1.5} />
              <Tooltip
                contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload
                  return (
                    <div style={tooltipStyle} className="p-2 space-y-0.5">
                      <p style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 11 }}>{d.label}</p>
                      <p style={tooltipItemStyle}>Capture: ${d.capture?.toFixed(0)}/MWh</p>
                      <p style={tooltipItemStyle}>Pool: ${d.pool?.toFixed(0)}/MWh</p>
                      <p style={{ color: d.premium >= 0 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                        Premium: {d.premium >= 0 ? '+' : ''}${d.premium?.toFixed(1)}/MWh
                      </p>
                      {d.value_factor && <p style={tooltipItemStyle}>Value factor: {d.value_factor.toFixed(2)}×</p>}
                    </div>
                  )
                }}
              />
              <Bar dataKey="premium" radius={[3, 3, 0, 0]}>
                {premiumData.map((d, i) => (
                  <Cell key={i} fill={d.premium >= 0 ? '#22c55e' : '#ef4444'} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Capture price heatmap by year + month */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
        <p className="text-[10px] font-medium text-[var(--color-text-muted)] mb-3 uppercase tracking-wider flex items-center">
          Capture Price Heatmap ($/MWh) — red=low, green=high
          <ChartInfo>
            <p style={{color:'#f1f5f9',fontWeight:600,marginBottom:4}}>Capture price by month/year</p>
            Each cell = average $/MWh received that month. Colour scale is relative to this farm&apos;s own
            range — reveals seasonal patterns and multi-year trends in price capture independent of market level.<br/><br/>
            Compare vertically (year-over-year same month) to see whether cannibalisation is worsening.
            Compare horizontally (month-to-month) to see seasonal price skew.
          </ChartInfo>
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr>
                <th className="text-left text-[var(--color-text-muted)] font-medium pr-2 w-10">Year</th>
                {MONTH_LABELS.map(m => (
                  <th key={m} className="text-center text-[var(--color-text-muted)] font-medium px-0.5 w-8">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatYears.map(y => (
                <tr key={y}>
                  <td className="text-[var(--color-text-muted)] pr-2 py-0.5 font-mono">{y}</td>
                  {Array.from({ length: 12 }, (_, i) => {
                    const entry = monthly.find(m => m.year === y && m.month === i + 1)
                    const val = entry?.capture_price ?? null
                    return (
                      <td
                        key={i}
                        className="text-center py-0.5 px-0.5 rounded text-white font-bold"
                        style={{ backgroundColor: captureColor(val) }}
                        title={val != null ? `$${val.toFixed(0)}/MWh` : 'No data'}
                      >
                        {val != null ? Math.round(val) : ''}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[9px] text-[var(--color-text-muted)]">${Math.round(captureMin)}/MWh</span>
          <div className="flex-1 h-2 rounded" style={{ background: 'linear-gradient(to right, rgb(239,68,68), rgb(34,197,94))' }} />
          <span className="text-[9px] text-[var(--color-text-muted)]">${Math.round(captureMax)}/MWh</span>
        </div>
      </div>

      {/* Seasonal price band breakdown */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
        <p className="text-[10px] font-medium text-[var(--color-text-muted)] mb-3 uppercase tracking-wider">
          Price Band Skew by Season
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(SEASON_CONFIG).map(([season, conf]) => {
            const sd = seasonBandData[season]
            if (!sd || sd.energy === 0) return null
            return (
              <div key={season} className="space-y-1">
                <p className="text-[10px] font-semibold" style={{ color: conf.color }}>{conf.icon} {conf.label}</p>
                {PRICE_BANDS.map(b => {
                  const pct = sd.energy > 0 ? ((sd.bands[b.display] ?? 0) / sd.energy * 100) : 0
                  if (pct < 0.5) return null
                  return (
                    <div key={b.display} className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: b.color }} />
                      <span className="text-[9px] text-[var(--color-text-muted)] shrink-0">{b.display}</span>
                      <span className="text-[9px] font-mono text-[var(--color-text)] shrink-0">{pct.toFixed(0)}%</span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Time-of-day: farm generation vs NEM price reference */}
      {farmHourly && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
          <p className="text-[10px] font-medium text-[var(--color-text-muted)] mb-1 uppercase tracking-wider flex items-center">
            Time-of-Day Generation vs NEM Price Curve
            <ChartInfo>
              <p style={{color:'#f1f5f9',fontWeight:600,marginBottom:4}}>Time-of-day price skew</p>
              <strong style={{color:'#3b82f6'}}>Blue line</strong>: this farm&apos;s average hourly CF profile (left axis).<br/>
              <strong style={{color:'#f59e0b'}}>Orange line</strong>: normalised NEM reference price curve (right axis, 0–100 index)
              — based on typical NEM dispatch prices: low during solar hours (9am–3pm), peaks in the evening (6–9pm).<br/><br/>
              When the blue and orange lines move together → the farm generates into high-price periods (good).
              When they diverge → the farm generates into low-price periods (cannibalisation / value erosion).
            </ChartInfo>
          </p>
          <p className="text-[9px] text-[var(--color-text-muted)] mb-2">
            Blue = farm CF% (left) · Orange = NEM price index 0–100 (right). Overlap = high-value generation.
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={todData} margin={{ top: 4, right: 24, bottom: 0, left: -14 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="hour" tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} interval={3} />
              <YAxis yAxisId="cf" tick={{ fontSize: 9, fill: '#3b82f6' }} tickFormatter={v => `${v}%`} domain={['auto', 'auto']} />
              <YAxis yAxisId="price" orientation="right" tick={{ fontSize: 9, fill: '#f59e0b' }} tickFormatter={v => `${v}`} domain={[0, 110]} />
              <Tooltip
                contentStyle={tooltipStyle}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload
                  return (
                    <div style={tooltipStyle} className="p-2 space-y-0.5">
                      <p style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 11 }}>{d.hour}</p>
                      {d.farmCf != null && <p style={{ color: '#3b82f6' }}>CF: {d.farmCf.toFixed(1)}%</p>}
                      <p style={{ color: '#f59e0b' }}>Price index: {d.priceIdx}/100</p>
                    </div>
                  )
                }}
              />
              <Line yAxisId="cf" type="monotone" dataKey="farmCf" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="Farm CF%" />
              <Line yAxisId="price" type="monotone" dataKey="priceIdx" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="5 3" name="Price index" />
              <Legend wrapperStyle={{ fontSize: 9, color: '#94a3b8' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="text-[9px] text-[var(--color-text-muted)] italic">
        {dataSource === '5min_nemweb'
          ? <>Price band data sourced from 5-min AEMO DISPATCHLOAD × DISPATCHPRICE — every interval's MWh bucketed by the 5-min RRP at that moment. Coverage: {realBandData?.coverage_start} to {realBandData?.coverage_end}.</>
          : <>Price band data uses monthly average capture price ({project.value_summary.data_first_year}–{project.value_summary.data_last_year}). For interval-level accuracy run <code>import_price_band_capture.py</code>. Pool price reference data available Aug 2024 onward.</>
        }
      </p>
      <p className="text-[10px] text-[var(--color-text-muted)] italic mt-1">
        <strong className="text-[var(--color-text)] not-italic">Note: </strong>
        Differences between farm and fleet bars are often visually small because all {project.state} wind farms operate against the same regional price backdrop. The clearer dollar signal is the <strong className="text-[var(--color-text)] not-italic">Diversity Capture Premium</strong> on the Diversity tab — translates Wind Fleet R into $/MWh of capture-price advantage and ranks this farm against state peers.
      </p>
    </div>
  )
}

function DiversityTab({
  project,
  allStateProjects,
  stateAvg,
}: {
  project: WindValueProject
  allStateProjects: WindValueProject[]
  stateAvg: WindStateAverage | null
}) {
  const [seasonFilter, setSeasonFilter] = useState<'all' | string>('all')
  const [diversityView, setDiversityView] = useState<'wind' | 'solar'>('wind')

  // Fleet monthly CF averages
  const fleetAvg = computeFleetMonthly(allStateProjects)

  type DivPoint = {
    label: string; year: number; month: number; season: string
    farmCf: number; fleetCf: number; divergence: number
    poolPrice: number | null; capturePrice: number | null
  }

  const divData: DivPoint[] = project.monthly_data
    .map(m => {
      const fCf = fleetAvg[`${m.year}-${m.month}`]
      if (m.cf_pct == null || fCf == null) return null
      return {
        label: `${MONTH_LABELS[m.month - 1]} '${String(m.year).slice(2)}`,
        year: m.year, month: m.month,
        season: MONTH_SEASON[m.month] ?? 'unknown',
        farmCf: m.cf_pct, fleetCf: fCf,
        divergence: m.cf_pct - fCf,
        poolPrice: m.pool_price ?? null,
        capturePrice: m.capture_price ?? null,
      }
    })
    .filter((d): d is DivPoint => d !== null)
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)

  const filtered = seasonFilter === 'all' ? divData : divData.filter(d => d.season === seasonFilter)

  // Pearson R: this farm vs wind fleet
  const corrR = pearsonCorrelation(divData.map(d => d.farmCf), divData.map(d => d.fleetCf))

  // Price median for colour coding
  const priceVals = divData.filter(d => d.poolPrice != null).map(d => d.poolPrice!).sort((a, b) => a - b)
  const priceMed = priceVals.length > 0 ? priceVals[Math.floor(priceVals.length / 2)] : null

  const scatterData = filtered.map(d => ({
    ...d, priceAbove: d.poolPrice != null && priceMed != null ? d.poolPrice > priceMed : null,
  }))

  // Quadrant stats
  const farmAvgCf = divData.length > 0 ? divData.reduce((s, d) => s + d.farmCf, 0) / divData.length : 0
  const fleetOverallAvg = divData.length > 0 ? divData.reduce((s, d) => s + d.fleetCf, 0) / divData.length : 0
  const quadLabels = ['Farm↑ Fleet↓', 'Both↑', 'Farm↓ Fleet↑', 'Both↓']
  const quadDesc = [
    'Farm above avg, fleet below — anti-correlation value',
    'Both above avg — cannibalisation pressure',
    'Farm below, fleet above — worst outcome',
    'Both below avg — low output, relatively higher prices',
  ]
  const quadColors = ['#22c55e', '#f59e0b', '#ef4444', '#6366f1']
  const quadCounts = [0, 0, 0, 0]
  const quadPrices: number[][] = [[], [], [], []]
  divData.forEach(d => {
    const qi = d.farmCf >= farmAvgCf && d.fleetCf < fleetOverallAvg ? 0
      : d.farmCf >= farmAvgCf && d.fleetCf >= fleetOverallAvg ? 1
      : d.farmCf < farmAvgCf && d.fleetCf >= fleetOverallAvg ? 2 : 3
    quadCounts[qi]++
    if (d.poolPrice != null) quadPrices[qi].push(d.poolPrice)
  })

  // Divergence capture price premium
  const aboveMonths = divData.filter(d => d.divergence > 0)
  const belowMonths = divData.filter(d => d.divergence <= 0)
  const avg = (arr: DivPoint[]) => {
    const w = arr.filter(d => d.capturePrice != null)
    return w.length > 0 ? w.reduce((s, d) => s + d.capturePrice!, 0) / w.length : null
  }
  const aboveAvgPrice = avg(aboveMonths)
  const belowAvgPrice = avg(belowMonths)

  // Hourly shape comparison: farm vs wind fleet
  const shapeFarms = allStateProjects.filter(p => p.hourly_shape?.annual)
  const fleetHourly: (number | null)[] = Array.from({ length: 24 }, (_, i) => {
    const vals = shapeFarms.map(p => p.hourly_shape?.annual[i]).filter((v): v is number => v != null)
    return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null
  })
  const farmHourly = project.hourly_shape?.annual ?? null

  // Solar anti-correlation: Pearson R between farm shape and solar reference
  const solarCorrR = farmHourly
    ? pearsonCorrelation(
        farmHourly.filter((v): v is number => v != null),
        SOLAR_REF_SHAPE.filter((_, i) => farmHourly[i] != null)
      )
    : null

  // Hourly chart data (wind fleet comparison OR solar reference)
  const hourlyChartData = farmHourly
    ? HOURS.map((label, i) => ({
        hour: label,
        farm: farmHourly[i] != null ? Number((farmHourly[i] as number).toFixed(1)) : null,
        fleet: fleetHourly[i] != null ? Number(fleetHourly[i]!.toFixed(1)) : null,
        solar: Number(SOLAR_REF_SHAPE[i].toFixed(1)),
        diff: farmHourly[i] != null && fleetHourly[i] != null
          ? Number(((farmHourly[i] as number) - fleetHourly[i]!).toFixed(1)) : null,
        solarDiff: farmHourly[i] != null
          ? Number(((farmHourly[i] as number) - SOLAR_REF_SHAPE[i]).toFixed(1)) : null,
      }))
    : null

  // Solar dark hours share: how much of this farm's output is outside solar hours (9am–3pm)?
  const solarPeakHours = [9, 10, 11, 12, 13, 14, 15]
  const farmTotalShape = farmHourly
    ? farmHourly.reduce((s: number, v) => s + (v ?? 0), 0)
    : null
  const farmOffSolarShape = farmHourly && farmTotalShape
    ? farmHourly.filter((_, i) => !solarPeakHours.includes(i)).reduce((s: number, v) => s + (v ?? 0), 0)
    : null
  const offSolarPct = farmTotalShape && farmOffSolarShape
    ? Math.round(farmOffSolarShape / farmTotalShape * 100) : null

  const corrColor = (r: number) => r < 0.5 ? '#22c55e' : r < 0.75 ? '#f59e0b' : '#ef4444'
  const corrLabel = (r: number) => r < 0.5 ? 'Low — good diversity' : r < 0.75 ? 'Moderate' : 'High — fleet follower'
  const solarCorrColor = solarCorrR != null ? (solarCorrR < 0.2 ? '#22c55e' : solarCorrR < 0.5 ? '#f59e0b' : '#ef4444') : '#6b7280'
  const solarCorrLabel = solarCorrR != null
    ? (solarCorrR < 0.2 ? 'Strong solar complement' : solarCorrR < 0.5 ? 'Partial solar complement' : 'Correlated with solar')
    : '–'

  // ----------------------------------------------------------
  // Diversity Capture Premium — dollar-value translation of R
  //
  // The "low R = good diversity" message above doesn't always show up
  // dramatically in the price-band distribution chart, because all NSW
  // wind farms still operate inside the same supply/demand backdrop.
  // The cleaner signal is the $/MWh capture price differential between
  // this farm and the capacity-weighted state fleet average — and how
  // that ranks across the {project.state} fleet.
  // ----------------------------------------------------------
  const farmCapture = project.value_summary.avg_capture_price ?? null
  const stateCapture = stateAvg?.avg_capture_price ?? null
  const capturePremium = farmCapture != null && stateCapture != null
    ? farmCapture - stateCapture : null

  // Rank this farm among all state peers by capture-vs-state-avg
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const peerPremiums = stateCapture != null
    ? allStateProjects
        .map((p) => {
          const cp = p.value_summary?.avg_capture_price
          return cp != null ? { id: p.id, name: p.name, premium: cp - stateCapture, capture: cp } : null
        })
        .filter((x): x is { id: string; name: string; premium: number; capture: number } => x !== null)
        .sort((a, b) => b.premium - a.premium)
    : []

  const ourRank = peerPremiums.findIndex(p => p.id === project.id) + 1
  const totalRanked = peerPremiums.length
  const bestPremium = peerPremiums[0]
  const worstPremium = peerPremiums[peerPremiums.length - 1]
  const medianPremium = peerPremiums[Math.floor(peerPremiums.length / 2)]
  const premiumPctile = totalRanked > 0 ? Math.round(((totalRanked - ourRank) / totalRanked) * 100) : null
  const premiumColor =
    capturePremium == null ? 'var(--color-text-muted)' :
    capturePremium >= 5 ? '#22c55e' :
    capturePremium >= 1 ? '#84cc16' :
    capturePremium >= -1 ? '#f59e0b' :
    '#ef4444'

  if (divData.length < 6) return <EmptyState text="Insufficient monthly overlap with fleet data for diversity analysis." />

  return (
    <div className="space-y-5">
      {/* Explainer */}
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
        <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
          <strong className="text-[var(--color-text)]">Output diversity & anti-correlation</strong> — in the NEM,
          a wind farm that generates when other wind farms <em>don't</em> earns structurally higher prices (less
          supply floods the market). A farm that generates when solar <em>doesn't</em> avoids the duck-curve price
          trough entirely. Both effects intensify as renewable penetration grows. Low correlation with the wind
          fleet and low correlation with solar = highest long-run capture price.
        </p>
        <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed mt-2 pt-2 border-t border-emerald-500/10">
          <strong className="text-[var(--color-text)]">How to read R:</strong> the wind-fleet R below is the <em>Pearson correlation coefficient</em> between this farm's monthly capacity factor and the average monthly capacity factor of all other operating {project.state} wind farms. R is bounded between −1 and +1 (it is <strong>not</strong> a percentage). R = 0.9 means the farm's good and bad months track the rest of the fleet very tightly (limited diversity benefit; high cannibalisation risk). R = 0.3 means it is largely independent — a useful portfolio diversifier. R = 0.0 means no statistical relationship. <strong>Lower is better</strong> for revenue. Solar R works the same way against a representative NEM solar shape.
        </p>
      </div>

      {/* Headline diversity metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <MetricCard
          label="Wind Fleet Correlation (R)"
          value={corrR.toFixed(2)}
          sub={corrLabel(corrR)}
          highlight={corrR < 0.5 ? 'green' : corrR < 0.75 ? 'yellow' : 'red'}
        />
        <MetricCard
          label="Solar Correlation (R)"
          value={solarCorrR != null ? solarCorrR.toFixed(2) : '–'}
          sub={solarCorrLabel}
          highlight={solarCorrR != null ? (solarCorrR < 0.2 ? 'green' : solarCorrR < 0.5 ? 'yellow' : 'red') : undefined}
        />
        <MetricCard
          label="Capture: Above Fleet Months"
          value={aboveAvgPrice != null ? `$${aboveAvgPrice.toFixed(0)}/MWh` : '–'}
          sub={`${aboveMonths.length} months above fleet avg`}
          highlight={aboveAvgPrice != null && belowAvgPrice != null && aboveAvgPrice > belowAvgPrice ? 'green' : undefined}
        />
        <MetricCard
          label="Off-Solar-Hours Output"
          value={offSolarPct != null ? `${offSolarPct}%` : '–'}
          sub="generation outside 9am–3pm"
          highlight={offSolarPct != null ? (offSolarPct >= 65 ? 'green' : offSolarPct >= 50 ? 'yellow' : 'red') : undefined}
        />
      </div>

      {/* Diversity Capture Premium — translates the abstract R into $/MWh */}
      {capturePremium != null && totalRanked > 1 && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
          <div className="flex items-baseline justify-between flex-wrap gap-2 mb-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                Diversity Capture Premium — $/MWh vs {project.state} wind fleet average
              </p>
              <p className="text-[10px] text-[var(--color-text-muted)]/80 mt-0.5 italic">
                Translates the abstract Wind Fleet R into a dollar value: how much more $/MWh this farm earns than the capacity-weighted {project.state} wind average.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            {/* Big headline number */}
            <div className="md:col-span-1 flex flex-col items-start">
              <span className="text-3xl font-bold" style={{ color: premiumColor }}>
                {capturePremium >= 0 ? '+' : ''}${capturePremium.toFixed(1)}/MWh
              </span>
              <span className="text-[11px] text-[var(--color-text-muted)] mt-1">
                vs ${stateCapture?.toFixed(0)}/MWh state avg
              </span>
              {ourRank > 0 && (
                <span className="text-[11px] mt-1.5 px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${premiumColor}20`, color: premiumColor }}>
                  Rank {ourRank} of {totalRanked} {project.state} wind farms · top {100 - (premiumPctile ?? 0)}%
                </span>
              )}
            </div>
            {/* Best / Median / Worst comparators */}
            <div className="md:col-span-2 grid grid-cols-3 gap-2">
              {bestPremium && (
                <div className="bg-[var(--color-bg-elevated)] rounded-lg p-2.5">
                  <p className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)]">Best NSW</p>
                  <p className="text-sm font-semibold text-emerald-400 mt-0.5">+${bestPremium.premium.toFixed(1)}/MWh</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 truncate" title={bestPremium.name}>{bestPremium.name.replace(' Wind Farm', '').replace(' - Stage 1', '')}</p>
                </div>
              )}
              {medianPremium && (
                <div className="bg-[var(--color-bg-elevated)] rounded-lg p-2.5">
                  <p className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)]">Median</p>
                  <p className="text-sm font-semibold text-[var(--color-text)] mt-0.5">{medianPremium.premium >= 0 ? '+' : ''}${medianPremium.premium.toFixed(1)}/MWh</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 truncate" title={medianPremium.name}>{medianPremium.name.replace(' Wind Farm', '').replace(' - Stage 1', '')}</p>
                </div>
              )}
              {worstPremium && (
                <div className="bg-[var(--color-bg-elevated)] rounded-lg p-2.5">
                  <p className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)]">Worst</p>
                  <p className="text-sm font-semibold text-rose-400 mt-0.5">${worstPremium.premium.toFixed(1)}/MWh</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 truncate" title={worstPremium.name}>{worstPremium.name.replace(' Wind Farm', '').replace(' - Stage 1', '')}</p>
                </div>
              )}
            </div>
          </div>
          {/* Bottom explainer */}
          <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed mt-3 pt-3 border-t border-[var(--color-border)]">
            <strong className="text-[var(--color-text)]">Reading the price-band chart vs this number:</strong> band-level differences between this farm and the {project.state} fleet are often visually subtle because all wind farms in the state operate against the same supply/demand backdrop. The $/MWh capture premium above is the cleaner signal of how much the diversity (low R = {corrR.toFixed(2)}) is actually paying off in revenue terms. A premium of ${capturePremium >= 0 ? '+' : ''}{capturePremium.toFixed(1)}/MWh on a typical 30% CF wind farm equates to roughly ${(capturePremium * 0.3 * 8.76).toFixed(0)}k of extra revenue per MW per year vs the fleet average.
          </p>
        </div>
      )}

      {/* View toggle: wind vs solar */}
      <div className="flex gap-1">
        {(['wind', 'solar'] as const).map(v => (
          <button
            key={v}
            onClick={() => setDiversityView(v)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              diversityView === v
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border border-[var(--color-border)] hover:text-[var(--color-text)]'
            }`}
          >
            {v === 'wind' ? '💨 vs Wind Fleet' : '☀️ vs Solar'}
          </button>
        ))}
      </div>

      {/* ── WIND FLEET VIEW ── */}
      {diversityView === 'wind' && (
        <>
          {/* Season filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-medium">Season:</span>
            <ViewBtn active={seasonFilter === 'all'} onClick={() => setSeasonFilter('all')} label="All" />
            {Object.entries(SEASON_CONFIG).map(([k, s]) => (
              <ViewBtn key={k} active={seasonFilter === k} onClick={() => setSeasonFilter(k)} label={s.label} color={s.color} />
            ))}
          </div>

          {/* Scatter: farm CF vs fleet CF */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
            <p className="text-[10px] font-medium text-[var(--color-text-muted)] mb-1 uppercase tracking-wider flex items-center">
              Monthly CF: This Farm vs {project.state} Fleet Average
              <ChartInfo>
                <p style={{color:'#f1f5f9',fontWeight:600,marginBottom:4}}>Correlation scatter — farm vs fleet</p>
                Each dot = one month. X = state fleet avg CF%; Y = this farm's CF%. A tight diagonal = highly correlated (bad). Scatter off the diagonal = diversity (good).<br/><br/>
                <strong style={{color:'#22c55e'}}>Green dots</strong> = pool price above median that month. Green dots in the <strong style={{color:'#22c55e'}}>top-left</strong> (farm high, fleet low) are the most valuable months — anti-correlated AND high price.<br/><br/>
                Pearson R = {corrR.toFixed(3)} · {corrLabel(corrR)}.<br/>
                Fleet = {allStateProjects.length} operating {project.state} wind farms.
              </ChartInfo>
            </p>
            <p className="text-[9px] text-[var(--color-text-muted)] mb-3">
              R = {corrR.toFixed(3)} · <span style={{ color: corrColor(corrR) }}>{corrLabel(corrR)}</span> · <span className="text-green-400">●</span> price above median · <span className="text-blue-400/60">●</span> below median
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <ScatterChart margin={{ top: 4, right: 16, bottom: 20, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="fleetCf" name="Fleet CF" type="number"
                  tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} tickFormatter={v => `${v.toFixed(0)}%`}
                  label={{ value: `${project.state} Fleet Avg CF%`, position: 'insideBottom', offset: -12, fontSize: 9, fill: '#9ca3af' }}
                />
                <YAxis dataKey="farmCf" name="Farm CF" type="number"
                  tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} tickFormatter={v => `${v.toFixed(0)}%`}
                  label={{ value: 'Farm CF%', angle: -90, position: 'insideLeft', fontSize: 9, fill: '#9ca3af' }}
                />
                <Tooltip
                  contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0].payload as DivPoint
                    return (
                      <div style={tooltipStyle} className="p-2 space-y-0.5">
                        <p style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 11 }}>{d.label}</p>
                        <p style={tooltipItemStyle}>Farm CF: {d.farmCf.toFixed(1)}%</p>
                        <p style={tooltipItemStyle}>Fleet avg: {d.fleetCf.toFixed(1)}%</p>
                        <p style={{ color: d.divergence >= 0 ? '#22c55e' : '#ef4444' }}>
                          Divergence: {d.divergence >= 0 ? '+' : ''}{d.divergence.toFixed(1)}%
                        </p>
                        {d.poolPrice != null && <p style={{ color: '#94a3b8', fontSize: 10 }}>Pool: ${d.poolPrice.toFixed(0)}/MWh</p>}
                      </div>
                    )
                  }}
                />
                <Scatter data={scatterData.filter(d => d.priceAbove !== true)} fill="#3b82f640" r={4} />
                <Scatter data={scatterData.filter(d => d.priceAbove === true)} fill="#22c55e" r={5} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly divergence bars */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
            <p className="text-[10px] font-medium text-[var(--color-text-muted)] mb-1 uppercase tracking-wider flex items-center">
              Monthly Divergence from Fleet (Farm − Fleet Avg)
              <ChartInfo>
                <p style={{color:'#f1f5f9',fontWeight:600,marginBottom:4}}>Divergence from fleet</p>
                Bar height = this farm's CF minus the state fleet average CF for that month. <strong style={{color:'#22c55e'}}>Green</strong> = above fleet (anti-correlated, less supply pressure). <strong style={{color:'#ef4444'}}>Red</strong> = below fleet (correlated with high-supply months).<br/><br/>
                Look for persistent green bars in winter — NEM prices are highest in most states during winter, so above-fleet winter output is doubly valuable.
              </ChartInfo>
            </p>
            <p className="text-[9px] text-[var(--color-text-muted)] mb-3">
              Green = above fleet (anti-correlated) · Showing {filtered.length} months
            </p>
            <ResponsiveContainer width="100%" height={175}>
              <BarChart data={filtered} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="label" tick={{ fontSize: 8, fill: 'var(--color-text-muted)' }}
                  interval={Math.max(0, Math.floor(filtered.length / 16) - 1)} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                  tickFormatter={v => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
                  formatter={((v: number) => [`${v >= 0 ? '+' : ''}${v.toFixed(1)}%`, 'Divergence']) as TF}
                />
                <ReferenceLine y={0} stroke="var(--color-border)" strokeWidth={1.5} />
                <Bar dataKey="divergence" radius={[2, 2, 0, 0]}>
                  {filtered.map((d, i) => (
                    <Cell key={i} fill={d.divergence >= 0 ? '#22c55e' : '#ef444460'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Quadrant analysis */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
            <p className="text-[10px] font-medium text-[var(--color-text-muted)] mb-3 uppercase tracking-wider">
              Quadrant Analysis — {divData.length} months
            </p>
            <div className="grid grid-cols-2 gap-2">
              {quadLabels.map((label, i) => {
                const avgP = quadPrices[i].length > 0
                  ? quadPrices[i].reduce((s, v) => s + v, 0) / quadPrices[i].length
                  : null
                return (
                  <div key={i} className="rounded-lg p-2.5 border"
                    style={{ borderColor: `${quadColors[i]}40`, backgroundColor: `${quadColors[i]}08` }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold" style={{ color: quadColors[i] }}>{label}</span>
                      <span className="text-xs font-bold" style={{ color: quadColors[i] }}>
                        {quadCounts[i]}
                        <span className="text-[9px] font-normal text-[var(--color-text-muted)]">
                          {' '}({Math.round(quadCounts[i] / divData.length * 100)}%)
                        </span>
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--color-text-muted)] leading-snug">{quadDesc[i]}</p>
                    {avgP != null && (
                      <p className="text-[10px] mt-1" style={{ color: quadColors[i] }}>Avg pool: ${avgP.toFixed(0)}/MWh</p>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="text-[9px] text-[var(--color-text-muted)] mt-2 italic">
              Farm threshold: {farmAvgCf.toFixed(1)}% CF · Fleet threshold: {fleetOverallAvg.toFixed(1)}% CF.
              {priceMed != null && ` Pool price median (Aug 2024+): $${priceMed.toFixed(0)}/MWh.`}
            </p>
          </div>

          {/* Seasonal divergence table */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
            <p className="text-[10px] font-medium text-[var(--color-text-muted)] mb-3 uppercase tracking-wider">Seasonal Divergence Pattern</p>
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  {['Season', 'Mo.', 'Farm CF', 'Fleet CF', 'Divergence', 'Capture'].map(h => (
                    <th key={h} className={`py-1.5 font-semibold text-[var(--color-text-muted)] ${h === 'Season' ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(SEASON_CONFIG).map(([sk, sc]) => {
                  const rows = divData.filter(d => d.season === sk)
                  if (rows.length === 0) return null
                  const avgFarm = rows.reduce((s, d) => s + d.farmCf, 0) / rows.length
                  const avgFleet = rows.reduce((s, d) => s + d.fleetCf, 0) / rows.length
                  const avgDiv = avgFarm - avgFleet
                  const withCap = rows.filter(d => d.capturePrice != null)
                  const avgCap = withCap.length > 0 ? withCap.reduce((s, d) => s + d.capturePrice!, 0) / withCap.length : null
                  return (
                    <tr key={sk} className="border-b border-[var(--color-border)] last:border-0">
                      <td className="py-1.5 font-semibold" style={{ color: sc.color }}>{sc.icon} {sc.label}</td>
                      <td className="py-1.5 text-right text-[var(--color-text-muted)]">{rows.length}</td>
                      <td className="py-1.5 text-right text-[var(--color-text)]">{avgFarm.toFixed(1)}%</td>
                      <td className="py-1.5 text-right text-[var(--color-text-muted)]">{avgFleet.toFixed(1)}%</td>
                      <td className="py-1.5 text-right font-bold" style={{ color: avgDiv >= 0 ? '#22c55e' : '#ef4444' }}>
                        {avgDiv >= 0 ? '+' : ''}{avgDiv.toFixed(1)}%
                      </td>
                      <td className="py-1.5 text-right text-[var(--color-text-muted)]">
                        {avgCap != null ? `$${avgCap.toFixed(0)}` : '–'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Hourly shape vs fleet */}
          {hourlyChartData && shapeFarms.length > 0 && (
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
              <p className="text-[10px] font-medium text-[var(--color-text-muted)] mb-1 uppercase tracking-wider flex items-center">
                Intraday Shape: Farm vs {project.state} Wind Fleet
                <ChartInfo>
                  <p style={{color:'#f1f5f9',fontWeight:600,marginBottom:4}}>Intraday anti-correlation</p>
                  Blue = this farm's hourly CF%. Dashed grey = state wind fleet average hourly CF%. The gap shows when this farm's generation differs from the fleet during the day.<br/><br/>
                  <strong style={{color:'#22c55e'}}>Farm above fleet</strong> at 6–9pm (evening peak) is particularly valuable — high prices, low fleet output.<br/><br/>
                  Fleet shape from {shapeFarms.length} {project.state} wind farms in the AURES dataset. Based on ~12 months of dispatch data.
                </ChartInfo>
              </p>
              <p className="text-[9px] text-[var(--color-text-muted)] mb-3">
                Fleet from {shapeFarms.length} farms · Yellow band = NEM evening peak (6–9pm AEST)
              </p>
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={hourlyChartData} margin={{ top: 4, right: 8, bottom: 0, left: -14 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <ReferenceLine x="6pm" stroke="#f59e0b15" strokeWidth={24} />
                  <ReferenceLine x="7pm" stroke="#f59e0b15" strokeWidth={24} />
                  <ReferenceLine x="8pm" stroke="#f59e0b15" strokeWidth={24} />
                  <XAxis dataKey="hour" tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} interval={3} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickFormatter={v => `${v}%`} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
                    formatter={((v: number, name: string) => [`${v?.toFixed(1)}%`, name === 'farm' ? 'This Farm' : name === 'fleet' ? 'Fleet Avg' : 'Divergence']) as TF}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }}
                    formatter={(v: string) => v === 'farm' ? project.name.slice(0, 22) : v === 'fleet' ? `${project.state} Fleet Avg` : 'Farm − Fleet'} />
                  <Line type="monotone" dataKey="fleet" stroke="#6b7280" strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls name="fleet" />
                  <Line type="monotone" dataKey="farm" stroke="#3b82f6" strokeWidth={2.5} dot={false} connectNulls name="farm" />
                  <Line type="monotone" dataKey="diff" stroke="#22c55e80" strokeWidth={1} strokeDasharray="2 2" dot={false} connectNulls name="diff" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {/* ── SOLAR ANTI-CORRELATION VIEW ── */}
      {diversityView === 'solar' && (
        <>
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
            <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
              <strong className="text-[var(--color-text)]">Solar anti-correlation</strong> — as solar capacity
              expands in {project.state}, midday prices are increasingly suppressed (the "duck curve"). A wind
              farm that generates in the <strong className="text-[var(--color-text)]">morning, evening, overnight,
              or in low-solar seasons</strong> is structurally anti-correlated with solar output and benefits
              from higher prices during those windows. Pearson R vs reference solar shape: <span style={{ color: solarCorrColor }}>{solarCorrR?.toFixed(3) ?? '–'} ({solarCorrLabel})</span>.
            </p>
          </div>

          {/* Headline solar metrics */}
          <div className="grid grid-cols-3 gap-2">
            <MetricCard
              label="Solar Correlation (R)"
              value={solarCorrR != null ? solarCorrR.toFixed(2) : '–'}
              sub={solarCorrLabel}
              highlight={solarCorrR != null ? (solarCorrR < 0.2 ? 'green' : solarCorrR < 0.5 ? 'yellow' : 'red') : undefined}
            />
            <MetricCard
              label="Off-Solar-Hours Output"
              value={offSolarPct != null ? `${offSolarPct}%` : '–'}
              sub="generation outside 9am–3pm"
              highlight={offSolarPct != null ? (offSolarPct >= 65 ? 'green' : offSolarPct >= 50 ? 'yellow' : 'red') : undefined}
            />
            <MetricCard
              label="Evening Peak Share"
              value={farmHourly ? (() => {
                const total = farmHourly.reduce((s: number, v) => s + (v ?? 0), 0)
                const peak = [18, 19, 20, 21].reduce((s: number, i) => s + (farmHourly[i] ?? 0), 0)
                return total > 0 ? `${(peak / total * 100).toFixed(0)}%` : '–'
              })() : '–'}
              sub="output in 6–9pm window"
              highlight="yellow"
            />
          </div>

          {/* Hourly shape: farm vs solar reference */}
          {hourlyChartData && (
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
              <p className="text-[10px] font-medium text-[var(--color-text-muted)] mb-1 uppercase tracking-wider flex items-center">
                Hourly Shape: Farm vs Solar Reference Profile
                <ChartInfo>
                  <p style={{color:'#f1f5f9',fontWeight:600,marginBottom:4}}>Solar anti-correlation (intraday)</p>
                  Blue = this farm's hourly CF% (AEST). Orange dashed = reference solar generation profile (representative NEM utility-scale solar).<br/><br/>
                  <strong style={{color:'#22c55e'}}>Farm above solar at 6–9pm</strong> or overnight = complementary generation — prices are typically higher outside solar hours.<br/><br/>
                  Pearson R = {solarCorrR?.toFixed(3) ?? '–'}. Negative or near-zero R = strong solar complement. High positive R = farm generates when solar does — competes in the low-price midday window.<br/><br/>
                  Solar reference: representative utility-scale NEM profile. Exact correlation varies by location and season.
                </ChartInfo>
              </p>
              <p className="text-[9px] text-[var(--color-text-muted)] mb-3">
                R vs solar = <span style={{ color: solarCorrColor }}>{solarCorrR?.toFixed(3) ?? '–'}</span> · Yellow = evening peak (6–9pm) · Orange band = solar peak (9am–3pm)
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={hourlyChartData} margin={{ top: 4, right: 8, bottom: 0, left: -14 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  {/* Solar peak band */}
                  {[9, 10, 11, 12, 13, 14, 15].map(h => (
                    <ReferenceLine key={h} x={HOURS[h]} stroke="#f59e0b10" strokeWidth={28} />
                  ))}
                  {/* Evening peak band */}
                  {[18, 19, 20, 21].map(h => (
                    <ReferenceLine key={h} x={HOURS[h]} stroke="#22c55e10" strokeWidth={28} />
                  ))}
                  <XAxis dataKey="hour" tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} interval={3} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickFormatter={v => `${v}%`} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
                    formatter={((v: number, name: string) => [`${v?.toFixed(1)}%`, name === 'farm' ? 'This Farm' : 'Solar Reference']) as TF}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }}
                    formatter={(v: string) => v === 'farm' ? project.name.slice(0, 22) : 'Solar Reference'} />
                  <Line type="monotone" dataKey="solar" stroke="#f59e0b" strokeWidth={1.8} strokeDasharray="4 3" dot={false} connectNulls name="solar" />
                  <Line type="monotone" dataKey="farm" stroke="#3b82f6" strokeWidth={2.5} dot={false} connectNulls name="farm" />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-1.5">
                <span className="text-[9px] text-[var(--color-text-muted)]">
                  <span className="inline-block w-3 h-1.5 bg-amber-400/30 rounded mr-1" />Solar peak hours (9am–3pm)
                </span>
                <span className="text-[9px] text-[var(--color-text-muted)]">
                  <span className="inline-block w-3 h-1.5 bg-green-500/20 rounded mr-1" />Evening peak (6–9pm)
                </span>
              </div>
            </div>
          )}

          {/* Seasonal solar complement */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
            <p className="text-[10px] font-medium text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">
              Seasonal Solar Complement
            </p>
            <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed mb-3">
              Solar output in {project.state} peaks in summer and troughs in winter. A wind farm with
              <strong className="text-[var(--color-text)]"> higher CF in winter</strong> is not only producing
              more when prices are typically higher — it is also complementing the solar fleet when solar output
              is lowest. This "double anti-correlation" is the most valuable position in the NEM.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(['winter', 'summer'] as const).map(s => {
                const sa = project.seasonal_averages[s]
                const conf = SEASON_CONFIG[s]
                const solarSeason = s === 'summer' ? 'High solar output' : 'Low solar output'
                const solarIcon = s === 'summer' ? '☀️' : '🌑'
                return (
                  <div key={s} className="rounded-lg p-2.5 border border-[var(--color-border)]">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-base">{conf.icon}</span>
                      <span className="text-xs font-semibold" style={{ color: conf.color }}>{conf.label}</span>
                      <span className="text-[9px] text-[var(--color-text-muted)] ml-auto">{solarIcon} {solarSeason}</span>
                    </div>
                    <StatRow label="Farm CF" value={sa?.avg_cf_pct != null ? `${sa.avg_cf_pct.toFixed(1)}%` : '–'} color={conf.color} />
                    <StatRow label="Capture price" value={sa?.avg_capture_price != null ? `$${sa.avg_capture_price.toFixed(0)}/MWh` : '–'} color={conf.color} />
                    <StatRow label="Value factor" value={sa?.avg_value_factor != null ? sa.avg_value_factor.toFixed(2) : '–'} color={conf.color} />
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Forward context */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
        <p className="text-[10px] font-semibold text-[var(--color-text)] mb-1.5">Why Diversity Will Matter More Over Time</p>
        <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
          As renewable penetration in {project.state} grows toward the ISP&apos;s Optimal Development Path
          targets, both the <strong className="text-[var(--color-text)]">wind merit-order effect</strong> (correlated
          wind output) and the <strong className="text-[var(--color-text)]">solar duck curve</strong> (midday price
          suppression) will intensify. Farms with low wind-fleet correlation and low solar correlation will command
          a structural <em>diversity premium</em> in capture price. This analysis should inform PPA renegotiation
          terms, refinancing assumptions, and M&A pricing — the Pearson R metric is a simple, bankable proxy for
          long-run value factor sustainability.
        </p>
      </div>

      <p className="text-[9px] text-[var(--color-text-muted)] italic">
        Fleet correlation from {allStateProjects.length} operating {project.state} wind farms · {divData.length} months of overlapping data.
        Solar correlation uses a representative NEM utility-scale solar reference profile.
        Pool price data available Aug 2024+ only.
      </p>
    </div>
  )
}

// ============================================================
// NEM Lens tab — advanced NEM market framework
// ============================================================

function NemContextCard({ title, color, icon, content, metric, benchmark }: {
  title: string; color: string; icon: string
  content: string; metric: string | null; benchmark: string | null
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
      >
        <span className="text-sm">{icon}</span>
        <span className="text-xs font-semibold text-[var(--color-text)] flex-1">{title}</span>
        {metric && <span className="text-[10px] font-mono hidden sm:block" style={{ color }}>{metric}</span>}
        <span className="text-[10px] text-[var(--color-text-muted)] ml-1">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 border-t border-[var(--color-border)]">
          <p className="mt-2 text-[11px] text-[var(--color-text-muted)] leading-relaxed">{content}</p>
          {metric && (
            <div className="mt-2 flex items-center gap-3">
              <span className="text-[10px] font-bold" style={{ color }}>{metric}</span>
              {benchmark && <span className="text-[10px] text-[var(--color-text-muted)]">vs {benchmark}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NemLensTab({ project, stateAvg }: { project: WindValueProject; stateAvg: WindStateAverage | null }) {
  const vs = project.value_summary
  const vwapDiscountPct = vs.avg_value_factor != null
    ? ((1 - vs.avg_value_factor) * 100).toFixed(1) : null

  // VWAP vs TWAP chart data
  const vwapData = project.monthly_data
    .filter(m => m.capture_price != null && m.pool_price != null)
    .map(m => ({
      label: `${MONTH_LABELS[m.month - 1]} '${String(m.year).slice(2)}`,
      vwap: m.capture_price as number,
      twap: m.pool_price as number,
    }))
    .slice(-24)

  const annualRevenue = project.annual_data.length > 0
    ? project.annual_data[project.annual_data.length - 1].revenue_aud : null

  const estimatedLgcs = project.capacity_mw && vs.avg_cf_pct
    ? Math.round(project.capacity_mw * (vs.avg_cf_pct / 100) * 8760 / 1000) : null

  const dataItems = [
    { category: 'Operational Specs', items: 'Hub height, rotor diameter, cut-in/cut-out wind speeds', status: 'none', note: 'Turbine model — to be loaded' },
    { category: 'MLF & Marginality', items: 'Marginal Loss Factor (MLF), Distribution Loss Factor (DLF)', status: 'none', note: 'Annual AEMO MLF register — future enhancement' },
    { category: 'Grid Context', items: 'Connection node, Transmission Limit Group (TLG), REZ proximity', status: 'none', note: 'AEMO network topology data' },
    { category: 'Performance', items: `CF ${vs.avg_cf_pct?.toFixed(1) ?? '–'}% avg · UIGF/SCADA availability`, status: 'partial', note: 'CF ✓ · UIGF/SCADA not yet loaded' },
    { category: 'Contractual', items: 'PPA floor price, LGC ownership, GPS compliance', status: 'none', note: 'Commercial-in-confidence' },
    { category: 'Energy Revenue', items: annualRevenue != null ? `$${(annualRevenue / 1e6).toFixed(1)}M latest year` : '–', status: 'good', note: 'AEMO settlement via OpenElectricity' },
    { category: 'Capture Price (VWAP)', items: vs.avg_capture_price != null ? `$${vs.avg_capture_price.toFixed(0)}/MWh avg` : '–', status: 'good', note: 'Settlement + pool price (Aug 2024+)' },
    { category: 'Value Factor (VWAP/TWAP)', items: vs.avg_value_factor != null ? vs.avg_value_factor.toFixed(3) : '–', status: 'good', note: 'Computed · see Diversity tab for context' },
  ]

  return (
    <div className="space-y-5">
      <div className="bg-slate-500/5 border border-slate-500/20 rounded-lg p-3">
        <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
          <strong className="text-[var(--color-text)]">NEM Market Lens</strong> — the NEM is transitioning
          rapidly from thermal generation. Valuing a wind farm now requires understanding not just <em>how much</em> it
          produces but <em>when</em> relative to price signals, <em>where</em> on the transmission network (MLF),
          and how grid constraints limit output (curtailment). This tab surfaces the analytical framework;
          the Diversity tab applies it to this project&apos;s specific generation signature.
          <span className="block mt-1 opacity-70 text-[9px]">
            Framework: AEMO (2023, 2025) · Jacobs (2026) · Nguyen et al. (2016). References below.
          </span>
        </p>
      </div>

      {/* Data coverage table */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
        <p className="text-[10px] font-medium text-[var(--color-text-muted)] mb-3 uppercase tracking-wider">
          Site Data Essentials — AURES Coverage
        </p>
        <div className="space-y-1.5">
          {dataItems.map((item, i) => (
            <div key={i} className="flex items-start gap-2 py-1 border-b border-[var(--color-border)] last:border-0">
              <span className={`shrink-0 mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                item.status === 'good' ? 'bg-green-500/20 text-green-400'
                : item.status === 'partial' ? 'bg-amber-500/20 text-amber-400'
                : 'bg-[var(--color-border)] text-[var(--color-text-muted)]'
              }`}>
                {item.status === 'good' ? '✓' : item.status === 'partial' ? '~' : '–'}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-semibold text-[var(--color-text)]">{item.category}</span>
                <span className="text-[10px] text-[var(--color-text-muted)] ml-1.5">{item.items}</span>
              </div>
              <span className="text-[9px] text-[var(--color-text-muted)] shrink-0 hidden sm:block max-w-[160px] text-right">{item.note}</span>
            </div>
          ))}
        </div>
        <p className="text-[9px] text-[var(--color-text-muted)] mt-2">
          <span className="text-green-400 font-bold">✓ available</span> · <span className="text-amber-400 font-bold">~ partial</span> · <span className="font-bold text-[var(--color-text-muted)]">– not loaded</span>
        </p>
      </div>

      {/* VWAP vs TWAP chart */}
      {vwapData.length > 1 && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
          <p className="text-[10px] font-medium text-[var(--color-text-muted)] mb-1 uppercase tracking-wider flex items-center">
            VWAP vs TWAP — Monthly Capture vs Pool Price
            <ChartInfo>
              <p style={{color:'#f1f5f9',fontWeight:600,marginBottom:4}}>VWAP vs TWAP</p>
              <strong style={{color:'#3b82f6'}}>VWAP</strong> (Volume-Weighted Average Price) = capture price: what this farm actually received per MWh generated.<br/><br/>
              <strong style={{color:'#9ca3af'}}>TWAP</strong> (Time-Weighted Average Price) = pool price: the flat average regardless of when generation occurred.<br/><br/>
              The gap = cannibalisation discount. The value factor (VWAP÷TWAP) summarises this in one number. See the Capture tab for the full monthly history.
            </ChartInfo>
          </p>
          <p className="text-[9px] text-[var(--color-text-muted)] mb-3">
            Blue = VWAP (capture price) · Grey = TWAP (pool price) · Gap = merit order discount
            {vwapDiscountPct && ` · Avg discount: ${vwapDiscountPct}%`}
          </p>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={vwapData} margin={{ top: 4, right: 8, bottom: 0, left: -4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 8, fill: 'var(--color-text-muted)' }} interval={2} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickFormatter={v => `$${v}`} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
                formatter={((v: number, name: string) => [
                  `$${v?.toFixed(0)}/MWh`, name === 'vwap' ? 'VWAP (Capture)' : 'TWAP (Pool Avg)',
                ]) as TF}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} formatter={(v: string) => v === 'vwap' ? 'VWAP (Capture)' : 'TWAP (Pool)'} />
              <Bar dataKey="twap" name="twap" fill="#6b728050" radius={[2, 2, 0, 0]} />
              <Bar dataKey="vwap" name="vwap" fill="#3b82f6" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* NEM context cards */}
      <div className="space-y-2">
        {([
          {
            icon: '✂️', title: 'MLF: The Silent Revenue Haircut', color: '#ef4444',
            content: 'Marginal Loss Factor (MLF) is applied to all energy revenue: Revenue = Generation (MWh) × MLF × Spot Price. An MLF of 0.95 means the farm receives only 95% of the spot price per MWh generated. MLFs shift annually based on grid conditions and nearby generation. Farms in weak grid locations or REZ clusters can see MLFs decline as more capacity connects. Revenue shown in AURES does not yet apply a project-specific MLF — the values shown are pre-MLF.',
            metric: 'Not yet in AURES — check AEMO annual MLF register', benchmark: null,
          },
          {
            icon: '✂️', title: 'Curtailment: Economic vs Technical', color: '#f59e0b',
            content: 'Curtailment is no longer just "too much wind." In the modern NEM it splits into: (1) Economic curtailment — bidding off at negative prices to avoid dispatch costs; and (2) Technical/network curtailment — NEMDE-forced output caps due to system strength limits, thermal line constraints, or inertia requirements (AEMO, 2025). The gap between UIGF (Unconstrained Intermittent Generation Forecast) and metered output is the primary measure of total curtailment. This data is derivable from AEMO SCADA and bid data — a planned future AURES enhancement.',
            metric: null, benchmark: null,
          },
          {
            icon: '⚡', title: 'FCAS Causer Pays', color: '#8b5cf6',
            content: 'Frequency Control Ancillary Services (FCAS) "causer pays" is a hidden cost for semi-scheduled generators. AEMO allocates FCAS costs based on each generator\'s contribution to frequency deviations. Intermittent output variations (ramps) incur FCAS charges that reduce net revenue. This can be $1–5/MWh equivalent in high-FCAS-cost periods and is particularly relevant for farms with high output variability.',
            metric: null, benchmark: null,
          },
          {
            icon: '📊', title: 'Peak Demand Correlation', color: '#3b82f6',
            content: 'Analysing how the wind generation profile correlates with evening peak demand (6pm–9pm AEST) — the highest-price window in most NEM regions. Offshore wind typically shows stronger correlation with winter and evening peaks than onshore assets (Jacobs, 2026). The Diversity tab\'s intraday shape comparison provides this analysis for this project. Farms with strong 6–9pm output have a structural price premium versus those with flat or overnight-biased profiles.',
            metric: vs.avg_capture_price != null ? `Capture: $${vs.avg_capture_price.toFixed(0)}/MWh avg` : null,
            benchmark: stateAvg?.avg_capture_price != null ? `$${stateAvg.avg_capture_price.toFixed(0)} state avg` : null,
          },
        ] as const).map((s, i) => (
          <NemContextCard key={i} {...s} />
        ))}
      </div>

      {/* Revenue stack */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
        <p className="text-[10px] font-medium text-[var(--color-text-muted)] mb-3 uppercase tracking-wider">Revenue Stack — Comprehensive Value Framework</p>
        <div className="space-y-2">
          {[
            {
              num: '1', color: '#3b82f6', label: 'Energy Revenue',
              formula: 'Gen (MWh) × MLF × Spot Price',
              note: annualRevenue != null ? `Most recent year: $${(annualRevenue / 1e6).toFixed(1)}M (pre-MLF) — available in AURES` : 'Available in AURES from settlement data',
              available: true,
            },
            {
              num: '2', color: '#22c55e', label: 'LGC Revenue',
              formula: 'MWh × LGC price (spot ~$40–60/MWh)',
              note: estimatedLgcs != null ? `Est. ~${estimatedLgcs}k LGCs/year at current CF — not yet in AURES pipeline` : 'Not yet in AURES pipeline',
              available: false,
            },
            {
              num: '3', color: '#f59e0b', label: 'Capacity Value (ELCC)',
              formula: 'Effective Load Carrying Capability × $/MW (CIS)',
              note: 'Quantifies the farm\'s contribution to system reliability. Critical for Capacity Investment Scheme (CIS) bidding. Varies significantly by state penetration level (Nguyen et al., 2016).',
              available: false,
            },
            {
              num: '4', color: '#8b5cf6', label: 'Firming Strategy (BESS)',
              formula: 'BESS arbitrage + FCAS revenue − capex',
              note: 'Co-located battery economics are proven — QLD discharged >100GWh from storage in a single month (Energy-Storage.news, 2026). Assessed on a site-by-site curtailment and price spread basis.',
              available: false,
            },
          ].map(item => (
            <div key={item.num} className="flex items-start gap-3 p-2 rounded-lg border border-[var(--color-border)]">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: item.color }}>
                {item.num}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-[var(--color-text)]">{item.label}</span>
                  <code className="text-[9px] text-[var(--color-text-muted)] bg-white/5 px-1.5 py-0.5 rounded">{item.formula}</code>
                  {item.available && <span className="text-[9px] text-green-400 font-bold">✓ in AURES</span>}
                </div>
                <p className="text-[10px] text-[var(--color-text-muted)] mt-1 leading-relaxed">{item.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Forward-looking context */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
        <p className="text-[10px] font-medium text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">Forward-Looking Context</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { icon: '📡', label: 'ELI Reports', text: 'AEMO\'s Enhanced Locational Information (ELI) reports show projected network hosting capacities and constraint equations for specific regions. Use to assess whether new transmission will relieve or worsen local congestion.' },
            { icon: '🗺️', label: 'ISP Alignment', text: 'Align site data with AEMO\'s Integrated System Plan Optimal Development Path. Projects near HumeLink, VNI West, or REZ corridors face fundamentally different curtailment futures depending on build-out timing.' },
            { icon: '🔋', label: 'BESS Co-location', text: 'Battery co-location economics are proven at scale in QLD (2026). Site assessment should model firming during curtailment events and FCAS revenue, particularly at sites with >5% technical curtailment.' },
          ].map((item, i) => (
            <div key={i} className="rounded-lg p-2.5 border border-[var(--color-border)]">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-base">{item.icon}</span>
                <span className="text-[10px] font-semibold text-[var(--color-text)]">{item.label}</span>
              </div>
              <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* References */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
        <p className="text-[10px] font-medium text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">References</p>
        <ul className="space-y-1.5">
          {[
            'AEMO. (2023). NEM Operational Forecasting and Dispatch Handbook for wind and solar generators.',
            'AEMO. (2025). 2025 Enhanced Locational Information (ELI) Report. Australian Energy Market Operator.',
            'Energy-Storage.news. (2026). Australia: Queensland becomes first NEM state to discharge over 100GWh from battery storage in a month.',
            'Jacobs. (2026). NEM Offshore Wind Benefits Study — Summary Findings. Southerly Ten.',
            'Nguyen, C., Ma, C., Hailu, A., & Chalak, M. (2016). Factors influencing calculation of capacity value of wind power: A case study of the NEM. Renewable Energy, 90, 319–328.',
          ].map((ref, i) => (
            <li key={i} className="text-[9px] text-[var(--color-text-muted)] leading-relaxed pl-3 border-l border-[var(--color-border)]">{ref}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ============================================================
// PDF summary — flat light-mode layout for export
// ============================================================

function computeKeyFindings(
  project: WindValueProject,
  stateAvg: WindStateAverage | null,
  corrR: number,
): string[] {
  const vs = project.value_summary
  const sr = project.state_rank
  const findings: string[] = []

  if (vs.avg_cf_pct != null) {
    const cfDiff = stateAvg?.avg_cf_pct != null ? vs.avg_cf_pct - stateAvg.avg_cf_pct : null
    const rank = sr?.cf_percentile != null ? ` — top ${Math.round(100 - sr.cf_percentile)}% of ${project.state} fleet` : ''
    if (cfDiff != null && Math.abs(cfDiff) >= 1) {
      findings.push(`Capacity factor: ${vs.avg_cf_pct.toFixed(1)}% (${cfDiff > 0 ? '+' : ''}${cfDiff.toFixed(1)}pp vs ${project.state} average of ${stateAvg!.avg_cf_pct!.toFixed(1)}%)${rank}.`)
    } else {
      findings.push(`Capacity factor: ${vs.avg_cf_pct.toFixed(1)}% — in line with ${project.state} state average${rank}.`)
    }
  }

  if (vs.avg_value_factor != null) {
    const disc = ((1 - vs.avg_value_factor) * 100).toFixed(0)
    if (vs.avg_value_factor >= 0.95) {
      findings.push(`Capture quality: value factor ${vs.avg_value_factor.toFixed(2)} — earns close to the pool average with minimal cannibalisation discount.`)
    } else if (vs.avg_value_factor >= 0.80) {
      findings.push(`Capture quality: value factor ${vs.avg_value_factor.toFixed(2)} — earns ~${disc}% below pool price, typical for ${project.state} wind; moderate cannibalisation exposure.`)
    } else {
      findings.push(`Capture quality: value factor ${vs.avg_value_factor.toFixed(2)} — earns ${disc}% below pool price; significant cannibalisation discount reflects high wind-hour congestion.`)
    }
  }

  if (corrR != null) {
    if (corrR < 0.5) {
      findings.push(`Fleet diversity: correlation R=${corrR.toFixed(2)} — output is relatively uncorrelated with other ${project.state} wind farms, reducing exposure to mass generation events.`)
    } else if (corrR < 0.75) {
      findings.push(`Fleet diversity: moderate fleet correlation R=${corrR.toFixed(2)} — some exposure to cannibalisation during high-wind periods across ${project.state}.`)
    } else {
      findings.push(`Fleet diversity: high fleet correlation R=${corrR.toFixed(2)} — strongly correlated with ${project.state} wind fleet; elevated cannibalisation risk.`)
    }
  }

  const seasonData = ['summer', 'autumn', 'winter', 'spring'].map(s => ({
    s, cf: project.seasonal_averages[s]?.avg_cf_pct ?? null, capture: project.seasonal_averages[s]?.avg_capture_price ?? null,
  })).filter(d => d.cf != null)
  const best = [...seasonData].sort((a, b) => b.cf! - a.cf!)[0]
  const worst = [...seasonData].sort((a, b) => a.cf! - b.cf!)[0]
  if (best && worst && best.s !== worst.s) {
    const priceNote = best.s === 'winter' ? ' Winter peak aligns with high evening demand and elevated prices.' : best.s === 'summer' ? ' Summer peak may coincide with solar suppression of midday prices.' : ''
    findings.push(`Seasonal profile: strongest in ${best.s} (${best.cf!.toFixed(1)}% CF${best.capture != null ? `, $${best.capture.toFixed(0)}/MWh capture` : ''}), weakest in ${worst.s} (${worst.cf!.toFixed(1)}% CF).${priceNote}`)
  }

  if (project.annual_data.length >= 4) {
    const sorted = [...project.annual_data].sort((a, b) => a.year - b.year)
    const early = sorted.slice(0, Math.floor(sorted.length / 2)).map(y => y.cf_pct ?? 0)
    const recent = sorted.slice(-Math.floor(sorted.length / 2)).map(y => y.cf_pct ?? 0)
    const earlyAvg = early.reduce((a, b) => a + b, 0) / early.length
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
    const delta = recentAvg - earlyAvg
    if (Math.abs(delta) >= 1.5) {
      findings.push(`Long-term trend: CF ${delta > 0 ? 'improving' : 'declining'} — recent average ${recentAvg.toFixed(1)}% vs early-life ${earlyAvg.toFixed(1)}%.${delta < -2 ? ' Declining trend may reflect resource variability or equipment wear.' : ''}`)
    }
  }

  return findings
}

function WindValuePdfSummary({
  project, stateAvg, allStateProjects, projectMeta,
}: {
  project: WindValueProject
  stateAvg: WindStateAverage | null
  allStateProjects: WindValueProject[]
  poolPrices?: Record<string, Record<string, number>>
  projectMeta?: Project | null
}) {
  const vs = project.value_summary
  const sr = project.state_rank
  const pc = project.pros_cons
  const today = new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })

  const annualData = project.annual_data.map(a => ({ year: String(a.year), cf: a.cf_pct }))

  // Curtailment / MLF proxy calculations (mirrors the live CurtailmentIndicators)
  const annualFull = project.annual_data
  const rampYearPdf = vs.ramp_year
  const sortedAnnual = [...annualFull].filter(a => a.year !== rampYearPdf).sort((a, b) => a.year - b.year)
  const cfDriftPpPdf = sortedAnnual.length >= 2 ? sortedAnnual[sortedAnnual.length - 1].cf_pct - sortedAnnual[0].cf_pct : null
  const sortedCap = sortedAnnual.filter(a => a.capture_price != null)
  const captureDriftPctPdf = sortedCap.length >= 2 && sortedCap[0].capture_price != null && sortedCap[0].capture_price !== 0
    ? ((sortedCap[sortedCap.length - 1].capture_price! - sortedCap[0].capture_price!) / sortedCap[0].capture_price!) * 100
    : null
  const revenueImpactPerMwPerYearPdf = cfDriftPpPdf != null && vs.avg_capture_price != null
    ? (cfDriftPpPdf / 100) * 8760 * vs.avg_capture_price
    : null
  const aggregateAnnualLossPdf = revenueImpactPerMwPerYearPdf != null
    ? revenueImpactPerMwPerYearPdf * project.capacity_mw
    : null
  // YoY series for the small inline chart in the PDF
  const yoySeries = (() => {
    const out: { year: string; cfDelta: number | null; captureDelta: number | null }[] = []
    const all = [...annualFull].sort((a, b) => a.year - b.year)
    for (let i = 1; i < all.length; i++) {
      const cur = all[i]
      const prev = all[i - 1]
      const skip = prev.year === rampYearPdf
      out.push({
        year: String(cur.year),
        cfDelta: skip ? null : (cur.cf_pct - prev.cf_pct),
        captureDelta: cur.capture_price != null && prev.capture_price != null && !skip
          ? (cur.capture_price - prev.capture_price) : null,
      })
    }
    return out
  })()

  const monthlyCapture = MONTH_LABELS.map((label, i) => {
    const avg = project.monthly_averages[String(i + 1)]
    return { month: label, capture: avg?.avg_capture_price ?? null, vf: avg?.avg_value_factor ?? null }
  })

  const seasons = ['summer', 'autumn', 'winter', 'spring']
  const seasonRows = seasons.map(s => ({
    label: `${SEASON_CONFIG[s].icon} ${SEASON_CONFIG[s].label}`,
    color: SEASON_CONFIG[s].color,
    cf: project.seasonal_averages[s]?.avg_cf_pct ?? null,
    capture: project.seasonal_averages[s]?.avg_capture_price ?? null,
    vf: project.seasonal_averages[s]?.avg_value_factor ?? null,
    pct: project.seasonal_averages[s]?.pct_of_annual_energy ?? null,
  }))

  // Fleet correlation
  const fleetAvg = computeFleetMonthly(allStateProjects)
  const divPoints = project.monthly_data
    .map(m => {
      const fCf = fleetAvg[`${m.year}-${m.month}`]
      if (m.cf_pct == null || fCf == null) return null
      return { farmCf: m.cf_pct, fleetCf: fCf }
    })
    .filter((d): d is { farmCf: number; fleetCf: number } => d !== null)
  const corrR = pearsonCorrelation(divPoints.map(d => d.farmCf), divPoints.map(d => d.fleetCf))

  // Solar correlation from hourly shape
  const farmHourly = project.hourly_shape?.annual ?? null
  const solarCorrR = farmHourly
    ? pearsonCorrelation(
        farmHourly.filter((v): v is number => v != null),
        SOLAR_REF_SHAPE.filter((_, i) => farmHourly[i] != null)
      )
    : null

  const peerData = [...allStateProjects]
    .sort((a, b) => (b.value_summary.avg_cf_pct ?? 0) - (a.value_summary.avg_cf_pct ?? 0))
    .slice(0, 8)
    .map(p => ({ name: p.name.replace(' Wind Farm', '').replace(' Wind', '').slice(0, 18), cf: p.value_summary.avg_cf_pct ?? 0, isThis: p.id === project.id }))

  // Diversity Capture Premium — same calc as the live Diversity tab
  const farmCapture = vs.avg_capture_price ?? null
  const stateCapturePdf = stateAvg?.avg_capture_price ?? null
  const capturePremium = farmCapture != null && stateCapturePdf != null ? farmCapture - stateCapturePdf : null
  const peerPremiums = stateCapturePdf != null
    ? allStateProjects
        .map(p => p.value_summary.avg_capture_price != null ? { id: p.id, name: p.name, premium: p.value_summary.avg_capture_price - stateCapturePdf } : null)
        .filter((x): x is { id: string; name: string; premium: number } => x !== null)
        .sort((a, b) => b.premium - a.premium)
    : []
  const ourPremiumRank = peerPremiums.findIndex(p => p.id === project.id) + 1
  const totalPremiumRanked = peerPremiums.length
  const bestPremiumPdf = peerPremiums[0]
  const worstPremiumPdf = peerPremiums[peerPremiums.length - 1]
  const medianPremiumPdf = peerPremiums[Math.floor(peerPremiums.length / 2)]

  const gradeColor = pc?.grade?.startsWith('A') ? '#166534' : pc?.grade?.startsWith('B') ? '#1d4ed8' : '#92400e'
  const gradeBg = pc?.grade?.startsWith('A') ? '#dcfce7' : pc?.grade?.startsWith('B') ? '#dbeafe' : '#fef3c7'

  const keyFindings = computeKeyFindings(project, stateAvg, corrR)

  // Price band distribution (from monthly capture prices)
  const priceBandRows = computePriceBandDist(project.monthly_data)
  const fleetBandRows = computeFleetPriceBandDist(allStateProjects)
  const maxBandPct = Math.max(...priceBandRows.map(b => b.pct), ...fleetBandRows.map(b => b.pct), 1)

  return (
    <div style={{ width: 900, backgroundColor: '#ffffff', color: '#0f172a', fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #e2e8f0' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>{project.name}</h2>
          <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 0 0' }}>
            {project.state} · {project.capacity_mw} MW · Wind Value Analysis · {today}
          </p>
        </div>
        {pc?.grade && (
          <div style={{ backgroundColor: gradeBg, color: gradeColor, padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700 }}>
            {pc.grade} · {pc.score?.toFixed(1)}/5.0
          </div>
        )}
      </div>

      {/* Project Profile · Evolution Timeline (shared with Solar+BESS) */}
      <ProjectProfileSection projectMeta={projectMeta} tech="wind" />
      <ProjectEvolutionTimelineSection projectMeta={projectMeta} />

      {/* Headline metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Avg Capacity Factor', value: vs.avg_cf_pct != null ? `${vs.avg_cf_pct.toFixed(1)}%` : '–', sub: stateAvg?.avg_cf_pct != null ? `${stateAvg.avg_cf_pct.toFixed(1)}% state avg` : undefined, color: '#3b82f6' },
          { label: 'Capture Price (VWAP)', value: vs.avg_capture_price != null ? `$${vs.avg_capture_price.toFixed(0)}/MWh` : '–', sub: stateAvg?.avg_capture_price != null ? `$${stateAvg.avg_capture_price.toFixed(0)} state` : undefined, color: '#22c55e' },
          { label: 'Value Factor', value: vs.avg_value_factor != null ? vs.avg_value_factor.toFixed(3) : '–', sub: vs.avg_value_factor != null ? (vs.avg_value_factor >= 0.9 ? 'Strong' : vs.avg_value_factor >= 0.75 ? 'Moderate' : 'Discounted') : undefined, color: vs.avg_value_factor != null ? (vs.avg_value_factor >= 0.9 ? '#22c55e' : vs.avg_value_factor >= 0.75 ? '#f59e0b' : '#ef4444') : '#475569' },
          { label: 'Wind Fleet Corr. (R)', value: corrR.toFixed(2), sub: corrR < 0.5 ? 'Good diversity' : corrR < 0.75 ? 'Moderate' : 'High correlation', color: corrR < 0.5 ? '#22c55e' : corrR < 0.75 ? '#f59e0b' : '#ef4444' },
        ].map((m, i) => (
          <div key={i} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px' }}>
            <p style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{m.label}</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: m.color, margin: '3px 0 2px 0' }}>{m.value}</p>
            {m.sub && <p style={{ fontSize: 9, color: '#64748b', margin: 0 }}>{m.sub}</p>}
          </div>
        ))}
      </div>

      {/* Reading the metrics */}
      <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 12, marginBottom: 14 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px 0' }}>How to Read These Metrics</p>
        <p style={{ fontSize: 10, color: '#475569', lineHeight: 1.5, margin: '0 0 6px 0' }}>
          <strong style={{ color: '#0f172a' }}>Value Factor (VF)</strong> = capture price ÷ time-averaged regional reference price (RRP). It is a ratio (not a percentage). VF = 1.00 means this farm earns exactly the regional average across all hours — no cannibalisation discount. Wind typically scores 0.75–0.95. VF below 0.65 reflects heavy cannibalisation; VF above 1.00 means the farm structurally generates during higher-than-average price periods (rare).
        </p>
        <p style={{ fontSize: 10, color: '#475569', lineHeight: 1.5, margin: 0 }}>
          <strong style={{ color: '#0f172a' }}>Wind Fleet Correlation (R)</strong> = Pearson correlation coefficient between this farm's monthly CF and the rest of the {project.state} wind fleet's average monthly CF. R is bounded between −1 and +1 (it is not a percentage). R = 0.9 → tracks the fleet tightly (limited diversification, high cannibalisation risk). R = 0.3 → largely independent (good portfolio diversifier; lower cannibalisation exposure). R = 0.0 → no statistical relationship. Lower R is better for revenue.
        </p>
      </div>

      {/* Diversity Capture Premium — translates R into $/MWh */}
      {capturePremium != null && totalPremiumRanked > 1 && (() => {
        const premiumColorPdf =
          capturePremium >= 5 ? '#16a34a' :
          capturePremium >= 1 ? '#65a30d' :
          capturePremium >= -1 ? '#d97706' :
          '#dc2626'
        const pct = totalPremiumRanked > 0 ? Math.round(((totalPremiumRanked - ourPremiumRank) / totalPremiumRanked) * 100) : 0
        return (
          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>
              Diversity Capture Premium — $/MWh vs {project.state} fleet average
            </p>
            <p style={{ fontSize: 9, color: '#94a3b8', margin: '0 0 10px 0', fontStyle: 'italic' }}>
              Translates the abstract Wind Fleet R = {corrR.toFixed(2)} into a dollar value: how much more $/MWh this farm earns than the capacity-weighted state wind average.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
                <p style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>This Farm</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: premiumColorPdf, margin: '3px 0 2px 0' }}>{capturePremium >= 0 ? '+' : ''}${capturePremium.toFixed(1)}</p>
                <p style={{ fontSize: 9, color: '#64748b', margin: 0 }}>vs ${stateCapturePdf?.toFixed(0)} state avg</p>
                {ourPremiumRank > 0 && (
                  <p style={{ fontSize: 9, color: premiumColorPdf, fontWeight: 600, margin: '3px 0 0 0' }}>Rank {ourPremiumRank} of {totalPremiumRanked} · top {100 - pct}%</p>
                )}
              </div>
              {bestPremiumPdf && (
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 12px' }}>
                  <p style={{ fontSize: 9, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Best NSW</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: '#15803d', margin: '3px 0 2px 0' }}>+${bestPremiumPdf.premium.toFixed(1)}</p>
                  <p style={{ fontSize: 9, color: '#15803d', margin: 0 }}>{bestPremiumPdf.name.replace(' Wind Farm', '').replace(' - Stage 1', '').slice(0, 22)}</p>
                </div>
              )}
              {medianPremiumPdf && (
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
                  <p style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Median</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '3px 0 2px 0' }}>{medianPremiumPdf.premium >= 0 ? '+' : ''}${medianPremiumPdf.premium.toFixed(1)}</p>
                  <p style={{ fontSize: 9, color: '#475569', margin: 0 }}>{medianPremiumPdf.name.replace(' Wind Farm', '').replace(' - Stage 1', '').slice(0, 22)}</p>
                </div>
              )}
              {worstPremiumPdf && (
                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px' }}>
                  <p style={{ fontSize: 9, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Worst</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: '#b91c1c', margin: '3px 0 2px 0' }}>${worstPremiumPdf.premium.toFixed(1)}</p>
                  <p style={{ fontSize: 9, color: '#b91c1c', margin: 0 }}>{worstPremiumPdf.name.replace(' Wind Farm', '').replace(' - Stage 1', '').slice(0, 22)}</p>
                </div>
              )}
            </div>
            <p style={{ fontSize: 9, color: '#64748b', lineHeight: 1.5, margin: '10px 0 0 0' }}>
              <strong style={{ color: '#0f172a' }}>Reading the price-band chart vs this number:</strong> band-level differences between this farm and the {project.state} fleet are often visually small because all wind farms operate against the same supply/demand backdrop. The $/MWh capture premium above is the cleaner signal. A premium of {capturePremium >= 0 ? '+' : ''}${capturePremium.toFixed(1)}/MWh on a {(vs.avg_cf_pct ?? 30).toFixed(0)}% CF wind farm equates to roughly ${(capturePremium * (vs.avg_cf_pct ?? 30) / 100 * 8.76).toFixed(0)}k of extra revenue per MW per year vs the fleet average.
            </p>
          </div>
        )
      })()}

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
              {annualData.map((d, i) => <Cell key={i} fill={YEAR_COLORS[parseInt(d.year)] ?? '#3b82f6'} />)}
            </Bar>
          </BarChart>
          <p style={{ fontSize: 9, color: '#64748b', margin: '6px 0 0 0', lineHeight: 1.5 }}>
            Each bar shows annual capacity factor (% of maximum possible generation achieved). Year-on-year changes reflect wind resource variability, equipment availability, and curtailment. A declining trend over multiple years may indicate resource depletion, wake effects from new neighbouring wind farms, or equipment degradation.
          </p>
        </div>
      )}

      {/* Monthly capture + seasonal in 2 cols */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 12, marginBottom: 14 }}>
        {monthlyCapture.some(d => d.capture != null) && (
          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Monthly Capture Price ($/MWh avg)</p>
            <BarChart width={520} height={140} data={monthlyCapture} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#475569' }} />
              <YAxis tick={{ fontSize: 9, fill: '#475569' }} tickFormatter={v => `$${v}`} />
              <Bar dataKey="capture" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                {monthlyCapture.map((d, i) => <Cell key={i} fill={d.vf == null ? '#3b82f6' : d.vf >= 1.0 ? '#22c55e' : d.vf >= 0.8 ? '#3b82f6' : '#ef4444'} />)}
              </Bar>
              {vs.avg_capture_price != null && (
                <ReferenceLine y={vs.avg_capture_price} stroke="#0f172a40" strokeDasharray="4 3"
                  label={{ value: `$${vs.avg_capture_price.toFixed(0)}`, fill: '#475569', fontSize: 8, position: 'right' }} />
              )}
            </BarChart>
          </div>
        )}
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
                  <td style={{ padding: '3px 0', fontWeight: 600, color: s.color }}>{s.label}</td>
                  <td style={{ textAlign: 'right', color: '#0f172a' }}>{s.cf != null ? `${s.cf.toFixed(1)}%` : '–'}</td>
                  <td style={{ textAlign: 'right', color: '#0f172a' }}>{s.capture != null ? `$${s.capture.toFixed(0)}` : '–'}</td>
                  <td style={{ textAlign: 'right', color: s.vf != null ? (s.vf >= 1 ? '#166534' : s.vf >= 0.8 ? '#1d4ed8' : '#991b1b') : '#475569' }}>{s.vf != null ? s.vf.toFixed(2) : '–'}</td>
                  <td style={{ textAlign: 'right', color: '#475569' }}>{s.pct != null ? `${s.pct.toFixed(0)}%` : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 9, color: '#64748b', margin: '8px 0 0 0', lineHeight: 1.5 }}>
            VF = value factor (capture price ÷ pool price). VF {'>'} 1.0 (green) means the farm earns above pool; {'<'} 0.8 (red) indicates strong cannibalisation. %Egy = share of annual energy delivered in that season.
          </p>
        </div>
      </div>

      {/* Price band distribution */}
      {priceBandRows.some(b => b.pct > 0) && (
        <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.05em' }}>Price Band Distribution — % of MWh by Capture Price Regime</p>
          <p style={{ fontSize: 9, color: '#94a3b8', margin: '0 0 10px 0' }}>Each interval's MWh is bucketed by the 5-min RRP at that moment, then summed within the period. Farm vs {project.state} fleet comparison.</p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Price Band', 'This Farm', '', 'State Fleet', ''].map((h, i) => (
                  <th key={i} style={{ textAlign: i === 0 ? 'left' : i % 2 === 0 ? 'left' : 'right', color: '#64748b', paddingBottom: 6, fontWeight: 600, fontSize: 9, paddingRight: i % 2 === 0 ? 8 : 0 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {priceBandRows.map((b, i) => {
                const fleet = fleetBandRows[i]
                const farmWidth = `${Math.round(b.pct / maxBandPct * 100)}%`
                const fleetWidth = `${Math.round((fleet?.pct ?? 0) / maxBandPct * 100)}%`
                return (
                  <tr key={i} style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 8px 4px 0', fontSize: 10, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', width: 80 }}>{b.label}</td>
                    <td style={{ width: 40, textAlign: 'right', fontSize: 10, color: '#0f172a', paddingRight: 6 }}>{b.pct.toFixed(1)}%</td>
                    <td style={{ width: 160, paddingRight: 12 }}>
                      <div style={{ height: 10, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: farmWidth, backgroundColor: PRICE_BANDS[i]?.color ?? '#3b82f6', borderRadius: 3 }} />
                      </div>
                    </td>
                    <td style={{ width: 40, textAlign: 'right', fontSize: 10, color: '#475569', paddingRight: 6 }}>{(fleet?.pct ?? 0).toFixed(1)}%</td>
                    <td style={{ width: 160 }}>
                      <div style={{ height: 10, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: fleetWidth, backgroundColor: '#94a3b8', borderRadius: 3 }} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p style={{ fontSize: 9, color: '#64748b', margin: '8px 0 0 0', lineHeight: 1.5 }}>
            Each 5-min dispatch interval's generated MWh is bucketed by the regional reference price (RRP) at that moment, then summed within the coverage period. Farms skewed toward the $0–$50 band generate heavily during low-price periods (solar hours, high-wind events). Exposure to {'>'} $100 bands indicates capture of scarcity pricing — early-evening peaks, generator outages, transmission constraint events. Source: AEMO 5-min DISPATCHLOAD × DISPATCHPRICE.
          </p>
        </div>
      )}

      {/* State ranking + pros/cons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        {sr && (
          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>State Rankings — {project.state}</p>
            {[
              { label: 'Capacity Factor', rank: sr.cf_rank, total: sr.cf_total, pct: sr.cf_percentile },
              { label: 'Capture Price', rank: sr.capture_price_rank, total: sr.capture_price_total, pct: sr.capture_price_percentile },
              { label: 'Revenue/MW', rank: sr.revenue_per_mw_rank, total: sr.revenue_per_mw_total, pct: undefined },
            ].map((r, i) => {
              const pct = r.pct ?? Math.round((r.total - r.rank) / r.total * 100)
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
            <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 9, color: '#64748b' }}>Wind Fleet Correlation (R)</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: corrR < 0.5 ? '#166534' : corrR < 0.75 ? '#92400e' : '#991b1b' }}>{corrR.toFixed(2)}</span>
              </div>
              {solarCorrR != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 9, color: '#64748b' }}>Solar Correlation (R)</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: solarCorrR < 0.2 ? '#166534' : solarCorrR < 0.5 ? '#92400e' : '#991b1b' }}>{solarCorrR.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        )}
        {pc && (pc.pros.length > 0 || pc.cons.length > 0) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pc.pros.length > 0 && (
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 12, flex: 1 }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Value Strengths</p>
                {pc.pros.map((p, i) => <p key={i} style={{ fontSize: 10, color: '#15803d', margin: '2px 0' }}>+ {p}</p>)}
              </div>
            )}
            {pc.cons.length > 0 && (
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 12, flex: 1 }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Value Risks</p>
                {pc.cons.map((c, i) => <p key={i} style={{ fontSize: 10, color: '#b91c1c', margin: '2px 0' }}>− {c}</p>)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Peer CF rankings */}
      {peerData.length > 1 && (
        <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
            {project.state} Wind Farm Rankings — Avg CF% (Top {peerData.length})
          </p>
          <BarChart width={848} height={120} data={peerData} layout="vertical" margin={{ top: 4, right: 8, bottom: 0, left: 100 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 9, fill: '#475569' }} tickFormatter={v => `${v}%`} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 8, fill: '#475569' }} width={100} />
            <Bar dataKey="cf" radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {peerData.map((d, i) => <Cell key={i} fill={d.isThis ? '#0f172a' : '#3b82f640'} />)}
            </Bar>
          </BarChart>
          <p style={{ fontSize: 9, color: '#64748b', margin: '6px 0 0 0', lineHeight: 1.5 }}>
            Peer comparison across the top {peerData.length} {project.state} wind farms by average capacity factor (full operational history). Higher CF reduces LCOE and improves debt serviceability. This farm is shown in dark; peers in blue.
          </p>
        </div>
      )}

      {/* Revenue stack */}
      <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 14 }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '0.05em' }}>NEM Revenue Stack Framework</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { n: '1', label: 'Energy Revenue', formula: 'Gen × MLF × Spot Price', color: '#3b82f6', note: 'Settlement data in AURES (pre-MLF)' },
            { n: '2', label: 'LGC Revenue', formula: 'MWh × LGC price (~$40–60)', color: '#22c55e', note: 'Not yet in AURES' },
            { n: '3', label: 'Capacity Value (ELCC)', formula: 'ELCC × CIS $/MW', color: '#f59e0b', note: 'CIS scheme — state specific' },
            { n: '4', label: 'Firming (BESS)', formula: 'Arbitrage + FCAS − capex', color: '#8b5cf6', note: 'QLD >100GWh/month proven (2026)' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, padding: 8, backgroundColor: '#ffffff', borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: item.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{item.n}</div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#0f172a', margin: 0 }}>{item.label}</p>
                <p style={{ fontSize: 9, color: '#475569', margin: '1px 0 0 0' }}>{item.formula}</p>
                <p style={{ fontSize: 9, color: '#94a3b8', margin: '1px 0 0 0' }}>{item.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Curtailment & MLF indicators (proxies from existing AURES data) */}
      <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: 14, marginBottom: 14 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>
          Curtailment &amp; MLF Indicators
        </p>
        <p style={{ fontSize: 9, color: '#475569', margin: '0 0 12px 0', lineHeight: 1.5, fontStyle: 'italic' }}>
          AURES does not yet ingest MLF history or AEMO constraint logs directly. The indicators below use
          year-over-year CF, capture price and value factor as proxies for declining settlement economics.
          A persistent decline in any of these is the operational fingerprint of curtailment and/or MLF
          degradation. The ramp-up year (if any) is excluded from drift calculations.
        </p>

        {/* Four headline indicator cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
          {[
            {
              label: 'CF drift (since op.)',
              value: cfDriftPpPdf != null ? `${cfDriftPpPdf >= 0 ? '+' : ''}${cfDriftPpPdf.toFixed(1)} pp` : '–',
              sub: 'capacity factor trend',
              color: cfDriftPpPdf == null ? '#475569' : cfDriftPpPdf < -2 ? '#dc2626' : cfDriftPpPdf < 0 ? '#d97706' : '#16a34a',
            },
            {
              label: 'Capture price drift',
              value: captureDriftPctPdf != null ? `${captureDriftPctPdf >= 0 ? '+' : ''}${captureDriftPctPdf.toFixed(0)}%` : '–',
              sub: 'cumulative since first year',
              color: captureDriftPctPdf == null ? '#475569' : captureDriftPctPdf < -10 ? '#dc2626' : captureDriftPctPdf < 0 ? '#d97706' : '#16a34a',
            },
            {
              label: 'Implied rev. lost',
              value: revenueImpactPerMwPerYearPdf != null && revenueImpactPerMwPerYearPdf < 0
                ? `$${Math.abs(revenueImpactPerMwPerYearPdf / 1000).toFixed(1)}k/MW/yr`
                : '–',
              sub: 'from CF decline alone',
              color: revenueImpactPerMwPerYearPdf != null && revenueImpactPerMwPerYearPdf < 0 ? '#dc2626' : '#475569',
            },
            {
              label: 'Aggregate annual loss',
              value: aggregateAnnualLossPdf != null && aggregateAnnualLossPdf < 0
                ? `$${(Math.abs(aggregateAnnualLossPdf) / 1_000_000).toFixed(2)}M/yr`
                : '–',
              sub: `across ${project.capacity_mw} MW`,
              color: aggregateAnnualLossPdf != null && aggregateAnnualLossPdf < 0 ? '#dc2626' : '#475569',
            },
          ].map((m, i) => (
            <div key={i} style={{ backgroundColor: '#ffffff', border: '1px solid #fed7aa', borderRadius: 8, padding: '10px 12px' }}>
              <p style={{ fontSize: 9, color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{m.label}</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: m.color, margin: '3px 0 2px 0' }}>{m.value}</p>
              <p style={{ fontSize: 9, color: '#64748b', margin: 0 }}>{m.sub}</p>
            </div>
          ))}
        </div>

        {/* YoY chart */}
        {yoySeries.length > 0 && (
          <div>
            <p style={{ fontSize: 9, fontWeight: 600, color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>
              Year-over-Year Δ — CF (pp, left) and Capture Price ($/MWh, right)
            </p>
            <BarChart width={848} height={140} data={yoySeries} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" />
              <XAxis dataKey="year" tick={{ fontSize: 9, fill: '#9a3412' }} />
              <YAxis yAxisId="cf" tick={{ fontSize: 9, fill: '#9a3412' }} tickFormatter={v => `${v}pp`} />
              <YAxis yAxisId="cp" orientation="right" tick={{ fontSize: 9, fill: '#9a3412' }} tickFormatter={v => `$${v}`} />
              <ReferenceLine yAxisId="cf" y={0} stroke="#fb923c" />
              <Bar yAxisId="cf" dataKey="cfDelta" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                {yoySeries.map((d, i) => (
                  <Cell key={i} fill={d.cfDelta == null ? '#e5e7eb' : d.cfDelta < 0 ? '#dc2626' : '#16a34a'} />
                ))}
              </Bar>
              <Bar yAxisId="cp" dataKey="captureDelta" radius={[3, 3, 0, 0]} fillOpacity={0.5} isAnimationActive={false}>
                {yoySeries.map((d, i) => (
                  <Cell key={i} fill={d.captureDelta == null ? '#e5e7eb' : d.captureDelta < 0 ? '#f97316' : '#84cc16'} />
                ))}
              </Bar>
            </BarChart>
          </div>
        )}

        {/* Narrative */}
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #fed7aa' }}>
          <p style={{ fontSize: 9, color: '#475569', lineHeight: 1.5, margin: 0 }}>
            <strong style={{ color: '#0f172a' }}>Reading the indicators.</strong>{' '}
            {cfDriftPpPdf != null
              ? `Cumulative CF drift of ${cfDriftPpPdf >= 0 ? '+' : ''}${cfDriftPpPdf.toFixed(1)} pp from the first operational year to the most recent year. ${
                  cfDriftPpPdf < -1.5
                    ? 'This is consistent with curtailment creep — investigate AEMO constraint logs for the project\'s connection point and recent neighbouring connections.'
                    : cfDriftPpPdf < 0
                    ? 'Mild drift — likely a mix of wind variability and incremental curtailment.'
                    : 'Stable or improving — limited curtailment impact to date.'
                }`
              : 'Insufficient operational history to compute CF drift.'}
            {captureDriftPctPdf != null && ` Capture price has moved ${captureDriftPctPdf >= 0 ? '+' : ''}${captureDriftPctPdf.toFixed(0)}% cumulatively over the same period; ${
              captureDriftPctPdf < -10
                ? 'this is a substantial cannibalisation signal.'
                : captureDriftPctPdf < 0
                ? 'modest decline consistent with cluster build-out.'
                : 'broadly stable or up — partly reflecting elevated 2022-23 NEM wholesale prices.'
            }`}
          </p>
          <p style={{ fontSize: 9, color: '#475569', lineHeight: 1.5, margin: '6px 0 0 0' }}>
            <strong style={{ color: '#0f172a' }}>What to investigate further:</strong>{' '}
            (1) AEMO Marginal Loss Factor for the connection point — has it moved by &gt;5 pp since
            commissioning? (2) Adjacent or upstream wind/solar projects either commissioning or in
            CIS/LTESA award — each new entrant in the same network branch amplifies cluster
            cannibalisation and increases MLF degradation pressure. (3) Operator quarterly
            curtailment disclosure — split into technical (AEMO constraint) vs economic
            (negative-price avoidance).
          </p>
        </div>
      </div>

      {/* NEM Lens · Site Data Essentials (shared) */}
      <NemSiteDataEssentialsSection
        tech="wind"
        projectMeta={projectMeta}
        projectName={project.name}
        stateName={project.state}
        avgCfPct={vs.avg_cf_pct}
        avgCapture={vs.avg_capture_price}
        avgVf={vs.avg_value_factor}
        dataFirstYear={vs.data_first_year}
        dataLastYear={vs.data_last_year}
      />

      {/* Footer */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10 }}>
        <p style={{ fontSize: 9, color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: '#475569' }}>Data:</strong> AEMO dispatch & settlement via OpenElectricity API.
          CF: full operational history ({vs.data_first_year}–{vs.data_last_year}).
          Capture price & value factor from Aug 2024+ (AEMO MMSDM).
          Fleet correlation: {allStateProjects.length} {project.state} wind farms · {divPoints.length} months overlap.
          Revenue = gross energy revenue, pre-MLF. Excludes LGC, FCAS, and PPA adjustments.
          Generated by AURES Intelligence.
        </p>
      </div>
    </div>
  )
}

// ============================================================
// Shared helpers
// ============================================================

function MetricCard({ label, value, sub, highlight }: {
  label: string; value: string; sub?: string; highlight?: string
}) {
  const color = highlight === 'green' ? '#22c55e'
    : highlight === 'yellow' ? '#f59e0b'
    : highlight === 'red' ? '#ef4444'
    : 'var(--color-text)'
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl px-3 py-2">
      <p className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold mt-0.5" style={{ color }}>{value}</p>
      {sub && <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{sub}</p>}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-xs font-semibold text-[var(--color-text)] mb-2 flex items-center gap-1">{children}</h4>
  )
}

function StatRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[10px] text-[var(--color-text-muted)]">{label}</span>
      <span className="text-[10px] font-bold" style={{ color }}>{value}</span>
    </div>
  )
}

function ViewBtn({ active, onClick, label, color, small }: {
  active: boolean; onClick: () => void; label: string; color?: string; small?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
        active
          ? 'bg-[var(--color-primary)] text-white'
          : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border border-[var(--color-border)] hover:text-[var(--color-text)]'
      } ${small ? 'px-1.5' : ''}`}
      style={active && color ? { backgroundColor: color } : {}}
    >
      {label}
    </button>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] border-dashed rounded-xl p-8 text-center">
      <p className="text-sm text-[var(--color-text-muted)]">{text}</p>
    </div>
  )
}

function signalFromRank(percentile?: number): string {
  if (percentile == null) return 'neutral'
  if (percentile >= 70) return 'good'
  if (percentile >= 40) return 'ok'
  return 'warn'
}

function rankHighlight(percentile?: number): string | undefined {
  if (percentile == null) return undefined
  if (percentile >= 70) return 'green'
  if (percentile >= 40) return 'yellow'
  return 'red'
}
