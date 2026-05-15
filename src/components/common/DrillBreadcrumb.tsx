import type { ReactNode } from 'react'

export interface DrillCrumb {
  label: ReactNode
  /** If provided, the crumb is rendered as a clickable button. */
  onClick?: () => void
}

interface DrillBreadcrumbProps {
  crumbs: DrillCrumb[]
  /** Separator between crumbs. Default: '›'. */
  separator?: ReactNode
  className?: string
}

/**
 * DrillBreadcrumb — clickable path for multi-level drill in a DrillPanel.
 *
 *   <DrillBreadcrumb crumbs={[
 *     { label: 'All', onClick: reset },
 *     { label: 'NSW', onClick: popToLevel1 },
 *     { label: '2025' },   // current level — no onClick
 *   ]} />
 */
export default function DrillBreadcrumb({
  crumbs,
  separator = '›',
  className = '',
}: DrillBreadcrumbProps) {
  return (
    <nav aria-label="Drill path" className={`flex items-center gap-1.5 text-sm flex-wrap ${className}`.trim()}>
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1
        const node = crumb.onClick && !isLast ? (
          <button
            type="button"
            onClick={crumb.onClick}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:underline transition-colors"
          >
            {crumb.label}
          </button>
        ) : (
          <span className={isLast ? 'text-[var(--color-text)] font-semibold' : 'text-[var(--color-text-muted)]'}>
            {crumb.label}
          </span>
        )

        return (
          <span key={i} className="flex items-center gap-1.5">
            {node}
            {!isLast && <span className="text-[var(--color-text-muted)]/50" aria-hidden>{separator}</span>}
          </span>
        )
      })}
    </nav>
  )
}
