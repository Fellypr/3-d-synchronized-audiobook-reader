'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Sparkles,
  FileText,
  BookmarkCheck,
  Volume2,
  Gauge,
  SlidersHorizontal,
  Info,
} from 'lucide-react'
import { DEMO_WORDS } from '../data/landing-data'
import type { ReaderTheme, ViewMode } from '../types/landing.types'

export function InteractiveDemoSection() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [speed, setSpeed] = useState<number>(1.0)
  const [theme, setTheme] = useState<ReaderTheme>('sepia')
  const [viewMode, setViewMode] = useState<ViewMode>('text')
  const [activeWordIndex, setActiveWordIndex] = useState(0)

  const rafRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)
  const totalDuration = DEMO_WORDS[DEMO_WORDS.length - 1].end + 0.5

  // Encontra palavra ativa com base no tempo
  const findWordIndex = useCallback((time: number): number => {
    let index = 0
    for (let i = 0; i < DEMO_WORDS.length; i++) {
      if (time >= DEMO_WORDS[i].start) {
        index = i
      } else {
        break
      }
    }
    return index
  }, [])

  // Sincronizador de animação fluido (RAF)
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }

    lastTimeRef.current = performance.now()

    const step = (now: number) => {
      const delta = (now - lastTimeRef.current) / 1000
      lastTimeRef.current = now

      setCurrentTime((prev) => {
        const next = prev + delta * speed
        if (next >= totalDuration) {
          setIsPlaying(false)
          setActiveWordIndex(0)
          return 0
        }
        const wIdx = findWordIndex(next)
        setActiveWordIndex(wIdx)
        return next
      })

      rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isPlaying, speed, totalDuration, findWordIndex])

  // Click-to-seek: pular diretamente para a palavra clicada
  const handleWordClick = (wordIndex: number) => {
    const targetWord = DEMO_WORDS[wordIndex]
    if (!targetWord) return

    setCurrentTime(targetWord.start)
    setActiveWordIndex(wordIndex)
    if (!isPlaying) {
      setIsPlaying(true)
    }
  }

  const togglePlay = () => {
    setIsPlaying((prev) => !prev)
  }

  const handleSkip = (seconds: number) => {
    setCurrentTime((prev) => {
      const next = Math.max(0, Math.min(totalDuration, prev + seconds))
      setActiveWordIndex(findWordIndex(next))
      return next
    })
  }

  const speeds = [1.0, 1.25, 1.5]

  // Separação de páginas
  const page1Words = DEMO_WORDS.filter((w) => w.page === 1)
  const page2Words = DEMO_WORDS.filter((w) => w.page === 2)

  // Determinar qual página é ativa para visualização mobile
  const activeWord = DEMO_WORDS[activeWordIndex]
  const isRightPageActive = activeWord ? activeWord.page === 2 : false

  // Estilização baseada em temas
  const getThemeStyles = () => {
    switch (theme) {
      case 'night':
        return {
          bg: 'bg-[#141519]',
          text: 'text-[#ece7dd]',
          highlightBg: 'bg-[#E09F4C]/25 text-[#FFD699] ring-1 ring-[#E09F4C]/60 shadow-[0_0_12px_rgba(224,159,76,0.3)]',
          pageShadow: 'shadow-2xl shadow-black/80',
          numberColor: 'text-white/30',
        }
      case 'light':
        return {
          bg: 'bg-[#FCFBF7]',
          text: 'text-[#1E1C1A]',
          highlightBg: 'bg-[#E09F4C]/35 text-[#0B1117] ring-1 ring-[#E09F4C] shadow-[0_0_8px_rgba(224,159,76,0.25)]',
          pageShadow: 'shadow-xl shadow-black/40',
          numberColor: 'text-black/30',
        }
      case 'sepia':
      default:
        return {
          bg: 'bg-[#F6F0E4]',
          text: 'text-[#24211C]',
          highlightBg: 'bg-[#E09F4C]/30 text-[#472605] ring-1 ring-[#E09F4C]/70 shadow-[0_0_10px_rgba(224,159,76,0.25)]',
          pageShadow: 'shadow-2xl shadow-black/60',
          numberColor: 'text-[#7B6E5B]/50',
        }
    }
  }

  const currentStyles = getThemeStyles()

  return (
    <section id="interactive-simulator" className="relative py-20 sm:py-28 bg-background text-foreground overflow-hidden">
      {/* Luz ambiente sutil sobre o livro */}
      <div className="pointer-events-none absolute inset-0 book-ambient-glow" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8">
        {/* Cabeçalho Editorial da Seção */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 max-w-5xl mx-auto mb-10 sm:mb-14 pb-6 border-b border-border">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary block mb-2">
              01 · Simulador
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              Experimente a leitura sincronizada
            </h2>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground max-w-md leading-relaxed">
            Dê o play ou clique em qualquer palavra do livro para saltar direto até aquele trecho. Alterne temas e velocidade em tempo real.
          </p>
        </div>

        {/* Barra Superior de Ferramentas / Controles do Simulador */}
        <div className="mb-6 max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3 p-3 sm:px-6 sm:py-3 rounded-2xl bg-[#121922]/90 border border-white/10 backdrop-blur-xl shadow-lg">
          {/* Seletor de Tema */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#93A1B0] hidden sm:inline">Tema:</span>
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setTheme('sepia')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  theme === 'sepia'
                    ? 'bg-[#E09F4C] text-[#0B1117] font-semibold shadow'
                    : 'text-[#93A1B0] hover:text-white'
                }`}
              >
                Sépia
              </button>
              <button
                onClick={() => setTheme('night')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  theme === 'night'
                    ? 'bg-[#E09F4C] text-[#0B1117] font-semibold shadow'
                    : 'text-[#93A1B0] hover:text-white'
                }`}
              >
                Dark Velvet
              </button>
              <button
                onClick={() => setTheme('light')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  theme === 'light'
                    ? 'bg-[#E09F4C] text-[#0B1117] font-semibold shadow'
                    : 'text-[#93A1B0] hover:text-white'
                }`}
              >
                Papel Claro
              </button>
            </div>
          </div>

          {/* Alternador Folha Real / Texto Corrido */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'sheet' ? 'text' : 'sheet')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                viewMode === 'sheet'
                  ? 'border-[#E09F4C] bg-[#E09F4C]/20 text-[#E09F4C]'
                  : 'border-white/15 bg-white/5 text-[#F5F2EB] hover:bg-white/10'
              }`}
            >
              <FileText className="size-3.5" />
              <span>{viewMode === 'sheet' ? 'Folha Real (Diagramada)' : 'Texto Fluido'}</span>
            </button>
          </div>

          {/* Seletor de Velocidade */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#93A1B0] hidden sm:inline">Velocidade:</span>
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
              {speeds.map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    speed === s
                      ? 'bg-[#E09F4C] text-[#0B1117]'
                      : 'text-[#93A1B0] hover:text-white'
                  }`}
                >
                  {s.toFixed(2).replace('.00', '')}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── PALCO 3D DO LIVRO REALÍSTICO ── */}
        <div className="relative mx-auto w-full max-w-4xl [perspective:2000px] mb-8">
          {/* Sombra de Contato de Mesa */}
          <div className="pointer-events-none absolute -inset-x-8 bottom-[-24px] h-16 rounded-[50%] bg-black/90 blur-2xl opacity-95" />

          {/* Marcador de Página de Fita de Cetim no Topo */}
          <div className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 z-30 hidden md:block">
            <div className="relative h-20 w-3 bg-gradient-to-b from-[#8f251a] via-[#c23b2e] to-[#8f251a] shadow-lg rounded-b-sm border-x border-[#ff8b80]/20" />
          </div>

          {/* Livro Capa Dura 3D (.book-3d-hardcover de globals.css) */}
          <div className="relative book-3d-hardcover rounded-xl p-2 sm:p-3.5 transition-colors duration-500">
            {/* Sombra de Rebaixo Central da Lombada (.book-spine-shadow-3d) */}
            <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 hidden w-12 -translate-x-1/2 book-spine-shadow-3d md:block" />

            {/* Miolo das Páginas: Duas colunas no desktop, alternância suave no mobile */}
            <div className="grid min-h-[460px] sm:min-h-[500px] md:min-h-[520px] grid-cols-1 overflow-hidden rounded-[3px] md:grid-cols-2 md:gap-[2px]">
              {/* Página 1 (Esquerda) */}
              <article
                className={`relative min-h-[460px] sm:min-h-[500px] md:min-h-[520px] p-6 sm:p-10 ${currentStyles.bg} book-page-curve-left rounded-l-[2px] transition-colors duration-300 ${
                  isRightPageActive ? 'hidden md:block' : 'block'
                }`}
              >
                {/* Cabeçalho da Página */}
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-black/10 dark:border-white/10 text-[11px] font-mono tracking-wider opacity-60">
                  <span>AUDITECA · CAPÍTULO 1</span>
                  <span>FOLHA 01</span>
                </div>

                {/* Conteúdo com Palavras Clicáveis e Highlight em Tempo Real */}
                <div
                  className={`font-serif leading-relaxed sm:leading-[2.1] text-base sm:text-[18px] ${currentStyles.text} select-none transition-colors duration-300`}
                >
                  {page1Words.map((word) => {
                    const isWordActive = activeWordIndex === word.id
                    return (
                      <span key={word.id} className="inline-block mr-[0.25em] mb-[0.2em]">
                        <button
                          type="button"
                          onClick={() => handleWordClick(word.id)}
                          className={`rounded px-1 py-0.5 text-left transition-all duration-150 cursor-pointer ${
                            isWordActive
                              ? `${currentStyles.highlightBg} font-bold scale-[1.04]`
                              : 'hover:bg-[#E09F4C]/15'
                          }`}
                          title={`Clique para pular para "${word.text}" (${word.start}s)`}
                        >
                          {word.text}
                        </button>
                      </span>
                    )
                  })}
                </div>

                {/* Número da Página */}
                <div className={`absolute bottom-4 left-8 text-xs font-medium ${currentStyles.numberColor}`}>
                  Pág. 1
                </div>
              </article>

              {/* Página 2 (Direita) */}
              <article
                className={`relative min-h-[460px] sm:min-h-[500px] md:min-h-[520px] p-6 sm:p-10 ${currentStyles.bg} book-page-curve-right rounded-r-[2px] transition-colors duration-300 ${
                  isRightPageActive ? 'block' : 'hidden md:block'
                }`}
              >
                {/* Cabeçalho da Página */}
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-black/10 dark:border-white/10 text-[11px] font-mono tracking-wider opacity-60">
                  <span>SINCRONIZAÇÃO NEURAL</span>
                  <span>FOLHA 02</span>
                </div>

                {/* Conteúdo com Palavras Clicáveis e Highlight em Tempo Real */}
                <div
                  className={`font-serif leading-relaxed sm:leading-[2.1] text-base sm:text-[18px] ${currentStyles.text} select-none transition-colors duration-300`}
                >
                  {page2Words.map((word) => {
                    const isWordActive = activeWordIndex === word.id
                    return (
                      <span key={word.id} className="inline-block mr-[0.25em] mb-[0.2em]">
                        <button
                          type="button"
                          onClick={() => handleWordClick(word.id)}
                          className={`rounded px-1 py-0.5 text-left transition-all duration-150 cursor-pointer ${
                            isWordActive
                              ? `${currentStyles.highlightBg} font-bold scale-[1.04]`
                              : 'hover:bg-[#E09F4C]/15'
                          }`}
                          title={`Clique para pular para "${word.text}" (${word.start}s)`}
                        >
                          {word.text}
                        </button>
                      </span>
                    )
                  })}
                </div>

                {/* Número da Página */}
                <div className={`absolute bottom-4 right-8 text-xs font-medium ${currentStyles.numberColor}`}>
                  Pág. 2
                </div>
              </article>
            </div>
          </div>
        </div>

        {/* ── DOCK ERGONÔMICO DO REPRODUTOR ── */}
        <div className="max-w-3xl mx-auto rounded-2xl border border-white/15 bg-[#121922]/95 p-4 sm:px-8 sm:py-5 shadow-2xl backdrop-blur-2xl">
          {/* Linha de Tempo / Scrubber */}
          <div className="flex items-center gap-3 mb-4">
            <span className="w-12 text-right text-xs font-mono text-[#E09F4C]">
              {Math.floor(currentTime / 60)}:
              {String(Math.floor(currentTime % 60)).padStart(2, '0')}
            </span>

            <div className="relative flex-1">
              <input
                type="range"
                min="0"
                max={totalDuration}
                step="0.05"
                value={currentTime}
                onChange={(e) => {
                  const t = Number(e.target.value)
                  setCurrentTime(t)
                  setActiveWordIndex(findWordIndex(t))
                }}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-[#E09F4C] hover:accent-[#f5b86e] transition-all"
                aria-label="Controle de linha do tempo do simulador"
              />
            </div>

            <span className="w-12 text-xs font-mono text-[#93A1B0]">
              {Math.floor(totalDuration / 60)}:
              {String(Math.floor(totalDuration % 60)).padStart(2, '0')}
            </span>
          </div>

          {/* Botões de Ação Centralizados */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-[#93A1B0]">
              <span className="inline-block size-2 rounded-full bg-[#E09F4C] animate-pulse" />
              <span className="hidden sm:inline font-medium">Click-to-seek ativo: toque em qualquer palavra</span>
              <span className="sm:hidden font-medium">Toque nas palavras</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleSkip(-5)}
                className="flex size-9 items-center justify-center rounded-full text-[#F5F2EB]/80 hover:bg-white/10 hover:text-white transition-colors"
                title="Voltar 5 segundos"
                aria-label="Voltar 5 segundos"
              >
                <RotateCcw className="size-4" />
              </button>

              <button
                onClick={togglePlay}
                className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-[#E09F4C] to-[#C6802C] text-[#0B1117] font-bold shadow-lg shadow-[#E09F4C]/30 hover:scale-105 active:scale-95 transition-all"
                aria-label={isPlaying ? 'Pausar simulador' : 'Reproduzir simulador'}
              >
                {isPlaying ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current ml-0.5" />}
              </button>

              <button
                onClick={() => handleSkip(5)}
                className="flex size-9 items-center justify-center rounded-full text-[#F5F2EB]/80 hover:bg-white/10 hover:text-white transition-colors"
                title="Avançar 5 segundos"
                aria-label="Avançar 5 segundos"
              >
                <RotateCw className="size-4" />
              </button>
            </div>

            <div className="text-right">
              <span className="text-xs font-mono text-[#E09F4C] font-semibold">
                {speed}x speed
              </span>
            </div>
          </div>
        </div>

        {/* Dica de Acessibilidade */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[#93A1B0]/80">
          <Info className="size-3.5 text-[#E09F4C]" />
          <span>Experimente alternar para o tema Dark Velvet à noite para reduzir a fadiga visual.</span>
        </div>
      </div>
    </section>
  )
}
