import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line, ReferenceLine } from 'recharts'
import { fetchSchemeTracker } from '../../lib/dataService'
import { useSchemeData } from '../../hooks/useSchemeData'
import type { SchemeTrackerData, SchemeTrackerRound, SchemeTrackerProject, CISRound, LTESARound } from '../../lib/types'
import ScrollableTable from '../../components/common/ScrollableTable'
import { ROUND_INFO } from '../../data/scheme-round-info'
import type { RoundInfo } from '../../data/scheme-round-info'
import { ESG_TRACKER_PROJECTS, ROUND_ESG_SUMMARIES } from '../../data/esg-tracker-data'
import { CIS_PROJECTS, LTESA_PROJECTS, CIS_ROUNDS } from '../../data/scheme-rounds'
import type { SchemeProject } from '../../data/scheme-rounds'
import type { ESGTrackerProject, PublicationStatus, AgreementStatus } from '../../data/esg-tracker-data'
import DataProvenance from '../../components/common/DataProvenance'
import { exportSchemePpt } from '../../lib/exportSchemePpt'
import SchemeBoardroom from '../../components/intelligence/SchemeBoardroom'

// ============================================================
// Stage colours & helpers — defined BEFORE const arrays
// ============================================================

const STAGE_CONFIG: Record<string, { label: string; color: string; order: number }> = {
  operating: { label: 'Operating', color: '#22c55e', order: 0 },
  commissioning: { label: 'Commissioning', color: '#a855f7', order: 1 },
  construction: { label: 'Construction', color: '#3b82f6', order: 2 },
  planning_approved: { label: 'Approved', color: '#06b6d4', order: 3 },
  development: { label: 'Development', color: '#f59e0b', order: 4 },
  unknown: { label: 'Unknown', color: '#636e72', order: 5 },
}

function stageColor(stage: string): string {
  return STAGE_CONFIG[stage]?.color ?? '#636e72'
}

function stageLabel(stage: string): string {
  return STAGE_CONFIG[stage]?.label ?? stage.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatTech(tech: string): string {
  const map: Record<string, string> = {
    bess: 'BESS', vpp: 'VPP', pumped_hydro: 'Pumped Hydro',
    hybrid: 'Hybrid', wind: 'Wind', solar: 'Solar',
  }
  return map[tech] ?? tech.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function fmtMW(mw: number): string {
  return mw >= 1000 ? `${(mw / 1000).toFixed(1)} GW` : `${Math.round(mw)} MW`
}

// ============================================================
// Component
// ============================================================

const TABS = ['overview', 'boardroom', 'tracker', 'watchlist', 'esg', 'cis-success', 'cis-briefing', 'timeline'] as const
type Tab = typeof TABS[number]
const TAB_LABELS: Record<Tab, string> = { overview: 'Overview', boardroom: 'Boardroom', tracker: 'Milestone Tracker', watchlist: 'Key Projects', esg: 'ESG Agreement Proxy', 'cis-success': 'CIS Success', 'cis-briefing': 'CIS Briefing', timeline: 'CIS/LTESA Timeline' }

export default function SchemeTracker() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [data, setData] = useState<SchemeTrackerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [pptLoading, setPptLoading] = useState(false)

  // Overview data
  const { cisRounds, ltesaRounds, loading: overviewLoading } = useSchemeData()

  const handleExportPpt = useCallback(async () => {
    if (!data) return
    setPptLoading(true)
    try {
      await exportSchemePpt(data)
    } catch (err) {
      console.error('PowerPoint export failed:', err)
      alert('PowerPoint generation failed — please try again.')
    } finally {
      setPptLoading(false)
    }
  }, [data])

  // Multi-select filters. `selectedStates` starts seeded with NSW because
  // NSW is the anchor state for CIS scheme commentary — user can add more
  // or clear to view the whole NEM.
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([])
  const [selectedRounds, setSelectedRounds] = useState<string[]>([])
  const [selectedStates, setSelectedStates] = useState<string[]>(['NSW'])
  const [selectedTechnologies, setSelectedTechnologies] = useState<string[]>([])

  // Expanded rounds
  const [expandedRounds, setExpandedRounds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchSchemeTracker().then(d => { setData(d ?? null); setLoading(false) })
  }, [])

  // Available filter values
  const allPrograms = useMemo(() => {
    if (!data) return []
    return [...new Set(data.rounds.map(r => r.scheme))].sort()
  }, [data])

  const allStates = useMemo(() => {
    if (!data) return []
    const states = new Set<string>()
    for (const r of data.rounds) {
      for (const s of Object.keys(r.by_state)) states.add(s)
    }
    return [...states].sort()
  }, [data])

  const availableRounds = useMemo(() => {
    if (!data) return []
    let rounds = data.rounds
    if (selectedPrograms.length > 0) {
      rounds = rounds.filter(r => selectedPrograms.includes(r.scheme))
    }
    return rounds.map(r => ({ id: r.id, label: `${r.scheme} ${r.round}` }))
  }, [data, selectedPrograms])

  // Filter rounds
  const filteredRounds = useMemo(() => {
    if (!data) return []
    let rounds = data.rounds

    if (selectedPrograms.length > 0) {
      rounds = rounds.filter(r => selectedPrograms.includes(r.scheme))
    }
    if (selectedRounds.length > 0) {
      rounds = rounds.filter(r => selectedRounds.includes(r.id))
    }

    // For state + technology filtering, filter projects within rounds
    if (selectedStates.length > 0 || selectedTechnologies.length > 0) {
      rounds = rounds.map(r => {
        const filteredProjects = r.projects.filter(p => {
          if (selectedStates.length > 0 && !selectedStates.includes(p.state)) return false
          if (selectedTechnologies.length > 0 && !selectedTechnologies.includes(p.technology)) return false
          return true
        })
        if (filteredProjects.length === 0) return null
        // Recompute by_stage and by_state for filtered projects
        const byStage: Record<string, number> = {}
        const byState: Record<string, number> = {}
        for (const p of filteredProjects) {
          byStage[p.stage] = (byStage[p.stage] || 0) + 1
          byState[p.state] = (byState[p.state] || 0) + 1
        }
        return {
          ...r,
          projects: filteredProjects,
          num_projects: filteredProjects.length,
          total_capacity_mw: filteredProjects.reduce((s, p) => s + p.capacity_mw, 0),
          total_storage_mwh: filteredProjects.reduce((s, p) => s + (p.storage_mwh || 0), 0),
          by_stage: byStage,
          by_state: byState,
        } as SchemeTrackerRound
      }).filter((r): r is SchemeTrackerRound => r !== null)
    }

    // Sort by announced_date descending (newest first)
    return [...rounds].sort((a, b) => b.announced_date.localeCompare(a.announced_date))
  }, [data, selectedPrograms, selectedRounds, selectedStates, selectedTechnologies])

  // Summary stats from filtered rounds
  const summaryStats = useMemo(() => {
    const stages: Record<string, { count: number; mw: number }> = {}
    for (const r of filteredRounds) {
      for (const p of r.projects) {
        if (!stages[p.stage]) stages[p.stage] = { count: 0, mw: 0 }
        stages[p.stage].count++
        stages[p.stage].mw += p.capacity_mw
      }
    }
    const totalProjects = filteredRounds.reduce((s, r) => s + r.num_projects, 0)
    const totalMW = filteredRounds.reduce((s, r) => s + r.total_capacity_mw, 0)
    return { stages, totalProjects, totalMW }
  }, [filteredRounds])

  // Toggle helpers
  function toggle<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]
  }

  function toggleRound(id: string) {
    setExpandedRounds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const hasFilters = selectedPrograms.length > 0 || selectedRounds.length > 0 || selectedStates.length > 0 || selectedTechnologies.length > 0
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [showEssay, setShowEssay] = useState(false)
  const [pctMode, setPctMode] = useState<'projects' | 'mw'>('projects')
  const filterCount = (selectedPrograms.length > 0 ? 1 : 0) + (selectedRounds.length > 0 ? 1 : 0) + (selectedStates.length > 0 ? 1 : 0) + (selectedTechnologies.length > 0 ? 1 : 0)

  // All technologies present in the dataset (for the filter pills)
  const allTechnologies = useMemo(() => {
    if (!data) return []
    const set = new Set<string>()
    for (const r of data.rounds) {
      for (const p of r.projects) set.add(p.technology)
    }
    return [...set].sort()
  }, [data])

  const TECH_COLOURS: Record<string, string> = {
    wind: '#3b82f6', solar: '#f59e0b', bess: '#10b981',
    hybrid: '#ec4899', vpp: '#8b5cf6', pumped_hydro: '#06b6d4',
  }

  function renderSchemeFilters() {
    return (
      <div className="space-y-3">
        {/* Program filter */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Program</div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {allPrograms.map(prog => {
              const isActive = selectedPrograms.includes(prog)
              const color = prog === 'CIS' ? '#f59e0b' : '#8b5cf6'
              return (
                <button
                  key={prog}
                  onClick={() => setSelectedPrograms(toggle(selectedPrograms, prog))}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    isActive
                      ? 'border-transparent font-medium'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
                  }`}
                  style={isActive ? { backgroundColor: `${color}20`, color } : undefined}
                >
                  {prog}
                </button>
              )
            })}
          </div>
        </div>

        {/* Round filter */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Round</div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {availableRounds.map(r => {
              const isActive = selectedRounds.includes(r.id)
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedRounds(toggle(selectedRounds, r.id))}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    isActive
                      ? 'border-blue-500 bg-blue-500/20 text-blue-400 font-medium'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
                  }`}
                >
                  {r.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* State filter — NSW seeded as default (anchor state for CIS commentary) */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">State</div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {allStates.map(state => {
              const isActive = selectedStates.includes(state)
              return (
                <button
                  key={state}
                  onClick={() => setSelectedStates(toggle(selectedStates, state))}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    isActive
                      ? 'border-blue-500 bg-blue-500/20 text-blue-400 font-medium'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
                  }`}
                >
                  {state}
                </button>
              )
            })}
          </div>
        </div>

        {/* Technology filter + CIS Wind Pipeline preset */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Technology</div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {allTechnologies.map(tech => {
              const isActive = selectedTechnologies.includes(tech)
              const col = TECH_COLOURS[tech] ?? '#94a3b8'
              return (
                <button
                  key={tech}
                  onClick={() => setSelectedTechnologies(toggle(selectedTechnologies, tech))}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors capitalize ${
                    isActive
                      ? 'border-transparent font-medium'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
                  }`}
                  style={isActive ? { backgroundColor: `${col}20`, color: col } : undefined}
                >
                  {tech === 'bess' ? 'BESS' : tech === 'vpp' ? 'VPP' : tech.replace(/_/g, ' ')}
                </button>
              )
            })}
            <button
              onClick={() => {
                setSelectedPrograms(['CIS'])
                setSelectedTechnologies(['wind'])
                setSelectedStates(['NSW'])
                setSelectedRounds([])
              }}
              className="text-xs px-2.5 py-1 rounded-full border border-emerald-500/60 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors ml-2"
              title="Apply CIS + Wind + NSW filter preset"
            >
              🌬️ CIS Wind (NSW)
            </button>
          </div>
        </div>

        {hasFilters && (
          <button
            onClick={() => { setSelectedPrograms([]); setSelectedRounds([]); setSelectedStates([]); setSelectedTechnologies([]) }}
            className="text-xs text-blue-400 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>
    )
  }

  // ============================================================
  // Render
  // ============================================================

  if (loading && overviewLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">CIS / LTESA Scheme Intelligence</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Capacity Investment Scheme and NSW Long-term Energy Service Agreements
        </p>
        <div className="mt-3">
          <DataProvenance page="scheme-tracker" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--color-border)]">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Scheme Analysis + Export buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowEssay(true)}
          className="text-xs px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text-muted)] transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          Read Full Scheme Analysis
        </button>
        <button
          onClick={handleExportPpt}
          disabled={pptLoading || !data}
          className="text-xs px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pptLoading
            ? <><span className="animate-spin inline-block">⏳</span> Generating…</>
            : <><span>📊</span> Export to PowerPoint</>
          }
        </button>
      </div>

      {/* Scheme Analysis Essay Modal */}
      {showEssay && (
        <SchemeAnalysisEssay onClose={() => setShowEssay(false)} cisRounds={cisRounds} ltesaRounds={ltesaRounds} />
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <SchemeOverviewTab cisRounds={cisRounds} ltesaRounds={ltesaRounds} loading={overviewLoading} />
      )}

      {/* Tracker Tab */}
      {activeTab === 'tracker' && !data ? (
        <div className="p-6 text-center text-[var(--color-text-muted)]">
          <p>No scheme tracker data available</p>
        </div>
      ) : activeTab === 'tracker' && data && (
        <>

      {/* Tracker intro + % toggle */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
          Use filters to evaluate the status of each round and click through to relevant projects.
        </p>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-[var(--color-text-muted)] mr-1">Show as</span>
          <button
            onClick={() => setPctMode('projects')}
            className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
              pctMode === 'projects'
                ? 'border-blue-500 bg-blue-500/20 text-blue-400 font-medium'
                : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
            }`}
          >
            # Projects
          </button>
          <button
            onClick={() => setPctMode('mw')}
            className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
              pctMode === 'mw'
                ? 'border-blue-500 bg-blue-500/20 text-blue-400 font-medium'
                : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
            }`}
          >
            MW
          </button>
        </div>
      </div>

      {/* Mobile filter button */}
      <div className="lg:hidden flex items-center gap-2">
        <button
          onClick={() => setShowMobileFilters(true)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
          </svg>
          Filters
          {filterCount > 0 && (
            <span className="bg-[var(--color-primary)] text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
              {filterCount}
            </span>
          )}
        </button>
        {hasFilters && (
          <span className="text-[10px] text-[var(--color-text-muted)]">
            {filteredRounds.length} round{filteredRounds.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Mobile Bottom Sheet */}
      {showMobileFilters && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/40 z-50 transition-opacity"
            onClick={() => setShowMobileFilters(false)}
          />
          <div className="lg:hidden fixed inset-x-0 bottom-0 z-50 bg-[var(--color-bg)] border-t border-[var(--color-border)] rounded-t-2xl max-h-[70dvh] overflow-y-auto overscroll-contain animate-slide-up">
            <div className="sticky top-0 bg-[var(--color-bg)] pt-3 pb-2 px-4 border-b border-[var(--color-border)]">
              <div className="w-10 h-1 rounded-full bg-[var(--color-border)] mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--color-text)]">Filters</span>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  Done
                </button>
              </div>
            </div>
            <div className="px-4 py-4">
              {renderSchemeFilters()}
            </div>
            <div className="h-6" />
          </div>
        </>
      )}

      {/* Desktop Filters — always visible on lg+ */}
      <div className="hidden lg:block">
        {renderSchemeFilters()}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard
          label="Operating / Commissioning"
          count={(summaryStats.stages['operating']?.count || 0) + (summaryStats.stages['commissioning']?.count || 0)}
          mw={(summaryStats.stages['operating']?.mw || 0) + (summaryStats.stages['commissioning']?.mw || 0)}
          totalProjects={summaryStats.totalProjects}
          totalMW={summaryStats.totalMW}
          pctMode={pctMode}
          color="#22c55e"
        />
        <SummaryCard
          label="Construction"
          count={summaryStats.stages['construction']?.count || 0}
          mw={summaryStats.stages['construction']?.mw || 0}
          totalProjects={summaryStats.totalProjects}
          totalMW={summaryStats.totalMW}
          pctMode={pctMode}
          color="#3b82f6"
        />
        <SummaryCard
          label="Development"
          count={(summaryStats.stages['development']?.count || 0) + (summaryStats.stages['planning_approved']?.count || 0) + (summaryStats.stages['unknown']?.count || 0)}
          mw={(summaryStats.stages['development']?.mw || 0) + (summaryStats.stages['planning_approved']?.mw || 0) + (summaryStats.stages['unknown']?.mw || 0)}
          totalProjects={summaryStats.totalProjects}
          totalMW={summaryStats.totalMW}
          pctMode={pctMode}
          color="#f59e0b"
        />
      </div>

      {/* Outcomes Pie Chart */}
      <OutcomesPieChart rounds={filteredRounds} pctMode={pctMode} />

      {/* Round Progress Cards */}
      <div className="space-y-3">
        {filteredRounds.map(round => (
          <RoundProgressCard
            key={round.id}
            round={round}
            expanded={expandedRounds.has(round.id)}
            onToggle={() => toggleRound(round.id)}
          />
        ))}
        {filteredRounds.length === 0 && (
          <div className="p-6 text-center text-[var(--color-text-muted)] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl">
            No rounds match the selected filters
          </div>
        )}
      </div>

      {/* Methodology */}
      <details className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
        <summary className="text-sm font-medium text-[var(--color-text)] cursor-pointer">How milestone tracking works</summary>
        <div className="mt-3 text-xs text-[var(--color-text-muted)] space-y-2">
          <p>This tracker monitors the factual milestone progression of projects awarded through government procurement schemes. Unlike risk scoring which tries to predict failures, milestone tracking shows what has actually happened.</p>
          <p><strong className="text-[var(--color-text)]">What counts as success:</strong> A project reaching <span className="text-blue-400 font-semibold">construction</span> or <span className="text-green-400 font-semibold">operation</span> means it will be built — this is scheme success, even if late.</p>
          <p><strong className="text-[var(--color-text)]">Milestone stages:</strong></p>
          <div className="flex flex-wrap gap-2 mt-1">
            {Object.entries(STAGE_CONFIG).filter(([k]) => k !== 'unknown').map(([key, cfg]) => (
              <span key={key} className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}>
                {cfg.label}
              </span>
            ))}
          </div>
          <p className="mt-2">For older rounds where many projects remain in development well after announcement, this may indicate challenges reaching financial close or planning approval — but we avoid speculating on outcomes without sufficient data.</p>
        </div>
      </details>

      {/* Source note */}
      <div className="text-xs text-[var(--color-text-muted)] italic">
        Project status sourced from AEMO, state planning portals, and developer announcements.
        Round data from DCCEEW (CIS) and AEMO Services (LTESA).
      </div>

        </>
      )}

      {/* Watchlist Tab */}
      {activeTab === 'watchlist' && (
        data ? (
          <KeyProjectsTab rounds={data.rounds} />
        ) : (
          <div className="p-6 text-center text-[var(--color-text-muted)]">
            <p>Loading project data...</p>
          </div>
        )
      )}

      {/* ESG Agreement Proxy Tab */}
      {activeTab === 'esg' && (
        <ESGAgreementProxyTab />
      )}
      {activeTab === 'cis-success' && (
        <CISSuccessTab />
      )}
      {activeTab === 'boardroom' && data && <SchemeBoardroom data={data} />}
      {activeTab === 'boardroom' && !data && (
        <div className="p-8 text-center text-sm text-[var(--color-text-muted)]">Loading scheme data…</div>
      )}
      {activeTab === 'cis-briefing' && <CISBriefingTab />}
      {activeTab === 'timeline' && (
        <SchemeTimelineTab />
      )}
    </div>
  )
}

// ============================================================
// Key Projects (Watchlist) Tab
// ============================================================

type SchemeFilter = 'all' | 'CIS' | 'LTESA'

interface RoundWatchlist {
  round: SchemeTrackerRound
  totalMW: number
  securedMW: number       // operating + construction
  atRiskMW: number        // development + other
  securedPct: number
  thresholdMW: number     // MW needed to meet threshold
  gapMW: number           // shortfall to threshold (can be negative = already met)
  criticalProjects: (SchemeTrackerProject & { cumulativeMW: number; needed: boolean })[]
  allDevProjects: SchemeTrackerProject[]
}

function KeyProjectsTab({ rounds }: { rounds: SchemeTrackerRound[] }) {
  const [schemeFilter, setSchemeFilter] = useState<SchemeFilter>('all')
  const [threshold, setThreshold] = useState(80)
  const [minMW, setMinMW] = useState(100)
  const [collapsedRounds, setCollapsedRounds] = useState<Set<string>>(new Set())

  const filteredRounds = useMemo(() => {
    if (schemeFilter === 'all') return rounds
    return rounds.filter(r => r.scheme === schemeFilter)
  }, [rounds, schemeFilter])

  const watchlistData: RoundWatchlist[] = useMemo(() => {
    return filteredRounds
      .filter(r => r.num_projects > 0 && r.total_capacity_mw > 0)
      .sort((a, b) => a.announced_date.localeCompare(b.announced_date))
      .map(round => {
        const securedStages = new Set(['operating', 'commissioning', 'construction'])
        const securedMW = round.projects
          .filter(p => securedStages.has(p.stage))
          .reduce((s, p) => s + p.capacity_mw, 0)
        const atRiskMW = round.total_capacity_mw - securedMW
        const securedPct = round.total_capacity_mw > 0 ? (securedMW / round.total_capacity_mw) * 100 : 0
        const thresholdMW = round.total_capacity_mw * (threshold / 100)
        const gapMW = thresholdMW - securedMW

        // Get all development/planning projects sorted by size
        const devProjects = round.projects
          .filter(p => !securedStages.has(p.stage))
          .sort((a, b) => b.capacity_mw - a.capacity_mw)

        // Mark which projects are "critical" — needed to bridge the gap
        let cumulativeMW = 0
        const criticalProjects = devProjects
          .filter(p => p.capacity_mw >= minMW)
          .map(p => {
            const wasNeeded = cumulativeMW < gapMW
            cumulativeMW += p.capacity_mw
            return { ...p, cumulativeMW, needed: wasNeeded && gapMW > 0 }
          })

        return {
          round,
          totalMW: round.total_capacity_mw,
          securedMW,
          atRiskMW,
          securedPct,
          thresholdMW,
          gapMW,
          criticalProjects,
          allDevProjects: devProjects,
        }
      })
  }, [filteredRounds, threshold, minMW])

  // Summary stats
  const summary = useMemo(() => {
    const total = watchlistData.reduce((s, r) => s + r.totalMW, 0)
    const secured = watchlistData.reduce((s, r) => s + r.securedMW, 0)
    const critical = watchlistData.reduce((s, r) => s + r.criticalProjects.filter(p => p.needed).length, 0)
    const roundsMeetingThreshold = watchlistData.filter(r => r.gapMW <= 0).length
    return { total, secured, critical, roundsMeetingThreshold, totalRounds: watchlistData.length }
  }, [watchlistData])

  function toggleRoundCollapse(id: string) {
    setCollapsedRounds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 space-y-4">
        {/* Scheme filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Scheme</span>
          {(['all', 'CIS', 'LTESA'] as SchemeFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setSchemeFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                schemeFilter === f
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/20 text-[var(--color-primary)] font-medium'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
              }`}
            >
              {f === 'all' ? 'Both' : f}
            </button>
          ))}
        </div>

        {/* Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Round success threshold
              </label>
              <span className="text-xs font-bold text-[var(--color-primary)]">{threshold}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={100}
              step={5}
              value={threshold}
              onChange={e => setThreshold(Number(e.target.value))}
              className="w-full accent-[var(--color-primary)] h-1.5"
            />
            <div className="flex justify-between text-[9px] text-[var(--color-text-muted)] mt-0.5">
              <span>50%</span><span>75%</span><span>100%</span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Min project size
              </label>
              <span className="text-xs font-bold text-[var(--color-primary)]">{minMW} MW</span>
            </div>
            <input
              type="range"
              min={0}
              max={500}
              step={50}
              value={minMW}
              onChange={e => setMinMW(Number(e.target.value))}
              className="w-full accent-[var(--color-primary)] h-1.5"
            />
            <div className="flex justify-between text-[9px] text-[var(--color-text-muted)] mt-0.5">
              <span>0 MW</span><span>250 MW</span><span>500 MW</span>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
          Shows projects not yet in construction or operation that are needed for each round to reach <strong className="text-[var(--color-text)]">{threshold}%</strong> of
          its awarded capacity. Projects <strong className="text-[var(--color-text)]">{'\u2265'}{minMW} MW</strong> are shown, sorted by size. Critical projects (needed to bridge the gap) are highlighted.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-[var(--color-text)]">{summary.roundsMeetingThreshold}/{summary.totalRounds}</div>
          <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Rounds at {threshold}%+</div>
        </div>
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-[#22c55e]">{fmtMW(summary.secured)}</div>
          <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Secured (built/building)</div>
        </div>
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-[#f59e0b]">{fmtMW(summary.total - summary.secured)}</div>
          <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">At risk (development)</div>
        </div>
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-[#ef4444]">{summary.critical}</div>
          <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Critical projects</div>
        </div>
      </div>

      {/* Round cards */}
      <div className="space-y-3">
        {watchlistData.map(wd => {
          const collapsed = collapsedRounds.has(wd.round.id)
          const schemeColor = wd.round.scheme === 'CIS' ? '#f59e0b' : '#8b5cf6'
          const thresholdPct = threshold
          const gapPositive = wd.gapMW > 0

          return (
            <div key={wd.round.id} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
              {/* Round header */}
              <button
                onClick={() => toggleRoundCollapse(wd.round.id)}
                className="w-full text-left p-4 hover:bg-[var(--color-bg)]/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                        style={{ backgroundColor: `${schemeColor}20`, color: schemeColor }}
                      >
                        {wd.round.scheme}
                      </span>
                      <h3 className="text-sm font-semibold text-[var(--color-text)] truncate">{wd.round.round}</h3>
                    </div>
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      {fmtMW(wd.totalMW)} awarded · {wd.round.num_projects} projects · {wd.round.announced_date}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {/* Status badge */}
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: gapPositive ? '#ef444420' : '#22c55e20',
                        color: gapPositive ? '#ef4444' : '#22c55e',
                      }}
                    >
                      {gapPositive
                        ? `${fmtMW(wd.gapMW)} gap`
                        : `${thresholdPct}% met`}
                    </span>
                    <svg
                      className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform ${collapsed ? '' : 'rotate-180'}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="relative">
                  <div className="flex h-3 rounded-full overflow-hidden bg-[var(--color-bg)]">
                    {/* Secured (operating/construction) */}
                    {wd.securedMW > 0 && (
                      <div
                        className="transition-all"
                        style={{ width: `${wd.securedPct}%`, backgroundColor: '#22c55e' }}
                        title={`Secured: ${fmtMW(wd.securedMW)} (${wd.securedPct.toFixed(0)}%)`}
                      />
                    )}
                    {/* At risk (development) */}
                    {wd.atRiskMW > 0 && (
                      <div
                        className="transition-all"
                        style={{ width: `${100 - wd.securedPct}%`, backgroundColor: '#f59e0b40' }}
                      />
                    )}
                  </div>
                  {/* Threshold marker */}
                  <div
                    className="absolute top-0 h-3 border-r-2 border-dashed border-white/60"
                    style={{ left: `${thresholdPct}%` }}
                    title={`${thresholdPct}% threshold: ${fmtMW(wd.thresholdMW)}`}
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-3 text-[10px] text-[var(--color-text-muted)]">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
                      Secured {wd.securedPct.toFixed(0)}%
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#f59e0b]/40" />
                      At risk {(100 - wd.securedPct).toFixed(0)}%
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    Threshold: {fmtMW(wd.thresholdMW)}
                  </span>
                </div>
              </button>

              {/* Expanded project list */}
              {!collapsed && (
                <div className="border-t border-[var(--color-border)]">
                  {wd.criticalProjects.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[var(--color-text-muted)]">
                      {wd.gapMW <= 0
                        ? `This round already meets the ${thresholdPct}% threshold with secured projects.`
                        : `No development projects {'\u2265'} ${minMW} MW found. Try lowering the minimum project size.`}
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--color-border)]/50">
                      {wd.criticalProjects.map((p, i) => (
                        <div
                          key={`${p.name}-${i}`}
                          className={`flex items-center gap-3 px-4 py-3 ${
                            p.needed ? 'bg-red-500/5' : ''
                          }`}
                        >
                          {/* Critical indicator */}
                          <div className="shrink-0">
                            {p.needed ? (
                              <span className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center text-[10px] font-bold text-red-400">
                                !
                              </span>
                            ) : (
                              <span className="w-6 h-6 rounded-full bg-[var(--color-bg)] flex items-center justify-center text-[10px] text-[var(--color-text-muted)]">
                                {i + 1}
                              </span>
                            )}
                          </div>

                          {/* Project info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {p.project_id ? (
                                <Link
                                  to={`/projects/${p.project_id}?from=intelligence/scheme-tracker&fromLabel=Back to Scheme Intelligence`}
                                  className="text-xs font-medium text-blue-400 hover:text-blue-300 truncate"
                                >
                                  {p.name}
                                </Link>
                              ) : (
                                <span className="text-xs font-medium text-[var(--color-text)] truncate">{p.name}</span>
                              )}
                              {p.needed && (
                                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 shrink-0">
                                  Critical
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                              <span>{p.developer}</span>
                              <span>·</span>
                              <span>{p.state}</span>
                              <span>·</span>
                              <span className="px-1.5 py-0 rounded-full border border-[var(--color-border)]">
                                {formatTech(p.technology)}
                              </span>
                              <span>·</span>
                              <span
                                className="px-1.5 py-0 rounded-full"
                                style={{ backgroundColor: `${stageColor(p.stage)}20`, color: stageColor(p.stage) }}
                              >
                                {stageLabel(p.stage)}
                              </span>
                            </div>
                          </div>

                          {/* Capacity */}
                          <div className="shrink-0 text-right">
                            <div className="text-sm font-bold text-[var(--color-text)]">{p.capacity_mw.toLocaleString()} MW</div>
                            <div className="text-[9px] text-[var(--color-text-muted)]">
                              {((p.capacity_mw / wd.totalMW) * 100).toFixed(0)}% of round
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Round summary */}
                  <div className="px-4 py-3 bg-[var(--color-bg)]/50 text-[10px] text-[var(--color-text-muted)] flex items-center justify-between flex-wrap gap-2">
                    <span>
                      {wd.criticalProjects.filter(p => p.needed).length} critical project{wd.criticalProjects.filter(p => p.needed).length !== 1 ? 's' : ''} · {wd.allDevProjects.length} total in development
                    </span>
                    {gapPositive && wd.criticalProjects.length > 0 && (
                      <span className="text-amber-400">
                        {wd.criticalProjects.filter(p => p.needed).reduce((s, p) => s + p.capacity_mw, 0).toLocaleString()} MW needed to close gap
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Methodology note */}
      <div className="text-xs text-[var(--color-text-muted)] italic space-y-1">
        <p>
          "Secured" = projects in construction, commissioning, or operation.
          "Critical" = development-stage projects needed (by capacity, largest first) to bridge the gap between secured MW and the {threshold}% threshold.
        </p>
        <p>
          Adjusting the threshold or minimum size changes which projects are flagged. A round showing "met" means its secured capacity already exceeds the threshold.
        </p>
      </div>
    </div>
  )
}

// ============================================================
// Overview Tab
// ============================================================

function OverviewRoundCard({ round, scheme }: { round: CISRound | LTESARound; scheme: 'cis' | 'ltesa' }) {
  const isCIS = scheme === 'cis'
  const accentColor = isCIS ? '#f59e0b' : '#8b5cf6'
  const [showInfo, setShowInfo] = useState(false)
  const info = ROUND_INFO[round.id]

  return (
    <>
      <Link
        to={`/schemes/${scheme}/${round.id}`}
        className="block bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 hover:border-[var(--color-primary)]/30 transition-all relative"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-[var(--color-text)] leading-tight">{round.name}</h3>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{round.announced_date}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {info && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowInfo(true) }}
                className="w-6 h-6 flex items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text-muted)] transition-colors"
                title="View round details"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
              </button>
            )}
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>
              {isCIS ? (round as CISRound).market : 'NSW'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] px-2 py-0.5 rounded-full border" style={{ borderColor: `${accentColor}40`, color: accentColor }}>
            {round.type === 'generation' ? 'Generation' : round.type === 'dispatchable' ? 'Dispatchable' : round.type === 'firming' ? 'Firming' : round.type === 'lds' ? 'Long Duration Storage' : round.type}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
          <div className="flex items-center gap-3">
            <span className="font-medium" style={{ color: accentColor }}>
              {round.total_capacity_mw >= 1000 ? `${(round.total_capacity_mw / 1000).toFixed(1)} GW` : `${Math.round(round.total_capacity_mw)} MW`}
            </span>
            {round.total_storage_mwh != null && round.total_storage_mwh > 0 && (
              <span>{round.total_storage_mwh >= 1000 ? `${(round.total_storage_mwh / 1000).toFixed(1)} GWh` : `${Math.round(round.total_storage_mwh)} MWh`}</span>
            )}
          </div>
          <span>{round.num_projects} projects</span>
        </div>
      </Link>

      {/* Round Info Modal */}
      {showInfo && info && (
        <RoundInfoModal info={info} roundName={round.name} accentColor={accentColor} onClose={() => setShowInfo(false)} />
      )}
    </>
  )
}

// ============================================================
// Round Info Modal
// ============================================================

function RoundInfoModal({ info, roundName, accentColor, onClose }: {
  info: RoundInfo; roundName: string; accentColor: string; onClose: () => void
}) {
  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl max-w-2xl w-full max-h-[85dvh] overflow-y-auto overscroll-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[var(--color-bg)] border-b border-[var(--color-border)] px-5 py-4 flex items-start justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-base font-bold text-[var(--color-text)]">{roundName}</h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Results: {info.resultsDate}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-card)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Key Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoField label="Target COD" value={info.targetCOD} />
            <InfoField label="Capacity Sought" value={info.capacitySought} />
            <InfoField label="Capacity Awarded" value={info.capacityAwarded} accentColor={accentColor} />
            <InfoField label="Support Term" value={info.supportTerm} />
          </div>

          {/* Bid Parameters */}
          <div>
            <h3 className="text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-2">Bid Parameters</h3>
            <ul className="space-y-1">
              {info.bidParameters.map((param, i) => (
                <li key={i} className="text-xs text-[var(--color-text-muted)] flex items-start gap-2">
                  <span className="text-[var(--color-primary)] mt-0.5 shrink-0">&#8226;</span>
                  {param}
                </li>
              ))}
            </ul>
          </div>

          {/* State Breakdown */}
          {info.stateBreakdown && info.stateBreakdown.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-2">State Breakdown</h3>
              <div className="flex flex-wrap gap-2">
                {info.stateBreakdown.map((item, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Mechanism Note */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
            <h3 className="text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-2">Revenue Mechanism</h3>
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{info.mechanismNote}</p>
          </div>

          {/* Eligibility */}
          <div>
            <h3 className="text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-2">Eligibility</h3>
            <ul className="space-y-1">
              {info.eligibility.map((item, i) => (
                <li key={i} className="text-xs text-[var(--color-text-muted)] flex items-start gap-2">
                  <span className="text-[var(--color-primary)] mt-0.5 shrink-0">&#8226;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Key Facts */}
          <div>
            <h3 className="text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-2">Key Facts</h3>
            <ul className="space-y-1.5">
              {info.keyFacts.map((fact, i) => (
                <li key={i} className="text-xs text-[var(--color-text-muted)] flex items-start gap-2">
                  <span style={{ color: accentColor }} className="mt-0.5 shrink-0">&#8226;</span>
                  {fact}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoField({ label, value, accentColor }: { label: string; value: string; accentColor?: string }) {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-3">
      <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-xs font-medium" style={accentColor ? { color: accentColor } : { color: 'var(--color-text)' }}>
        {value}
      </p>
    </div>
  )
}

function OverviewSummary({ label, color, rounds, totalMW, totalMWh, totalProjects }: {
  label: string; color: string; rounds: number; totalMW: number; totalMWh: number; totalProjects: number
}) {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
      <h3 className="text-sm font-semibold mb-3" style={{ color }}>{label}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-[var(--color-text-muted)] uppercase">Rounds</p>
          <p className="text-lg font-bold text-[var(--color-text)]">{rounds}</p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--color-text-muted)] uppercase">Projects</p>
          <p className="text-lg font-bold text-[var(--color-text)]">{totalProjects}</p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--color-text-muted)] uppercase">Capacity</p>
          <p className="text-lg font-bold" style={{ color }}>{totalMW >= 1000 ? `${(totalMW / 1000).toFixed(1)} GW` : `${Math.round(totalMW)} MW`}</p>
        </div>
        {totalMWh > 0 && (
          <div>
            <p className="text-[10px] text-[var(--color-text-muted)] uppercase">Storage</p>
            <p className="text-lg font-bold" style={{ color }}>{totalMWh >= 1000 ? `${(totalMWh / 1000).toFixed(1)} GWh` : `${Math.round(totalMWh)} MWh`}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function SchemeOverviewTab({ cisRounds, ltesaRounds, loading }: { cisRounds: CISRound[]; ltesaRounds: LTESARound[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-sm text-[var(--color-text-muted)] animate-pulse">Loading scheme data...</div>
      </div>
    )
  }

  const cisTotalMW = cisRounds.reduce((s, r) => s + r.total_capacity_mw, 0)
  const cisTotalMWh = cisRounds.reduce((s, r) => s + (r.total_storage_mwh ?? 0), 0)
  const cisTotalProjects = cisRounds.reduce((s, r) => s + r.num_projects, 0)
  const ltesaTotalMW = ltesaRounds.reduce((s, r) => s + r.total_capacity_mw, 0)
  const ltesaTotalMWh = ltesaRounds.reduce((s, r) => s + (r.total_storage_mwh ?? 0), 0)
  const ltesaTotalProjects = ltesaRounds.reduce((s, r) => s + r.num_projects, 0)

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <OverviewSummary label="Capacity Investment Scheme (CIS)" color="#f59e0b" rounds={cisRounds.length} totalMW={cisTotalMW} totalMWh={cisTotalMWh} totalProjects={cisTotalProjects} />
        <OverviewSummary label="NSW LTESA" color="#8b5cf6" rounds={ltesaRounds.length} totalMW={ltesaTotalMW} totalMWh={ltesaTotalMWh} totalProjects={ltesaTotalProjects} />
      </div>

      {/* Comparison Table */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
          <span className="text-xl">⚖️</span>
          CIS vs LTESA Comparison
        </h2>
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left py-3 px-4 text-[var(--color-text-muted)] text-xs font-medium"></th>
                <th className="text-right py-3 px-4 text-xs font-semibold" style={{ color: '#f59e0b' }}>CIS</th>
                <th className="text-right py-3 px-4 text-xs font-semibold" style={{ color: '#8b5cf6' }}>LTESA</th>
                <th className="text-right py-3 px-4 text-[var(--color-text-muted)] text-xs font-medium">Combined</th>
              </tr>
            </thead>
            <tbody className="text-[var(--color-text)]">
              <tr className="border-b border-[var(--color-border)]/50">
                <td className="py-2.5 px-4 text-xs text-[var(--color-text-muted)]">Scope</td>
                <td className="py-2.5 px-4 text-right text-xs">Federal (NEM + WEM)</td>
                <td className="py-2.5 px-4 text-right text-xs">NSW only</td>
                <td className="py-2.5 px-4 text-right text-xs text-[var(--color-text-muted)]">—</td>
              </tr>
              <tr className="border-b border-[var(--color-border)]/50">
                <td className="py-2.5 px-4 text-xs text-[var(--color-text-muted)]">Rounds</td>
                <td className="py-2.5 px-4 text-right font-medium">{cisRounds.length}</td>
                <td className="py-2.5 px-4 text-right font-medium">{ltesaRounds.length}</td>
                <td className="py-2.5 px-4 text-right font-medium text-[var(--color-text-muted)]">{cisRounds.length + ltesaRounds.length}</td>
              </tr>
              <tr className="border-b border-[var(--color-border)]/50">
                <td className="py-2.5 px-4 text-xs text-[var(--color-text-muted)]">Projects</td>
                <td className="py-2.5 px-4 text-right font-medium">{cisTotalProjects}</td>
                <td className="py-2.5 px-4 text-right font-medium">{ltesaTotalProjects}</td>
                <td className="py-2.5 px-4 text-right font-bold text-[var(--color-primary)]">{cisTotalProjects + ltesaTotalProjects}</td>
              </tr>
              <tr className="border-b border-[var(--color-border)]/50">
                <td className="py-2.5 px-4 text-xs text-[var(--color-text-muted)]">Capacity</td>
                <td className="py-2.5 px-4 text-right font-medium" style={{ color: '#f59e0b' }}>{(cisTotalMW / 1000).toFixed(1)} GW</td>
                <td className="py-2.5 px-4 text-right font-medium" style={{ color: '#8b5cf6' }}>{(ltesaTotalMW / 1000).toFixed(1)} GW</td>
                <td className="py-2.5 px-4 text-right font-bold text-[var(--color-primary)]">{((cisTotalMW + ltesaTotalMW) / 1000).toFixed(1)} GW</td>
              </tr>
              <tr className="border-b border-[var(--color-border)]/50">
                <td className="py-2.5 px-4 text-xs text-[var(--color-text-muted)]">Storage</td>
                <td className="py-2.5 px-4 text-right font-medium" style={{ color: '#f59e0b' }}>{(cisTotalMWh / 1000).toFixed(1)} GWh</td>
                <td className="py-2.5 px-4 text-right font-medium" style={{ color: '#8b5cf6' }}>{(ltesaTotalMWh / 1000).toFixed(1)} GWh</td>
                <td className="py-2.5 px-4 text-right font-bold text-[var(--color-primary)]">{((cisTotalMWh + ltesaTotalMWh) / 1000).toFixed(1)} GWh</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 text-xs text-[var(--color-text-muted)]">Contract type</td>
                <td className="py-2.5 px-4 text-right text-xs">CfD (up to 15yr)</td>
                <td className="py-2.5 px-4 text-right text-xs">CfD gen (20yr) / LDS (14-40yr)</td>
                <td className="py-2.5 px-4 text-right text-xs text-[var(--color-text-muted)]">—</td>
              </tr>
            </tbody>
          </table>
          {/* Visual bar comparison */}
          <div className="px-4 py-3 border-t border-[var(--color-border)]">
            <p className="text-[10px] text-[var(--color-text-muted)] mb-2 uppercase tracking-wider font-medium">Capacity share</p>
            <div className="flex h-4 rounded-full overflow-hidden">
              <div className="transition-all" style={{ width: `${(cisTotalMW / (cisTotalMW + ltesaTotalMW) * 100).toFixed(0)}%`, backgroundColor: '#f59e0b' }} />
              <div className="transition-all" style={{ width: `${(ltesaTotalMW / (cisTotalMW + ltesaTotalMW) * 100).toFixed(0)}%`, backgroundColor: '#8b5cf6' }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px]" style={{ color: '#f59e0b' }}>CIS {(cisTotalMW / (cisTotalMW + ltesaTotalMW) * 100).toFixed(0)}%</span>
              <span className="text-[10px]" style={{ color: '#8b5cf6' }}>LTESA {(ltesaTotalMW / (cisTotalMW + ltesaTotalMW) * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </section>

      {/* CIS Rounds */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
          <span className="text-xl">🛡️</span>
          CIS Tender Rounds
        </h2>
        {cisRounds.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No CIS round data loaded yet.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {cisRounds.map(round => <OverviewRoundCard key={round.id} round={round} scheme="cis" />)}
          </div>
        )}
      </section>

      {/* LTESA Rounds */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
          <span className="text-xl">📄</span>
          NSW LTESA Rounds
        </h2>
        {ltesaRounds.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No LTESA round data loaded yet.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {ltesaRounds.map(round => <OverviewRoundCard key={round.id} round={round} scheme="ltesa" />)}
          </div>
        )}
      </section>

      {/* Explainer */}
      <section>
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2">What are CIS and LTESA?</h3>
          <div className="space-y-2 text-xs text-[var(--color-text-muted)] leading-relaxed">
            <p>
              The <strong className="text-[#f59e0b]">Capacity Investment Scheme (CIS)</strong> is a
              federal underwriting mechanism designed to de-risk investment in new renewable generation
              and dispatchable capacity across the NEM and WEM. Projects bid into competitive tenders
              and receive revenue support contracts.
            </p>
            <p>
              <strong className="text-[#8b5cf6]">Long-term Energy Service Agreements (LTESA)</strong> are
              NSW-specific contracts administered by AEMO Services Limited (ASL) that provide revenue
              certainty for new generation, firming, and long-duration storage projects to support the
              NSW Electricity Infrastructure Roadmap.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

// ============================================================
// Summary Card
// ============================================================

// ============================================================
// Outcomes Pie Chart
// ============================================================

function OutcomesPieChart({ rounds, pctMode }: { rounds: SchemeTrackerRound[]; pctMode: 'projects' | 'mw' }) {
  // Aggregate stages across filtered rounds
  const pieData = useMemo(() => {
    const stages: Record<string, { count: number; mw: number }> = {}
    for (const r of rounds) {
      for (const p of r.projects) {
        // Bucket into 3 groups: Operating/Commissioning, Construction, Development
        let bucket: string
        if (p.stage === 'operating' || p.stage === 'commissioning') {
          bucket = 'operating'
        } else if (p.stage === 'construction') {
          bucket = 'construction'
        } else {
          bucket = 'development'
        }
        if (!stages[bucket]) stages[bucket] = { count: 0, mw: 0 }
        stages[bucket].count++
        stages[bucket].mw += p.capacity_mw
      }
    }

    const config: Record<string, { label: string; color: string; order: number }> = {
      operating: { label: 'Operating / Commissioning', color: '#22c55e', order: 0 },
      construction: { label: 'Construction', color: '#3b82f6', order: 1 },
      development: { label: 'Development', color: '#f59e0b', order: 2 },
    }

    return Object.entries(stages)
      .map(([key, val]) => ({
        name: config[key]?.label ?? key,
        count: val.count,
        mw: val.mw,
        color: config[key]?.color ?? '#636e72',
        order: config[key]?.order ?? 99,
      }))
      .sort((a, b) => a.order - b.order)
  }, [rounds])

  const totalCount = pieData.reduce((s, d) => s + d.count, 0)
  const totalMW = pieData.reduce((s, d) => s + d.mw, 0)
  if (totalCount === 0) return null

  // Per-round timeline: how many months since announcement and stage breakdown
  const roundTimeline = useMemo(() => {
    return rounds
      .filter(r => r.num_projects > 0)
      .sort((a, b) => a.announced_date.localeCompare(b.announced_date))
      .map(r => {
        const operating = (r.by_stage['operating'] || 0) + (r.by_stage['commissioning'] || 0)
        const construction = r.by_stage['construction'] || 0
        const dev = r.num_projects - operating - construction
        const opMW = r.projects.filter(p => p.stage === 'operating' || p.stage === 'commissioning').reduce((s, p) => s + p.capacity_mw, 0)
        const conMW = r.projects.filter(p => p.stage === 'construction').reduce((s, p) => s + p.capacity_mw, 0)
        const devMW = r.total_capacity_mw - opMW - conMW
        return {
          id: r.id,
          label: `${r.scheme} ${r.round}`,
          months: r.months_since_announced,
          total: r.num_projects,
          totalMW: r.total_capacity_mw,
          operating, construction, dev,
          opMW, conMW, devMW,
        }
      })
  }, [rounds])

  const pieDataKey = pctMode === 'mw' ? 'mw' : 'count'

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
      <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3">Scheme Outcomes</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pie */}
        <div className="flex flex-col items-center">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey={pieDataKey}
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                strokeWidth={0}
                label={({ percent }) => `${Math.round((percent ?? 0) * 100)}%`}
                labelLine={false}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                itemStyle={{ color: 'var(--color-text)' }}
                formatter={(value, name) => {
                  const d = pieData.find(p => p.name === name)
                  if (!d) return [value, name]
                  const pctP = totalCount > 0 ? Math.round(d.count / totalCount * 100) : 0
                  const pctM = totalMW > 0 ? Math.round(d.mw / totalMW * 100) : 0
                  return [`${d.count} projects (${fmtMW(d.mw)}) — ${pctMode === 'mw' ? pctM : pctP}%`, name]
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="flex flex-wrap gap-3 justify-center mt-1">
            {pieData.map(d => {
              const pct = pctMode === 'mw'
                ? (totalMW > 0 ? Math.round(d.mw / totalMW * 100) : 0)
                : (totalCount > 0 ? Math.round(d.count / totalCount * 100) : 0)
              return (
                <div key={d.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    {d.name} ({pctMode === 'mw' ? fmtMW(d.mw) : d.count} · {pct}%)
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Round timeline bars */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-medium mb-2">
            Round progression timeline
          </p>
          {roundTimeline.map(r => {
            const byMW = pctMode === 'mw'
            const opPct = byMW ? (r.totalMW > 0 ? r.opMW / r.totalMW * 100 : 0) : (r.total > 0 ? r.operating / r.total * 100 : 0)
            const conPct = byMW ? (r.totalMW > 0 ? r.conMW / r.totalMW * 100 : 0) : (r.total > 0 ? r.construction / r.total * 100 : 0)
            const devPct = byMW ? (r.totalMW > 0 ? r.devMW / r.totalMW * 100 : 0) : (r.total > 0 ? r.dev / r.total * 100 : 0)
            const securedPct = Math.round(opPct + conPct)
            return (
              <div key={r.id}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] text-[var(--color-text)] truncate max-w-[55%]">{r.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium" style={{ color: securedPct >= 50 ? '#22c55e' : '#f59e0b' }}>
                      {securedPct}% secured
                    </span>
                    <span className="text-[10px] text-[var(--color-text-muted)]">{r.months}mo</span>
                  </div>
                </div>
                <div className="flex h-2 rounded-full overflow-hidden bg-[var(--color-bg)]">
                  {opPct > 0 && (
                    <div style={{ width: `${opPct}%`, backgroundColor: '#22c55e' }} />
                  )}
                  {conPct > 0 && (
                    <div style={{ width: `${conPct}%`, backgroundColor: '#3b82f6' }} />
                  )}
                  {devPct > 0 && (
                    <div style={{ width: `${devPct}%`, backgroundColor: '#f59e0b' }} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, count, mw, totalProjects, totalMW, pctMode, color }: {
  label: string; count: number; mw: number; totalProjects: number; totalMW: number; pctMode: 'projects' | 'mw'; color: string
}) {
  const pctProjects = totalProjects > 0 ? (count / totalProjects * 100) : 0
  const pctMW = totalMW > 0 ? (mw / totalMW * 100) : 0
  const pct = pctMode === 'projects' ? pctProjects : pctMW
  const primary = pctMode === 'projects' ? count : fmtMW(mw)
  const secondary = pctMode === 'projects' ? fmtMW(mw) : `${count} projects`

  return (
    <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)] text-center">
      <div className="text-2xl md:text-3xl font-bold" style={{ color }}>{primary}</div>
      <div className="text-xs font-semibold mt-0.5" style={{ color: `${color}99` }}>{Math.round(pct)}%</div>
      <div className="text-[10px] md:text-xs text-[var(--color-text-muted)] mt-1 font-medium">{label}</div>
      <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{secondary}</div>
    </div>
  )
}

// ============================================================
// Round Progress Card
// ============================================================

function RoundProgressCard({
  round,
  expanded,
  onToggle,
}: {
  round: SchemeTrackerRound
  expanded: boolean
  onToggle: () => void
}) {
  const schemeColor = round.scheme === 'CIS' ? '#f59e0b' : '#8b5cf6'

  // Build stage bar segments sorted by stage order
  const stageSegments = Object.entries(round.by_stage)
    .map(([stage, count]) => ({
      stage,
      count,
      pct: round.num_projects > 0 ? (count / round.num_projects) * 100 : 0,
      color: stageColor(stage),
      order: STAGE_CONFIG[stage]?.order ?? 99,
    }))
    .sort((a, b) => a.order - b.order)

  // State summary string
  const stateStr = Object.entries(round.by_state)
    .sort((a, b) => b[1] - a[1])
    .map(([s, c]) => `${s} ${c}`)
    .join(', ')

  // Flag: old round, many in development
  const devCount = (round.by_stage['development'] || 0) + (round.by_stage['unknown'] || 0)
  const showNote = round.months_since_announced > 18 && devCount > 0

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
      {/* Clickable header */}
      <button
        onClick={onToggle}
        className="w-full text-left p-4 hover:bg-[var(--color-bg)]/30 transition-colors"
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text)] leading-tight">
              {round.scheme} {round.round}
            </h3>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
              Announced {round.months_since_announced} months ago · {round.announced_date}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${schemeColor}20`, color: schemeColor }}
            >
              {round.type === 'generation' ? 'Generation' :
               round.type === 'dispatchable' ? 'Dispatchable' :
               round.type === 'firming' ? 'Firming' :
               round.type === 'lds' ? 'Long Duration Storage' :
               round.type === 'mixed' ? 'Gen + LDS' : round.type}
            </span>
            <svg
              className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform ${expanded ? 'rotate-180' : ''}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex h-3 rounded-full overflow-hidden bg-[var(--color-bg)] mb-2">
          {stageSegments.map(seg => (
            <div
              key={seg.stage}
              className="transition-all"
              style={{ width: `${seg.pct}%`, backgroundColor: seg.color }}
              title={`${stageLabel(seg.stage)}: ${seg.count}`}
            />
          ))}
        </div>

        {/* Legend chips */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {stageSegments.map(seg => (
            <span
              key={seg.stage}
              className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: `${seg.color}20`, color: seg.color }}
            >
              {stageLabel(seg.stage)} {seg.count} ({Math.round(seg.pct)}%)
            </span>
          ))}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)] flex-wrap">
          <span className="font-medium" style={{ color: schemeColor }}>
            {round.num_projects} projects · {fmtMW(round.total_capacity_mw)}
          </span>
          {round.total_storage_mwh > 0 && (
            <span>
              {round.total_storage_mwh >= 1000
                ? `${(round.total_storage_mwh / 1000).toFixed(1)} GWh`
                : `${Math.round(round.total_storage_mwh)} MWh`} storage
            </span>
          )}
          <span>{stateStr}</span>
        </div>

        {/* Factual note for older rounds */}
        {showNote && (
          <div className="mt-2 text-[10px] text-amber-400/80 flex items-center gap-1">
            <span>⏳</span>
            <span>
              {devCount} project{devCount > 1 ? 's' : ''} still in development {round.months_since_announced} months after announcement
            </span>
          </div>
        )}
      </button>

      {/* Expanded project table */}
      {expanded && (
        <div className="border-t border-[var(--color-border)]">
          <ScrollableTable>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left p-3 text-[var(--color-text-muted)] font-medium text-xs">Project</th>
                  <th className="text-left p-3 text-[var(--color-text-muted)] font-medium text-xs hidden md:table-cell">Developer</th>
                  <th className="text-left p-3 text-[var(--color-text-muted)] font-medium text-xs hidden sm:table-cell">Tech</th>
                  <th className="text-left p-3 text-[var(--color-text-muted)] font-medium text-xs hidden sm:table-cell">State</th>
                  <th className="text-left p-3 text-[var(--color-text-muted)] font-medium text-xs">Stage</th>
                  <th className="text-left p-3 text-[var(--color-text-muted)] font-medium text-xs">Dev Status</th>
                  <th className="text-right p-3 text-[var(--color-text-muted)] font-medium text-xs">MW</th>
                  <th className="text-center p-3 text-[var(--color-text-muted)] font-medium text-xs hidden md:table-cell">FID</th>
                  <th className="text-center p-3 text-[var(--color-text-muted)] font-medium text-xs hidden md:table-cell">Construction</th>
                </tr>
              </thead>
              <tbody>
                {round.projects
                  .sort((a, b) => b.capacity_mw - a.capacity_mw)
                  .map((p, i) => (
                    <ProjectRow key={`${p.name}-${i}`} project={p} />
                  ))}
              </tbody>
            </table>
          </ScrollableTable>
          <div className="px-4 py-3 border-t border-[var(--color-border)]">
            <Link
              to={`/schemes/${round.scheme.toLowerCase()}/${round.id}`}
              className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
            >
              View full round details →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Project Row
// ============================================================

// Colours for the Dev Status chip — green = progressing, amber = blocker, red = high-severity, grey = unknown
const DEV_STATUS_COLOUR: Record<string, string> = {
  'construction': '#10b981',
  'FID reached': '#10b981',
  'planning approved': '#22d3ee',
  'operating': '#10b981',
  'commissioning': '#10b981',
  'on track': '#22d3ee',
  'grid connection pending': '#f59e0b',
  'environmental pending': '#f59e0b',
  'pre-planning': '#ef4444',
  'execution risk': '#ef4444',
}

function devStatusColor(s?: string): string {
  if (!s) return '#94a3b8'
  return DEV_STATUS_COLOUR[s] ?? '#94a3b8'
}

function ProjectRow({ project: p }: { project: SchemeTrackerProject }) {
  const color = stageColor(p.stage)
  const devColor = devStatusColor(p.dev_status)
  const tooltip = p.annotations && p.annotations.length
    ? p.annotations.map(a => `[${a.severity}] ${a.flag}: ${a.reason}`).join('\n')
    : undefined

  return (
    <tr className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg)]/50">
      <td className="p-3">
        {p.project_id ? (
          <Link
            to={`/projects/${p.project_id}?from=intelligence/scheme-tracker&fromLabel=Back to Scheme Intelligence`}
            className="text-blue-400 hover:text-blue-300 text-xs"
          >
            {p.name}
          </Link>
        ) : (
          <span className="text-xs text-[var(--color-text)]">{p.name}</span>
        )}
        <div className="text-[10px] text-[var(--color-text-muted)] md:hidden mt-0.5">{p.developer}</div>
      </td>
      <td className="p-3 text-xs text-[var(--color-text-muted)] hidden md:table-cell">
        {p.developer}
        {p.developer_grade && (
          <span
            className="ml-1.5 text-[9px] px-1 py-0.5 rounded border border-[var(--color-border)] align-middle"
            style={{ color: devStatusColor(p.developer_grade === 'D' || p.developer_grade === 'F' ? 'execution risk' : 'on track') }}
            title={`Developer execution grade: ${p.developer_grade}`}
          >
            {p.developer_grade}
          </span>
        )}
      </td>
      <td className="p-3 hidden sm:table-cell">
        <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)]">
          {formatTech(p.technology)}
        </span>
      </td>
      <td className="p-3 text-xs text-[var(--color-text-muted)] hidden sm:table-cell">{p.state}</td>
      <td className="p-3">
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {stageLabel(p.stage)}
        </span>
      </td>
      <td className="p-3" title={tooltip}>
        {p.dev_status ? (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-medium capitalize whitespace-nowrap"
            style={{ backgroundColor: `${devColor}20`, color: devColor }}
          >
            {p.dev_status}
            {p.annotations && p.annotations.length > 1 && (
              <span className="ml-1 opacity-75">+{p.annotations.length - 1}</span>
            )}
          </span>
        ) : (
          <span className="text-[10px] text-[var(--color-text-muted)]">—</span>
        )}
      </td>
      <td className="p-3 text-right text-xs text-[var(--color-text)]">{p.capacity_mw.toLocaleString()}</td>
      <td className="p-3 text-center text-[10px] text-[var(--color-text-muted)] hidden md:table-cell">
        {p.fid_date ?? '—'}
      </td>
      <td className="p-3 text-center text-[10px] text-[var(--color-text-muted)] hidden md:table-cell">
        {p.construction_start ?? '—'}
      </td>
    </tr>
  )
}

// ============================================================
// Scheme Analysis Essay
// ============================================================

type TrafficLight = 'green' | 'amber' | 'red'

interface SummaryRow {
  round: string
  announced: string
  targetCOD: string
  awardedMW: string
  operating: number
  construction: number
  development: number
  onTrack: TrafficLight
}

function SchemeAnalysisEssay({ onClose, cisRounds, ltesaRounds }: {
  onClose: () => void
  cisRounds: CISRound[]
  ltesaRounds: LTESARound[]
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // Lock body scroll when modal is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Auto-focus the modal so keyboard events target it
  useEffect(() => {
    modalRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Capture arrow keys / Page Up/Down to scroll modal instead of page
  const handleModalKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = modalRef.current
    if (!el) return
    const scrollAmount = e.key === 'PageUp' || e.key === 'PageDown' ? 400 : 80
    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      el.scrollTop += scrollAmount
      e.preventDefault()
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      el.scrollTop -= scrollAmount
      e.preventDefault()
    }
  }, [])

  const handleDownloadPDF = useCallback(() => {
    const content = contentRef.current
    if (!content) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`<!DOCTYPE html><html><head>
      <title>CIS &amp; LTESA Scheme Analysis — AURES</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e; line-height: 1.6; padding: 40px; max-width: 900px; margin: 0 auto; font-size: 11pt; }
        h1 { font-size: 22pt; margin-bottom: 4px; color: #0f172a; }
        h2 { font-size: 15pt; margin-top: 28px; margin-bottom: 12px; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; }
        h3 { font-size: 12pt; margin-top: 18px; margin-bottom: 8px; color: #334155; }
        p { margin-bottom: 10px; color: #374151; }
        .subtitle { font-size: 10pt; color: #64748b; margin-bottom: 24px; }
        .date { font-size: 9pt; color: #94a3b8; margin-bottom: 20px; }
        strong { color: #1e293b; }
        .highlight { background: #f8fafc; border-left: 3px solid #3b82f6; padding: 12px 16px; margin: 14px 0; border-radius: 0 6px 6px 0; }
        .highlight p { margin-bottom: 0; }
        ul { padding-left: 20px; margin-bottom: 12px; }
        li { margin-bottom: 4px; color: #374151; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 9pt; }
        th { background: #f1f5f9; text-align: left; padding: 8px 10px; border: 1px solid #e2e8f0; font-weight: 600; color: #334155; }
        td { padding: 6px 10px; border: 1px solid #e2e8f0; color: #475569; }
        tr:nth-child(even) { background: #f8fafc; }
        .traffic-green { color: #16a34a; font-weight: 600; }
        .traffic-amber { color: #d97706; font-weight: 600; }
        .traffic-red { color: #dc2626; font-weight: 600; }
        .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 8pt; color: #94a3b8; }
        @media print { body { padding: 20px; } }
      </style>
    </head><body>`)

    // Convert the React content to clean printable HTML
    const clone = content.cloneNode(true) as HTMLElement

    // Replace dark-theme classes with print-friendly content
    clone.querySelectorAll('[class*="text-amber"]').forEach(el => el.classList.add('traffic-amber'))
    clone.querySelectorAll('[class*="text-green"]').forEach(el => el.classList.add('traffic-green'))
    clone.querySelectorAll('[class*="text-red"]').forEach(el => el.classList.add('traffic-red'))

    // Strip all Tailwind/CSS-variable classes and use semantic HTML
    const sections = clone.querySelectorAll('section, div')
    sections.forEach(s => {
      const el = s as HTMLElement
      el.style.cssText = ''
      el.className = el.className.includes('highlight') ? 'highlight' : ''
    })

    printWindow.document.write(`
      <h1>CIS &amp; LTESA: Are Government Schemes Delivering?</h1>
      <p class="subtitle">A comprehensive analysis of Australia's renewable energy procurement programs</p>
      <p class="date">Generated from AURES — ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    `)

    // Extract text content section by section from the rendered content
    const essaySections = content.querySelectorAll('[data-essay-section]')
    essaySections.forEach(section => {
      const title = section.getAttribute('data-essay-section')
      printWindow!.document.write(`<h2>${title}</h2>`)

      // Get all paragraphs, lists, tables, and sub-sections
      section.querySelectorAll('p, ul, h3, table, [data-highlight]').forEach(el => {
        if (el.tagName === 'TABLE') {
          // Rebuild table with traffic light classes
          const tableClone = el.cloneNode(true) as HTMLTableElement
          tableClone.querySelectorAll('span').forEach(span => {
            const color = span.style.color
            if (color.includes('34a') || color.includes('c55e')) span.className = 'traffic-green'
            else if (color.includes('97706') || color.includes('9e0b')) span.className = 'traffic-amber'
            else if (color.includes('2626') || color.includes('4444')) span.className = 'traffic-red'
            span.style.color = ''
            span.removeAttribute('style')
          })
          printWindow!.document.write(tableClone.outerHTML)
        } else if ((el as HTMLElement).dataset?.highlight !== undefined) {
          printWindow!.document.write(`<div class="highlight"><p>${el.textContent}</p></div>`)
        } else {
          printWindow!.document.write(`<${el.tagName.toLowerCase()}>${el.innerHTML}</${el.tagName.toLowerCase()}>`)
        }
      })
    })

    // If no data-essay-section tags found, fall back to innerHTML
    if (essaySections.length === 0) {
      printWindow.document.write(content.innerHTML)
    }

    printWindow.document.write(`
      <div class="footer">
        <p>Source: AURES — Australian Renewable Energy System (aures-db)</p>
        <p>Data sourced from AEMO, DCCEEW (CIS), AEMO Services (LTESA), state planning portals, and developer announcements.</p>
        <p>This analysis is based on publicly available information as of March 2026. Forward-looking statements are based on current data and historical patterns.</p>
      </div>
    </body></html>`)

    printWindow.document.close()
    // Small delay to let styles render, then trigger print
    setTimeout(() => { printWindow.print() }, 300)
  }, [])

  // Build summary table data from ROUND_INFO and round data
  const summaryRows: SummaryRow[] = useMemo(() => {
    const rows: SummaryRow[] = []

    // Helper to estimate stage counts from round data (we don't have tracker data here,
    // so we use the best available information from the overview data)
    const allRounds = [
      ...cisRounds.map(r => ({ ...r, scheme: 'CIS' as const })),
      ...ltesaRounds.map(r => ({ ...r, scheme: 'LTESA' as const })),
    ]

    for (const round of allRounds) {
      const info = ROUND_INFO[round.id]
      if (!info) continue

      // We cannot know exact operating/construction/development counts from overview data alone.
      // Use heuristic based on age and known facts.
      const announcedDate = new Date(round.announced_date)
      const now = new Date()
      const monthsAgo = Math.floor((now.getTime() - announcedDate.getTime()) / (1000 * 60 * 60 * 24 * 30))

      let operating = 0
      let construction = 0
      let development = round.num_projects

      // Apply known facts for specific rounds (from ESG tracker data)
      if (round.id === 'cis-pilot-nsw') {
        // Smithfield operating, Orana + Liddell in construction, 3 VPPs (status unknown, likely operating)
        operating = 1
        construction = 2
        development = 3
      } else if (round.id === 'ltesa-round-2') {
        // LTESA R2 has 4 projects: Smithfield BESS operating, Liddell + Orana in construction, Enel X VPP unknown
        operating = 1
        construction = 2
        development = 1
      } else if (round.id === 'ltesa-round-1') {
        // New England Solar + Stubbo Solar operating, Limondale BESS in construction, Coppabella in development
        operating = 2
        construction = 1
        development = 1
      } else if (round.id === 'ltesa-round-4') {
        // Flyers Creek operating (May 2025), Maryvale in development
        operating = 1
        construction = 0
        development = 1
      } else if (round.id === 'cis-pilot-sa-vic') {
        // 4 in construction (Wooreen, Mortlake, Tailem Bend, Clements Gap), 2 in development (Hallett, Springfield)
        operating = 0
        construction = 4
        development = 2
      } else if (round.id === 'ltesa-round-3') {
        // Culcairn Solar operating, Uungula in construction, 3 in development
        operating = 1
        construction = 1
        development = 3
      } else if (round.id === 'cis-tender-1-nem-gen') {
        // West Mokoan operating, Goulburn River in construction, 17 in development
        operating = 1
        construction = 1
        development = 17
      } else if (round.id === 'cis-tender-3-nem-disp') {
        // Calala BESS + Mornington BESS in construction, 14 in development
        operating = 0
        construction = 2
        development = 14
      } else if (round.id === 'cis-tender-4-nem-gen') {
        // Willogoleche 2 operating, Carmody's Hill in construction, 18 in development
        operating = 1
        construction = 1
        development = 18
      } else if (monthsAgo < 12) {
        // Very recent rounds — all in development
        operating = 0
        construction = 0
        development = round.num_projects
      } else if (monthsAgo < 24) {
        operating = 0
        construction = Math.floor(round.num_projects * 0.15)
        development = round.num_projects - construction
      }

      // Determine traffic light
      let onTrack: TrafficLight = 'amber'
      if (round.id === 'cis-pilot-nsw' || round.id === 'ltesa-round-2') {
        // Target COD Dec 2025 — some VPPs operating but large BESS likely delayed
        onTrack = 'amber'
      } else if (round.id === 'ltesa-round-4') {
        // Flyers Creek operating, Maryvale in development — mixed
        onTrack = 'amber'
      } else if (round.id === 'ltesa-round-1') {
        // 34+ months old, but 2 projects now operating (New England Solar, Stubbo Solar) — mixed progress
        onTrack = 'amber'
      } else if (round.id === 'ltesa-round-3') {
        // Target before 2028 — still time but slow progress
        onTrack = 'amber'
      } else if (round.id === 'cis-pilot-sa-vic') {
        // Target mid-2027 — still 1+ year away, reasonable
        onTrack = 'amber'
      } else if (round.id === 'cis-tender-1-nem-gen') {
        // Target Dec 2028 — 3+ years away, all in development still
        onTrack = 'amber'
      } else if (monthsAgo < 8) {
        // Too early to judge
        onTrack = 'green'
      } else {
        onTrack = 'amber'
      }

      rows.push({
        round: round.name,
        announced: info.resultsDate,
        targetCOD: info.targetCOD.length > 30 ? info.targetCOD.substring(0, 30) + '...' : info.targetCOD,
        awardedMW: round.total_capacity_mw >= 1000
          ? `${(round.total_capacity_mw / 1000).toFixed(1)} GW`
          : `${Math.round(round.total_capacity_mw)} MW`,
        operating,
        construction,
        development,
        onTrack,
      })
    }

    return rows
  }, [cisRounds, ltesaRounds])

  const trafficLightColor = (tl: TrafficLight) => {
    switch (tl) {
      case 'green': return '#22c55e'
      case 'amber': return '#f59e0b'
      case 'red': return '#ef4444'
    }
  }

  const trafficLightLabel = (tl: TrafficLight) => {
    switch (tl) {
      case 'green': return 'On Track'
      case 'amber': return 'Delays Likely'
      case 'red': return 'Behind'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl max-w-4xl w-full max-h-[90dvh] overflow-y-auto overscroll-contain shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleModalKeyDown}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[var(--color-bg)] border-b border-[var(--color-border)] px-5 py-4 flex items-start justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text)]">CIS &amp; LTESA: Are Government Schemes Delivering?</h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">A comprehensive analysis of Australia's renewable energy procurement programs</p>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-3">
            <button
              onClick={handleDownloadPDF}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-card)] transition-colors"
              title="Download as PDF"
            >
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-card)] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div ref={contentRef} className="px-5 py-6 space-y-8">
          {/* Section 1: The Policy Vision */}
          <EssaySection title="The Policy Vision">
            <p>
              The <strong className="text-[#f59e0b]">Capacity Investment Scheme (CIS)</strong> is the Australian federal government's flagship renewable energy procurement program, targeting 40 GW of new capacity (26 GW generation + 14 GW storage) by the early 2030s. The ambition is to attract $73 billion in investment and help reach 82% renewables in the National Electricity Market by 2030.
            </p>
            <p>
              The <strong className="text-[#8b5cf6]">NSW Long-term Energy Service Agreements (LTESA)</strong> program, administered under the NSW Electricity Infrastructure Roadmap, targets 12 GW of new generation by 2030 and legislated minimums of 2 GW and 28 GWh of long-duration storage. These are the most ambitious government-backed renewable energy procurement programs in Australian history.
            </p>
            <p>
              Together, the CIS and LTESA represent an attempt to solve Australia's energy transition financing challenge. By providing long-term revenue certainty, these schemes aim to unlock the private investment needed to replace ageing coal-fired generation with renewables and storage at unprecedented scale.
            </p>
          </EssaySection>

          {/* Section 2: How Do They Work? */}
          <EssaySection title="How Do They Work?">
            <h4 className="text-sm font-semibold text-[#f59e0b] mb-2">CIS (CISA) - "Cap and Collar"</h4>
            <p>
              Under the standard CIS mechanism (formally called a Capacity Investment Scheme Agreement or CISA), bidders set three key parameters: a Revenue Floor, a Revenue Ceiling, and an Annual Payment Cap. If a project's market revenue falls below its Floor, the government pays 90% of the shortfall (up to the cap). If revenue exceeds the Ceiling, the project pays back 50% of the excess (also capped). Between the floor and ceiling, no payments flow in either direction and the project retains all market revenue. Support runs for up to 15 years from commercial operation.
            </p>

            <h4 className="text-sm font-semibold text-[#8b5cf6] mb-2 mt-4">LTESA Generation - Options Contract</h4>
            <p>
              The generation LTESA is an options contract. The operator can elect to enter up to 10 two-year cash-settled swap periods over the ~20-year contract term. When exercised, the operator receives a fixed (strike) price via a swap against the spot market price. In non-exercise periods, if the average market price exceeds a repayment threshold, the operator must repay 75% of the excess. This structure lets developers take advantage of high market prices by choosing not to exercise, while still providing a floor when prices are low.
            </p>

            <h4 className="text-sm font-semibold text-[#8b5cf6] mb-2 mt-4">LTESA Storage (LDS) - Variable Annuity</h4>
            <p>
              Long-duration storage LTESAs use a variable annuity structure. The government tops up net revenues to an Annuity Cap ($/MW/year), with 50% revenue sharing above a Net Revenue Threshold. Both the cap and threshold escalate annually at the lesser of CPI or 3%. Contract terms are 14 years for battery storage and up to 40 years for pumped hydro, reflecting the different asset lifespans.
            </p>

            <h4 className="text-sm font-semibold text-[#8b5cf6] mb-2 mt-4">LTESA Firming - Fixed Annuity</h4>
            <p>
              The firming LTESA (used only in Round 2, co-delivered with CIS Pilot NSW) provides a fixed annuity per MW per year with no escalation. Operators must maintain at least 90% availability to receive the full payment. The contract provides up to 10 one-year options, giving the operator flexibility over a 10-year support period.
            </p>
          </EssaySection>

          {/* Section 3: Round by Round */}
          <EssaySection title="Round by Round">
            {/* LTESA Round 1 */}
            <RoundAnalysis title="LTESA Round 1 — Generation + LDS" date="May 2023" color="#8b5cf6">
              <p>
                The first-ever LTESA tender sought 950 MW of generation and 600 MW of long-duration storage. Four projects were awarded: three generation projects (New England Solar, Stubbo Solar, and Coppabella Wind) totalling 1,395 MW, plus the 50 MW / 400 MWh Limondale BESS. Strike prices were remarkably low, with solar below approximately $35/MWh and wind below $50/MWh.
              </p>
              <p>
                Two of the four projects — New England Solar Farm (720 MW) and Stubbo Solar Farm (400 MW), both by ACEN — have reached commercial operation, a significant milestone. Coppabella Wind Farm (275 MW) remains in the development phase after 34+ months, which is a concern. Limondale BESS (50 MW / 400 MWh) is in construction.
              </p>
            </RoundAnalysis>

            {/* LTESA Round 2 / CIS Pilot NSW */}
            <RoundAnalysis title="LTESA Round 2 / CIS Pilot NSW" date="November 2023" color="#8b5cf6">
              <p>
                This combined round was the first CIS tender, co-delivered between the federal and NSW governments. It sought firming capacity and awarded contracts across six projects: three large BESS (Liddell 500 MW, Orana 460 MW, Smithfield 235 MW) and three Enel X virtual power plant portfolios (130 MW combined). The target COD was December 2025.
              </p>
              <p>
                The Smithfield Sydney Battery (235 MW) has reached commercial operation, and the Orana REZ Battery (460 MW) and Liddell BESS (500 MW) are both in construction. The VPP projects, being aggregations of distributed assets, have shorter development timelines and are expected to be at or nearing operational status. The December 2025 target COD was missed by the larger BESS projects, though they are progressing through construction.
              </p>
            </RoundAnalysis>

            {/* LTESA Round 3 */}
            <RoundAnalysis title="LTESA Round 3 — Generation + LDS" date="December 2023" color="#8b5cf6">
              <p>
                This combined round awarded 750 MW of generation (Uungula Wind Farm and Culcairn Solar) and 524 MW / 4,192 MWh of long-duration storage across three projects. The storage tranche notably included Hydrostor's Silver City advanced compressed air energy storage (A-CAES) project, the first of its kind to secure an LTESA.
              </p>
              <p>
                With a target COD of before 2028, Culcairn Solar Farm (350 MW, Neoen) has reached commercial operation — strong progress. Uungula Wind Farm (400 MW, Squadron Energy) is in construction. The three storage projects — Richmond Valley BESS, Silver City A-CAES, and Goulburn River BESS — remain in development. The timeline is tight but achievable for some.
              </p>
            </RoundAnalysis>

            {/* LTESA Round 4 */}
            <RoundAnalysis title="LTESA Round 4 — Generation" date="June 2024" color="#8b5cf6">
              <p>
                The smallest LTESA round, awarding only two projects: Flyers Creek Wind Farm (~140 MW) and Maryvale Solar + BESS (172 MW / 372 MWh). Flyers Creek had already been constructed and became the first project with an LTESA to begin operations in May 2025, an important milestone for the program.
              </p>
              <p>
                The planned Q4 2024 generation tender was subsequently cancelled to align with the federal CIS program, signalling that the LTESA and CIS programs are increasingly coordinated rather than running independently.
              </p>
            </RoundAnalysis>

            {/* CIS Pilot SA/VIC */}
            <RoundAnalysis title="CIS Pilot — SA/VIC" date="September 2024" color="#f59e0b">
              <p>
                The second CIS pilot expanded coverage to South Australia and Victoria, using the standard CISA "cap and collar" mechanism for the first time. Six battery projects totalling 995 MW / 3,626 MWh were awarded, significantly exceeding the 600 MW / 2,400 MWh target.
              </p>
              <p>
                With a target COD of mid-2027, four of the six projects — Wooreen Battery (350 MW), Mortlake BESS (135 MW), Tailem Bend BESS (200 MW) and Clements Gap Battery (60 MW) — are already in construction, which is strong progress. The remaining two (Springfield BESS and Hallett Battery) are in development. The mid-2027 target appears achievable for most projects in this round.
              </p>
            </RoundAnalysis>

            {/* CIS Tender 1 */}
            <RoundAnalysis title="CIS Tender 1 — NEM Generation" date="December 2024" color="#f59e0b">
              <p>
                Australia's largest renewable energy tender at the time, awarding 6.4 GW across 19 projects from 84 bids. The round was 4.5x oversubscribed. Notably, none of the Big 3 gen-tailers (Origin, AGL, EnergyAustralia) won contracts, suggesting smaller independent developers offered more competitive bids.
              </p>
              <p>
                With a target COD of 31 December 2028, West Mokoan Solar Farm (300 MW) has already reached operation and Goulburn River Solar Farm (450 MW) is in construction — encouraging progress. The remaining 17 projects are still in development, which is expected given the typical 3-5 year timeline from award to operation for large-scale generation projects. The key risk is whether enough projects can navigate planning, grid connection, and financing hurdles to reach COD by end-2028.
              </p>
            </RoundAnalysis>

            {/* CIS Tender 2 WEM */}
            <RoundAnalysis title="CIS Tender 2 — WEM Dispatchable" date="March 2025" color="#f59e0b">
              <p>
                The first CIS tender for Western Australia awarded four battery projects totalling 654 MW / 2,595 MWh, exceeding the 500 MW target. The round was 7x oversubscribed, indicating strong developer interest in the WA market. The target COD of October 2027 gives these projects approximately 2.5 years to reach operation.
              </p>
              <p>
                Given that all four are battery projects (which typically have shorter construction timelines than generation assets), the October 2027 target appears achievable provided grid connection and planning processes proceed without major delays.
              </p>
            </RoundAnalysis>

            {/* LTESA Round 5 */}
            <RoundAnalysis title="LTESA Round 5 — Long Duration Storage" date="February 2025" color="#8b5cf6">
              <p>
                A milestone round that awarded the first pumped hydro LTESA: Phoenix Pumped Hydro at 800 MW / 11,990 MWh with a 40-year contract term, the longest government-backed energy contract in Australian history. Two additional BESS projects (Stoney Creek 125 MW and Griffith 100 MW) were also awarded.
              </p>
              <p>
                The target is operation before the end of the decade. The BESS projects have typical 2-3 year construction timelines, making this achievable. Phoenix Pumped Hydro, however, faces a much longer development cycle typical of pumped hydro (5-8+ years), though the 40-year contract provides ample time for returns.
              </p>
            </RoundAnalysis>

            {/* CIS Tender 3 */}
            <RoundAnalysis title="CIS Tender 3 — NEM Dispatchable" date="September 2025" color="#f59e0b">
              <p>
                Australia's biggest battery storage tender awarded 4.13 GW / 15.37 GWh across 16 projects. All winners were lithium-ion BESS despite pumped hydro and other technologies being eligible. The round was 8.5x oversubscribed with 124 bids totalling approximately 34 GW.
              </p>
              <p>
                With a 4+ year runway to the December 2029 target, there is adequate time for battery projects. The largest winners — Goulburn River Standalone BESS (450 MW, Lightsource bp), Teebar BESS (400 MW, Atmos Renewables), and Little River BESS (350 MW, ACEnergy) — are spread across NSW, VIC, QLD and SA. Calala BESS and Mornington BESS are already in construction, providing early positive signals. However, the sheer volume (16 projects across 4 states) will test grid connection capacity and supply chains.
              </p>
            </RoundAnalysis>

            {/* CIS Tender 4 */}
            <RoundAnalysis title="CIS Tender 4 — NEM Generation" date="October 2025" color="#f59e0b">
              <p>
                Twenty projects delivering 6.6 GW of generation plus 11.4 GWh of co-located storage, with a notable shift toward hybrid projects (12 of 20 include batteries). This round also awarded Tasmania's first CIS project (Bell Bay Wind Farm) and secured $1 billion in Australian steel commitments.
              </p>
              <p>
                Willogoleche 2 Wind Farm (108 MW) is already operating and Carmody's Hill Wind Farm (247 MW) is in construction, providing early positive signals. The largest winners — Liverpool Range Wind Stage 1 (634 MW, Tilt Renewables), Hexham Wind Farm (600 MW, AGL), and Tallawang Solar Hybrid (500 MW, Potentia Energy) — are still in development. With a target COD of 31 December 2030, the later date provides more runway, and the trend toward hybridisation may improve financing prospects.
              </p>
            </RoundAnalysis>

            {/* LTESA Round 6 */}
            <RoundAnalysis title="LTESA Round 6 — Long Duration Storage" date="February 2026" color="#8b5cf6">
              <p>
                The largest LTESA tender by energy capacity, awarding 1,171 MW / 11,980 MWh across six BESS projects including Great Western Battery (330 MW, Neoen), Bowmans Creek BESS (250 MW, Ark Energy) and Bannaby BESS (233 MW, Penso Power). Combined with prior rounds, the legislated LDS minimum objectives of 2 GW by 2030 and 28 GWh by 2034 have been met on paper.
              </p>
              <p>
                Announced just weeks ago, all six projects are in early development. Meeting the legislated target in terms of contracted capacity is a meaningful achievement, but the key question remains whether these projects can actually be built and operating by their target dates.
              </p>
            </RoundAnalysis>
          </EssaySection>

          {/* Section 4: The Big Picture */}
          <EssaySection title="The Big Picture — Is the Industry on Track?">
            <p>
              Across the CIS and LTESA programs, approximately 95 projects have been awarded contracts representing over 25 GW of combined capacity. This is an impressive achievement in terms of competitive procurement, but awarded capacity is not the same as built capacity. The critical question is how much of this pipeline will actually reach operation, and when.
            </p>

            <h4 className="text-sm font-semibold text-[var(--color-text)] mt-4 mb-2">The Delivery Gap</h4>
            <p>
              Based on current data from the AURES Milestone Tracker and ESG Agreement Proxy, a small but growing number of awarded projects have reached operation. New England Solar Farm (720 MW) and Stubbo Solar Farm (400 MW) from LTESA Round 1, Culcairn Solar Farm (350 MW) from LTESA Round 3, Flyers Creek Wind Farm (145 MW) from LTESA Round 4, Mokoan Solar Farm (46 MW) from CIS Tender 1, and Smithfield Battery (235 MW) from CIS Pilot NSW are confirmed operating. In the CIS Pilot NSW / LTESA Round 2, two large BESS projects (Orana 460 MW, Liddell 500 MW) are in construction. However, the majority of the 90+ awarded projects across both programs remain in the development phase.
            </p>

            <h4 className="text-sm font-semibold text-[var(--color-text)] mt-4 mb-2">The Pipeline Challenge</h4>
            <p>
              The CIS aims for 40 GW of capacity. Across all CIS rounds to date, approximately 19.9 GW has been awarded. With LTESA adding a further 6.3 GW, the combined contracted pipeline is substantial but remains well below the CIS target alone. More importantly, the gap between "contracted" and "operating" is widening as new rounds are announced faster than existing projects are built.
            </p>

            <h4 className="text-sm font-semibold text-[var(--color-text)] mt-4 mb-2">Systemic Barriers</h4>
            <p>
              Having a CIS or LTESA contract helps with project financing but does not remove all barriers. Grid connection delays remain the single largest bottleneck, with AEMO connection processes taking 2-4 years for many projects. Planning approvals, community opposition, supply chain constraints (particularly for transformers and high-voltage equipment), and skilled labour shortages all contribute to development timelines that typically stretch 3-5 years from award to operation for large projects.
            </p>

            <h4 className="text-sm font-semibold text-[var(--color-text)] mt-4 mb-2">ESG Agreement Proxy — What It Tells Us</h4>
            <p>
              The AURES ESG Agreement Proxy tracks whether projects have executed their government agreements by monitoring publicly observable indicators: publication of First Nations commitments, FNCEN registration, CEC Charter signatory status, and ASL summary data availability. Projects that are in construction or have published these commitments are classified as &quot;confirmed&quot; — those that have not are flagged as &quot;not confirmed&quot;, suggesting the agreement may not yet be executed or the project may be at risk.
            </p>
            <p>
              Across all rounds, the confirmed agreement rate varies significantly. Earlier rounds (LTESA R1, CIS Pilot NSW) show higher confirmation rates as projects have had time to progress. Later rounds (CIS Tender 1-4, LTESA R5-6) show lower rates, which is expected given their recency. The key watchpoint is rounds that are 12+ months old with low confirmation rates — these may indicate projects struggling to reach financial close.
            </p>

            <h4 className="text-sm font-semibold text-[var(--color-text)] mt-4 mb-2">Key Projects to Watch</h4>
            <p>
              Seven development-stage projects have been identified as closest to commencing construction, based on developer track record, planning maturity, and time since award. These include Valley of the Winds (936 MW, ACEN), Spicers Creek Wind (700 MW, Squadron Energy), Liverpool Range Wind (634 MW, Tilt Renewables), and Goyder North Wind (300 MW, Neoen). Together they represent over 4 GW of capacity — if all progressed to construction, the overall CIS/LTESA construction rate would increase significantly. Liverpool Range and Goyder North are assessed as most likely to commence construction in the near term, while Coppabella Wind Farm (275 MW, LTESA R1) is flagged as overdue at 34+ months in development.
            </p>

            <h4 className="text-sm font-semibold text-[var(--color-text)] mt-4 mb-2">2030 Outlook</h4>
            <p>
              Based on historical patterns and the AURES Milestone Tracker data, a significant portion of the capacity awarded in 2024 and 2025 tenders is unlikely to be operational by 2030. Projects from the earliest rounds (2023) have the best chance — LTESA R1 already has 1,120 MW operating and the CIS Pilot NSW has 945 MW in construction. Battery projects from CIS Tender 2 and 3 (WEM and NEM Dispatchable) have shorter construction timelines and may largely deliver on time. The large generation projects from CIS Tender 1 (6.4 GW, target Dec 2028) and CIS Tender 4 (6.6 GW, target Dec 2030) face the greatest delivery risk given their scale and the systemic barriers described above. A realistic assessment suggests that perhaps 35-50% of currently awarded CIS and LTESA capacity may be operational by end-2030, with the remainder following in 2031-2033.
            </p>

            <h4 className="text-sm font-semibold text-[var(--color-text)] mt-4 mb-2">The Verdict</h4>
            <p>
              The CIS and LTESA programs are well-designed mechanisms that have successfully attracted significant private investment interest in Australia&apos;s energy transition. Competitive tension has driven down prices, with oversubscription ratios of 4-8.5x across tenders demonstrating strong developer confidence. The schemes have also secured meaningful community benefit commitments — the ESG Agreement Proxy shows increasing transparency around First Nations engagement, with many projects publishing Aboriginal Stakeholder Land-use agreements and registering on the FNCEN.
            </p>
            <p>
              However, the pace of actual construction is falling short of what is needed to meet the 2030 targets. The confirmed agreement rate and construction commencement rate remain key metrics to watch. With 11 rounds now completed and a combined pipeline exceeding 25 GW, the focus must shift from procurement to delivery. Addressing grid connection timelines, planning processes, and supply chain constraints will be critical to converting the impressive pipeline of contracted projects into the operating assets Australia needs.
            </p>
          </EssaySection>

          {/* Section 5: Summary Table */}
          <EssaySection title="Summary Table">
            <div className="overflow-x-auto -mx-1">
              <ScrollableTable>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="text-left py-2 px-2 text-[var(--color-text-muted)] font-medium whitespace-nowrap">Round</th>
                      <th className="text-left py-2 px-2 text-[var(--color-text-muted)] font-medium whitespace-nowrap">Announced</th>
                      <th className="text-left py-2 px-2 text-[var(--color-text-muted)] font-medium whitespace-nowrap">Target COD</th>
                      <th className="text-right py-2 px-2 text-[var(--color-text-muted)] font-medium whitespace-nowrap">Awarded</th>
                      <th className="text-center py-2 px-2 font-medium whitespace-nowrap" style={{ color: '#22c55e' }}>Op.</th>
                      <th className="text-center py-2 px-2 font-medium whitespace-nowrap" style={{ color: '#3b82f6' }}>Con.</th>
                      <th className="text-center py-2 px-2 font-medium whitespace-nowrap" style={{ color: '#f59e0b' }}>Dev.</th>
                      <th className="text-center py-2 px-2 text-[var(--color-text-muted)] font-medium whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryRows.map((row, i) => (
                      <tr key={i} className="border-b border-[var(--color-border)]/50">
                        <td className="py-2 px-2 text-[var(--color-text)] font-medium whitespace-nowrap">{row.round}</td>
                        <td className="py-2 px-2 text-[var(--color-text-muted)] whitespace-nowrap">{row.announced}</td>
                        <td className="py-2 px-2 text-[var(--color-text-muted)] whitespace-nowrap">{row.targetCOD}</td>
                        <td className="py-2 px-2 text-right text-[var(--color-text)] font-medium whitespace-nowrap">{row.awardedMW}</td>
                        <td className="py-2 px-2 text-center" style={{ color: '#22c55e' }}>{row.operating}</td>
                        <td className="py-2 px-2 text-center" style={{ color: '#3b82f6' }}>{row.construction}</td>
                        <td className="py-2 px-2 text-center" style={{ color: '#f59e0b' }}>{row.development}</td>
                        <td className="py-2 px-2 text-center">
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: `${trafficLightColor(row.onTrack)}20`, color: trafficLightColor(row.onTrack) }}
                          >
                            {trafficLightLabel(row.onTrack)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollableTable>
            </div>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-3 italic">
              Operating/Construction/Development counts are estimates based on current data and known project milestones. Actual counts may differ as new information becomes available.
            </p>
          </EssaySection>

          {/* Disclaimer */}
          <div className="text-[10px] text-[var(--color-text-muted)] italic border-t border-[var(--color-border)] pt-4">
            This analysis is based on publicly available information as of March 2026. Project status data is sourced from AEMO, state planning portals, and developer announcements. Round data is from DCCEEW (CIS) and AEMO Services (LTESA). Forward-looking statements are based on current data and historical patterns and should not be treated as forecasts.
          </div>
        </div>
      </div>
    </div>
  )
}

function EssaySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section data-essay-section={title}>
      <h3 className="text-base font-bold text-[var(--color-text)] mb-3 pb-2 border-b border-[var(--color-border)]">{title}</h3>
      <div className="space-y-3 text-sm text-[var(--color-text-muted)] leading-relaxed">
        {children}
      </div>
    </section>
  )
}

function RoundAnalysis({ title, date, color, children }: { title: string; date: string; color: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <h4 className="text-sm font-semibold text-[var(--color-text)]">{title}</h4>
        <span className="text-[10px] text-[var(--color-text-muted)]">({date})</span>
      </div>
      <div className="space-y-2 text-sm text-[var(--color-text-muted)] leading-relaxed pl-4">
        {children}
      </div>
    </div>
  )
}

// ============================================================
// ESG Agreement Proxy Tab
// ============================================================

const PUB_STATUS_CONFIG: Record<PublicationStatus, { label: string; color: string; icon: string }> = {
  published:    { label: 'Published',      color: '#22c55e', icon: '\u2713' },
  partial:      { label: 'Partial',        color: '#06b6d4', icon: '\u00BD' },
  fncen_only:   { label: 'FNCEN Only',     color: '#f59e0b', icon: '\u25CB' },
  not_found:    { label: 'Not Found',      color: '#ef4444', icon: '\u2717' },
  not_required: { label: 'Not Required',   color: '#636e72', icon: '\u2014' },
  too_early:    { label: 'Too Early',      color: '#8b5cf6', icon: '\u23F3' },
  exempt:       { label: 'Exempt',         color: '#636e72', icon: '\u2014' },
}

const AGR_STATUS_CONFIG: Record<AgreementStatus, { label: string; color: string }> = {
  executed:        { label: 'Executed',        color: '#22c55e' },
  likely_executed: { label: 'Likely Executed', color: '#3b82f6' },
  awarded:         { label: 'Awarded Only',    color: '#f59e0b' },
  unknown:         { label: 'Unknown',         color: '#636e72' },
}

function ESGAgreementProxyTab() {
  const [schemeFilter, setSchemeFilter] = useState<'all' | 'CIS' | 'LTESA'>('all')
  const [statusFilter, setStatusFilter] = useState<PublicationStatus | 'all'>('all')
  const [showExplainer, setShowExplainer] = useState(true)
  const [collapsedRounds, setCollapsedRounds] = useState<Set<string>>(new Set())

  const filteredProjects = useMemo(() => {
    let projects = ESG_TRACKER_PROJECTS
    if (schemeFilter !== 'all') projects = projects.filter(p => p.scheme === schemeFilter)
    if (statusFilter !== 'all') projects = projects.filter(p => p.publicationStatus === statusFilter)
    return projects
  }, [schemeFilter, statusFilter])

  // Group by round
  const roundGroups = useMemo(() => {
    const groups = new Map<string, { roundId: string; round: string; scheme: 'CIS' | 'LTESA'; announced: string; projects: ESGTrackerProject[] }>()
    for (const p of filteredProjects) {
      if (!groups.has(p.roundId)) {
        groups.set(p.roundId, { roundId: p.roundId, round: p.round, scheme: p.scheme, announced: p.awardAnnouncedDate, projects: [] })
      }
      groups.get(p.roundId)!.projects.push(p)
    }
    return [...groups.values()].sort((a, b) => a.announced.localeCompare(b.announced))
  }, [filteredProjects])

  // Summary stats
  const stats = useMemo(() => {
    const required = filteredProjects.filter(p => !['not_required', 'exempt', 'too_early'].includes(p.publicationStatus))
    const published = required.filter(p => p.publicationStatus === 'published')
    const partial = required.filter(p => p.publicationStatus === 'partial')
    const fncenOnly = required.filter(p => p.publicationStatus === 'fncen_only')
    const notFound = required.filter(p => p.publicationStatus === 'not_found')
    const publishedMW = published.reduce((s, p) => s + p.capacityMW, 0)
    const notFoundMW = notFound.reduce((s, p) => s + p.capacityMW, 0)
    const totalRequiredMW = required.reduce((s, p) => s + p.capacityMW, 0)
    const likelyExecuted = filteredProjects.filter(p => p.agreementStatus === 'executed' || p.agreementStatus === 'likely_executed')
    const awardedOnly = filteredProjects.filter(p => p.agreementStatus === 'awarded')

    // Agreement confidence: combine agreement status + construction/operating stage + publication evidence
    // "Confirmed" = executed OR likely_executed (in construction/operating) OR has published/partial/fncen_only evidence
    // "Not confirmed" = awarded only AND no publication evidence AND not in construction/operating
    const confirmedProjects = filteredProjects.filter(p =>
      p.agreementStatus === 'executed' ||
      p.agreementStatus === 'likely_executed' ||
      ['construction', 'operating', 'commissioning'].includes(p.stage) ||
      ['published', 'partial'].includes(p.publicationStatus)
    )
    const notConfirmedProjects = filteredProjects.filter(p =>
      p.agreementStatus !== 'executed' &&
      p.agreementStatus !== 'likely_executed' &&
      !['construction', 'operating', 'commissioning'].includes(p.stage) &&
      !['published', 'partial'].includes(p.publicationStatus)
    )
    const confirmedMW = confirmedProjects.reduce((s, p) => s + p.capacityMW, 0)
    const notConfirmedMW = notConfirmedProjects.reduce((s, p) => s + p.capacityMW, 0)
    const totalMW = filteredProjects.reduce((s, p) => s + p.capacityMW, 0)

    return {
      total: filteredProjects.length,
      required: required.length,
      published: published.length,
      partial: partial.length,
      fncenOnly: fncenOnly.length,
      notFound: notFound.length,
      publishedMW,
      notFoundMW,
      totalRequiredMW,
      likelyExecuted: likelyExecuted.length,
      awardedOnly: awardedOnly.length,
      pubRate: required.length > 0 ? Math.round(((published.length + partial.length) / required.length) * 100) : 0,
      confirmedCount: confirmedProjects.length,
      confirmedMW,
      notConfirmedCount: notConfirmedProjects.length,
      notConfirmedMW,
      totalMW,
      confirmRate: filteredProjects.length > 0 ? Math.round((confirmedProjects.length / filteredProjects.length) * 100) : 0,
    }
  }, [filteredProjects])

  // Per-round confidence stats helper
  function getRoundConfidence(projects: ESGTrackerProject[]) {
    const confirmed = projects.filter(p =>
      p.agreementStatus === 'executed' ||
      p.agreementStatus === 'likely_executed' ||
      ['construction', 'operating', 'commissioning'].includes(p.stage) ||
      ['published', 'partial'].includes(p.publicationStatus)
    )
    const notConfirmed = projects.filter(p =>
      p.agreementStatus !== 'executed' &&
      p.agreementStatus !== 'likely_executed' &&
      !['construction', 'operating', 'commissioning'].includes(p.stage) &&
      !['published', 'partial'].includes(p.publicationStatus)
    )
    return {
      confirmedCount: confirmed.length,
      confirmedMW: confirmed.reduce((s, p) => s + p.capacityMW, 0),
      notConfirmedCount: notConfirmed.length,
      notConfirmedMW: notConfirmed.reduce((s, p) => s + p.capacityMW, 0),
    }
  }

  // Days since announced helper
  function daysSince(dateStr: string): number {
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
  }

  function toggleRound(id: string) {
    setCollapsedRounds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-5">
      {/* Explainer */}
      {showExplainer && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5 relative">
          <button
            onClick={() => setShowExplainer(false)}
            className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <h3 className="text-sm font-bold text-[var(--color-text)] mb-3">Using Published ESG Commitments as a Proxy for CISA Agreements</h3>

          <div className="space-y-3 text-xs text-[var(--color-text-muted)] leading-relaxed">
            <p>
              <strong className="text-[var(--color-text)]">The problem:</strong> Projects are <em>awarded</em> a CISA/LTESA before they have <em>agreed</em> (executed) one.
              Not all awarded projects end up signing with the government. There is no public register of which projects have actually executed their agreements.
            </p>

            <p>
              <strong className="text-[var(--color-text)]">The proxy:</strong> From CIS Tender 1 onwards, successful proponents must publicly publish their
              First Nations and social licence commitments within <strong className="text-[var(--color-primary)]">20 business days</strong> of
              executing their Capacity Investment Scheme Agreement (CISA). These commitments are contractually binding under
              Merit Criteria 4 (First Nations Engagement) and 7/8 (Social Licence).
            </p>

            <p>
              <strong className="text-[var(--color-text)]">The insight:</strong> If a project was awarded months ago but has no published First Nations
              or community benefit commitments anywhere — not on the proponent's website, not on the FNCEN tracker, not in ASL summaries —
              this may indicate the agreement has not been executed. This is especially significant for projects that remain in early development.
            </p>

            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-3 mt-3">
              <p className="font-semibold text-[var(--color-text)] mb-1.5">Scheme comparison</p>
              <div className="space-y-1.5">
                <p>
                  <strong style={{ color: '#f59e0b' }}>CIS (Federal):</strong> Merit Criteria 4 + 7/8 create binding commitments.
                  Publication within 20 business days of CISA execution. Applies from Tender 1 (Dec 2024) onwards.
                  Pilots had no formal requirement. Tender 5+ adds dedicated First Nations criterion and labour disclosure.
                </p>
                <p>
                  <strong style={{ color: '#8b5cf6' }}>LTESA (NSW):</strong> Aboriginal Participation Plans required under
                  the Electricity Infrastructure Investment Act 2020. Min 1.5% First Nations procurement with 10% stretch goal.
                  First Nations Guidelines issued by the Minister and incorporated into LTESA tender rules by EnergyCo/Consumer Trustee.
                </p>
              </div>
            </div>

            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-3">
              <p className="font-semibold text-[var(--color-text)] mb-1.5">Data sources cross-referenced</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Proponent websites', desc: 'Primary source — hardest to find' },
                  { label: 'FNCEN tracker', desc: 'First Nations Clean Energy Network' },
                  { label: 'ASL summaries', desc: 'AEMO Services tender round results' },
                  { label: 'CEC BPC reports', desc: 'Clean Energy Council Best Practice Charter' },
                  { label: 'DCCEEW/EnergyCo', desc: 'Government announcements' },
                ].map(s => (
                  <span key={s.label} className="text-[10px] px-2 py-1 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]" title={s.desc}>
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {!showExplainer && (
        <button
          onClick={() => setShowExplainer(true)}
          className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
        >
          Show explainer
        </button>
      )}

      {/* Filters */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Scheme</span>
          {(['all', 'CIS', 'LTESA'] as const).map(f => (
            <button
              key={f}
              onClick={() => setSchemeFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                schemeFilter === f
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/20 text-[var(--color-primary)] font-medium'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
              }`}
            >
              {f === 'all' ? 'Both' : f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Publication</span>
          <button
            onClick={() => setStatusFilter('all')}
            className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
              statusFilter === 'all'
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/20 text-[var(--color-primary)] font-medium'
                : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
            }`}
          >
            All
          </button>
          {(['published', 'partial', 'fncen_only', 'not_found', 'too_early'] as PublicationStatus[]).map(s => {
            const cfg = PUB_STATUS_CONFIG[s]
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
                className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
                  statusFilter === s
                    ? 'font-medium border-transparent'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
                }`}
                style={statusFilter === s ? { backgroundColor: `${cfg.color}20`, color: cfg.color } : undefined}
              >
                {cfg.icon} {cfg.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Agreement Confidence — headline */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h3 className="text-sm font-bold text-[var(--color-text)] mb-1">Agreement Confidence Assessment</h3>
        <p className="text-[10px] text-[var(--color-text-muted)] mb-4 leading-relaxed">
          Combining construction/operating status, published ESG commitments, FNCEN listings, and ASL data to determine
          which of the {stats.total} awarded projects ({fmtMW(stats.totalMW)}) we are confident have executed their {schemeFilter === 'all' ? 'CIS/LTESA' : schemeFilter} agreement.
        </p>

        {/* Confidence bar */}
        <div className="flex h-5 rounded-full overflow-hidden bg-[var(--color-bg)] mb-3">
          {stats.confirmedCount > 0 && (
            <div
              className="flex items-center justify-center text-[9px] font-bold text-white"
              style={{ width: `${(stats.confirmedCount / (stats.total || 1)) * 100}%`, backgroundColor: '#22c55e' }}
            >
              {stats.confirmRate}%
            </div>
          )}
          {stats.notConfirmedCount > 0 && (
            <div
              className="flex items-center justify-center text-[9px] font-bold text-white"
              style={{ width: `${(stats.notConfirmedCount / (stats.total || 1)) * 100}%`, backgroundColor: '#ef4444' }}
            >
              {100 - stats.confirmRate}%
            </div>
          )}
        </div>

        {/* Two-column stat blocks */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#22c55e]/5 border border-[#22c55e]/20 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-[#22c55e]">{stats.confirmedCount}</div>
            <div className="text-xs font-medium text-[#22c55e] mt-0.5">Confirmed</div>
            <div className="text-[10px] text-[var(--color-text-muted)] mt-1">{fmtMW(stats.confirmedMW)}</div>
            <div className="text-[9px] text-[var(--color-text-muted)] mt-0.5 leading-relaxed">
              Executed, in construction/operating, or published ESG commitments found
            </div>
          </div>
          <div className="bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-[#ef4444]">{stats.notConfirmedCount}</div>
            <div className="text-xs font-medium text-[#ef4444] mt-0.5">Not Yet Confirmed</div>
            <div className="text-[10px] text-[var(--color-text-muted)] mt-1">{fmtMW(stats.notConfirmedMW)}</div>
            <div className="text-[9px] text-[var(--color-text-muted)] mt-0.5 leading-relaxed">
              Awarded but no construction activity, no publication, or insufficient evidence
            </div>
          </div>
        </div>
      </div>

      {/* Publication summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3 text-center">
          <div className="text-2xl font-bold" style={{ color: stats.pubRate >= 50 ? '#f59e0b' : '#ef4444' }}>
            {stats.pubRate}%
          </div>
          <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Publication rate</div>
          <div className="text-[9px] text-[var(--color-text-muted)]">(published + partial)</div>
        </div>
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-[#ef4444]">{stats.notFound}</div>
          <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Not found</div>
          <div className="text-[9px] text-[var(--color-text-muted)]">{fmtMW(stats.notFoundMW)}</div>
        </div>
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-[#22c55e]">{stats.published + stats.partial}</div>
          <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Published / Partial</div>
          <div className="text-[9px] text-[var(--color-text-muted)]">{fmtMW(stats.publishedMW)}</div>
        </div>
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-[#f59e0b]">{stats.fncenOnly}</div>
          <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">FNCEN only</div>
          <div className="text-[9px] text-[var(--color-text-muted)]">No proponent site</div>
        </div>
      </div>

      {/* Agreement status bar */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
        <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-medium mb-2">
          Inferred agreement status across {stats.total} projects
        </p>
        <div className="flex h-4 rounded-full overflow-hidden bg-[var(--color-bg)]">
          {(() => {
            const executed = filteredProjects.filter(p => p.agreementStatus === 'executed')
            const likely = filteredProjects.filter(p => p.agreementStatus === 'likely_executed')
            const awarded = filteredProjects.filter(p => p.agreementStatus === 'awarded')
            const unk = filteredProjects.filter(p => p.agreementStatus === 'unknown')
            const total = filteredProjects.length || 1
            return (
              <>
                {executed.length > 0 && <div style={{ width: `${executed.length / total * 100}%`, backgroundColor: '#22c55e' }} title={`Executed: ${executed.length}`} />}
                {likely.length > 0 && <div style={{ width: `${likely.length / total * 100}%`, backgroundColor: '#3b82f6' }} title={`Likely Executed: ${likely.length}`} />}
                {awarded.length > 0 && <div style={{ width: `${awarded.length / total * 100}%`, backgroundColor: '#f59e0b' }} title={`Awarded Only: ${awarded.length}`} />}
                {unk.length > 0 && <div style={{ width: `${unk.length / total * 100}%`, backgroundColor: '#636e72' }} title={`Unknown: ${unk.length}`} />}
              </>
            )
          })()}
        </div>
        <div className="flex flex-wrap gap-3 mt-2">
          {(Object.entries(AGR_STATUS_CONFIG) as [AgreementStatus, { label: string; color: string }][]).map(([key, cfg]) => {
            const count = filteredProjects.filter(p => p.agreementStatus === key).length
            if (count === 0) return null
            return (
              <div key={key} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                <span className="text-[10px] text-[var(--color-text-muted)]">{cfg.label} ({count})</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Round-by-round breakdown */}
      <div className="space-y-3">
        {roundGroups.map(group => {
          const collapsed = collapsedRounds.has(group.roundId)
          const schemeColor = group.scheme === 'CIS' ? '#f59e0b' : '#8b5cf6'
          const roundSummary = ROUND_ESG_SUMMARIES.find(r => r.roundId === group.roundId)
          const pubRequired = roundSummary?.publicationRequired ?? false
          const daysAgo = daysSince(group.announced)

          // Stats for this round
          const notFound = group.projects.filter(p => p.publicationStatus === 'not_found').length
          const roundConf = getRoundConfidence(group.projects)
          const roundTotalMW = group.projects.reduce((s, p) => s + p.capacityMW, 0)

          return (
            <div key={group.roundId} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
              <button
                onClick={() => toggleRound(group.roundId)}
                className="w-full text-left p-4 hover:bg-[var(--color-bg)]/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                        style={{ backgroundColor: `${schemeColor}20`, color: schemeColor }}
                      >
                        {group.scheme}
                      </span>
                      <h3 className="text-sm font-semibold text-[var(--color-text)] truncate">{group.round}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-muted)] flex-wrap">
                      <span>Announced {group.announced}</span>
                      <span>·</span>
                      <span>{daysAgo} days ago</span>
                      <span>·</span>
                      <span>{group.projects.length} projects ({fmtMW(roundTotalMW)})</span>
                      {roundSummary?.totalFNCommitmentM && (
                        <>
                          <span>·</span>
                          <span style={{ color: schemeColor }}>${roundSummary.totalFNCommitmentM}M FN commitments</span>
                        </>
                      )}
                    </div>
                    {/* Per-round agreement confidence */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#22c55e]/15 text-[#22c55e]">
                        {roundConf.confirmedCount} confirmed ({fmtMW(roundConf.confirmedMW)})
                      </span>
                      {roundConf.notConfirmedCount > 0 && (
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#ef4444]/15 text-[#ef4444]">
                          {roundConf.notConfirmedCount} not confirmed ({fmtMW(roundConf.notConfirmedMW)})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {pubRequired ? (
                      notFound > 0 ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#ef4444]/20 text-[#ef4444]">
                          {notFound} not published
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#22c55e]/20 text-[#22c55e]">
                          All published
                        </span>
                      )
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#636e72]/20 text-[#636e72]">
                        Not required
                      </span>
                    )}
                    <svg
                      className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform ${collapsed ? '' : 'rotate-180'}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>

                {/* Publication status bar */}
                {pubRequired && (
                  <div className="flex h-2 rounded-full overflow-hidden bg-[var(--color-bg)]">
                    {(['published', 'partial', 'fncen_only', 'not_found', 'too_early', 'exempt'] as PublicationStatus[]).map(status => {
                      const count = group.projects.filter(p => p.publicationStatus === status).length
                      if (count === 0) return null
                      return (
                        <div
                          key={status}
                          style={{ width: `${(count / group.projects.length) * 100}%`, backgroundColor: PUB_STATUS_CONFIG[status].color }}
                          title={`${PUB_STATUS_CONFIG[status].label}: ${count}`}
                        />
                      )
                    })}
                  </div>
                )}

                {/* Merit criteria version */}
                {roundSummary && (
                  <p className="text-[9px] text-[var(--color-text-muted)] mt-1.5 italic">
                    {roundSummary.meritCriteriaVersion}
                  </p>
                )}
              </button>

              {/* Expanded project list */}
              {!collapsed && (
                <div className="border-t border-[var(--color-border)] divide-y divide-[var(--color-border)]/50">
                  {group.projects.map((p, i) => {
                    const pubCfg = PUB_STATUS_CONFIG[p.publicationStatus]
                    const agrCfg = AGR_STATUS_CONFIG[p.agreementStatus]
                    const daysAwarded = daysSince(p.awardAnnouncedDate)

                    return (
                      <div key={`${p.name}-${i}`} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {p.projectId ? (
                                <Link
                                  to={`/projects/${p.projectId}?from=intelligence/scheme-tracker&fromLabel=Back to Scheme Intelligence`}
                                  className="text-xs font-medium text-blue-400 hover:text-blue-300 truncate"
                                >
                                  {p.name}
                                </Link>
                              ) : (
                                <span className="text-xs font-medium text-[var(--color-text)] truncate">{p.name}</span>
                              )}
                              {/* Publication status badge */}
                              <span
                                className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                                style={{ backgroundColor: `${pubCfg.color}20`, color: pubCfg.color }}
                              >
                                {pubCfg.icon} {pubCfg.label}
                              </span>
                              {/* Agreement status */}
                              <span
                                className="text-[9px] px-1.5 py-0.5 rounded-full shrink-0"
                                style={{ backgroundColor: `${agrCfg.color}20`, color: agrCfg.color }}
                              >
                                {agrCfg.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[var(--color-text-muted)] flex-wrap">
                              <span>{p.developer}</span>
                              <span>·</span>
                              <span>{p.state}</span>
                              <span>·</span>
                              <span>{p.capacityMW.toLocaleString()} MW</span>
                              <span>·</span>
                              <span
                                className="px-1.5 py-0 rounded-full"
                                style={{ backgroundColor: `${stageColor(p.stage)}20`, color: stageColor(p.stage) }}
                              >
                                {stageLabel(p.stage)}
                              </span>
                              {daysAwarded > 60 && p.publicationStatus === 'not_found' && pubRequired && (
                                <>
                                  <span>·</span>
                                  <span className="text-[#ef4444] font-medium">{daysAwarded} days since award</span>
                                </>
                              )}
                            </div>
                            {/* Data source indicators */}
                            <div className="flex items-center gap-1.5 mt-1">
                              {p.fncenListed && (
                                <span className="text-[8px] px-1.5 py-0.5 rounded bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                                  FNCEN
                                </span>
                              )}
                              {p.cecCharterSignatory && (
                                <span className="text-[8px] px-1.5 py-0.5 rounded bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                                  CEC BPC
                                </span>
                              )}
                              {p.aslSummaryData && (
                                <span className="text-[8px] px-1.5 py-0.5 rounded bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                                  ASL
                                </span>
                              )}
                              {p.proponentWebsiteUrl && (
                                <a
                                  href={p.proponentWebsiteUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[8px] px-1.5 py-0.5 rounded bg-[#22c55e]/10 border border-[#22c55e]/30 text-[#22c55e] hover:underline"
                                >
                                  Proponent site
                                </a>
                              )}
                            </div>
                            {/* Commitment details */}
                            {p.fnCommitments && p.fnCommitments.length > 0 && (
                              <div className="mt-1.5 text-[10px] text-[var(--color-text-muted)]">
                                {p.fnCommitments.map((c, j) => (
                                  <span key={j} className="inline-block mr-2">
                                    <span className="text-[var(--color-primary)]">&bull;</span> {c}
                                  </span>
                                ))}
                              </div>
                            )}
                            {p.communityBenefitDetails && p.communityBenefitDetails.length > 0 && (
                              <div className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                                {p.communityBenefitDetails.map((c, j) => (
                                  <span key={j} className="inline-block mr-2">
                                    <span style={{ color: schemeColor }}>&bull;</span> {c}
                                  </span>
                                ))}
                              </div>
                            )}
                            {p.notes && (
                              <p className="text-[9px] text-[var(--color-text-muted)] mt-1 italic">{p.notes}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Methodology */}
      <details className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
        <summary className="text-sm font-medium text-[var(--color-text)] cursor-pointer">Methodology & limitations</summary>
        <div className="mt-3 text-xs text-[var(--color-text-muted)] space-y-2">
          <p>
            This tracker cross-references multiple public data sources to infer whether CIS/LTESA projects have executed
            their government agreements. The 20-business-day publication rule for First Nations and social licence
            commitments (applicable from CIS Tender 1 onwards) means that the <em>absence</em> of published commitments
            can be a signal — though not proof — that a CISA has not been executed.
          </p>
          <p><strong className="text-[var(--color-text)]">Limitations:</strong></p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Proponent websites may publish commitments in locations not indexed by search engines</li>
            <li>Some commitments may be published as PDFs within planning documents rather than standalone pages</li>
            <li>The FNCEN tracker aggregates data from government announcements, not from proponent self-reporting</li>
            <li>SPV (Special Purpose Vehicle) structures may not have public-facing websites</li>
            <li>The 20-day rule applies from execution date, not announcement date — execution may occur weeks or months after announcement</li>
            <li>LTESA requirements differ from CIS: Aboriginal Participation Plans under the EII Act 2020 follow different publication pathways</li>
          </ul>
          <p>
            <strong className="text-[var(--color-text)]">Data freshness:</strong> This tracker is based on research conducted in March 2026.
            Proponent websites and the FNCEN tracker should be checked for updates.
          </p>
        </div>
      </details>

      {/* Source note */}
      <div className="text-xs text-[var(--color-text-muted)] italic space-y-0.5">
        <p>
          Sources: DCCEEW CIS tender results, ASL tender round summaries, First Nations Clean Energy Network
          "From Commitment to Delivery" tracker, Clean Energy Council Best Practice Charter reports,
          proponent/developer websites, NSW EnergyCo First Nations Guidelines.
        </p>
        <p>
          CIS tender guidelines: Merit Criteria 4 (First Nations) and 7/8 (Social Licence) per ASL market briefing notes.
          LTESA: Electricity Infrastructure Investment Act 2020, s.4(1) First Nations Guidelines.
        </p>
      </div>
    </div>
  )
}

// ============================================================
// CIS/LTESA Timeline Tab
// ============================================================

interface TimelineRound {
  id: string
  scheme: 'CIS' | 'LTESA'
  name: string
  date: string
  capacityMW: number
  storageMWh: number
  numProjects: number
  targetCOD: string
  headline: string
  insight: string
  notableWinners: string[]
  constructionPct: number
  confirmedPct: number
  confirmedCount: number
  confirmedMW: number
  notConfirmedCount: number
  notConfirmedMW: number
  totalMW: number
}

/** Match a notable winner string to an ESG project and return a status color.
 *  Green (#22c55e)  = construction / operating / commissioning
 *  Amber (#f59e0b)  = confirmed agreement but pre-construction
 *  Muted  (var)      = not confirmed / unknown
 */
function getNotableProjectColor(winnerStr: string, roundId: string): { bullet: string; text: string; label: string } {
  // Extract the project name (everything before the first parenthesis or em-dash)
  const nameMatch = winnerStr.match(/^([^(—]+)/)
  if (!nameMatch) return { bullet: '#636e72', text: 'text-[var(--color-text-muted)]', label: '' }

  const searchName = nameMatch[1].trim().toLowerCase()

  // Find matching project in this round
  const roundProjects = ESG_TRACKER_PROJECTS.filter(p => p.roundId === roundId)
  const match = roundProjects.find(p => {
    const pName = p.name.toLowerCase()
    // Check if either name contains the other, or they share a significant prefix
    return pName.includes(searchName) || searchName.includes(pName) ||
      // Also match on first 2+ significant words
      searchName.split(/\s+/).slice(0, 2).join(' ') === pName.split(/\s+/).slice(0, 2).join(' ')
  })

  if (!match) return { bullet: '#636e72', text: 'text-[var(--color-text-muted)]', label: '' }

  if (['construction', 'commissioning'].includes(match.stage)) {
    return { bullet: '#3b82f6', text: 'text-blue-400', label: 'Construction' }
  }
  if (match.stage === 'operating') {
    return { bullet: '#22c55e', text: 'text-emerald-400', label: 'Operating' }
  }
  if (match.agreementStatus === 'executed' || match.agreementStatus === 'likely_executed') {
    return { bullet: '#22c55e', text: 'text-emerald-400/80', label: 'Confirmed' }
  }
  if (match.agreementStatus === 'awarded') {
    return { bullet: '#f59e0b', text: 'text-amber-400/80', label: 'Awarded' }
  }
  return { bullet: '#636e72', text: 'text-[var(--color-text-muted)]', label: '' }
}

// ============================================================
// CIS Success Tab
// ============================================================

type CISSortCol = 'name' | 'reason' | 'technology' | 'developer' | 'capacityMW' | 'state' | 'round' | 'awardDate' | 'months'

function buildTechLookup(): Record<string, string> {
  const map: Record<string, string> = {}
  for (const projects of Object.values(CIS_PROJECTS)) {
    for (const p of projects) {
      if (p.project_id) map[p.project_id] = p.technology
    }
  }
  for (const projects of Object.values(LTESA_PROJECTS)) {
    for (const p of projects) {
      if (p.project_id) map[p.project_id] = p.technology
    }
  }
  return map
}

function getConfirmReason(p: ESGTrackerProject): string | null {
  if (p.stage === 'operating') return 'Operating'
  if (p.stage === 'construction') return 'Construction'
  if (p.stage === 'commissioning') return 'Commissioning'
  if (p.agreementStatus === 'executed') return 'Executed'
  if (p.agreementStatus === 'likely_executed') return 'Likely Executed'
  return null
}

function monthsSinceAward(awardDate: string): number {
  const award = new Date(awardDate)
  const now = new Date()
  return (now.getFullYear() - award.getFullYear()) * 12 + (now.getMonth() - award.getMonth())
}

function formatAwardDate(d: string): string {
  const dt = new Date(d)
  return dt.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })
}

type CISDetailView = null | 'confirmed' | 'likely-failed' | 'may-be-negotiating'

function CISSuccessTab() {
  const [showConfirmed, setShowConfirmed] = useState(false)
  const [showNotConfirmed, setShowNotConfirmed] = useState(false)
  const [confirmedSort, setConfirmedSort] = useState<{ col: CISSortCol; dir: 'asc' | 'desc' }>({ col: 'round', dir: 'asc' })
  const [notConfirmedSort, setNotConfirmedSort] = useState<{ col: CISSortCol; dir: 'asc' | 'desc' }>({ col: 'months', dir: 'desc' })
  const [threshold, setThreshold] = useState(6)
  const [detailView, setDetailView] = useState<CISDetailView>(null)

  const techLookup = useMemo(() => buildTechLookup(), [])

  // CIS-only projects
  const cisProjects = useMemo(() => ESG_TRACKER_PROJECTS.filter(p => p.scheme === 'CIS'), [])

  // Build round name lookup from ROUND_ESG_SUMMARIES
  const roundNameMap = useMemo(() => {
    const m: Record<string, string> = {}
    for (const r of ROUND_ESG_SUMMARIES) m[r.roundId] = r.round
    return m
  }, [])

  // Split projects into confirmed / not confirmed
  const { confirmed, notConfirmed, totalMW, confirmedMW, roundCount } = useMemo(() => {
    const conf: (ESGTrackerProject & { reason: string })[] = []
    const notConf: ESGTrackerProject[] = []
    const rounds = new Set<string>()
    let totalMW = 0
    let confirmedMW = 0

    for (const p of cisProjects) {
      rounds.add(p.roundId)
      totalMW += p.capacityMW
      const reason = getConfirmReason(p)
      if (reason) {
        conf.push({ ...p, reason })
        confirmedMW += p.capacityMW
      } else {
        notConf.push(p)
      }
    }

    return { confirmed: conf, notConfirmed: notConf, totalMW, confirmedMW, roundCount: rounds.size }
  }, [cisProjects])

  // Sort helpers
  const sortProjects = useCallback(<T extends ESGTrackerProject & { reason?: string }>(list: T[], sort: { col: CISSortCol; dir: 'asc' | 'desc' }) => {
    const sorted = [...list]
    const dir = sort.dir === 'asc' ? 1 : -1
    sorted.sort((a, b) => {
      switch (sort.col) {
        case 'name': return dir * a.name.localeCompare(b.name)
        case 'reason': return dir * ((a as { reason?: string }).reason ?? '').localeCompare((b as { reason?: string }).reason ?? '')
        case 'technology': {
          const ta = (a.projectId ? techLookup[a.projectId] : '') ?? ''
          const tb = (b.projectId ? techLookup[b.projectId] : '') ?? ''
          return dir * ta.localeCompare(tb)
        }
        case 'developer': return dir * a.developer.localeCompare(b.developer)
        case 'capacityMW': return dir * (a.capacityMW - b.capacityMW)
        case 'state': return dir * a.state.localeCompare(b.state)
        case 'round': return dir * a.round.localeCompare(b.round)
        case 'awardDate': return dir * a.awardAnnouncedDate.localeCompare(b.awardAnnouncedDate)
        case 'months': return dir * (monthsSinceAward(a.awardAnnouncedDate) - monthsSinceAward(b.awardAnnouncedDate))
        default: return 0
      }
    })
    return sorted
  }, [techLookup])

  const sortedConfirmed = useMemo(() => sortProjects(confirmed, confirmedSort), [confirmed, confirmedSort, sortProjects])
  const sortedNotConfirmed = useMemo(() => sortProjects(notConfirmed, notConfirmedSort), [notConfirmed, notConfirmedSort, sortProjects])

  // Assumption analyzer groups
  const analyzerGroups = useMemo(() => {
    const likelyFailed: ESGTrackerProject[] = []
    const mayBeNegotiating: ESGTrackerProject[] = []

    for (const p of notConfirmed) {
      const months = monthsSinceAward(p.awardAnnouncedDate)
      if (months > threshold) {
        likelyFailed.push(p)
      } else {
        mayBeNegotiating.push(p)
      }
    }

    return { likelyFailed, mayBeNegotiating }
  }, [notConfirmed, threshold])

  // Breakdown helper
  const getBreakdown = useCallback((projects: ESGTrackerProject[]) => {
    const byState: Record<string, { count: number; mw: number }> = {}
    const byTech: Record<string, { count: number; mw: number }> = {}
    const byRound: Record<string, { count: number; mw: number }> = {}

    for (const p of projects) {
      // State
      if (!byState[p.state]) byState[p.state] = { count: 0, mw: 0 }
      byState[p.state].count++
      byState[p.state].mw += p.capacityMW

      // Technology
      const tech = (p.projectId ? techLookup[p.projectId] : null) ?? 'unknown'
      const techLabel = formatTech(tech)
      if (!byTech[techLabel]) byTech[techLabel] = { count: 0, mw: 0 }
      byTech[techLabel].count++
      byTech[techLabel].mw += p.capacityMW

      // Round
      const roundName = roundNameMap[p.roundId] ?? p.round
      if (!byRound[roundName]) byRound[roundName] = { count: 0, mw: 0 }
      byRound[roundName].count++
      byRound[roundName].mw += p.capacityMW
    }

    return { byState, byTech, byRound }
  }, [techLookup, roundNameMap])

  const toggleConfirmedSort = (col: CISSortCol) => {
    setConfirmedSort(prev => ({
      col,
      dir: prev.col === col && prev.dir === 'asc' ? 'desc' : 'asc',
    }))
  }

  const toggleNotConfirmedSort = (col: CISSortCol) => {
    setNotConfirmedSort(prev => ({
      col,
      dir: prev.col === col && prev.dir === 'asc' ? 'desc' : 'asc',
    }))
  }

  const SortArrow = ({ col, current }: { col: CISSortCol; current: { col: CISSortCol; dir: 'asc' | 'desc' } }) => (
    <span className="ml-0.5 text-[10px]">{current.col === col ? (current.dir === 'asc' ? '▲' : '▼') : '⇅'}</span>
  )

  const BreakdownPills = ({ data }: { data: Record<string, { count: number; mw: number }> }) => (
    <div className="flex flex-wrap gap-1">
      {Object.entries(data).sort((a, b) => b[1].mw - a[1].mw).map(([label, { count, mw }]) => (
        <span key={label} className="inline-flex items-center gap-1 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]">
          {label} <span className="font-medium text-[var(--color-text)]">{count}</span> <span className="opacity-60">({fmtMW(mw)})</span>
        </span>
      ))}
    </div>
  )

  const pctCount = cisProjects.length > 0 ? ((confirmed.length / cisProjects.length) * 100).toFixed(0) : '0'
  const pctMW = totalMW > 0 ? ((confirmedMW / totalMW) * 100).toFixed(0) : '0'

  // Detail view project list helper
  const detailViewProjects = useMemo(() => {
    if (detailView === 'confirmed') return confirmed
    if (detailView === 'likely-failed') return analyzerGroups.likelyFailed
    if (detailView === 'may-be-negotiating') return analyzerGroups.mayBeNegotiating
    return []
  }, [detailView, confirmed, analyzerGroups])

  const detailViewLabel = detailView === 'confirmed' ? 'Confirmed CISA'
    : detailView === 'likely-failed' ? 'Likely Failed'
    : detailView === 'may-be-negotiating' ? 'May Be Negotiating'
    : ''

  const detailViewColor = detailView === 'confirmed' ? '#22c55e'
    : detailView === 'likely-failed' ? '#ef4444'
    : '#f59e0b'

  return (
    <div className="space-y-4">
      {/* Section A: Summary Stats */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">CIS — CISA Confirmation Summary</h3>
        <p className="text-[10px] text-[var(--color-text-muted)] mb-3">CIS projects only (excludes LTESA rounds)</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">CIS Projects</div>
            <div className="text-lg font-bold text-[var(--color-text)]">{cisProjects.length}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">Rounds</div>
            <div className="text-lg font-bold text-[var(--color-text)]">{roundCount}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">Confirmed CISA</div>
            <div className="text-lg font-bold text-emerald-400">{confirmed.length}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">Confirmed MW</div>
            <div className="text-lg font-bold text-emerald-400">{fmtMW(confirmedMW)}</div>
            <div className="text-[10px] text-[var(--color-text-muted)]">of {fmtMW(totalMW)} awarded</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">% Confirmed (Count)</div>
            <div className="text-lg font-bold text-[var(--color-text)]">{pctCount}%</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">% Confirmed (MW)</div>
            <div className="text-lg font-bold text-[var(--color-text)]">{pctMW}%</div>
          </div>
        </div>
      </div>

      {/* Senate Estimates Callout */}
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
        <div className="flex items-start gap-3">
          <span className="text-lg mt-0.5 shrink-0">🏛️</span>
          <div className="space-y-2 text-xs text-[var(--color-text-secondary)]">
            <div className="text-sm font-semibold text-blue-400">Senate Estimates — DCCEEW Contract Status</div>
            <p>
              At <strong>Supplementary Estimates</strong> (1 Dec 2025), Mr Matthew Brine (Head of Division, Clean Energy Investment &amp; Facilitation, DCCEEW) testified that <strong>63 projects totalling 18.2 GW</strong> had been awarded CIS contracts — 37 generation (12.2 GW) and 26 storage (6 GW / 22.2 GWh). Of these, only <strong>22 projects (6.5 GW) had executed CISAs</strong>, with 41 still in negotiation. CISAs are 15-year agreements requiring detailed contractual negotiation post-award. Many projects still need environmental/planning approvals, contractor procurement, and in some cases FIRB approval.
            </p>
            <p>
              At <strong>Additional Estimates</strong> (9 Feb 2026), Mr Brine provided further detail on costs and progress. Departmental funding for running the scheme totals <strong>$252.2M</strong> ($200.2M initial + $34.9M for oversubscribed tender assessment + $17.1M for contract management). Tenders were <strong>10&times; oversubscribed</strong> in Tender 1 and 4&ndash;5&times; in subsequent rounds. The underwriting cost (administered side) remains &ldquo;not for publication&rdquo; to maintain competitive tension &mdash; Mr Brine noted if the 40 GW target cost was disclosed, &ldquo;you could just divide that by 40, and that&rsquo;s what people would bid in.&rdquo;
            </p>
            <p>
              Ms Alison Wiltshire (Branch Head, CIS Delivery &amp; Governance) confirmed <strong>~9 projects had reached financial close</strong> among those with executed CISAs. Mr Brine noted CIS deliberately targets early-stage projects: &ldquo;If they&rsquo;re at financial close, they probably don&rsquo;t need a lot of support from the federal government.&rdquo; Most signed projects expected to reach financial close in calendar year 2026. Upon signing, proponents have <strong>20 days to lodge a project bond</strong>; failure to deliver can result in bond forfeiture and re-tendering.
            </p>
            <p>
              <strong>Count reconciliation:</strong> AURES tracks <strong>71 CIS projects</strong> across 6 rounds, but Brine&apos;s testimony cited <strong>63 projects</strong>. The 26 storage projects (Pilot SA/VIC 6 + Tender 2 WEM 4 + Tender 3 NEM 16) match exactly. The gap is: (a) the <strong>6 Pilot NSW projects are excluded</strong> — these were co-delivered under the NSW Electricity Infrastructure Roadmap (LTESA Round 2) using a firming LTESA mechanism rather than the standard CISA, so DCCEEW may not count them as &quot;CIS&quot;; and (b) <strong>2 generation projects</strong> from Tender 1 (19) or Tender 4 (20) appear absent from Brine&apos;s 37 generation count — the reason is not confirmed.
            </p>
            <div className="mt-2 overflow-x-auto">
              <table className="text-[10px] border-collapse">
                <thead>
                  <tr className="text-[var(--color-text-muted)]">
                    <th className="pr-3 py-0.5 text-left font-medium">Date</th>
                    <th className="pr-3 py-0.5 text-right font-medium">Executed</th>
                    <th className="pr-3 py-0.5 text-right font-medium">GW</th>
                    <th className="pr-3 py-0.5 text-right font-medium">Fin. Close</th>
                    <th className="py-0.5 text-left font-medium">Source</th>
                  </tr>
                </thead>
                <tbody className="text-[var(--color-text)]">
                  <tr><td className="pr-3 py-0.5">Aug 2025</td><td className="pr-3 py-0.5 text-right">19</td><td className="pr-3 py-0.5 text-right">5.85</td><td className="pr-3 py-0.5 text-right">—</td><td className="py-0.5 text-[var(--color-text-muted)]">DCCEEW website</td></tr>
                  <tr><td className="pr-3 py-0.5">1 Dec 2025</td><td className="pr-3 py-0.5 text-right">22</td><td className="pr-3 py-0.5 text-right">6.5</td><td className="pr-3 py-0.5 text-right">—</td><td className="py-0.5 text-[var(--color-text-muted)]">Supp. Estimates (Mr Brine)</td></tr>
                  <tr><td className="pr-3 py-0.5">5 Feb 2026</td><td className="pr-3 py-0.5 text-right">23</td><td className="pr-3 py-0.5 text-right">7.0</td><td className="pr-3 py-0.5 text-right">—</td><td className="py-0.5 text-[var(--color-text-muted)]">Senate debate (Min. Gallagher)</td></tr>
                  <tr><td className="pr-3 py-0.5">9 Feb 2026</td><td className="pr-3 py-0.5 text-right">—</td><td className="pr-3 py-0.5 text-right">—</td><td className="pr-3 py-0.5 text-right">~9</td><td className="py-0.5 text-[var(--color-text-muted)]">Add. Estimates (Ms Wiltshire)</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
              Sources: <a href="https://www.aph.gov.au/Parliamentary_Business/Hansard/Hansard_Display?bid=committees/estimate/29007/&sid=0001" target="_blank" rel="noopener" className="text-blue-400/70 hover:underline">Hansard 1/12/25</a> &bull; <a href="https://www.aph.gov.au/Parliamentary_Business/Senate_estimates/ec/2025-26_Additional_Estimates" target="_blank" rel="noopener" className="text-blue-400/70 hover:underline">Hansard 9/2/26</a> &bull; <a href="https://www.openaustralia.org.au/senate/?id=2026-02-05.130.1&m=100241" target="_blank" rel="noopener" className="text-blue-400/70 hover:underline">Senate 5/2/26</a> &bull; Next: Budget Estimates 25–28 May 2026
            </p>
          </div>
        </div>
      </div>

      {/* Section B: Confirmed CISA Table */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)]">
        <button
          onClick={() => setShowConfirmed(v => !v)}
          className="w-full flex items-center justify-between p-3 text-left hover:bg-white/5 transition-colors"
        >
          <span className="text-sm font-semibold text-emerald-400">
            Confirmed CISA — {confirmed.length} projects ({fmtMW(confirmedMW)})
          </span>
          <span className="text-xs text-[var(--color-text-muted)]">{showConfirmed ? '▲ Collapse' : '▼ Expand'}</span>
        </button>
        {showConfirmed && (
          <ScrollableTable>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-t border-[var(--color-border)] text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">
                  <th className="px-2 py-1.5 text-left cursor-pointer" onClick={() => toggleConfirmedSort('name')}>Project<SortArrow col="name" current={confirmedSort} /></th>
                  <th className="px-2 py-1.5 text-left cursor-pointer" onClick={() => toggleConfirmedSort('reason')}>Reason<SortArrow col="reason" current={confirmedSort} /></th>
                  <th className="px-2 py-1.5 text-left cursor-pointer" onClick={() => toggleConfirmedSort('technology')}>Tech<SortArrow col="technology" current={confirmedSort} /></th>
                  <th className="px-2 py-1.5 text-left cursor-pointer" onClick={() => toggleConfirmedSort('developer')}>Developer<SortArrow col="developer" current={confirmedSort} /></th>
                  <th className="px-2 py-1.5 text-right cursor-pointer" onClick={() => toggleConfirmedSort('capacityMW')}>MW<SortArrow col="capacityMW" current={confirmedSort} /></th>
                  <th className="px-2 py-1.5 text-left cursor-pointer" onClick={() => toggleConfirmedSort('state')}>State<SortArrow col="state" current={confirmedSort} /></th>
                  <th className="px-2 py-1.5 text-left cursor-pointer" onClick={() => toggleConfirmedSort('round')}>Round<SortArrow col="round" current={confirmedSort} /></th>
                  <th className="px-2 py-1.5 text-left cursor-pointer" onClick={() => toggleConfirmedSort('awardDate')}>Awarded<SortArrow col="awardDate" current={confirmedSort} /></th>
                </tr>
              </thead>
              <tbody>
                {sortedConfirmed.map((p, i) => (
                  <tr key={i} className="border-t border-[var(--color-border)]/50 hover:bg-white/5">
                    <td className="px-2 py-1">
                      {p.projectId ? (
                        <Link to={`/projects/${p.projectId}`} className="text-blue-400 hover:underline">{p.name}</Link>
                      ) : (
                        <span className="text-[var(--color-text)]">{p.name}</span>
                      )}
                    </td>
                    <td className="px-2 py-1 text-emerald-400">{p.reason}</td>
                    <td className="px-2 py-1 text-[var(--color-text-muted)]">{p.projectId && techLookup[p.projectId] ? formatTech(techLookup[p.projectId]) : 'Unknown'}</td>
                    <td className="px-2 py-1 text-[var(--color-text-muted)]">{p.developer}</td>
                    <td className="px-2 py-1 text-right text-[var(--color-text)]">{Math.round(p.capacityMW)}</td>
                    <td className="px-2 py-1 text-[var(--color-text-muted)]">{p.state}</td>
                    <td className="px-2 py-1 text-[var(--color-text-muted)] text-[10px]">{roundNameMap[p.roundId] ?? p.round}</td>
                    <td className="px-2 py-1 text-[var(--color-text-muted)]">{formatAwardDate(p.awardAnnouncedDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollableTable>
        )}
      </div>

      {/* Section C: Not Confirmed Table */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)]">
        <button
          onClick={() => setShowNotConfirmed(v => !v)}
          className="w-full flex items-center justify-between p-3 text-left hover:bg-white/5 transition-colors"
        >
          <span className="text-sm font-semibold text-amber-400">
            Not Confirmed — {notConfirmed.length} projects ({fmtMW(notConfirmed.reduce((s, p) => s + p.capacityMW, 0))})
          </span>
          <span className="text-xs text-[var(--color-text-muted)]">{showNotConfirmed ? '▲ Collapse' : '▼ Expand'}</span>
        </button>
        {showNotConfirmed && (
          <ScrollableTable>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-t border-[var(--color-border)] text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">
                  <th className="px-2 py-1.5 text-left cursor-pointer" onClick={() => toggleNotConfirmedSort('name')}>Project<SortArrow col="name" current={notConfirmedSort} /></th>
                  <th className="px-2 py-1.5 text-right cursor-pointer" onClick={() => toggleNotConfirmedSort('months')}>Months<SortArrow col="months" current={notConfirmedSort} /></th>
                  <th className="px-2 py-1.5 text-left cursor-pointer" onClick={() => toggleNotConfirmedSort('technology')}>Tech<SortArrow col="technology" current={notConfirmedSort} /></th>
                  <th className="px-2 py-1.5 text-left cursor-pointer" onClick={() => toggleNotConfirmedSort('developer')}>Developer<SortArrow col="developer" current={notConfirmedSort} /></th>
                  <th className="px-2 py-1.5 text-right cursor-pointer" onClick={() => toggleNotConfirmedSort('capacityMW')}>MW<SortArrow col="capacityMW" current={notConfirmedSort} /></th>
                  <th className="px-2 py-1.5 text-left cursor-pointer" onClick={() => toggleNotConfirmedSort('state')}>State<SortArrow col="state" current={notConfirmedSort} /></th>
                  <th className="px-2 py-1.5 text-left cursor-pointer" onClick={() => toggleNotConfirmedSort('round')}>Round<SortArrow col="round" current={notConfirmedSort} /></th>
                  <th className="px-2 py-1.5 text-left cursor-pointer" onClick={() => toggleNotConfirmedSort('awardDate')}>Awarded<SortArrow col="awardDate" current={notConfirmedSort} /></th>
                </tr>
              </thead>
              <tbody>
                {sortedNotConfirmed.map((p, i) => {
                  const months = monthsSinceAward(p.awardAnnouncedDate)
                  const monthColor = months > 12 ? 'text-red-400' : months >= 6 ? 'text-amber-400' : 'text-emerald-400'
                  return (
                    <tr key={i} className="border-t border-[var(--color-border)]/50 hover:bg-white/5">
                      <td className="px-2 py-1">
                        {p.projectId ? (
                          <Link to={`/projects/${p.projectId}`} className="text-blue-400 hover:underline">{p.name}</Link>
                        ) : (
                          <span className="text-[var(--color-text)]">{p.name}</span>
                        )}
                      </td>
                      <td className={`px-2 py-1 text-right font-medium ${monthColor}`}>{months}</td>
                      <td className="px-2 py-1 text-[var(--color-text-muted)]">{p.projectId && techLookup[p.projectId] ? formatTech(techLookup[p.projectId]) : 'Unknown'}</td>
                      <td className="px-2 py-1 text-[var(--color-text-muted)]">{p.developer}</td>
                      <td className="px-2 py-1 text-right text-[var(--color-text)]">{Math.round(p.capacityMW)}</td>
                      <td className="px-2 py-1 text-[var(--color-text-muted)]">{p.state}</td>
                      <td className="px-2 py-1 text-[var(--color-text-muted)] text-[10px]">{roundNameMap[p.roundId] ?? p.round}</td>
                      <td className="px-2 py-1 text-[var(--color-text-muted)]">{formatAwardDate(p.awardAnnouncedDate)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </ScrollableTable>
        )}
      </div>

      {/* Section D: CISA Assumption Analyzer */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">CISA Assumption Analyzer</h3>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[var(--color-text-muted)] mr-1">Assumed months to execute:</span>
            {[3, 4, 5, 6].map(m => (
              <button
                key={m}
                onClick={() => setThreshold(m)}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  threshold === m
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/5 text-[var(--color-text-muted)] hover:bg-white/10'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <p className="text-[10px] text-[var(--color-text-muted)]">
          If a project was awarded more than {threshold} months ago and has not confirmed a CISA, it is assumed to have likely failed.
        </p>

        {/* Three group cards — kept as detailed breakdown */}
        <div className="grid gap-3 lg:grid-cols-3">
          {/* Confirmed */}
          {(() => {
            const bd = getBreakdown(confirmed)
            return (
              <div className="rounded-lg border-l-4 border-[var(--color-border)] bg-white/5 p-3 space-y-2" style={{ borderLeftColor: '#22c55e' }}>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold" style={{ color: '#22c55e' }}>Confirmed CISA</span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">{confirmed.length} projects · {fmtMW(confirmedMW)}</span>
                </div>
                <div className="space-y-1.5">
                  <div>
                    <div className="text-[10px] text-[var(--color-text-muted)] mb-0.5">By State</div>
                    <BreakdownPills data={bd.byState} />
                  </div>
                  <div>
                    <div className="text-[10px] text-[var(--color-text-muted)] mb-0.5">By Technology</div>
                    <BreakdownPills data={bd.byTech} />
                  </div>
                  <div>
                    <div className="text-[10px] text-[var(--color-text-muted)] mb-0.5">By Round</div>
                    <BreakdownPills data={bd.byRound} />
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Likely Failed */}
          {(() => {
            const bd = getBreakdown(analyzerGroups.likelyFailed)
            const mw = analyzerGroups.likelyFailed.reduce((s, p) => s + p.capacityMW, 0)
            return (
              <div className="rounded-lg border-l-4 border-[var(--color-border)] bg-white/5 p-3 space-y-2" style={{ borderLeftColor: '#ef4444' }}>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold" style={{ color: '#ef4444' }}>Likely Failed</span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">{analyzerGroups.likelyFailed.length} projects · {fmtMW(mw)}</span>
                </div>
                <div className="space-y-1.5">
                  <div>
                    <div className="text-[10px] text-[var(--color-text-muted)] mb-0.5">By State</div>
                    <BreakdownPills data={bd.byState} />
                  </div>
                  <div>
                    <div className="text-[10px] text-[var(--color-text-muted)] mb-0.5">By Technology</div>
                    <BreakdownPills data={bd.byTech} />
                  </div>
                  <div>
                    <div className="text-[10px] text-[var(--color-text-muted)] mb-0.5">By Round</div>
                    <BreakdownPills data={bd.byRound} />
                  </div>
                </div>
              </div>
            )
          })()}

          {/* May Be Negotiating */}
          {(() => {
            const bd = getBreakdown(analyzerGroups.mayBeNegotiating)
            const mw = analyzerGroups.mayBeNegotiating.reduce((s, p) => s + p.capacityMW, 0)
            return (
              <div className="rounded-lg border-l-4 border-[var(--color-border)] bg-white/5 p-3 space-y-2" style={{ borderLeftColor: '#f59e0b' }}>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold" style={{ color: '#f59e0b' }}>May Be Negotiating</span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">{analyzerGroups.mayBeNegotiating.length} projects · {fmtMW(mw)}</span>
                </div>
                <div className="space-y-1.5">
                  <div>
                    <div className="text-[10px] text-[var(--color-text-muted)] mb-0.5">By State</div>
                    <BreakdownPills data={bd.byState} />
                  </div>
                  <div>
                    <div className="text-[10px] text-[var(--color-text-muted)] mb-0.5">By Technology</div>
                    <BreakdownPills data={bd.byTech} />
                  </div>
                  <div>
                    <div className="text-[10px] text-[var(--color-text-muted)] mb-0.5">By Round</div>
                    <BreakdownPills data={bd.byRound} />
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {/* Section E: Headline Summary Boxes (Timeline-style) */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h3 className="text-sm font-bold text-[var(--color-text)] mb-1">CIS Contract Status — At a Glance</h3>
        <p className="text-[10px] text-[var(--color-text-muted)] mb-4">
          Based on {threshold}-month assumed execution window. Click any box to view project details.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-[var(--color-text)]">{cisProjects.length}</div>
            <div className="text-[10px] text-[var(--color-text-muted)]">CIS Projects</div>
            <div className="text-[9px] text-[var(--color-text-muted)]">{fmtMW(totalMW)}</div>
          </div>
          <button
            onClick={() => setDetailView(detailView === 'confirmed' ? null : 'confirmed')}
            className={`bg-[var(--color-bg)] border rounded-xl p-3 text-center transition-all hover:bg-white/5 ${detailView === 'confirmed' ? 'border-[#22c55e] ring-1 ring-[#22c55e]/30' : 'border-[var(--color-border)]'}`}
          >
            <div className="text-2xl font-bold text-[#22c55e]">{confirmed.length}</div>
            <div className="text-[10px] text-[var(--color-text-muted)]">Confirmed CISA</div>
            <div className="text-[9px] text-[var(--color-text-muted)]">{fmtMW(confirmedMW)} ({pctMW}%)</div>
          </button>
          <button
            onClick={() => setDetailView(detailView === 'likely-failed' ? null : 'likely-failed')}
            className={`bg-[var(--color-bg)] border rounded-xl p-3 text-center transition-all hover:bg-white/5 ${detailView === 'likely-failed' ? 'border-[#ef4444] ring-1 ring-[#ef4444]/30' : 'border-[var(--color-border)]'}`}
          >
            <div className="text-2xl font-bold text-[#ef4444]">{analyzerGroups.likelyFailed.length}</div>
            <div className="text-[10px] text-[var(--color-text-muted)]">Likely Failed</div>
            <div className="text-[9px] text-[var(--color-text-muted)]">{fmtMW(analyzerGroups.likelyFailed.reduce((s, p) => s + p.capacityMW, 0))} (&gt;{threshold} months)</div>
          </button>
          <button
            onClick={() => setDetailView(detailView === 'may-be-negotiating' ? null : 'may-be-negotiating')}
            className={`bg-[var(--color-bg)] border rounded-xl p-3 text-center transition-all hover:bg-white/5 ${detailView === 'may-be-negotiating' ? 'border-[#f59e0b] ring-1 ring-[#f59e0b]/30' : 'border-[var(--color-border)]'}`}
          >
            <div className="text-2xl font-bold text-[#f59e0b]">{analyzerGroups.mayBeNegotiating.length}</div>
            <div className="text-[10px] text-[var(--color-text-muted)]">May Be Negotiating</div>
            <div className="text-[9px] text-[var(--color-text-muted)]">{fmtMW(analyzerGroups.mayBeNegotiating.reduce((s, p) => s + p.capacityMW, 0))} (&le;{threshold} months)</div>
          </button>
        </div>
      </div>

      {/* Section F: Detail View (when a summary box is clicked) */}
      {detailView && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)]">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 px-4 pt-3 pb-1">
            <button
              onClick={() => setDetailView(null)}
              className="text-[10px] text-blue-400 hover:underline"
            >
              CIS Success
            </button>
            <span className="text-[10px] text-[var(--color-text-muted)]">/</span>
            <span className="text-[10px] font-medium" style={{ color: detailViewColor }}>{detailViewLabel}</span>
          </div>

          <div className="px-4 pb-1">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold" style={{ color: detailViewColor }}>
                {detailViewLabel} — {detailViewProjects.length} projects ({fmtMW(detailViewProjects.reduce((s, p) => s + p.capacityMW, 0))})
              </span>
              <button
                onClick={() => setDetailView(null)}
                className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                Close
              </button>
            </div>
          </div>

          <ScrollableTable>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-t border-[var(--color-border)] text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">
                  <th className="px-2 py-1.5 text-left">Project</th>
                  {detailView === 'confirmed' && <th className="px-2 py-1.5 text-left">Reason</th>}
                  {detailView !== 'confirmed' && <th className="px-2 py-1.5 text-right">Months</th>}
                  <th className="px-2 py-1.5 text-left">Tech</th>
                  <th className="px-2 py-1.5 text-left">Developer</th>
                  <th className="px-2 py-1.5 text-right">MW</th>
                  <th className="px-2 py-1.5 text-left">State</th>
                  <th className="px-2 py-1.5 text-left">Round</th>
                  <th className="px-2 py-1.5 text-left">Awarded</th>
                </tr>
              </thead>
              <tbody>
                {detailViewProjects.map((p, i) => {
                  const months = monthsSinceAward(p.awardAnnouncedDate)
                  const monthColor = months > 12 ? 'text-red-400' : months >= 6 ? 'text-amber-400' : 'text-emerald-400'
                  return (
                    <tr key={i} className="border-t border-[var(--color-border)]/50 hover:bg-white/5">
                      <td className="px-2 py-1">
                        {p.projectId ? (
                          <Link to={`/projects/${p.projectId}`} className="text-blue-400 hover:underline">{p.name}</Link>
                        ) : (
                          <span className="text-[var(--color-text)]">{p.name}</span>
                        )}
                      </td>
                      {detailView === 'confirmed' && (
                        <td className="px-2 py-1 text-emerald-400">{(p as { reason?: string }).reason}</td>
                      )}
                      {detailView !== 'confirmed' && (
                        <td className={`px-2 py-1 text-right font-medium ${monthColor}`}>{months}</td>
                      )}
                      <td className="px-2 py-1 text-[var(--color-text-muted)]">{p.projectId && techLookup[p.projectId] ? formatTech(techLookup[p.projectId]) : 'Unknown'}</td>
                      <td className="px-2 py-1 text-[var(--color-text-muted)]">{p.developer}</td>
                      <td className="px-2 py-1 text-right text-[var(--color-text)]">{Math.round(p.capacityMW)}</td>
                      <td className="px-2 py-1 text-[var(--color-text-muted)]">{p.state}</td>
                      <td className="px-2 py-1 text-[var(--color-text-muted)] text-[10px]">{roundNameMap[p.roundId] ?? p.round}</td>
                      <td className="px-2 py-1 text-[var(--color-text-muted)]">{formatAwardDate(p.awardAnnouncedDate)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </ScrollableTable>
        </div>
      )}
    </div>
  )
}

// ============================================================
// CIS Briefing Tab — Executive briefing with interactive visuals
// ============================================================

const BRIEFING_TECH_COLORS: Record<string, string> = {
  bess: '#8b5cf6',
  solar: '#f59e0b',
  wind: '#3b82f6',
  hybrid: '#10b981',
  vpp: '#6b7280',
}

function CISBriefingTab() {

  // CIS-only ESG projects
  const cisProjects = useMemo(() => ESG_TRACKER_PROJECTS.filter(p => p.scheme === 'CIS'), [])

  // Round name lookup
  const roundNameMap = useMemo(() => {
    const m: Record<string, string> = {}
    for (const r of ROUND_ESG_SUMMARIES) m[r.roundId] = r.round
    return m
  }, [])

  // All CIS scheme-rounds projects flattened with round info
  const allCisSchemeProjects = useMemo(() => {
    const result: (SchemeProject & { roundId: string; roundName: string })[] = []
    for (const [roundId, projects] of Object.entries(CIS_PROJECTS)) {
      const round = CIS_ROUNDS.find(r => r.id === roundId)
      const roundName = round?.name ?? roundId
      for (const p of projects) {
        result.push({ ...p, roundId, roundName })
      }
    }
    return result
  }, [])

  // ---- Section 1 data ----
  const section1 = useMemo(() => {
    const conf: (ESGTrackerProject & { reason: string })[] = []
    const notConf: ESGTrackerProject[] = []
    let totalMW = 0
    let confirmedMW = 0

    for (const p of cisProjects) {
      totalMW += p.capacityMW
      const reason = getConfirmReason(p)
      if (reason) {
        conf.push({ ...p, reason })
        confirmedMW += p.capacityMW
      } else {
        notConf.push(p)
      }
    }

    // Per-round breakdown for horizontal bar
    const roundIds = [...new Set(cisProjects.map(p => p.roundId))]
    const roundBars = roundIds.map(rid => {
      const rProjects = cisProjects.filter(p => p.roundId === rid)
      let operating = 0
      let negotiating = 0
      let likelyFailed = 0
      for (const p of rProjects) {
        const reason = getConfirmReason(p)
        if (reason) {
          operating++
        } else {
          const months = monthsSinceAward(p.awardAnnouncedDate)
          if (months > 6) likelyFailed++
          else negotiating++
        }
      }
      return {
        round: roundNameMap[rid]?.replace('CIS ', '') ?? rid,
        'Confirmed': operating,
        'May Be Negotiating': negotiating,
        'Likely Failed': likelyFailed,
      }
    })

    // Likely failed / negotiating totals
    let likelyFailedCount = 0
    let likelyFailedMW = 0
    let negotiatingCount = 0
    let negotiatingMW = 0
    for (const p of notConf) {
      const months = monthsSinceAward(p.awardAnnouncedDate)
      if (months > 6) { likelyFailedCount++; likelyFailedMW += p.capacityMW }
      else { negotiatingCount++; negotiatingMW += p.capacityMW }
    }

    // Operating MW (approximate from ESG data)
    const operatingMW = cisProjects
      .filter(p => p.stage === 'operating')
      .reduce((s, p) => s + p.capacityMW, 0)

    return {
      confirmed: conf,
      notConfirmed: notConf,
      totalMW,
      confirmedMW,
      roundBars,
      likelyFailedCount,
      likelyFailedMW,
      negotiatingCount,
      negotiatingMW,
      operatingMW,
    }
  }, [cisProjects, roundNameMap])

  // ---- Section 2 data: Technology mix & hybrids ----
  const section2 = useMemo(() => {
    // Technology mix from CIS_PROJECTS
    const techCounts: Record<string, { count: number; mw: number }> = {}
    for (const p of allCisSchemeProjects) {
      const tech = p.technology
      if (!techCounts[tech]) techCounts[tech] = { count: 0, mw: 0 }
      techCounts[tech].count++
      techCounts[tech].mw += p.capacity_mw
    }

    const techLabels: Record<string, string> = {
      bess: 'Standalone BESS',
      solar: 'Standalone Solar',
      wind: 'Standalone Wind',
      hybrid: 'Solar+BESS Hybrid',
      vpp: 'VPP',
    }

    const pieData = Object.entries(techCounts).map(([tech, d]) => ({
      name: techLabels[tech] ?? formatTech(tech),
      value: d.count,
      mw: d.mw,
      tech,
    }))

    // Hybrid projects
    const hybrids = allCisSchemeProjects.filter(p => p.technology === 'hybrid')

    // Hybrid status from ESG tracker
    const hybridWithStatus = hybrids.map(h => {
      const esgMatch = cisProjects.find(ep =>
        ep.projectId && h.project_id && ep.projectId === h.project_id
      )
      return {
        ...h,
        stage: esgMatch?.stage ?? 'development',
      }
    })

    return { techCounts, pieData, hybrids, hybridWithStatus, totalProjects: allCisSchemeProjects.length }
  }, [allCisSchemeProjects, cisProjects])

  // ---- Section 3 data: CISA execution timeline + months-since-award ----
  const section3 = useMemo(() => {
    // Known CISA execution data points
    const executionTimeline = [
      { date: 'Aug 2025', executed: 19, label: 'Senate Estimates' },
      { date: 'Dec 2025', executed: 22, label: 'Senate Estimates' },
      { date: 'Feb 2026', executed: 23, label: 'DCCEEW update' },
    ]

    // Months since award distribution for NOT confirmed projects
    const buckets = [
      { range: '0-3', min: 0, max: 3, count: 0, color: '#22c55e' },
      { range: '3-6', min: 3, max: 6, count: 0, color: '#22c55e' },
      { range: '6-9', min: 6, max: 9, count: 0, color: '#f59e0b' },
      { range: '9-12', min: 9, max: 12, count: 0, color: '#f59e0b' },
      { range: '12-15', min: 12, max: 15, count: 0, color: '#ef4444' },
      { range: '15+', min: 15, max: 999, count: 0, color: '#ef4444' },
    ]

    for (const p of section1.notConfirmed) {
      const months = monthsSinceAward(p.awardAnnouncedDate)
      for (const b of buckets) {
        if (months >= b.min && months < b.max) { b.count++; break }
        if (b.max === 999 && months >= b.min) { b.count++; break }
      }
    }

    return { executionTimeline, buckets }
  }, [section1.notConfirmed])

  // ---- Section 4 data: Pipeline waterfall ----
  const section4 = useMemo(() => {
    // Awarded rounds (those with projects)
    const awardedRounds = CIS_ROUNDS.filter(r => r.num_projects > 0)
    const totalAwardedMW = awardedRounds.reduce((s, r) => s + r.total_capacity_mw, 0)

    const waterfallData = [
      ...awardedRounds.map(r => ({
        name: r.name.replace('CIS ', '').replace('Pilot — ', 'P:').replace('Tender ', 'T').replace(' — NEM Generation', ' Gen').replace(' — NEM Dispatchable', ' Disp').replace(' — WEM Dispatchable', ' WEM'),
        mw: r.total_capacity_mw,
        type: 'awarded' as const,
      })),
      { name: 'T5/6 WEM\n(target)', mw: 1600, type: 'future' as const },
      { name: 'T7 NEM Gen\n(target)', mw: 5000, type: 'future' as const },
      { name: 'T8 NEM Disp\n(target)', mw: 2000, type: 'future' as const },
    ]

    const totalPipelineMW = totalAwardedMW + 1600 + 5000 + 2000

    return { awardedRounds, totalAwardedMW, waterfallData, totalPipelineMW }
  }, [])

  // Recharts custom tooltip for bar charts
  const barTooltipStyle = {
    backgroundColor: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    color: 'var(--color-text)',
    fontSize: '12px',
    padding: '6px 10px',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
        <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>CIS Executive Briefing</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Comprehensive analysis of CIS program delivery as of March 2026. Data sourced from AURES ESG Agreement Proxy, Senate Estimates testimony, and DCCEEW publications.
        </p>
      </div>

      {/* ===== SECTION 1: How Many CIS Projects Have Actually Succeeded? ===== */}
      <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderLeft: '4px solid #22c55e' }}>
        <h3 className="text-base font-bold mb-3" style={{ color: 'var(--color-text)' }}>
          1. How Many CIS Projects Have Actually Succeeded?
        </h3>

        <div className="text-sm leading-relaxed mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          <p className="mb-2">
            Of the 71 projects awarded CIS contracts across 6 rounds since November 2023, only {section1.confirmed.length} ({(section1.confirmed.length / 71 * 100).toFixed(0)}%) show evidence of having executed their CIS agreement (CISA). The federal government has awarded {fmtMW(section1.totalMW)} of new energy capacity, but as of March 2026, the operating capacity from CIS projects stands at approximately {fmtMW(section1.operatingMW)}. The gap between &lsquo;awarded&rsquo; and &lsquo;operating&rsquo; is the central challenge of the CIS program.
          </p>
          <p>
            Senate Estimates testimony (1 December 2025) confirmed that only 22 of 63 projects (DCCEEW&rsquo;s count, which excludes the 6 Pilot NSW projects) had executed CISAs, with just ~9 reaching financial close by February 2026. The Pilot NSW round, co-delivered under the NSW Electricity Infrastructure Roadmap (LTESA Round 2), is excluded from DCCEEW&rsquo;s CIS count of 63 — likely because it uses the LTESA firming mechanism rather than the standard CISA.
          </p>
        </div>

        {/* Visual 1: Stacked horizontal bar chart — Round breakdown */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Project Status by Round</h4>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={section1.roundBars} layout="vertical" margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                <YAxis type="category" dataKey="round" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} width={140} />
                <Tooltip contentStyle={barTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, color: 'var(--color-text-muted)' }} />
                <Bar dataKey="Confirmed" stackId="a" fill="#22c55e" />
                <Bar dataKey="May Be Negotiating" stackId="a" fill="#f59e0b" />
                <Bar dataKey="Likely Failed" stackId="a" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Visual 2: Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)' }}>
            <div className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>71</div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Total Awarded</div>
            <div className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>{fmtMW(section1.totalMW)}</div>
          </div>
          <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid #22c55e40' }}>
            <div className="text-2xl font-bold" style={{ color: '#22c55e' }}>{section1.confirmed.length}</div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Confirmed</div>
            <div className="text-xs font-medium" style={{ color: '#22c55e' }}>{fmtMW(section1.confirmedMW)}</div>
          </div>
          <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid #ef444440' }}>
            <div className="text-2xl font-bold" style={{ color: '#ef4444' }}>{section1.likelyFailedCount}</div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Likely Failed (&gt;6mo)</div>
            <div className="text-xs font-medium" style={{ color: '#ef4444' }}>{fmtMW(section1.likelyFailedMW)}</div>
          </div>
          <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)' }}>
            <div className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>~9</div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Financial Close</div>
            <div className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>of 22 executed (Senate)</div>
          </div>
        </div>
      </div>

      {/* ===== SECTION 2: The Solar Hybrid Question ===== */}
      <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderLeft: '4px solid #10b981' }}>
        <h3 className="text-base font-bold mb-3" style={{ color: 'var(--color-text)' }}>
          2. The Solar Hybrid Question
        </h3>

        <div className="text-sm leading-relaxed mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          <p className="mb-2">
            Solar-battery hybrids represent {section2.hybrids.length} of {section2.totalProjects} CIS projects ({(section2.hybrids.length / section2.totalProjects * 100).toFixed(0)}%), concentrated in the two generation tenders. Tender 4 (October 2025) is particularly hybrid-heavy: 12 of 20 projects combine solar generation with co-located battery storage. While hybrids offer system benefits (dispatchable solar), they are inherently more complex to develop, finance, and connect than standalone projects.
          </p>
          <p className="mb-2">
            None of the {section2.hybrids.length} hybrid projects are yet in construction or operation as of March 2026. All remain in the development phase. This is a key risk indicator — hybrid projects face dual planning requirements, more complex grid connection agreements, and larger capital expenditure. The earliest hybrid COD targets are December 2028 (Tender 1) and December 2030 (Tender 4).
          </p>
          <p>
            Several projects awarded in the earlier CIS rounds appear to have been already committed or well-advanced before winning their CIS contract. Mokoan Solar Farm (46 MW, European Energy) was in commissioning when Tender 1 results were announced in December 2024. The Pilot NSW BESS projects (Orana, Liddell, Smithfield) were all at or near construction start. This suggests the government can claim &lsquo;CIS success&rsquo; for projects that would likely have proceeded regardless — a pattern less evident in later, larger tenders where the CIS contract is genuinely needed to underwrite project finance.
          </p>
        </div>

        {/* Visual 3: Donut chart — Technology Mix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>CIS Technology Mix</h4>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={section2.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {section2.pieData.map((entry, i) => (
                      <Cell key={`cell-${i}`} fill={BRIEFING_TECH_COLORS[entry.tech] ?? '#636e72'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={barTooltipStyle}
                    formatter={(value, name, props) => {
                      const payload = props?.payload as { mw?: number } | undefined
                      return [`${value} projects (${fmtMW(payload?.mw ?? 0)})`, name]
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Technology Breakdown</h4>
            <div className="space-y-2">
              {section2.pieData.map(d => (
                <div key={d.tech} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: BRIEFING_TECH_COLORS[d.tech] ?? '#636e72' }} />
                  <span className="text-sm flex-1" style={{ color: 'var(--color-text-secondary)' }}>{d.name}</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{d.value}</span>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>({fmtMW(d.mw)})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Visual 4: Hybrid projects table */}
        <div>
          <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>All {section2.hybrids.length} Hybrid Projects</h4>
          <ScrollableTable>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th className="text-left px-2 py-1.5 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Name</th>
                  <th className="text-left px-2 py-1.5 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Developer</th>
                  <th className="text-right px-2 py-1.5 font-semibold" style={{ color: 'var(--color-text-muted)' }}>MW</th>
                  <th className="text-right px-2 py-1.5 font-semibold" style={{ color: 'var(--color-text-muted)' }}>MWh</th>
                  <th className="text-left px-2 py-1.5 font-semibold" style={{ color: 'var(--color-text-muted)' }}>State</th>
                  <th className="text-left px-2 py-1.5 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Round</th>
                  <th className="text-left px-2 py-1.5 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {section2.hybridWithStatus.map((h, i) => (
                  <tr key={`hybrid-${i}`} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-2 py-1" style={{ color: 'var(--color-text)' }}>{h.name}</td>
                    <td className="px-2 py-1" style={{ color: 'var(--color-text-secondary)' }}>{h.developer}</td>
                    <td className="px-2 py-1 text-right font-medium" style={{ color: 'var(--color-text)' }}>{h.capacity_mw}</td>
                    <td className="px-2 py-1 text-right" style={{ color: 'var(--color-text-secondary)' }}>{h.storage_mwh ?? '—'}</td>
                    <td className="px-2 py-1" style={{ color: 'var(--color-text-secondary)' }}>{h.state}</td>
                    <td className="px-2 py-1" style={{ color: 'var(--color-text-muted)' }}>{h.roundName.replace('CIS ', '')}</td>
                    <td className="px-2 py-1">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{
                        backgroundColor: stageColor(h.stage) + '20',
                        color: stageColor(h.stage),
                      }}>
                        {stageLabel(h.stage)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollableTable>
        </div>
      </div>

      {/* ===== SECTION 3: The Next 6 Months Are Critical ===== */}
      <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderLeft: '4px solid #f59e0b' }}>
        <h3 className="text-base font-bold mb-3" style={{ color: 'var(--color-text)' }}>
          3. The Next 6 Months Are Critical
        </h3>

        <div className="text-sm leading-relaxed mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          <p className="mb-2">
            The period from April to September 2026 is pivotal for the CIS program. The next Senate Estimates hearings (Budget Estimates, typically May-June 2026) will provide updated CISA execution numbers. AURES will monitor:
          </p>
          <ul className="list-disc pl-5 space-y-1 mb-2">
            <li><strong>CISA execution rate:</strong> From 22 executed (Dec 2025) to 23 (Feb 2026) — only 1 new execution in 2 months. At this pace, significant acceleration is needed.</li>
            <li><strong>Financial close pipeline:</strong> Only ~9 of 22 executed projects had reached financial close by Feb 2026. This is the true bottleneck — even signed CISAs don&rsquo;t guarantee construction.</li>
            <li><strong>Tender 1 projects:</strong> Awarded December 2024, now 15+ months old. Projects still without executed CISAs are entering &lsquo;likely failed&rsquo; territory under AURES analysis.</li>
            <li><strong>Bond forfeiture watch:</strong> Proponents must lodge a project bond within 20 business days of signing. Failure to deliver results in bond forfeiture and re-tendering. No public data yet on any forfeitures.</li>
          </ul>
          <p>
            AURES tracks CIS execution through an ESG Agreement Proxy — monitoring public indicators (First Nations commitments, FNCEN registration, CEC Charter status) as proxies for agreement execution. We supplement this with Senate Estimates testimony, DCCEEW publications, and developer announcements.
          </p>
        </div>

        {/* Visual 5: CISA Execution Timeline */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>CISA Execution Trajectory</h4>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <LineChart data={section3.executionTimeline} margin={{ left: 10, right: 30, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                <YAxis
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                  domain={[0, 75]}
                  label={{ value: 'Executed CISAs', angle: -90, position: 'insideLeft', style: { fill: 'var(--color-text-muted)', fontSize: 11 } }}
                />
                <Tooltip contentStyle={barTooltipStyle} />
                <ReferenceLine y={71} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Target: 71', position: 'right', fill: '#ef4444', fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="executed"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={(props) => {
                    const { cx, cy, payload } = props as { cx: number; cy: number; payload: { label?: string } }
                    return (
                      <g key={`dot-${cx}-${cy}`}>
                        <circle cx={cx} cy={cy} r={5} fill="#3b82f6" stroke="#fff" strokeWidth={2} />
                        {payload.label && (
                          <text x={cx} y={cy - 12} textAnchor="middle" fill="var(--color-text-muted)" fontSize={9}>
                            {payload.label}
                          </text>
                        )}
                      </g>
                    )
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Visual 6: Months Since Award distribution */}
        <div>
          <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Months Since Award (Unconfirmed Projects)</h4>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <BarChart data={section3.buckets} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="range" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} label={{ value: 'Months since award', position: 'insideBottom', offset: -2, style: { fill: 'var(--color-text-muted)', fontSize: 11 } }} />
                <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} label={{ value: 'Projects', angle: -90, position: 'insideLeft', style: { fill: 'var(--color-text-muted)', fontSize: 11 } }} />
                <Tooltip contentStyle={barTooltipStyle} formatter={(value) => [`${value} projects`, 'Count']} />
                <Bar dataKey="count">
                  {section3.buckets.map((b, i) => (
                    <Cell key={`bucket-${i}`} fill={b.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ===== SECTION 4: What This Means for Future Rounds ===== */}
      <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderLeft: '4px solid #3b82f6' }}>
        <h3 className="text-base font-bold mb-3" style={{ color: 'var(--color-text)' }}>
          4. What This Means for Future Rounds
        </h3>

        <div className="text-sm leading-relaxed mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          <p className="mb-2">
            Four additional CIS tenders are in progress or planned:
          </p>
          <ul className="list-disc pl-5 space-y-1 mb-2">
            <li><strong>Tenders 5 &amp; 6 (WEM):</strong> Western Australia generation + storage. Results expected March-April 2026. Targeting 1.6 GW generation + 2.4 GWh storage.</li>
            <li><strong>Tender 7 (NEM Generation):</strong> Registrations opened October 2025. Targeting ~5 GW. Results expected May 2026.</li>
            <li><strong>Tender 8 (NEM Dispatchable):</strong> Targeting ~16 GWh. Results expected mid-2026. First time allowing aggregated small batteries.</li>
          </ul>
          <p className="mb-2">
            If all future tenders deliver to target, the total CIS pipeline would approach {fmtMW(section4.totalPipelineMW)} against the 40 GW goal. However, the gap between &lsquo;awarded&rsquo; and &lsquo;delivered&rsquo; raises a critical question: should the government be launching new tenders when existing projects are struggling to execute?
          </p>
          <p className="mb-2">
            The re-tendering cycle for failed projects is not yet established. Under CISA terms, projects that fail to lodge bonds or meet milestones face forfeiture. The re-tendered capacity would then enter future rounds — but the cycle from announcement to failure recognition to re-tendering to new award to new construction could take 3-5 years. If early-round projects begin failing at scale in 2026-2027, the recycled GW may not be operational until 2030-2032, well past the government&rsquo;s targets.
          </p>
          <p>
            The CIS program&rsquo;s credibility now rests less on how many GW it announces and more on how many MW it actually delivers. AURES will continue tracking execution rates, financial close milestones, and Senate Estimates disclosures to provide the most accurate picture of CIS delivery.
          </p>
        </div>

        {/* Visual 7: CIS Pipeline Waterfall */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>CIS Capacity Pipeline (GW)</h4>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={section4.waterfallData} margin={{ left: 10, right: 20, top: 10, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                  interval={0}
                  angle={-40}
                  textAnchor="end"
                  height={70}
                />
                <YAxis
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(1)}`}
                  label={{ value: 'GW', angle: -90, position: 'insideLeft', style: { fill: 'var(--color-text-muted)', fontSize: 11 } }}
                />
                <Tooltip
                  contentStyle={barTooltipStyle}
                  formatter={(value) => [fmtMW(value as number), 'Capacity']}
                />
                <ReferenceLine y={40000} stroke="#ef4444" strokeDasharray="5 5" label={{ value: '40 GW target', position: 'right', fill: '#ef4444', fontSize: 11 }} />
                <Bar dataKey="mw">
                  {section4.waterfallData.map((d, i) => (
                    <Cell key={`wf-${i}`} fill={d.type === 'awarded' ? '#3b82f6' : '#3b82f680'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2 justify-center">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#3b82f6' }} />
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Awarded ({fmtMW(section4.totalAwardedMW)})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#3b82f680' }} />
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Future target (~{fmtMW(8600)})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-1 rounded-sm" style={{ backgroundColor: '#ef4444' }} />
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>40 GW goal</span>
            </div>
          </div>
        </div>

        {/* Visual 8: Timeline to Delivery table */}
        <div>
          <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Typical Timeline: Award to Operation</h4>
          <ScrollableTable>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th className="text-left px-2 py-1.5 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Stage</th>
                  <th className="text-left px-2 py-1.5 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Typical Duration</th>
                  <th className="text-left px-2 py-1.5 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { stage: 'Award \u2192 CISA Execution', duration: '3-12 months', notes: '22 of 71 executed as of Dec 2025' },
                  { stage: 'CISA \u2192 Financial Close', duration: '6-18 months', notes: '~9 of 22 reached FC by Feb 2026' },
                  { stage: 'Financial Close \u2192 Construction Start', duration: '3-6 months', notes: 'Grid connection is key blocker' },
                  { stage: 'Construction \u2192 COD', duration: '12-36 months', notes: 'BESS: 12-18mo, Wind: 24-36mo, Solar: 18-24mo' },
                  { stage: 'Total: Award \u2192 Operation', duration: '2-6 years', notes: 'Earliest CIS awards (Nov 2023) \u2192 COD 2025-2029' },
                ].map((row, i) => (
                  <tr key={`timeline-row-${i}`} style={{
                    borderBottom: '1px solid var(--color-border)',
                    ...(i === 4 ? { fontWeight: 600 } : {}),
                  }}>
                    <td className="px-2 py-1.5" style={{ color: i === 4 ? 'var(--color-text)' : 'var(--color-text-secondary)' }}>{row.stage}</td>
                    <td className="px-2 py-1.5 font-medium" style={{ color: i === 4 ? 'var(--color-text)' : 'var(--color-text)' }}>{row.duration}</td>
                    <td className="px-2 py-1.5" style={{ color: 'var(--color-text-muted)' }}>{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollableTable>
        </div>
      </div>
    </div>
  )
}

function SchemeTimelineTab() {
  // Build timeline data from ESG + round data
  const timelineRounds = useMemo<TimelineRound[]>(() => {
    const rounds: TimelineRound[] = [
      {
        id: 'ltesa-round-1',
        scheme: 'LTESA',
        name: 'LTESA Round 1 — Generation + LDS',
        date: '2023-05-03',
        capacityMW: 1445,
        storageMWh: 400,
        numProjects: 4,
        targetCOD: '2027-2028',
        headline: 'First-ever LTESA tender. Solar strike prices below $35/MWh.',
        insight: 'New England Solar (720 MW) and Stubbo Solar (400 MW) are now operating — strong progress from ACEN. Coppabella Wind (275 MW) remains in development after 34+ months, a concern. Limondale BESS (50 MW) in construction.',
        notableWinners: ['New England Solar Farm (720 MW) — ACEN', 'Stubbo Solar Farm (400 MW) — ACEN', 'Coppabella Wind Farm (275 MW)', 'Limondale BESS (50 MW / 400 MWh)'],
        constructionPct: 50, confirmedPct: 0, confirmedCount: 0, confirmedMW: 0, notConfirmedCount: 0, notConfirmedMW: 0, totalMW: 1445,
      },
      {
        id: 'cis-pilot-nsw',
        scheme: 'CIS',
        name: 'CIS Pilot NSW / LTESA Round 2 — Firming',
        date: '2023-11-23',
        capacityMW: 1075,
        storageMWh: 0,
        numProjects: 6,
        targetCOD: 'Dec 2025',
        headline: 'First-ever CIS round. Co-delivered with NSW Government. Firming focus.',
        insight: 'Smithfield Battery (235 MW) now operating. Two large BESS (Liddell 500 MW, Orana 460 MW) in construction. VPPs likely operating. Dec 2025 target COD missed by larger BESS projects.',
        notableWinners: ['Liddell BESS (500 MW) — AGL', 'Orana REZ Battery (460 MW) — Akaysha/BlackRock', 'Smithfield Battery (235 MW) — Iberdrola — operating', '3× Enel X VPPs (130 MW)'],
        constructionPct: 50, confirmedPct: 0, confirmedCount: 0, confirmedMW: 0, notConfirmedCount: 0, notConfirmedMW: 0, totalMW: 1075,
      },
      {
        id: 'ltesa-round-3',
        scheme: 'LTESA',
        name: 'LTESA Round 3 — Generation + LDS',
        date: '2023-12-19',
        capacityMW: 1274,
        storageMWh: 4192,
        numProjects: 5,
        targetCOD: 'Before 2028',
        headline: 'First compressed air energy storage (A-CAES) project to secure government contract.',
        insight: 'Culcairn Solar Farm (350 MW) now operating — good progress. Uungula Wind Farm (400 MW) in construction. Silver City A-CAES is a first-of-kind technology. Timeline tight but achievable for some.',
        notableWinners: ['Uungula Wind Farm (400 MW) — Squadron', 'Culcairn Solar Farm (350 MW) — Neoen — operating', 'Richmond Valley BESS (275 MW / 2,200 MWh) — Ark Energy', 'Silver City A-CAES (200 MW / 1,600 MWh) — Hydrostor'],
        constructionPct: 20, confirmedPct: 0, confirmedCount: 0, confirmedMW: 0, notConfirmedCount: 0, notConfirmedMW: 0, totalMW: 1274,
      },
      {
        id: 'ltesa-round-4',
        scheme: 'LTESA',
        name: 'LTESA Round 4 — Generation',
        date: '2024-07-01',
        capacityMW: 317,
        storageMWh: 372,
        numProjects: 2,
        targetCOD: '2026-2027',
        headline: 'Flyers Creek becomes first project with an LTESA to begin operations (May 2025).',
        insight: 'A milestone for the program. Smallest round — only 2 projects. Planned Q4 2024 generation tender cancelled to align with federal CIS, signalling increasing coordination.',
        notableWinners: ['Flyers Creek Wind Farm (145 MW) — OPERATING', 'Maryvale Solar + BESS (172 MW / 372 MWh)'],
        constructionPct: 50, confirmedPct: 0, confirmedCount: 0, confirmedMW: 0, notConfirmedCount: 0, notConfirmedMW: 0, totalMW: 317,
      },
      {
        id: 'cis-pilot-sa-vic',
        scheme: 'CIS',
        name: 'CIS Pilot — SA/VIC',
        date: '2024-09-04',
        capacityMW: 995,
        storageMWh: 3626,
        numProjects: 6,
        targetCOD: 'Mid-2027',
        headline: 'First round using the standard CISA "cap and collar" mechanism. Expanded to SA and VIC.',
        insight: 'All battery projects. Significantly exceeded the 600 MW target. Four of six projects in construction (Wooreen, Mortlake, Tailem Bend, Clements Gap). Mid-2027 target ambitious but achievable for most.',
        notableWinners: ['Wooreen Battery (350 MW / 1,400 MWh) — EnergyAustralia', 'Tailem Bend BESS (200 MW / 560 MWh) — Iberdrola', 'Springfield BESS (200 MW / 400 MWh) — Neoen', 'Mortlake BESS (135 MW / 270 MWh) — Origin'],
        constructionPct: 33, confirmedPct: 0, confirmedCount: 0, confirmedMW: 0, notConfirmedCount: 0, notConfirmedMW: 0, totalMW: 995,
      },
      {
        id: 'cis-tender-1-nem-gen',
        scheme: 'CIS',
        name: 'CIS Tender 1 — NEM Generation',
        date: '2024-12-11',
        capacityMW: 6380,
        storageMWh: 3500,
        numProjects: 19,
        targetCOD: '31 Dec 2028',
        headline: "Australia's largest renewable energy tender. 19 projects from 84 bids (4.5× oversubscribed). None of the Big 3 gen-tailers won.",
        insight: 'West Mokoan Solar (300 MW) now operating. Goulburn River Solar (450 MW) in construction. Remaining 17 projects in development — expected given 3-5 year timeline. Key risk: whether enough can navigate planning, grid connection, and financing hurdles to reach COD by end-2028.',
        notableWinners: ['Valley of the Winds (936 MW) — ACEN', 'Sandy Creek Solar (700 MW) — Lightsource bp', 'Spicers Creek Wind (700 MW) — Squadron', 'Junction Rivers Wind + BESS (585 MW) — Windlab'],
        constructionPct: 0, confirmedPct: 0, confirmedCount: 0, confirmedMW: 0, notConfirmedCount: 0, notConfirmedMW: 0, totalMW: 6380,
      },
      {
        id: 'cis-tender-2-wem-disp',
        scheme: 'CIS',
        name: 'CIS Tender 2 — WEM Dispatchable',
        date: '2025-03-20',
        capacityMW: 654,
        storageMWh: 2595,
        numProjects: 4,
        targetCOD: 'Oct 2027',
        headline: 'First CIS tender for Western Australia. 7× oversubscribed. All battery projects.',
        insight: 'Battery projects have shorter construction timelines. Oct 2027 target appears achievable provided grid connection proceeds without major delays.',
        notableWinners: ['Boddington Giga Battery (324 MW) — PGS Energy', 'Muchea Big Battery (150 MW) — Neoen', 'Merredin Big Battery (100 MW) — Atmos Renewables', 'Waroona REP Stage 1 (80 MW) — Frontier Energy'],
        constructionPct: 0, confirmedPct: 0, confirmedCount: 0, confirmedMW: 0, notConfirmedCount: 0, notConfirmedMW: 0, totalMW: 654,
      },
      {
        id: 'ltesa-round-5',
        scheme: 'LTESA',
        name: 'LTESA Round 5 — Long Duration Storage',
        date: '2025-02-27',
        capacityMW: 1025,
        storageMWh: 13790,
        numProjects: 3,
        targetCOD: 'Before 2030',
        headline: 'First pumped hydro LTESA: Phoenix at 800 MW with 40-year contract — longest government-backed energy contract in Australian history.',
        insight: 'BESS projects achievable in 2-3 years. Phoenix Pumped Hydro faces 5-8+ year development cycle typical of pumped hydro — 40-year contract provides ample time.',
        notableWinners: ['Phoenix Pumped Hydro (800 MW / 11,990 MWh)', 'Stoney Creek BESS (125 MW)', 'Griffith BESS (100 MW)'],
        constructionPct: 0, confirmedPct: 0, confirmedCount: 0, confirmedMW: 0, notConfirmedCount: 0, notConfirmedMW: 0, totalMW: 1025,
      },
      {
        id: 'cis-tender-3-nem-disp',
        scheme: 'CIS',
        name: 'CIS Tender 3 — NEM Dispatchable',
        date: '2025-09-17',
        capacityMW: 4130,
        storageMWh: 15370,
        numProjects: 16,
        targetCOD: '31 Dec 2029',
        headline: "Australia's biggest battery tender. 4.13 GW / 15.37 GWh across 16 projects. 8.5× oversubscribed (124 bids, ~34 GW).",
        insight: 'All lithium-ion BESS despite pumped hydro being eligible. Calala BESS and Mornington BESS already in construction. 4+ year runway provides adequate time, but sheer volume (16 projects across 4 states) will test grid connection and supply chains.',
        notableWinners: ['Goulburn River Standalone BESS (450 MW) — Lightsource bp', 'Teebar BESS (400 MW) — Atmos Renewables', 'Little River BESS (350 MW) — ACEnergy', 'Swallow Tail BESS (300 MW) — AMPYR'],
        constructionPct: 0, confirmedPct: 0, confirmedCount: 0, confirmedMW: 0, notConfirmedCount: 0, notConfirmedMW: 0, totalMW: 4130,
      },
      {
        id: 'cis-tender-4-nem-gen',
        scheme: 'CIS',
        name: 'CIS Tender 4 — NEM Generation',
        date: '2025-10-09',
        capacityMW: 6640,
        storageMWh: 11444,
        numProjects: 20,
        targetCOD: '31 Dec 2030',
        headline: '6.6 GW generation + 11.4 GWh co-located storage. 12 of 20 projects are hybrids. Tasmania\'s first CIS project. $1B Australian steel commitments.',
        insight: 'Willogoleche 2 Wind (108 MW) already operating and Carmody\'s Hill Wind (247 MW) in construction — early positive signals. Later target date provides more runway. Trend toward hybridisation (12 of 20 projects) may improve financing as developers stack revenue from generation + storage.',
        notableWinners: ['Liverpool Range Wind Stage 1 (634 MW) — Tilt Renewables', 'Hexham Wind Farm (600 MW) — AGL', 'Tallawang Solar Hybrid (500 MW) — Potentia Energy', 'Bell Bay Wind (224 MW) — Equis — TAS first CIS'],
        constructionPct: 0, confirmedPct: 0, confirmedCount: 0, confirmedMW: 0, notConfirmedCount: 0, notConfirmedMW: 0, totalMW: 6640,
      },
      {
        id: 'ltesa-round-6',
        scheme: 'LTESA',
        name: 'LTESA Round 6 — Long Duration Storage',
        date: '2026-02-05',
        capacityMW: 1171,
        storageMWh: 11980,
        numProjects: 6,
        targetCOD: 'Before 2030',
        headline: 'Largest LTESA by energy capacity. Combined with prior rounds, legislated LDS minimums (2 GW by 2030, 28 GWh by 2034) met on paper.',
        insight: 'All in early development. Meeting legislated targets in contracted capacity is a meaningful achievement, but key question remains whether projects can actually be built by target dates.',
        notableWinners: ['Great Western Battery (330 MW) — Neoen', 'Bowmans Creek BESS (250 MW) — Ark Energy', 'Bannaby BESS (233 MW) — Penso Power', 'Kingswood BESS (100 MW) — Iberdrola'],
        constructionPct: 0, confirmedPct: 0, confirmedCount: 0, confirmedMW: 0, notConfirmedCount: 0, notConfirmedMW: 0, totalMW: 1171,
      },
    ]

    // Populate construction % and confirmed % from ESG data
    for (const round of rounds) {
      const roundProjects = ESG_TRACKER_PROJECTS.filter(p => p.roundId === round.id)
      if (roundProjects.length === 0) continue

      const inConstruction = roundProjects.filter(p => ['construction', 'operating', 'commissioning'].includes(p.stage))
      round.constructionPct = roundProjects.length > 0 ? Math.round((inConstruction.length / roundProjects.length) * 100) : 0

      const confirmed = roundProjects.filter(p =>
        p.agreementStatus === 'executed' ||
        p.agreementStatus === 'likely_executed' ||
        ['construction', 'operating', 'commissioning'].includes(p.stage) ||
        ['published', 'partial'].includes(p.publicationStatus)
      )
      const notConfirmed = roundProjects.filter(p =>
        p.agreementStatus !== 'executed' &&
        p.agreementStatus !== 'likely_executed' &&
        !['construction', 'operating', 'commissioning'].includes(p.stage) &&
        !['published', 'partial'].includes(p.publicationStatus)
      )
      round.confirmedPct = roundProjects.length > 0 ? Math.round((confirmed.length / roundProjects.length) * 100) : 0
      round.confirmedCount = confirmed.length
      round.confirmedMW = confirmed.reduce((s, p) => s + p.capacityMW, 0)
      round.notConfirmedCount = notConfirmed.length
      round.notConfirmedMW = notConfirmed.reduce((s, p) => s + p.capacityMW, 0)
      round.totalMW = roundProjects.reduce((s, p) => s + p.capacityMW, 0)
    }

    return rounds
  }, [])

  // Overall stats
  const overallStats = useMemo(() => {
    const allProjects = ESG_TRACKER_PROJECTS
    const total = allProjects.length
    const totalMW = allProjects.reduce((s, p) => s + p.capacityMW, 0)
    const inConstruction = allProjects.filter(p => ['construction', 'operating', 'commissioning'].includes(p.stage))
    const confirmed = allProjects.filter(p =>
      p.agreementStatus === 'executed' ||
      p.agreementStatus === 'likely_executed' ||
      ['construction', 'operating', 'commissioning'].includes(p.stage) ||
      ['published', 'partial'].includes(p.publicationStatus)
    )

    return {
      total,
      totalMW,
      constructionCount: inConstruction.length,
      constructionMW: inConstruction.reduce((s, p) => s + p.capacityMW, 0),
      constructionPct: Math.round((inConstruction.length / total) * 100),
      confirmedCount: confirmed.length,
      confirmedMW: confirmed.reduce((s, p) => s + p.capacityMW, 0),
      confirmedPct: Math.round((confirmed.length / total) * 100),
    }
  }, [])

  // Key projects — top 7 by MW that are NOT yet in construction/operating (the ones that will move the dial)
  // Curated list: 7 projects closest to commencing construction based on developer maturity,
  // planning status, round vintage, and project readiness — not just largest by MW.
  const KEY_PROJECT_IDS = [
    'valley-of-the-winds',            // 936 MW — ACEN, CIS T1 (Dec 2024). Largest development project. ACEN is experienced and well-capitalised.
    'spicers-creek-wind-farm',         // 700 MW — Squadron Energy, CIS T1. Squadron is one of AU's largest developers with strong track record.
    'liverpool-range-wind-farm',       // 634 MW — Tilt Renewables, CIS T4. Already well-advanced in planning pre-CIS award. Near-term and likely.
    'junction-rivers-wind-and-bess',   // 585 MW — CIS T1. Large hybrid wind+BESS, NSW. Progressing through approvals.
    'kentbruck-green-power-hub',       // 600 MW — CIS T1, VIC. Large wind project with established grid connection pathway.
    'coppabella-wind-farm',            // 275 MW — LTESA R1 (May 2023). 34+ months since award — oldest development project, should be closest.
    'goyder-north-wind-farm',          // 300 MW — Neoen, CIS T1. Neoen is tier-1 developer; Goyder South already operating.
  ]

  const keyProjects = useMemo(() => {
    return KEY_PROJECT_IDS
      .map(id => ESG_TRACKER_PROJECTS.find(p => p.projectId === id))
      .filter((p): p is ESGTrackerProject => p != null)
  }, [])

  // Collapsible timeline state — all expanded by default
  const allRoundIds = useMemo(() => new Set(timelineRounds.map(r => r.id)), [timelineRounds])
  const [expandedTimelineRounds, setExpandedTimelineRounds] = useState<Set<string>>(() => new Set(timelineRounds.map(r => r.id)))
  const allExpanded = expandedTimelineRounds.size === timelineRounds.length

  function toggleTimelineRound(id: string) {
    setExpandedTimelineRounds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllTimelineRounds() {
    if (allExpanded) {
      setExpandedTimelineRounds(new Set())
    } else {
      setExpandedTimelineRounds(new Set(allRoundIds))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-[var(--color-text)]">CIS / LTESA Timeline</h3>
          <button
            onClick={toggleAllTimelineRounds}
            className="text-[10px] px-2.5 py-1 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text-muted)] transition-colors"
          >
            {allExpanded ? 'Collapse All' : 'Expand All'}
          </button>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
          How Australia's two most ambitious renewable energy procurement programs evolved across {timelineRounds.length} rounds,
          awarding {overallStats.total} projects totalling {fmtMW(overallStats.totalMW)} of capacity. This timeline tracks
          the progression from early pilots to full national tenders, and critically assesses how many awarded projects are
          translating into real construction activity.
        </p>

        {/* Headline stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-[var(--color-text)]">{overallStats.total}</div>
            <div className="text-[10px] text-[var(--color-text-muted)]">Projects Awarded</div>
            <div className="text-[9px] text-[var(--color-text-muted)]">{fmtMW(overallStats.totalMW)}</div>
          </div>
          <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-[#3b82f6]">{overallStats.constructionCount}</div>
            <div className="text-[10px] text-[var(--color-text-muted)]">In Construction/Operating</div>
            <div className="text-[9px] text-[var(--color-text-muted)]">{fmtMW(overallStats.constructionMW)} ({overallStats.constructionPct}%)</div>
          </div>
          <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-[#22c55e]">{overallStats.confirmedCount}</div>
            <div className="text-[10px] text-[var(--color-text-muted)]">Confirmed Agreement</div>
            <div className="text-[9px] text-[var(--color-text-muted)]">{fmtMW(overallStats.confirmedMW)} ({overallStats.confirmedPct}%)</div>
          </div>
          <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-[#f59e0b]">{timelineRounds.length}</div>
            <div className="text-[10px] text-[var(--color-text-muted)]">Tender Rounds</div>
            <div className="text-[9px] text-[var(--color-text-muted)]">May 2023 — Feb 2026</div>
          </div>
        </div>
      </div>

      {/* Visual timeline */}
      <div className="relative">
        {timelineRounds.map((round, i) => {
          const schemeColor = round.scheme === 'CIS' ? '#f59e0b' : '#8b5cf6'
          const dateObj = new Date(round.date)
          const dateStr = dateObj.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })
          const isLast = i === timelineRounds.length - 1

          return (
            <div key={round.id} className="flex gap-4 pb-0">
              {/* Timeline spine */}
              <div className="flex flex-col items-center shrink-0 w-16">
                <span className="text-[9px] font-mono text-[var(--color-text-muted)] mb-1">{dateStr}</span>
                <div
                  className="w-4 h-4 rounded-full border-2 shrink-0"
                  style={{
                    borderColor: schemeColor,
                    backgroundColor: round.constructionPct > 0 ? schemeColor : `${schemeColor}40`,
                  }}
                />
                {!isLast && <div className="w-px flex-1 min-h-[40px] bg-[var(--color-border)]" />}
              </div>

              {/* Round card */}
              <div className="flex-1 min-w-0 pb-5">
                <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
                  {/* Clickable round header */}
                  <div
                    className="flex items-start justify-between gap-2 cursor-pointer select-none"
                    onClick={() => toggleTimelineRound(round.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span
                          className="text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0"
                          style={{ backgroundColor: `${schemeColor}20`, color: schemeColor }}
                        >
                          {round.scheme}
                        </span>
                        <h4 className="text-xs font-bold text-[var(--color-text)]">{round.name}</h4>
                      </div>
                      <p className="text-[10px] text-[var(--color-text-muted)]">
                        {round.numProjects} projects · {fmtMW(round.capacityMW)}
                        {round.storageMWh > 0 ? ` + ${round.storageMWh >= 1000 ? `${(round.storageMWh / 1000).toFixed(1)} GWh` : `${round.storageMWh} MWh`} storage` : ''}
                        {' '}· Target COD: {round.targetCOD}
                      </p>
                    </div>
                    {/* Chevron indicator */}
                    <svg
                      className={`w-4 h-4 text-[var(--color-text-muted)] shrink-0 mt-0.5 transition-transform duration-200 ${expandedTimelineRounds.has(round.id) ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>

                  {/* Collapsible body */}
                  {expandedTimelineRounds.has(round.id) && (
                    <div className="mt-2">
                      {/* Headline insight */}
                      <p className="text-xs text-[var(--color-text)] leading-relaxed mb-2">
                        {round.headline}
                      </p>
                      <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed mb-3">
                        {round.insight}
                      </p>

                      {/* Progress bars */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] text-[var(--color-text-muted)]">Construction/Operating</span>
                            <span className="text-[9px] font-bold" style={{ color: round.constructionPct > 0 ? '#3b82f6' : '#636e72' }}>
                              {round.constructionPct}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-[var(--color-bg)] overflow-hidden">
                            <div className="h-full rounded-full bg-[#3b82f6]" style={{ width: `${round.constructionPct}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] text-[var(--color-text-muted)]">Confirmed Agreement</span>
                            <span className="text-[9px] font-bold" style={{ color: round.confirmedPct > 0 ? '#22c55e' : '#636e72' }}>
                              {round.confirmedPct}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-[var(--color-bg)] overflow-hidden">
                            <div className="h-full rounded-full bg-[#22c55e]" style={{ width: `${round.confirmedPct}%` }} />
                          </div>
                        </div>
                      </div>

                      {/* Confirmed/not confirmed summary */}
                      <div className="flex items-center gap-3 text-[9px] mb-3 flex-wrap">
                        {round.confirmedCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-[#22c55e]/15 text-[#22c55e] font-semibold">
                            {round.confirmedCount} confirmed ({fmtMW(round.confirmedMW)})
                          </span>
                        )}
                        {round.notConfirmedCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-[#ef4444]/15 text-[#ef4444] font-semibold">
                            {round.notConfirmedCount} not confirmed ({fmtMW(round.notConfirmedMW)})
                          </span>
                        )}
                      </div>

                      {/* Notable winners */}
                      <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-3">
                        <p className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-1.5">Notable Projects</p>
                        <div className="space-y-0.5">
                          {round.notableWinners.map((w, j) => {
                            const status = getNotableProjectColor(w, round.id)
                            return (
                              <p key={j} className={`text-[10px] flex items-start gap-1.5 ${status.text}`}>
                                <span className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: status.bullet }} />
                                <span className="flex-1">
                                  {w}
                                  {status.label && (
                                    <span className={`ml-1.5 text-[8px] font-semibold uppercase tracking-wider px-1 py-0.5 rounded ${
                                      status.label === 'Operating' ? 'bg-emerald-500/15 text-emerald-400' :
                                      status.label === 'Construction' ? 'bg-blue-500/15 text-blue-400' :
                                      status.label === 'Confirmed' ? 'bg-emerald-500/10 text-emerald-400/70' :
                                      'bg-amber-500/10 text-amber-400/70'
                                    }`}>{status.label}</span>
                                  )}
                                </span>
                              </p>
                            )
                          })}
                        </div>
                        {/* Legend */}
                        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-[var(--color-border)]">
                          <span className="flex items-center gap-1 text-[8px] text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Operating/Confirmed</span>
                          <span className="flex items-center gap-1 text-[8px] text-blue-400"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />Construction</span>
                          <span className="flex items-center gap-1 text-[8px] text-amber-400"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Awarded</span>
                          <span className="flex items-center gap-1 text-[8px] text-[var(--color-text-muted)]"><span className="w-1.5 h-1.5 rounded-full bg-[#636e72]" />Not confirmed</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Cumulative progress summary */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h3 className="text-sm font-bold text-[var(--color-text)] mb-3">Cumulative Progress</h3>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-[var(--color-text-muted)]">Projects reaching construction/operating phase</span>
              <span className="text-xs font-bold text-[#3b82f6]">{overallStats.constructionCount} of {overallStats.total} ({overallStats.constructionPct}%)</span>
            </div>
            <div className="h-3 rounded-full bg-[var(--color-bg)] overflow-hidden">
              <div className="h-full rounded-full bg-[#3b82f6]" style={{ width: `${overallStats.constructionPct}%` }} />
            </div>
            <p className="text-[9px] text-[var(--color-text-muted)] mt-1">
              {fmtMW(overallStats.constructionMW)} of {fmtMW(overallStats.totalMW)} awarded capacity is in construction or operating
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-[var(--color-text-muted)]">Projects with confirmed agreement (construction + ESG proxy)</span>
              <span className="text-xs font-bold text-[#22c55e]">{overallStats.confirmedCount} of {overallStats.total} ({overallStats.confirmedPct}%)</span>
            </div>
            <div className="h-3 rounded-full bg-[var(--color-bg)] overflow-hidden">
              <div className="h-full rounded-full bg-[#22c55e]" style={{ width: `${overallStats.confirmedPct}%` }} />
            </div>
            <p className="text-[9px] text-[var(--color-text-muted)] mt-1">
              {fmtMW(overallStats.confirmedMW)} of {fmtMW(overallStats.totalMW)} — includes projects in construction/operating and those with published ESG commitments
            </p>
          </div>
        </div>
      </div>

      {/* Key projects that will move the dial */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h3 className="text-sm font-bold text-[var(--color-text)] mb-1">7 Key Projects Closest to Commencing Construction</h3>
        <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed mb-4">
          Curated based on developer track record, planning maturity, and time since award — these are the projects most likely
          to break through from development to construction in the near term. Together they represent{' '}
          <strong className="text-[var(--color-text)]">{fmtMW(keyProjects.reduce((s, p) => s + p.capacityMW, 0))}</strong> — converting
          them would materially shift the CIS/LTESA delivery rate.
        </p>

        <div className="space-y-3">
          {keyProjects.map((p, i) => {
            const schemeColor = p.scheme === 'CIS' ? '#f59e0b' : '#8b5cf6'
            const agrCfg = AGR_STATUS_CONFIG[p.agreementStatus]
            const roundDate = new Date(p.awardAnnouncedDate)
            const monthsSinceAward = Math.floor((Date.now() - roundDate.getTime()) / (1000 * 60 * 60 * 24 * 30))

            // Project-specific next milestones
            const milestoneMap: Record<string, { text: string; color: string; rationale: string }> = {
              'valley-of-the-winds': { text: 'Grid connection offer & financial close', color: '#f59e0b', rationale: 'ACEN well-capitalised via BlackRock. Strong FN partnerships (Yindjibarndi 25% equity model in WA). EPBC submitted.' },
              'spicers-creek-wind-farm': { text: 'Planning determination & financial close', color: '#f59e0b', rationale: 'Squadron Energy (formerly CWP) has deep development pipeline and recent project completions. Strong grid connection pathway in Central-West Orana REZ.' },
              'liverpool-range-wind-farm': { text: 'Financial close & construction mobilisation', color: '#22c55e', rationale: 'Tilt Renewables (Powering Australian Renewables fund). Well-advanced planning pre-CIS award. Strong likelihood of near-term construction start.' },
              'junction-rivers-wind-and-bess': { text: 'Planning approval & grid connection offer', color: '#f59e0b', rationale: 'Large hybrid project (wind + BESS) in NSW New England REZ. Progressing through state planning approvals.' },
              'kentbruck-green-power-hub': { text: 'Grid connection & financial close', color: '#f59e0b', rationale: 'VIC wind project in the South-West REZ with established grid connection pathway. 600 MW scale provides financing leverage.' },
              'coppabella-wind-farm': { text: 'Financial close overdue — critical path', color: '#ef4444', rationale: 'LTESA R1 project awarded May 2023. 34+ months in development is concerning. Must progress to financial close to avoid falling behind.' },
              'goyder-north-wind-farm': { text: 'Grid connection offer (adjacent to Goyder South)', color: '#22c55e', rationale: 'Neoen is tier-1 developer. Goyder South already operating — shared infrastructure and grid connection significantly de-risks this project.' },
            }

            const milestone = milestoneMap[p.projectId || ''] || { text: 'Planning & grid connection', color: '#f59e0b', rationale: '' }

            return (
              <div key={p.name} className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-[10px] font-bold" style={{ color: schemeColor }}>#{i + 1}</span>
                      {p.projectId ? (
                        <Link
                          to={`/projects/${p.projectId}?from=intelligence/scheme-tracker&fromLabel=Back to Scheme Intelligence`}
                          className="text-xs font-bold text-blue-400 hover:text-blue-300"
                        >
                          {p.name}
                        </Link>
                      ) : (
                        <span className="text-xs font-bold text-[var(--color-text)]">{p.name}</span>
                      )}
                      <span
                        className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ backgroundColor: `${schemeColor}20`, color: schemeColor }}
                      >
                        {p.scheme}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-muted)] flex-wrap">
                      <span>{p.developer}</span>
                      <span>·</span>
                      <span>{p.state}</span>
                      <span>·</span>
                      <span className="font-semibold text-[var(--color-text)]">{p.capacityMW.toLocaleString()} MW</span>
                      <span>·</span>
                      <span>{p.round}</span>
                    </div>
                  </div>
                  <span
                    className="text-[9px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: `${agrCfg.color}15`, color: agrCfg.color }}
                  >
                    {agrCfg.label}
                  </span>
                </div>

                {/* Next milestone */}
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[9px] text-[var(--color-text-muted)]">Next milestone:</span>
                  <span
                    className="text-[9px] font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${milestone.color}15`, color: milestone.color }}
                  >
                    {milestone.text}
                  </span>
                </div>
                {milestone.rationale && (
                  <p className="mt-1.5 text-[9px] text-[var(--color-text-muted)] leading-relaxed italic">
                    {milestone.rationale}
                  </p>
                )}
                <div className="mt-1 text-[9px] text-[var(--color-text-muted)]">
                  Awarded {monthsSinceAward} months ago · Target COD: {
                    timelineRounds.find(r => r.id === p.roundId)?.targetCOD || '—'
                  }
                </div>
              </div>
            )
          })}
        </div>

        {/* Total impact callout */}
        <div className="mt-4 bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 rounded-xl p-4 text-center">
          <p className="text-xs text-[var(--color-text)] leading-relaxed">
            These 7 projects represent <strong>{fmtMW(keyProjects.reduce((s, p) => s + p.capacityMW, 0))}</strong> —
            if all reached construction, the overall construction rate would jump from{' '}
            <strong className="text-[#3b82f6]">{overallStats.constructionPct}%</strong> to{' '}
            <strong className="text-[#22c55e]">
              {Math.round(((overallStats.constructionCount + 7) / overallStats.total) * 100)}%
            </strong>{' '}
            of projects and from{' '}
            <strong className="text-[#3b82f6]">{fmtMW(overallStats.constructionMW)}</strong> to{' '}
            <strong className="text-[#22c55e]">{fmtMW(overallStats.constructionMW + keyProjects.reduce((s, p) => s + p.capacityMW, 0))}</strong>.
          </p>
        </div>
      </div>

      {/* Source note */}
      <div className="text-[10px] text-[var(--color-text-muted)] italic">
        Timeline data sourced from DCCEEW CIS tender results, AEMO Services LTESA announcements, and the AURES full scheme analysis.
        Construction status and agreement confidence derived from ESG Agreement Proxy analysis.
      </div>
    </div>
  )
}
