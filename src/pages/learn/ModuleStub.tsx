/**
 * ModuleStub — placeholder page for modules that are 'in-development' or
 * 'planned'. Surfaces the planned lesson outline + research bibliography so
 * users (and future-me) can see the depth that's coming.
 *
 * For 'available' modules the App router sends visitors directly to the
 * built module page (e.g. ConstraintsModule), so this stub only ever
 * renders for modules where status !== 'available'.
 */
import { useParams, Link } from 'react-router-dom'
import { getModule } from '../../data/learning-modules'

export default function ModuleStub() {
  const { moduleId } = useParams<{ moduleId: string }>()
  const m = moduleId ? getModule(moduleId) : undefined

  if (!m) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-base text-[var(--color-text-muted)]">Module not found.</p>
        <Link to="/learn" className="text-sm text-[var(--color-primary)] hover:underline mt-2 inline-block">
          ← Back to Learning hub
        </Link>
      </div>
    )
  }

  const isInDev = m.status === 'in-development'

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      {/* Breadcrumb */}
      <Link to="/learn" className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
        ← AURES Learning
      </Link>

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-3xl" aria-hidden>{m.icon}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full"
            style={{
              backgroundColor: isInDev ? 'rgba(245,158,11,0.15)' : 'rgba(148,163,184,0.15)',
              color: isInDev ? '#f59e0b' : '#94a3b8',
            }}>
            {isInDev ? '🚧 In Development' : '📋 Planned'}
          </span>
          {m.buildOrder != null && (
            <span className="text-[10px] text-[var(--color-text-muted)]/70 italic">
              build priority #{m.buildOrder}
            </span>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] leading-tight"
          style={{ borderLeft: `4px solid ${m.accent}`, paddingLeft: 12, marginLeft: -12 }}>
          {m.title}
        </h1>
        <p className="text-base italic text-[var(--color-text-muted)] max-w-3xl">{m.tagline}</p>
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed max-w-3xl">{m.description}</p>
        <div className="flex flex-wrap gap-3 text-xs text-[var(--color-text-muted)]">
          <span><strong className="text-[var(--color-text)]">{m.lessons.length}</strong> lessons planned</span>
          <span className="text-[var(--color-border)]">·</span>
          <span>{m.readingTime}</span>
          <span className="text-[var(--color-border)]">·</span>
          <span>added {m.added}</span>
        </div>
      </div>

      {/* Status callout */}
      <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-4">
        <p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#f59e0b' }}>
          Current status
        </p>
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
          This module&rsquo;s lessons have not yet been built. The outline below documents what each lesson
          will cover, and the research bibliography lists every source we plan to mine when we deep-build
          the content. Modules are deep-built one per dedicated session — see the Learning hub for the
          current build sequence.
        </p>
      </div>

      {/* Lesson outline */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Planned lesson outline</h2>
        <p className="text-xs text-[var(--color-text-muted)]">
          The exact list and sequence may evolve during the deep build, but this captures the topics
          we plan to cover and the depth we&rsquo;re targeting.
        </p>
        <ol className="space-y-3">
          {m.lessons.map(l => (
            <li key={l.id} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
              <div className="flex items-baseline gap-3">
                <span className="text-xs font-bold text-[var(--color-text-muted)]">Lesson {l.number}</span>
                <h3 className="text-sm font-bold text-[var(--color-text)]">{l.title}</h3>
              </div>
              <p className="text-sm text-[var(--color-text-muted)] mt-1.5 leading-relaxed">{l.summary}</p>
              {l.covers && l.covers.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {l.covers.map((c, i) => (
                    <li key={i} className="text-xs text-[var(--color-text-muted)] flex gap-2">
                      <span className="text-[var(--color-text-muted)]/50">•</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              )}
              {l.interactive && (
                <p className="text-[10px] text-[var(--color-primary)] mt-2 italic">
                  Interactive element planned: {l.interactive}
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* Research bibliography */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Research bibliography</h2>
        <p className="text-xs text-[var(--color-text-muted)]">
          The sources we will consult when we deep-build this module. Breadth here is part of the AURES
          quality bar — government primary sources, peer-reviewed research, industry analytics, law firm
          updates, and primary AURES data are all listed.
        </p>
        <div className="grid lg:grid-cols-2 gap-3">
          {m.sources.map(grp => (
            <div key={grp.category} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                {grp.category}
              </p>
              <ul className="space-y-1.5">
                {grp.items.map((s, i) => (
                  <li key={i} className="text-xs text-[var(--color-text-muted)] flex gap-2">
                    <span className="text-[var(--color-text-muted)]/50 mt-0.5">•</span>
                    <span className="flex-1 min-w-0">
                      {s.url ? (
                        <a href={s.url} target="_blank" rel="noopener" className="text-[var(--color-text)] hover:text-[var(--color-primary)] hover:underline">
                          {s.label} ↗
                        </a>
                      ) : (
                        <span className="text-[var(--color-text)]">{s.label}</span>
                      )}
                      {s.note && <span className="text-[var(--color-text-muted)]/80"> — {s.note}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <p className="text-[10px] text-[var(--color-text-muted)] text-center pt-6 border-t border-[var(--color-border)]">
        Open an outline lesson title above to be reminded what it&rsquo;s planning to cover when the module is deep-built.{' '}
        <Link to="/learn" className="text-[var(--color-primary)] hover:underline">Back to the hub →</Link>
      </p>
    </div>
  )
}
