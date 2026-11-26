'use client'

import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, ChevronLeft, ChevronRight, GripHorizontal, Maximize2, Pause, Play } from 'lucide-react'
import type { AudioPlayerProps } from '@/types/audio-player'

export function CompactPlayer({ state, actions }: AudioPlayerProps) {
  const { time, duration, playing, title, coverUrl, audioUrl, page, totalSpreads } = state
  const { togglePlayback, handleSeek, navigatePage, setPlayerMode } = actions

  const constraintsRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isDimmed, setIsDimmed] = useState(false)

  useEffect(() => {
    if (!playing || isHovered) {
      setIsDimmed(false)
      return
    }

    const timer = setTimeout(() => {
      setIsDimmed(true)
    }, 3000)

    return () => clearTimeout(timer)
  }, [playing, isHovered])

  const remaining = Math.max(0, duration - time)
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (time / duration) * 100)) : 0
  const targetOpacity = isDimmed && !isHovered ? 0.3 : 1

  return (
    <div
      ref={constraintsRef}
      className="fixed inset-0 z-40 flex items-end justify-center p-3 sm:p-5 pointer-events-none safe-area-bottom"
    >
      <motion.div
        key="player-compact"
        drag
        dragConstraints={constraintsRef}
        dragMomentum={false}
        dragElastic={0.05}
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: targetOpacity, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{
          opacity: { duration: isHovered ? 0.2 : 0.45, ease: 'easeOut' },
          default: { duration: 0.22, ease: 'easeOut' },
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="w-full max-w-[420px] pointer-events-auto cursor-grab active:cursor-grabbing select-none"
      >
        <div className="relative overflow-hidden rounded-[22px] border border-[rgba(80,80,80,0.4)] bg-gradient-to-r from-[#030303] via-[#0c0909] to-[#030303] p-3.5 sm:p-4 text-white shadow-2xl backdrop-blur-xl">
          {/* Indicador sutil de arraste no topo */}
          <div className="flex justify-center -mt-1.5 mb-1.5 opacity-35 hover:opacity-70 transition-opacity">
            <GripHorizontal className="size-4 text-[#cecece]" />
          </div>

          {/* Top: Cover + Title + Switch to Classic button */}
          <div className="flex items-center gap-3">
            {/* Cover */}
            <div className="relative size-[55px] sm:h-[56px] sm:w-[55px] shrink-0 overflow-hidden rounded-[18px] border border-white/10 bg-[#161616] shadow-md flex items-center justify-center">
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt={title}
                  draggable={false}
                  className="size-full object-cover pointer-events-none"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <BookOpen className="size-6 text-[#cecece]/70" />
              )}
            </div>

            {/* Title with fade mask on the right */}
            <div className="min-w-0 flex-1 pr-1">
              <div
                className="relative overflow-hidden"
                style={{
                  WebkitMaskImage: 'linear-gradient(to right, black 80%, transparent 100%)',
                  maskImage: 'linear-gradient(to right, black 80%, transparent 100%)',
                }}
              >
                <h3 className="truncate font-sans text-sm sm:text-base font-semibold tracking-wide text-[#cecece]">
                  {title || 'Sem título'}
                </h3>
              </div>
              <p className="mt-0.5 text-[11px] font-medium text-[#707070]">
                Página {page + 1} de {totalSpreads}
              </p>
            </div>

            {/* Switch back to Classic dock */}
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setPlayerMode('classic')}
              className="flex size-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#707070] hover:border-white/20 hover:bg-white/10 hover:text-white transition-colors"
              title="Expandir reprodutor"
              aria-label="Expandir reprodutor"
            >
              <Maximize2 className="size-3.5" />
            </button>
          </div>

          {/* Progress Bar & Timestamps */}
          <div className="mt-3">
            <div
              onPointerDown={(e) => e.stopPropagation()}
              className="group relative flex h-3 w-full cursor-pointer items-center"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
                handleSeek(pos * duration)
              }}
            >
              {/* Background track */}
              <div className="h-[3px] w-full rounded-full bg-[#707070]/40 overflow-hidden group-hover:h-[5px] transition-all">
                {/* Fill */}
                <div
                  className="h-full bg-[#f6f6f6] rounded-full transition-[width] duration-150"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-[#707070]">
              <span>
                {Math.floor(time / 60)}:{String(Math.floor(time % 60)).padStart(2, '0')}
              </span>
              <span>
                -{Math.floor(remaining / 60)}:{String(Math.floor(remaining % 60)).padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Central Controls: Prev Page / Backward, Play/Pause, Next Page / Forward */}
          <div className="mt-1 flex items-center justify-center gap-6">
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => navigatePage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="flex size-8 items-center justify-center rounded-full text-[#cecece] hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all"
              aria-label="Página anterior"
              title="Página anterior"
            >
              <ChevronLeft className="size-5" />
            </button>

            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => void togglePlayback()}
              disabled={!audioUrl}
              className="flex size-10 items-center justify-center rounded-full bg-[#f6f6f6] text-[#030303] shadow-lg shadow-white/10 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              aria-label={playing ? 'Pausar' : 'Reproduzir'}
              title={playing ? 'Pausar' : 'Reproduzir'}
            >
              {playing ? <Pause className="size-4 fill-current" /> : <Play className="ml-0.5 size-4 fill-current" />}
            </button>

            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => navigatePage(Math.min(totalSpreads - 1, page + 1))}
              disabled={page >= totalSpreads - 1}
              className="flex size-8 items-center justify-center rounded-full text-[#cecece] hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all"
              aria-label="Próxima página"
              title="Próxima página"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
