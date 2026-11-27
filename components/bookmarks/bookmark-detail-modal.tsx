'use client'

import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowUpRight,
  Check,
  Edit3,
  GripHorizontal,
  Loader2,
  MessageSquarePlus,
  Trash2,
  X,
} from 'lucide-react'
import { getCategoryConfig, type BookmarkItem, type UpdateBookmarkPayload } from '@/types/bookmark'

interface BookmarkDetailModalProps {
  bookmark: BookmarkItem | null
  onClose: () => void
  onGoToBookmark: (bookmark: BookmarkItem) => void
  onUpdateBookmark: (payload: UpdateBookmarkPayload) => Promise<void>
  onDeleteBookmark: (id: string) => Promise<void>
}

export function BookmarkDetailModal({
  bookmark,
  onClose,
  onGoToBookmark,
  onUpdateBookmark,
  onDeleteBookmark,
}: BookmarkDetailModalProps) {
  const constraintsRef = useRef<HTMLDivElement>(null)
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingNote, setEditingNote] = useState(false)
  const [titleValue, setTitleValue] = useState('')
  const [noteValue, setNoteValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!bookmark) return
    setTitleValue(bookmark.title || '')
    setNoteValue(bookmark.note || '')
    setEditingTitle(false)
    setEditingNote(false)
  }, [bookmark])

  useEffect(() => {
    if (!bookmark) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [bookmark, onClose])

  const handleSaveTitle = async () => {
    if (!bookmark || isSaving) return
    setIsSaving(true)
    try {
      await onUpdateBookmark({ id: bookmark.id, title: titleValue.trim() || null })
      setEditingTitle(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveNote = async () => {
    if (!bookmark || isSaving) return
    setIsSaving(true)
    try {
      await onUpdateBookmark({ id: bookmark.id, note: noteValue.trim() || null })
      setEditingNote(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!bookmark || isDeleting) return
    setIsDeleting(true)
    try {
      await onDeleteBookmark(bookmark.id)
      onClose()
    } finally {
      setIsDeleting(false)
    }
  }

  const cat = getCategoryConfig(bookmark?.category)

  return (
    <AnimatePresence>
      {bookmark && (
        <div
          ref={constraintsRef}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
        >
          <motion.div
            key={bookmark.id}
            drag
            dragConstraints={constraintsRef}
            dragMomentum={false}
            dragElastic={0.04}
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            role="dialog"
            aria-label="Detalhes do marcador"
            className="w-full max-w-[340px] pointer-events-auto rounded-2xl border border-[#36342d] bg-[#111419]/98 text-[#f2eee6] shadow-[0_24px_60px_rgba(0,0,0,0.75)] backdrop-blur-xl overflow-hidden"
          >
            {/* Barra de arraste superior */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[#2a2d33] cursor-grab active:cursor-grabbing select-none">
              <div className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: bookmark.color || cat.color }}
                />
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: bookmark.color || cat.color }}>
                  {cat.label}
                </span>
              </div>

              <GripHorizontal className="size-4 text-[#a5a6aa]/60" />

              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={onClose}
                className="flex size-6 items-center justify-center rounded-full text-[#a5a6aa] hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Fechar modal"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {/* Conteúdo do Marcador */}
            <div className="p-4 space-y-3" onPointerDown={(e) => e.stopPropagation()}>
              {/* Título */}
              {editingTitle ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={titleValue}
                    onChange={(e) => setTitleValue(e.target.value)}
                    placeholder="Título do marcador..."
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleSaveTitle()
                    }}
                    className="flex-1 rounded-lg border border-[#36342d] bg-[#0b0e12] px-2.5 py-1.5 text-sm text-[#f2eee6] outline-none focus:border-[#e2ab4b]"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSaveTitle()}
                    disabled={isSaving}
                    className="flex size-8 items-center justify-center rounded-lg bg-[#e2ab4b] text-[#111419] hover:bg-[#f3ba55] disabled:opacity-50"
                    aria-label="Salvar título"
                  >
                    {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                  </button>
                </div>
              ) : (
                <div>
                  <h3 className="text-sm font-semibold text-[#f2eee6] leading-snug">
                    {bookmark.title || bookmark.chapter || 'Marcador salvo'}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-[#a5a6aa]">
                    {bookmark.pageNumber ? `Página ${bookmark.pageNumber}` : 'Sem página'}
                    {bookmark.section ? ` · ${bookmark.section}` : ''}
                  </p>
                </div>
              )}

              {/* Trecho destacado */}
              <blockquote
                className="rounded-xl bg-white/[0.04] px-3 py-2 text-xs italic text-[#d0d7e0] leading-relaxed border-l-2 max-h-24 overflow-y-auto"
                style={{ borderColor: bookmark.color || cat.color }}
              >
                &ldquo;{bookmark.selectedText}&rdquo;
              </blockquote>

              {/* Anotação existente ou editor */}
              {editingNote ? (
                <div className="space-y-2">
                  <textarea
                    value={noteValue}
                    onChange={(e) => setNoteValue(e.target.value)}
                    placeholder="Escreva sua anotação sobre este trecho..."
                    rows={3}
                    autoFocus
                    className="w-full rounded-lg border border-[#36342d] bg-[#0b0e12] px-2.5 py-2 text-xs text-[#f2eee6] outline-none focus:border-[#e2ab4b] resize-none"
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingNote(false)}
                      className="rounded-lg px-2.5 py-1 text-xs text-[#a5a6aa] hover:bg-white/10"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveNote()}
                      disabled={isSaving}
                      className="flex items-center gap-1 rounded-lg bg-[#e2ab4b] px-3 py-1 text-xs font-semibold text-[#111419] hover:bg-[#f3ba55] disabled:opacity-50"
                    >
                      {isSaving && <Loader2 className="size-3 animate-spin" />}
                      Salvar nota
                    </button>
                  </div>
                </div>
              ) : bookmark.note ? (
                <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-[#c9cacd]">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#e2ab4b] mb-0.5">
                    Anotação
                  </span>
                  {bookmark.note}
                </div>
              ) : null}

              {/* 4 Opções solicitadas */}
              <div className="pt-1 border-t border-[#2a2d33] grid grid-cols-1 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    onGoToBookmark(bookmark)
                    onClose()
                  }}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#f3ba55] bg-[#30281a]/70 hover:bg-[#30281a] transition-colors"
                >
                  <ArrowUpRight className="size-4" />
                  <span>Ir para o trecho</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditingTitle(true)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#efece6] hover:bg-white/10 transition-colors"
                >
                  <Edit3 className="size-4 text-[#a5a6aa]" />
                  <span>Editar título</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditingNote(true)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#efece6] hover:bg-white/10 transition-colors"
                >
                  <MessageSquarePlus className="size-4 text-[#a5a6aa]" />
                  <span>{bookmark.note ? 'Editar anotação' : 'Adicionar anotação'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={isDeleting}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/15 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  <span>Excluir marcador</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
