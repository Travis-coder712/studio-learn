/**
 * LearnHub — landing page for AURES Learning.
 * Lists every module from learning-modules.ts as a card, with status,
 * lesson count, planned read time and a link to the module page.
 */
import { Link } from 'react-router-dom'
import { LEARNING_MODULES, totalLessons, type LearningModule, type ModuleStatus } from '../../data/learning-modules'

const STATUS_BADGE: Record<ModuleStatus, { label: string; bg: string; color: string }> = {
  available:        { label: '✅ Available',        bg: 'rgba(34,197,94,0.15)',  color: '#22c55e' },
  'in-development': { label: '🚧 In Development',   bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
  planned:          { label: '📋 Planned',          bg: 'rgba(148,163,184,0.15)',color: '#94a3b8' },
}

export default function LearnHub() {
  const moduleCount = LEARNING_MODULES.length
  const availableCount = LEARNING_MODULES.filter(m => m.status === 'available').length
  const inDevCount = LEARNING_MODULES.filter(m => m.status === 'in-development').length
  const lessonCount = totalLessons()

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] tracking-tight">
          AURES Learning
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed max-w-3xl">
          A growing library of deep-dive modules on the Australian renewable energy market — written
          for analysts, board members, and developers who want to understand the technical and
          commercial mechanics behind the headline numbers. Each module is structured around 5–7
          lessons with interactive examples, real AURES data, and a clearly cited research bibliography.
        </p>
        <div className="flex flex-wrap gap-3 text-xs text-[var(--color-text-muted)]">
          <span><strong className="text-[var(--color-text)]">{moduleCount}</strong> modules</span>
          <span className="text-[var(--color-border)]">·</span>
          <span><strong className="text-[var(--color-text)]">{lessonCount}</strong> lessons planned across all modules</span>
          <span className="text-[var(--color-border)]">·</span>
          <span><strong style={{ color: '#22c55e' }}>{availableCount}</strong> available · <strong style={{ color: '#f59e0b' }}>{inDevCount}</strong> in development</span>
        </div>
      </div>

      {/* Roadmap explainer */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
          About the curriculum
        </p>
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
          Modules listed as <span style={{ color: '#22c55e', fontWeight: 600 }}>Available</span> are fully built. Modules listed as <span style={{ color: '#f59e0b', fontWeight: 600 }}>In Development</span> show their planned lesson outline and the research sources we will mine when we build the lessons — open the module to see the depth that&rsquo;s coming. We deep-build one module per dedicated session.
        </p>
      </div>

      {/* Module grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {LEARNING_MODULES.map(m => (
          <ModuleCard key={m.id} m={m} />
        ))}
      </div>

      {/* Footer */}
      <p className="text-[10px] text-[var(--color-text-muted)] text-center pt-6 border-t border-[var(--color-border)]">
        Each module deep-build draws on government data (AEMO, AEMC, AER, DCCEEW, state agencies),
        peer-reviewed research (UNSW CEEM, ANU, CSIRO, Grattan), industry analytics (Baringa, EY ROAM,
        Aurora Energy Research, Modo Energy, Wood Mac, Cornwall Insight, BloombergNEF), Australian
        law firms (HSF Kramer, Norton Rose Fulbright, Allens, KWM, Clayton Utz, Ashurst, MinterEllison),
        and primary AURES data integrations. Sources are listed in each module page.
      </p>
    </div>
  )
}

function ModuleCard({ m }: { m: LearningModule }) {
  const badge = STATUS_BADGE[m.status]
  const link = m.route ?? `/learn/${m.id}`

  return (
    <Link to={link}
      className="block bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 hover:border-[var(--color-primary)] hover:bg-[var(--color-bg-elevated)] transition-colors group">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl" aria-hidden>{m.icon}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ backgroundColor: badge.bg, color: badge.color }}>
            {badge.label}
          </span>
        </div>
        {m.buildOrder != null && m.status !== 'available' && (
          <span className="text-[10px] text-[var(--color-text-muted)]/70 italic">
            #{m.buildOrder} priority
          </span>
        )}
      </div>
      <h3 className="text-base font-bold text-[var(--color-text)] leading-snug group-hover:text-[var(--color-primary)]"
        style={{ borderLeft: `3px solid ${m.accent}`, paddingLeft: 8, marginLeft: -8 }}>
        {m.title}
      </h3>
      <p className="text-xs text-[var(--color-text-muted)] mt-1.5 italic">{m.tagline}</p>
      <p className="text-xs text-[var(--color-text-muted)] mt-2 leading-relaxed line-clamp-3">
        {m.description}
      </p>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)]">
        <span>{m.lessons.length} lessons · {m.readingTime}</span>
        <span className="text-[var(--color-primary)] group-hover:underline font-medium">
          {m.status === 'available' ? 'Start →' : 'View outline →'}
        </span>
      </div>
    </Link>
  )
}
