/**
 * Export a DOM element as PNG image
 */
export async function exportChartAsPNG(element: HTMLElement, filename: string) {
  try {
    // Dynamic import to avoid loading html-to-image unless needed
    const { toPng } = await import('html-to-image')
    const dataUrl = await toPng(element, {
      backgroundColor: '#0f172a', // var(--color-bg)
      pixelRatio: 2,
    })
    const link = document.createElement('a')
    link.download = `${filename}.png`
    link.href = dataUrl
    link.click()
  } catch (err) {
    console.error('Failed to export chart as PNG:', err)
  }
}

/**
 * Export data array as CSV file
 */
export function exportDataAsCSV(
  data: Record<string, unknown>[],
  filename: string,
  columns?: string[]
) {
  if (!data.length) return

  const cols = columns || Object.keys(data[0])
  const header = cols.join(',')
  const rows = data.map(row =>
    cols.map(col => {
      const val = row[col]
      if (val === null || val === undefined) return ''
      const str = String(val)
      // Escape quotes and wrap in quotes if contains comma/newline/quote
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }).join(',')
  )

  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
