'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BookOpen, Play, Trash2, Loader2, Clock, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDuration, formatPosition, getBookReadingState, type DashboardBook } from '@/lib/books/progress'

type BookListItemProps = {
  book: DashboardBook
  isLastRead: boolean
  view: 'list' | 'grid'
  onDeleted?: (bookId: string, bookName: string) => void
}

function BookCover({
  name,
  coverUrl,
  size = 'md',
}: {
  name: string
  coverUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
}) {
  const [imageError, setImageError] = useState(false)
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toLocaleUpperCase('pt-BR')

  const sizeClasses =
    size === 'lg'
      ? 'h-48 w-32 sm:h-52 sm:w-34'
      : size === 'md'
        ? 'h-24 w-16 sm:h-28 sm:w-20'
        : 'h-20 w-14'

  if (coverUrl && !imageError) {
    return (
      <div className={`relative shrink-0 ${sizeClasses} rounded-md overflow-hidden book-spine-effect bg-library-selected`}>
        <img
          src={coverUrl}
          alt={`Capa de ${name}`}
          className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
          onError={() => setImageError(true)}
        />
        <div className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-inset ring-white/10" />
      </div>
    )
  }

  return (
    <div
      className={`relative shrink-0 ${sizeClasses} rounded-md book-spine-effect border border-library-border/80 bg-library-selected flex flex-col justify-between p-2 text-center select-none`}
      aria-hidden="true"
    >
      <span className="text-[8px] uppercase tracking-wider text-library-muted">Auditeca</span>
      <div className="flex flex-1 items-center justify-center">
        <span className="font-brand text-sm sm:text-base font-bold text-library-accent">
          {initials || <BookOpen className="size-5 text-library-accent" />}
        </span>
      </div>
      <div className="h-0.5 w-full rounded-full bg-library-border/50" />
    </div>
  )
}

export function BookListItem({ book, isLastRead, view, onDeleted }: BookListItemProps) {
  const [isConfirming, setIsConfirming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const state = getBookReadingState(book)
  const isGrid = view === 'grid'
  const actionLabel = state === 'not-started' ? 'Iniciar' : 'Continuar'

  const statusBadge =
    state === 'completed' ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-library-success/15 px-2.5 py-0.5 text-[11px] font-medium text-library-success border border-library-success/20">
        <CheckCircle2 className="size-3" />
        Concluído
      </span>
    ) : state === 'in-progress' ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-library-accent/15 px-2.5 py-0.5 text-[11px] font-medium text-library-accent border border-library-accent/25">
        <span className="size-1.5 rounded-full bg-library-accent" />
        Em andamento
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full bg-library-selected px-2.5 py-0.5 text-[11px] font-medium text-library-muted border border-library-border/40">
        Novo
      </span>
    )

  async function handleDelete() {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/books?id=${encodeURIComponent(book.id)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Falha ao excluir o livro.')
      }
      onDeleted?.(book.id, book.name)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Erro ao excluir o livro')
      setIsDeleting(false)
    }
  }

  /* ──────────────────── Grid View ──────────────────── */
  if (isGrid) {
    return (
      <li className="group relative flex flex-col justify-between rounded-2xl border border-library-border/60 bg-library-surface/50 p-5 shadow-sm transition-all duration-200 hover:border-library-accent/40 hover:bg-library-surface/80 hover:shadow-md">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-2">
            {statusBadge}
            {isLastRead && (
              <span className="text-[11px] font-medium text-library-accent">
                Última leitura
              </span>
            )}
          </div>

          <div className="flex justify-center pt-2">
            <Link
              href={`/reader/${book.id}`}
              className="outline-none focus-visible:ring-2 focus-visible:ring-library-accent rounded-md"
              tabIndex={-1}
            >
              <BookCover name={book.name} coverUrl={book.coverUrl} size="lg" />
            </Link>
          </div>

          <div className="space-y-1.5 text-center sm:text-left">
            <h3 className="font-brand text-base font-semibold leading-snug text-library-ink line-clamp-2 [overflow-wrap:anywhere]">
              <Link
                href={`/reader/${book.id}`}
                className="hover:text-library-accent transition-colors focus-visible:outline-2 focus-visible:outline-library-accent rounded-sm"
              >
                {book.name}
              </Link>
            </h3>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 text-xs text-library-muted">
              {book.durationSeconds && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" />
                  {formatDuration(book.durationSeconds)}
                </span>
              )}
              {book.currentTime > 0 && (
                <span>Posição: {formatPosition(book.currentTime)}</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3 pt-3 border-t border-library-border/40">
          {book.progressPercent !== null && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-library-muted">
                <span>Progresso</span>
                <span className="font-medium text-library-ink">{book.progressPercent}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-library-selected overflow-hidden">
                <div
                  className="h-full rounded-full bg-library-accent transition-all duration-300"
                  style={{ width: `${Math.max(2, book.progressPercent)}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            {isConfirming ? (
              <div className="flex flex-1 items-center justify-between gap-1 rounded-xl border border-red-500/30 bg-red-950/40 p-1">
                <span className="text-xs font-medium text-red-300 pl-2">Excluir?</span>
                <div className="flex gap-1">
                  <Button
                    size="xs"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="h-7 px-2 text-xs bg-red-600 text-white hover:bg-red-700"
                  >
                    {isDeleting ? <Loader2 className="size-3 animate-spin" /> : 'Sim'}
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => setIsConfirming(false)}
                    disabled={isDeleting}
                    className="h-7 px-2 text-xs text-library-muted hover:text-library-ink"
                  >
                    Não
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => setIsConfirming(true)}
                  className="size-9 rounded-lg text-library-muted hover:text-red-400 hover:bg-red-950/30 transition-colors"
                  aria-label={`Excluir livro: ${book.name}`}
                  title="Excluir livro"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </Button>

                <Button
                  render={<Link href={`/reader/${book.id}`} aria-label={`${actionLabel}: ${book.name}`} />}
                  className="h-9 flex-1 rounded-xl bg-library-accent px-3 text-xs sm:text-sm font-semibold text-library-accent-foreground transition-all hover:bg-library-accent/90 active:scale-[0.98]"
                >
                  <Play aria-hidden="true" className="size-3.5 fill-current" />
                  {actionLabel}
                </Button>
              </>
            )}
          </div>

          {deleteError && (
            <p className="text-center text-xs text-red-400">{deleteError}</p>
          )}
        </div>
      </li>
    )
  }

  /* ──────────────────── List View ──────────────────── */
  return (
    <li className="group flex min-w-0 items-center justify-between gap-4 p-4 sm:p-5 transition-colors hover:bg-library-selected/30">
      <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-5">
        <Link
          href={`/reader/${book.id}`}
          className="shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-library-accent rounded-md"
          tabIndex={-1}
        >
          <BookCover name={book.name} coverUrl={book.coverUrl} size="md" />
        </Link>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            {statusBadge}
            {isLastRead && (
              <span className="text-xs font-medium text-library-accent">
                Última leitura
              </span>
            )}
          </div>

          <h3 className="font-brand text-base sm:text-lg font-medium leading-snug text-library-ink [overflow-wrap:anywhere]">
            <Link
              href={`/reader/${book.id}`}
              className="hover:text-library-accent transition-colors focus-visible:outline-2 focus-visible:outline-library-accent rounded-sm"
            >
              {book.name}
            </Link>
          </h3>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-library-muted">
            {book.currentTime > 0 && (
              <span>
                Posição: <strong className="font-medium text-library-ink">{formatPosition(book.currentTime)}</strong>
              </span>
            )}
            {book.durationSeconds && (
              <span>
                Duração: <strong className="font-medium text-library-ink">{formatDuration(book.durationSeconds)}</strong>
              </span>
            )}
            {book.progressPercent !== null && (
              <span className="text-library-accent font-medium">
                {book.progressPercent}%
              </span>
            )}
          </div>

          {book.progressPercent !== null && (
            <div className="relative h-1.5 max-w-xs overflow-hidden rounded-full bg-library-selected">
              <div
                className="h-full rounded-full bg-library-accent transition-all duration-300"
                style={{ width: `${Math.max(2, book.progressPercent)}%` }}
              />
            </div>
          )}

          {deleteError && (
            <p className="text-xs text-red-400">{deleteError}</p>
          )}
        </div>
      </div>

      {/* Row action controls */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {isConfirming ? (
          <div className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-950/40 p-1">
            <span className="text-xs font-medium text-red-300 pl-2 hidden sm:inline">Excluir?</span>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="h-8 px-2.5 text-xs bg-red-600 text-white hover:bg-red-700"
            >
              {isDeleting ? <Loader2 className="size-3 animate-spin" /> : 'Confirmar'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsConfirming(false)}
              disabled={isDeleting}
              className="h-8 px-2 text-xs text-library-muted hover:text-library-ink"
            >
              Cancelar
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            onClick={() => setIsConfirming(true)}
            className="size-10 rounded-xl text-library-muted hover:text-red-400 hover:bg-red-950/30 transition-colors"
            aria-label={`Excluir livro: ${book.name}`}
            title="Excluir livro"
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </Button>
        )}

        <Button
          render={<Link href={`/reader/${book.id}`} aria-label={`${actionLabel}: ${book.name}`} />}
          className="h-10 rounded-xl bg-library-accent px-4 text-xs sm:text-sm font-semibold text-library-accent-foreground shadow-sm transition-all hover:bg-library-accent/90 active:scale-[0.98]"
        >
          <Play aria-hidden="true" className="size-3.5 fill-current" />
          <span>{actionLabel}</span>
        </Button>
      </div>
    </li>
  )
}

