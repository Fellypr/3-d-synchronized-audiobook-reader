import Link from 'next/link'
import { BookOpen, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress, ProgressIndicator, ProgressTrack } from '@/components/ui/progress'
import { formatDuration, formatPosition, getBookReadingState, type DashboardBook } from '@/lib/books/progress'

type BookListItemProps = {
  book: DashboardBook
  isLastRead: boolean
  view: 'list' | 'grid'
}

function CoverMark({ name }: { name: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase('pt-BR')
  return (
    <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-library-selected text-sm font-semibold tracking-wide text-library-accent" aria-hidden="true">
      {initials || <BookOpen className="size-5" />}
    </span>
  )
}

function BookProgress({ book }: { book: DashboardBook }) {
  const state = getBookReadingState(book)
  const statusLabel = state === 'completed' ? 'Concluído' : state === 'in-progress' ? 'Em andamento' : 'Ainda não iniciado'

  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-sm font-medium text-library-ink">{statusLabel}</span>
        {book.currentTime > 0 && <span className="text-sm text-library-muted">Posição salva · {formatPosition(book.currentTime)}</span>}
        {book.durationSeconds && <span className="text-sm text-library-muted">Duração · {formatDuration(book.durationSeconds)}</span>}
      </div>
      {book.progressPercent !== null && (
        <Progress value={book.progressPercent} aria-label={`Progresso de leitura: ${book.progressPercent}%`} className="mt-2 max-w-sm">
          <ProgressTrack className="h-1.5 rounded-full bg-library-border">
            <ProgressIndicator className="rounded-full bg-library-accent" />
          </ProgressTrack>
        </Progress>
      )}
    </div>
  )
}

export function BookListItem({ book, isLastRead, view }: BookListItemProps) {
  const state = getBookReadingState(book)
  const isGrid = view === 'grid'
  const actionLabel = state === 'not-started' ? 'Iniciar leitura' : 'Retomar leitura'

  return (
    <li className={`group flex min-w-0 items-center gap-4 py-4 ${isGrid ? 'flex-col items-stretch border-b border-library-border sm:flex-row' : 'border-b border-library-border'}`}>
      <CoverMark name={book.name} />
      <div className={`min-w-0 flex-1 ${isGrid ? 'w-full' : ''}`}>
        <div className="flex min-w-0 flex-wrap items-start gap-x-3 gap-y-1">
          <h3 className="min-w-0 break-words font-display text-lg leading-snug text-library-ink [overflow-wrap:anywhere]">{book.name}</h3>
          {isLastRead && <span className="mt-0.5 shrink-0 text-sm font-medium text-library-accent">Última leitura</span>}
        </div>
        <div className={`mt-2 flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2 ${isGrid ? 'sm:justify-between' : ''}`}>
          <BookProgress book={book} />
          <Button
            render={<Link href={`/reader/${book.id}`} aria-label={`${actionLabel}: ${book.name}`} />}
            className="h-11 shrink-0 bg-library-accent text-library-accent-foreground hover:bg-library-accent/90"
          >
            <Play aria-hidden="true" className="size-4 fill-current" />
            {actionLabel}
          </Button>
        </div>
      </div>
    </li>
  )
}
