import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchLifecycleQuartile } from '../../lib/dataService'
import DataProvenance from '../../components/common/DataProvenance'
import DataTable, { type Column } from '../../components/common/DataTable'
import DrillPanel from '../../components/common/DrillPanel'
import { TECHNOLOGY_CONFIG, type Technology } from '../../lib/types'

// ============================================================
// Lifecycle Quartile Matrix — T1.C
// State-of-the-nation view: every project in the pipeline grouped by
// (technology × state × stage) with per-cell quartile scoring.
// ============================================================

// Quartile palette (fixed across the page)
const QUARTILE_COLOURS: Record<1 | 2 | 3 | 4, string> = {
  1: '#10b981', // emerald
  2: '#3b82f6', // blue
  3: '#f59e0b', // amber
  4: '#ef4444', // red
}

const STAGES = ['all', 'operating', 'construction', 'development'] as const
type StageFilter = (typeof STAGES)[number]

// Tech display order in the matrix (top → bottom)
const TECH_ORDER: Technology[] = [
  'wind',
  'solar',
  'bess',
  'hybrid',
  'pumped_hydro',
  'offshore_wind',
]

// State column order
const STATE_ORDER: string[] = ['NSW', 'VIC', 'QLD', 'SA', 'TAS', 'WA']

// ============================================================
// Data shape (matches lifecycle-quartile.json)
// ============================================================

interface Cell {
  technology: string
  state: string
  stage: string
  project_count: number
  total_mw: number
  avg_score: number | null
  quartile_counts: { '1': number; '2': number; '3': number; '4': number }
  q1_pct: number | null
  project_ids: string[]
}

interface ProjectDetail {
  id: string
  name: string
  technology: string
  state: string
  status: string
  stage_group: 'operating' | 'construction' | 'development'
  capacity_mw: number
  developer: string | null
  score: number | null
  quartile: 1 | 2 | 3 | 4
  score_basis: string
  // Operating
  league_quartile?: number
  capacity_factor_pct?: number | null
  revenue_per_mw?: number | null
  // Construction
  drift_months?: number | null
  construction_started?: string | null
  developer_grade?: string | null
  // Development
  development_stage?: string | null
  has_cod?: boolean
  has_rez?: boolean
  has_scheme?: boolean
  has_eis?: boolean
}

interface LifecycleQuartileData {
  cells: Cell[]
  by_tech_stage: { technology: string; stage: string; count: number; mw: number; q1: number }[]
  by_state_stage: { state: string; stage: string; count: number; mw: number; q1: number }[]
  project_details: Record<string, ProjectDetail>
  summary: {
    total_cells: number
    operating_count: number
    construction_count: number
    development_count: number
    matrix_techs: string[]
    matrix_states: string[]
  }
}

// ============================================================
// Helpers
// ============================================================

function fmtMW(mw: number): string {
  if (mw >= 1000) return `${(mw / 1000).toFixed(1)} GW`
  return `${Math.round(mw).toLocaleString()} MW`
}

function techLabel(tech: string): string {
  const t = tech as Technology
  return TECHNOLOGY_CONFIG[t]?.label ?? tech
}

function techIcon(tech: string): string {
  const t = tech as Technology
  return TECHNOLOGY_CONFIG[t]?.icon ?? '•'
}

function techColour(tech: string): string {
  const t = tech as Technology
  return TECHNOLOGY_CONFIG[t]?.color ?? '#64748b'
}

function truncate(s: string | null | undefined, n: number): string {
  if (!s) return '—'
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

function devStageLabel(stage: string | null | undefined): string {
  if (!stage) return '—'
  return stage.replace(/_/g, ' ')
}

// ============================================================
// Matrix pieces
// ============================================================

function QuartileStrip({
  counts,
  height = 34,
}: {
  counts: Cell['quartile_counts']
  height?: number
}) {
  const total =
    (counts['1'] ?? 0) + (counts['2'] ?? 0) + (counts['3'] ?? 0) + (counts['4'] ?? 0)
  if (total === 0) {
    return <div className="w-full rounded-sm bg-white/5" style={{ height }} />
  }
  const segments: { q: 1 | 2 | 3 | 4; count: number }[] = [
    { q: 1, count: counts['1'] ?? 0 },
    { q: 2, count: counts['2'] ?? 0 },
    { q: 3, count: counts['3'] ?? 0 },
    { q: 4, count: counts['4'] ?? 0 },
  ]
  return (
    <div className="w-full flex overflow-hidden rounded-sm" style={{ height }}>
      {segments.map((s) =>
        s.count > 0 ? (
          <div
            key={s.q}
            style={{
              width: `${(s.count / total) * 100}%`,
              backgroundColor: QUARTILE_COLOURS[s.q],
            }}
            title={`Q${s.q}: ${s.count}`}
          />
        ) : null,
      )}
    </div>
  )
}

function MatrixCell({
  cell,
  onClick,
}: {
  cell: Cell | null
  onClick?: () => void
}) {
  if (!cell || cell.project_count === 0) {
    return (
      <div className="rounded-lg border border-dashed border-white/5 bg-white/[0.01] h-[108px] flex items-center justify-center text-[var(--color-text-muted)]/40 text-lg select-none">
        —
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-2.5 text-left hover:border-[var(--color-primary)]/60 hover:bg-[var(--color-bg-elevated)] transition-colors cursor-pointer h-[108px] flex flex-col justify-between w-full"
      aria-label={`${techLabel(cell.technology)} ${cell.state} ${cell.stage} — ${cell.project_count} projects`}
    >
      <div>
        <div className="text-xl font-bold text-[var(--color-text)] leading-none tabular-nums">
          {cell.project_count}
        </div>
        <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5 tabular-nums">
          {fmtMW(cell.total_mw)}
        </div>
      </div>
      <QuartileStrip counts={cell.quartile_counts} />
      <div className="flex items-center justify-between text-[9px] text-[var(--color-text-muted)] leading-none">
        <span className="tabular-nums">
          {cell.q1_pct !== null ? `Q1: ${Math.round(cell.q1_pct)}%` : '—'}
        </span>
        {cell.avg_score !== null && (
          <span className="tabular-nums">
            avg {cell.avg_score.toFixed(0)}
          </span>
        )}
      </div>
    </button>
  )
}

// ============================================================
// Page
// ============================================================

export default function LifecycleQuartile() {
  const [data, setData] = useState<LifecycleQuartileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()
  const [drillCell, setDrillCell] = useState<Cell | null>(null)

  const stageParam = (searchParams.get('stage') as StageFilter | null) ?? 'operating'
  const stage: StageFilter = STAGES.includes(stageParam) ? stageParam : 'operating'

  useEffect(() => {
    let cancelled = false
    fetchLifecycleQuartile().then((d) => {
      if (cancelled) return
      setData(d as LifecycleQuartileData | null)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  function setStage(next: StageFilter) {
    const p = new URLSearchParams(searchParams)
    if (next === 'operating') p.delete('stage')
    else p.set('stage', next)
    setSearchParams(p, { replace: true })
    setDrillCell(null)
  }

  // Cells filtered by selected stage (or all stages → treat as a merged matrix
  // using combined counts per tech×state, collapsed across stages)
  const activeCells: Cell[] = useMemo(() => {
    if (!data) return []
    if (stage === 'all') {
      // Combine same tech×state across stages into a single synthetic cell
      const combined = new Map<string, Cell>()
      for (const c of data.cells) {
        const key = `${c.technology}|${c.state}`
        const existing = combined.get(key)
        if (!existing) {
          combined.set(key, {
            ...c,
            stage: 'all',
            quartile_counts: { ...c.quartile_counts },
            project_ids: [...c.project_ids],
          })
        } else {
          existing.project_count += c.project_count
          existing.total_mw += c.total_mw
          existing.quartile_counts['1'] += c.quartile_counts['1'] ?? 0
          existing.quartile_counts['2'] += c.quartile_counts['2'] ?? 0
          existing.quartile_counts['3'] += c.quartile_counts['3'] ?? 0
          existing.quartile_counts['4'] += c.quartile_counts['4'] ?? 0
          existing.project_ids = existing.project_ids.concat(c.project_ids)
        }
      }
      // Recompute q1_pct + avg_score (weighted avg) on combined
      for (const c of combined.values()) {
        const total =
          c.quartile_counts['1'] +
          c.quartile_counts['2'] +
          c.quartile_counts['3'] +
          c.quartile_counts['4']
        c.q1_pct = total > 0 ? (c.quartile_counts['1'] / total) * 100 : null
        // Weighted avg score from project_details
        const scores = c.project_ids
          .map((pid) => data.project_details[pid]?.score)
          .filter((s): s is number => typeof s === 'number')
        c.avg_score = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null
      }
      return Array.from(combined.values())
    }
    return data.cells.filter((c) => c.stage === stage)
  }, [data, stage])

  // Matrix lookup: techs that appear (have ≥1 project), ordered
  const activeTechs = useMemo(() => {
    const set = new Set(activeCells.filter((c) => c.project_count > 0).map((c) => c.technology))
    return TECH_ORDER.filter((t) => set.has(t))
  }, [activeCells])

  const cellLookup = useMemo(() => {
    const m = new Map<string, Cell>()
    for (const c of activeCells) m.set(`${c.technology}|${c.state}`, c)
    return m
  }, [activeCells])

  // Column totals (by state, for the footer row of the matrix)
  const colTotals = useMemo(() => {
    const t: Record<string, { count: number; mw: number }> = {}
    for (const s of STATE_ORDER) t[s] = { count: 0, mw: 0 }
    for (const c of activeCells) {
      if (!t[c.state]) t[c.state] = { count: 0, mw: 0 }
      t[c.state].count += c.project_count
      t[c.state].mw += c.total_mw
    }
    return t
  }, [activeCells])

  // Row totals (by tech)
  const rowTotals = useMemo(() => {
    const t: Record<string, { count: number; mw: number }> = {}
    for (const c of activeCells) {
      if (!t[c.technology]) t[c.technology] = { count: 0, mw: 0 }
      t[c.technology].count += c.project_count
      t[c.technology].mw += c.total_mw
    }
    return t
  }, [activeCells])

  // Summary stats (driven by active cells)
  const summary = useMemo(() => {
    const totalProjects = activeCells.reduce((s, c) => s + c.project_count, 0)
    const totalMW = activeCells.reduce((s, c) => s + c.total_mw, 0)
    const q1Count = activeCells.reduce((s, c) => s + (c.quartile_counts['1'] ?? 0), 0)
    const q1Pct = totalProjects > 0 ? (q1Count / totalProjects) * 100 : 0
    const filledCells = activeCells.filter((c) => c.project_count > 0).length
    // Average score (weighted by project count)
    let scoreSum = 0
    let scoreN = 0
    if (data) {
      for (const c of activeCells) {
        for (const pid of c.project_ids) {
          const s = data.project_details[pid]?.score
          if (typeof s === 'number') {
            scoreSum += s
            scoreN += 1
          }
        }
      }
    }
    const avgScore = scoreN > 0 ? scoreSum / scoreN : null
    return { totalProjects, totalMW, q1Count, q1Pct, filledCells, avgScore }
  }, [activeCells, data])

  // Top-5 Q1-heavy cells (require ≥5 projects)
  const topQ1 = useMemo(() => {
    return activeCells
      .filter((c) => c.project_count >= 5 && c.q1_pct !== null)
      .sort((a, b) => (b.q1_pct ?? 0) - (a.q1_pct ?? 0))
      .slice(0, 5)
  }, [activeCells])

  // Score-basis footer: one line per stage, pulled from any project detail
  const scoreBases = useMemo(() => {
    if (!data) return {} as Record<string, string>
    const out: Record<string, string> = {}
    for (const det of Object.values(data.project_details)) {
      if (!out[det.stage_group]) out[det.stage_group] = det.score_basis
      if (Object.keys(out).length === 3) break
    }
    return out
  }, [data])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }
  if (!data) {
    return (
      <div className="p-6 text-center text-[var(--color-text-muted)]">
        No lifecycle quartile data available.
      </div>
    )
  }

  // ---------- Render ----------
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">
          Lifecycle Quartile Matrix
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Every project in the NEM pipeline, grouped by technology · state · stage with a
          stage-appropriate quartile score. Click any cell to see the projects inside it.
        </p>
        <div className="mt-3">
          <DataProvenance page="lifecycle-quartile" />
        </div>
      </div>

      {/* Explainer */}
      <details className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
        <summary className="text-sm font-medium text-[var(--color-text)] cursor-pointer">
          How does quartile scoring work?
        </summary>
        <div className="mt-3 text-xs text-[var(--color-text-muted)] space-y-2 leading-relaxed">
          <p>
            Q1 = top performer/most ready; Q4 = bottom. Each stage uses a different score because
            what "good" means changes with maturity.
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <strong className="text-[var(--color-text)]">Operating</strong> — league-table
              composite (capacity factor × revenue × curtailment performance).
            </li>
            <li>
              <strong className="text-[var(--color-text)]">Construction</strong> — delivery risk:
              inverse of schedule drift, adjusted by developer execution grade.
            </li>
            <li>
              <strong className="text-[var(--color-text)]">Development</strong> — readiness:
              planning stage, COD present, REZ access, scheme win, EIS, developer grade.
            </li>
          </ul>
        </div>
      </details>

      {/* Stage selector */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Stage filter">
        {STAGES.map((s) => {
          const active = stage === s
          const label = s === 'all' ? 'All stages' : s.charAt(0).toUpperCase() + s.slice(1)
          return (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setStage(s)}
              className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                active
                  ? 'bg-[var(--color-primary)]/20 border-[var(--color-primary)]/60 text-[var(--color-primary)] font-medium'
                  : 'bg-[var(--color-bg-card)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text-muted)]/60'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Projects" value={summary.totalProjects.toLocaleString()} />
        <StatCard label="Total MW" value={fmtMW(summary.totalMW)} />
        <StatCard
          label="Q1 Share"
          value={`${Math.round(summary.q1Pct)}%`}
          sub={`${summary.q1Count.toLocaleString()} projects`}
        />
        <StatCard
          label="Avg Score"
          value={summary.avgScore !== null ? summary.avgScore.toFixed(1) : '—'}
          sub="0-100+ scale"
        />
        <StatCard
          label="Cells with data"
          value={`${summary.filledCells}`}
          sub={stage === 'all' ? 'of 36 possible' : 'of 36 possible'}
        />
      </div>

      {/* Matrix — desktop */}
      <div className="hidden md:block bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-4">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-base font-semibold text-[var(--color-text)]">
            Matrix — {stage === 'all' ? 'All stages (combined)' : stage}
          </h2>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            Rows = technology · Columns = state · Click a cell to drill
          </p>
        </div>

        {activeTechs.length === 0 ? (
          <div className="py-10 text-center text-sm text-[var(--color-text-muted)]">
            No projects at this stage.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div
              className="grid gap-2 min-w-[760px]"
              style={{ gridTemplateColumns: `180px repeat(${STATE_ORDER.length}, minmax(110px, 1fr)) 90px` }}
            >
              {/* Header row */}
              <div />
              {STATE_ORDER.map((st) => (
                <div
                  key={st}
                  className="text-center text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] pb-1"
                >
                  {st}
                </div>
              ))}
              <div className="text-center text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] pb-1">
                Total
              </div>

              {/* Tech rows */}
              {activeTechs.map((tech) => {
                const row = rowTotals[tech] ?? { count: 0, mw: 0 }
                return (
                  <div key={tech} className="contents">
                    <div className="flex items-center gap-2 pr-2 min-w-0">
                      <span
                        className="text-lg shrink-0"
                        style={{ filter: 'grayscale(0)' }}
                        aria-hidden
                      >
                        {techIcon(tech)}
                      </span>
                      <div className="min-w-0">
                        <div
                          className="text-sm font-medium truncate"
                          style={{ color: techColour(tech) }}
                        >
                          {techLabel(tech)}
                        </div>
                        <div className="text-[10px] text-[var(--color-text-muted)] tabular-nums">
                          {row.count} · {fmtMW(row.mw)}
                        </div>
                      </div>
                    </div>
                    {STATE_ORDER.map((st) => {
                      const cell = cellLookup.get(`${tech}|${st}`) ?? null
                      return (
                        <MatrixCell
                          key={`${tech}|${st}`}
                          cell={cell}
                          onClick={cell ? () => setDrillCell(cell) : undefined}
                        />
                      )
                    })}
                    <div className="flex flex-col justify-center items-center text-xs text-[var(--color-text)] border border-dashed border-[var(--color-border)] rounded-lg px-2 py-2 bg-[var(--color-bg-elevated)]/40">
                      <span className="font-bold tabular-nums">{row.count}</span>
                      <span className="text-[10px] text-[var(--color-text-muted)] tabular-nums">
                        {fmtMW(row.mw)}
                      </span>
                    </div>
                  </div>
                )
              })}

              {/* Column totals row */}
              <div className="text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] pt-2">
                Total
              </div>
              {STATE_ORDER.map((st) => {
                const t = colTotals[st] ?? { count: 0, mw: 0 }
                return (
                  <div
                    key={st}
                    className="flex flex-col items-center justify-center text-xs text-[var(--color-text)] border-t border-[var(--color-border)] pt-2"
                  >
                    <span className="font-bold tabular-nums">{t.count}</span>
                    <span className="text-[10px] text-[var(--color-text-muted)] tabular-nums">
                      {fmtMW(t.mw)}
                    </span>
                  </div>
                )
              })}
              <div className="flex flex-col items-center justify-center text-xs font-bold text-[var(--color-text)] border-t border-[var(--color-border)] pt-2 tabular-nums">
                {summary.totalProjects}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Matrix — mobile (card list sorted by count desc) */}
      <div className="md:hidden bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-3 space-y-2">
        <h2 className="text-base font-semibold text-[var(--color-text)] mb-2">
          {stage === 'all' ? 'All stages (combined)' : stage.charAt(0).toUpperCase() + stage.slice(1)}
        </h2>
        {activeCells
          .filter((c) => c.project_count > 0)
          .sort((a, b) => b.project_count - a.project_count)
          .map((cell) => (
            <button
              key={`${cell.technology}|${cell.state}`}
              type="button"
              onClick={() => setDrillCell(cell)}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)]/40 hover:bg-[var(--color-bg-elevated)] active:scale-[0.99] transition-all text-left"
            >
              <span className="text-2xl">{techIcon(cell.technology)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className="text-sm font-semibold truncate"
                    style={{ color: techColour(cell.technology) }}
                  >
                    {techLabel(cell.technology)} · {cell.state}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)] tabular-nums shrink-0">
                    {fmtMW(cell.total_mw)}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
                  {cell.project_count} projects · Q1 {cell.q1_pct !== null ? Math.round(cell.q1_pct) : 0}%
                  {cell.avg_score !== null && <> · avg {cell.avg_score.toFixed(0)}</>}
                </div>
                <div className="mt-1.5">
                  <QuartileStrip counts={cell.quartile_counts} height={10} />
                </div>
              </div>
            </button>
          ))}
        {activeCells.filter((c) => c.project_count > 0).length === 0 && (
          <div className="py-6 text-center text-sm text-[var(--color-text-muted)]">
            No projects at this stage.
          </div>
        )}
      </div>

      {/* Top-5 Q1-heavy cells */}
      {topQ1.length > 0 && (
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-4">
          <h2 className="text-base font-semibold text-[var(--color-text)] mb-1">
            Most Q1-heavy cells
          </h2>
          <p className="text-[11px] text-[var(--color-text-muted)] mb-3">
            Highest Q1 share across cells with 5+ projects. Click to drill.
          </p>
          <ul className="space-y-1">
            {topQ1.map((c) => (
              <li key={`${c.technology}|${c.state}|${c.stage}`}>
                <button
                  type="button"
                  onClick={() => setDrillCell(c)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-[var(--color-bg-elevated)]/60 transition-colors text-left"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0">{techIcon(c.technology)}</span>
                    <span
                      className="text-sm font-medium"
                      style={{ color: techColour(c.technology) }}
                    >
                      {techLabel(c.technology)}
                    </span>
                    <span className="text-sm text-[var(--color-text)]">{c.state}</span>
                    <span className="text-xs text-[var(--color-text-muted)] capitalize">
                      {c.stage}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      · {c.project_count} projects
                    </span>
                  </span>
                  <span
                    className="text-sm font-semibold tabular-nums shrink-0"
                    style={{ color: QUARTILE_COLOURS[1] }}
                  >
                    {Math.round(c.q1_pct ?? 0)}% Q1
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Legend footer */}
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-4 text-xs text-[var(--color-text-muted)] space-y-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-2">
            Quartile palette
          </div>
          <div className="flex flex-wrap gap-4">
            {([1, 2, 3, 4] as const).map((q) => (
              <div key={q} className="flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: QUARTILE_COLOURS[q] }}
                />
                <span>
                  Q{q} —{' '}
                  {q === 1
                    ? 'top'
                    : q === 2
                      ? 'upper mid'
                      : q === 3
                        ? 'lower mid'
                        : 'bottom'}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-2">
            Score formulas
          </div>
          <ul className="space-y-1 leading-relaxed">
            {(['operating', 'construction', 'development'] as const).map((s) =>
              scoreBases[s] ? (
                <li key={s}>
                  <strong className="text-[var(--color-text)] capitalize">{s}:</strong>{' '}
                  {scoreBases[s]}
                </li>
              ) : null,
            )}
          </ul>
        </div>
      </div>

      {/* Drill panel */}
      <DrillPanel
        open={drillCell !== null}
        title={
          drillCell
            ? `${techLabel(drillCell.technology)} · ${drillCell.state} · ${drillCell.stage}`
            : ''
        }
        subtitle={
          drillCell
            ? `${drillCell.project_count} projects · ${fmtMW(drillCell.total_mw)}${
                drillCell.avg_score !== null ? ` · avg score ${drillCell.avg_score.toFixed(1)}` : ''
              }`
            : undefined
        }
        onClose={() => setDrillCell(null)}
        widthClass="lg:w-[640px]"
      >
        {drillCell && data && (
          <DrillContent cell={drillCell} projectDetails={data.project_details} />
        )}
      </DrillPanel>
    </div>
  )
}

// ============================================================
// Summary stat card
// ============================================================

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="bg-[var(--color-bg-card)] rounded-xl p-3 lg:p-4 border border-[var(--color-border)]">
      <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-medium">
        {label}
      </div>
      <div className="text-xl lg:text-2xl font-bold text-[var(--color-text)] mt-1 tabular-nums">
        {value}
      </div>
      {sub && <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{sub}</div>}
    </div>
  )
}

// ============================================================
// Drill content — projects in cell
// ============================================================

interface DrillRow {
  rank: number
  id: string
  name: string
  developer: string | null
  capacity_mw: number
  score: number | null
  quartile: 1 | 2 | 3 | 4
  stage_group: 'operating' | 'construction' | 'development'
  // Stage-specific
  capacity_factor_pct?: number | null
  revenue_per_mw?: number | null
  drift_months?: number | null
  developer_grade?: string | null
  has_scheme?: boolean
  has_eis?: boolean
  has_rez?: boolean
  development_stage?: string | null
}

function DrillContent({
  cell,
  projectDetails,
}: {
  cell: Cell
  projectDetails: Record<string, ProjectDetail>
}) {
  const rows: DrillRow[] = useMemo(() => {
    return cell.project_ids
      .map((pid, idx) => {
        const d = projectDetails[pid]
        if (!d) return null
        return {
          rank: idx + 1,
          id: d.id,
          name: d.name,
          developer: d.developer,
          capacity_mw: d.capacity_mw,
          score: d.score,
          quartile: d.quartile,
          stage_group: d.stage_group,
          capacity_factor_pct: d.capacity_factor_pct ?? null,
          revenue_per_mw: d.revenue_per_mw ?? null,
          drift_months: d.drift_months ?? null,
          developer_grade: d.developer_grade ?? null,
          has_scheme: d.has_scheme,
          has_eis: d.has_eis,
          has_rez: d.has_rez,
          development_stage: d.development_stage ?? null,
        } as DrillRow
      })
      .filter((r): r is DrillRow => r !== null)
  }, [cell, projectDetails])

  // Determine stage grouping — if cell.stage is 'all', pick the dominant one per row
  const mixedStage = cell.stage === 'all'

  // Base columns
  const baseColumns: Column<DrillRow>[] = [
    {
      key: 'name',
      label: 'Project',
      sortable: true,
      render: (_v, row) => (
        <Link
          to={`/projects/${row.id}`}
          className="text-[var(--color-primary)] hover:underline font-medium"
        >
          {row.name}
        </Link>
      ),
    },
    {
      key: 'developer',
      label: 'Developer',
      sortable: true,
      hideOnMobile: true,
      render: (v) => (
        <span className="text-[var(--color-text-muted)]">
          {truncate(v as string | null, 25)}
        </span>
      ),
    },
    {
      key: 'capacity_mw',
      label: 'MW',
      format: 'number0',
      aggregator: 'sum',
      sortable: true,
    },
    {
      key: 'score',
      label: 'Score',
      format: 'number1',
      sortable: true,
    },
    {
      key: 'quartile',
      label: 'Q',
      sortable: true,
      align: 'center',
      render: (v) => {
        const q = v as 1 | 2 | 3 | 4
        const c = QUARTILE_COLOURS[q]
        return (
          <span
            className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ backgroundColor: `${c}33`, color: c }}
          >
            Q{q}
          </span>
        )
      },
    },
  ]

  // Stage-specific columns
  const operatingColumns: Column<DrillRow>[] = [
    {
      key: 'capacity_factor_pct',
      label: 'CF%',
      format: 'percent1',
      sortable: true,
    },
    {
      key: 'revenue_per_mw',
      label: 'Rev/MW',
      sortable: true,
      render: (v) => {
        if (typeof v !== 'number' || !Number.isFinite(v)) return '—'
        return `$${(v / 1000).toFixed(0)}K`
      },
    },
  ]

  const constructionColumns: Column<DrillRow>[] = [
    {
      key: 'drift_months',
      label: 'Drift',
      sortable: true,
      render: (v) => {
        if (typeof v !== 'number') return '—'
        const colour = v > 0 ? '#ef4444' : v < 0 ? '#10b981' : 'var(--color-text-muted)'
        return (
          <span style={{ color: colour }} className="tabular-nums font-medium">
            {v > 0 ? '+' : ''}
            {v.toFixed(0)}m
          </span>
        )
      },
    },
    {
      key: 'developer_grade',
      label: 'Dev',
      sortable: true,
      align: 'center',
      render: (v) => (v ? String(v) : '—'),
    },
  ]

  const developmentColumns: Column<DrillRow>[] = [
    {
      key: 'development_stage',
      label: 'Stage',
      sortable: true,
      hideOnMobile: true,
      render: (v) => (
        <span className="text-xs text-[var(--color-text-muted)]">
          {devStageLabel(v as string | null)}
        </span>
      ),
    },
    {
      key: 'has_scheme',
      label: 'Sch',
      align: 'center',
      render: (v) => (v ? <span className="text-emerald-400">✓</span> : <span className="text-[var(--color-text-muted)]/40">—</span>),
    },
    {
      key: 'has_eis',
      label: 'EIS',
      align: 'center',
      render: (v) => (v ? <span className="text-emerald-400">✓</span> : <span className="text-[var(--color-text-muted)]/40">—</span>),
    },
    {
      key: 'has_rez',
      label: 'REZ',
      align: 'center',
      render: (v) => (v ? <span className="text-emerald-400">✓</span> : <span className="text-[var(--color-text-muted)]/40">—</span>),
    },
    {
      key: 'developer_grade',
      label: 'Dev',
      sortable: true,
      align: 'center',
      render: (v) => (v ? String(v) : '—'),
    },
  ]

  // Pick extra columns by cell.stage (when single-stage); mixed-stage shows base only
  let columns = baseColumns
  if (!mixedStage) {
    if (cell.stage === 'operating') columns = [...baseColumns, ...operatingColumns]
    else if (cell.stage === 'construction') columns = [...baseColumns, ...constructionColumns]
    else if (cell.stage === 'development') columns = [...baseColumns, ...developmentColumns]
  } else {
    // For all-stages, add a Stage column right after Quartile
    columns = [
      ...baseColumns,
      {
        key: 'stage_group',
        label: 'Stage',
        sortable: true,
        align: 'center',
        render: (v) => (
          <span className="text-[10px] capitalize text-[var(--color-text-muted)]">
            {String(v)}
          </span>
        ),
      },
    ]
  }

  const csvFilename = `${cell.stage}-${cell.technology}-${cell.state}`

  return (
    <div>
      <DataTable<DrillRow>
        rows={rows}
        columns={columns}
        showRowNumbers
        showTotals
        defaultSort={{ key: 'quartile', dir: 'asc' }}
        csvFilename={csvFilename}
        emptyMessage="No projects in this cell"
      />
    </div>
  )
}
