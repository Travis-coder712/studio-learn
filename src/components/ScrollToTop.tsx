/**
 * ScrollToTop — fixes the React Router default of preserving scroll
 * position on route change. Mount once inside the Router; whenever
 * the pathname changes, scroll the window to (0, 0).
 *
 * Default-export a no-op component so it can be dropped in the JSX
 * tree directly: `<ScrollToTop />`.
 */
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    // 'instant' avoids the smooth-scroll behavior set on html { scroll-behavior: smooth },
    // which when navigating to a new route can otherwise produce a confusing animated jump.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])
  return null
}
