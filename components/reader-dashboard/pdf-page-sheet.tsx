'use client'

import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { WordPosition } from '@/lib/books/pdf-sync'

type PdfPageSheetProps = {
  pdfDoc: PDFDocumentProxy
  pageNumber: number
  activeWordIndex: number
  wordPositions?: WordPosition[]
  onWordClick: (wordIndex: number) => void
  theme: 'sepia' | 'light' | 'night'
  highlight: string
  side: 'left' | 'right'
}

export function PdfPageSheet({
  pdfDoc,
  pageNumber,
  activeWordIndex,
  wordPositions = [],
  onWordClick,
  theme,
  highlight,
  side,
}: PdfPageSheetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loading, setLoading] = useState(true)
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number } | null>(null)
  const [resizeCount, setResizeCount] = useState(0)

  const isOutOfRange = pageNumber < 1 || pageNumber > pdfDoc.numPages

  // Re-render when container dimensions change (e.g. window resize or sidebar toggle)
  useEffect(() => {
    const container = containerRef.current
    if (!container || typeof ResizeObserver === 'undefined') return

    let timeoutId: NodeJS.Timeout
    const observer = new ResizeObserver(() => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        setResizeCount((c) => c + 1)
      }, 200)
    })
    observer.observe(container)
    return () => {
      clearTimeout(timeoutId)
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (isOutOfRange) {
      setLoading(false)
      return
    }

    let isCancelled = false
    let currentRenderTask: any = null

    async function renderPage() {
      try {
        setLoading(true)
        const page = await pdfDoc.getPage(pageNumber)
        if (isCancelled) return

        const unscaledViewport = page.getViewport({ scale: 1.0 })
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return

        // Compute scale to fit both container width (accounting for book padding) and standard spread max height
        const availableWidth = Math.max(260, (container.clientWidth || 520) - 16)
        const maxHeight = 710
        const scale = Math.min(
          availableWidth / unscaledViewport.width,
          maxHeight / unscaledViewport.height
        )
        const viewport = page.getViewport({ scale })

        const displayWidth = Math.floor(viewport.width)
        const displayHeight = Math.floor(viewport.height)
        setPageDimensions({ width: displayWidth, height: displayHeight })

        // HiDPI support for ultra-sharp text and illustrations
        const pixelRatio = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1
        canvas.width = Math.floor(displayWidth * pixelRatio)
        canvas.height = Math.floor(displayHeight * pixelRatio)
        canvas.style.width = `${displayWidth}px`
        canvas.style.height = `${displayHeight}px`

        const context = canvas.getContext('2d')
        if (!context) return

        // Explicitly fill white sheet background to prevent black letterboxing
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, canvas.width, canvas.height)

        context.imageSmoothingEnabled = true
        context.imageSmoothingQuality = 'high'
        context.scale(pixelRatio, pixelRatio)

        const renderContext = {
          canvasContext: context,
          viewport,
        }

        currentRenderTask = page.render(renderContext)
        await currentRenderTask.promise

        if (!isCancelled) {
          setLoading(false)
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException' && !isCancelled) {
          console.error(`[PdfPageSheet] Error rendering page ${pageNumber}:`, err)
          setLoading(false)
        }
      }
    }

    renderPage()

    return () => {
      isCancelled = true
      if (currentRenderTask) {
        try {
          currentRenderTask.cancel()
        } catch {}
      }
    }
  }, [pdfDoc, pageNumber, isOutOfRange, resizeCount])

  // Theme filters applied directly to the canvas so illustrations fit the book theme
  const canvasThemeFilter =
    theme === 'night'
      ? 'invert(0.92) hue-rotate(180deg) brightness(0.95) contrast(0.9)'
      : theme === 'sepia'
      ? 'sepia(0.22) contrast(1.02)'
      : 'none'

  const pageBg =
    theme === 'night' ? 'bg-[#181a1b]' : theme === 'light' ? 'bg-white' : 'bg-[#fbf8f1]'

  if (isOutOfRange) {
    return (
      <article
        className={`relative flex min-h-[550px] items-center justify-center p-8 ${pageBg} ${
          side === 'left' ? 'rounded-l-[2px]' : 'rounded-r-[2px]'
        }`}
      >
        <span className="text-xs uppercase tracking-widest text-black/20 dark:text-white/20">
          Fim do Livro
        </span>
      </article>
    )
  }

  return (
    <article
      ref={containerRef}
      className={`relative min-h-[550px] overflow-hidden p-3 sm:p-5 shadow-[inset_0_0_24px_rgba(90,69,40,0.06)] ${pageBg} ${
        side === 'left' ? 'rounded-l-[2px] md:pr-7' : 'hidden md:block rounded-r-[2px] md:pl-7'
      }`}
    >
      {/* Sombra da lombada do livro */}
      <div
        className={`pointer-events-none absolute bottom-0 ${
          side === 'left' ? 'right-0 bg-gradient-to-l' : 'left-0 bg-gradient-to-r'
        } top-0 z-20 w-5 from-black/10 to-transparent opacity-60`}
      />

      {/* Loading placeholder */}
      {loading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/5 backdrop-blur-[1px]">
          <div className="size-6 animate-spin rounded-full border-2 border-black/20 border-t-black/70" />
        </div>
      )}

      {/* Conteúdo visual da folha real com ilustrações */}
      <div
        className="relative mx-auto flex items-center justify-center"
        style={{
          width: pageDimensions ? `${pageDimensions.width}px` : '100%',
          height: pageDimensions ? `${pageDimensions.height}px` : 'auto',
          maxWidth: '100%',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: pageDimensions ? `${pageDimensions.width}px` : '100%',
            height: pageDimensions ? `${pageDimensions.height}px` : 'auto',
            filter: canvasThemeFilter,
          }}
          className="block rounded-[2px] shadow-sm transition-[filter] duration-200"
        />

        {/* Camada interativa de sincronização de palavras sobre o Canvas */}
        <div className="absolute inset-0 select-none overflow-hidden">
          {wordPositions.map((pos) => {
            const isActive = pos.wordIndex === activeWordIndex

            let highlightClasses = ''
            if (isActive) {
              if (highlight === 'underline') {
                highlightClasses =
                  'border-b-[3px] border-blue-600 bg-blue-500/15 ring-1 ring-blue-500/30'
              } else if (highlight === 'focus') {
                highlightClasses =
                  'bg-blue-600/35 ring-2 ring-blue-600 shadow-md scale-105 z-10'
              } else {
                // blue default
                highlightClasses =
                  'bg-blue-500/25 ring-2 ring-blue-500/40 rounded-sm shadow-sm'
              }
            }

            return (
              <button
                key={pos.wordIndex}
                type="button"
                onClick={() => onWordClick(pos.wordIndex)}
                title={pos.text}
                className={`absolute cursor-pointer transition-all duration-100 hover:bg-blue-500/15 ${highlightClasses}`}
                style={{
                  left: `${pos.leftPercent}%`,
                  top: `${pos.topPercent}%`,
                  width: `${pos.widthPercent}%`,
                  height: `${pos.heightPercent}%`,
                }}
                aria-label={`Pular áudio para: ${pos.text}`}
              />
            )
          })}
        </div>
      </div>

      {/* Número da página real no rodapé */}
      <div
        className={`absolute bottom-3 ${
          side === 'left' ? 'left-6' : 'right-6'
        } text-[11px] font-medium tracking-wider ${
          theme === 'night' ? 'text-white/40' : 'text-black/40'
        }`}
      >
        {pageNumber}
      </div>
    </article>
  )
}
