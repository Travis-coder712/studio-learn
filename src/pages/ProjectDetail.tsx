import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { TECHNOLOGY_CONFIG, DEVELOPMENT_STAGE_CONFIG, type Project, type EISTechnicalSpec, type FieldSourceEntry } from '../lib/types'
import { useProject } from '../hooks/useProjectData'
import TechBadge from '../components/common/TechBadge'
import StatusBadge from '../components/common/StatusBadge'
import ConfidenceDots from '../components/common/ConfidenceDots'
import PerformanceTab from '../components/charts/PerformanceTab'
import Breadcrumb from '../components/common/Breadcrumb'
import { ESG_TRACKER_PROJECTS, ROUND_ESG_SUMMARIES } from '../data/esg-tracker-data'
import type { ESGTrackerProject, PublicationStatus, AgreementStatus } from '../data/esg-tracker-data'

type Tab = 'overview' | 'timeline' | 'technical' | 'performance' | 'evolution' | 'sources'

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const { project, loading } = useProject(id)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const fromPage = searchParams.get('from')
  const fromLabel = searchParams.get('fromLabel')

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60dvh]">
        <div className="text-sm text-[var(--color-text-muted)] animate-pulse">Loading project...</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60dvh] px-4 text-center">
        <span className="text-5xl mb-4">🔌</span>
        <h1 className="text-xl font-bold text-[var(--color-text)] mb-2">Project Not Found</h1>
        <Link to="/projects" className="text-sm text-[var(--color-primary)] hover:underline">
          ← Back to projects
        </Link>
      </div>
    )
  }

  const techConfig = TECHNOLOGY_CONFIG[project.technology]

  const isOperating = project.status === 'operating' || project.status === 'commissioning'
  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'timeline', label: 'Timeline' },
    { key: 'technical', label: 'Technical' },
    ...(isOperating ? [{ key: 'performance' as Tab, label: 'Performance' }] : []),
    { key: 'evolution', label: 'Evolution' },
    { key: 'sources', label: 'Sources' },
  ]

  return (
    <div className="px-4 lg:px-8 py-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Projects', path: '/projects' },
        { label: project.technology?.replace('_', ' ') || 'Project' },
        { label: project.name }
      ]} />
      <div className="mb-4">
        {fromPage ? (
          <button
            onClick={() => navigate(-1)}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
          >
            {fromLabel || `← Back`}
          </button>
        ) : (
          <Link to="/projects" className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
            ← All Projects
          </Link>
        )}
      </div>

      {/* Project Header */}
      <header className="mb-6">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl mt-0.5">{techConfig.icon}</span>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl lg:text-2xl font-bold text-[var(--color-text)] leading-tight mb-1">
              {project.name}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <TechBadge technology={project.technology} />
              <StatusBadge status={project.status} />
              {project.development_stage && DEVELOPMENT_STAGE_CONFIG[project.development_stage] && (
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${DEVELOPMENT_STAGE_CONFIG[project.development_stage].color}20`,
                    color: DEVELOPMENT_STAGE_CONFIG[project.development_stage].color,
                  }}
                >
                  {DEVELOPMENT_STAGE_CONFIG[project.development_stage].icon} {DEVELOPMENT_STAGE_CONFIG[project.development_stage].label}
                </span>
              )}
              <ConfidenceDots confidence={project.data_confidence} showLabel />
            </div>
          </div>
        </div>

        {/* Key Metrics Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <MetricBox label="Capacity" value={`${project.capacity_mw} MW`} />
          {project.storage_mwh && (
            <MetricBox label="Storage" value={`${project.storage_mwh} MWh`} />
          )}
          <MetricBox label="State" value={project.state} />
          <MetricBox
            label="COD"
            value={project.cod_current || 'TBD'}
            badge={getCODDriftBadge(project)}
          />
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="flex gap-0.5 mb-6 bg-[var(--color-bg-card)] rounded-lg p-0.5 border border-[var(--color-border)]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${
              activeTab === tab.key
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab project={project} />}
      {activeTab === 'timeline' && <TimelineTab project={project} />}
      {activeTab === 'technical' && <TechnicalTab project={project} />}
      {activeTab === 'performance' && <PerformanceTab project={project} />}
      {activeTab === 'evolution' && <EvolutionTab project={project} />}
      {activeTab === 'sources' && <SourcesTab project={project} />}
    </div>
  )
}

// ============================================================
// Sub-components
// ============================================================

function MetricBox({ label, value, badge }: { label: string; value: string; badge?: { text: string; color: string } | null }) {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2">
      <p className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">{label}</p>
      <div className="flex items-center gap-2">
        <p className="text-sm font-bold text-[var(--color-text)]">{value}</p>
        {badge && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: `${badge.color}20`, color: badge.color }}>
            {badge.text}
          </span>
        )}
      </div>
    </div>
  )
}

function getCODDriftBadge(project: Project): { text: string; color: string } | null {
  if (!project.cod_original || !project.cod_current) return null
  const origMatch = project.cod_original.match(/(\d{4})/)
  const currMatch = project.cod_current.match(/(\d{4})/)
  if (!origMatch || !currMatch) return null
  const drift = (parseInt(currMatch[1]) - parseInt(origMatch[1])) * 12
  if (drift === 0) return null
  if (drift > 0) return { text: `+${drift} mo`, color: '#f59e0b' }
  return { text: `${drift} mo`, color: '#22c55e' }
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
      {children}
    </h3>
  )
}

// ============================================================
// Overview Tab
// ============================================================

function OverviewTab({ project }: { project: Project }) {
  const esgData = ESG_TRACKER_PROJECTS.find(e => e.projectId === project.id)

  return (
    <div className="space-y-6">
      {/* Notable */}
      {project.notable && (
        <div className="bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 rounded-xl p-4">
          <p className="text-sm text-[var(--color-text)]">{project.notable}</p>
        </div>
      )}

      {/* Key Details */}
      <section>
        <SectionTitle>Key Details</SectionTitle>
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl divide-y divide-[var(--color-border)]">
          <DetailRow label="Developer" value={project.current_developer || '—'} />
          {project.current_operator && (
            <DetailRow label="Operator" value={project.current_operator} />
          )}
          <DetailRow label="Location" value={`${project.lga || '—'}, ${project.state}`} />
          {project.rez && <DetailRow label="REZ" value={project.rez} />}
          <DetailRow label="Connection NSP" value={project.connection_nsp || '—'} />
          <DetailRow label="Connection Status" value={project.connection_status || '—'} />
          {project.cod_current && <DetailRow label="Expected COD" value={project.cod_current} />}
          {project.cod_original && project.cod_original !== project.cod_current && (
            <DetailRow
              label="Original COD"
              value={project.cod_original}
              highlight="drift"
            />
          )}
        </div>
      </section>

      {/* COD Drift History */}
      {project.cod_history.length > 0 && (
        <section>
          <SectionTitle>COD Drift History</SectionTitle>
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
            <div className="space-y-2">
              {project.cod_history.map((entry, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="text-[10px] text-[var(--color-text-muted)] font-mono w-20 flex-shrink-0">
                    {entry.date.substring(0, 7)}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] flex-shrink-0" />
                  <span className="text-[var(--color-text)]">{entry.estimate}</span>
                  <span className="text-[10px] text-[var(--color-text-muted)] ml-auto truncate">
                    {entry.source}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Ownership History */}
      {project.ownership_history.length > 0 && (
        <section>
          <SectionTitle>Ownership History</SectionTitle>
          <div className="space-y-2">
            {project.ownership_history.map((record, i) => (
              <div
                key={i}
                className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text)]">{record.owner}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {record.role} · {record.period}
                    </p>
                  </div>
                  {record.acquisition_value_aud && (
                    <span className="text-sm font-bold text-[var(--color-accent)]">
                      ${(record.acquisition_value_aud / 1000000).toFixed(0)}M
                    </span>
                  )}
                </div>
                {record.transaction_structure && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    {record.transaction_structure}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Stakeholder Issues */}
      {project.stakeholder_issues && project.stakeholder_issues.length > 0 && (
        <section>
          <SectionTitle>Stakeholder Issues</SectionTitle>
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
            <ul className="space-y-1">
              {project.stakeholder_issues.map((issue: string | { issue?: string; detail?: string; date?: string; status?: string }, i: number) => {
                const text = typeof issue === 'string' ? issue : issue.issue || ''
                const detail = typeof issue === 'object' ? issue.detail : undefined
                const date = typeof issue === 'object' ? issue.date : undefined
                const status = typeof issue === 'object' ? issue.status : undefined
                return (
                  <li key={i} className="text-sm text-[var(--color-text)]">
                    <div className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0 mt-1.5" />
                      <div>
                        <span className="font-medium">{text}</span>
                        {date && <span className="text-[var(--color-text-secondary)] ml-2">({date})</span>}
                        {status && <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${status === 'resolved' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{status}</span>}
                        {detail && <p className="text-xs text-[var(--color-text-secondary)] mt-1">{detail}</p>}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      )}

      {/* ESG / First Nations Agreement Proxy */}
      {esgData && <ESGProjectCard esg={esgData} />}
    </div>
  )
}

// ============================================================
// ESG / First Nations Agreement Proxy Card
// ============================================================

const ESG_PUB_STATUS: Record<PublicationStatus, { label: string; color: string }> = {
  published:    { label: 'Published',      color: '#22c55e' },
  partial:      { label: 'Partial',        color: '#f59e0b' },
  fncen_only:   { label: 'FNCEN Only',     color: '#3b82f6' },
  not_found:    { label: 'Not Found',      color: '#ef4444' },
  not_required: { label: 'Not Required',   color: '#6b7280' },
  too_early:    { label: 'Too Early',      color: '#8b5cf6' },
  exempt:       { label: 'Exempt',         color: '#6b7280' },
}

const ESG_AGR_STATUS: Record<AgreementStatus, { label: string; color: string }> = {
  executed:       { label: 'Executed',        color: '#22c55e' },
  likely_executed:{ label: 'Likely Executed', color: '#84cc16' },
  awarded:        { label: 'Awarded Only',   color: '#f59e0b' },
  unknown:        { label: 'Unknown',        color: '#6b7280' },
}

function ESGProjectCard({ esg }: { esg: ESGTrackerProject }) {
  const pubCfg = ESG_PUB_STATUS[esg.publicationStatus]
  const agrCfg = ESG_AGR_STATUS[esg.agreementStatus]
  const roundSummary = ROUND_ESG_SUMMARIES.find(r => r.roundId === esg.roundId)

  return (
    <section>
      <SectionTitle>ESG & First Nations Agreement Proxy</SectionTitle>

      {/* Status badges row */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span
          className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: `${agrCfg.color}15`, color: agrCfg.color, border: `1px solid ${agrCfg.color}30` }}
        >
          Agreement: {agrCfg.label}
        </span>
        <span
          className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: `${pubCfg.color}15`, color: pubCfg.color, border: `1px solid ${pubCfg.color}30` }}
        >
          Publication: {pubCfg.label}
        </span>
        <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
          {esg.scheme} — {esg.round}
        </span>
      </div>

      {/* Main details card */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        {/* Data sources row */}
        <div className="px-4 py-2.5 bg-[var(--color-bg-elevated)] border-b border-[var(--color-border)]">
          <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
            Data Sources
          </p>
          <div className="flex flex-wrap gap-1.5">
            {esg.fncenListed && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                FNCEN Tracker
              </span>
            )}
            {esg.cecCharterSignatory && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                CEC Charter Signatory
              </span>
            )}
            {esg.aslSummaryData && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                ASL Summary
              </span>
            )}
            {esg.proponentWebsiteUrl && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Proponent Website
              </span>
            )}
            {!esg.fncenListed && !esg.cecCharterSignatory && !esg.aslSummaryData && !esg.proponentWebsiteUrl && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
                No public data sources found
              </span>
            )}
          </div>
        </div>

        <div className="divide-y divide-[var(--color-border)]">
          {/* First Nations commitment value */}
          {esg.fnCommitmentValueM != null && (
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-[var(--color-text-muted)]">First Nations Commitment</span>
              <span className="text-sm font-bold text-[var(--color-accent)]">${esg.fnCommitmentValueM}M</span>
            </div>
          )}

          {/* FN equity share */}
          {esg.fnEquityShare != null && (
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-[var(--color-text-muted)]">First Nations Equity Share</span>
              <span className="text-sm font-semibold text-[var(--color-text)]">{esg.fnEquityShare}%</span>
            </div>
          )}

          {/* FN revenue sharing */}
          {esg.fnRevenueShare && (
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-[var(--color-text-muted)]">Revenue Sharing Agreement</span>
              <span className="text-sm font-semibold text-green-400">Yes</span>
            </div>
          )}

          {/* Community benefit value */}
          {esg.communityBenefitValueM != null && (
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-[var(--color-text-muted)]">Community Benefit Fund</span>
              <span className="text-sm font-bold text-[var(--color-accent)]">${esg.communityBenefitValueM}M</span>
            </div>
          )}

          {/* Award date */}
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs text-[var(--color-text-muted)]">Round Announced</span>
            <span className="text-sm text-[var(--color-text)]">
              {new Date(esg.awardAnnouncedDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>

          {/* Publication requirement */}
          {roundSummary && (
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-[var(--color-text-muted)]">20-Day Publication Required</span>
              <span className={`text-sm font-semibold ${roundSummary.publicationRequired ? 'text-amber-400' : 'text-[var(--color-text-muted)]'}`}>
                {roundSummary.publicationRequired ? 'Yes' : 'No'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* First Nations commitments list */}
      {esg.fnCommitments && esg.fnCommitments.length > 0 && (
        <div className="mt-3 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
          <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
            First Nations Commitments
          </p>
          <ul className="space-y-1.5">
            {esg.fnCommitments.map((c, i) => (
              <li key={i} className="text-xs text-[var(--color-text)] flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0 mt-1" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Community benefit details */}
      {esg.communityBenefitDetails && esg.communityBenefitDetails.length > 0 && (
        <div className="mt-3 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
          <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
            Community Benefit Details
          </p>
          <ul className="space-y-1.5">
            {esg.communityBenefitDetails.map((c, i) => (
              <li key={i} className="text-xs text-[var(--color-text)] flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0 mt-1" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Proponent website link */}
      {esg.proponentWebsiteUrl && (
        <a
          href={esg.proponentWebsiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center gap-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl px-4 py-3 hover:border-[var(--color-primary)]/30 transition-colors"
        >
          <span className="text-xs text-[var(--color-primary)]">View published commitments on proponent website ↗</span>
        </a>
      )}

      {/* Notes */}
      {esg.notes && (
        <div className="mt-3 bg-blue-500/5 border border-blue-500/15 rounded-xl px-4 py-3">
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
            {esg.notes}
          </p>
        </div>
      )}

      {/* Link to full ESG tracker */}
      <Link
        to="/intelligence/scheme-tracker?tab=esg"
        className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-[var(--color-primary)] hover:underline py-2"
      >
        View full ESG Agreement Proxy tracker →
      </Link>
    </section>
  )
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
      <span
        className={`text-sm font-medium ${
          highlight === 'drift'
            ? 'text-[var(--color-accent)] line-through opacity-60'
            : 'text-[var(--color-text)]'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

// ============================================================
// Timeline Tab
// ============================================================

function TimelineTab({ project }: { project: Project }) {
  const sorted = [...project.timeline].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  const eventColors: Record<string, string> = {
    conceived: '#6b7280',
    planning_submitted: '#3b82f6',
    planning_approved: '#22c55e',
    planning_rejected: '#ef4444',
    ownership_change: '#f59e0b',
    construction_start: '#f97316',
    cod: '#22c55e',
    commissioning: '#84cc16',
    expansion: '#06b6d4',
    notable: '#8b5cf6',
    rez_access: '#14b8a6',
    capacity_change: '#06b6d4',
    cod_change: '#f59e0b',
  }

  return (
    <div className="space-y-0">
      {sorted.length === 0 && (
        <p className="text-sm text-[var(--color-text-muted)] text-center py-8">
          No timeline events recorded yet
        </p>
      )}
      {sorted.map((event, i) => {
        const color = eventColors[event.event_type] || '#6b7280'
        return (
          <div key={i} className="flex gap-4 pb-6 last:pb-0">
            {/* Timeline line + dot */}
            <div className="flex flex-col items-center">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0 mt-1 border-2"
                style={{ borderColor: color, backgroundColor: `${color}40` }}
              />
              {i < sorted.length - 1 && (
                <div className="w-px flex-1 bg-[var(--color-border)] mt-1" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-start justify-between gap-2 mb-0.5">
                <p className="text-sm font-semibold text-[var(--color-text)]">{event.title}</p>
                <span className="text-[10px] text-[var(--color-text-muted)] font-mono flex-shrink-0">
                  {formatDate(event.date, event.date_precision)}
                </span>
              </div>
              <span
                className="inline-block text-[10px] px-1.5 py-0.5 rounded-full mb-1 font-medium"
                style={{ backgroundColor: `${color}20`, color }}
              >
                {event.event_type.replace(/_/g, ' ')}
              </span>
              {event.detail && (
                <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
                  {event.detail}
                </p>
              )}
              {event.sources.length > 0 && (
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  {event.sources.map((src, j) => (
                    <a
                      key={j}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[var(--color-primary)] hover:underline"
                    >
                      {src.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function formatDate(date: string, precision: string): string {
  const d = new Date(date)
  switch (precision) {
    case 'day':
      return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    case 'month':
      return d.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })
    case 'quarter':
      const q = Math.ceil((d.getMonth() + 1) / 3)
      return `Q${q} ${d.getFullYear()}`
    case 'year':
      return d.getFullYear().toString()
    default:
      return date
  }
}

// ============================================================
// Technical Tab
// ============================================================

function TechnicalTab({ project }: { project: Project }) {
  return (
    <div className="space-y-6">
      {/* EIS / EIA Technical Specifications */}
      {project.eis_specs && (
        <EISSpecsSection specs={project.eis_specs} technology={project.technology} />
      )}

      {/* Suppliers */}
      <section>
        <SectionTitle>Equipment & Suppliers</SectionTitle>
        {project.suppliers.length > 0 ? (
          <div className="space-y-2">
            {project.suppliers.map((supplier, i) => (
              <div
                key={i}
                className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text)]">{supplier.supplier}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {supplier.role.replace(/_/g, ' ').toUpperCase()}
                      {supplier.model && ` · ${supplier.model}`}
                    </p>
                  </div>
                  {supplier.quantity && (
                    <span className="text-xs text-[var(--color-text-muted)]">
                      ×{supplier.quantity}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] border-dashed rounded-xl p-6 text-center">
            <p className="text-xs text-[var(--color-text-muted)]">
              Supplier data not yet verified for this project
            </p>
          </div>
        )}
      </section>

      {/* Grid Connection */}
      <section>
        <SectionTitle>Grid Connection</SectionTitle>
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl divide-y divide-[var(--color-border)]">
          <DetailRow label="Connection NSP" value={project.connection_nsp || '—'} />
          <DetailRow label="Connection Status" value={project.connection_status || '—'} />
          {project.has_sips && <DetailRow label="SIPS" value="Yes" />}
          {project.has_syncon && <DetailRow label="SynCon" value="Yes" />}
          {project.has_statcom && <DetailRow label="STATCOM" value="Yes" />}
          {project.has_harmonic_filter && <DetailRow label="Harmonic Filter" value="Yes" />}
          {project.grid_forming && <DetailRow label="Grid Forming" value="Yes" />}
        </div>
      </section>

      {/* Offtakes */}
      <section>
        <SectionTitle>Offtake Agreements</SectionTitle>
        {project.offtakes.length > 0 ? (
          <div className="space-y-2">
            {project.offtakes.map((offtake, i) => (
              <div
                key={i}
                className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text)]">{offtake.party}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {offtake.type}
                      {offtake.term_years && ` · ${offtake.term_years} years`}
                      {offtake.capacity_mw && ` · ${offtake.capacity_mw} MW`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] border-dashed rounded-xl p-6 text-center">
            <p className="text-xs text-[var(--color-text-muted)]">
              No offtake agreements recorded
            </p>
          </div>
        )}
      </section>

      {/* Cost Sources */}
      {project.cost_sources && project.cost_sources.length > 0 && (
        <section>
          <SectionTitle>Cost Information (Multi-Source)</SectionTitle>
          <div className="space-y-2">
            {project.cost_sources.map((cs, i) => (
              <div
                key={i}
                className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-[var(--color-accent)]">{cs.value}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {cs.source} · {cs.date.substring(0, 7)}
                    </p>
                  </div>
                </div>
                {cs.what_this_covers && (
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
                    {cs.what_this_covers}
                  </p>
                )}
                {cs.context && (
                  <p className="text-[10px] text-[var(--color-primary)]/70 mt-0.5">
                    ⓘ {cs.context}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ============================================================
// EIS / EIA Technical Specifications Section
// ============================================================

const PCS_LABELS: Record<string, string> = {
  grid_forming: 'Grid-Forming (Voltage Source Converter)',
  grid_following: 'Grid-Following (Current Source Converter)',
  both: 'Grid-Forming & Grid-Following (mixed)',
}

function EISSpecsSection({
  specs,
  technology,
}: {
  specs: EISTechnicalSpec
  technology: string
}) {
  const isWind = technology === 'wind' || technology === 'offshore_wind'
  const isBESS = technology === 'bess'

  const hasWindData =
    specs.turbine_model ||
    specs.hub_height_m ||
    specs.wind_speed_mean_ms ||
    specs.assumed_capacity_factor_pct

  const hasBESSData =
    specs.cell_chemistry ||
    specs.cell_supplier ||
    specs.inverter_supplier ||
    specs.pcs_type ||
    specs.round_trip_efficiency_pct

  if (!hasWindData && !hasBESSData) return null

  return (
    <section>
      {/* Header with source attribution */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2">
          📄 EIS / EIA Technical Specifications
        </h3>
        {specs.document_url ? (
          <a
            href={specs.document_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 text-[10px] px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-colors"
          >
            Source: {specs.document_title.replace(/\s*\(.*?\)\s*/g, '').substring(0, 40)}
            {specs.document_year ? ` (${specs.document_year})` : ''} ↗
          </a>
        ) : (
          <span className="flex-shrink-0 text-[10px] px-2 py-1 rounded-full bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
            Source: {specs.document_title.substring(0, 40)}
            {specs.document_year ? ` (${specs.document_year})` : ''}
          </span>
        )}
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] text-amber-400/70 bg-amber-400/5 border border-amber-400/10 rounded-lg px-3 py-1.5 mb-3 leading-relaxed">
        ⚠ Specifications sourced from planning approval document (EIS/EIA){specs.document_year ? ` — ${specs.document_year}` : ''}. Technical details reflect the approved design and may differ from the as-built configuration.
      </p>

      <div className="space-y-3">
        {/* ── Wind: Turbine Specifications ────────────────────── */}
        {isWind && hasWindData && (
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-blue-500/5 border-b border-[var(--color-border)]">
              <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">
                💨 Turbine Specifications
              </p>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {specs.turbine_model && (
                <DetailRow label="Turbine Model" value={specs.turbine_model} />
              )}
              {specs.turbine_rated_power_mw && (
                <DetailRow label="Rated Power" value={`${specs.turbine_rated_power_mw} MW per turbine`} />
              )}
              {specs.turbine_count && (
                <DetailRow label="Number of Turbines" value={`${specs.turbine_count} WTGs`} />
              )}
              {specs.hub_height_m && (
                <DetailRow
                  label="Hub Height"
                  value={`${specs.hub_height_m} m${specs.hub_height_note ? ' †' : ''}`}
                />
              )}
              {specs.rotor_diameter_m && (
                <DetailRow label="Rotor Diameter" value={`${specs.rotor_diameter_m} m`} />
              )}
              {specs.hub_height_note && (
                <div className="px-4 py-2">
                  <p className="text-[10px] text-[var(--color-text-muted)] italic">
                    † {specs.hub_height_note}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Wind: Wind Resource & Energy Yield ──────────────── */}
        {isWind && (specs.wind_speed_mean_ms || specs.assumed_capacity_factor_pct) && (
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-blue-500/5 border-b border-[var(--color-border)]">
              <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">
                📊 Wind Resource & Energy Yield (EIS)
              </p>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {specs.wind_speed_mean_ms && (
                <DetailRow
                  label="Mean Wind Speed"
                  value={`${specs.wind_speed_mean_ms} m/s${specs.wind_speed_height_m ? ` at ${specs.wind_speed_height_m} m AGL` : ''}`}
                />
              )}
              {specs.wind_speed_period && (
                <div className="px-4 py-2">
                  <p className="text-[10px] text-[var(--color-text-muted)]">
                    ⓘ {specs.wind_speed_period}
                  </p>
                </div>
              )}
              {specs.assumed_capacity_factor_pct && (
                <DetailRow
                  label="Assumed Capacity Factor"
                  value={`${specs.assumed_capacity_factor_pct.toFixed(1)}%`}
                />
              )}
              {specs.assumed_annual_energy_gwh && (
                <DetailRow
                  label="Assumed Annual Energy"
                  value={`${specs.assumed_annual_energy_gwh.toLocaleString()} GWh/year`}
                />
              )}
              {specs.energy_yield_method && (
                <div className="px-4 py-2">
                  <p className="text-[10px] text-[var(--color-text-muted)]">
                    ⓘ Method: {specs.energy_yield_method}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Wind: Environmental Constraints ─────────────────── */}
        {isWind && (specs.noise_limit_dba || specs.minimum_setback_m) && (
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-blue-500/5 border-b border-[var(--color-border)]">
              <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">
                🔇 Environmental Constraints (EIS)
              </p>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {specs.noise_limit_dba && (
                <DetailRow label="Noise Compliance Limit" value={`${specs.noise_limit_dba} dBA`} />
              )}
              {specs.minimum_setback_m && (
                <DetailRow
                  label="Minimum Setback (dwellings)"
                  value={`${specs.minimum_setback_m.toLocaleString()} m`}
                />
              )}
            </div>
          </div>
        )}

        {/* ── BESS: Battery Cell Specifications ───────────────── */}
        {isBESS && hasBESSData && (
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-purple-500/5 border-b border-[var(--color-border)]">
              <p className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">
                🔋 Battery Cell Specifications (EIS)
              </p>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {specs.cell_chemistry && (
                <DetailRow
                  label="Cell Chemistry"
                  value={specs.cell_chemistry_full || specs.cell_chemistry}
                />
              )}
              {specs.cell_supplier && (
                <DetailRow label="Cell Supplier" value={specs.cell_supplier} />
              )}
              {specs.cell_country_of_manufacture && (
                <DetailRow
                  label="Cell Country of Manufacture"
                  value={specs.cell_country_of_manufacture}
                />
              )}
            </div>
          </div>
        )}

        {/* ── BESS: Inverter / PCS Specifications ─────────────── */}
        {isBESS && (specs.inverter_supplier || specs.pcs_type || specs.round_trip_efficiency_pct) && (
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-purple-500/5 border-b border-[var(--color-border)]">
              <p className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">
                ⚡ Inverter / Power Conversion System (EIS)
              </p>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {specs.inverter_supplier && (
                <DetailRow label="PCS Supplier" value={specs.inverter_supplier} />
              )}
              {specs.inverter_model && (
                <DetailRow label="PCS Model" value={specs.inverter_model} />
              )}
              {specs.inverter_country_of_manufacture && (
                <DetailRow
                  label="PCS Country of Manufacture"
                  value={specs.inverter_country_of_manufacture}
                />
              )}
              {specs.pcs_type && (
                <DetailRow
                  label="PCS Type"
                  value={PCS_LABELS[specs.pcs_type] ?? specs.pcs_type}
                />
              )}
              {specs.round_trip_efficiency_pct && (
                <DetailRow
                  label="Round-Trip Efficiency (DC-DC)"
                  value={`${specs.round_trip_efficiency_pct}%`}
                />
              )}
              {specs.round_trip_efficiency_ac && (
                <DetailRow
                  label="Round-Trip Efficiency (AC-AC)"
                  value={`${specs.round_trip_efficiency_ac}%`}
                />
              )}
              {specs.duration_hours && (
                <DetailRow
                  label="Storage Duration"
                  value={`${specs.duration_hours} hours`}
                />
              )}
            </div>
          </div>
        )}

        {/* ── Grid Connection (both wind and BESS) ────────────── */}
        {(specs.connection_voltage_kv || specs.transformer_mva || specs.connection_substation_name) && (
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-green-500/5 border-b border-[var(--color-border)]">
              <p className="text-[10px] font-semibold text-green-400 uppercase tracking-wider">
                🔌 Grid Connection Point (EIS)
              </p>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {specs.network_service_provider && (
                <DetailRow label="Network Service Provider" value={specs.network_service_provider} />
              )}
              {specs.connection_substation_name && (
                <DetailRow label="Connection Substation" value={specs.connection_substation_name} />
              )}
              {specs.connection_substation_capacity_mva && (
                <DetailRow
                  label="Substation Capacity"
                  value={`${specs.connection_substation_capacity_mva.toLocaleString()} MVA`}
                />
              )}
              {specs.connection_voltage_kv && (
                <DetailRow label="Connection Voltage" value={`${specs.connection_voltage_kv} kV`} />
              )}
              {specs.transformer_mva && (
                <DetailRow label="Project Transformer" value={`${specs.transformer_mva} MVA`} />
              )}
              {specs.connection_distance_km !== undefined && (
                <DetailRow
                  label="Distance to Substation"
                  value={
                    specs.connection_distance_km === 0
                      ? 'On-site (0 km)'
                      : `${specs.connection_distance_km} km`
                  }
                />
              )}
              {specs.connection_distance_note && (
                <div className="px-4 py-2">
                  <p className="text-[10px] text-[var(--color-text-muted)]">
                    ⓘ {specs.connection_distance_note}
                  </p>
                </div>
              )}
              {specs.connection_augmentation && (
                <div className="px-4 py-2.5">
                  <p className="text-[10px] font-medium text-[var(--color-text-muted)] mb-1">
                    Network Augmentation Required
                  </p>
                  <p className={`text-xs leading-relaxed ${
                    specs.connection_augmentation.startsWith('IMPORTANT')
                      ? 'text-amber-400'
                      : 'text-[var(--color-text-muted)]'
                  }`}>
                    {specs.connection_augmentation}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Notes ───────────────────────────────────────────── */}
        {specs.notes && (
          <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-4">
            <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider mb-2">
              ⓘ EIS Notes
            </p>
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              {specs.notes}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

// ============================================================
// Sources Tab
// ============================================================

// ============================================================
// Evolution Tab — Multi-source data provenance & project history
// ============================================================

const FIELD_LABELS: Record<string, { label: string; format: (v: string | number) => string; unit?: string }> = {
  capacity_mw: { label: 'Capacity', format: (v) => `${v} MW`, unit: 'MW' },
  storage_mwh: { label: 'Storage', format: (v) => `${v} MWh`, unit: 'MWh' },
  capex_aud_m: { label: 'Capital Cost', format: (v) => `A$${v}M`, unit: 'A$M' },
  bess_oem: { label: 'Battery OEM', format: (v) => String(v) },
  status: { label: 'Project Status', format: (v) => String(v) },
  cod_current: { label: 'Expected COD', format: (v) => String(v) },
  cell_chemistry: { label: 'Cell Chemistry', format: (v) => String(v) },
  current_developer: { label: 'Developer', format: (v) => String(v) },
}

const TIER_LABELS: Record<number, { label: string; colour: string }> = {
  1: { label: 'Primary', colour: '#10b981' },
  2: { label: 'Official', colour: '#3b82f6' },
  3: { label: 'Industry', colour: '#f59e0b' },
  4: { label: 'Estimate', colour: '#94a3b8' },
  5: { label: 'Unverified', colour: '#64748b' },
}

function EvolutionTab({ project }: { project: Project }) {
  const fieldSources = project.field_sources
  const hasFieldSources = fieldSources && Object.keys(fieldSources).length > 0

  // Build a synthesised evolution timeline from all available data:
  // timeline events, cod_history, ownership_history, and field_sources
  const evolutionEvents: {
    date: string
    field: string
    value: string
    source: string
    tier?: number
    note?: string
    type: 'field_source' | 'timeline' | 'cod_change' | 'ownership'
  }[] = []

  // 1. Field sources (new provenance model)
  if (fieldSources) {
    for (const [field, entries] of Object.entries(fieldSources)) {
      for (const entry of entries as FieldSourceEntry[]) {
        const config = FIELD_LABELS[field]
        evolutionEvents.push({
          date: entry.date,
          field: config?.label || field,
          value: config ? config.format(entry.value) : String(entry.value),
          source: entry.source,
          tier: entry.tier,
          note: entry.note,
          type: 'field_source',
        })
      }
    }
  }

  // 2. Timeline events (existing)
  for (const event of project.timeline || []) {
    evolutionEvents.push({
      date: event.date,
      field: event.title,
      value: event.detail || '',
      source: event.sources?.[0]?.title || 'Project timeline',
      type: 'timeline',
    })
  }

  // 3. COD history
  for (const cod of project.cod_history || []) {
    evolutionEvents.push({
      date: cod.date || '',
      field: 'COD Change',
      value: cod.estimate || '?',
      source: cod.source || 'COD tracking',
      type: 'cod_change',
    })
  }

  // 4. Ownership history
  for (const own of project.ownership_history || []) {
    evolutionEvents.push({
      date: own.period || '',
      field: 'Ownership Change',
      value: `${own.owner} (${own.role})`,
      source: own.source_url || 'Ownership tracking',
      type: 'ownership',
    })
  }

  // Sort chronologically (newest first)
  evolutionEvents.sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  // Group field_sources by field for the comparison view
  const fieldGroups: Record<string, FieldSourceEntry[]> = {}
  if (fieldSources) {
    for (const [field, entries] of Object.entries(fieldSources)) {
      fieldGroups[field] = (entries as FieldSourceEntry[]).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    }
  }

  const TYPE_COLOURS: Record<string, string> = {
    field_source: '#10b981',
    timeline: '#3b82f6',
    cod_change: '#f59e0b',
    ownership: '#8b5cf6',
  }

  const isDerated = project.operational_capacity_mw != null && project.operational_capacity_mw < project.capacity_mw

  return (
    <div className="space-y-6">
      {/* Derated capacity alert */}
      {isDerated && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-red-400">Derated Operations</span>
            <span className="text-xs font-mono text-red-400">
              {project.operational_capacity_mw} MW / {project.capacity_mw} MW
              <span className="ml-1 text-red-400/60">
                ({Math.round((project.operational_capacity_mw! / project.capacity_mw) * 100)}%)
              </span>
            </span>
          </div>
          <div className="w-full bg-red-500/10 rounded-full h-2.5 mb-2">
            <div
              className="bg-red-500 h-2.5 rounded-full"
              style={{ width: `${(project.operational_capacity_mw! / project.capacity_mw) * 100}%` }}
            />
          </div>
          {project.operational_capacity_note && (
            <p className="text-[10px] text-[var(--color-text-muted)]">{project.operational_capacity_note}</p>
          )}
        </div>
      )}

      {/* Field-level source comparison (if available) */}
      {hasFieldSources && (
        <section>
          <SectionTitle>Data Source Comparison</SectionTitle>
          <p className="text-xs text-[var(--color-text-muted)] mb-3">
            Multiple sources report different values for key fields. This view shows how each data point has
            been reported across sources — enabling you to see which source is most current and identify discrepancies.
          </p>
          <div className="space-y-3">
            {Object.entries(fieldGroups).map(([field, entries]) => {
              const config = FIELD_LABELS[field]
              const label = config?.label || field
              // Check if all values agree
              const values = entries.map(e => String(e.value))
              const allAgree = values.every(v => v === values[0])

              return (
                <div key={field} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-bg-elevated)]">
                    <span className="text-xs font-semibold text-[var(--color-text)]">{label}</span>
                    {entries.length > 1 && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        allAgree
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {allAgree ? 'Sources agree' : 'Sources differ'}
                      </span>
                    )}
                  </div>
                  <div className="divide-y divide-[var(--color-border)]">
                    {entries.map((entry, i) => {
                      const tierInfo = entry.tier ? TIER_LABELS[entry.tier] : null
                      return (
                        <div key={i} className="flex items-center justify-between px-4 py-2.5">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono font-medium text-[var(--color-text)]">
                                {config ? config.format(entry.value) : String(entry.value)}
                              </span>
                              {i === 0 && entries.length > 1 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">Latest</span>
                              )}
                            </div>
                            <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                              {entry.source}
                              {entry.note && (
                                <span className="ml-1 italic text-amber-400">— {entry.note}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                            {tierInfo && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{
                                backgroundColor: tierInfo.colour + '20',
                                color: tierInfo.colour,
                              }}>
                                {tierInfo.label}
                              </span>
                            )}
                            <span className="text-[10px] text-[var(--color-text-muted)] font-mono">{entry.date}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Staged Build-Out (if project has stages) */}
      {project.stages && project.stages.length > 0 && (
        <section>
          <SectionTitle>Staged Build-Out</SectionTitle>
          <p className="text-xs text-[var(--color-text-muted)] mb-3">
            This project is being delivered in {project.stages.length} stages. Each stage has its own capacity, timeline, and technology specifications.
          </p>

          {/* Visual progress bar */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[var(--color-text)]">Build-Out Progress</span>
              <span className="text-xs text-[var(--color-text-muted)] font-mono">
                {project.stages.filter(s => s.status === 'operating').reduce((sum, s) => sum + s.capacity_mw, 0)} MW operating
                {' / '}
                {project.capacity_mw} MW total
              </span>
            </div>
            <div className="flex gap-1 h-6 rounded-lg overflow-hidden">
              {project.stages.map((stage, i) => {
                const widthPct = stage.capacity_mw > 0
                  ? (stage.capacity_mw / project.capacity_mw) * 100
                  : (stage.storage_mwh && project.storage_mwh ? (stage.storage_mwh / project.storage_mwh) * 100 : 25 / project.stages!.length)
                const colours: Record<string, string> = {
                  operating: '#10b981',
                  commissioning: '#06b6d4',
                  construction: '#f59e0b',
                  development: '#64748b',
                }
                return (
                  <div
                    key={i}
                    className="relative flex items-center justify-center text-[10px] font-medium text-white"
                    style={{
                      width: `${Math.max(widthPct, 8)}%`,
                      backgroundColor: colours[stage.status] || '#64748b',
                    }}
                    title={`Stage ${stage.stage}: ${stage.capacity_mw} MW — ${stage.status}`}
                  >
                    S{stage.stage}
                  </div>
                )
              })}
            </div>
            <div className="flex gap-3 mt-2">
              {[
                { status: 'operating', colour: '#10b981' },
                { status: 'construction', colour: '#f59e0b' },
                { status: 'development', colour: '#64748b' },
              ].filter(s => project.stages!.some(st => st.status === s.status)).map(s => (
                <div key={s.status} className="flex items-center gap-1 text-[10px]">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.colour }} />
                  <span className="text-[var(--color-text-muted)] capitalize">{s.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stage detail cards */}
          <div className="space-y-2">
            {project.stages.map((stage) => {
              const statusColours: Record<string, string> = {
                operating: 'text-green-400 bg-green-500/20',
                commissioning: 'text-cyan-400 bg-cyan-500/20',
                construction: 'text-amber-400 bg-amber-500/20',
                development: 'text-slate-400 bg-slate-500/20',
              }
              return (
                <div key={stage.stage} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-bg-elevated)]">
                    <span className="text-xs font-semibold text-[var(--color-text)]">{stage.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${statusColours[stage.status] || ''}`}>
                      {stage.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-4 py-2.5">
                    {stage.capacity_mw > 0 && (
                      <>
                        <span className="text-[10px] text-[var(--color-text-muted)]">Capacity</span>
                        <span className="text-xs font-mono text-[var(--color-text)]">{stage.capacity_mw} MW</span>
                      </>
                    )}
                    {stage.storage_mwh && stage.storage_mwh > 0 && (
                      <>
                        <span className="text-[10px] text-[var(--color-text-muted)]">Storage</span>
                        <span className="text-xs font-mono text-[var(--color-text)]">{stage.storage_mwh} MWh</span>
                      </>
                    )}
                    {stage.oem && (
                      <>
                        <span className="text-[10px] text-[var(--color-text-muted)]">OEM</span>
                        <span className="text-xs font-mono text-[var(--color-text)]">{stage.oem}{stage.oem_model ? ` ${stage.oem_model}` : ''}</span>
                      </>
                    )}
                    {stage.capex_aud_m && (
                      <>
                        <span className="text-[10px] text-[var(--color-text-muted)]">Capex</span>
                        <span className="text-xs font-mono text-[var(--color-text)]">A${stage.capex_aud_m}M</span>
                      </>
                    )}
                    {stage.cod && (
                      <>
                        <span className="text-[10px] text-[var(--color-text-muted)]">COD</span>
                        <span className="text-xs font-mono text-[var(--color-text)]">{stage.cod}</span>
                      </>
                    )}
                    {stage.grid_forming && (
                      <>
                        <span className="text-[10px] text-[var(--color-text-muted)]">Grid-Forming</span>
                        <span className="text-xs text-green-400">Yes</span>
                      </>
                    )}
                  </div>
                  {stage.notes && (
                    <div className="px-4 pb-2.5">
                      <p className="text-[10px] text-[var(--color-text-muted)] italic">{stage.notes}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Unified evolution timeline */}
      <section>
        <SectionTitle>Project Evolution Timeline</SectionTitle>
        <p className="text-xs text-[var(--color-text-muted)] mb-3">
          All data changes, milestones, and source updates in chronological order.
          {!hasFieldSources && ' Per-field source tracking will be added as data is enriched.'}
        </p>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-3">
          {[
            ...(hasFieldSources ? [{ key: 'field_source', label: 'Data Source' }] : []),
            { key: 'timeline', label: 'Milestone' },
            ...(project.cod_history?.length ? [{ key: 'cod_change', label: 'COD Change' }] : []),
            ...(project.ownership_history?.length ? [{ key: 'ownership', label: 'Ownership' }] : []),
          ].map(item => (
            <div key={item.key} className="flex items-center gap-1.5 text-[10px]">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: TYPE_COLOURS[item.key] }} />
              <span className="text-[var(--color-text-muted)]">{item.label}</span>
            </div>
          ))}
        </div>

        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-[7px] top-0 bottom-0 w-px bg-[var(--color-border)]" />

          <div className="space-y-1">
            {evolutionEvents.map((event, i) => (
              <div key={i} className="relative flex items-start gap-3 pl-6">
                {/* Dot */}
                <div
                  className="absolute left-0 top-2 w-[15px] h-[15px] rounded-full border-2 flex-shrink-0"
                  style={{
                    borderColor: TYPE_COLOURS[event.type],
                    backgroundColor: i === 0 ? TYPE_COLOURS[event.type] : 'var(--color-bg)',
                  }}
                />

                <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[var(--color-text)]">{event.field}</span>
                    <span className="text-[10px] text-[var(--color-text-muted)] font-mono flex-shrink-0">{event.date}</span>
                  </div>
                  {event.value && (
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-2">{event.value}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-[var(--color-text-muted)] italic">{event.source}</span>
                    {event.tier && TIER_LABELS[event.tier] && (
                      <span className="text-[10px] px-1 py-0.5 rounded" style={{
                        backgroundColor: TIER_LABELS[event.tier].colour + '20',
                        color: TIER_LABELS[event.tier].colour,
                      }}>
                        T{event.tier}
                      </span>
                    )}
                    {event.note && (
                      <span className="text-[10px] text-amber-400 italic">{event.note}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {evolutionEvents.length === 0 && (
          <div className="text-center py-8 text-[var(--color-text-muted)] text-sm">
            No evolution data available yet. Data will populate as sources are tracked.
          </div>
        )}
      </section>

      {/* Key metrics summary (derived from available data) */}
      <section>
        <SectionTitle>Current Values & Sources</SectionTitle>
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl divide-y divide-[var(--color-border)]">
          {[
            { label: 'Capacity', value: `${project.capacity_mw} MW`, source: hasFieldSources ? fieldSources?.capacity_mw?.[0]?.source : 'AEMO' },
            ...(project.storage_mwh ? [{ label: 'Storage', value: `${project.storage_mwh} MWh`, source: hasFieldSources ? fieldSources?.storage_mwh?.[0]?.source : 'AEMO' }] : []),
            ...(project.capex_aud_m ? [{ label: 'Capital Cost', value: `A$${project.capex_aud_m}M`, source: project.capex_source || (hasFieldSources ? fieldSources?.capex_aud_m?.[0]?.source : undefined) }] : []),
            { label: 'Status', value: project.status, source: hasFieldSources ? fieldSources?.status?.[0]?.source : 'AEMO / Pipeline' },
            { label: 'COD', value: project.cod_current || 'TBD', source: hasFieldSources ? fieldSources?.cod_current?.[0]?.source : 'AEMO' },
            { label: 'Developer', value: project.current_developer || '—', source: hasFieldSources ? fieldSources?.current_developer?.[0]?.source : 'AEMO' },
            ...(project.first_seen ? [{ label: 'First Tracked', value: project.first_seen, source: 'AURES' }] : []),
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2.5">
              <div>
                <span className="text-xs text-[var(--color-text-muted)]">{item.label}</span>
                {item.source && (
                  <span className="text-[10px] text-[var(--color-text-muted)] ml-2 italic">({item.source})</span>
                )}
              </div>
              <span className="text-sm font-medium text-[var(--color-text)] font-mono">{item.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Coverage indicator */}
      {!hasFieldSources && (
        <div className="bg-[var(--color-bg-card)] border border-amber-500/20 rounded-xl p-4">
          <p className="text-xs text-amber-400 font-medium mb-1">Per-field source tracking not yet available</p>
          <p className="text-xs text-[var(--color-text-muted)]">
            This project uses the standard data model. As AURES expands its multi-source provenance tracking,
            you'll be able to see exactly where each data point came from and how it has changed across different
            sources over time. Currently available on select projects (e.g. Tomago BESS).
          </p>
        </div>
      )}
    </div>
  )
}

function SourcesTab({ project }: { project: Project }) {
  return (
    <div className="space-y-6">
      <section>
        <SectionTitle>Data Sources</SectionTitle>
        <div className="space-y-2">
          {project.sources.map((source, i) => (
            <a
              key={i}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 hover:border-[var(--color-primary)]/30 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">{source.title}</p>
                <p className="text-[10px] text-[var(--color-text-muted)] truncate max-w-[250px]">
                  {source.url}
                </p>
              </div>
              {source.source_tier && (
                <span className="text-[10px] bg-[var(--color-bg-elevated)] px-2 py-0.5 rounded-full text-[var(--color-text-muted)]">
                  Tier {source.source_tier}
                </span>
              )}
            </a>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Data Quality</SectionTitle>
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl divide-y divide-[var(--color-border)]">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs text-[var(--color-text-muted)]">Overall Confidence</span>
            <ConfidenceDots confidence={project.data_confidence} showLabel />
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs text-[var(--color-text-muted)]">Last Updated</span>
            <span className="text-sm text-[var(--color-text)]">{project.last_updated}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs text-[var(--color-text-muted)]">Last Verified</span>
            <span className="text-sm text-[var(--color-text)]">{project.last_verified}</span>
          </div>
          {project.aemo_gen_info_id && (
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-[var(--color-text-muted)]">AEMO Gen Info ID</span>
              <span className="text-sm text-[var(--color-text)] font-mono">{project.aemo_gen_info_id}</span>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
