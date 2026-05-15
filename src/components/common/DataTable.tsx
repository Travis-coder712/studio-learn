import { useMemo, useState, type ReactNode, type CSSProperties } from 'react'
import ScrollableTable from './ScrollableTable'
import { exportDataAsCSV } from '../../lib/exportUtils'

/**
 * DataTable — shared sortable table with row numbers, totals, and CSV export.
 *
 * Goals:
 *   1. Every column sortable (click header to toggle asc/desc/none)
 *   2. Row numbers on the LHS — update when rows are filtered/sorted
 *   3. Optional totals row at the bottom (sum / avg / count / custom)
 *   4. Sticky header
 *   5. CSV export (reuses existing exportDataAsCSV helper)
 *   6. Matches the dark theme already used across the app
 *   7. Wrapped in ScrollableTable by default for horizontal overflow
 *
 * Basic usage:
 *
 *   <DataTable
 *     rows={projects}
 *     columns={[
 *       { key: 'name', label: 'Project', sortable: true,
 *         render: (v, row) => <Link to={`/projects/${row.id}`}>{v}</Link> },
 *       { key: 'state', label: 'State' },
 *       { key: 'capacity_mw', label: 'MW', align: 'right',
 *         format: 'number0', aggregator: 'sum' },
 *       { key: 'capacity_factor_pct', label: 'CF', align: 'right',
 *         format: 'percent1', aggregator: 'avg' },
 *     ]}
 *     showRowNumbers
 *     showTotals
 *     defaultSort={{ key: 'capacity_factor_pct', dir: 'desc' }}
 *   />
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RowLike = Record<string, any>

export type CellFormat =
  | 'number0' // 1,234
  | 'number1' // 1,234.5
  | 'number2' // 1,234.56
  | 'percent0' // 42%
  | 'percent1' // 42.5%
  | 'currency0' // $1,234
  | 'currency1m' // $1.2M
  | 'date' // 2026-04-17
  | 'integer' // 1234

export type Aggregator<T> =
  | 'sum'
  | 'avg'
  | 'count'
  | 'median'
  | ((rows: T[]) => ReactNode)

export interface Column<T extends RowLike> {
  /** Field key or a synthetic id for computed columns. */
  key: string
  /** Header label. */
  label: ReactNode
  /** Optional accessor — default is `row[key]`. Use for computed values. */
  accessor?: (row: T) => unknown
  /** Optional custom render for the cell. Receives value + whole row. */
  render?: (value: unknown, row: T, rowIndex: number) => ReactNode
  /** Built-in formatter. Ignored if `render` is supplied. */
  format?: CellFormat
  /** Text alignment — defaults to left; numbers default to right. */
  align?: 'left' | 'right' | 'center'
  /** Default true. Set false to disable sort on this column. */
  sortable?: boolean
  /** Aggregator for the optional totals row. */
  aggregator?: Aggregator<T>
  /** Optional explicit column width (CSS, eg '120px', '20%'). */
  width?: string
  /** Extra classes applied to each body cell in this column. */
  cellClassName?: string
  /** Hide on small screens (mobile). Uses `hidden lg:table-cell`. */
  hideOnMobile?: boolean
}

export interface DataTableProps<T extends RowLike> {
  rows: T[]
  columns: Column<T>[]
  /** Default true. */
  showRowNumbers?: boolean
  /** Default false. When true, renders a footer row of aggregated values. */
  showTotals?: boolean
  /** Optional label for the totals row first cell. Default: 'Total'. */
  totalsLabel?: ReactNode
  /** Initial sort. */
  defaultSort?: { key: string; dir: 'asc' | 'desc' }
  /** Click handler for a whole row (makes the row hoverable + pointer). */
  onRowClick?: (row: T, index: number) => void
  /** CSV filename (slug). If provided with `csvColumns`, renders an export button. */
  csvFilename?: string
  /** Optional explicit list of CSV columns (in order). Defaults to all columns. */
  csvColumns?: string[]
  /** Message to show when rows is empty. */
  emptyMessage?: string
  /** Default true. */
  stickyHeader?: boolean
  /** Extra classes for the root container. */
  className?: string
  /** Optional row-level className function (eg to highlight a row). */
  rowClassName?: (row: T, index: number) => string | undefined
}

// ---------- formatters ----------

function formatValue(format: CellFormat | undefined, value: unknown): ReactNode {
  if (value === null || value === undefined || value === '') return '—'
  if (!format) return value as ReactNode

  const n = typeof value === 'number' ? value : Number(value)
  const valid = Number.isFinite(n)

  switch (format) {
    case 'integer':
      return valid ? Math.round(n).toLocaleString() : (value as ReactNode)
    case 'number0':
      return valid ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : (value as ReactNode)
    case 'number1':
      return valid ? n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : (value as ReactNode)
    case 'number2':
      return valid ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (value as ReactNode)
    case 'percent0':
      return valid ? `${Math.round(n)}%` : (value as ReactNode)
    case 'percent1':
      return valid ? `${n.toFixed(1)}%` : (value as ReactNode)
    case 'currency0':
      return valid ? `$${Math.round(n).toLocaleString()}` : (value as ReactNode)
    case 'currency1m':
      return valid ? `$${(n / 1_000_000).toFixed(1)}M` : (value as ReactNode)
    case 'date':
      return value as ReactNode // assume pre-formatted; extend later if needed
    default:
      return value as ReactNode
  }
}

// ---------- aggregators ----------

function aggregate<T extends RowLike>(
  agg: Aggregator<T> | undefined,
  rows: T[],
  col: Column<T>,
): ReactNode {
  if (!agg) return null

  if (typeof agg === 'function') return agg(rows)

  const values: number[] = rows
    .map((r) => (col.accessor ? col.accessor(r) : r[col.key]))
    .map((v) => (typeof v === 'number' ? v : Number(v)))
    .filter((v) => Number.isFinite(v))

  switch (agg) {
    case 'count':
      return values.length.toLocaleString()
    case 'sum': {
      const s = values.reduce((a, b) => a + b, 0)
      return formatValue(col.format, s)
    }
    case 'avg': {
      if (values.length === 0) return '—'
      const avg = values.reduce((a, b) => a + b, 0) / values.length
      return formatValue(col.format, avg)
    }
    case 'median': {
      if (values.length === 0) return '—'
      const sorted = [...values].sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      const med = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
      return formatValue(col.format, med)
    }
    default:
      return null
  }
}

// ---------- component ----------

export default function DataTable<T extends RowLike>({
  rows,
  columns,
  showRowNumbers = true,
  showTotals = false,
  totalsLabel = 'Total',
  defaultSort,
  onRowClick,
  csvFilename,
  csvColumns,
  emptyMessage = 'No rows to display',
  stickyHeader = true,
  className = '',
  rowClassName,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(defaultSort ?? null)

  const sortedRows = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col) return rows
    const accessor = col.accessor ?? ((r: T) => r[col.key])

    const copy = [...rows]
    copy.sort((a, b) => {
      const av = accessor(a)
      const bv = accessor(b)

      // Nulls always sort to the end regardless of direction
      const aNull = av === null || av === undefined || av === ''
      const bNull = bv === null || bv === undefined || bv === ''
      if (aNull && bNull) return 0
      if (aNull) return 1
      if (bNull) return -1

      let cmp = 0
      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv
      } else {
        cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' })
      }
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [rows, columns, sort])

  function toggleSort(col: Column<T>) {
    if (col.sortable === false) return
    setSort((prev) => {
      if (!prev || prev.key !== col.key) return { key: col.key, dir: 'desc' }
      if (prev.dir === 'desc') return { key: col.key, dir: 'asc' }
      return null // third click clears sort
    })
  }

  function sortIndicator(col: Column<T>) {
    if (col.sortable === false) return null
    if (!sort || sort.key !== col.key) {
      return <span className="ml-1 text-[var(--color-text-muted)]/40">↕</span>
    }
    return <span className="ml-1 text-[var(--color-primary)]">{sort.dir === 'asc' ? '▲' : '▼'}</span>
  }

  function handleExportCSV() {
    if (!csvFilename) return
    const cols = csvColumns ?? columns.map((c) => c.key)
    const exportRows = sortedRows.map((r) => {
      const out: Record<string, unknown> = {}
      for (const col of columns) {
        if (!cols.includes(col.key)) continue
        out[col.key] = col.accessor ? col.accessor(r) : r[col.key]
      }
      return out
    })
    exportDataAsCSV(exportRows, csvFilename, cols)
  }

  const hasData = sortedRows.length > 0

  return (
    <div className={`relative ${className}`.trim()}>
      {csvFilename && hasData && (
        <div className="flex justify-end mb-1">
          <button
            type="button"
            onClick={handleExportCSV}
            className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] px-2 py-1 rounded hover:bg-white/5 transition-colors"
            aria-label="Download table as CSV"
            title="Download CSV"
          >
            ⬇ CSV
          </button>
        </div>
      )}

      <ScrollableTable>
        <table className="w-full text-sm border-collapse">
          <thead
            className={stickyHeader ? 'sticky top-0 z-10 bg-[var(--color-bg-card)]' : undefined}
          >
            <tr className="border-b border-[var(--color-border)]">
              {showRowNumbers && (
                <th
                  className="text-right py-2.5 px-3 text-[var(--color-text-muted)] font-medium text-xs uppercase tracking-wide"
                  style={{ width: '3rem' }}
                >
                  #
                </th>
              )}
              {columns.map((col) => {
                const align = col.align ?? inferAlign(col)
                const cls = [
                  'py-2.5 px-3 text-[var(--color-text-muted)] font-medium text-xs uppercase tracking-wide',
                  align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
                  col.sortable === false ? '' : 'cursor-pointer select-none hover:text-[var(--color-text)]',
                  col.hideOnMobile ? 'hidden lg:table-cell' : '',
                ]
                  .filter(Boolean)
                  .join(' ')
                const styles: CSSProperties = col.width ? { width: col.width } : {}
                return (
                  <th
                    key={col.key}
                    className={cls}
                    style={styles}
                    onClick={() => toggleSort(col)}
                    aria-sort={
                      sort?.key === col.key
                        ? sort.dir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                  >
                    <span className="inline-flex items-center">
                      {col.label}
                      {sortIndicator(col)}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {!hasData ? (
              <tr>
                <td
                  colSpan={columns.length + (showRowNumbers ? 1 : 0)}
                  className="py-8 text-center text-[var(--color-text-muted)] text-sm"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedRows.map((row, i) => {
                const extra = rowClassName ? rowClassName(row, i) : ''
                const interactive = onRowClick ? 'cursor-pointer' : ''
                return (
                  <tr
                    key={getRowKey(row, i)}
                    className={`border-b border-[var(--color-border)]/30 hover:bg-[var(--color-bg-primary)]/50 transition-colors ${interactive} ${extra ?? ''}`.trim()}
                    onClick={onRowClick ? () => onRowClick(row, i) : undefined}
                  >
                    {showRowNumbers && (
                      <td className="py-2.5 px-3 text-right text-[var(--color-text-muted)] tabular-nums text-xs">
                        {i + 1}
                      </td>
                    )}
                    {columns.map((col) => {
                      const align = col.align ?? inferAlign(col)
                      const value = col.accessor ? col.accessor(row) : row[col.key]
                      const rendered = col.render
                        ? col.render(value, row, i)
                        : formatValue(col.format, value)
                      const cls = [
                        'py-2.5 px-3',
                        align === 'right' ? 'text-right tabular-nums' : align === 'center' ? 'text-center' : '',
                        col.hideOnMobile ? 'hidden lg:table-cell' : '',
                        col.cellClassName ?? '',
                      ]
                        .filter(Boolean)
                        .join(' ')
                      return (
                        <td key={col.key} className={cls}>
                          {rendered}
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
          {showTotals && hasData && (
            <tfoot>
              <tr className="border-t-2 border-[var(--color-border)] bg-[var(--color-bg-card)]/60">
                {showRowNumbers && (
                  <td className="py-2.5 px-3 text-right text-[var(--color-text-muted)] text-xs font-medium tabular-nums">
                    {sortedRows.length}
                  </td>
                )}
                {columns.map((col, idx) => {
                  const align = col.align ?? inferAlign(col)
                  const cls = [
                    'py-2.5 px-3 font-medium',
                    align === 'right' ? 'text-right tabular-nums' : align === 'center' ? 'text-center' : '',
                    col.hideOnMobile ? 'hidden lg:table-cell' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')

                  // First column without an aggregator shows the totals label.
                  const isFirstVisible = idx === 0
                  const aggNode = aggregate(col.aggregator, sortedRows, col)
                  const content = aggNode ?? (isFirstVisible ? totalsLabel : null)

                  return (
                    <td key={col.key} className={cls}>
                      {content}
                    </td>
                  )
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </ScrollableTable>
    </div>
  )
}

// Default to right-align when the column has a numeric format or aggregator
function inferAlign<T extends RowLike>(col: Column<T>): 'left' | 'right' | 'center' {
  if (
    col.format === 'number0' ||
    col.format === 'number1' ||
    col.format === 'number2' ||
    col.format === 'integer' ||
    col.format === 'percent0' ||
    col.format === 'percent1' ||
    col.format === 'currency0' ||
    col.format === 'currency1m' ||
    col.aggregator
  ) {
    return 'right'
  }
  return 'left'
}

function getRowKey(row: RowLike, fallback: number): string | number {
  if (row && typeof row === 'object') {
    if (typeof row.id === 'string' || typeof row.id === 'number') return row.id
    if (typeof row.project_id === 'string' || typeof row.project_id === 'number') return row.project_id
    if (typeof row.slug === 'string') return row.slug
  }
  return fallback
}
