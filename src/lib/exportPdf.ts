/**
 * PDF Export Utility
 * Captures a DOM element as a light-mode image and generates a multi-page PDF.
 * Uses html2canvas for DOM capture and jsPDF for PDF generation.
 *
 * Why html2canvas (not html-to-image): html-to-image silently produces blank
 * output when capturing elements positioned off-screen via `position: fixed;
 * left: -10000px` (it relies on a foreignObject SVG clone whose layout context
 * differs from the original). html2canvas re-renders into a real canvas and
 * works reliably on hidden / off-flow elements.
 */
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

// Light-mode CSS variable overrides for PDF readability
const LIGHT_MODE_VARS: Record<string, string> = {
  '--color-bg': '#ffffff',
  '--color-bg-card': '#f8fafc',
  '--color-bg-elevated': '#e2e8f0',
  '--color-bg-card-hover': '#f1f5f9',
  '--color-text': '#0f172a',
  '--color-text-muted': '#475569',
  '--color-border': '#cbd5e1',
  '--color-accent': '#d97706',
  '--color-primary': '#0369a1',
}

/**
 * Count near-non-white pixels per row of a captured canvas.
 * Used by the multi-page slicer to pick page-break rows that land in
 * natural gutters (low-ink rows = empty space between sections).
 * Samples every 4th column for speed; close enough for break detection.
 */
function computeInkDensity(canvas: HTMLCanvasElement): number[] {
  const ctx = canvas.getContext('2d')
  if (!ctx) return []
  const { width, height } = canvas
  // Reading the full image data once is faster than per-row reads.
  const data = ctx.getImageData(0, 0, width, height).data
  const out = new Array<number>(height)
  const stride = 4
  for (let y = 0; y < height; y++) {
    let count = 0
    const rowStart = y * width * 4
    for (let x = 0; x < width; x += stride) {
      const i = rowStart + x * 4
      // Treat anything darker than 245 in any channel as "ink".
      if (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245) count++
    }
    out[y] = count
  }
  return out
}

interface ExportOptions {
  /** Filename without .pdf extension */
  filename: string
  /** Title printed at top of first page */
  title?: string
  /** Subtitle / date line */
  subtitle?: string
  /** Scale factor for image capture (higher = better quality, slower).
   *  Default 1.5 — gives readable text at sane file size. 2x produces
   *  ~3-4x larger files for marginal visual gain on charts. */
  scale?: number
  /** Page margin in mm */
  margin?: number
  /** JPEG quality (0..1). Default 0.82. Charts compress well at 0.8-0.85;
   *  going below 0.7 starts to show artefacts on text. */
  jpegQuality?: number
}

/**
 * Export a DOM element to a downloadable PDF.
 * Temporarily applies light-mode styling for readability.
 *
 * Encodes pages as JPEG (instead of PNG) and enables jsPDF compression,
 * which typically reduces file size 4-8× for chart-heavy content with
 * no visible quality loss.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  options: ExportOptions
): Promise<void> {
  const {
    filename,
    title,
    subtitle,
    scale = 1.5,
    margin = 10,
    jpegQuality = 0.82,
  } = options

  // 1. Store original styles and apply light-mode overrides
  const originalStyles: Record<string, string> = {}
  for (const [prop, value] of Object.entries(LIGHT_MODE_VARS)) {
    originalStyles[prop] = element.style.getPropertyValue(prop)
    element.style.setProperty(prop, value)
  }

  // Also set explicit background on the element
  const originalBg = element.style.backgroundColor
  const originalColor = element.style.color
  element.style.backgroundColor = '#ffffff'
  element.style.color = '#0f172a'

  // Force all child elements with inline color styles to also adapt
  // (Recharts SVG text elements often have explicit fills)
  const svgTexts = element.querySelectorAll('svg text, svg tspan')
  const originalFills: Array<{ el: Element; fill: string }> = []
  svgTexts.forEach(el => {
    const htmlEl = el as SVGElement
    const fill = htmlEl.getAttribute('fill') || ''
    if (fill && (fill.includes('var(--color-text-muted)') || fill === 'var(--color-text-muted)')) {
      originalFills.push({ el, fill })
      htmlEl.setAttribute('fill', '#475569')
    } else if (fill && (fill.includes('var(--color-text)') || fill === 'var(--color-text)')) {
      originalFills.push({ el, fill })
      htmlEl.setAttribute('fill', '#0f172a')
    }
  })

  // Wait a tick for styles to apply
  await new Promise(r => setTimeout(r, 100))

  try {
    // 2. Capture the element as a PNG data URL
    const canvas = await html2canvas(element, {
      scale,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      // Match the captured rect to the element's natural size — html2canvas
      // walks the live DOM, so off-screen `position: fixed` elements work fine.
      width: element.offsetWidth,
      height: element.offsetHeight,
      ignoreElements: (node) => {
        if (node instanceof HTMLElement) {
          const cl = node.className
          if (typeof cl === 'string' && cl.includes('bottom-nav')) return true
        }
        return false
      },
    })
    // JPEG with compression — typically 4-8× smaller than PNG for chart content
    const dataUrl = canvas.toDataURL('image/jpeg', jpegQuality)

    // 3. Load image to get dimensions
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = reject
      img.src = dataUrl
    })

    // 4. Create PDF
    // A4 dimensions in mm: 210 x 297
    const pageWidth = 210
    const pageHeight = 297
    const contentWidth = pageWidth - margin * 2
    const contentHeight = pageHeight - margin * 2

    // Calculate image dimensions to fit page width
    const imgAspect = img.height / img.width
    const pdfImgWidth = contentWidth
    const pdfImgHeight = contentWidth * imgAspect

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    })

    // Title header on first page
    let yOffset = margin
    if (title) {
      pdf.setFontSize(16)
      pdf.setTextColor(15, 23, 42) // slate-900
      pdf.text(title, margin, yOffset + 5)
      yOffset += 8
    }
    if (subtitle) {
      pdf.setFontSize(9)
      pdf.setTextColor(71, 85, 105) // slate-600
      pdf.text(subtitle, margin, yOffset + 4)
      yOffset += 7
    }
    if (title || subtitle) {
      // Divider line
      pdf.setDrawColor(203, 213, 225) // slate-300
      pdf.line(margin, yOffset + 1, pageWidth - margin, yOffset + 1)
      yOffset += 4
    }

    // Calculate how many pages we need
    const firstPageContent = contentHeight - (yOffset - margin)
    const totalImageHeight = pdfImgHeight

    if (totalImageHeight <= firstPageContent) {
      // Fits on one page — FAST compression keeps the JPEG embed small
      pdf.addImage(dataUrl, 'JPEG', margin, yOffset, pdfImgWidth, pdfImgHeight, undefined, 'FAST')
    } else {
      // Multi-page: slice the image across pages
      // We use the source image coordinates to crop sections
      const pxPerMm = img.width / pdfImgWidth

      // Build an "ink density" array — count of non-near-white pixels per
      // image row — so we can pick page-break rows that fall in natural
      // gutters between sections, rather than slicing through them.
      const inkPerRow = computeInkDensity(canvas)
      // Look back up to ~50mm above the hard limit for a clean gutter.
      // (A4 content is ~277mm, so 50mm = roughly the bottom 18% of a page.)
      const slackPxBefore = Math.round(50 * pxPerMm)
      // Don't extend below the limit — that would overflow the page.
      const slackPxAfter = 0
      // Score each candidate by the SUM of ink in a small window around it,
      // so we prefer rows that are part of a multi-row gutter (true section
      // boundary) over isolated low-ink rows inside a busy section.
      const gutterWindowHalf = Math.max(2, Math.round(1.5 * pxPerMm))

      let remainingHeight = totalImageHeight
      let srcY = 0
      let isFirstPage = true

      while (remainingHeight > 0) {
        const availableHeight = isFirstPage ? firstPageContent : contentHeight
        let sliceHeight = Math.min(remainingHeight, availableHeight)

        // If the natural cut would split the image (more pages to come),
        // try to snap to a low-ink row inside the slack window. Score each
        // candidate by the average ink across a small window around it —
        // this favours real section gutters (multiple consecutive empty
        // rows) over isolated low-ink rows inside busy table content.
        if (sliceHeight < remainingHeight) {
          const targetEnd = srcY + Math.round(sliceHeight * pxPerMm)
          const winStart = Math.max(srcY + Math.round(20 * pxPerMm), targetEnd - slackPxBefore)
          const winEnd = Math.min(canvas.height, targetEnd + slackPxAfter)
          const windowScore = (y: number) => {
            let sum = 0, n = 0
            const lo = Math.max(0, y - gutterWindowHalf)
            const hi = Math.min(canvas.height - 1, y + gutterWindowHalf)
            for (let i = lo; i <= hi; i++) { sum += (inkPerRow[i] ?? 0); n++ }
            return n > 0 ? sum / n : Infinity
          }
          let bestY = targetEnd, bestScore = windowScore(targetEnd)
          for (let y = winStart; y < winEnd; y++) {
            const s = windowScore(y)
            if (s < bestScore) { bestScore = s; bestY = y }
          }
          sliceHeight = (bestY - srcY) / pxPerMm
        }

        const srcSliceHeight = Math.round(sliceHeight * pxPerMm)

        // Create a canvas to slice the image
        const sliceCanvas = document.createElement('canvas')
        sliceCanvas.width = img.width
        sliceCanvas.height = srcSliceHeight
        const ctx = sliceCanvas.getContext('2d')!
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height)
        ctx.drawImage(
          img,
          0, srcY, img.width, srcSliceHeight,
          0, 0, img.width, srcSliceHeight
        )

        const sliceDataUrl = sliceCanvas.toDataURL('image/jpeg', jpegQuality)
        const pageY = isFirstPage ? yOffset : margin

        pdf.addImage(sliceDataUrl, 'JPEG', margin, pageY, pdfImgWidth, sliceHeight, undefined, 'FAST')

        remainingHeight -= sliceHeight
        srcY += srcSliceHeight

        if (remainingHeight > 0) {
          pdf.addPage()
        }

        isFirstPage = false
      }
    }

    // Footer on last page
    const pageCount = pdf.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i)
      pdf.setFontSize(7)
      pdf.setTextColor(148, 163, 184) // slate-400
      pdf.text(
        `AURES Intelligence | ${filename} | Page ${i} of ${pageCount}`,
        margin,
        pageHeight - 5
      )
    }

    // 5. Download
    pdf.save(`${filename}.pdf`)

  } finally {
    // 6. Restore original styles
    for (const [prop, value] of Object.entries(originalStyles)) {
      if (value) {
        element.style.setProperty(prop, value)
      } else {
        element.style.removeProperty(prop)
      }
    }
    element.style.backgroundColor = originalBg
    element.style.color = originalColor

    // Restore SVG fills
    originalFills.forEach(({ el, fill }) => {
      ;(el as SVGElement).setAttribute('fill', fill)
    })
  }
}
