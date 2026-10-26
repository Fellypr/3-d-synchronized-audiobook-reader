import type { PDFDocumentProxy } from 'pdfjs-dist'

export type Word = {
  p: string
  i: number
  f: number
}

export type PageWordRange = {
  pageNumber: number // 1-indexed
  startWordIndex: number
  endWordIndex: number
}

export type WordPosition = {
  wordIndex: number
  text: string
  // Percentage coordinates relative to page viewport (0 - 100)
  leftPercent: number
  topPercent: number
  widthPercent: number
  heightPercent: number
}

type AudioToken = {
  norm: string
  wordIndex: number
  text: string
}

type PageTokenBox = {
  text: string
  norm: string
  leftPercent: number
  topPercent: number
  widthPercent: number
  heightPercent: number
}

/**
 * Normalizes text for matching by removing non-alphanumeric characters and lowercasing.
 */
function normalize(str: string): string {
  return (str || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
}

/**
 * Finds the starting audio wordIndex for a page by searching for anchor sequences
 * of consecutive tokens (4-gram, then 3-gram, then 2-gram) in the audio stream.
 */
function findPageAnchor(
  pageTokens: PageTokenBox[],
  audioTokens: AudioToken[],
  startSearchIdx: number,
  maxLookahead = 4500
): number {
  if (pageTokens.length < 2 || audioTokens.length === 0) return -1

  const minSearch = Math.max(0, startSearchIdx - 150)
  const maxSearch = Math.min(audioTokens.length, startSearchIdx + maxLookahead)
  const sampleLimit = Math.min(35, pageTokens.length)

  // 1. Try 4-gram anchor
  for (let pOffset = 0; pOffset <= sampleLimit - 4; pOffset++) {
    const t0 = pageTokens[pOffset].norm
    const t1 = pageTokens[pOffset + 1].norm
    const t2 = pageTokens[pOffset + 2].norm
    const t3 = pageTokens[pOffset + 3].norm
    if (!t0 || !t1 || !t2 || !t3) continue

    for (let i = minSearch; i < maxSearch - 3; i++) {
      if (
        audioTokens[i].norm === t0 &&
        audioTokens[i + 1].norm === t1 &&
        audioTokens[i + 2].norm === t2 &&
        audioTokens[i + 3].norm === t3
      ) {
        return audioTokens[Math.max(0, i - pOffset)].wordIndex
      }
    }
  }

  // 2. Try 3-gram anchor
  for (let pOffset = 0; pOffset <= sampleLimit - 3; pOffset++) {
    const t0 = pageTokens[pOffset].norm
    const t1 = pageTokens[pOffset + 1].norm
    const t2 = pageTokens[pOffset + 2].norm
    if (!t0 || !t1 || !t2) continue

    for (let i = minSearch; i < maxSearch - 2; i++) {
      if (
        audioTokens[i].norm === t0 &&
        audioTokens[i + 1].norm === t1 &&
        audioTokens[i + 2].norm === t2
      ) {
        return audioTokens[Math.max(0, i - pOffset)].wordIndex
      }
    }
  }

  // 3. Try 2-gram anchor with distinctive words (length >= 4)
  for (let pOffset = 0; pOffset <= sampleLimit - 2; pOffset++) {
    const t0 = pageTokens[pOffset].norm
    const t1 = pageTokens[pOffset + 1].norm
    if (t0.length < 4 || t1.length < 4) continue

    for (let i = minSearch; i < maxSearch - 1; i++) {
      if (audioTokens[i].norm === t0 && audioTokens[i + 1].norm === t1) {
        return audioTokens[Math.max(0, i - pOffset)].wordIndex
      }
    }
  }

  return -1
}

/**
 * Scans each page of the PDF and maps the audio words to their corresponding PDF pages and positions.
 */
export async function mapPdfDocumentToWords(
  pdfDoc: PDFDocumentProxy,
  words: Word[]
): Promise<{
  pageRanges: PageWordRange[]
  pageWordPositions: Map<number, WordPosition[]>
}> {
  const numPages = pdfDoc.numPages
  const pageRanges: PageWordRange[] = []
  const pageWordPositions = new Map<number, WordPosition[]>()

  if (words.length === 0 || numPages === 0) {
    return { pageRanges, pageWordPositions }
  }

  // Pre-tokenize audio words. Entries in `words` may contain multiple space-separated words.
  const audioTokens: AudioToken[] = []
  for (let i = 0; i < words.length; i++) {
    const parts = words[i].p.split(/\s+/).filter(Boolean)
    for (const part of parts) {
      const norm = normalize(part)
      if (norm) {
        audioTokens.push({ norm, wordIndex: i, text: part })
      }
    }
  }

  // Step 1: Extract all text items and bounding boxes from every page
  const pageData: Array<{
    pageNumber: number
    tokens: PageTokenBox[]
    anchorIndex: number
  }> = []

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1.0 })
    const textContent = await page.getTextContent()

    const tokens: PageTokenBox[] = []

    for (const rawItem of textContent.items) {
      if (!('str' in rawItem) || !rawItem.str || !rawItem.str.trim()) continue

      const item = rawItem as {
        str: string
        transform: number[]
        width: number
        height: number
      }

      const tx = item.transform[4]
      const ty = item.transform[5]
      const fontHeight = Math.hypot(item.transform[2], item.transform[3]) || item.height || 12
      const [left, top] = viewport.convertToViewportPoint(tx, ty + fontHeight)

      const parts = item.str.split(/\s+/).filter(Boolean)
      const partWidth = item.width / Math.max(1, parts.length)

      for (let wIdx = 0; wIdx < parts.length; wIdx++) {
        const text = parts[wIdx]
        const norm = normalize(text)
        if (!norm) continue

        const leftPercent = Math.max(0, Math.min(100, ((left + wIdx * partWidth) / viewport.width) * 100))
        const topPercent = Math.max(0, Math.min(100, (top / viewport.height) * 100))
        const widthPercent = Math.max(0.5, Math.min(100, (partWidth / viewport.width) * 100))
        const heightPercent = Math.max(0.5, Math.min(100, (fontHeight / viewport.height) * 100))

        tokens.push({
          text,
          norm,
          leftPercent,
          topPercent,
          widthPercent,
          heightPercent,
        })
      }
    }

    pageData.push({
      pageNumber: pageNum,
      tokens,
      anchorIndex: -1,
    })
  }

  // Step 2: Discover anchor wordIndex for each page in sequential order
  let lastAnchor = 0
  for (let i = 0; i < pageData.length; i++) {
    const anchor = findPageAnchor(pageData[i].tokens, audioTokens, lastAnchor)
    if (anchor >= 0) {
      pageData[i].anchorIndex = anchor
      lastAnchor = anchor
    }
  }

  // Step 3: Interpolate any missing page anchors
  for (let i = 0; i < pageData.length; i++) {
    if (pageData[i].anchorIndex < 0) {
      let prevKnown = 0
      for (let j = i - 1; j >= 0; j--) {
        if (pageData[j].anchorIndex >= 0) {
          prevKnown = pageData[j].anchorIndex
          break
        }
      }
      pageData[i].anchorIndex = prevKnown
    }
  }

  // Step 4: Establish definite page ranges and match individual word positions on each page
  for (let i = 0; i < pageData.length; i++) {
    const pageNum = pageData[i].pageNumber
    const startWordIndex = pageData[i].anchorIndex
    let endWordIndex = words.length - 1

    // End is right before the next page's distinct anchor
    for (let j = i + 1; j < pageData.length; j++) {
      if (pageData[j].anchorIndex > startWordIndex) {
        endWordIndex = pageData[j].anchorIndex - 1
        break
      }
    }

    pageRanges.push({
      pageNumber: pageNum,
      startWordIndex,
      endWordIndex: Math.max(startWordIndex, endWordIndex),
    })

    // Now map audio words in [startWordIndex, endWordIndex] to this page's token boxes
    const positions: WordPosition[] = []
    const tokens = pageData[i].tokens
    let tokenCursor = 0

    for (let wIdx = startWordIndex; wIdx <= endWordIndex && wIdx < words.length; wIdx++) {
      const audioWord = words[wIdx]
      const normAudioWord = normalize(audioWord.p)
      if (!normAudioWord) continue

      let matchedBox: PageTokenBox | null = null

      // Search in a local window of page tokens
      const searchEnd = Math.min(tokens.length, tokenCursor + 12)
      for (let t = Math.max(0, tokenCursor - 2); t < searchEnd; t++) {
        const token = tokens[t]
        if (
          token.norm === normAudioWord ||
          token.norm.includes(normAudioWord) ||
          normAudioWord.includes(token.norm)
        ) {
          matchedBox = token
          tokenCursor = t + 1
          break
        }
      }

      if (matchedBox) {
        positions.push({
          wordIndex: wIdx,
          text: audioWord.p,
          leftPercent: matchedBox.leftPercent,
          topPercent: matchedBox.topPercent,
          widthPercent: matchedBox.widthPercent,
          heightPercent: matchedBox.heightPercent,
        })
      } else if (positions.length > 0) {
        // Fallback: position smoothly next to previous matched word on page
        const lastPos = positions[positions.length - 1]
        positions.push({
          wordIndex: wIdx,
          text: audioWord.p,
          leftPercent: Math.min(95, lastPos.leftPercent + lastPos.widthPercent + 0.3),
          topPercent: lastPos.topPercent,
          widthPercent: 2.5,
          heightPercent: lastPos.heightPercent,
        })
      }
    }

    pageWordPositions.set(pageNum, positions)
  }

  return { pageRanges, pageWordPositions }
}
