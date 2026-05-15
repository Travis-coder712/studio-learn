import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { fetchNews } from '../lib/dataService'
import type { NewsArticle } from '../lib/types'

const SOURCE_CONFIG: Record<string, { label: string; color: string; badge: string }> = {
  'reneweconomy': { label: 'RenewEconomy', color: 'bg-emerald-500/20 text-emerald-400', badge: 'RE' },
  'pv-magazine': { label: 'PV Magazine', color: 'bg-amber-500/20 text-amber-400', badge: 'PV' },
  'energy-storage-news': { label: 'Energy Storage News', color: 'bg-blue-500/20 text-blue-400', badge: 'ES' },
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function daysAgo(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00')
    const now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Yesterday'
    if (diff < 7) return `${diff}d ago`
    if (diff < 30) return `${Math.floor(diff / 7)}w ago`
    return formatDate(dateStr)
  } catch {
    return dateStr
  }
}

export default function News() {
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [sourceCounts, setSourceCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    fetchNews().then(data => {
      if (data) {
        setArticles(data.articles)
        setSourceCounts(data.source_counts)
      }
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    let result = articles
    if (sourceFilter !== 'all') {
      result = result.filter(a => a.source === sourceFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(a =>
        a.title.toLowerCase().includes(q) ||
        (a.summary && a.summary.toLowerCase().includes(q))
      )
    }
    return result
  }, [articles, sourceFilter, search])

  if (loading) {
    return (
      <div className="px-4 lg:px-8 py-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-white/5 rounded" />
          <div className="h-4 w-64 bg-white/5 rounded" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 lg:px-8 py-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold text-[var(--color-text)] mb-1">News</h1>
      <p className="text-xs text-[var(--color-text-muted)] mb-6">
        Latest renewable energy news from Australian sources • {articles.length} articles
      </p>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles..."
            className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg pl-9 pr-4 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
          />
        </div>

        {/* Source filter chips */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSourceFilter('all')}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              sourceFilter === 'all'
                ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]'
                : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            All ({articles.length})
          </button>
          {Object.entries(SOURCE_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setSourceFilter(key)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                sourceFilter === key
                  ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {cfg.label} ({sourceCounts[key] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* No data state */}
      {articles.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-4xl mb-3 block">📰</span>
          <p className="text-sm text-[var(--color-text-muted)]">No news articles yet</p>
          <p className="text-xs text-[var(--color-text-muted)]/60 mt-1">
            Run the news RSS importer to fetch articles
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-4xl mb-3 block">🔍</span>
          <p className="text-sm text-[var(--color-text-muted)]">No articles match your filters</p>
        </div>
      ) : (
        /* Article list */
        <div className="space-y-3">
          {filtered.map((article, idx) => {
            const srcCfg = SOURCE_CONFIG[article.source] || { label: article.source, color: 'bg-gray-500/20 text-gray-400', badge: '?' }
            return (
              <article
                key={idx}
                className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 hover:border-[var(--color-primary)]/20 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Source badge */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${srcCfg.color} flex items-center justify-center font-bold text-xs`}>
                    {srcCfg.badge}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Title + link */}
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors line-clamp-2"
                    >
                      {article.title}
                      <svg className="inline-block w-3 h-3 ml-1 opacity-40" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                    </a>

                    {/* Meta */}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${srcCfg.color}`}>
                        {srcCfg.label}
                      </span>
                      <span className="text-[10px] text-[var(--color-text-muted)]">
                        {daysAgo(article.published_date)}
                      </span>
                      {article.project_data_updated && article.project_data_updated.length > 0 && (
                        <span
                          title={`Project data updated: ${article.project_data_updated.join(', ')}`}
                          className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                        >
                          ✎ Updated {article.project_data_updated.length} project{article.project_data_updated.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* Summary */}
                    {article.summary && (
                      <p className="text-xs text-[var(--color-text-muted)] mt-2 line-clamp-2">
                        {article.summary}
                      </p>
                    )}

                    {/* Matched projects */}
                    {article.matched_project_ids && article.matched_project_ids.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {article.matched_project_ids.slice(0, 3).map(pid => (
                          <Link
                            key={pid}
                            to={`/projects/${pid}`}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 transition-colors"
                          >
                            {pid.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                          </Link>
                        ))}
                        {article.matched_project_ids.length > 3 && (
                          <span className="text-[10px] text-[var(--color-text-muted)]">
                            +{article.matched_project_ids.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
