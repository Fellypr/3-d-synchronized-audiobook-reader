import { Grid2X2, List, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatBookCount } from '@/lib/books/progress'

export type LibraryFilter = 'all' | 'in-progress' | 'completed'
export type LibraryView = 'list' | 'grid'

const filterOptions: Array<{ value: LibraryFilter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'in-progress', label: 'Em andamento' },
  { value: 'completed', label: 'Concluídos' },
]

type LibraryToolbarProps = {
  query: string
  onQueryChange: (query: string) => void
  filter: LibraryFilter
  onFilterChange: (filter: LibraryFilter) => void
  view: LibraryView
  onViewChange: (view: LibraryView) => void
  count: number
}

export function LibraryToolbar({
  query,
  onQueryChange,
  filter,
  onFilterChange,
  view,
  onViewChange,
  count,
}: LibraryToolbarProps) {
  return (
    <div className="flex flex-col gap-3.5">
      {/* Search Bar */}
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-library-muted"
        />
        <Input
          type="search"
          value={query}
          onValueChange={onQueryChange}
          aria-label="Buscar livros"
          placeholder="Buscar na sua estante por título..."
          className="h-11 rounded-xl border-library-border/80 bg-library-surface/60 pl-10 pr-9 text-sm text-library-ink placeholder:text-library-muted/80 transition-all focus-visible:border-library-accent focus-visible:bg-library-surface focus-visible:ring-library-accent/20"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            aria-label="Limpar busca"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-library-muted hover:text-library-ink transition-colors"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Filter Tabs & View Toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Segmented Filter Pills */}
        <div
          className="inline-flex items-center rounded-xl border border-library-border/60 bg-library-surface/60 p-1"
          role="group"
          aria-label="Filtrar biblioteca"
        >
          {filterOptions.map((option) => {
            const isActive = filter === option.value
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => onFilterChange(option.value)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'border border-library-accent/30 bg-library-selected text-library-ink shadow-xs'
                    : 'text-library-muted hover:text-library-ink'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>

        {/* Count & View Mode Toggle */}
        <div className="flex items-center justify-between sm:justify-end gap-3.5">
          <p className="text-xs text-library-muted" aria-live="polite">
            {formatBookCount(count)}
          </p>

          <div
            className="inline-flex items-center rounded-xl border border-library-border/60 bg-library-surface/60 p-1"
            role="group"
            aria-label="Modo de visualização"
          >
            <button
              type="button"
              aria-label="Visualização em lista"
              aria-pressed={view === 'list'}
              onClick={() => onViewChange('list')}
              className={`rounded-lg p-1.5 transition-all duration-150 ${
                view === 'list'
                  ? 'border border-library-accent/30 bg-library-selected text-library-accent shadow-xs'
                  : 'text-library-muted hover:text-library-ink'
              }`}
            >
              <List aria-hidden="true" className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Visualização em grade"
              aria-pressed={view === 'grid'}
              onClick={() => onViewChange('grid')}
              className={`rounded-lg p-1.5 transition-all duration-150 ${
                view === 'grid'
                  ? 'border border-library-accent/30 bg-library-selected text-library-accent shadow-xs'
                  : 'text-library-muted hover:text-library-ink'
              }`}
            >
              <Grid2X2 aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

