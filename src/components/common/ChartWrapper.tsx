import { useRef, type ReactNode } from 'react'
import { exportChartAsPNG, exportDataAsCSV } from '../../lib/exportUtils'

interface ChartWrapperProps {
  title: string
  children: ReactNode
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: readonly any[]
  csvFilename?: string
  csvColumns?: string[]
}

export default function ChartWrapper({ title, children, data, csvFilename, csvColumns }: ChartWrapperProps) {
  const chartRef = useRef<HTMLDivElement>(null)

  return (
    <figure className="relative">
      {/* Export toolbar */}
      <div className="absolute top-0 right-0 z-10 flex items-center gap-1">
        <button
          onClick={() => chartRef.current && exportChartAsPNG(chartRef.current, title.replace(/\s+/g, '-').toLowerCase())}
          className="p-1.5 rounded-lg text-[var(--color-text-muted)]/50 hover:text-[var(--color-text-muted)] hover:bg-white/5 transition-colors"
          aria-label="Export chart as PNG"
          title="Export as PNG"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
        </button>
        {data && data.length > 0 && (
          <button
            onClick={() => exportDataAsCSV(data as Record<string, unknown>[], csvFilename || title.replace(/\s+/g, '-').toLowerCase(), csvColumns)}
            className="p-1.5 rounded-lg text-[var(--color-text-muted)]/50 hover:text-[var(--color-text-muted)] hover:bg-white/5 transition-colors"
            aria-label="Download data as CSV"
            title="Download CSV"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375" />
            </svg>
          </button>
        )}
      </div>
      <div ref={chartRef}>
        {children}
      </div>
      <figcaption className="sr-only">{title}</figcaption>
    </figure>
  )
}
