import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { fetchNemActivities } from '../../lib/dataService'
import type { NemActivitiesData, NemActivityEvent } from '../../lib/types'
import DataProvenance from '../../components/common/DataProvenance'

// ============================================================
// Icons — defined BEFORE const arrays per project pattern
// ============================================================

const DevIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
  </svg>
)

const GovtIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 2L3 7h14L10 2zM4 8v7h2V8H4zm4 0v7h2V8H8zm4 0v7h2V8h-2zm-9 8h14a1 1 0 010 2H3a1 1 0 010-2z" clipRule="evenodd" />
  </svg>
)

const RezIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.381z" clipRule="evenodd" />
  </svg>
)

const ConstructionIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm-4 8.67A24.98 24.98 0 0010 15c2.1 0 4.13-.26 6-.73V17a2 2 0 01-2 2H6a2 2 0 01-2-2v-3.33z" clipRule="evenodd" />
  </svg>
)

const OperationalIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
  </svg>
)

// ============================================================
// Section configuration
// ============================================================

type SectionId = 'development' | 'govt_programs' | 'rez_progress' | 'construction' | 'operational'

const SECTIONS: { id: SectionId; label: string; icon: React.ReactNode; colour: string; bgColour: string }[] = [
  { id: 'development', label: 'Development', icon: <DevIcon />, colour: '#8b5cf6', bgColour: 'bg-violet-500/10' },
  { id: 'govt_programs', label: 'Govt Programs', icon: <GovtIcon />, colour: '#f59e0b', bgColour: 'bg-amber-500/10' },
  { id: 'rez_progress', label: 'REZ Progress', icon: <RezIcon />, colour: '#3b82f6', bgColour: 'bg-blue-500/10' },
  { id: 'construction', label: 'Construction', icon: <ConstructionIcon />, colour: '#10b981', bgColour: 'bg-emerald-500/10' },
  { id: 'operational', label: 'Operational', icon: <OperationalIcon />, colour: '#ef4444', bgColour: 'bg-red-500/10' },
]

const TECH_COLOURS: Record<string, string> = {
  wind: '#3b82f6', solar: '#f59e0b', bess: '#10b981',
  pumped_hydro: '#8b5cf6', hybrid: '#ec4899',
}

const TECH_LABELS: Record<string, string> = {
  wind: 'Wind', solar: 'Solar', bess: 'BESS',
  pumped_hydro: 'Pumped Hydro', hybrid: 'Hybrid',
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split('-')
  const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[parseInt(m)] || m} ${y}`
}

function formatMW(mw: number): string {
  if (mw >= 1000) return `${(mw / 1000).toFixed(1)} GW`
  return `${Math.round(mw)} MW`
}

// ============================================================
// Main component
// ============================================================

export default function NemActivities() {
  const [data, setData] = useState<NemActivitiesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState<Record<SectionId, boolean>>({
    development: true, govt_programs: true, rez_progress: true,
    construction: true, operational: true,
  })
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())
  const [showAll, setShowAll] = useState(false)
  const [hideOffshore, setHideOffshore] = useState(false)
  const [hideCodChange, setHideCodChange] = useState(true) // OFF by default — very noisy
  const [eventTypeFilters, setEventTypeFilters] = useState<Record<string, boolean>>({
    fid: true, construction_start: true, cod: true, energisation: true,
    planning: true, notable: true, other: true,
  })

  useEffect(() => {
    fetchNemActivities().then(d => { setData(d); setLoading(false) })
  }, [])

  // Auto-expand most recent 6 months
  useEffect(() => {
    if (data?.months) {
      const recent = new Set(data.months.slice(0, 6).map(m => m.month))
      setExpandedMonths(recent)
    }
  }, [data])

  const EVENT_TYPE_TOGGLES = [
    { id: 'fid', label: 'FID', colour: '#f59e0b' },
    { id: 'construction_start', label: 'Construction', colour: '#10b981' },
    { id: 'cod', label: 'COD', colour: '#3b82f6' },
    { id: 'energisation', label: 'Energisation', colour: '#8b5cf6' },
    { id: 'planning', label: 'Planning', colour: '#6366f1' },
    { id: 'notable', label: 'Notable', colour: '#ec4899' },
    { id: 'other', label: 'Other', colour: '#6b7280' },
  ] as const

  const hasEventTypeFilter = Object.values(eventTypeFilters).some(v => !v)

  const classifyEventType = (et: string): string => {
    if (et === 'fid') return 'fid'
    if (et === 'construction_start' || et === 'equipment_order') return 'construction_start'
    if (et === 'cod' || et === 'commissioning') return 'cod'
    if (et === 'energisation') return 'energisation'
    if (et === 'planning_submitted' || et === 'planning_approved' || et === 'planning_modified' || et === 'planning_rejected') return 'planning'
    if (et === 'notable' || et === 'stakeholder_issue') return 'notable'
    return 'other'
  }

  const filterEvents = (events: NemActivityEvent[]): NemActivityEvent[] => {
    return events.filter(evt => {
      // Hide offshore wind
      if (hideOffshore && evt.technology === 'offshore_wind') return false
      // Hide batch cod_change
      if (hideCodChange && evt.event_type === 'cod_change') return false
      // Event type filter
      if (hasEventTypeFilter) {
        const cls = classifyEventType(evt.event_type)
        if (!eventTypeFilters[cls]) return false
      }
      return true
    })
  }

  // Count cod_change events for display
  const codChangeCount = useMemo(() => {
    if (!data) return 0
    let count = 0
    for (const m of data.months) {
      for (const events of Object.values(m.sections)) {
        count += events.filter(e => e.event_type === 'cod_change').length
      }
    }
    return count
  }, [data])

  const filteredMonths = useMemo(() => {
    if (!data) return []
    return data.months.map(m => {
      const filteredSections = {} as Record<SectionId, NemActivityEvent[]>
      for (const sec of Object.keys(m.sections) as SectionId[]) {
        filteredSections[sec] = visible[sec] ? filterEvents(m.sections[sec]) : []
      }
      return { ...m, sections: filteredSections }
    }).filter(m => {
      return (Object.keys(m.sections) as SectionId[]).some(sec => m.sections[sec].length > 0)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, visible, eventTypeFilters, hideOffshore, hideCodChange])

  const displayMonths = showAll ? filteredMonths : filteredMonths.slice(0, 24)

  const toggle = (id: SectionId) => setVisible(v => ({ ...v, [id]: !v[id] }))
  const toggleMonth = (month: string) => setExpandedMonths(s => {
    const next = new Set(s)
    if (next.has(month)) next.delete(month); else next.add(month)
    return next
  })

  if (loading) return <div className="p-8 text-center text-[var(--color-text-muted)]">Loading NEM activities...</div>
  if (!data) return <div className="p-8 text-center text-[var(--color-text-muted)]">No activities data available.</div>

  return (
    <div className="px-4 lg:px-8 py-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-[var(--color-text)]">NEM Activities Timeline</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Month-by-month key highlights across the NEM. Toggle sections to focus on what matters.
        </p>
        <div className="mt-3">
          <DataProvenance page="nem-activities" />
        </div>
        <div className="mt-2">
          <Link
            to="/intelligence/project-timeline"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--color-primary)] hover:underline"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            See annual project pipeline trend →
          </Link>
        </div>
      </div>

      {/* Section toggles */}
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map(sec => (
          <button
            key={sec.id}
            onClick={() => toggle(sec.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              visible[sec.id]
                ? 'border-transparent text-white'
                : 'border-[var(--color-border)] text-[var(--color-text-muted)] opacity-50'
            }`}
            style={visible[sec.id] ? { backgroundColor: sec.colour } : {}}
          >
            {sec.icon}
            {sec.label}
            <span className="ml-1 opacity-75">{data.section_counts[sec.id] || 0}</span>
          </button>
        ))}
      </div>

      {/* Event type filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider mr-1">Event Type</span>
        {EVENT_TYPE_TOGGLES.map(et => (
          <button
            key={et.id}
            onClick={() => setEventTypeFilters(f => ({ ...f, [et.id]: !f[et.id] }))}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
              eventTypeFilters[et.id]
                ? 'border-transparent text-white'
                : 'border-[var(--color-border)] text-[var(--color-text-muted)] opacity-50'
            }`}
            style={eventTypeFilters[et.id] ? { backgroundColor: et.colour } : {}}
          >
            {et.label}
          </button>
        ))}
        {hasEventTypeFilter && (
          <button
            onClick={() => setEventTypeFilters({ fid: true, construction_start: true, cod: true, energisation: true, planning: true, notable: true, other: true })}
            className="text-[10px] text-[var(--color-primary)] hover:underline ml-1"
          >
            Reset
          </button>
        )}
      </div>

      {/* Noise filters */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)] cursor-pointer">
          <input type="checkbox" checked={hideCodChange} onChange={() => setHideCodChange(v => !v)}
            className="rounded border-[var(--color-border)] accent-[var(--color-primary)]" />
          Hide COD estimate updates <span className="opacity-60">({codChangeCount})</span>
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)] cursor-pointer">
          <input type="checkbox" checked={hideOffshore} onChange={() => setHideOffshore(v => !v)}
            className="rounded border-[var(--color-border)] accent-[var(--color-primary)]" />
          Hide offshore wind
        </label>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        {SECTIONS.map(sec => (
          <div key={sec.id} className={`rounded-lg p-3 ${sec.bgColour}`}>
            <div className="text-xs text-[var(--color-text-muted)]">{sec.label}</div>
            <div className="text-lg font-bold text-[var(--color-text)]">{data.section_counts[sec.id] || 0}</div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {displayMonths.map(m => {
          const isExpanded = expandedMonths.has(m.month)
          const totalEvents = (Object.keys(m.sections) as SectionId[]).reduce(
            (sum, sec) => sum + (visible[sec] ? m.sections[sec].length : 0), 0
          )

          return (
            <div key={m.month} className="border border-[var(--color-border)] rounded-lg overflow-hidden">
              <button
                onClick={() => toggleMonth(m.month)}
                className="w-full flex items-center justify-between px-4 py-3 bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-card)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-[var(--color-text)]">{formatMonth(m.month)}</span>
                  <div className="flex gap-1">
                    {(Object.keys(m.sections) as SectionId[]).map(sec => {
                      const count = m.sections[sec].length
                      if (!count || !visible[sec]) return null
                      const secCfg = SECTIONS.find(s => s.id === sec)!
                      return (
                        <span key={sec} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: secCfg.colour }}>
                          {count}
                        </span>
                      )
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-text-muted)]">{totalEvents} events</span>
                  <svg className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 py-3 space-y-3">
                  {SECTIONS.filter(sec => visible[sec.id] && m.sections[sec.id].length > 0).map(sec => (
                    <div key={sec.id}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span style={{ color: sec.colour }}>{sec.icon}</span>
                        <span className="text-xs font-semibold" style={{ color: sec.colour }}>{sec.label}</span>
                        <span className="text-[10px] text-[var(--color-text-muted)]">({m.sections[sec.id].length})</span>
                      </div>
                      <div className="space-y-1.5 ml-5">
                        {m.sections[sec.id].map((evt, i) => (
                          <EventCard key={`${evt.project_id}-${evt.date}-${i}`} event={evt} sectionColour={sec.colour} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filteredMonths.length > 24 && !showAll && (
        <button onClick={() => setShowAll(true)} className="w-full text-center text-sm text-[var(--color-primary)] hover:underline py-2">
          Show all {filteredMonths.length} months
        </button>
      )}

      <p className="text-[11px] text-[var(--color-text-muted)]/50 text-center">
        Generated {data.generated_at?.split('T')[0]}. Data from project timeline events.
      </p>
    </div>
  )
}

// ============================================================
// Event Card
// ============================================================

function EventCard({ event: evt, sectionColour }: { event: NemActivityEvent; sectionColour: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <div className="w-1 h-1 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: sectionColour }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/projects/${evt.project_id}`} className="font-medium text-[var(--color-text)] hover:text-[var(--color-primary)] truncate">
            {evt.project_name}
          </Link>
          {evt.technology && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white flex-shrink-0" style={{ backgroundColor: TECH_COLOURS[evt.technology] || '#6b7280' }}>
              {TECH_LABELS[evt.technology] || evt.technology}
            </span>
          )}
          {evt.state && <span className="text-[10px] text-[var(--color-text-muted)]">{evt.state}</span>}
          {evt.capacity_mw > 0 && <span className="text-[10px] text-[var(--color-text-muted)]">{formatMW(evt.capacity_mw)}</span>}
        </div>
        <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
          <span className="font-medium">{evt.title}</span>
          {evt.detail && <span className="ml-1 opacity-75">— {evt.detail}</span>}
        </div>
        <div className="text-[10px] text-[var(--color-text-muted)]/50 mt-0.5">{evt.date}</div>
      </div>
    </div>
  )
}
