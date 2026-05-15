import { useParams, Link } from 'react-router-dom'
import { useCISRound, useLTESARound } from '../hooks/useSchemeData'
import { TECHNOLOGY_CONFIG } from '../lib/types'
import type { SchemeProject } from '../data/scheme-rounds'

function ProjectRow({ project }: { project: SchemeProject }) {
  const techConfig = TECHNOLOGY_CONFIG[project.technology as keyof typeof TECHNOLOGY_CONFIG]

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[var(--color-text)] leading-tight">
            {project.name}
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            {project.developer}
          </p>
        </div>
        {techConfig && (
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ml-2"
            style={{ backgroundColor: `${techConfig.color}20`, color: techConfig.color }}
          >
            {techConfig.icon} {techConfig.label}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
        <span className="font-medium text-[var(--color-text)]">{project.capacity_mw} MW</span>
        {project.storage_mwh && (
          <span>{project.storage_mwh} MWh</span>
        )}
        <span>{project.state}</span>
        {project.location && (
          <span className="text-[var(--color-text-muted)]/60">{project.location}</span>
        )}
      </div>
    </div>
  )
}

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-[var(--color-bg-elevated)] rounded-lg p-3">
      <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold mt-0.5" style={{ color }}>{value}</p>
    </div>
  )
}

export default function SchemeRoundDetail() {
  const { scheme, roundId } = useParams<{ scheme: string; roundId: string }>()

  const isCIS = scheme === 'cis'
  const { round: cisRound, projects: cisProjects } = useCISRound(isCIS ? roundId : undefined)
  const { round: ltesaRound, projects: ltesaProjects } = useLTESARound(!isCIS ? roundId : undefined)

  const round = isCIS ? cisRound : ltesaRound
  const projects = isCIS ? cisProjects : ltesaProjects
  const accentColor = isCIS ? '#f59e0b' : '#8b5cf6'

  if (!round) {
    return (
      <div className="px-4 lg:px-8 py-6 max-w-4xl mx-auto">
        <Link to="/schemes" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
          ← Back to Schemes
        </Link>
        <div className="text-center py-16">
          <p className="text-lg text-[var(--color-text-muted)]">Round not found</p>
        </div>
      </div>
    )
  }

  const capacityDisplay = round.total_capacity_mw >= 1000
    ? `${(round.total_capacity_mw / 1000).toFixed(1)} GW`
    : `${Math.round(round.total_capacity_mw)} MW`

  const storageDisplay = round.total_storage_mwh
    ? round.total_storage_mwh >= 1000
      ? `${(round.total_storage_mwh / 1000).toFixed(1)} GWh`
      : `${Math.round(round.total_storage_mwh)} MWh`
    : null

  const isPending = !round.announced_date

  // Group projects by state
  const byState = projects.reduce((acc, p) => {
    const key = p.state
    if (!acc[key]) acc[key] = []
    acc[key].push(p)
    return acc
  }, {} as Record<string, SchemeProject[]>)

  return (
    <div className="px-4 lg:px-8 py-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <Link
        to="/schemes"
        className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] mb-4 inline-block"
      >
        ← All Schemes
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
          >
            {isCIS ? 'CIS' : 'LTESA'}
          </span>
          {isCIS && (
            <span className="text-xs px-2 py-0.5 rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)]">
              {(round as any).market}
            </span>
          )}
          <span className="text-xs px-2 py-0.5 rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)]">
            {round.type === 'generation' ? 'Generation' :
             round.type === 'dispatchable' ? 'Dispatchable' :
             round.type === 'firming' ? 'Firming' :
             round.type === 'lds' ? 'Long Duration Storage' :
             round.type}
          </span>
        </div>
        <h1 className="text-xl lg:text-2xl font-bold text-[var(--color-text)] mb-1">
          {round.name}
        </h1>
        {round.announced_date && (
          <p className="text-sm text-[var(--color-text-muted)]">
            Announced {round.announced_date}
          </p>
        )}
      </div>

      {/* Stats */}
      {!isPending && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatBox label="Projects" value={String(round.num_projects)} />
          <StatBox label="Capacity" value={capacityDisplay} color={accentColor} />
          {storageDisplay && (
            <StatBox label="Storage" value={storageDisplay} color={accentColor} />
          )}
          {storageDisplay && round.total_capacity_mw > 0 && (
            <StatBox
              label="Avg Duration"
              value={`${(round.total_storage_mwh! / round.total_capacity_mw).toFixed(1)}h`}
            />
          )}
        </div>
      )}

      {/* Description */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 mb-6">
        <p className="text-sm text-[var(--color-text)] leading-relaxed">
          {round.description}
        </p>
        {'key_changes' in round && (round as any).key_changes && (
          <p className="text-xs text-[var(--color-text-muted)] mt-2 pt-2 border-t border-[var(--color-border)]">
            <strong>Key changes:</strong> {(round as any).key_changes}
          </p>
        )}
      </div>

      {/* Projects */}
      {projects.length > 0 ? (
        <>
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">
            Winning Projects ({projects.length})
          </h2>
          {Object.keys(byState).length > 1 ? (
            // Group by state
            Object.entries(byState)
              .sort(([, a], [, b]) => b.reduce((s, p) => s + p.capacity_mw, 0) - a.reduce((s, p) => s + p.capacity_mw, 0))
              .map(([state, stateProjects]) => (
                <div key={state} className="mb-6">
                  <h3 className="text-sm font-semibold text-[var(--color-text-muted)] mb-3 flex items-center gap-2">
                    {state}
                    <span className="text-[10px] font-normal">
                      ({stateProjects.length} project{stateProjects.length > 1 ? 's' : ''} ·{' '}
                      {stateProjects.reduce((s, p) => s + p.capacity_mw, 0)} MW)
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {stateProjects
                      .sort((a, b) => b.capacity_mw - a.capacity_mw)
                      .map((project) => (
                        <ProjectRow key={project.name} project={project} />
                      ))}
                  </div>
                </div>
              ))
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">
              {projects
                .sort((a, b) => b.capacity_mw - a.capacity_mw)
                .map((project) => (
                  <ProjectRow key={project.name} project={project} />
                ))}
            </div>
          )}
        </>
      ) : isPending ? (
        <div className="text-center py-12 bg-[var(--color-bg-card)] border border-[var(--color-border)] border-dashed rounded-xl">
          <span className="text-3xl mb-2 block">⏳</span>
          <p className="text-sm text-[var(--color-text-muted)]">Results not yet announced</p>
        </div>
      ) : (
        <div className="text-center py-12 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl">
          <p className="text-sm text-[var(--color-text-muted)]">
            Detailed project data being added. Check back soon.
          </p>
        </div>
      )}

      {/* Sources */}
      {round.sources.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3">Sources</h2>
          <div className="space-y-2">
            {round.sources.map((source, i) => (
              <a
                key={i}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-[var(--color-primary)] hover:underline"
              >
                <span className="text-[var(--color-text-muted)]">
                  {source.source_tier ? `Tier ${source.source_tier}` : ''}
                </span>
                {source.title}
                {source.date && (
                  <span className="text-[var(--color-text-muted)]">({source.date})</span>
                )}
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
