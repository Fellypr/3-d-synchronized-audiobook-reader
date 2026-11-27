'use client'

import React from 'react'
import { Pencil, X } from 'lucide-react'
import {
  BOOKMARK_CATEGORIES,
  type BookmarkCategoryConfig,
  type BookmarkCategoryId,
} from '@/types/bookmark'

interface HighlighterToolbarProps {
  activePen: BookmarkCategoryId | null
  onSelectPen: (categoryId: BookmarkCategoryId | null) => void
}

export function HighlighterToolbar({ activePen, onSelectPen }: HighlighterToolbarProps) {
  const activeConfig: BookmarkCategoryConfig | undefined = BOOKMARK_CATEGORIES.find(
    (c) => c.id === activePen
  )

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-full border border-white/10 bg-[#111419]/90 px-2.5 py-1.5 backdrop-blur-md shadow-md">
      <span className="hidden sm:inline text-[11px] font-medium text-[#9fa7b5] pl-1 pr-1">
        Destacar:
      </span>

      {BOOKMARK_CATEGORIES.map((cat) => {
        const isActive = activePen === cat.id
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectPen(isActive ? null : cat.id)}
            title={`${cat.label}: ${cat.description}`}
            aria-pressed={isActive}
            className={`group flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
              isActive
                ? 'bg-white/15 text-white ring-1 ring-white/30 shadow-sm scale-[1.03]'
                : 'text-[#c8d0dc] hover:bg-white/10 hover:text-white'
            }`}
          >
            <Pencil
              className="size-3.5 shrink-0 transition-transform group-hover:-rotate-12"
              style={{ color: cat.color }}
            />
            <span className="hidden md:inline">{cat.label}</span>
            <span
              className="md:hidden size-2 rounded-full"
              style={{ backgroundColor: cat.color }}
            />
          </button>
        )
      })}

      {activeConfig && (
        <button
          type="button"
          onClick={() => onSelectPen(null)}
          className="ml-0.5 flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[11px] text-[#e2ab4b] hover:bg-white/20 transition-colors"
          title="Sair do modo marca-texto"
        >
          <span className="hidden sm:inline">Arraste no texto</span>
          <X className="size-3" />
        </button>
      )}
    </div>
  )
}
