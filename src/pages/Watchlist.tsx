import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useProjectIndex } from '../hooks/useProjectData'
import { useWatchlist } from '../lib/useWatchlist'
import ProjectCard from '../components/common/ProjectCard'
import type { ProjectSummary } from '../lib/types'

const STATUS_PRIORITY: Record<string, number> = {
  commissioning: 5, construction: 4, development: 3, operating: 2, withdrawn: 1
}

export default function Watchlist() {
  const { projects: allProjects } = useProjectIndex()
  const { watched, toggle, isWatched, count } = useWatchlist()

  const watchedProjects = useMemo<ProjectSummary[]>(() => {
    if (!allProjects) return []
    return allProjects
      .filter((p: ProjectSummary) => watched.has(p.id))
      .sort((a: ProjectSummary, b: ProjectSummary) => (STATUS_PRIORITY[b.status] || 0) - (STATUS_PRIORITY[a.status] || 0) || b.capacity_mw - a.capacity_mw)
  }, [allProjects, watched])

  const zombieProjects = useMemo<ProjectSummary[]>(() => {
    if (!allProjects) return []
    return allProjects
      .filter((p: ProjectSummary) => p.zombie_flag === 'zombie_stale')
      .sort((a: ProjectSummary, b: ProjectSummary) => b.capacity_mw - a.capacity_mw)
  }, [allProjects])

  const lowDataProjects = useMemo<ProjectSummary[]>(() => {
    if (!allProjects) return []
    return allProjects
      .filter((p: ProjectSummary) => p.zombie_flag === 'zombie_minimal' && p.capacity_mw >= 200)
      .sort((a: ProjectSummary, b: ProjectSummary) => b.capacity_mw - a.capacity_mw)
      .slice(0, 20)
  }, [allProjects])

  const constructionProjects = useMemo<ProjectSummary[]>(() => {
    if (!allProjects) return []
    return allProjects
      .filter((p: ProjectSummary) => p.status === 'construction' || p.status === 'commissioning')
      .sort((a: ProjectSummary, b: ProjectSummary) => b.capacity_mw - a.capacity_mw)
  }, [allProjects])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Project Watchlist</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Star projects from the project list to track them here. Zombie detection highlights projects that may not be progressing.
        </p>
      </div>

      {/* Your Watchlist */}
      <Section title="Your Watchlist" count={count} color="amber">
        {count === 0 ? (
          <EmptyState>
            No projects starred yet. Go to <Link to="/projects" className="text-[var(--color-primary)] hover:underline">Projects</Link> and click the star icon to add projects to your watchlist.
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {watchedProjects.map((p: ProjectSummary) => (
              <ProjectCard key={p.id} project={p} isWatched={isWatched(p.id)} onToggleWatch={toggle} />
            ))}
          </div>
        )}
      </Section>

      {/* Construction & Commissioning tracker */}
      <Section title="Active Build Tracker" count={constructionProjects.length} subtitle="Construction & commissioning projects" color="blue">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {constructionProjects.slice(0, 20).map((p: ProjectSummary) => (
            <ProjectCard key={p.id} project={p} isWatched={isWatched(p.id)} onToggleWatch={toggle} />
          ))}
        </div>
        {constructionProjects.length > 20 && (
          <Link to="/projects?status=construction,commissioning" className="block text-center text-sm text-[var(--color-primary)] hover:underline mt-3">
            View all {constructionProjects.length} active projects
          </Link>
        )}
      </Section>

      {/* Zombie Detection */}
      <Section title="Zombie Projects" count={zombieProjects.length} subtitle="Stale — first tracked before 2020 with no significant progress" color="red">
        {zombieProjects.length === 0 ? (
          <EmptyState>No stale zombie projects detected.</EmptyState>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {zombieProjects.slice(0, 12).map((p: ProjectSummary) => (
                <ProjectCard key={p.id} project={p} isWatched={isWatched(p.id)} onToggleWatch={toggle} />
              ))}
            </div>
            {zombieProjects.length > 12 && (
              <p className="text-xs text-[var(--color-text-muted)] mt-2 text-center">
                +{zombieProjects.length - 12} more stale projects
              </p>
            )}
          </>
        )}
      </Section>

      {/* Low Data large projects */}
      <Section title="Large Projects with Minimal Data" count={lowDataProjects.length} subtitle="200+ MW projects with low confidence scores" color="orange">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {lowDataProjects.map((p: ProjectSummary) => (
            <ProjectCard key={p.id} project={p} isWatched={isWatched(p.id)} onToggleWatch={toggle} />
          ))}
        </div>
      </Section>
    </div>
  )
}

function Section({ title, count, subtitle, color, children }: {
  title: string; count: number; subtitle?: string; color: string; children: React.ReactNode
}) {
  const colorMap: Record<string, string> = {
    amber: 'border-amber-500/30 bg-amber-500/5',
    blue: 'border-blue-500/30 bg-blue-500/5',
    red: 'border-red-500/30 bg-red-500/5',
    orange: 'border-orange-500/30 bg-orange-500/5',
  }
  const badgeMap: Record<string, string> = {
    amber: 'bg-amber-500/20 text-amber-400',
    blue: 'bg-blue-500/20 text-blue-400',
    red: 'bg-red-500/20 text-red-400',
    orange: 'bg-orange-500/20 text-orange-400',
  }

  return (
    <div className={`border rounded-xl p-4 ${colorMap[color] || ''}`}>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-lg font-bold text-[var(--color-text)]">{title}</h2>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeMap[color] || ''}`}>{count}</span>
        {subtitle && <span className="text-xs text-[var(--color-text-muted)]">— {subtitle}</span>}
      </div>
      {children}
    </div>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center py-8 text-sm text-[var(--color-text-muted)]">
      {children}
    </div>
  )
}
