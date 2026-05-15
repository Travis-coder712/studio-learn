import { CONFIDENCE_CONFIG, type Confidence } from '../../lib/types'

interface ConfidenceDotsProps {
  confidence: Confidence
  showLabel?: boolean
}

export default function ConfidenceDots({ confidence, showLabel = false }: ConfidenceDotsProps) {
  const config = CONFIDENCE_CONFIG[confidence]

  return (
    <span className="inline-flex items-center gap-1.5" title={config.label}>
      <span style={{ color: config.color }} className="text-xs tracking-tighter font-mono">
        {config.dots}
      </span>
      {showLabel && (
        <span className="text-[10px] text-[var(--color-text-muted)]">{config.label}</span>
      )}
    </span>
  )
}
