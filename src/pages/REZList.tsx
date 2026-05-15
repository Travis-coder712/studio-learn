import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useREZList } from '../hooks/useREZData'
import type { State } from '../lib/types'
import type { REZZone } from '../data/rez-zones'
import DataProvenance from '../components/common/DataProvenance'

const STATE_TABS: { label: string; value: State | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'NSW', value: 'NSW' },
  { label: 'VIC', value: 'VIC' },
  { label: 'QLD', value: 'QLD' },
  { label: 'SA', value: 'SA' },
  { label: 'TAS', value: 'TAS' },
]

const STATUS_COLORS: Record<REZZone['status'], string> = {
  declared: '#22c55e',
  'in-flight': '#84cc16',
  draft: '#f59e0b',
  candidate: '#8b5cf6',
  planning: '#6b7280',
}

const STATUS_LABELS: Record<REZZone['status'], string> = {
  declared: 'Declared',
  'in-flight': 'In-Flight',
  draft: 'Draft',
  candidate: 'Candidate',
  planning: 'Planning',
}

const STATE_COLORS: Record<string, string> = {
  NSW: '#3b82f6',
  VIC: '#8b5cf6',
  QLD: '#f59e0b',
  SA: '#ef4444',
  TAS: '#14b8a6',
  WA: '#f97316',
}

const ALL_STATUSES: REZZone['status'][] = ['declared', 'draft', 'in-flight', 'candidate', 'planning']

const STATUS_DESCRIPTIONS: Record<REZZone['status'], string> = {
  declared: 'Formally gazetted by state government. Transmission procurement underway or complete.',
  draft: 'Draft REZ order issued. Awaiting formal declaration.',
  'in-flight': 'REZ development actively underway — transmission built, anchor projects connecting.',
  candidate: 'Identified in AEMO\'s ISP as a candidate REZ. Formal state declaration pending.',
  planning: 'Early-stage planning or feasibility assessment.',
}

export default function REZList() {
  const [stateFilter, setStateFilter] = useState<State | 'ALL'>('ALL')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const { zones: allZones, totalCapacity, totalZones } = useREZList(stateFilter)

  const zones = statusFilter.length > 0
    ? allZones.filter(z => statusFilter.includes(z.status))
    : allZones

  function toggleStatus(status: string) {
    setStatusFilter(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    )
  }

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <section>
        <h1 className="text-2xl lg:text-3xl font-bold text-[var(--color-text)] mb-2">
          Renewable Energy Zones
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          {totalZones} REZ zones across 5 states. {totalCapacity.toFixed(1)} GW of declared network capacity.
        </p>
        <div className="mt-3">
          <DataProvenance page="rez" />
        </div>
      </section>

      {/* Summary Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {(['NSW', 'VIC', 'QLD', 'SA', 'TAS'] as State[]).map((state) => {
          const count = stateFilter === 'ALL'
            ? zones.filter((z) => z.state === state).length
            : stateFilter === state ? zones.length : 0
          if (stateFilter !== 'ALL' && stateFilter !== state) return null
          return (
            <div
              key={state}
              className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3"
            >
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                {state}
              </p>
              <p className="text-lg font-bold" style={{ color: STATE_COLORS[state] }}>
                {count} zones
              </p>
            </div>
          )
        })}
      </section>

      {/* State Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATE_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStateFilter(tab.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              stateFilter === tab.value
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] w-14 shrink-0">
          Status
        </span>
        {ALL_STATUSES.map(status => {
          const isActive = statusFilter.includes(status)
          const color = STATUS_COLORS[status]
          return (
            <button
              key={status}
              onClick={() => toggleStatus(status)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                isActive
                  ? 'border-transparent font-medium'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
              }`}
              style={isActive ? { backgroundColor: `${color}20`, color } : undefined}
            >
              {STATUS_LABELS[status]}
            </button>
          )
        })}
        {statusFilter.length > 0 && (
          <button
            onClick={() => setStatusFilter([])}
            className="text-xs text-blue-400 hover:underline ml-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* Status Legend */}
      <details className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl px-4 py-3">
        <summary className="text-xs font-medium text-[var(--color-text)] cursor-pointer">What do the REZ statuses mean?</summary>
        <div className="mt-3 space-y-2">
          {ALL_STATUSES.map(status => (
            <div key={status} className="flex items-start gap-2">
              <span
                className="text-[10px] px-2 py-0.5 rounded-full mt-0.5 shrink-0 font-medium"
                style={{ backgroundColor: `${STATUS_COLORS[status]}20`, color: STATUS_COLORS[status] }}
              >
                {STATUS_LABELS[status]}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">{STATUS_DESCRIPTIONS[status]}</span>
            </div>
          ))}
        </div>
      </details>

      {/* REZ Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {zones.map((zone) => (
          <REZCard key={zone.id} zone={zone} />
        ))}
      </div>

      {zones.length === 0 && (
        <p className="text-sm text-[var(--color-text-muted)] text-center py-8">
          No REZ zones found for this filter.
        </p>
      )}
    </div>
  )
}

function REZCard({ zone }: { zone: REZZone }) {
  return (
    <Link
      to={`/rez/${zone.id}`}
      className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 hover:border-[var(--color-primary)]/30 transition-colors group"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{
              color: STATE_COLORS[zone.state],
              backgroundColor: STATE_COLORS[zone.state] + '15',
            }}
          >
            {zone.state}
          </span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded"
            style={{
              color: STATUS_COLORS[zone.status],
              backgroundColor: STATUS_COLORS[zone.status] + '15',
            }}
          >
            {STATUS_LABELS[zone.status]}
          </span>
        </div>
        {zone.target_capacity_gw !== null && (
          <span className="text-sm font-bold text-[var(--color-primary)]">
            {zone.target_capacity_gw} GW
          </span>
        )}
      </div>

      <h3 className="text-base font-semibold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors mb-1">
        {zone.name}
      </h3>

      <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 mb-2">
        {zone.description}
      </p>

      {zone.transmission_project && (
        <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)]">
          <span>🔌</span>
          <span className="truncate">{zone.transmission_project}</span>
          {zone.transmission_status && (
            <span
              className="px-1 py-0.5 rounded flex-shrink-0"
              style={{
                color:
                  zone.transmission_status === 'operating'
                    ? '#22c55e'
                    : zone.transmission_status === 'construction'
                    ? '#f59e0b'
                    : '#6b7280',
                backgroundColor:
                  zone.transmission_status === 'operating'
                    ? '#22c55e15'
                    : zone.transmission_status === 'construction'
                    ? '#f59e0b15'
                    : '#6b728015',
              }}
            >
              {zone.transmission_status}
            </span>
          )}
        </div>
      )}
    </Link>
  )
}
