import { Grid2X2, List, Search } from 'lucide-react'
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

export function LibraryToolbar({ query, onQueryChange, filter, onFilterChange, view, onViewChange, count }: LibraryToolbarProps) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-library-muted" />
        <Input
          type="search"
          value={query}
          onValueChange={onQueryChange}
          aria-label="Buscar livros"
          placeholder="Buscar livros pelo título"
          className="h-12 rounded-xl border-library-border bg-library-surface pl-10 pr-4 text-library-ink placeholder:text-library-muted focus-visible:border-library-accent focus-visible:ring-library-accent/25"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar biblioteca">
          {filterOptions.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={filter === option.value ? 'secondary' : 'ghost'}
              aria-pressed={filter === option.value}
              className={`h-11 px-4 ${filter === option.value ? 'bg-library-selected text-library-ink' : 'text-library-muted'}`}
              onClick={() => onFilterChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-library-muted" aria-live="polite">{formatBookCount(count)}</p>
          <div className="flex gap-1" role="group" aria-label="Modo de visualização">
            <Button type="button" variant="ghost" aria-label="Visualização em lista" aria-pressed={view === 'list'} className={`size-11 ${view === 'list' ? 'bg-library-selected text-library-ink' : 'text-library-muted'}`} onClick={() => onViewChange('list')}>
              <List aria-hidden="true" className="size-5" />
            </Button>
            <Button type="button" variant="ghost" aria-label="Visualização em grade" aria-pressed={view === 'grid'} className={`size-11 ${view === 'grid' ? 'bg-library-selected text-library-ink' : 'text-library-muted'}`} onClick={() => onViewChange('grid')}>
              <Grid2X2 aria-hidden="true" className="size-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
