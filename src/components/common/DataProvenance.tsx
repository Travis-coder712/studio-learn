import { useEffect, useRef, useState } from 'react'
import { fetchDataSources } from '../../lib/dataService'
import type { DataSourceInfo } from '../../lib/types'
import {
  SOURCE_REGISTRY,
  freshnessFor,
  sourcesForPage,
  statusColour,
  type SourceId,
  type SourceFreshness,
} from '../../lib/dataSources'

/**
 * DataProvenance — compact inline "where is this data from" widget.
 *
 * Used at the top of any chart / analysis section to surface:
 *   - which data sources power the numbers on that page
 *   - how stale each source is (green/amber/red status dot + age)
 *   - a copyable CLI command to refresh each source
 *
 * Typical usage:
 *
 *   <DataProvenance page="performance" />
 *
 * or with an explicit list:
 *
 *   <DataProvenance sources={['openelectricity_performance', 'nemweb_bids']} />
 *
 * Click any chip to open a popover with the full source description and
 * refresh command.
 */

interface DataProvenanceProps {
  /** Look up the source list via PAGE_SOURCES. */
  page?: string
  /** Or provide the source list explicitly. */
  sources?: SourceId[]
  /** Optional text shown before the chips ("Data sources:", "Powered by:", etc.). */
  leadLabel?: string
  className?: string
}

// Runtime feed → Record<id, DataSourceInfo> for constant-time lookups
function indexRuntime(sources: DataSourceInfo[] | null | undefined): Record<string, DataSourceInfo> {
  if (!sources) return {}
  const out: Record<string, DataSourceInfo> = {}
  for (const s of sources) out[s.id] = s
  return out
}

export default function DataProvenance({
  page,
  sources,
  leadLabel = 'Data sources',
  className = '',
}: DataProvenanceProps) {
  const [runtime, setRuntime] = useState<Record<string, DataSourceInfo> | null>(null)
  const [openId, setOpenId] = useState<SourceId | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchDataSources().then((feed) => {
      if (cancelled) return
      setRuntime(indexRuntime(feed?.sources))
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Close popover on Escape
  useEffect(() => {
    if (openId === null) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenId(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [openId])

  // Resolve source list
  const resolvedIds: SourceId[] = sources ?? (page ? sourcesForPage(page) : [])
  if (resolvedIds.length === 0) return null

  const items = freshnessFor(resolvedIds, runtime)

  return (
    <div
      className={`flex items-center flex-wrap gap-1.5 text-xs ${className}`.trim()}
      role="group"
      aria-label="Data provenance"
    >
      {leadLabel && (
        <span className="text-[10px] text-[var(--color-text-muted)]/70 uppercase tracking-wider mr-1">
          {leadLabel}
        </span>
      )}
      {items.map((item) => (
        <SourceChip
          key={item.id}
          item={item}
          open={openId === item.id}
          onToggle={() => setOpenId(openId === item.id ? null : item.id)}
          onClose={() => setOpenId(null)}
        />
      ))}
    </div>
  )
}

// -------------- SourceChip --------------

function SourceChip({
  item,
  open,
  onToggle,
  onClose,
}: {
  item: SourceFreshness
  open: boolean
  onToggle: () => void
  onClose: () => void
}) {
  const colour = statusColour(item.status)
  const label = item.registry.shortLabel
  const anchor = useRef<HTMLButtonElement>(null)

  // Click-outside to close
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (!anchor.current) return
      const target = e.target as Node
      if (!anchor.current.contains(target)) onClose()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, onClose])

  return (
    <div className="relative inline-block">
      <button
        ref={anchor}
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] transition-colors ${
          open
            ? 'border-[var(--color-primary)]/60 bg-[var(--color-primary)]/10'
            : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]/60 hover:bg-white/[0.02]'
        }`}
        title={`${item.registry.label} — ${item.ageLabel}`}
      >
        <span aria-hidden className="text-[11px] leading-none">{item.registry.icon}</span>
        <span className="font-medium text-[var(--color-text)]">{label}</span>
        <span className="text-[var(--color-text-muted)]">·</span>
        <span className="tabular-nums text-[var(--color-text-muted)]">{item.ageLabel}</span>
        <span
          className="w-1.5 h-1.5 rounded-full ml-0.5 shrink-0"
          style={{ background: colour }}
          aria-label={`Status: ${item.status}`}
        />
      </button>

      {open && <SourcePopover item={item} onClose={onClose} />}
    </div>
  )
}

// -------------- Popover --------------

function SourcePopover({ item, onClose }: { item: SourceFreshness; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const fullCommand = `cd ~/aures-db && ${item.registry.refreshCommand}`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(fullCommand)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Some browsers need a user gesture inside a secure context — fall back to selecting the text
      setCopied(false)
    }
  }

  const fullDatetime =
    item.lastRun
      ? new Date(item.lastRun).toLocaleString('en-AU', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Never run'

  const statusLabel =
    item.status === 'fresh'
      ? 'Fresh'
      : item.status === 'stale'
        ? 'Stale — consider refreshing'
        : item.status === 'critical'
          ? 'Very stale — refresh recommended'
          : 'Freshness unknown'

  return (
    <div
      role="dialog"
      aria-label={`${item.registry.label} provenance`}
      className="absolute left-0 top-full mt-1.5 z-30 w-80 max-w-[92vw] rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-xl shadow-black/30 p-3"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-sm">{item.registry.icon}</span>
            <h3 className="text-sm font-semibold text-[var(--color-text)] truncate">
              {item.registry.label}
            </h3>
          </div>
          {item.registry.url && (
            <a
              href={item.registry.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-[var(--color-primary)] hover:underline truncate block"
            >
              {item.registry.url.replace(/^https?:\/\//, '').split('/')[0]} ↗
            </a>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-0.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <p className="text-[11px] text-[var(--color-text-muted)] leading-snug mb-2.5">
        {item.registry.description}
      </p>

      <div className="grid grid-cols-2 gap-2 mb-2.5 text-[10px]">
        <div className="rounded-lg bg-[var(--color-bg-primary)]/40 p-2 border border-[var(--color-border)]/60">
          <div className="text-[var(--color-text-muted)] uppercase tracking-wider text-[9px]">Last updated</div>
          <div className="text-[var(--color-text)] font-medium mt-0.5">{fullDatetime}</div>
          <div className="text-[var(--color-text-muted)] mt-0.5">{item.ageLabel}</div>
        </div>
        <div className="rounded-lg bg-[var(--color-bg-primary)]/40 p-2 border border-[var(--color-border)]/60">
          <div className="text-[var(--color-text-muted)] uppercase tracking-wider text-[9px]">Status</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: statusColour(item.status) }}
            />
            <span className="text-[var(--color-text)] font-medium">{statusLabel}</span>
          </div>
          <div className="text-[var(--color-text-muted)] mt-0.5">
            Stale after {item.registry.staleAfterDays}d · critical after {item.registry.criticallyStaleAfterDays}d
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-[var(--color-bg-primary)]/40 border border-[var(--color-border)]/60 p-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)]">Refresh command</span>
          <button
            type="button"
            onClick={handleCopy}
            className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-primary)]/20 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/30 transition-colors font-medium"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <code className="block text-[10px] text-[var(--color-text)] font-mono break-all leading-snug">
          {fullCommand}
        </code>
        <p className="text-[10px] text-[var(--color-text-muted)] mt-1.5 leading-snug">
          {item.registry.refreshNote}
        </p>
      </div>
    </div>
  )
}

// -------------- Exports for power users --------------

export { SOURCE_REGISTRY }
export type { SourceId }
