'use client'

import Link from 'next/link'
import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Plus, ChevronLeft, ChevronRight, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buildDashboardBooks, formatDuration, formatBookCount, getBookReadingState, formatPosition, type ProgressRecord, type BookRecord } from '@/lib/books/progress'
import { BookListItem } from '@/components/reader-dashboard/book-list-item'
import { LibraryEmptyState } from '@/components/reader-dashboard/library-empty-state'
import { LibraryToolbar, type LibraryFilter, type LibraryView } from '@/components/reader-dashboard/library-toolbar'
import { UploadBookDialog } from '@/components/reader-dashboard/upload-book-dialog'

/* ──────────────────── Hero Card ──────────────────── */
/* ──────────────────── Hero Card ──────────────────── */
function HeroCard({
  book,
  onOpen,
}: {
  book: {
    id: string
    name: string
    coverUrl?: string | null
    currentTime: number
    durationSeconds?: number | null
    progressPercent: number | null
  }
  onOpen: (id: string) => void
}) {
  const state = getBookReadingState(book as any)
  const statusLabel = state === 'completed' ? 'Concluído' : state === 'in-progress' ? 'Em andamento' : 'Ainda não iniciado'
  const initials = book.name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toLocaleUpperCase('pt-BR')

  return (
    <section
      aria-label="Livro em destaque"
      className="relative overflow-hidden rounded-2xl border border-library-border bg-library-surface/90 p-6 sm:p-8 lg:p-10 shadow-xl transition-all"
      style={{ background: 'var(--library-card-gradient)' }}
    >
      {/* Delicate background ambient glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-library-accent/5 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-library-accent/30 bg-library-accent/10 px-3 py-1 text-xs font-medium text-library-accent">
              <span className="size-1.5 rounded-full bg-library-accent" />
              Última leitura
            </span>
            <span className="text-xs text-library-muted">
              {statusLabel}
            </span>
          </div>

          <h2 className="font-brand text-2xl font-medium tracking-tight text-library-ink sm:text-3xl lg:text-4xl [overflow-wrap:anywhere]">
            {book.name}
          </h2>

          <div className="space-y-3 pt-1">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs sm:text-sm text-library-muted">
              {book.currentTime > 0 && (
                <span>
                  Posição salva: <strong className="font-medium text-library-ink">{formatPosition(book.currentTime)}</strong>
                </span>
              )}
              {book.durationSeconds && (
                <span>
                  Duração total: <strong className="font-medium text-library-ink">{formatDuration(book.durationSeconds)}</strong>
                </span>
              )}
              {book.progressPercent !== null && (
                <span className="font-medium text-library-accent">
                  {book.progressPercent}% concluído
                </span>
              )}
            </div>

            {book.progressPercent !== null && (
              <div className="relative h-2 max-w-md overflow-hidden rounded-full bg-library-selected/80 border border-white/5">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.max(3, book.progressPercent)}%`,
                    backgroundColor: 'var(--library-accent)',
                  }}
                />
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              onClick={() => onOpen(book.id)}
              className="inline-flex items-center gap-2.5 rounded-xl bg-library-accent px-5 py-3 text-sm font-semibold text-library-accent-foreground shadow-md transition-all duration-200 hover:bg-library-accent/90 hover:shadow-lg hover:shadow-library-accent/20 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-library-accent"
            >
              <Play className="size-4 fill-current" />
              <span>Continuar leitura</span>
            </button>
          </div>
        </div>

        {/* Book cover with realistic proportion & spine shadow */}
        <div className="shrink-0 self-center sm:self-auto">
          {book.coverUrl ? (
            <div className="group relative">
              <img
                src={book.coverUrl}
                alt={`Capa de ${book.name}`}
                className="book-spine-effect h-52 w-36 rounded-md object-cover sm:h-60 sm:w-40 lg:h-64 lg:w-44"
              />
              <div className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-inset ring-white/10" />
            </div>
          ) : (
            <div className="book-spine-effect flex h-52 w-36 flex-col justify-between rounded-md border border-library-border bg-library-selected p-4 text-center sm:h-60 sm:w-40 lg:h-64 lg:w-44">
              <span className="text-[10px] uppercase tracking-widest text-library-muted">Auditeca</span>
              <div className="flex flex-1 items-center justify-center">
                <span className="font-brand text-2xl font-bold text-library-accent">
                  {initials || <BookOpen className="size-8 text-library-accent" />}
                </span>
              </div>
              <span className="truncate text-xs text-library-muted">{book.name}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/* ──────────────────── Book Carousel ──────────────────── */
function BookCarousel({
  books,
  onOpen,
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
  onOpen: (id: string) => void
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
    el.scrollBy({ left: dir === 'left' ? -340 : 340, behavior: 'smooth' })
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
      {/* Scroll controls */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute -left-3 top-1/2 z-20 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-library-border bg-library-surface/95 text-library-ink shadow-lg backdrop-blur-md transition-all hover:bg-library-selected hover:text-library-accent focus-visible:outline-2 focus-visible:outline-library-accent"
          aria-label="Rolar para a esquerda"
        >
          <ChevronLeft className="size-4" />
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute -right-3 top-1/2 z-20 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-library-border bg-library-surface/95 text-library-ink shadow-lg backdrop-blur-md transition-all hover:bg-library-selected hover:text-library-accent focus-visible:outline-2 focus-visible:outline-library-accent"
          aria-label="Rolar para a direita"
        >
          <ChevronRight className="size-4" />
        </button>
      )}

      <div
        ref={scrollRef}
        className="scrollbar-hide flex gap-5 overflow-x-auto pb-6 pt-2 sm:gap-6"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {books.map((book) => (
          <button
            key={book.id}
            onClick={() => onOpen(book.id)}
            className="group flex shrink-0 flex-col items-center gap-2.5 rounded-xl p-1 text-left transition-all duration-200 hover:-translate-y-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-library-accent"
            style={{ scrollSnapAlign: 'start' }}
            aria-label={`Abrir livro: ${book.name}`}
          >
            {/* ─── Mockup 3D do Livro (Figma 22:159) ─── */}
            <div className="relative h-[215px] w-[159px] shrink-0 drop-shadow-md transition-transform duration-200 group-hover:scale-[1.02]">
              {/* Moldura física 3D de fundo (lombada e páginas) */}
              <img
                src="/book-frame-3d.png"
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 size-full select-none object-cover"
              />

              {/* Capa inclinada com perspectiva e sombreamento */}
              <div className="absolute left-[26px] top-[6.8px] flex h-[206px] w-[132px] items-center justify-center">
                <div className="flex-none rotate-[-2.29deg] skew-x-[-2.29deg]">
                  <div className="relative h-[201px] w-[132px] overflow-hidden rounded-r-[2px] shadow-[0px_12px_24px_-8px_rgba(0,0,0,0.7)]">
                    {book.coverUrl ? (
                      <img
                        src={book.coverUrl}
                        alt={`Capa de ${book.name}`}
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full flex-col justify-between bg-gradient-to-br from-[#2a303c] via-[#1e232d] to-[#151921] p-3 text-center">
                        <span className="text-[9px] font-semibold uppercase tracking-widest text-library-accent/70">
                          Audiolivro
                        </span>
                        <div className="flex flex-1 items-center justify-center">
                          <span className="font-brand text-xl font-bold text-library-accent">
                            {initials(book.name) || <BookOpen className="size-6 text-library-accent" />}
                          </span>
                        </div>
                        <span className="line-clamp-2 text-[10px] font-medium leading-tight text-white/70">
                          {book.name}
                        </span>
                      </div>
                    )}

                    {/* Sombreamento interno de lombada e curvatura da página */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 shadow-[inset_4px_0px_8px_-2px_rgba(0,0,0,0.6),inset_-1px_0px_2px_0px_rgba(255,255,255,0.08)]"
                    />

                    {/* Overlay interativo com botão de Play no hover */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 backdrop-blur-[1px] transition-opacity duration-200 group-hover:opacity-100">
                      <div className="flex size-11 items-center justify-center rounded-full bg-library-accent text-library-accent-foreground shadow-xl transition-transform duration-200 group-hover:scale-105">
                        <Play className="ml-0.5 size-5 fill-current" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Título do livro abaixo do mockup */}
            <div className="flex w-[145px] flex-col items-center gap-1">
              <span
                className="w-full truncate text-center text-xs font-medium text-library-ink/90 transition-colors group-hover:text-library-accent"
                title={book.name}
              >
                {book.name}
              </span>

              {book.status === 'processando' && (
                <div className="flex w-full flex-col items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px]">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-500 leading-tight">
                    <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span>Em 2º plano</span>
                  </div>
                  <span className="text-[9px] text-library-muted text-center leading-tight">
                    {book.completedParts && book.totalParts
                      ? `${book.completedParts}/${book.totalParts} partes (faltam ${Math.max(0, book.totalParts - book.completedParts)})`
                      : 'Gerando áudio...'}
                  </span>
                  {book.completedParts && book.totalParts && book.totalParts > 0 && (
                    <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-700/40">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all duration-300"
                        style={{ width: `${Math.min(100, (book.completedParts / book.totalParts) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </button>
        ))}
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

  const dashboardBooks = useMemo(() => buildDashboardBooks(books, progress), [books, progress])
  const measuredListeningSeconds = useMemo(
    () => progress.reduce((sum, item) => sum + (item.listenedSeconds ?? 0), 0),
    [progress],
  )
  const hasMeasuredListening = progress.some((item) => item.listenedSeconds !== null)
  const inProgressCount = dashboardBooks.filter((item) => getBookReadingState(item) === 'in-progress').length

  // Sincronizador ativo em 2º plano para livros sendo sintetizados
  const isSyncingRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    const processingBooks = books.filter((b) => b.status === 'processando' && b.jobId)
    if (processingBooks.length === 0) return

    const savedApi = typeof window !== 'undefined' ? localStorage.getItem('audiobook_api_url') : null
    const apiUrl =
      (savedApi && !savedApi.includes('onrender.com') ? savedApi : null) ||
      process.env.NEXT_PUBLIC_AUDIOBOOK_API_URL ||
      'http://147.15.26.202'

    const syncJobs = async () => {
      for (const pBook of processingBooks) {
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
    }, 7000)

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
  const hasBooks = books.length > 0
  const hasSearch = query.trim().length > 0
  const emptyStateKind = !hasBooks ? 'library' : hasSearch ? 'search' : 'filter'
  const countText = formatBookCount(books.length)

  function openReader(id: string) {
    router.push(`/reader/${id}`)
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
        {lastReadBook && (
          <div className="mb-10">
            <HeroCard book={lastReadBook} onOpen={openReader} />
          </div>
        )}

        {/* ─── Carrossel: Estante de Leituras ─── */}
        {hasBooks && (
          <section
            aria-labelledby="shelf-title"
            className="mb-10 rounded-2xl border border-library-border/80 bg-library-surface/50 p-5 sm:p-7 shadow-sm"
          >
            <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <div>
                <h2 id="shelf-title" className="font-brand text-xl font-semibold text-library-ink sm:text-2xl">
                  Estante de Leituras
                </h2>
                <p className="text-xs sm:text-sm text-library-muted">
                  Acesso rápido aos livros em sua coleção
                </p>
              </div>
              <span className="text-xs text-library-muted">
                {visibleBooks.length} {visibleBooks.length === 1 ? 'livro visível' : 'livros visíveis'}
              </span>
            </div>

            <div className="mt-4">
              <BookCarousel books={visibleBooks} onOpen={openReader} />
            </div>
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

