import { useState, useMemo, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useProjectIndex } from '../hooks/useProjectData'
import { TECHNOLOGY_CONFIG, STATUS_CONFIG, CONFIDENCE_CONFIG, DEVELOPMENT_STAGE_CONFIG, type Technology, type ProjectStatus, type State, type Confidence, type DevelopmentStage } from '../lib/types'
import type { ProjectSummary } from '../lib/types'
import ProjectCard from '../components/common/ProjectCard'
import { isCuratedProject } from '../lib/curatedFilter'
import { useWatchlist } from '../lib/useWatchlist'

type SortKey = 'name' | 'capacity_mw' | 'state' | 'status'
type PipelineTier = 'curated' | 'extended' | 'onshore' | 'full'

const PIPELINE_TIERS: { key: PipelineTier; label: string; shortLabel: string }[] = [
  { key: 'curated', label: 'Curated', shortLabel: 'Curated' },
  { key: 'extended', label: 'Extended', shortLabel: 'Extended' },
  { key: 'onshore', label: 'All Onshore', shortLabel: 'Onshore' },
  { key: 'full', label: 'Full Pipeline', shortLabel: 'Full' },
]

function parseMulti<T extends string>(raw: string | null): T[] {
  if (!raw) return []
  return raw.split(',').filter(Boolean) as T[]
}

/** Tier 2: Extended — all non-zombie, no offshore */
function isExtendedProject(p: ProjectSummary): boolean {
  if (p.user_override === 'include') return true
  if (p.user_override === 'exclude') return false
  if (p.status !== 'development') return true
  if (p.technology === 'offshore_wind') return false
  if (p.has_scheme_contract) return true
  if (p.zombie_flag) return false
  return true
}

/** Tier 3: All Onshore — everything except offshore wind */
function isOnshoreProject(p: ProjectSummary): boolean {
  return p.technology !== 'offshore_wind'
}

function filterByTier(projects: ProjectSummary[], tier: PipelineTier): ProjectSummary[] {
  switch (tier) {
    case 'curated': return projects.filter(isCuratedProject)
    case 'extended': return projects.filter(isExtendedProject)
    case 'onshore': return projects.filter(isOnshoreProject)
    case 'full': return projects
  }
}

export default function ProjectList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [sortBy, setSortBy] = useState<SortKey>('capacity_mw')
  const [sortDesc, setSortDesc] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const { toggle: toggleWatch, isWatched } = useWatchlist()
  const [showCuratedInfo, setShowCuratedInfo] = useState(false)
  const { projects: allProjects, loading } = useProjectIndex()

  // Pipeline tier — default curated
  const tierParam = searchParams.get('pipeline') as PipelineTier | null
  const currentTier: PipelineTier = tierParam && ['curated', 'extended', 'onshore', 'full'].includes(tierParam) ? tierParam : 'curated'

  // Multi-value filter support (comma-separated)
  const techFilters = parseMulti<Technology>(searchParams.get('tech'))
  const statusFilters = parseMulti<ProjectStatus>(searchParams.get('status'))
  const stateFilters = parseMulti<State>(searchParams.get('state'))
  const confidenceFilter = searchParams.get('confidence') as Confidence | null
  const stageFilters = parseMulti<DevelopmentStage>(searchParams.get('stage'))
  const eisOnly = searchParams.get('eis') === '1'
  const fromPage = searchParams.get('from')
  const fromLabel = searchParams.get('fromLabel')
  const customTitle = searchParams.get('title')
  const idFilter = searchParams.get('ids')
  const idSet = useMemo(() => idFilter ? new Set(idFilter.split(',')) : null, [idFilter])

  const showStageFilter = statusFilters.includes('development') || (!statusFilters.length && !techFilters.length && !stateFilters.length)

  // Close mobile filter sheet on escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showFilters) setShowFilters(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [showFilters])

  // Tier counts
  const tierCounts = useMemo(() => ({
    curated: filterByTier(allProjects, 'curated').length,
    extended: filterByTier(allProjects, 'extended').length,
    onshore: filterByTier(allProjects, 'onshore').length,
    full: allProjects.length,
  }), [allProjects])

  const filtered = useMemo(() => {
    let result = [...allProjects]

    if (idSet) result = result.filter((p) => idSet.has(p.id))

    // Apply pipeline tier filter
    if (!idSet) {
      result = filterByTier(result, currentTier)
    }

    if (techFilters.length) result = result.filter((p) => techFilters.includes(p.technology))
    if (statusFilters.length) result = result.filter((p) => statusFilters.includes(p.status))
    if (stateFilters.length) result = result.filter((p) => stateFilters.includes(p.state))
    if (confidenceFilter) result = result.filter((p) => p.data_confidence === confidenceFilter)
    if (stageFilters.length) result = result.filter((p) => p.development_stage && stageFilters.includes(p.development_stage))
    if (eisOnly) result = result.filter((p) => p.has_eis_data)

    result.sort((a, b) => {
      let cmp = 0
      switch (sortBy) {
        case 'name':
          cmp = a.name.localeCompare(b.name)
          break
        case 'capacity_mw':
          cmp = a.capacity_mw - b.capacity_mw
          break
        case 'state':
          cmp = a.state.localeCompare(b.state)
          break
        case 'status': {
          const statusOrder: Record<string, number> = { operating: 0, commissioning: 1, construction: 2, development: 3, withdrawn: 4 }
          cmp = (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5)
          break
        }
      }
      return sortDesc ? -cmp : cmp
    })

    return result
  }, [allProjects, idSet, currentTier, techFilters.join(','), statusFilters.join(','), stateFilters.join(','), confidenceFilter, stageFilters.join(','), eisOnly, sortBy, sortDesc])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60dvh]">
        <div className="text-sm text-[var(--color-text-muted)] animate-pulse">Loading projects...</div>
      </div>
    )
  }

  const totalCapacity = filtered.reduce((sum, p) => sum + p.capacity_mw, 0)
  const activeFilters = [techFilters.length > 0, statusFilters.length > 0, stateFilters.length > 0, confidenceFilter, stageFilters.length > 0, eisOnly].filter(Boolean).length

  function clearFilters() {
    const sp = new URLSearchParams()
    if (currentTier !== 'curated') sp.set('pipeline', currentTier)
    setSearchParams(sp)
  }

  function toggleFilter(key: string, value: string) {
    const sp = new URLSearchParams(searchParams)
    sp.delete('from')
    const current = sp.get(key) || ''
    const values = current ? current.split(',').filter(Boolean) : []
    const idx = values.indexOf(value)
    if (idx >= 0) {
      values.splice(idx, 1)
    } else {
      values.push(value)
    }
    if (values.length > 0) {
      sp.set(key, values.join(','))
    } else {
      sp.delete(key)
    }
    setSearchParams(sp)
  }

  function isFilterActive(key: string, value: string): boolean {
    const raw = searchParams.get(key) || ''
    return raw.split(',').includes(value)
  }

  function setTier(tier: PipelineTier) {
    const sp = new URLSearchParams(searchParams)
    if (tier === 'curated') {
      sp.delete('pipeline')
    } else {
      sp.set('pipeline', tier)
    }
    setSearchParams(sp)
  }

  // ── Shared filter chip renderer ──
  function renderFilterChips() {
    return (
      <div className="space-y-3">
        {/* Pipeline Tier */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Pipeline</div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {PIPELINE_TIERS.map((tier) => {
              const isActive = currentTier === tier.key
              return (
                <button
                  key={tier.key}
                  onClick={() => setTier(tier.key)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] border-[var(--color-primary)]/30 font-medium'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
                  }`}
                >
                  {tier.label} ({tierCounts[tier.key]})
                </button>
              )
            })}
          </div>
          {currentTier === 'curated' && (
            <button
              onClick={() => setShowCuratedInfo(!showCuratedInfo)}
              className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] mt-1 underline decoration-dotted"
            >
              What does Curated mean?
            </button>
          )}
          {showCuratedInfo && (
            <div className="mt-2 text-[11px] text-[var(--color-text-muted)] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-3 leading-relaxed">
              <strong className="text-[var(--color-text)]">Curated</strong> shows operating, commissioning and construction projects, plus development projects that have been awarded a <strong>CIS or LTESA</strong> contract, have <strong>EPBC approval or submission</strong>, or have <strong>medium+ data confidence</strong>. Offshore wind and zombie projects are excluded.
              <br /><br />
              <strong className="text-[var(--color-text)]">Extended</strong> adds all non-zombie development projects (regardless of confidence).
              <br />
              <strong className="text-[var(--color-text)]">All Onshore</strong> includes zombie projects but excludes offshore wind.
              <br />
              <strong className="text-[var(--color-text)]">Full Pipeline</strong> includes everything.
              <br /><br />
              <span className="text-[10px] opacity-75">Benchmarks: Clean Energy Council reports ~80-88 committed projects; AEMO Generation Information tracks ~400 proposed.</span>
            </div>
          )}
        </div>

        {/* Technology */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Technology</div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['wind', 'solar', 'bess', 'hybrid', 'offshore_wind', 'pumped_hydro'] as const).map((tech) => {
              const config = TECHNOLOGY_CONFIG[tech]
              const isActive = isFilterActive('tech', tech)
              return (
                <button
                  key={tech}
                  onClick={() => toggleFilter('tech', tech)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-transparent font-medium'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
                  }`}
                  style={
                    isActive
                      ? { backgroundColor: `${config.color}20`, color: config.color }
                      : undefined
                  }
                >
                  {config.icon} {config.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Status */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Status</div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['operating', 'commissioning', 'construction', 'development'] as const).map((status) => {
              const config = STATUS_CONFIG[status]
              const isActive = isFilterActive('status', status)
              return (
                <button
                  key={status}
                  onClick={() => toggleFilter('status', status)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-transparent font-medium'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
                  }`}
                  style={
                    isActive
                      ? { backgroundColor: `${config.color}20`, color: config.color }
                      : undefined
                  }
                >
                  {config.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* State */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">State</div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS'] as const).map((state) => {
              const isActive = isFilterActive('state', state)
              return (
                <button
                  key={state}
                  onClick={() => toggleFilter('state', state)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-transparent bg-[var(--color-primary)]/20 text-[var(--color-primary)] font-medium'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
                  }`}
                >
                  {state}
                </button>
              )
            })}
          </div>
        </div>

        {/* Confidence */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Data Quality</div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['high', 'good', 'medium', 'low'] as const).map((conf) => {
              const config = CONFIDENCE_CONFIG[conf]
              const isActive = confidenceFilter === conf
              return (
                <button
                  key={conf}
                  onClick={() => {
                    const sp = new URLSearchParams(searchParams)
                    sp.delete('from')
                    if (isActive) sp.delete('confidence')
                    else sp.set('confidence', conf)
                    setSearchParams(sp)
                  }}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-transparent font-medium'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
                  }`}
                  style={
                    isActive
                      ? { backgroundColor: `${config.color}20`, color: config.color }
                      : undefined
                  }
                >
                  <span className="font-mono text-[10px] mr-1" style={{ color: isActive ? config.color : undefined }}>{config.dots}</span>
                  {config.label.replace(' Confidence', '')}
                </button>
              )
            })}
          </div>
        </div>

        {/* Development Stage */}
        {showStageFilter && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Dev Stage</div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['epbc_approved', 'epbc_submitted', 'planning_submitted', 'early_stage'] as const).map((stage) => {
                const config = DEVELOPMENT_STAGE_CONFIG[stage]
                const isActive = isFilterActive('stage', stage)
                return (
                  <button
                    key={stage}
                    onClick={() => toggleFilter('stage', stage)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap ${
                      isActive
                        ? 'border-transparent font-medium'
                        : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
                    }`}
                    style={
                      isActive
                        ? { backgroundColor: `${config.color}20`, color: config.color }
                        : undefined
                    }
                  >
                    <span className="mr-1">{config.icon}</span>
                    {config.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* EIS filter */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Data</div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                const sp = new URLSearchParams(searchParams)
                if (eisOnly) sp.delete('eis')
                else sp.set('eis', '1')
                setSearchParams(sp, { replace: true })
              }}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap ${
                eisOnly
                  ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] border-[var(--color-primary)]/30 font-medium'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
              }`}
            >
              Has EIS data
            </button>
          </div>
        </div>

        {/* Sort */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Sort by</div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {([
              { key: 'capacity_mw', label: 'Capacity' },
              { key: 'name', label: 'Name' },
              { key: 'state', label: 'State' },
              { key: 'status', label: 'Status' },
            ] as const).map((option) => (
              <button
                key={option.key}
                onClick={() => {
                  if (sortBy === option.key) {
                    setSortDesc(!sortDesc)
                  } else {
                    setSortBy(option.key)
                    setSortDesc(true)
                  }
                }}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap ${
                  sortBy === option.key
                    ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] border-[var(--color-primary)]/30 font-medium'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
                }`}
              >
                {option.label}
                {sortBy === option.key && (sortDesc ? ' ↓' : ' ↑')}
              </button>
            ))}
          </div>
        </div>

        {/* Clear */}
        {activeFilters > 0 && (
          <button
            onClick={clearFilters}
            className="text-xs text-[var(--color-primary)] hover:underline"
          >
            Clear {activeFilters} filter{activeFilters > 1 ? 's' : ''} ×
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto">
      {/* Back navigation */}
      {fromPage && (
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-primary)] hover:underline mb-4"
        >
          ← {fromLabel || (fromPage === 'dashboard' ? 'Back to Dashboard' : `Back to ${fromPage}`)}
        </button>
      )}

      {/* Header */}
      <div className="mb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-[var(--color-text)] mb-1">
              {customTitle || 'All Projects'}
            </h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              {filtered.length} project{filtered.length !== 1 ? 's' : ''} ·{' '}
              {totalCapacity >= 1000
                ? `${(totalCapacity / 1000).toFixed(1)} GW`
                : `${totalCapacity} MW`
              } total capacity
            </p>
          </div>
          {/* Mobile filter toggle */}
          <button
            onClick={() => setShowFilters(true)}
            className="lg:hidden flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
            Filters
            {activeFilters > 0 && (
              <span className="bg-[var(--color-primary)] text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {activeFilters}
              </span>
            )}
          </button>
        </div>

        {/* Desktop: compact tier indicator */}
        <div className="hidden lg:flex items-center gap-2 mt-2">
          {PIPELINE_TIERS.map((tier) => {
            const isActive = currentTier === tier.key
            return (
              <button
                key={tier.key}
                onClick={() => setTier(tier.key)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                  isActive
                    ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] border-[var(--color-primary)]/30 font-medium'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
                }`}
              >
                {tier.label} ({tierCounts[tier.key]})
              </button>
            )
          })}
          {currentTier === 'curated' && (
            <button
              onClick={() => setShowCuratedInfo(!showCuratedInfo)}
              className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] underline decoration-dotted"
            >
              ⓘ
            </button>
          )}
        </div>
        {/* Desktop curated info */}
        {showCuratedInfo && (
          <div className="hidden lg:block mt-2 text-[11px] text-[var(--color-text-muted)] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-3 leading-relaxed max-w-2xl">
            <strong className="text-[var(--color-text)]">Curated</strong> shows operating, commissioning and construction projects, plus development projects that have been awarded a <strong>CIS or LTESA</strong> contract, have <strong>EPBC approval or submission</strong>, or have <strong>medium+ data confidence</strong>. Offshore wind and zombie projects are excluded.
            <span className="block mt-1 text-[10px] opacity-75">Benchmarks: Clean Energy Council reports ~80-88 committed projects; AEMO Generation Information tracks ~400 proposed.</span>
          </div>
        )}

        {/* Mobile: show current tier as subtle label */}
        <div className="lg:hidden flex items-center gap-2 mt-1">
          <span className="text-[10px] text-[var(--color-text-muted)]">
            {PIPELINE_TIERS.find(t => t.key === currentTier)?.label} view · {tierCounts[currentTier]} projects
          </span>
        </div>
      </div>

      {/* Desktop Filter Chips — always visible on lg+ */}
      <div className="hidden lg:block mb-4">
        {renderFilterChips()}
      </div>

      {/* Desktop sort (visible inline on desktop even without filter expansion) */}
      <div className="hidden lg:flex items-center gap-3 mb-4 text-xs text-[var(--color-text-muted)]">
        {/* Sort is already inside renderFilterChips, but we keep a visible sort on desktop outside the sheet */}
      </div>

      {/* Mobile Bottom Sheet */}
      {showFilters && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 bg-black/40 z-50 transition-opacity"
            onClick={() => setShowFilters(false)}
          />
          {/* Sheet */}
          <div className="lg:hidden fixed inset-x-0 bottom-0 z-50 bg-[var(--color-bg)] border-t border-[var(--color-border)] rounded-t-2xl max-h-[75dvh] overflow-y-auto overscroll-contain animate-slide-up">
            {/* Handle */}
            <div className="sticky top-0 bg-[var(--color-bg)] pt-3 pb-2 px-4 border-b border-[var(--color-border)]">
              <div className="w-10 h-1 rounded-full bg-[var(--color-border)] mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--color-text)]">Filters</span>
                <div className="flex items-center gap-3">
                  {activeFilters > 0 && (
                    <button
                      onClick={clearFilters}
                      className="text-xs text-[var(--color-primary)]"
                    >
                      Clear all
                    </button>
                  )}
                  <button
                    onClick={() => setShowFilters(false)}
                    className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
            <div className="px-4 py-4">
              {renderFilterChips()}
            </div>
            {/* Safe area padding for bottom nav */}
            <div className="h-6" />
          </div>
        </>
      )}

      {/* Project Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.map((project) => (
          <ProjectCard key={project.id} project={project} isWatched={isWatched(project.id)} onToggleWatch={toggleWatch} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-lg text-[var(--color-text-muted)]">No projects match your filters</p>
          <button
            onClick={clearFilters}
            className="mt-2 text-sm text-[var(--color-primary)] hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  )
}
