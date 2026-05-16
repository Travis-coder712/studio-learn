/**
 * Studio Learn — Home (landing page).
 *
 * A short entry point: hero, intro, and a single CTA into the
 * curriculum hub. The module catalogue lives on /learn — keeping
 * Home short avoids duplicating it.
 */
import { Link } from 'react-router-dom'
import { LEARNING_MODULES, totalLessons } from '../data/learning-modules'

export default function Home() {
  const total = totalLessons()
  const moduleCount = LEARNING_MODULES.length

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14 lg:py-24 space-y-8">
      <section className="space-y-5">
        <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-[var(--color-primary)]">
          Studio · Learn
        </p>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[var(--color-text)] leading-[1.05]">
          The Australian renewable-energy curriculum,{' '}
          <span className="text-[var(--color-primary)]">in one place</span>.
        </h1>
        <p className="text-base sm:text-lg text-[var(--color-text-muted)] max-w-2xl leading-relaxed">
          Twelve deep-dive modules spanning the energy transition, scheme design (CIS, LTESA),
          grid connection, project finance, valuation of wind / solar / BESS / hybrid projects,
          planning approvals, and the structural implications for the NEM through 2030.{' '}
          {total} lessons across {moduleCount} curricula, with interactive calculators included
          (PPA × CISA settlement, single-hour explorer, MC1 Benefit-Cost Ratio, project valuation
          tools).
        </p>
        <div className="pt-2">
          <Link
            to="/learn"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--color-primary)] text-white font-semibold text-base hover:opacity-90 transition-opacity"
          >
            Open the curriculum →
          </Link>
        </div>
      </section>
    </div>
  )
}
