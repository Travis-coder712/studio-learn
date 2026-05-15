import { useState, useMemo, useRef, useEffect } from 'react'
import Fuse from 'fuse.js'
import { useProjectIndex } from '../hooks/useProjectData'
import ProjectCard from '../components/common/ProjectCard'

const FUSE_OPTIONS = {
  keys: [
    { name: 'name', weight: 3 },
    { name: 'current_developer', weight: 2 },
    { name: 'state', weight: 1.5 },
    { name: 'rez', weight: 1.5 },
    { name: 'technology', weight: 1 },
  ],
  threshold: 0.3,
  includeScore: true,
}

export default function Search() {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { projects, loading } = useProjectIndex()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const fuse = useMemo(() => {
    if (projects.length === 0) return null
    return new Fuse(projects, FUSE_OPTIONS)
  }, [projects])

  const results = useMemo(() => {
    if (!query.trim() || !fuse) return []
    return fuse.search(query, { limit: 50 }).map((r) => r.item)
  }, [query, fuse])

  const suggestions = [
    'Golden Plains', 'Hornsdale', 'Origin', 'Tesla',
    'NSW', 'VIC', 'QLD', 'BESS', 'wind', 'solar',
  ]

  return (
    <div className="px-4 lg:px-8 py-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-[var(--color-text)] mb-4">Search</h1>
      <p className="text-xs text-[var(--color-text-muted)] mb-6">
        Press <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-[var(--color-border)] font-mono text-[10px]">⌘K</kbd> to search from anywhere
      </p>

      {/* Search Input */}
      <div className="relative mb-6">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={loading ? 'Loading projects...' : `Search ${projects.length} projects...`}
          disabled={loading}
          className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl pl-10 pr-4 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors disabled:opacity-50"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            ×
          </button>
        )}
      </div>

      {/* Results or suggestions */}
      {loading ? (
        <div className="text-center py-12">
          <div className="text-sm text-[var(--color-text-muted)] animate-pulse">Loading project data...</div>
        </div>
      ) : query.trim() ? (
        <>
          <p className="text-xs text-[var(--color-text-muted)] mb-4">
            {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
            {results.length === 50 && ' (showing first 50)'}
          </p>
          <div className="space-y-3">
            {results.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
          {results.length === 0 && (
            <div className="text-center py-12">
              <span className="text-4xl mb-3 block">🔍</span>
              <p className="text-sm text-[var(--color-text-muted)]">
                No projects found for "{query}"
              </p>
              <p className="text-xs text-[var(--color-text-muted)]/60 mt-1">
                Try searching by project name, developer, state, or technology
              </p>
            </div>
          )}
        </>
      ) : (
        <div>
          <p className="text-xs text-[var(--color-text-muted)] mb-3">Try searching for:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => setQuery(s)}
                className="text-xs px-3 py-1.5 rounded-full bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)]/30 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
