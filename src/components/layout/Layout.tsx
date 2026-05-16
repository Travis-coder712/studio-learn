/**
 * Studio Learn layout shell.
 *
 * Minimal header/footer wrapping the routed content. Header gives a
 * back-link to Studio plus an inline Home / Learn nav. Footer flags
 * the AURES origin so anyone reading knows the canonical source.
 */
import { Outlet, NavLink, Link } from 'react-router-dom'

const NAV_ITEMS: { path: string; label: string }[] = [
  { path: '/',      label: 'Home' },
  { path: '/learn', label: 'Learn' },
]

// Injected by Vite at build time (see vite.config.ts `define`)
declare const __APP_VERSION__: string

export default function Layout() {

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/85 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Link to="/" className="flex items-baseline gap-2">
              <span className="text-[var(--color-primary)] font-bold tracking-tight text-lg">✦ Studio Learn</span>
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                Renewable-energy curricula
              </span>
            </Link>
            <nav className="flex items-center gap-1 ml-2">
              {NAV_ITEMS.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `text-sm px-3 py-1.5 rounded-md transition-colors ${
                      isActive
                        ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-semibold'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <a
            href="https://travis-coder712.github.io/studio/"
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] whitespace-nowrap"
          >
            ← Back to Studio
          </a>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg-card)]/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-xs text-[var(--color-text-muted)] leading-relaxed">
          <p>
            <span className="font-semibold text-[var(--color-text)]">Studio Learn</span> ·
            Australian renewable-energy curricula. Part of{' '}
            <a
              href="https://travis-coder712.github.io/studio/"
              className="text-[var(--color-primary)] hover:underline"
            >
              Studio
            </a>.
          </p>
          <p className="mt-2 text-[10px] font-mono text-[var(--color-text-muted)]/70">
            v{__APP_VERSION__}
          </p>
        </div>
      </footer>
    </div>
  )
}
