import { useRef, useState, useEffect, type ReactNode } from 'react'

interface ScrollableTableProps {
  children: ReactNode
}

export default function ScrollableTable({ children }: ScrollableTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  function checkScroll() {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }

  useEffect(() => {
    checkScroll()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', checkScroll, { passive: true })
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      ro.disconnect()
    }
  }, [])

  return (
    <div className="relative">
      {/* Left fade */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[var(--color-bg-card)] to-transparent z-10 pointer-events-none" />
      )}
      {/* Right fade + hint */}
      {canScrollRight && (
        <>
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[var(--color-bg-card)] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-2 top-2 z-20 text-[9px] text-[var(--color-text-muted)] bg-[var(--color-bg-elevated)] px-2 py-0.5 rounded-full pointer-events-none lg:hidden">
            Scroll →
          </div>
        </>
      )}
      <div ref={scrollRef} className="overflow-x-auto -webkit-overflow-scrolling-touch">
        {children}
      </div>
    </div>
  )
}
