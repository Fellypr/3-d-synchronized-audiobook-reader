'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  Bell,
  BellRing,
  CheckCircle2,
  Clock,
  Headphones,
  Play,
  Radio,
  Sparkles,
  X,
  ExternalLink,
} from 'lucide-react'

export type ProcessingBookItem = {
  id: string
  name: string
  status: string
  jobId?: string | null
  completedParts?: number | null
  totalParts?: number | null
  updatedAt?: Date | string | null
}

export function NotificationBell({
  processingBooks = [],
  completedBooks = [],
}: {
  processingBooks: ProcessingBookItem[]
  completedBooks: ProcessingBookItem[]
}) {
  const [isOpen, setIsOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const activeCount = processingBooks.length
  const hasActive = activeCount > 0

  // Fechar ao clicar fora ou apertar Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Últimos concluídos (máximo 3)
  const recentCompleted = completedBooks.slice(0, 3)

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={hasActive ? `${activeCount} processamento(s) em andamento` : 'Notificações'}
        className={`relative flex size-10 items-center justify-center rounded-xl border transition-all ${
          hasActive
            ? 'border-amber-500/40 bg-amber-500/10 text-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.2)] hover:bg-amber-500/20'
            : 'border-library-border/50 bg-library-page/50 text-library-muted hover:border-library-border hover:bg-library-surface hover:text-library-ink'
        }`}
      >
        {hasActive ? (
          <>
            <BellRing className="size-5 animate-pulse text-amber-500" />
            <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black shadow ring-2 ring-library-page">
              {activeCount}
            </span>
          </>
        ) : (
          <Bell className="size-5" />
        )}
      </button>

      {/* Popover suspenso de Notificações */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-12 z-50 w-[340px] sm:w-[380px] rounded-2xl border border-library-border/70 bg-[#161a22]/95 p-4 text-library-ink shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Topo do Popover */}
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-library-accent/15 text-library-accent">
                <Bell className="size-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-white">Central de Tarefas</h3>
                <p className="text-[10px] text-library-muted">Sincronização de audiolivros</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasActive && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-400 ring-1 ring-amber-500/30">
                  {activeCount} gerando
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-library-muted hover:bg-white/5 hover:text-white"
                aria-label="Fechar"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div className="mt-3 max-h-[380px] space-y-3 overflow-y-auto pr-1">
            {/* Seção 1: Livros em Processamento Ativo */}
            {hasActive && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-medium text-amber-400/90">
                  <span className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-amber-400 animate-ping" />
                    Em 2º plano na nuvem
                  </span>
                  <span className="text-[10px] text-library-muted">Atualização contínua</span>
                </div>

                {processingBooks.map((b) => {
                  const comp = Number(b.completedParts) || 0
                  const total = Number(b.totalParts) || 0
                  const remaining = Math.max(0, total - comp)
                  const percent = total > 0 ? Math.round((comp / total) * 100) : 0

                  return (
                    <div
                      key={b.id}
                      className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="line-clamp-1 text-xs font-semibold text-white" title={b.name}>
                          {b.name}
                        </span>
                        <span className="shrink-0 text-xs font-bold text-amber-400">{percent}%</span>
                      </div>

                      {/* Barra de Progresso */}
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(3, percent))}%` }}
                        />
                      </div>

                      {/* Contador de Partes Detalhado */}
                      <div className="mt-2 flex items-center justify-between text-[10px]">
                        <span className="text-white/80">
                          {total > 0 ? (
                            <>
                              Parte <strong className="text-amber-400">{comp}</strong> de {total}
                            </>
                          ) : (
                            'Iniciando sintetização...'
                          )}
                        </span>
                        <span className="text-library-muted">
                          {remaining > 0 ? `Faltam ${remaining} partes` : 'Quase pronto...'}
                        </span>
                      </div>

                      <p className="mt-1.5 text-[9px] text-library-muted/80 leading-relaxed">
                        💡 Você pode fechar o site ou navegar; a IA continua gerando o áudio na nuvem.
                      </p>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Seção 2: Concluídos Recentemente */}
            {recentCompleted.length > 0 && (
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-medium text-library-muted">Prontos para ouvir</span>

                {recentCompleted.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-2.5 hover:bg-white/[0.05] transition-colors"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                        <CheckCircle2 className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <span className="block truncate text-xs font-medium text-white/90" title={b.name}>
                          {b.name}
                        </span>
                        <span className="text-[10px] text-emerald-400/80">100% concluído</span>
                      </div>
                    </div>

                    <Link
                      href={`/reader/${b.id}`}
                      onClick={() => setIsOpen(false)}
                      className="flex shrink-0 items-center gap-1 rounded-lg bg-library-accent/15 px-2.5 py-1 text-[11px] font-medium text-library-accent hover:bg-library-accent hover:text-black transition-colors"
                    >
                      <Play className="size-3 fill-current" />
                      <span>Ouvir</span>
                    </Link>
                  </div>
                ))}
              </div>
            )}

            {/* Estado Vazio */}
            {!hasActive && recentCompleted.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <span className="flex size-10 items-center justify-center rounded-full bg-white/5 text-library-muted mb-2">
                  <CheckCircle2 className="size-5" />
                </span>
                <p className="text-xs font-medium text-white/80">Tudo em dia!</p>
                <p className="mt-1 max-w-[240px] text-[10px] text-library-muted leading-relaxed">
                  Nenhum livro sendo gerado no momento. Ao adicionar um novo audiolivro, você poderá acompanhar o progresso aqui.
                </p>
              </div>
            )}
          </div>

          {/* Rodapé informativo */}
          <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2.5 text-[9px] text-library-muted">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              VPS Motor de IA Online
            </span>
            <span>Auditeca v2.0</span>
          </div>
        </div>
      )}
    </div>
  )
}
