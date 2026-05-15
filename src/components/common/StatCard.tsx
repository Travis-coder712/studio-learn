interface StatCardProps {
  label: string
  value: string | number
  sublabel?: string
  color?: string
}

export default function StatCard({ label, value, sublabel, color }: StatCardProps) {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
      <p className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
        {label}
      </p>
      <p
        className="text-2xl font-bold"
        style={{ color: color || 'var(--color-text)' }}
      >
        {value}
      </p>
      {sublabel && (
        <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{sublabel}</p>
      )}
    </div>
  )
}
