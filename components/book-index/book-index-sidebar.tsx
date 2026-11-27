'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bookmark,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  Trash2,
  X,
} from 'lucide-react'
import type { BookIndexItem, BookIndexSidebarProps } from '@/types/book-index'
import { getCategoryConfig } from '@/types/bookmark'
import type { BookmarkItem } from '@/types/bookmark'

function isItemActive(
  item: BookIndexItem,
  allItems: BookIndexItem[],
  currentPage: number
): boolean {
  const itemIndex = allItems.findIndex((it) => it.id === item.id)
  const nextPage =
    itemIndex >= 0 && itemIndex + 1 < allItems.length
      ? allItems[itemIndex + 1].pageNumber
      : Infinity

  return currentPage >= item.pageNumber && currentPage < nextPage
}

function formatAudioTime(seconds: number | null | undefined): string | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) return null
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatBookmarkDate(dateInput: string | Date | undefined): string {
  if (!dateInput) return ''
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  } catch {
    return ''
  }
}

export function BookIndexSidebar({
  isOpen,
  onClose,
  items,
  currentPage,
  currentSpreadPage,
  totalPages,
  onSelectPage,
  bookmarks = [],
  onSelectBookmark,
  onDeleteBookmark,
  isDeletingBookmarkId,
}: BookIndexSidebarProps) {
  const [activeTab, setActiveTab] = useState<'chapters' | 'bookmarks'>('chapters')

  // Set of expanded item ids
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    items.forEach((parent) => {
      if (parent.items && parent.items.length > 0) {
        if (isItemActive(parent, items, currentPage)) {
          initial.add(parent.id)
        }
      }
    })
    return initial
  })

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Active section identification
  const activeChapterId = useMemo(() => {
    for (let i = 0; i < items.length; i++) {
      const cur = items[i]
      const next = items[i + 1]
      const nextStart = next ? next.pageNumber : totalPages + 1
      if (currentPage >= cur.pageNumber && currentPage < nextStart) {
        return cur.id
      }
    }
    return items[0]?.id
  }, [currentPage, items, totalPages])

  // Auto-expand active chapter when reading progresses
  useEffect(() => {
    if (!activeChapterId) return
    setExpandedIds((prev) => {
      if (prev.has(activeChapterId)) return prev
      const next = new Set(prev)
      next.add(activeChapterId)
      return next
    })
  }, [activeChapterId])

  // Close sidebar on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const progressPercent =
    totalPages > 0 ? Math.min(100, Math.max(0, Math.round((currentPage / totalPages) * 100))) : 0

  const spreadEnd = currentSpreadPage ?? Math.min(totalPages, currentPage + 1)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop on mobile screens to dismiss */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
            aria-hidden="true"
          />

          <motion.aside
            id="book-index-sidebar"
            key="book-index-sidebar"
            initial={{ opacity: 0, x: -24, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -24, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            role="dialog"
            aria-label="Índice e marcadores do livro"
            className="fixed top-20 left-4 z-40 flex w-[300px] max-h-[calc(100vh-120px)] flex-col overflow-hidden rounded-[16px] border border-[#36342d] bg-[#111419] shadow-[-12px_16px_40px_0px_rgba(0,0,0,0.5)] text-[#f2eee6] select-none"
          >
            {/* Header */}
            <div className="flex items-start justify-between p-4 pb-2.5">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-[#f2eee6]">
                  {activeTab === 'chapters' ? 'Índice do livro' : 'Marcadores Salvos'}
                </h2>
                <p className="text-xs text-[#a5a6aa]">
                  {activeTab === 'chapters' ? 'Capítulos e seções' : `${bookmarks.length} ponto(s) marcado(s)`}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex size-7 items-center justify-center rounded-lg text-[#a5a6aa] hover:bg-white/10 hover:text-[#f2eee6] active:scale-95 transition-all"
                aria-label="Fechar painel"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Navigation Tabs (Capítulos vs Marcadores) */}
            <div className="flex px-3 pt-1 pb-2 border-b border-[#2a2d33] gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('chapters')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'chapters'
                    ? 'bg-[#30281a] text-[#f29b08] shadow-xs'
                    : 'text-[#a5a6aa] hover:bg-white/5 hover:text-[#d7d5d0]'
                }`}
              >
                <FileText className="size-3.5" />
                <span>Capítulos</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('bookmarks')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'bookmarks'
                    ? 'bg-[#30281a] text-[#f29b08] shadow-xs'
                    : 'text-[#a5a6aa] hover:bg-white/5 hover:text-[#d7d5d0]'
                }`}
              >
                <Bookmark className="size-3.5" />
                <span>Marcadores ({bookmarks.length})</span>
              </button>
            </div>

            {/* Tab: Capítulos */}
            {activeTab === 'chapters' && (
              <>
                {/* Label EM LEITURA */}
                <div className="px-4 pt-3 pb-1">
                  <span className="text-[10px] font-bold uppercase tracking-[1.6px] text-[#e2ab4b]">
                    EM LEITURA
                  </span>
                </div>

                {/* Chapters and Subsections List */}
                <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1 scrollbar-thin scrollbar-thumb-white/10">
                  {items.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#a5a6aa]">
                      Nenhum capítulo encontrado.
                    </div>
                  ) : (
                    items.map((item, index) => {
                      const hasChildren = Boolean(item.items && item.items.length > 0)
                      const isExpanded = expandedIds.has(item.id)
                      const isActive = activeChapterId === item.id

                      let activeChildId: string | null = null
                      if (hasChildren && item.items) {
                        for (let c = 0; c < item.items.length; c++) {
                          const child = item.items[c]
                          const nextChild = item.items[c + 1]
                          const nextChildPage = nextChild
                            ? nextChild.pageNumber
                            : (items[index + 1]?.pageNumber ?? totalPages + 1)
                          if (currentPage >= child.pageNumber && currentPage < nextChildPage) {
                            activeChildId = child.id
                            break
                          }
                        }
                      }

                      const isParentHighlight = isActive && !activeChildId

                      return (
                        <div key={item.id} className="space-y-0.5">
                          {/* Main Chapter Row */}
                          <div
                            onClick={() => {
                              onSelectPage(item.pageNumber)
                              if (hasChildren && !isExpanded) {
                                setExpandedIds((prev) => new Set(prev).add(item.id))
                              }
                            }}
                            className={`group relative flex cursor-pointer items-center justify-between rounded-[8px] px-3 py-2 text-xs transition-all ${
                              isParentHighlight
                                ? 'bg-[#30281a] text-[#f3ba55] font-semibold'
                                : 'text-[#d7d5d0] hover:bg-white/5'
                            }`}
                          >
                            {/* Left Active Orange Bar */}
                            {isParentHighlight && (
                              <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-[2px] bg-[#f29b08]" />
                            )}

                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              {hasChildren ? (
                                <button
                                  type="button"
                                  onClick={(e) => toggleExpand(item.id, e)}
                                  className="flex size-4 items-center justify-center text-[#a5a6aa] group-hover:text-white transition-colors"
                                  aria-label={isExpanded ? 'Recolher seção' : 'Expandir seção'}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="size-3.5" />
                                  ) : (
                                    <ChevronRight className="size-3.5" />
                                  )}
                                </button>
                              ) : (
                                <span className="size-4 shrink-0" />
                              )}
                              <div className="truncate">
                                <span className="truncate">{item.title}</span>
                                {isParentHighlight && (
                                  <span className="block text-[10px] font-normal text-[#d2ab6a]">
                                    Lendo agora
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Page number badge */}
                            <span className="text-[10px] font-mono text-[#a5a6aa] shrink-0">
                              p. {item.pageNumber}
                            </span>
                          </div>

                          {/* Subsections if expanded */}
                          {hasChildren && isExpanded && item.items && (
                            <div className="ml-5 pl-2 border-l border-[#2a2d33] space-y-0.5">
                              {item.items.map((sub) => {
                                const isSubActive = activeChildId === sub.id

                                return (
                                  <div
                                    key={sub.id}
                                    onClick={() => onSelectPage(sub.pageNumber)}
                                    className={`relative flex cursor-pointer items-center justify-between rounded-[6px] px-2.5 py-1.5 text-[11px] transition-all ${
                                      isSubActive
                                        ? 'bg-[#30281a] text-[#f3ba55] font-medium'
                                        : 'text-[#a5a6aa] hover:bg-white/5 hover:text-[#d7d5d0]'
                                    }`}
                                  >
                                    {isSubActive && (
                                      <div className="absolute left-0 top-1 bottom-1 w-[2.5px] rounded-r-[2px] bg-[#f29b08]" />
                                    )}
                                    <div className="truncate pr-2">
                                      <span className="truncate">{sub.title}</span>
                                      {isSubActive && (
                                        <span className="block text-[9px] font-normal text-[#d2ab6a]">
                                          Lendo agora
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] font-mono text-[#7e8085] shrink-0">
                                      p. {sub.pageNumber}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </>
            )}

            {/* Tab: Marcadores */}
            {activeTab === 'bookmarks' && (
              <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-2 scrollbar-thin scrollbar-thumb-white/10">
                {bookmarks.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#a5a6aa] space-y-2">
                    <Bookmark className="size-8 mx-auto text-[#36342d]" />
                    <p>Nenhum marcador criado ainda.</p>
                    <p className="text-[11px] text-[#7e8085]">
                      Use o ícone de marcador na barra superior para guardar trechos inteligentes do livro.
                    </p>
                  </div>
                ) : (
                  bookmarks.map((bm) => {
                    const audioTimeStr = formatAudioTime(bm.audioTimeSeconds)
                    const dateStr = formatBookmarkDate(bm.createdAt)
                    const isDeleting = isDeletingBookmarkId === bm.id
                    const cat = getCategoryConfig(bm.category)
                    const markerColor = bm.color || cat.color

                    return (
                      <div
                        key={bm.id}
                        onClick={() => {
                          if (onSelectBookmark && !isDeleting) {
                            onSelectBookmark(bm)
                          }
                        }}
                        className="group relative flex flex-col gap-1.5 rounded-[10px] border border-[#36342d]/80 bg-[#171b22] p-3 text-xs cursor-pointer hover:border-[#e2ab4b]/50 hover:bg-[#1d222b] transition-all"
                      >
                        {/* Top: Category Dot + Title/Chapter & Delete Button */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span
                                className="size-2 rounded-full shrink-0"
                                style={{ backgroundColor: markerColor }}
                              />
                              <span
                                className="text-[10px] font-semibold uppercase tracking-wider"
                                style={{ color: markerColor }}
                              >
                                {cat.label}
                              </span>
                            </div>
                            <p className="text-[11px] font-semibold text-[#f2eee6] truncate">
                              {bm.title || bm.chapter || 'Marcador'}
                            </p>
                          </div>
                          {onDeleteBookmark && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                void onDeleteBookmark(bm.id)
                              }}
                              disabled={isDeleting}
                              className="shrink-0 p-1 rounded-md text-[#7e8085] hover:bg-red-500/10 hover:text-red-400 active:scale-90 transition-all"
                              title="Excluir marcador"
                              aria-label="Excluir marcador"
                            >
                              {isDeleting ? (
                                <Loader2 className="size-3.5 animate-spin text-[#e2ab4b]" />
                              ) : (
                                <Trash2 className="size-3.5" />
                              )}
                            </button>
                          )}
                        </div>

                        {/* Selected Text / Quote */}
                        <div className="border-l-2 pl-2.5 py-0.5" style={{ borderColor: markerColor }}>
                          <p className="text-[#f2eee6] font-serif text-[12px] italic leading-snug line-clamp-2">
                            &ldquo;{bm.selectedText}&rdquo;
                          </p>
                        </div>

                        {/* Bottom Metadata: Page, Audio Time & Date */}
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-[#a5a6aa] pt-1 border-t border-white/5">
                          {bm.pageNumber && (
                            <span className="font-mono text-[#d7d5d0]">
                              p. {bm.pageNumber}
                            </span>
                          )}

                          {audioTimeStr && (
                            <span className="flex items-center gap-1 font-mono text-[#e2ab4b]">
                              <Clock className="size-3" />
                              {audioTimeStr}
                            </span>
                          )}

                          {dateStr && (
                            <span className="ml-auto text-[9px] text-[#7e8085]">
                              {dateStr}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {/* Divisor */}
            <div className="h-[1px] w-full bg-[#2a2d33]" />

            {/* Footer: Leitura & Progresso */}
            <div className="p-4 pt-3 bg-[#111419]">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-[#a5a6aa] font-medium">Sua leitura</span>
                <span className="text-[#e2ab4b] font-bold font-mono">{progressPercent}%</span>
              </div>

              {/* Progress bar */}
              <div className="h-[4px] w-full rounded-full bg-[#34363c] overflow-hidden">
                <div
                  className="h-full bg-[#e49a22] transition-[width] duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="mt-2 text-right">
                <span className="text-[10px] font-mono text-[#a5a6aa]">
                  Páginas {currentPage}–{spreadEnd} de {totalPages}
                </span>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
