import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { BookIndexItem, BookOutlineResult } from '@/types/book-index'

type RawPdfOutlineNode = {
  title: string
  dest: string | unknown[] | null
  items?: RawPdfOutlineNode[]
}

/**
 * Resolves a PDF destination into a 1-based page number.
 */
async function resolveDestinationPageNumber(
  pdfDoc: PDFDocumentProxy,
  dest: string | unknown[] | null
): Promise<number | null> {
  if (!dest) return null

  try {
    let explicitDest: unknown[] | null = null

    if (typeof dest === 'string') {
      explicitDest = (await pdfDoc.getDestination(dest)) as unknown[] | null
    } else if (Array.isArray(dest)) {
      explicitDest = dest
    }

    if (Array.isArray(explicitDest) && explicitDest.length > 0) {
      const pageRef = explicitDest[0]
      if (typeof pageRef === 'number') {
        return pageRef + 1
      }
      if (typeof pageRef === 'object' && pageRef !== null && 'num' in pageRef && 'gen' in pageRef) {
        const pageIndex = await pdfDoc.getPageIndex(
          pageRef as Parameters<PDFDocumentProxy['getPageIndex']>[0]
        )
        return pageIndex + 1
      }
    }
  } catch (error) {
    console.warn('[outline] Erro ao resolver destino de outline:', error)
  }

  return null
}

/**
 * Recursively parses PDF outline nodes into typed BookIndexItems.
 */
async function parsePdfOutline(
  pdfDoc: PDFDocumentProxy,
  rawItems: RawPdfOutlineNode[],
  prefix = ''
): Promise<BookIndexItem[]> {
  const parsedList: BookIndexItem[] = []

  for (let idx = 0; idx < rawItems.length; idx++) {
    const rawNode = rawItems[idx]
    const id = `${prefix}${idx + 1}`
    const pageNumber = (await resolveDestinationPageNumber(pdfDoc, rawNode.dest)) ?? 1

    let childItems: BookIndexItem[] | undefined
    if (rawNode.items && rawNode.items.length > 0) {
      childItems = await parsePdfOutline(pdfDoc, rawNode.items, `${id}-`)
    }

    parsedList.push({
      id,
      title: rawNode.title?.trim() || `Capítulo ${idx + 1}`,
      pageNumber,
      items: childItems && childItems.length > 0 ? childItems : undefined,
    })
  }

  return parsedList
}

/**
 * Intelligent fallback generator when PDF does not provide an internal TOC/outline.
 * Partitions pages into logical chapters and subsection groupings.
 */
export function generateFallbackOutline(totalPages: number): BookIndexItem[] {
  if (totalPages <= 0) return []

  // If very short document (1 to 4 pages)
  if (totalPages <= 4) {
    return Array.from({ length: totalPages }, (_, i) => ({
      id: `p-${i + 1}`,
      title: `Página ${i + 1}`,
      pageNumber: i + 1,
    }))
  }

  // Calculate dynamic chunk size targeting 5 to 10 chapters
  const targetChapters = Math.min(10, Math.max(4, Math.round(totalPages / 15)))
  const pagesPerChapter = Math.max(4, Math.ceil(totalPages / targetChapters))

  const items: BookIndexItem[] = []
  let chapterIndex = 1

  for (let startPage = 1; startPage <= totalPages; startPage += pagesPerChapter) {
    const endPage = Math.min(totalPages, startPage + pagesPerChapter - 1)
    const chapterId = `ch-${chapterIndex}`

    // Create sub-sections if chapter is large enough (>= 8 pages)
    const subItems: BookIndexItem[] = []
    if (endPage - startPage >= 7) {
      const midPage = startPage + Math.floor((endPage - startPage) / 2)
      subItems.push({
        id: `${chapterId}-part1`,
        title: `Parte 1 (Págs. ${startPage}–${midPage - 1})`,
        pageNumber: startPage,
      })
      subItems.push({
        id: `${chapterId}-part2`,
        title: `Parte 2 (Págs. ${midPage}–${endPage})`,
        pageNumber: midPage,
      })
    }

    items.push({
      id: chapterId,
      title: `Capítulo ${String(chapterIndex).padStart(2, '0')}`,
      pageNumber: startPage,
      items: subItems.length > 0 ? subItems : undefined,
    })

    chapterIndex++
  }

  return items
}

/**
 * Extracts outline from a PDFDocumentProxy, falling back to smart partition if none exists.
 */
export async function extractBookOutline(
  pdfDoc: PDFDocumentProxy | null,
  totalPages: number
): Promise<BookOutlineResult> {
  if (!pdfDoc) {
    return {
      items: generateFallbackOutline(totalPages),
      hasOutline: false,
    }
  }

  try {
    const rawOutline = (await pdfDoc.getOutline()) as RawPdfOutlineNode[] | null
    if (rawOutline && Array.isArray(rawOutline) && rawOutline.length > 0) {
      const outlineItems = await parsePdfOutline(pdfDoc, rawOutline)
      if (outlineItems.length > 0) {
        return {
          items: outlineItems,
          hasOutline: true,
        }
      }
    }
  } catch (error) {
    console.warn('[outline] Erro ao extrair outline nativo do PDF:', error)
  }

  return {
    items: generateFallbackOutline(totalPages || pdfDoc.numPages),
    hasOutline: false,
  }
}
