/**
 * Studio Learn — Home (landing page).
 *
 * A clean entry point that explains what Studio Learn is, lists the
 * mirrored AURES curricula, and points readers at the live canonical
 * AURES site for project data and intelligence dashboards.
 */
import { Link } from 'react-router-dom'
import { LEARNING_MODULES, totalLessons } from '../data/learning-modules'

export default function Home() {
  const total = totalLessons()
  const availableModules = LEARNING_MODULES.filter(m => m.status === 'available')

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 lg:py-14 space-y-10">
      {/* Hero */}
      <section className="space-y-4">
        <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-[var(--color-primary)]">
          Studio · Learn
        </p>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[var(--color-text)] leading-[1.05]">
          The Australian renewable-energy curriculum,{' '}
          <span className="text-[var(--color-primary)]">in one place</span>.
        </h1>
        <p className="text-base sm:text-lg text-[var(--color-text-muted)] max-w-3xl leading-relaxed">
          A standalone copy of the AURES learning modules — twelve deep-dive curricula spanning the
          energy transition, scheme design (CIS, LTESA), grid connection, project finance, valuation
          of wind / solar / BESS / hybrid projects, planning approvals, and the structural
          implications for the NEM through 2030.
        </p>
        <p className="text-sm text-[var(--color-text-muted)] max-w-3xl leading-relaxed">
          Mirrored from{' '}
          <a
            href="https://travis-coder712.github.io/aures-db/"
            className="text-[var(--color-primary)] hover:underline"
          >
            AURES
          </a>{' '}
          — the canonical source, which also carries the live project tracker, scheme intelligence,
          and per-developer scoring. Studio Learn keeps the curriculum in a focused, lightweight
          form that's easy to share. {total} lessons across {availableModules.length} live modules,
          with interactive calculators included (PPA × CISA settlement, single-hour explorer, MC1
          Benefit-Cost Ratio, project valuation tools).
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            to="/learn"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--color-primary)] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Open the curriculum →
          </Link>
          <a
            href="https://travis-coder712.github.io/aures-db/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)] font-semibold text-sm transition-colors"
          >
            Visit AURES (canonical)
          </a>
        </div>
      </section>

      {/* Module overview grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-xl font-bold text-[var(--color-text)]">All curricula</h2>
          <Link
            to="/learn"
            className="text-sm text-[var(--color-primary)] hover:underline"
          >
            Open the learning hub →
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {LEARNING_MODULES.map(m => (
            <Link
              key={m.id}
              to={m.route ?? `/learn/${m.id}`}
              className="block bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 hover:border-[var(--color-primary)] hover:bg-[var(--color-bg-elevated)] transition-colors group"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl" aria-hidden>{m.icon}</span>
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  m.status === 'available'
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-amber-500/15 text-amber-400'
                }`}>
                  {m.status === 'available' ? '✓ Live' : 'Planned'}
                </span>
              </div>
              <h3 className="text-base font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)]">
                {m.title}
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] italic mt-1">
                {m.tagline}
              </p>
              <p className="text-[10px] text-[var(--color-text-muted)]/70 mt-2">
                {m.lessons.length} lessons · {m.readingTime}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Note on AURES */}
      <section className="bg-[var(--color-bg-card)] border-l-4 border-[var(--color-primary)] rounded-xl p-5">
        <p className="text-xs uppercase tracking-wider text-[var(--color-primary)] font-bold mb-2">
          What's NOT here
        </p>
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
          Studio Learn carries the curriculum only. AURES also includes a live project tracker
          (~270+ projects across the NEM and WEM), the CIS/LTESA Scheme Intelligence dashboards
          with the Boardroom view, per-developer scoring, BESS capex tracker, value-analysis
          dashboards for operating wind and solar farms, transmission infrastructure layer, and
          regular news/data updates. For anything beyond the curricula, go to{' '}
          <a
            href="https://travis-coder712.github.io/aures-db/"
            className="text-[var(--color-primary)] hover:underline"
          >
            AURES
          </a>.
        </p>
      </section>
    </div>
  )
}
