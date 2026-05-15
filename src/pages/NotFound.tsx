import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60dvh] px-4 text-center">
      <span className="text-6xl mb-4">🔌</span>
      <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">
        Page Not Found
      </h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-6 max-w-md">
        This page doesn't exist — much like the COD estimates on some development-stage projects.
      </p>
      <Link
        to="/"
        className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  )
}
