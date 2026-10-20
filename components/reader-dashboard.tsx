'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buildDashboardBooks, formatDuration, formatBookCount, getBookReadingState, type ProgressRecord, type BookRecord } from '@/lib/books/progress'
import { BookListItem } from '@/components/reader-dashboard/book-list-item'
import { LibraryEmptyState } from '@/components/reader-dashboard/library-empty-state'
import { LibraryToolbar, type LibraryFilter, type LibraryView } from '@/components/reader-dashboard/library-toolbar'
import { UploadBookDialog } from '@/components/reader-dashboard/upload-book-dialog'

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

  const visibleBooks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR')
    return dashboardBooks.filter((item) => {
      const state = getBookReadingState(item)
      const matchesFilter = filter === 'all'
        || (filter === 'in-progress' && state === 'in-progress')
        || (filter === 'completed' && state === 'completed')
      const matchesQuery = !normalizedQuery || item.name.toLocaleLowerCase('pt-BR').includes(normalizedQuery)
      return matchesFilter && matchesQuery
    })
  }, [dashboardBooks, filter, query])

  const lastReadId = dashboardBooks.find((item) => item.lastReadAt)?.id
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
    setUploadMessage(`Livro “${name}” excluído com sucesso.`)
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-library-page text-library-ink">
      <header className="border-b border-library-border/80">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-h-11 items-center gap-3 rounded-md text-library-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-library-accent" aria-label="ImmerseRead — início">
            <span className="flex size-9 items-center justify-center rounded-lg bg-library-ink text-library-page"><BookOpen aria-hidden="true" className="size-5" /></span>
            <span className="font-display text-lg font-semibold tracking-tight">ImmerseRead</span>
          </Link>
          <div className="flex items-center gap-3">
            {userName && <span className="hidden text-sm text-library-muted sm:block">Olá, {userName.split(' ')[0]}</span>}
            <Button onClick={() => { setUploadMessage(''); setUploadOpen(true) }} className="h-11 bg-library-accent px-4 text-library-accent-foreground hover:bg-library-accent/90">
              <Plus aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">Adicionar livro</span>
              <span className="sm:hidden">Adicionar</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-10 lg:px-8">
        <section aria-labelledby="library-title">
          <div className="flex flex-col gap-1 border-b border-library-border pb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <div>
              <h1 id="library-title" className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Biblioteca</h1>
              <p className="mt-2 text-sm text-library-muted">
                {countText} · {inProgressCount} {inProgressCount === 1 ? 'em andamento' : 'em andamento'}
                {hasMeasuredListening
                  ? ` · ${formatDuration(measuredListeningSeconds)} de tempo ouvido`
                  : ' · o tempo ouvido será medido a partir desta atualização'}
              </p>
            </div>
          </div>

          {uploadMessage && <p role="status" aria-live="polite" className="mt-4 rounded-lg bg-library-selected px-3 py-2 text-sm font-medium text-library-ink">{uploadMessage}</p>}

          <div className="mt-5">
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
            <ul className={view === 'grid' ? 'mt-4 grid gap-x-8 sm:grid-cols-2' : 'mt-4'} aria-label="Livros da biblioteca">
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
            <div className="mt-5">
              <LibraryEmptyState
                kind={emptyStateKind}
                query={query.trim()}
                activeFilter={filter === 'completed' ? 'concluídos' : 'em andamento'}
                onAddBook={() => setUploadOpen(true)}
                onClearSearch={() => setQuery('')}
                onShowAll={() => { setFilter('all'); setQuery('') }}
              />
            </div>
          )}
        </section>
      </div>

      <UploadBookDialog open={uploadOpen} onOpenChange={setUploadOpen} onAdded={showAddedBook} userId={userId} />
    </main>
  )
}
