import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie,
} from 'recharts'
import { fetchDeveloperScores, fetchDeveloperIndex, fetchSchemeTracker } from '../../lib/dataService'
import ChartWrapper from '../../components/common/ChartWrapper'
import type { DeveloperScoreData, ScoredDeveloper, DeveloperIndex, SchemeTrackerData } from '../../lib/types'
import ScrollableTable from '../../components/common/ScrollableTable'
import DataProvenance from '../../components/common/DataProvenance'

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

const SortUpIcon = () => (
  <svg className="w-3 h-3 inline" viewBox="0 0 10 10" fill="currentColor">
    <path d="M5 2L9 8H1L5 2z" />
  </svg>
)

const SortDownIcon = () => (
  <svg className="w-3 h-3 inline" viewBox="0 0 10 10" fill="currentColor">
    <path d="M5 8L1 2H9L5 8z" />
  </svg>
)

// ============================================================
// Grade colours
// ============================================================

const GRADE_COLOURS: Record<string, string> = {
  A: '#10b981',
  B: '#3b82f6',
  C: '#f59e0b',
  D: '#f97316',
  F: '#ef4444',
}

const GRADE_ORDER = ['A', 'B', 'C', 'D', 'F'] as const

const getGradeColour = (grade: string) => GRADE_COLOURS[grade] || '#636e72'

const TECH_OPTIONS = ['wind', 'solar', 'bess'] as const
const MIN_PROJECT_OPTIONS = [1, 2, 3, 5, 10] as const

const STATUS_COLOURS: Record<string, string> = {
  operating: '#10b981',
  construction: '#f59e0b',
  development: '#3b82f6',
}

function devSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

// ============================================================
// View type
// ============================================================

type ViewMode = 'charts' | 'table'
type SortField = keyof ScoredDeveloper
type SortDir = 'asc' | 'desc'

export default function DeveloperScores() {
  const [data, setData] = useState<DeveloperScoreData | null>(null)
  const [devIndex, setDevIndex] = useState<DeveloperIndex | null>(null)
  const [schemeData, setSchemeData] = useState<SchemeTrackerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('charts')
  const navigate = useNavigate()

  // Filters
  const [selectedGrades, setSelectedGrades] = useState<string[]>([])
  const [selectedTechs, setSelectedTechs] = useState<string[]>([])
  const [minProjects, setMinProjects] = useState(2)

  // Table sort
  const [sortField, setSortField] = useState<SortField>('execution_score')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    Promise.all([
      fetchDeveloperScores(),
      fetchDeveloperIndex(),
      fetchSchemeTracker(),
    ]).then(([scores, idx, schemes]) => {
      setData(scores)
      setDevIndex(idx)
      setSchemeData(schemes)
      setLoading(false)
    })
  }, [])

  function toggleGrade(grade: string) {
    setSelectedGrades(prev =>
      prev.includes(grade) ? prev.filter(g => g !== grade) : [...prev, grade]
    )
  }

  function toggleTech(tech: string) {
    setSelectedTechs(prev =>
      prev.includes(tech) ? prev.filter(t => t !== tech) : [...prev, tech]
    )
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  // Filtered developers
  const filtered = useMemo(() => {
    if (!data) return []
    let devs = data.developers
    if (selectedGrades.length > 0) {
      devs = devs.filter(d => selectedGrades.includes(d.grade))
    }
    if (selectedTechs.length > 0) {
      devs = devs.filter(d =>
        selectedTechs.some(t => d.technologies.some(dt => dt.toLowerCase().includes(t)))
      )
    }
    devs = devs.filter(d => d.project_count >= minProjects)
    return devs
  }, [data, selectedGrades, selectedTechs, minProjects])

  // Sorted for table
  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal
      }
      const aStr = String(aVal ?? '')
      const bStr = String(bVal ?? '')
      return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
    })
    return arr
  }, [filtered, sortField, sortDir])

  // Grade distribution pie data
  const pieData = useMemo(() => {
    if (!data) return []
    return GRADE_ORDER.map(grade => ({
      name: grade,
      value: data.grade_distribution[grade] || 0,
      fill: GRADE_COLOURS[grade],
    })).filter(d => d.value > 0)
  }, [data])

  // Top 30 for bar chart
  const barData = useMemo(() => {
    return [...filtered]
      .sort((a, b) => b.execution_score - a.execution_score)
      .slice(0, 30)
      .reverse() // reverse so highest is at top in horizontal layout
  }, [filtered])

  // Scatter data
  const scatterData = useMemo(() => {
    return filtered.map(d => ({
      ...d,
      x: d.total_mw,
      y: d.execution_score,
      size: Math.max(Math.sqrt(d.project_count) * 5, 6),
      colour: getGradeColour(d.grade),
    }))
  }, [filtered])

  // Top 30 by project count (stacked: operating / construction / development)
  const projectCountBarData = useMemo(() => {
    if (!devIndex) return []
    const profileMap = new Map(devIndex.developers.map(p => [p.slug, p]))
    return [...filtered]
      .map(d => {
        const slug = devSlug(d.developer)
        const profile = profileMap.get(slug)
        const operating = profile?.by_status?.operating ?? d.operating ?? 0
        const construction = profile?.by_status?.construction ?? 0
        const development = profile?.by_status?.development ?? 0
        const commissioning = profile?.by_status?.commissioning ?? 0
        return {
          developer: d.developer,
          slug,
          operating: operating + commissioning,
          construction,
          development,
          total: operating + commissioning + construction + development,
        }
      })
      .filter(d => d.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 30)
      .reverse()
  }, [filtered, devIndex])

  // Top 30 by LTESA/CIS scheme wins
  const schemeWinsBarData = useMemo(() => {
    if (!schemeData) return []
    const devMap = new Map<string, { developer: string; ltesa: number; cis: number }>()
    for (const round of schemeData.rounds) {
      const scheme = round.scheme.toUpperCase()
      for (const p of round.projects) {
        if (!p.developer) continue
        const key = p.developer.toLowerCase()
        if (!devMap.has(key)) devMap.set(key, { developer: p.developer, ltesa: 0, cis: 0 })
        const entry = devMap.get(key)!
        if (scheme.includes('LTESA')) entry.ltesa++
        else if (scheme.includes('CIS')) entry.cis++
      }
    }
    return [...devMap.values()]
      .map(d => ({ ...d, slug: devSlug(d.developer), wins: d.ltesa + d.cis }))
      .filter(d => d.wins > 0)
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 30)
      .reverse()
  }, [schemeData])

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
        No developer score data available.
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Developer Execution Scores</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Execution tracking for {data.total_developers} developers based on project delivery,
          schedule drift, and completion rates.
        </p>
        <div className="mt-3">
          <DataProvenance page="developer-scores" />
        </div>
      </div>

      {/* Rationale */}
      <details className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 mb-6">
        <summary className="text-sm font-medium text-[var(--color-text)] cursor-pointer">How are execution scores calculated?</summary>
        <div className="mt-3 text-xs text-[var(--color-text-muted)] space-y-2">
          <p>Each developer receives an <strong className="text-[var(--color-text)]">execution score from 0 to 100</strong> based on four weighted factors:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong className="text-[var(--color-text)]">On-time delivery rate (40%)</strong> — percentage of projects that reached COD within 6 months of the original target date</li>
            <li><strong className="text-[var(--color-text)]">Average COD drift (30%)</strong> — mean schedule slippage in months across all projects; lower is better</li>
            <li><strong className="text-[var(--color-text)]">Project completion rate (20%)</strong> — share of announced projects that have reached operating status</li>
            <li><strong className="text-[var(--color-text)]">Portfolio diversity (10%)</strong> — breadth of technologies and states in the developer's portfolio</li>
          </ul>
          <p>Scores map to letter grades: <strong className="text-[var(--color-text)]">A</strong> ({'\u2265'}80), <strong className="text-[var(--color-text)]">B</strong> ({'\u2265'}65), <strong className="text-[var(--color-text)]">C</strong> ({'\u2265'}50), <strong className="text-[var(--color-text)]">D</strong> ({'\u2265'}35), <strong className="text-[var(--color-text)]">F</strong> ({'<'}35). A minimum of 2 projects is required for scoring.</p>
          <p>This helps investors and policymakers identify reliable developers with strong track records versus those with higher delivery risk.</p>
        </div>
      </details>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
          <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider font-medium">Developers</div>
          <div className="text-2xl font-bold text-[var(--color-text)] mt-1">{data.total_developers}</div>
          <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{filtered.length} shown</div>
        </div>
        <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
          <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider font-medium">Avg Drift</div>
          <div className="text-2xl font-bold text-[var(--color-text)] mt-1">
            {data.industry_averages.avg_drift_months.toFixed(1)}
          </div>
          <div className="text-xs text-[var(--color-text-muted)] mt-0.5">months (industry)</div>
        </div>
        <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
          <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider font-medium">On-Time %</div>
          <div className="text-2xl font-bold text-[var(--color-text)] mt-1">
            {data.industry_averages.avg_on_time_pct.toFixed(0)}%
          </div>
          <div className="text-xs text-[var(--color-text-muted)] mt-0.5">industry average</div>
        </div>
        <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
          <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider font-medium">Grade Split</div>
          <div className="flex items-center gap-1.5 mt-2">
            {GRADE_ORDER.map(g => {
              const count = data.grade_distribution[g] || 0
              if (count === 0) return null
              return (
                <span
                  key={g}
                  className="text-xs font-medium px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: `${GRADE_COLOURS[g]}33`, color: GRADE_COLOURS[g] }}
                >
                  {g}:{count}
                </span>
              )
            })}
          </div>
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

        {/* Min projects dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--color-text-muted)]">Min projects:</span>
          <select
            value={minProjects}
            onChange={e => setMinProjects(Number(e.target.value))}
            className="text-sm bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg px-2 py-1.5"
          >
            {MIN_PROJECT_OPTIONS.map(n => (
              <option key={n} value={n}>{n}+</option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter chips: Grades */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] w-14">
          Grade
        </span>
        {GRADE_ORDER.map(grade => {
          const isActive = selectedGrades.includes(grade)
          const colour = GRADE_COLOURS[grade]
          return (
            <button
              key={grade}
              onClick={() => toggleGrade(grade)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                isActive
                  ? 'border-transparent font-medium'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
              }`}
              style={isActive ? { backgroundColor: `${colour}33`, color: colour } : undefined}
            >
              {grade}
            </button>
          )
        })}
        {selectedGrades.length > 0 && (
          <button onClick={() => setSelectedGrades([])} className="text-xs text-[var(--color-primary)] hover:underline ml-1">
            Clear
          </button>
        )}
      </div>

      {/* Filter chips: Technology */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] w-14">
          Tech
        </span>
        {TECH_OPTIONS.map(tech => {
          const isActive = selectedTechs.includes(tech)
          return (
            <button
              key={tech}
              onClick={() => toggleTech(tech)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors capitalize ${
                isActive
                  ? 'border-transparent font-medium bg-blue-500/20 text-blue-400'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
              }`}
            >
              {tech}
            </button>
          )
        })}
        {selectedTechs.length > 0 && (
          <button onClick={() => setSelectedTechs([])} className="text-xs text-[var(--color-primary)] hover:underline ml-1">
            Clear
          </button>
        )}
      </div>

      {view === 'charts' ? (
        <div className="space-y-6">
          {/* Grade distribution + Scatter in 2-col */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Grade distribution donut */}
            <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
              <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Grade Distribution</h2>
              <p className="text-xs text-[var(--color-text-muted)] mb-4">
                {data.total_developers} developers graded A through F
              </p>
              <ChartWrapper title="Grade Distribution" data={pieData} csvColumns={['name', 'value']}>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={`pie-${i}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                      itemStyle={{ color: 'var(--color-text)' }}
                      formatter={(value, _name, props) => {
                        const pct = ((Number(value) / data.total_developers) * 100).toFixed(0)
                        return [`${value} developers (${pct}%)`, `Grade ${props.payload.name}`]
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartWrapper>
              {/* Legend */}
              <div className="flex justify-center gap-4 mt-2">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                    <span className="text-[var(--color-text-muted)]">{d.name}: {d.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Scatter: execution_score vs total_mw */}
            <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
              <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Score vs Portfolio Size</h2>
              <p className="text-xs text-[var(--color-text-muted)] mb-4">
                Bubble size = project count. Colour = grade.
              </p>
              <ChartWrapper title="Score vs Portfolio Size" data={scatterData} csvColumns={['developer', 'grade', 'execution_score', 'total_mw', 'project_count', 'on_time_pct', 'avg_drift_months']}>
                <ResponsiveContainer width="100%" height={280}>
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis
                      dataKey="x" type="number" name="Total MW"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                      label={{ value: 'Total MW', position: 'insideBottom', offset: -10, fill: 'var(--color-text-muted)', fontSize: 12 }}
                    />
                    <YAxis
                      dataKey="y" type="number" name="Execution Score"
                      domain={[0, 100]}
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                      label={{ value: 'Execution Score', angle: -90, position: 'insideLeft', fill: 'var(--color-text-muted)', fontSize: 12 }}
                    />
                    <Tooltip
                      content={({ payload }) => {
                        if (!payload?.length) return null
                        const d = payload[0].payload as ScoredDeveloper & { size: number }
                        return (
                          <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-3 shadow-lg text-sm">
                            <div className="font-semibold text-[var(--color-text)]">{d.developer}</div>
                            <div className="text-[var(--color-text-muted)]">
                              Grade {d.grade} — Score {d.execution_score}
                            </div>
                            <div className="text-[var(--color-text-muted)]">
                              {d.project_count} projects — {d.total_mw.toLocaleString()} MW
                            </div>
                            <div className="text-[var(--color-text-muted)]">
                              On-time: {d.on_time_pct.toFixed(0)}% — Drift: {d.avg_drift_months.toFixed(1)}m
                            </div>
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {d.technologies.map(t => (
                                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg-card)] text-[var(--color-text-muted)]">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        )
                      }}
                    />
                    <Scatter
                      data={scatterData}
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
                            />
                          )
                        }) as any
                      }
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </ChartWrapper>
              {/* Legend */}
              <div className="flex justify-center gap-4 mt-2">
                {GRADE_ORDER.map(g => (
                  <div key={g} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GRADE_COLOURS[g] }} />
                    <span className="text-[var(--color-text-muted)]">{g}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Horizontal bar chart: Top 30 by execution score */}
          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">
              Top {Math.min(30, filtered.length)} Developers by Execution Score
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] mb-4">
              Coloured by grade. Labels show total MW capacity.
            </p>
            <ChartWrapper title="Top Developers by Execution Score" data={barData} csvColumns={['developer', 'grade', 'execution_score', 'project_count', 'total_mw', 'on_time_pct', 'avg_drift_months']}>
              <ResponsiveContainer width="100%" height={Math.max(barData.length * 28, 200)}>
                <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 60, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                  <XAxis
                    type="number" domain={[0, 100]}
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                  />
                  <YAxis
                    type="category" dataKey="developer" width={160}
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                    labelStyle={{ color: 'var(--color-text)' }}
                    itemStyle={{ color: 'var(--color-text)' }}
                    formatter={(value) => [Number(value).toFixed(1), 'Execution Score']}
                    labelFormatter={(label) => {
                      const dev = barData.find(d => d.developer === label)
                      return dev
                        ? `${label} — Grade ${dev.grade} — ${dev.total_mw.toLocaleString()} MW — ${dev.project_count} projects`
                        : label
                    }}
                  />
                  <Bar dataKey="execution_score" radius={[0, 4, 4, 0]}>
                    {barData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={getGradeColour(entry.grade)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartWrapper>
          </div>

          {/* Top 30 by project count — stacked bar */}
          {projectCountBarData.length > 0 && (
            <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
              <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">
                Top {Math.min(30, projectCountBarData.length)} Developers by Number of Projects
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mb-4">
                Stacked by status. Click a bar to view developer profile.
              </p>
              <ChartWrapper title="Top Developers by Project Count" data={projectCountBarData} csvColumns={['developer', 'operating', 'construction', 'development', 'total']}>
                <ResponsiveContainer width="100%" height={Math.max(projectCountBarData.length * 28, 200)}>
                  <BarChart
                    data={projectCountBarData}
                    layout="vertical"
                    margin={{ top: 5, right: 60, bottom: 5, left: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
                    <YAxis
                      type="category" dataKey="developer" width={160}
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                      labelStyle={{ color: 'var(--color-text)' }}
                      itemStyle={{ color: 'var(--color-text)' }}
                      formatter={(value, name) => [value, String(name).charAt(0).toUpperCase() + String(name).slice(1)]}
                      labelFormatter={(label) => {
                        const dev = projectCountBarData.find(d => d.developer === label)
                        return dev ? `${label} — ${dev.total} projects` : String(label)
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-text-muted)' }} />
                    <Bar
                      dataKey="operating" name="Operating" stackId="projects"
                      fill={STATUS_COLOURS.operating} radius={[0, 0, 0, 0]}
                      cursor="pointer"
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      onClick={(d: any) => d?.slug && navigate(`/developers/${d.slug}`)}
                    />
                    <Bar
                      dataKey="construction" name="Construction" stackId="projects"
                      fill={STATUS_COLOURS.construction} radius={[0, 0, 0, 0]}
                      cursor="pointer"
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      onClick={(d: any) => d?.slug && navigate(`/developers/${d.slug}`)}
                    />
                    <Bar
                      dataKey="development" name="Development" stackId="projects"
                      fill={STATUS_COLOURS.development} radius={[0, 4, 4, 0]}
                      cursor="pointer"
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      onClick={(d: any) => d?.slug && navigate(`/developers/${d.slug}`)}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartWrapper>
            </div>
          )}

          {/* Top 30 by LTESA/CIS wins — stacked bar */}
          {schemeWinsBarData.length > 0 && (
            <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
              <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">
                Top {Math.min(30, schemeWinsBarData.length)} Developers by LTESA/CIS Wins
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mb-4">
                Government scheme contract awards. Click a bar to view developer profile.
              </p>
              <ChartWrapper title="Top Developers by Scheme Wins" data={schemeWinsBarData} csvColumns={['developer', 'ltesa', 'cis', 'wins']}>
                <ResponsiveContainer width="100%" height={Math.max(schemeWinsBarData.length * 28, 200)}>
                  <BarChart
                    data={schemeWinsBarData}
                    layout="vertical"
                    margin={{ top: 5, right: 60, bottom: 5, left: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} allowDecimals={false} />
                    <YAxis
                      type="category" dataKey="developer" width={160}
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                      labelStyle={{ color: 'var(--color-text)' }}
                      itemStyle={{ color: 'var(--color-text)' }}
                      labelFormatter={(label) => {
                        const dev = schemeWinsBarData.find(d => d.developer === label)
                        return dev ? `${label} — ${dev.wins} total wins` : String(label)
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-text-muted)' }} />
                    <Bar
                      dataKey="ltesa" name="LTESA" stackId="schemes"
                      fill="#8b5cf6" radius={[0, 0, 0, 0]}
                      cursor="pointer"
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      onClick={(d: any) => d?.slug && navigate(`/developers/${d.slug}`)}
                    />
                    <Bar
                      dataKey="cis" name="CIS" stackId="schemes"
                      fill="#f59e0b" radius={[0, 4, 4, 0]}
                      cursor="pointer"
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      onClick={(d: any) => d?.slug && navigate(`/developers/${d.slug}`)}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartWrapper>
            </div>
          )}
        </div>
      ) : (
        /* Table view */
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)]">
          <ScrollableTable>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                {([
                  ['developer', 'Developer', 'text-left', ''],
                  ['grade', 'Grade', 'text-center', 'w-16'],
                  ['execution_score', 'Score', 'text-right', ''],
                  ['project_count', 'Projects', 'text-right', 'hidden sm:table-cell'],
                  ['total_mw', 'Total MW', 'text-right', ''],
                  ['on_time_pct', 'On-Time %', 'text-right', 'hidden md:table-cell'],
                  ['avg_drift_months', 'Avg Drift', 'text-right', 'hidden md:table-cell'],
                  ['completion_rate', 'Completion', 'text-right', 'hidden lg:table-cell'],
                ] as [SortField, string, string, string][]).map(([field, label, align, hide]) => (
                  <th
                    key={field}
                    onClick={() => handleSort(field)}
                    className={`${align} p-3 text-[var(--color-text-muted)] font-medium cursor-pointer hover:text-[var(--color-text)] select-none ${hide}`}
                  >
                    {label}
                    {sortField === field && (
                      <span className="ml-1">
                        {sortDir === 'desc' ? <SortDownIcon /> : <SortUpIcon />}
                      </span>
                    )}
                  </th>
                ))}
                <th className="text-left p-3 text-[var(--color-text-muted)] font-medium hidden lg:table-cell">Technologies</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(d => (
                <tr key={d.developer} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg)]/50">
                  <td className="p-3 font-medium">
                    <Link to={`/developers/${devSlug(d.developer)}`} className="text-[var(--color-primary)] hover:underline font-medium">
                      {d.developer}
                    </Link>
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: `${getGradeColour(d.grade)}33`,
                        color: getGradeColour(d.grade),
                      }}
                    >
                      {d.grade}
                    </span>
                  </td>
                  <td className="p-3 text-right text-[var(--color-text)] font-mono">{d.execution_score.toFixed(1)}</td>
                  <td className="p-3 text-right text-[var(--color-text-muted)] hidden sm:table-cell">{d.project_count}</td>
                  <td className="p-3 text-right text-[var(--color-text)]">{d.total_mw.toLocaleString()}</td>
                  <td className="p-3 text-right hidden md:table-cell">
                    <span className={d.on_time_pct >= 70 ? 'text-green-400' : d.on_time_pct >= 40 ? 'text-yellow-400' : 'text-red-400'}>
                      {d.on_time_pct.toFixed(0)}%
                    </span>
                  </td>
                  <td className="p-3 text-right hidden md:table-cell">
                    <span className={d.avg_drift_months <= 6 ? 'text-green-400' : d.avg_drift_months <= 18 ? 'text-yellow-400' : 'text-red-400'}>
                      {d.avg_drift_months.toFixed(1)}m
                    </span>
                  </td>
                  <td className="p-3 text-right hidden lg:table-cell text-[var(--color-text-muted)]">
                    {d.completion_rate.toFixed(0)}%
                  </td>
                  <td className="p-3 hidden lg:table-cell">
                    <div className="flex gap-1 flex-wrap">
                      {d.technologies.map(t => (
                        <span
                          key={t}
                          className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-bg)] text-[var(--color-text-muted)] border border-[var(--color-border)]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-[var(--color-text-muted)]">
                    No developers match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </ScrollableTable>
          <div className="px-3 py-2 text-xs text-[var(--color-text-muted)] border-t border-[var(--color-border)]">
            Showing {sorted.length} of {data.total_developers} developers
          </div>
        </div>
      )}

      {/* Source note */}
      <div className="text-xs text-[var(--color-text-muted)] italic">
        Execution scores calculated from project delivery outcomes including COD drift, on-time rates,
        completion rates, and portfolio size. Grades: A (80+), B (60-79), C (40-59), D (20-39), F (&lt;20).
      </div>
    </div>
  )
}
