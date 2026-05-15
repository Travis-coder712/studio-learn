import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSearchIndex, type SearchResult } from '../../hooks/useSearchIndex'

const RECENT_KEY = 'aures-recent-searches'
const MAX_RECENT = 8

const ENTITY_BADGES: Record<SearchResult['entityType'], { label: string; color: string }> = {
  project: { label: 'Project', color: 'bg-blue-500/20 text-blue-400' },
  developer: { label: 'Developer', color: 'bg-purple-500/20 text-purple-400' },
  oem: { label: 'OEM', color: 'bg-teal-500/20 text-teal-400' },
  contractor: { label: 'Contractor', color: 'bg-orange-500/20 text-orange-400' },
  offtaker: { label: 'Offtaker', color: 'bg-green-500/20 text-green-400' },
}

const GROUP_ORDER: SearchResult['entityType'][] = ['project', 'developer', 'oem', 'contractor', 'offtaker']
const GROUP_LABELS: Record<string, string> = {
  project: 'Projects',
  developer: 'Developers',
  oem: 'OEMs',
  contractor: 'Contractors',
  offtaker: 'Offtakers',
}

function loadRecent(): SearchResult[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? (JSON.parse(raw) as SearchResult[]) : []
  } catch {
    return []
  }
}

function saveRecent(item: SearchResult) {
  const recent = loadRecent().filter(r => r.id !== item.id || r.entityType !== item.entityType)
  recent.unshift(item)
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
}

function SearchIcon() {
  return (
    <svg
      className="w-5 h-5 text-[var(--color-text-muted)] shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" strokeLinecap="round" />
    </svg>
  )
}

/** Flatten grouped results into a flat list for arrow-key navigation */
function flattenResults(results: SearchResult[]): { items: SearchResult[]; groups: { type: string; startIdx: number }[] } {
  const groups: { type: string; startIdx: number }[] = []
  const items: SearchResult[] = []

  for (const type of GROUP_ORDER) {
    const group = results.filter(r => r.entityType === type)
    if (group.length > 0) {
      groups.push({ type, startIdx: items.length })
      items.push(...group)
    }
  }

  return { items, groups }
}

interface SearchModalProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps = {}) {
  const [open, setOpenInternal] = useState(false)

  // Sync external isOpen prop to internal state
  useEffect(() => {
    if (isOpen !== undefined) setOpenInternal(isOpen)
  }, [isOpen])

  const setOpen = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    setOpenInternal(prev => {
      const newVal = typeof v === 'function' ? v(prev) : v
      if (!newVal && onClose) onClose()
      return newVal
    })
  }, [onClose])
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>(loadRecent)

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const navigate = useNavigate()
  const { search, loading, suggestions } = useSearchIndex()

  const results = query.trim() ? search(query) : []
  const { items: flatItems, groups } = flattenResults(results)

  // Open / close via Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Auto-focus input on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIdx(0)
      setRecentSearches(loadRecent())
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  // Reset selection when results change
  useEffect(() => {
    setSelectedIdx(0)
  }, [query])

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector(`[data-idx="${selectedIdx}"]`)
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [selectedIdx])

  const selectItem = useCallback((item: SearchResult) => {
    saveRecent(item)
    setOpen(false)
    navigate(item.path)
  }, [navigate])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const total = flatItems.length || recentSearches.length

    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(prev => (prev + 1) % total)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(prev => (prev - 1 + total) % total)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (query.trim() && flatItems[selectedIdx]) {
        selectItem(flatItems[selectedIdx])
      } else if (!query.trim() && recentSearches[selectedIdx]) {
        selectItem(recentSearches[selectedIdx])
      }
    }
  }, [flatItems, recentSearches, selectedIdx, query, selectItem])

  if (!open) return null

  const showRecent = !query.trim() && recentSearches.length > 0
  const showSuggestions = !query.trim() && !recentSearches.length && suggestions.length > 0
  const showEmpty = query.trim() && flatItems.length === 0 && !loading

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="max-w-2xl mx-auto mt-[10vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 border-b border-[var(--color-border)]">
            <SearchIcon />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search projects, developers..."
              className="w-full bg-transparent px-0 py-4 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none text-base"
            />
            <kbd className="hidden sm:inline-block text-[10px] text-[var(--color-text-muted)] border border-[var(--color-border)] rounded px-1.5 py-0.5 font-mono">
              ESC
            </kbd>
          </div>

          {/* Results area */}
          <div ref={listRef} className="max-h-[60vh] overflow-y-auto">
            {/* Loading state */}
            {loading && (
              <div className="px-4 py-8 text-center text-[var(--color-text-muted)] text-sm">
                Building search index...
              </div>
            )}

            {/* Search results grouped by entity type */}
            {!loading && query.trim() && flatItems.length > 0 && (
              <>
                {groups.map(g => {
                  const groupItems = flatItems.filter(r => r.entityType === g.type)
                  return (
                    <div key={g.type}>
                      <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                        {GROUP_LABELS[g.type] || g.type}
                      </div>
                      {groupItems.map(item => {
                        const globalIdx = flatItems.indexOf(item)
                        const badge = ENTITY_BADGES[item.entityType]
                        return (
                          <div
                            key={`${item.entityType}-${item.id}`}
                            data-idx={globalIdx}
                            className={`px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-white/5 ${
                              globalIdx === selectedIdx ? 'bg-white/10' : ''
                            }`}
                            onClick={() => selectItem(item)}
                            onMouseEnter={() => setSelectedIdx(globalIdx)}
                          >
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${badge.color}`}>
                              {badge.label}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm text-[var(--color-text)] truncate">{item.name}</div>
                              <div className="text-xs text-[var(--color-text-muted)] truncate">{item.subtitle}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </>
            )}

            {/* No results */}
            {showEmpty && (
              <div className="px-4 py-8 text-center text-[var(--color-text-muted)] text-sm">
                No results for &ldquo;{query}&rdquo;
              </div>
            )}

            {/* Recent searches */}
            {!loading && showRecent && (
              <div>
                <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Recent Searches
                </div>
                {recentSearches.map((item, idx) => {
                  const badge = ENTITY_BADGES[item.entityType]
                  return (
                    <div
                      key={`recent-${item.entityType}-${item.id}`}
                      data-idx={idx}
                      className={`px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-white/5 ${
                        idx === selectedIdx ? 'bg-white/10' : ''
                      }`}
                      onClick={() => selectItem(item)}
                      onMouseEnter={() => setSelectedIdx(idx)}
                    >
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${badge.color}`}>
                        {badge.label}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-[var(--color-text)] truncate">{item.name}</div>
                        <div className="text-xs text-[var(--color-text-muted)] truncate">{item.subtitle}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Suggestion chips */}
            {!loading && showSuggestions && (
              <div className="px-4 py-4">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
                  Try Searching
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map(s => (
                    <button
                      key={s}
                      className="text-xs px-3 py-1.5 rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text-muted)] transition-colors"
                      onClick={() => setQuery(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state with shortcut hint */}
            {!loading && !query.trim() && !recentSearches.length && !suggestions.length && (
              <div className="px-4 py-8 text-center text-[var(--color-text-muted)] text-sm">
                Press{' '}
                <kbd className="text-[10px] border border-[var(--color-border)] rounded px-1.5 py-0.5 font-mono">
                  &#8984;K
                </kbd>{' '}
                to search
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-[var(--color-border)] flex items-center gap-4 text-[10px] text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1">
              <kbd className="border border-[var(--color-border)] rounded px-1 py-0.5 font-mono">&uarr;&darr;</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="border border-[var(--color-border)] rounded px-1 py-0.5 font-mono">&crarr;</kbd>
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="border border-[var(--color-border)] rounded px-1 py-0.5 font-mono">esc</kbd>
              close
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
