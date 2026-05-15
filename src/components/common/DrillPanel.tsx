import { useEffect, type ReactNode } from 'react'
import DrillBreadcrumb, { type DrillCrumb } from './DrillBreadcrumb'

/**
 * DrillPanel — slide-in detail panel for drill-down from aggregate charts.
 *
 * Usage pattern (single-level drill):
 *
 *   const [drill, setDrill] = useState<{ state: string } | null>(null)
 *   // ...
 *   <Bar onClick={(datum) => setDrill({ state: datum.name })} />
 *   <DrillPanel
 *     open={drill !== null}
 *     title={drill ? `Projects in ${drill.state}` : ''}
 *     onClose={() => setDrill(null)}
 *   >
 *     {drill && <DataTable rows={filter(drill)} ... />}
 *   </DrillPanel>
 *
 * Multi-level drill with a breadcrumb:
 *
 *   <DrillPanel
 *     open={stack.length > 0}
 *     breadcrumb={stack.map(s => ({ label: s.label, onClick: () => popTo(s) }))}
 *     onClose={() => clearStack()}
 *   >
 *     ...
 *   </DrillPanel>
 *
 * Behaviour:
 *   - Desktop (≥lg): slide-in from right, fixed 480px width, dims background
 *   - Mobile: bottom-sheet, ~85vh, slides up
 *   - Escape key closes
 *   - Click outside (on backdrop) closes
 *   - Scroll is locked on the body while open
 */

interface DrillPanelProps {
  open: boolean
  /** Title shown at the top of the panel. Ignored if `breadcrumb` is provided. */
  title?: ReactNode
  /** Optional subtitle / helper text under the title. */
  subtitle?: ReactNode
  /** If provided, overrides `title` with a clickable breadcrumb path. */
  breadcrumb?: DrillCrumb[]
  /** Called when the user dismisses the panel. */
  onClose: () => void
  /** Optional width override for desktop (default 'w-[480px]'). */
  widthClass?: string
  /** Optional extra action buttons to render in the header (eg "Export CSV"). */
  actions?: ReactNode
  children: ReactNode
}

export default function DrillPanel({
  open,
  title,
  subtitle,
  breadcrumb,
  onClose,
  widthClass = 'lg:w-[480px]',
  actions,
  children,
}: DrillPanelProps) {
  // Lock body scroll + listen for Escape while open
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel — bottom sheet on mobile, right-slide on desktop */}
      <aside
        className={`absolute inset-x-0 bottom-0 max-h-[85vh] lg:inset-y-0 lg:right-0 lg:max-h-none lg:h-full w-full ${widthClass} bg-[var(--color-bg-card)] border-t lg:border-t-0 lg:border-l border-[var(--color-border)] shadow-2xl shadow-black/40 flex flex-col animate-slide-up lg:animate-slide-in-right`}
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-3 px-4 py-3 border-b border-[var(--color-border)] shrink-0">
          <div className="min-w-0 flex-1">
            {breadcrumb ? (
              <DrillBreadcrumb crumbs={breadcrumb} />
            ) : (
              title && (
                <h2 className="text-base font-semibold text-[var(--color-text)] truncate">
                  {title}
                </h2>
              )
            )}
            {subtitle && (
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {actions}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close panel"
              className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        {/* Body — scrolls independently */}
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </aside>
    </div>
  )
}
