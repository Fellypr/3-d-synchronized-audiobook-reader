'use client'

import Link from 'next/link'
import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, BookOpen, Headphones, Plus, ChevronLeft, ChevronRight, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buildDashboardBooks, formatDuration, formatBookCount, getBookReadingState, formatPosition, type ProgressRecord, type BookRecord } from '@/lib/books/progress'
import { BookListItem } from '@/components/reader-dashboard/book-list-item'
import { LibraryEmptyState } from '@/components/reader-dashboard/library-empty-state'
import { LibraryToolbar, type LibraryFilter, type LibraryView } from '@/components/reader-dashboard/library-toolbar'
import { UploadBookDialog } from '@/components/reader-dashboard/upload-book-dialog'
import { NotificationBell } from '@/components/reader-dashboard/notification-bell'

function HeroCard({
  book,
  onOpen,
}: {
  book: {
    id: string
    name: string
    coverUrl?: string | null
    accentColor?: string | null
    currentTime: number
    durationSeconds?: number | null
    progressPercent: number | null
  }
  onOpen: (id: string) => void
}) {
  const initials = book.name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toLocaleUpperCase('pt-BR')

  return (
    <section
      aria-label="Livro em destaque"
      className="relative overflow-hidden rounded-[20px] shadow-xl transition-colors duration-500"
      style={{ backgroundColor: book.accentColor || '#121922' }}
    >
      {/* Dark gradient & backdrop blur overlay for crisp text contrast */}
      <div className="pointer-events-none absolute inset-0 backdrop-blur-[7.5px] bg-gradient-to-b from-[rgba(12,12,12,0.5)] via-[rgba(16,15,15,0.5)] to-[rgba(58,58,58,0.5)]" />

      <div className="relative z-10 flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-10 sm:p-8 lg:px-11 lg:py-9">
        <div className="min-w-0 flex-1 space-y-5">
          <div className="flex items-center gap-2 text-xs font-medium text-[#f4f1eb]/90">
            <span className="size-2 rounded-full bg-[#e09f4c]" />
            <span>Continuando de onde parou</span>
          </div>

          <h2 className="font-brand text-xl font-semibold leading-tight tracking-tight text-[#f4f1eb] sm:text-[35px] [overflow-wrap:anywhere]">
            {book.name}
          </h2>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs sm:text-sm text-[#f4f1eb]/85">
              {book.currentTime > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <BookOpen className="size-4 text-[#e09f4c]" />
                  <span>{formatPosition(book.currentTime)}</span>
                </span>
              )}
              {book.currentTime > 0 && book.durationSeconds && (
                <span className="text-[#f4f1eb]/35">|</span>
              )}
              {book.durationSeconds && (
                <span className="inline-flex items-center gap-1.5">
                  <Headphones className="size-4 text-[#e09f4c]" />
                  <span>{formatDuration(book.durationSeconds)}</span>
                </span>
              )}
              {book.progressPercent !== null && (
                <span className="font-semibold text-[#e09f4c]">
                  {book.progressPercent}% concluído
                </span>
              )}
            </div>

            {book.progressPercent !== null && (
              <div className="relative h-[5px] max-w-md overflow-hidden rounded-full bg-[#252d35]">
                <div
                  className="h-full rounded-full bg-[#e09f4c] transition-all duration-500 ease-out"
                  style={{ width: `${Math.max(3, book.progressPercent)}%` }}
                />
              </div>
            )}
          </div>

          <div className="pt-1">
            <button
              onClick={() => onOpen(book.id)}
              className="inline-flex items-center gap-2.5 rounded-[10px] bg-[#e09f4c] px-5 py-3 text-sm font-semibold text-[#060707] shadow-md transition-all duration-200 hover:bg-[#e09f4c]/90 hover:shadow-lg active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e09f4c]"
            >
              <Play className="size-4 fill-current" />
              <span>Continuar a leitura</span>
            </button>
          </div>
        </div>

        {/* 3D Hardcover Book Mockup */}
        <div className="shrink-0 self-center sm:self-auto py-2 pr-2">
          <div className="relative h-42 w-36 sm:h-60 sm:w-44 lg:h-54 lg:w-38 [perspective:1100px]">
            {/* Ground / Ambient Drop Shadow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-3 -left-3 right-2 h-8 rounded-full bg-black/55 blur-xl"
            />
            <div
              className="relative h-full w-full transition-transform duration-300 ease-out hover:[transform:rotateY(12deg)_rotateX(3deg)_translateY(-3px)]"
              style={{
                transformStyle: 'preserve-3d',
                transform: 'rotateY(18deg) rotateX(6deg)',
              }}
            >
              {/* Back Cover */}
              <div
                aria-hidden="true"
                className="absolute inset-0 rounded-r-[4px] bg-[#b5bac2]"
                style={{ transform: 'translateZ(-22px)' }}
              />

              {/* Top Page Edges */}
              <div
                aria-hidden="true"
                className="absolute left-[2px] right-[3px] top-[3px] h-[22px] border-t border-black/15"
                style={{
                  transformOrigin: 'top center',
                  transform: 'rotateX(-90deg)',
                  background:
                    'repeating-linear-gradient(to bottom, #e9ebef 0px, #e9ebef 2px, #d7dae0 2px, #d7dae0 3px)',
                  boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.18)',
                }}
              />

              {/* Left Spine */}
              <div
                aria-hidden="true"
                className="absolute bottom-0 left-0 top-0 w-[22px] rounded-l-[3px]"
                style={{
                  transformOrigin: 'left center',
                  transform: 'rotateY(-90deg)',
                  background:
                    'linear-gradient(90deg, #9aa0a8 0%, #d2d6dc 38%, #eceef2 68%, #b3b9c2 100%)',
                  boxShadow:
                    'inset -2px 0 5px rgba(0,0,0,0.22), inset 1px 0 2px rgba(255,255,255,0.45)',
                }}
              />

              {/* Front Cover */}
              <div className="relative h-full w-full overflow-hidden rounded-r-[4px] rounded-l-[1px] bg-[#1a222d] shadow-[-6px_12px_24px_rgba(0,0,0,0.48)]">
                {book.coverUrl ? (
                  <img
                    src={book.coverUrl}
                    alt={`Capa de ${book.name}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col justify-between border border-white/15 bg-[#1a222d] p-4 text-center">
                    <span className="text-[10px] uppercase tracking-widest text-[#f4f1eb]/60">Auditeca</span>
                    <div className="flex flex-1 items-center justify-center">
                      <span className="font-brand text-2xl font-bold text-[#e09f4c]">
                        {initials || <BookOpen className="size-8 text-[#e09f4c]" />}
                      </span>
                    </div>
                    <span className="truncate text-xs text-[#f4f1eb]/75">{book.name}</span>
                  </div>
                )}

                {/* Hardcover spine crease & glossy edge highlight */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(90deg, rgba(0,0,0,0.32) 0%, rgba(255,255,255,0.28) 2.5%, rgba(0,0,0,0.14) 5.5%, rgba(255,255,255,0.06) 8%, transparent 16%)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.28), inset -1px 0 0 rgba(255,255,255,0.12)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ──────────────────── Book Carousel (Figma 56:500) ──────────────────── */
function BookCarousel({
  books,
  lastReadId,
  onOpen,
  onAddBook,
}: {
  books: Array<{
    id: string
    name: string
    coverUrl?: string | null
    progressPercent?: number | null
    status?: string | null
    completedParts?: number | null
    totalParts?: number | null
  }>
  lastReadId?: string | null
  onOpen: (id: string) => void
  onAddBook: () => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 6)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 6)
  }, [])

  useEffect(() => {
    checkScroll()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', checkScroll, { passive: true })
    window.addEventListener('resize', checkScroll)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [checkScroll, books.length])

  function scroll(dir: 'left' | 'right') {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' })
  }

  const initials = (name: string) =>
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toLocaleUpperCase('pt-BR')

  if (books.length === 0) return null

  return (
    <div className="relative">
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scroll('left')}
          className="absolute -left-3 top-1/2 z-20 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#252d35] bg-[#121a23]/95 text-[#f4f1eb] shadow-lg backdrop-blur-md transition-all hover:border-[#e09f4c] hover:text-[#e09f4c]"
          aria-label="Rolar para a esquerda"
        >
          <ChevronLeft className="size-4" />
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scroll('right')}
          className="absolute -right-3 top-1/2 z-20 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#252d35] bg-[#121a23]/95 text-[#f4f1eb] shadow-lg backdrop-blur-md transition-all hover:border-[#e09f4c] hover:text-[#e09f4c]"
          aria-label="Rolar para a direita"
        >
          <ChevronRight className="size-4" />
        </button>
      )}

      <div
        ref={scrollRef}
        className="scrollbar-hide flex gap-5 overflow-x-auto pb-3 pt-1"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {books.map((book) => {
          const isSelected = book.id === lastReadId
          const percent = Math.max(0, Math.min(100, Math.round(book.progressPercent ?? 0)))

          return (
            <button
              key={book.id}
              type="button"
              onClick={() => onOpen(book.id)}
              style={{ scrollSnapAlign: 'start' }}
              aria-label={`Abrir livro: ${book.name}`}
              className={`group flex h-[302px] w-[246.4px] shrink-0 flex-col justify-between rounded-[14px] border bg-[#121a23] p-[18px] text-left transition-all duration-200 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e09f4c] ${
                isSelected
                  ? 'border-[#e09f4c]'
                  : 'border-[#252d35] hover:border-[#e09f4c]/70'
              }`}
            >
              {/* Capa centralizada (112x168) */}
              <div className="flex h-[168px] w-full items-center justify-center overflow-hidden">
                {book.coverUrl ? (
                  <img
                    src={book.coverUrl}
                    alt={`Capa de ${book.name}`}
                    className="h-[168px] w-[112px] rounded-[3px] object-cover shadow-md transition-transform duration-200 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-[168px] w-[112px] flex-col justify-between rounded-[3px] border border-white/10 bg-gradient-to-br from-[#232b36] to-[#141a22] p-2.5 text-center shadow-md">
                    <span className="text-[8px] font-semibold uppercase tracking-widest text-[#e09f4c]/80">
                      Auditeca
                    </span>
                    <div className="flex flex-1 items-center justify-center">
                      <span className="font-brand text-lg font-bold text-[#e09f4c]">
                        {initials(book.name) || <BookOpen className="size-5 text-[#e09f4c]" />}
                      </span>
                    </div>
                    <span className="line-clamp-2 text-[9px] text-white/60">
                      {book.name}
                    </span>
                  </div>
                )}
              </div>

              {/* Título */}
              <div className="w-full">
                <h3
                  className="line-clamp-2 h-[40px] text-[13px] font-medium leading-[20px] text-[#f4f1eb] transition-colors group-hover:text-[#e09f4c]"
                  title={book.name}
                >
                  {book.name}
                </h3>

                {/* Progresso e Seta */}
                {book.status === 'processando' ? (
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-amber-400">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
                      {typeof book.completedParts === 'number' && typeof book.totalParts === 'number' && book.totalParts > 0
                        ? `Gerando (${book.completedParts}/${book.totalParts})`
                        : 'Gerando áudio...'}
                    </span>
                    <ArrowRight className="size-[18px] text-[#f8f8f8]/70" />
                  </div>
                ) : (
                  <div className="mt-3 flex h-[26px] items-center gap-2.5">
                    <div className="h-[4px] flex-1 overflow-hidden rounded-[3px] bg-[#252d35]">
                      <div
                        className="h-full rounded-[3px] bg-[#e09f4c] transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span
                      className={`text-[12px] font-normal tabular-nums ${
                        isSelected || percent > 0 ? 'text-[#e09f4c]' : 'text-[#f8f8f8]'
                      }`}
                    >
                      {percent}%
                    </span>
                    <ArrowRight
                      className={`size-[18px] shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 ${
                        isSelected ? 'text-[#e09f4c]' : 'text-[#f8f8f8] group-hover:text-[#e09f4c]'
                      }`}
                    />
                  </div>
                )}
              </div>
            </button>
          )
        })}

        {/* Card Final: Adicionar novo livro */}
        <button
          type="button"
          onClick={onAddBook}
          style={{ scrollSnapAlign: 'start' }}
          className="group flex h-[302px] w-[246.4px] shrink-0 flex-col items-center justify-center rounded-[14px] border border-dashed border-[#252d35] bg-[#10171f] p-6 text-center transition-all duration-200 hover:-translate-y-1 hover:border-[#e09f4c]/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e09f4c]"
        >
          <div className="mb-4 flex size-[44px] items-center justify-center rounded-full bg-[#121a23] transition-transform duration-200 group-hover:scale-110">
            <Plus className="size-6 text-[#f4f1eb] group-hover:text-[#e09f4c] transition-colors" />
          </div>
          <span className="text-[16px] font-semibold leading-[24px] text-[#f4f1eb]">
            Adicionar novo livro
          </span>
          <span className="mt-2 max-w-[180px] text-[12px] leading-[18px] text-[#f8f8f8]/75">
            Amplie sua jornada de conhecimento.
          </span>
        </button>
      </div>
    </div>
  )
}

/* ──────────────────── Dashboard ──────────────────── */
export function ReaderDashboard({
  userName,
  userId,
  books,
  progress,
}: {
  userName?: string
  userId?: string
  books: BookRecord[]
  progress: ProgressRecord[]
}) {
  const router = useRouter()
  const [filter, setFilter] = useState<LibraryFilter>('all')
  const [view, setView] = useState<LibraryView>('list')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [uploadMessage, setUploadMessage] = useState('')
  const [selectedHeroBookId, setSelectedHeroBookId] = useState<string | null>(null)

  // Atualizações reativas imediatas de partes e status enquanto o poller sincroniza com a VPS
  const [activeJobUpdates, setActiveJobUpdates] = useState<
    Record<string, { completedParts?: number; totalParts?: number; status?: string }>
  >({})

  const mergedBooks = useMemo(() => {
    return books.map((b) => {
      const update = activeJobUpdates[b.id]
      if (!update) return b
      return {
        ...b,
        completedParts: typeof update.completedParts === 'number' ? update.completedParts : b.completedParts,
        totalParts: typeof update.totalParts === 'number' ? update.totalParts : b.totalParts,
        status: update.status || b.status,
      }
    })
  }, [books, activeJobUpdates])

  const processingBooks = useMemo(
    () => mergedBooks.filter((b) => b.status === 'processando' && b.jobId),
    [mergedBooks],
  )
  const completedBooks = useMemo(
    () => mergedBooks.filter((b) => b.status === 'concluido'),
    [mergedBooks],
  )

  const dashboardBooks = useMemo(() => buildDashboardBooks(mergedBooks, progress), [mergedBooks, progress])
  const measuredListeningSeconds = useMemo(
    () => progress.reduce((sum, item) => sum + (item.listenedSeconds ?? 0), 0),
    [progress],
  )
  const hasMeasuredListening = progress.some((item) => item.listenedSeconds !== null)
  const inProgressCount = dashboardBooks.filter((item) => getBookReadingState(item) === 'in-progress').length

  // Sincronizador ativo em 2º plano para livros sendo sintetizados
  const isSyncingRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    const activeToSync = books.filter((b) => b.status === 'processando' && b.jobId)
    if (activeToSync.length === 0) return

    const savedApi = typeof window !== 'undefined' ? localStorage.getItem('audiobook_api_url') : null
    const apiUrl =
      (savedApi && !savedApi.includes('onrender.com') && !savedApi.includes('147.15.26.202') ? savedApi : null) ||
      process.env.NEXT_PUBLIC_AUDIOBOOK_API_URL ||
      'https://auditeca-api.duckdns.org'

    const syncJobs = async () => {
      for (const pBook of activeToSync) {
        if (!pBook.jobId || isSyncingRef.current.has(pBook.id)) continue
        isSyncingRef.current.add(pBook.id)
        try {
          const res = await fetch('/api/books/sync-job', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookId: pBook.id, jobId: pBook.jobId, apiUrl }),
          })
          if (res.ok) {
            const data = await res.json()
            if (typeof data.completedParts === 'number' || typeof data.totalParts === 'number' || data.status) {
              setActiveJobUpdates((prev) => ({
                ...prev,
                [pBook.id]: {
                  completedParts: data.completedParts,
                  totalParts: data.totalParts,
                  status: data.status,
                },
              }))
            }
            if (data.updated) {
              router.refresh()
            }
          }
        } catch (e) {
          console.warn('[dashboard] Erro ao sincronizar job de áudio:', e)
        } finally {
          isSyncingRef.current.delete(pBook.id)
        }
      }
    }

    void syncJobs()
    const interval = setInterval(() => {
      void syncJobs()
    }, 5000)

    return () => clearInterval(interval)
  }, [books, router])

  const visibleBooks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR')
    return dashboardBooks.filter((item) => {
      const state = getBookReadingState(item)
      const matchesFilter =
        filter === 'all' ||
        (filter === 'in-progress' && state === 'in-progress') ||
        (filter === 'completed' && state === 'completed')
      const matchesQuery = !normalizedQuery || item.name.toLocaleLowerCase('pt-BR').includes(normalizedQuery)
      return matchesFilter && matchesQuery
    })
  }, [dashboardBooks, filter, query])

  const lastReadBook = dashboardBooks.find((item) => item.lastReadAt)
  const lastReadId = lastReadBook?.id
  const heroBook = useMemo(() => {
    if (selectedHeroBookId) {
      const found = dashboardBooks.find((b) => b.id === selectedHeroBookId)
      if (found) return found
    }
    return lastReadBook ?? dashboardBooks[0] ?? null
  }, [dashboardBooks, lastReadBook, selectedHeroBookId])
  const activeShelfId = heroBook?.id ?? lastReadBook?.id
  const hasBooks = books.length > 0
  const hasSearch = query.trim().length > 0
  const emptyStateKind = !hasBooks ? 'library' : hasSearch ? 'search' : 'filter'
  const countText = formatBookCount(books.length)

  function openReader(id: string) {
    router.push(`/reader/${id}`)
  }

  function handleShelfSelect(id: string) {
    if (activeShelfId === id) {
      openReader(id)
    } else {
      setSelectedHeroBookId(id)
    }
  }

  function showAddedBook() {
    setFilter('all')
    setQuery('')
    setUploadMessage('Livro adicionado à biblioteca.')
    router.refresh()
  }

  function handleBookDeleted(id: string, name: string) {
    setUploadMessage(`Livro "${name}" excluído com sucesso.`)
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-library-page text-library-ink antialiased">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-30 border-b border-library-border/50 bg-library-page/85 backdrop-blur-md">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg text-library-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-library-accent"
            aria-label="Auditeca — início"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 p-1.5 ring-1 ring-orange-500/25">
              <img
                src="/logo.png"
                alt="Auditeca"
                className="size-full object-contain"
              />
            </span>
            <div className="flex flex-col">
              <span className="font-brand text-xl font-semibold tracking-tight text-library-ink">
                Auditeca
              </span>
              <span className="text-[10px] text-library-muted">
                Audiolivros Sincronizados
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {userName && (
              <span className="hidden text-xs text-library-muted sm:inline-block">
                Leitor <strong className="font-medium text-library-ink">{userName.split(' ')[0]}</strong>
              </span>
            )}
            <NotificationBell
              processingBooks={processingBooks}
              completedBooks={completedBooks}
            />
            <Button
              onClick={() => {
                setUploadMessage('')
                setUploadOpen(true)
              }}
              className="h-10 rounded-xl bg-library-accent px-4 font-medium text-library-accent-foreground shadow-sm transition-all hover:bg-library-accent/90 hover:shadow active:scale-[0.98]"
            >
              <Plus aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">Adicionar livro</span>
              <span className="sm:hidden">Adicionar</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        {/* ─── Hero: Último livro ─── */}
        {heroBook && (
          <div className="mb-10">
            <HeroCard book={heroBook} onOpen={openReader} />
          </div>
        )}

        {/* ─── Carrossel: Estante de Leituras (Figma 56:500) ─── */}
        {hasBooks && (
          <section aria-labelledby="shelf-title" className="mb-12">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2
                  id="shelf-title"
                  className="font-brand text-[26px] sm:text-[28px] font-semibold leading-[36px] text-[#f4f1eb]"
                >
                  Estante de Leituras
                </h2>
                <p className="mt-0.5 text-[14px] leading-[22px] text-[#f8f8f8]/75">
                  Acesso rápido aos livros em sua coleção
                </p>
              </div>
              <a
                href="#library-title"
                className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-[#e09f4c] hover:underline"
              >
                <span>Ver todos</span>
                <ArrowRight className="size-[18px]" />
              </a>
            </div>

            <BookCarousel
              books={visibleBooks}
              lastReadId={activeShelfId}
              onOpen={handleShelfSelect}
              onAddBook={() => setUploadOpen(true)}
            />
          </section>
        )}

        {/* ─── Lista de Livros (Detalhada) ─── */}
        <section aria-labelledby="library-title" className="space-y-6">
          <div className="flex flex-col gap-2 border-b border-library-border/60 pb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <div>
              <h1 id="library-title" className="font-brand text-2xl font-semibold tracking-tight text-library-ink sm:text-3xl">
                Sua Biblioteca
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-library-muted">
                {countText}
                {' · '}
                {inProgressCount === 1 ? '1 em andamento' : `${inProgressCount} em andamento`}
                {hasMeasuredListening && (
                  <>
                    {' · '}
                    <span className="text-library-accent font-medium">
                      {formatDuration(measuredListeningSeconds)} ouvidos
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          {uploadMessage && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-2 rounded-xl border border-library-accent/30 bg-library-selected/70 px-4 py-3 text-sm text-library-ink"
            >
              <span className="size-2 rounded-full bg-library-accent" />
              <span>{uploadMessage}</span>
            </div>
          )}

          <div className="pt-1">
            <LibraryToolbar
              query={query}
              onQueryChange={setQuery}
              filter={filter}
              onFilterChange={setFilter}
              view={view}
              onViewChange={setView}
              count={visibleBooks.length}
            />
          </div>

          {visibleBooks.length > 0 ? (
            <ul
              className={
                view === 'grid'
                  ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-2'
                  : 'divide-y divide-library-border/60 rounded-xl border border-library-border/60 bg-library-surface/40 overflow-hidden'
              }
              aria-label="Livros da biblioteca"
            >
              {visibleBooks.map((item) => (
                <BookListItem
                  key={item.id}
                  book={item}
                  isLastRead={item.id === lastReadId}
                  view={view}
                  onDeleted={handleBookDeleted}
                />
              ))}
            </ul>
          ) : (
            <div className="pt-2">
              <LibraryEmptyState
                kind={emptyStateKind}
                query={query.trim()}
                activeFilter={filter === 'completed' ? 'concluídos' : 'em andamento'}
                onAddBook={() => setUploadOpen(true)}
                onClearSearch={() => setQuery('')}
                onShowAll={() => {
                  setFilter('all')
                  setQuery('')
                }}
              />
            </div>
          )}
        </section>
      </div>

      <UploadBookDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onAdded={showAddedBook}
        userId={userId}
      />
    </main>
  )
}

