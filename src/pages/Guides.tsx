import { Link } from 'react-router-dom'
import { GUIDES, GUIDE_CATEGORIES, isGuideRecent } from '../data/guides'

function formatStamp(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export default function Guides() {
  return (
    <div className="px-4 lg:px-8 py-6 max-w-3xl mx-auto">
      <h1 className="text-xl lg:text-2xl font-bold text-[var(--color-text)] mb-2">
        Guides & Documentation
      </h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">
        Everything about the AURES project — what it is, how it's built, and where it's heading.
      </p>

      {/* Categories */}
      {(['about', 'technical', 'roadmap', 'process'] as const).map((category) => {
        const cat = GUIDE_CATEGORIES[category]
        const guides = GUIDES.filter((g) => g.category === category)
        if (guides.length === 0) return null
        return (
          <section key={category} className="mb-8">
            <h2
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: cat.color }}
            >
              {cat.label}
            </h2>
            <div className="space-y-3">
              {guides.map((guide) => (
                <Link
                  key={guide.id}
                  to={`/guides/${guide.id}`}
                  className="flex items-start gap-3 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 hover:border-[var(--color-primary)]/30 transition-all active:scale-[0.99]"
                >
                  <span className="text-2xl flex-shrink-0 mt-0.5">{guide.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <h3 className="text-sm font-semibold text-[var(--color-text)]">
                        {guide.title}
                      </h3>
                      {isGuideRecent(guide) && (
                        <span
                          className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                          style={{
                            background: guide.updated && guide.updated !== guide.added ? '#3b82f620' : '#10b98120',
                            color: guide.updated && guide.updated !== guide.added ? '#60a5fa' : '#10b981',
                          }}
                        >
                          {guide.updated && guide.updated !== guide.added ? 'Updated' : 'New'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                      {guide.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--color-text-muted)]/60">
                      <span>{guide.readingTime}</span>
                      <span>·</span>
                      <span>
                        {guide.updated && guide.updated !== guide.added
                          ? `Updated ${formatStamp(guide.updated)}`
                          : `Added ${formatStamp(guide.added)}`}
                      </span>
                    </div>
                  </div>
                  <svg
                    className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0 mt-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
