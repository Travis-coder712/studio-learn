import { useParams, Link } from 'react-router-dom'
import { useMemo } from 'react'
import { marked } from 'marked'
import { GUIDES, GUIDE_CATEGORIES } from '../data/guides'

export default function GuideReader() {
  const { id } = useParams<{ id: string }>()
  const guide = GUIDES.find((g) => g.id === id)

  const htmlContent = useMemo(() => {
    if (!guide) return ''
    return marked.parse(guide.content, { async: false }) as string
  }, [guide])

  if (!guide) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60dvh] px-4 text-center">
        <span className="text-5xl mb-4">📖</span>
        <h1 className="text-xl font-bold text-[var(--color-text)] mb-2">Guide Not Found</h1>
        <Link to="/guides" className="text-sm text-[var(--color-primary)] hover:underline">
          ← Back to guides
        </Link>
      </div>
    )
  }

  const cat = GUIDE_CATEGORIES[guide.category]

  return (
    <div className="px-4 lg:px-8 py-6 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link to="/guides" className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
          ← All Guides
        </Link>
      </div>

      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{guide.icon}</span>
          <span
            className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
          >
            {cat.label}
          </span>
          <span className="text-[10px] text-[var(--color-text-muted)]">{guide.readingTime}</span>
          <span className="text-[10px] text-[var(--color-text-muted)]/60">·</span>
          <span className="text-[10px] text-[var(--color-text-muted)]">
            {guide.updated && guide.updated !== guide.added
              ? `Updated ${new Date(guide.updated).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`
              : `Added ${new Date(guide.added).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`}
          </span>
        </div>
        <h1 className="text-xl lg:text-2xl font-bold text-[var(--color-text)]">
          {guide.title}
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          {guide.description}
        </p>
      </header>

      {/* Content */}
      <article
        className="guide-content"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />

      {/* Navigation */}
      <footer className="mt-10 pt-6 border-t border-[var(--color-border)]">
        <div className="flex items-center justify-between">
          <Link to="/guides" className="text-sm text-[var(--color-primary)] hover:underline">
            ← All Guides
          </Link>
          {(() => {
            const idx = GUIDES.findIndex((g) => g.id === id)
            const next = GUIDES[idx + 1]
            if (!next) return null
            return (
              <Link to={`/guides/${next.id}`} className="text-sm text-[var(--color-primary)] hover:underline">
                {next.title} →
              </Link>
            )
          })()}
        </div>
      </footer>
    </div>
  )
}
