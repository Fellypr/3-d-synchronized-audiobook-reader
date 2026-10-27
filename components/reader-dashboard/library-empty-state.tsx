import { BookOpen, SearchX, Plus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

type LibraryEmptyStateProps = {
  kind: 'library' | 'search' | 'filter'
  query?: string
  activeFilter?: string
  onAddBook: () => void
  onClearSearch: () => void
  onShowAll: () => void
}

export function LibraryEmptyState({
  kind,
  query,
  activeFilter,
  onAddBook,
  onClearSearch,
  onShowAll,
}: LibraryEmptyStateProps) {
  if (kind === 'library') {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-library-border/80 bg-library-surface/40 p-8 sm:p-12 text-center shadow-sm">
        <div className="pointer-events-none absolute -bottom-16 left-1/2 -translate-x-1/2 size-48 rounded-full bg-library-accent/5 blur-2xl" />

        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-library-border bg-library-selected text-library-accent shadow-sm">
          <BookOpen aria-hidden="true" className="size-8" />
        </div>

        <h2 className="mt-5 font-brand text-2xl font-medium text-library-ink sm:text-3xl">
          Sua estante aguarda o primeiro livro
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-library-muted">
          Carregue um audiolivro com mapa de palavras sincronizado ou use inteligência artificial para narrar seus documentos PDF e DOCX automaticamente.
        </p>

        <div className="mt-6 flex justify-center">
          <Button
            onClick={onAddBook}
            className="h-11 rounded-xl bg-library-accent px-5 font-semibold text-library-accent-foreground shadow-sm transition-all hover:bg-library-accent/90 hover:shadow active:scale-[0.98]"
          >
            <Plus aria-hidden="true" className="size-4" />
            <span>Adicionar primeiro livro</span>
          </Button>
        </div>
      </div>
    )
  }

  const isSearch = kind === 'search'
  return (
    <div className="rounded-2xl border border-library-border/60 bg-library-surface/30 p-8 sm:p-10 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-xl border border-library-border/70 bg-library-selected text-library-muted">
        <SearchX aria-hidden="true" className="size-6" />
      </div>

      <h2 className="mt-4 font-brand text-lg font-medium text-library-ink">
        {isSearch ? `Nenhum título encontrado para "${query}"` : `Nenhum livro ${activeFilter?.toLowerCase() ?? 'nesta categoria'}`}
      </h2>

      <p className="mx-auto mt-1 max-w-sm text-xs sm:text-sm text-library-muted">
        {isSearch
          ? 'Verifique a ortografia do título digitado ou limpe a pesquisa para visualizar sua estante completa.'
          : 'Sua coleção não possui nenhum exemplar com este status no momento.'}
      </p>

      <div className="mt-5 flex justify-center">
        <Button
          variant="outline"
          className="h-10 rounded-xl border-library-border/80 bg-library-surface px-4 text-xs sm:text-sm font-medium text-library-ink hover:border-library-accent/50 hover:bg-library-selected transition-colors"
          onClick={isSearch ? onClearSearch : onShowAll}
        >
          {isSearch ? 'Limpar busca' : 'Ver todos os livros'}
        </Button>
      </div>
    </div>
  )
}

