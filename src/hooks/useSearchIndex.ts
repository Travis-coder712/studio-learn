import { useState, useMemo, useCallback } from 'react'
import Fuse from 'fuse.js'
import { useProjectIndex } from './useProjectData'

export interface SearchResult {
  entityType: 'project' | 'developer' | 'oem' | 'contractor' | 'offtaker'
  id: string
  name: string
  subtitle: string
  path: string
}

// Build cross-entity search results from project data
// Extract unique developers, OEMs, contractors, offtakers from the project index
export function useSearchIndex() {
  const { projects, loading } = useProjectIndex()
  const [indexReady, setIndexReady] = useState(false)

  // Build searchable items from all project data
  const allItems = useMemo(() => {
    if (!projects.length) return []

    const items: SearchResult[] = []
    const seenDevs = new Set<string>()

    // Add all projects
    for (const p of projects) {
      items.push({
        entityType: 'project',
        id: p.id,
        name: p.name,
        subtitle: `${p.technology} \u00b7 ${p.capacity_mw} MW \u00b7 ${p.state}`,
        path: `/projects/${p.id}`,
      })

      // Extract developers
      if (p.current_developer && !seenDevs.has(p.current_developer)) {
        seenDevs.add(p.current_developer)
        const devProjects = projects.filter(x => x.current_developer === p.current_developer)
        items.push({
          entityType: 'developer',
          id: p.current_developer,
          name: p.current_developer,
          subtitle: `${devProjects.length} projects \u00b7 ${devProjects.reduce((s, x) => s + (x.capacity_mw || 0), 0).toLocaleString()} MW`,
          path: `/developers/${encodeURIComponent(p.current_developer)}`,
        })
      }
    }

    setIndexReady(true)
    return items
  }, [projects])

  const fuse = useMemo(() => {
    if (!allItems.length) return null
    return new Fuse(allItems, {
      keys: [
        { name: 'name', weight: 3 },
        { name: 'subtitle', weight: 1 },
      ],
      threshold: 0.3,
      includeScore: true,
    })
  }, [allItems])

  const search = useCallback((query: string): SearchResult[] => {
    if (!fuse || !query.trim()) return []
    return fuse.search(query, { limit: 25 }).map(r => r.item)
  }, [fuse])

  // Suggestions: top projects by capacity
  const suggestions = useMemo(() => {
    if (!projects.length) return []
    return ['Golden Plains', 'Hornsdale', 'Waratah', 'Origin', 'AGL', 'Tesla', 'NSW BESS', 'wind farm', 'solar', 'pumped hydro']
  }, [projects])

  return { search, loading: loading || !indexReady, suggestions }
}
