'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { LayoutGrid, Pause, Play, RotateCcw, RotateCw } from 'lucide-react'
import type { AudioPlayerProps } from '@/types/audio-player'

export function TraditionalPlayer({ state, actions }: AudioPlayerProps) {
  const { time, duration, playing, speed, page, totalSpreads, audioUrl } = state
  const { togglePlayback, handleSeek, handleSkip, cycleSpeed, setPlayerMode } = actions

  return (
    <motion.footer
      key="player-classic"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.2 }}
      className="fixed bottom-3 sm:bottom-5 left-1/2 z-40 flex w-[calc(100%-16px)] sm:w-[calc(100%-32px)] max-w-4xl -translate-x-1/2 flex-col gap-2 rounded-2xl border border-white/15 bg-[#101318]/92 p-3 sm:px-6 sm:py-3.5 text-white shadow-2xl backdrop-blur-2xl safe-area-bottom"
    >
      {/* Scrubber & Time */}
      <div className="flex w-full items-center gap-2.5">
        <span className="w-10 text-right text-[10px] sm:text-xs font-mono text-amber-400/80">
          {Math.floor(time / 60)}:{String(Math.floor(time % 60)).padStart(2, '0')}
        </span>

        <div className="relative flex-1">
          <input
            aria-label="Progresso do áudio"
            type="range"
            min="0"
            max={duration}
            step="0.01"
            value={time}
            onChange={(e) => handleSeek(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-amber-500 hover:accent-amber-400"
          />
        </div>

        <span className="w-10 text-[10px] sm:text-xs font-mono text-[#8a96a6]">
          {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
        </span>
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between">
        {/* Left: Quick Page info */}
        <div className="flex items-center gap-2 text-xs text-[#9aa6b6]">
          <span className="hidden sm:inline font-medium text-amber-400/70">
            Spreads: {page + 1}/{totalSpreads}
          </span>
        </div>

        {/* Center Playback Controls */}
        <div className="flex items-center gap-2.5 sm:gap-4 mx-auto">
          <button
            onClick={() => handleSkip(-10)}
            className="flex size-9 sm:size-10 items-center justify-center rounded-full text-[#c8d0dc] hover:bg-white/10 hover:text-white transition-colors"
            title="Voltar 10 segundos"
            aria-label="Voltar 10 segundos"
          >
            <RotateCcw className="size-4 sm:size-5" />
          </button>

          <button
            onClick={() => void togglePlayback()}
            disabled={!audioUrl}
            className="flex size-11 sm:size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-[#0b1117] shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
            aria-label={playing ? 'Pausar' : 'Reproduzir'}
            title={audioUrl ? (playing ? 'Pausar' : 'Reproduzir') : 'Carregando áudio...'}
          >
            {playing ? <Pause className="size-5 fill-current" /> : <Play className="ml-0.5 size-5 fill-current" />}
          </button>

          <button
            onClick={() => handleSkip(10)}
            className="flex size-9 sm:size-10 items-center justify-center rounded-full text-[#c8d0dc] hover:bg-white/10 hover:text-white transition-colors"
            title="Avançar 10 segundos"
            aria-label="Avançar 10 segundos"
          >
            <RotateCw className="size-4 sm:size-5" />
          </button>
        </div>

        {/* Right: Speed Button & Toggle to Compact Mode */}
        <div className="flex items-center gap-2">
          <button
            onClick={cycleSpeed}
            className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-semibold text-amber-300 hover:bg-white/10 transition-colors"
            title="Alterar velocidade de reprodução"
          >
            {speed}x
          </button>

          <button
            onClick={() => setPlayerMode('compact')}
            className="flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-1 text-xs text-[#9aa6b6] hover:bg-white/10 hover:text-amber-300 transition-colors"
            title="Alternar para reprodutor compacto"
            aria-label="Modo compacto"
          >
            <LayoutGrid className="size-3.5" />
            <span className="hidden md:inline text-[11px]">Compacto</span>
          </button>
        </div>
      </div>
    </motion.footer>
  )
}
