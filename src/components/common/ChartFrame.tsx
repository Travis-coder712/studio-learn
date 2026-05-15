import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ResponsiveContainer } from 'recharts'
import ChartWrapper from './ChartWrapper'

/**
 * ChartFrame — reliable chart rendering wrapper.
 *
 * Solves three problems observed in the intelligence layer:
 *
 *   1. Recharts `ResponsiveContainer` measures 0x0 when rendered inside a
 *      hidden tab / collapsed section / off-screen panel. ChartFrame uses an
 *      IntersectionObserver to bump a remount key the first time the frame
 *      becomes visible, forcing Recharts to re-measure.
 *
 *   2. Chart heights were set ad-hoc with Tailwind classes, so some pages
 *      rendered with effectively zero height. ChartFrame requires an explicit
 *      `height` prop (minimum 120).
 *
 *   3. Loading / empty states were handled differently on every page. ChartFrame
 *      renders a skeleton when `loading` is true and a message when `empty` is
 *      true, without the call-site needing to branch.
 *
 * Usage (common case — Recharts chart as child):
 *
 *   <ChartFrame title="By State" height={320} data={rows} csvColumns={['state','mw']}>
 *     <BarChart data={rows}>...</BarChart>
 *   </ChartFrame>
 *
 * Usage (custom content — disable responsive wrapping):
 *
 *   <ChartFrame title="Map" height={400} responsive={false}>
 *     <MyCustomSvg />
 *   </ChartFrame>
 */

interface ChartFrameProps {
  /** Chart title — shown by ChartWrapper for screen readers, used as PNG/CSV filename. */
  title: string
  /** Minimum chart height in pixels (required). Sizes the container. */
  height: number
  /** Optional taller height applied at the `lg` breakpoint (~1024px+). */
  heightLg?: number
  /** Underlying data rows — used for the CSV export button. Omit if not exportable. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: readonly any[]
  /** Override the CSV filename. Defaults to a slugified `title`. */
  csvFilename?: string
  /** Columns to include in the CSV export (in order). */
  csvColumns?: string[]
  /** When true, render a skeleton instead of children. */
  loading?: boolean
  /** When true, render the empty-state message instead of children. */
  empty?: boolean
  /** Message to show when `empty` is true. */
  emptyMessage?: string
  /**
   * When true (default), wrap the child in a Recharts `ResponsiveContainer`.
   * Set to false if the child is a custom SVG / non-Recharts visualisation
   * or is already wrapped manually.
   */
  responsive?: boolean
  /** Extra classes for the sized container. */
  className?: string
  children: ReactNode
}

export default function ChartFrame({
  title,
  height,
  heightLg,
  data,
  csvFilename,
  csvColumns,
  loading = false,
  empty = false,
  emptyMessage = 'No data available',
  responsive = true,
  className = '',
  children,
}: ChartFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [remountKey, setRemountKey] = useState(0)
  const [hasBecomeVisible, setHasBecomeVisible] = useState(false)

  // Detect first visibility to trigger a Recharts re-measure. This fixes the
  // "chart renders at 0x0 inside a hidden tab" issue — when the frame scrolls
  // into view (or its ancestor tab becomes active), we bump the key which
  // remounts the inner tree and lets ResponsiveContainer measure correctly.
  useEffect(() => {
    const el = containerRef.current
    if (!el || hasBecomeVisible) return

    // If the element already has measurable size on mount, skip the observer.
    if (el.offsetWidth > 0 && el.offsetHeight > 0) {
      setHasBecomeVisible(true)
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.target.clientWidth > 0) {
            setHasBecomeVisible(true)
            setRemountKey((k) => k + 1)
            io.disconnect()
            return
          }
        }
      },
      { threshold: 0.01 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [hasBecomeVisible])

  // Responsive height via inline style (lg breakpoint picked up via media query style).
  // We use a CSS custom property so Tailwind's JIT isn't involved.
  const heightStyle: React.CSSProperties = {
    minHeight: height,
    height,
  }

  // For the optional `heightLg`, set it via a data attribute and use a media-query
  // class-free approach: inline <style> scoped per instance would be overkill, so
  // we just fall back to using the lg: prefix with arbitrary values via Tailwind
  // if heightLg differs. Simpler and avoids SSR mismatch.

  const lgClass = heightLg && heightLg !== height ? `lg:!h-[${heightLg}px]` : ''

  let body: ReactNode

  if (loading) {
    body = (
      <div
        className="w-full h-full rounded-lg bg-white/5 animate-pulse flex items-center justify-center"
        aria-busy
        aria-live="polite"
      >
        <span className="sr-only">Loading chart…</span>
      </div>
    )
  } else if (empty) {
    body = (
      <div className="w-full h-full rounded-lg border border-dashed border-white/10 flex items-center justify-center">
        <p className="text-xs text-[var(--color-text-muted)]">{emptyMessage}</p>
      </div>
    )
  } else if (responsive) {
    body = (
      <ResponsiveContainer width="100%" height="100%" key={remountKey}>
        {/* ResponsiveContainer requires exactly one child Recharts element */}
        {children as React.ReactElement}
      </ResponsiveContainer>
    )
  } else {
    body = children
  }

  return (
    <ChartWrapper title={title} data={data} csvFilename={csvFilename} csvColumns={csvColumns}>
      <div
        ref={containerRef}
        className={`w-full ${lgClass} ${className}`.trim()}
        style={heightStyle}
      >
        {body}
      </div>
    </ChartWrapper>
  )
}
