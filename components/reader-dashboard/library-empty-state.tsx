import { BookOpen, SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'

type LibraryEmptyStateProps = {
  kind: 'library' | 'search' | 'filter'
  query?: string
  activeFilter?: string
  onAddBook: () => void
  onClearSearch: () => void
  onShowAll: () => void
}

export function LibraryEmptyState({ kind, query, activeFilter, onAddBook, onClearSearch, onShowAll }: LibraryEmptyStateProps) {
  if (kind === 'library') {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-library-border px-5 py-12 text-center">
        <BookOpen aria-hidden="true" className="size-8 text-library-muted" />
        <h2 className="mt-4 font-display text-2xl font-medium">Sua biblioteca está vazia</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-library-muted">Adicione um audiobook e seu mapa de palavras para começar.</p>
        <Button className="mt-5 h-11 bg-library-accent text-library-accent-foreground hover:bg-library-accent/90" onClick={onAddBook}>Adicionar livro</Button>
      </div>
    )
  }

  const isSearch = kind === 'search'
  return (
    <div className="flex min-h-48 flex-col items-center justify-center border-y border-library-border px-5 py-10 text-center">
      <SearchX aria-hidden="true" className="size-6 text-library-muted" />
      <h2 className="mt-3 text-base font-semibold text-library-ink">
        {isSearch ? `Nenhum livro encontrado para “${query}”` : `Nenhum livro ${activeFilter?.toLowerCase() ?? 'nesta categoria'}`}
      </h2>
      <p className="mt-1 text-sm text-library-muted">
        {isSearch ? 'Confira o título digitado ou limpe a busca para ver todos os livros.' : 'A coleção não tem livros com este estado neste momento.'}
      </p>
      <Button variant="outline" className="mt-4 h-11" onClick={isSearch ? onClearSearch : onShowAll}>
        {isSearch ? 'Limpar busca' : 'Ver todos os livros'}
      </Button>
    </div>
  )
}
