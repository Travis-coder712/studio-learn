import { useState, useEffect } from 'react'
import { fetchDataSources } from '../lib/dataService'
import type { DataSourcesIndex, DataSourceInfo } from '../lib/types'

interface UpdateLogEntry {
  date: string
  version: string
  title: string
  completed: boolean
  summary: string
  data_refreshed: { source: string; days_stale: number; note: string }[]
  new_operational: { project: string; technology: string; capacity_mw: number; state: string; cod: string; note: string }[]
  status_changes: { project: string; from: string; to: string; capacity_mw: number; state: string }[]
  nem_records: { metric: string; value: string; date: string; note: string }[]
  new_projects: { project: string; technology: string; capacity_mw: number; state: string; note: string }[]
  removed_projects: { project: string; reason: string }[]
  data_quality_notes: string
}

interface PipelineStep {
  step: string
  success: boolean
  duration_seconds: number
}

interface PipelineRun {
  started_at: string
  completed_at: string
  total_seconds: number
  steps_total: number
  steps_succeeded: number
  steps_failed: number
  steps: PipelineStep[]
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const now = new Date()
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
}

function getStatus(source: DataSourceInfo): { label: string; color: string } {
  if (source.last_status === 'never') return { label: 'Never Run', color: '#ef4444' }
  if (source.last_status === 'failed') return { label: 'Failed', color: '#ef4444' }
  if (source.last_status === 'running') return { label: 'Running', color: '#f59e0b' }

  const days = daysSince(source.last_run)
  if (days === null) return { label: 'Unknown', color: '#6b7280' }

  const thresholds: Record<string, number> = {
    monthly: 35,
    quarterly: 100,
    ad_hoc: 999,
  }
  const threshold = thresholds[source.frequency] || 35

  if (days <= threshold * 0.7) return { label: 'Current', color: '#22c55e' }
  if (days <= threshold) return { label: 'Due Soon', color: '#f59e0b' }
  return { label: 'Overdue', color: '#ef4444' }
}

function formatFrequency(f: string): string {
  return f === 'ad_hoc' ? 'Ad hoc' : f.charAt(0).toUpperCase() + f.slice(1)
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toString()
}

function UpdateNowCards({ sources }: { sources: DataSourceInfo[] }) {
  const [copied, setCopied] = useState<string | null>(null)
  const [expandedPhase, setExpandedPhase] = useState<1 | 2 | null>(null)

  const copyCommand = (cmd: string, id: string) => {
    navigator.clipboard.writeText(cmd)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const overdueCount = sources.filter(s => {
    const days = daysSince(s.last_run)
    const thresholds: Record<string, number> = { monthly: 35, quarterly: 100, ad_hoc: 999 }
    return days !== null && days > (thresholds[s.frequency] || 35)
  }).length

  const dueSoonCount = sources.filter(s => {
    const days = daysSince(s.last_run)
    const thresholds: Record<string, number> = { monthly: 35, quarterly: 100, ad_hoc: 999 }
    const threshold = thresholds[s.frequency] || 35
    return days !== null && days > threshold * 0.7 && days <= threshold
  }).length

  const headerColour = overdueCount > 0 ? '#ef4444' : dueSoonCount > 0 ? '#f59e0b' : '#22c55e'
  const headerLabel = overdueCount > 0 ? `${overdueCount} overdue` : dueSoonCount > 0 ? `${dueSoonCount} due soon` : 'All current'

  const oeSrc = sources.find(s => s.id === 'openelectricity_performance')
  const oeAge = oeSrc ? daysSince(oeSrc.last_run) : null
  const exportSrc = sources.find(s => s.id === 'json_export')
  const exportAge = exportSrc ? daysSince(exportSrc.last_run) : null

  return (
    <div className="space-y-4 mb-8">
      <div className="flex items-center gap-3 px-1">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: headerColour }} />
        <span className="text-sm font-medium text-[var(--color-text)]">Data Freshness: {headerLabel}</span>
        <span className="text-xs text-[var(--color-text-muted)]">
          Performance: {oeAge !== null ? `${oeAge}d ago` : 'never'}
          {' | '}
          Intelligence: {exportAge !== null ? `${exportAge}d ago` : 'never'}
        </span>
      </div>

      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
        <button
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
          onClick={() => setExpandedPhase(expandedPhase === 1 ? null : 1)}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#3b82f6]/10 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-[#3b82f6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold text-[var(--color-text)]">Phase 1: Update Data</div>
              <div className="text-[10px] text-[var(--color-text-muted)]">
                Fetch latest dispatch from OpenElectricity API, recompute league tables, export JSON
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {oeAge !== null && oeAge > 14 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f59e0b]/20 text-[#f59e0b]">
                {oeAge}d stale
              </span>
            )}
            <svg
              className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform ${expandedPhase === 1 ? 'rotate-180' : ''}`}
              viewBox="0 0 20 20" fill="currentColor"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </button>

        {expandedPhase === 1 && (
          <div className="border-t border-[var(--color-border)]">
            <div className="px-4 py-3 border-b border-[var(--color-border)]/50">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#22c55e]/20 text-[#22c55e] font-medium">RECOMMENDED</span>
                <span className="text-xs font-medium text-[var(--color-text)]">Smart Refresh</span>
              </div>
              <p className="text-[10px] text-[var(--color-text-muted)] mb-2">
                Skips data fresher than 14 days. Only fetches what's stale. Estimates ~15-25 API calls.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-[var(--color-bg)] text-[10px] text-[#22c55e] px-2.5 py-1.5 rounded-lg font-mono">
                  python3 pipeline/smart_refresh.py --phase data
                </code>
                <button
                  onClick={() => copyCommand('cd ~/aures-db && python3 pipeline/smart_refresh.py --phase data', 'smart')}
                  className="shrink-0 text-[10px] px-2 py-1.5 rounded-lg bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors border border-[var(--color-border)]"
                >
                  {copied === 'smart' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="px-4 py-3 border-b border-[var(--color-border)]/50">
              <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-2">Or run individual steps:</div>
              {[
                { id: 'aemo', label: 'AEMO Generation Info', sourceId: 'aemo_generation_info', command: 'python3 pipeline/importers/import_aemo_gen_info.py', note: 'Project status, capacities from AEMO registry' },
                { id: 'oe_perf', label: 'OpenElectricity Performance', sourceId: 'openelectricity_performance', command: `python3 pipeline/importers/import_openelectricity.py --year ${new Date().getFullYear()} --ytd`, note: `YTD ${new Date().getFullYear()} dispatch data (~10 API calls)` },
                { id: 'oe_monthly', label: 'OpenElectricity Monthly', sourceId: 'openelectricity_performance', command: `python3 pipeline/importers/import_openelectricity.py --year ${new Date().getFullYear()} --monthly`, note: `Monthly breakdown for revenue/CF charts (~10 API calls)` },
                { id: 'export', label: 'Export JSON', command: 'python3 pipeline/exporters/export_json.py', note: 'Regenerate all frontend JSON from database' },
              ].map(step => {
                const source = step.sourceId ? sources.find(s => s.id === step.sourceId) : null
                const days = source ? daysSince(source.last_run) : null
                const status = source ? getStatus(source) : null
                return (
                  <div key={step.id} className="flex items-center gap-2 mb-2 last:mb-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-medium text-[var(--color-text)]">{step.label}</span>
                        {status && (
                          <span className="text-[9px] px-1 py-0.5 rounded" style={{ backgroundColor: status.color + '15', color: status.color }}>
                            {days !== null ? `${days}d` : status.label}
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-[var(--color-text-muted)]">{step.note}</p>
                    </div>
                    <button
                      onClick={() => copyCommand(`cd ~/aures-db && ${step.command}`, step.id)}
                      className="shrink-0 text-[9px] px-1.5 py-1 rounded bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors border border-[var(--color-border)]"
                    >
                      {copied === step.id ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="px-4 py-2 bg-[var(--color-bg-elevated)]">
              <span className="text-[10px] text-[var(--color-text-muted)]">
                Preview first: <code className="text-[var(--color-primary)]">python3 pipeline/smart_refresh.py --phase data --dry-run</code>
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
        <button
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
          onClick={() => setExpandedPhase(expandedPhase === 2 ? null : 2)}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#8b5cf6]/10 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-[#8b5cf6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold text-[var(--color-text)]">Phase 2: Update Intelligence</div>
              <div className="text-[10px] text-[var(--color-text-muted)]">
                Re-export analytics from DB, or use Claude for deep research updates
              </div>
            </div>
          </div>
          <svg
            className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform ${expandedPhase === 2 ? 'rotate-180' : ''}`}
            viewBox="0 0 20 20" fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        {expandedPhase === 2 && (
          <div className="border-t border-[var(--color-border)]">
            <div className="px-4 py-3 border-b border-[var(--color-border)]/50">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#22c55e]/20 text-[#22c55e] font-medium">AUTOMATED</span>
                <span className="text-xs font-medium text-[var(--color-text)]">Re-export Intelligence JSON</span>
              </div>
              <p className="text-[10px] text-[var(--color-text-muted)] mb-2">
                Regenerates scheme-tracker, revenue-intel, NEM activities, developer scores, and 8 other intelligence files from database. No API calls. Run after Phase 1 to reflect new performance data.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-[var(--color-bg)] text-[10px] text-[#8b5cf6] px-2.5 py-1.5 rounded-lg font-mono">
                  python3 pipeline/smart_refresh.py --phase intelligence
                </code>
                <button
                  onClick={() => copyCommand('cd ~/aures-db && python3 pipeline/smart_refresh.py --phase intelligence', 'intel')}
                  className="shrink-0 text-[10px] px-2 py-1.5 rounded-lg bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors border border-[var(--color-border)]"
                >
                  {copied === 'intel' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="px-4 py-3 border-b border-[var(--color-border)]/50">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f59e0b]/20 text-[#f59e0b] font-medium">AI-ASSISTED</span>
                <span className="text-xs font-medium text-[var(--color-text)]">Deep Intelligence Update (Claude)</span>
              </div>
              <p className="text-[10px] text-[var(--color-text-muted)] mb-2">
                Uses Claude Code to research latest CIS/LTESA announcements, construction milestones,
                scheme round results, and project narratives. Adds new timeline events and updates
                project data beyond what database re-export can do.
              </p>
              <div className="space-y-2">
                {[
                  { id: 'claude-schemes', label: 'Update scheme tracker (CIS/LTESA)', command: 'claude "Update AURES scheme-tracker: check for new CIS tender results, LTESA round announcements, and update project statuses in scheme-tracker.json"' },
                  { id: 'claude-projects', label: 'Enrich project intelligence', command: 'claude "Review AURES projects for new construction milestones, COD updates, developer changes, and significant events from the last month. Update timeline events and project narratives."' },
                  { id: 'claude-revenue', label: 'Update revenue analysis', command: 'claude "Refresh AURES revenue intelligence: identify projects with significant YoY revenue changes, update trouble list, and refresh state-level BESS/solar/wind rankings"' },
                ].map(step => (
                  <div key={step.id} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-medium text-[var(--color-text)]">{step.label}</span>
                    </div>
                    <button
                      onClick={() => copyCommand(step.command, step.id)}
                      className="shrink-0 text-[9px] px-1.5 py-1 rounded bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors border border-[var(--color-border)]"
                    >
                      {copied === step.id ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-4 py-2.5 bg-[var(--color-bg-elevated)]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[var(--color-text-muted)]">
                  Run both phases: <code className="text-[var(--color-primary)]">python3 pipeline/smart_refresh.py --phase all</code>
                </span>
                <button
                  onClick={() => copyCommand('cd ~/aures-db && python3 pipeline/smart_refresh.py --phase all', 'both')}
                  className="shrink-0 text-[10px] px-2.5 py-1 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 transition-colors font-medium"
                >
                  {copied === 'both' ? 'Copied!' : 'Copy Both Phases'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colours: Record<string, string> = {
    operating: '#22c55e',
    commissioning: '#3b82f6',
    construction: '#f59e0b',
    approved: '#8b5cf6',
    proposed: '#6b7280',
  }
  const colour = colours[status] ?? '#6b7280'
  return (
    <span
      className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: colour + '20', color: colour }}
    >
      {status}
    </span>
  )
}

function UpdateLogSection({ entries }: { entries: UpdateLogEntry[] }) {
  const [expanded, setExpanded] = useState<number | null>(
    entries[0] && !entries[0].completed ? 0 : null
  )

  if (entries.length === 0) return null

  return (
    <div className="mt-6 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Data Update Log</h2>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          Record of each data refresh — new operational assets, NEM records, and status transitions
        </p>
      </div>

      <div className="divide-y divide-[var(--color-border)]/50">
        {entries.map((entry, idx) => {
          const isExpanded = expanded === idx
          const hasDetail = (
            entry.data_refreshed.length > 0 ||
            entry.new_operational.length > 0 ||
            entry.status_changes.length > 0 ||
            entry.nem_records.length > 0 ||
            entry.new_projects.length > 0 ||
            entry.removed_projects.length > 0 ||
            !!entry.data_quality_notes
          )

          return (
            <div key={idx}>
              <button
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors text-left"
                onClick={() => setExpanded(isExpanded ? null : idx)}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5">
                    {entry.completed ? (
                      <span className="w-5 h-5 rounded-full bg-[#22c55e]/20 flex items-center justify-center">
                        <svg className="w-3 h-3 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-[#f59e0b]/20 flex items-center justify-center">
                        <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[var(--color-text)]">{entry.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg)] text-[var(--color-text-muted)] font-mono border border-[var(--color-border)]">
                        v{entry.version}
                      </span>
                      {!entry.completed && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f59e0b]/20 text-[#f59e0b] font-semibold">
                          PENDING
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{entry.date}</div>
                    {!isExpanded && (
                      <p className="text-xs text-[var(--color-text-muted)] mt-1 line-clamp-1">{entry.summary}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {entry.new_operational.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#22c55e]/10 text-[#22c55e]">
                      +{entry.new_operational.length} online
                    </span>
                  )}
                  {entry.nem_records.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#3b82f6]/10 text-[#3b82f6]">
                      {entry.nem_records.length} records
                    </span>
                  )}
                  {hasDetail && (
                    <svg
                      className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      viewBox="0 0 20 20" fill="currentColor"
                    >
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-4">
                  <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{entry.summary}</p>

                  {entry.data_refreshed.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-2">Sources Refreshed</div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5">
                        {entry.data_refreshed.map((s, i) => (
                          <div key={i} className="flex items-start gap-2 bg-[var(--color-bg)] rounded-lg px-3 py-2">
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-medium text-[var(--color-text)]">{s.source}</div>
                              <div className="text-[10px] text-[var(--color-text-muted)]">{s.note}</div>
                            </div>
                            {s.days_stale > 0 && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#ef4444]/10 text-[#ef4444] shrink-0 font-mono">{s.days_stale}d stale</span>
                            )}
                            {s.days_stale === 0 && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#22c55e]/10 text-[#22c55e] shrink-0">current</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {entry.new_operational.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-2">New Operational Projects</div>
                      <div className="space-y-1.5">
                        {entry.new_operational.map((p, i) => (
                          <div key={i} className="flex items-start gap-2 bg-[#22c55e]/5 border border-[#22c55e]/20 rounded-lg px-3 py-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-[var(--color-text)]">{p.project}</span>
                                <span className="text-[10px] text-[var(--color-text-muted)]">{p.state}</span>
                                <span className="text-[10px] font-mono text-[#22c55e]">{p.capacity_mw} MW</span>
                                <span className="text-[10px] text-[var(--color-text-muted)]">COD {p.cod}</span>
                              </div>
                              {p.note && <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{p.note}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {entry.status_changes.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-2">Status Changes</div>
                      <div className="space-y-1.5">
                        {entry.status_changes.map((c, i) => (
                          <div key={i} className="flex items-center gap-2 bg-[var(--color-bg)] rounded-lg px-3 py-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-medium text-[var(--color-text)]">{c.project}</span>
                                <span className="text-[10px] text-[var(--color-text-muted)]">{c.state}</span>
                                <span className="text-[10px] font-mono text-[var(--color-text-muted)]">{c.capacity_mw} MW</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <StatusBadge status={c.from} />
                              <svg className="w-3 h-3 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                              </svg>
                              <StatusBadge status={c.to} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {entry.nem_records.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-2">NEM Records Set</div>
                      <div className="space-y-1.5">
                        {entry.nem_records.map((r, i) => (
                          <div key={i} className="flex items-start gap-2 bg-[#3b82f6]/5 border border-[#3b82f6]/20 rounded-lg px-3 py-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-[var(--color-text)]">{r.value}</span>
                                <span className="text-[10px] text-[var(--color-text-muted)]">{r.metric}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-mono text-[#3b82f6]">{r.date}</span>
                                {r.note && <span className="text-[10px] text-[var(--color-text-muted)]">{r.note}</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {entry.new_projects.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-2">New Projects Added</div>
                      <div className="space-y-1.5">
                        {entry.new_projects.map((p, i) => (
                          <div key={i} className="flex items-start gap-2 bg-[var(--color-bg)] rounded-lg px-3 py-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-medium text-[var(--color-text)]">{p.project}</span>
                                <span className="text-[10px] text-[var(--color-text-muted)]">{p.technology}</span>
                                <span className="text-[10px] text-[var(--color-text-muted)]">{p.state}</span>
                                <span className="text-[10px] font-mono text-[var(--color-text-muted)]">{p.capacity_mw} MW</span>
                              </div>
                              {p.note && <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{p.note}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {entry.removed_projects.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-2">Projects Removed</div>
                      <div className="space-y-1.5">
                        {entry.removed_projects.map((p, i) => (
                          <div key={i} className="flex items-center gap-2 bg-[var(--color-bg)] rounded-lg px-3 py-2">
                            <span className="text-xs font-medium text-[var(--color-text)]">{p.project}</span>
                            <span className="text-[10px] text-[var(--color-text-muted)]">{p.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {entry.data_quality_notes && (
                    <div className="bg-[var(--color-bg-elevated)] rounded-lg px-3 py-2.5">
                      <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-1">Data Quality Notes</div>
                      <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{entry.data_quality_notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function DataSources() {
  const [data, setData] = useState<DataSourcesIndex | null>(null)
  const [pipelineRuns, setPipelineRuns] = useState<PipelineRun[]>([])
  const [updateLog, setUpdateLog] = useState<UpdateLogEntry[]>([])
  const [expandedRun, setExpandedRun] = useState<number | null>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchDataSources(),
      fetch(`${import.meta.env.BASE_URL}data/metadata/pipeline-log.json`)
        .then(r => r.ok ? r.json() : { runs: [] })
        .catch(() => ({ runs: [] })),
      fetch(`${import.meta.env.BASE_URL}data/metadata/update-log.json`)
        .then(r => r.ok ? r.json() : { updates: [] })
        .catch(() => ({ updates: [] })),
    ]).then(([d, log, updateLogData]) => {
      setData(d)
      setPipelineRuns(log.runs || [])
      setUpdateLog(updateLogData.updates || [])
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[var(--color-bg-elevated)] rounded w-48" />
          <div className="h-64 bg-[var(--color-bg-elevated)] rounded" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">Data Sources</h1>
        <p className="text-[var(--color-text-muted)]">
          Data sources metadata not yet exported. Run the export pipeline to generate this data.
        </p>
      </div>
    )
  }

  const stats = data.database_stats

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text)] mb-1">Data Sources & Status</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Where AURES data comes from and when each source was last updated.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Projects</p>
          <p className="text-2xl font-bold text-[var(--color-text)]">{formatNumber(stats.total_projects)}</p>
        </div>
        <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Operating</p>
          <p className="text-2xl font-bold text-[var(--color-operating)]">{formatNumber(stats.operating_projects)}</p>
        </div>
        <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Offtakes</p>
          <p className="text-2xl font-bold text-[var(--color-text)]">{stats.total_offtakes}</p>
        </div>
        <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Last Export</p>
          <p className="text-sm font-bold text-[var(--color-text)]">{formatDate(data.exported_at)}</p>
        </div>
      </div>

      <UpdateNowCards sources={data.sources} />

      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Pipeline Data Sources</h2>
        </div>

        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                <th className="text-left px-4 py-2.5 font-medium">Source</th>
                <th className="text-left px-4 py-2.5 font-medium">Frequency</th>
                <th className="text-left px-4 py-2.5 font-medium">Last Updated</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
                <th className="text-right px-4 py-2.5 font-medium">Records</th>
              </tr>
            </thead>
            <tbody>
              {data.sources.map((source) => {
                const status = getStatus(source)
                const days = daysSince(source.last_run)
                return (
                  <tr key={source.id} className="border-b border-[var(--color-border)]/50 hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--color-text)]">{source.name}</div>
                      <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{source.description}</div>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]">{formatFrequency(source.frequency)}</td>
                    <td className="px-4 py-3">
                      <div className="text-[var(--color-text)]">{formatDate(source.last_run)}</div>
                      {days !== null && <div className="text-xs text-[var(--color-text-muted)]">{days}d ago</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: status.color + '20', color: status.color }}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--color-text-muted)] tabular-nums">
                      {source.records_imported > 0 ? formatNumber(source.records_imported) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="lg:hidden divide-y divide-[var(--color-border)]/50">
          {data.sources.map((source) => {
            const status = getStatus(source)
            const days = daysSince(source.last_run)
            return (
              <div key={source.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="font-medium text-sm text-[var(--color-text)]">{source.name}</div>
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0" style={{ backgroundColor: status.color + '20', color: status.color }}>
                    {status.label}
                  </span>
                </div>
                <div className="text-xs text-[var(--color-text-muted)] mb-2">{source.description}</div>
                <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
                  <span>{formatFrequency(source.frequency)}</span>
                  <span>{formatDate(source.last_run)}{days !== null ? ` (${days}d ago)` : ''}</span>
                  {source.records_imported > 0 && <span>{formatNumber(source.records_imported)} records</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-6 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-4">
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2">Quick Reference</h3>
        <div className="space-y-2 text-xs text-[var(--color-text-muted)]">
          <div className="flex items-center gap-2">
            <code className="bg-[var(--color-bg)] text-[var(--color-primary)] px-2 py-1 rounded font-mono text-[10px]">python3 pipeline/smart_refresh.py --phase all</code>
            <span>Economic refresh (both phases)</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="bg-[var(--color-bg)] text-[var(--color-primary)] px-2 py-1 rounded font-mono text-[10px]">python3 pipeline/admin.py --all</code>
            <span>Full pipeline (all importers + export)</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="bg-[var(--color-bg)] text-[var(--color-primary)] px-2 py-1 rounded font-mono text-[10px]">python3 pipeline/smart_refresh.py --dry-run</code>
            <span>Preview what would be fetched</span>
          </div>
        </div>
      </div>

      <UpdateLogSection entries={updateLog} />

      {pipelineRuns.length > 0 && (
        <div className="mt-6 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Pipeline Run Log</h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Last {pipelineRuns.length} pipeline runs from AURES Admin</p>
          </div>
          <div className="divide-y divide-[var(--color-border)]/50">
            {pipelineRuns.map((run, idx) => {
              const runDate = new Date(run.started_at)
              const allSuccess = run.steps_failed === 0
              const isExpanded = expandedRun === idx
              return (
                <div key={idx}>
                  <button
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                    onClick={() => setExpandedRun(isExpanded ? null : idx)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: allSuccess ? '#22c55e' : '#ef4444' }} />
                      <div className="text-left">
                        <div className="text-sm font-medium text-[var(--color-text)]">
                          {runDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}{' '}
                          <span className="text-[var(--color-text-muted)] font-normal">{runDate.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="text-xs text-[var(--color-text-muted)]">
                          {run.steps_succeeded}/{run.steps_total} steps passed
                          {run.steps_failed > 0 && <span style={{ color: '#ef4444' }}> ({run.steps_failed} failed)</span>}
                          {' · '}{Math.round(run.total_seconds)}s
                        </div>
                      </div>
                    </div>
                    <svg className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-3">
                      <div className="bg-[var(--color-bg)] rounded-lg p-3 space-y-1.5">
                        {run.steps.map((step, si) => (
                          <div key={si} className="flex items-center gap-2 text-xs">
                            <span style={{ color: step.success ? '#22c55e' : '#ef4444' }}>{step.success ? '✓' : '✗'}</span>
                            <span className="text-[var(--color-text)] flex-1">{step.step}</span>
                            <span className="text-[var(--color-text-muted)] tabular-nums">{step.duration_seconds.toFixed(0)}s</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
