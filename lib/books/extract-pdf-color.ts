import type { PDFDocumentProxy } from 'pdfjs-dist'

function toHex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * Computes the dominant vibrant color from raw RGBA pixel data.
 * Ignores near-white, near-black, and low-saturation gray pixels so the
 * extracted color reflects the cover/page theme rather than paper or ink.
 */
function computeDominantColorFromPixels(data: Uint8ClampedArray): string | null {
  const buckets = new Map<string, { count: number; r: number; g: number; b: number; weight: number }>()

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]
    if (a < 180) continue

    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const delta = max - min
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    const saturation = max === 0 ? 0 : delta / max

    // Skip near-white paper, near-black ink, and neutral grays
    if (brightness > 242 || brightness < 24 || saturation < 0.18) continue

    // Quantize into 24-unit buckets to group similar shades
    const qr = Math.floor(r / 24) * 24
    const qg = Math.floor(g / 24) * 24
    const qb = Math.floor(b / 24) * 24
    const key = `${qr},${qg},${qb}`

    // Favor saturated colors slightly so vibrant cover tones win over muted edges
    const weight = 1 + saturation * 1.8
    const existing = buckets.get(key)
    if (existing) {
      existing.count += 1
      existing.weight += weight
      existing.r += r
      existing.g += g
      existing.b += b
    } else {
      buckets.set(key, { count: 1, weight, r, g, b })
    }
  }

  if (buckets.size === 0) return null

  let best: { count: number; r: number; g: number; b: number; weight: number } | null = null
  for (const bucket of buckets.values()) {
    if (!best || bucket.weight > best.weight) {
      best = bucket
    }
  }

  if (!best) return null
  return rgbToHex(best.r / best.count, best.g / best.count, best.b / best.count)
}

/**
 * Renders page 1 of a loaded PDF onto a small offscreen canvas and extracts
 * its dominant vibrant color (hex string like "#d70716" or "#ffe06b").
 */
export async function extractDominantColorFromPdf(
  pdfDoc: PDFDocumentProxy
): Promise<string | null> {
  if (typeof document === 'undefined' || !pdfDoc || pdfDoc.numPages < 1) {
    return null
  }

  try {
    const page = await pdfDoc.getPage(1)
    const unscaled = page.getViewport({ scale: 1.0 })
    const targetWidth = 72
    const scale = targetWidth / Math.max(1, unscaled.width)
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.floor(viewport.width))
    canvas.height = Math.max(1, Math.floor(viewport.height))

    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return null

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)

    await page.render({ canvasContext: context, viewport }).promise
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    return computeDominantColorFromPixels(imageData.data)
  } catch (err) {
    console.warn('[extractDominantColorFromPdf] Falha ao extrair cor do PDF:', err)
    return null
  }
}
