import { TECHNOLOGY_CONFIG, type Technology } from '../../lib/types'

interface TechBadgeProps {
  technology: Technology
  size?: 'sm' | 'md'
}

export default function TechBadge({ technology, size = 'sm' }: TechBadgeProps) {
  const config = TECHNOLOGY_CONFIG[technology]
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses}`}
      style={{
        backgroundColor: `${config.color}20`,
        color: config.color,
      }}
    >
      <span className="text-[0.7em]">{config.icon}</span>
      {config.label}
    </span>
  )
}
