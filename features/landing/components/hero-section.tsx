'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, useScroll, useTransform, animate } from 'framer-motion'
import { ArrowRight, Volume2, VolumeX, RotateCcw, Sparkles, BookOpen, ChevronDown } from 'lucide-react'

const HERO_LINE_1 = 'Onde cada palavra '
const HERO_LINE_2 = 'ganha voz.'
const FULL_HEADLINE = `${HERO_LINE_1}${HERO_LINE_2}`

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isMuted, setIsMuted] = useState(true)
  const [hasEnded, setHasEnded] = useState(false)
  const [typedLength, setTypedLength] = useState(0)
  const [isTypingStarted, setIsTypingStarted] = useState(false)
  const isTypingComplete = typedLength >= FULL_HEADLINE.length

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })

  // Efeito parallax suave ao deslizar a tela
  const videoY = useTransform(scrollYProgress, [0, 1], ['0%', '22%'])
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '32%'])
  const contentOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay silenciado pode ser protegido por regras do browser
      })
    }

    // Delay de 3 segundos após o início do vídeo para iniciar a digitação
    const startDelay = setTimeout(() => {
      setIsTypingStarted(true)
    }, 3000)

    return () => clearTimeout(startDelay)
  }, [])

  useEffect(() => {
    if (!isTypingStarted || isTypingComplete) return

    const typingInterval = setInterval(() => {
      setTypedLength((prev) => {
        if (prev >= FULL_HEADLINE.length) {
          clearInterval(typingInterval)
          return prev
        }
        return prev + 1
      })
    }, 55)

    return () => clearInterval(typingInterval)
  }, [isTypingStarted, isTypingComplete])

  const handleVideoEnded = () => {
    if (videoRef.current) {
      videoRef.current.pause()
    }
    setHasEnded(true)
  }

  const smoothScrollTo = (targetId: string) => {
    const el = document.getElementById(targetId)
    if (!el) return

    const targetTop = el.getBoundingClientRect().top + window.scrollY
    animate(window.scrollY, targetTop, {
      duration: 0.95,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => window.scrollTo(0, latest),
    })
  }

  const scrollToDemo = () => smoothScrollTo('interactive-simulator')

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[92vh] lg:min-h-screen w-full flex flex-col justify-between overflow-hidden bg-[#0B1117] text-[#F5F2EB]"
    >
      {/* 1. VÍDEO HERO DE FUNDO PRESERVADO COM PARALLAX */}
      <motion.div
        style={{ y: videoY }}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
      >
        <video
          ref={videoRef}
          src="/videos/video-hero-audio-book.mp4"
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={handleVideoEnded}
          className="w-full h-full object-cover object-[75%_center] sm:object-center select-none transition-transform duration-1000 ease-out"
        />
      </motion.div>

      {/* 2. OVERLAYS DE PROFUNDIDADE E ATMOSFERA CINEMATOGRÁFICA */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0B1117]/85 via-[#0B1117]/65 to-black/35 pointer-events-none z-1" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_30%,rgba(11,17,23,0.9)_100%)] pointer-events-none z-1" />
      <div className="pointer-events-none absolute inset-0 book-ambient-glow z-1" />

      {/* 3. NAVEGAÇÃO SUPERIOR */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-6 sm:px-10 pt-6 sm:pt-8 flex items-center justify-between">
        <Link href="/" className="group flex items-center gap-3">
          <div className="size-9 rounded-xl bg-gradient-to-br from-[#E09F4C] to-[#C6802C] flex items-center justify-center p-2 shadow-lg shadow-[#E09F4C]/20 border border-white/10 group-hover:scale-105 transition-transform">
            <BookOpen className="size-5 text-[#0B1117] stroke-[2.4]" />
          </div>
          <span className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#F5F2EB] group-hover:text-[#E09F4C] transition-colors drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]">
            Auditeca
          </span>
        </Link>

        {/* Links Centrais Desktop com Deslizamento Suave */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#F5F2EB]/80">
          {[
            { id: 'interactive-simulator', label: 'Simulador 3D' },
            { id: 'tech-pillars', label: 'Tecnologia' },
            { id: 'how-it-works', label: 'Como Funciona' },
            { id: 'personas', label: 'Benefícios' },
            { id: 'faq', label: 'FAQ' },
          ].map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault()
                smoothScrollTo(item.id)
              }}
              className="hover:text-[#E09F4C] transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-medium text-[#F5F2EB] backdrop-blur-md transition-all hover:scale-[1.02] shadow-md"
          >
            Entrar
          </Link>
        </div>
      </header>

      {/* 4. CONTEÚDO PRINCIPAL HERO COM PARALLAX */}
      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 py-12 sm:py-20 grid grid-cols-1 lg:grid-cols-12 items-center flex-1"
      >
        <div className="lg:col-span-8 flex flex-col items-start text-left gap-6">
          <h1
            className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold text-[#F5F2EB] leading-[1.08] tracking-tight min-h-[2.2em]"
            style={{
              textShadow:
                '0 4px 20px rgba(0, 0, 0, 0.95), 0 8px 45px rgba(0, 0, 0, 0.9), 0 1px 3px rgba(0, 0, 0, 1)',
            }}
            aria-label={FULL_HEADLINE}
          >
            {HERO_LINE_1.slice(0, Math.min(typedLength, HERO_LINE_1.length))}
            {typedLength > HERO_LINE_1.length && (
              <>
                <br className="hidden sm:block" />
                <span>
                  {HERO_LINE_2.slice(0, typedLength - HERO_LINE_1.length)}
                </span>
              </>
            )}
            {isTypingStarted && !isTypingComplete && (
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.7, repeat: Infinity }}
                className="inline-block w-[3px] h-[0.85em] bg-[#E09F4C] ml-1.5 align-middle rounded-full"
              />
            )}
          </h1>

          {/* Subtítulo de Conversão — entra suavemente após o término da digitação */}
          <motion.p
            initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
            animate={
              isTypingComplete
                ? { opacity: 1, y: 0, filter: 'blur(0px)' }
                : { opacity: 0, y: 18, filter: 'blur(6px)' }
            }
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
            className="text-base sm:text-xl text-[#F5F2EB]/90 max-w-2xl font-normal leading-relaxed"
            style={{
              textShadow:
                '0 2px 14px rgba(0, 0, 0, 0.95), 0 4px 24px rgba(0, 0, 0, 0.85)',
            }}
          >
            A experiência definitiva de leitura sincronizada com áudio imersivo. Ouça cada narrativa ganhando vida enquanto acompanha o texto em tempo real, palavra por palavra, com física tátil de livro aberto.
          </motion.p>

          {/* CTAs de Alta Conversão — entram logo após o subtítulo */}
          <motion.div
            initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
            animate={
              isTypingComplete
                ? { opacity: 1, y: 0, filter: 'blur(0px)' }
                : { opacity: 0, y: 18, filter: 'blur(6px)' }
            }
            transition={{ duration: 0.85, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-wrap items-center gap-4 pt-3 w-full sm:w-auto"
          >
            <Link
              href="/sign-in"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full bg-[#E09F4C] hover:bg-[#c98b3c] text-[#0B1117] font-semibold text-base transition-all duration-200 shadow-[0_12px_32px_-5px_rgba(224,159,76,0.45)] hover:shadow-[0_18px_40px_-5px_rgba(224,159,76,0.65)] hover:scale-[1.03] active:scale-[0.98]"
            >
              Começar a Ler Agora
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </Link>

            <button
              type="button"
              onClick={scrollToDemo}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-[#F5F2EB] font-medium text-base backdrop-blur-md transition-all hover:scale-[1.02]"
            >
              Experimentar Simulador 3D
            </button>
          </motion.div>
        </div>

        <div className="lg:col-span-4 pointer-events-none" />
      </motion.div>

      {/* 5. INDICADOR DE SCROLL ERGONÔMICO E ANIMADO */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-6 sm:px-10 pb-7 flex items-center justify-between text-xs text-white/50">
        <button
          type="button"
          onClick={scrollToDemo}
          className="group inline-flex items-center gap-3 text-white/70 hover:text-[#E09F4C] transition-colors"
        >
          {/* Ícone de Mouse com Bolinha Animada */}
          <span className="relative w-5 h-8 rounded-full border border-white/30 group-hover:border-[#E09F4C] flex justify-center pt-1.5 transition-colors">
            <motion.span
              animate={{ y: [0, 9, 0], opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              className="w-1 h-1.5 rounded-full bg-[#E09F4C]"
            />
          </span>

          <span className="text-xs uppercase tracking-wider font-medium">
            Descer para o Simulador
          </span>

          <motion.span
            animate={{ y: [0, 4, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-flex"
          >
            <ChevronDown className="size-4" />
          </motion.span>
        </button>

        <div className="hidden sm:flex items-center gap-3">
          <span className="size-1.5 rounded-full bg-[#E09F4C] animate-pulse" />
          <span>Física Tátil 3D · Sincronização Fonética</span>
        </div>
      </div>
    </section>
  )
}
