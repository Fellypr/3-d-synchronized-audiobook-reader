'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, RotateCcw, Volume2, VolumeX } from 'lucide-react'

export default function LandingPage() {
  const [hasEnded, setHasEnded] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    // Garantir autoplay suave com mudo inicial exigido por navegadores
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Fallback caso o navegador bloqueie autoplay
      })
    }
  }, [])

  const handleVideoEnded = () => {
    if (videoRef.current) {
      // Congelar exatamente no último frame do vídeo
      videoRef.current.pause()
    }
    setHasEnded(true)
  }

  const handleReplay = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.play()
      setHasEnded(false)
    }
  }

  const toggleSound = () => {
    if (videoRef.current) {
      const nextMuted = !videoRef.current.muted
      videoRef.current.muted = nextMuted
      setIsMuted(nextMuted)
    }
  }

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#0B1117] text-[#F5F2EB] flex flex-col justify-between selection:bg-[#E09F4C]/30 selection:text-[#F5F2EB]">
      {/* 1. VÍDEO HERO DE FUNDO */}
      <video
        ref={videoRef}
        src="/videos/video-hero-audio-book.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={handleVideoEnded}
        className="absolute inset-0 w-full h-full object-cover object-[75%_center] sm:object-center pointer-events-none select-none transition-transform duration-1000 ease-out"
      />

      {/* 2. OVERLAYS DE PROFUNDIDADE E ESCURECIMENTO */}
      {/* Camada geral de escurecimento para conforto visual e contraste */}
      <div className="absolute inset-0 bg-black/45 pointer-events-none" />

      {/* Gradiente direcional: mais escuro no lado esquerdo (onde fica a frase) e suave no lado direito (livro 3D) */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0B1117]/95 via-[#0B1117]/65 to-black/20 pointer-events-none" />

      {/* Vinheta nas bordas para reforçar o foco cinematográfico */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(11,17,23,0.8)_100%)] pointer-events-none" />

      {/* 3. NAVEGAÇÃO SUPERIOR REFINADA */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-6 sm:px-12 pt-8 flex items-center justify-between">
        <Link href="/" className="group flex items-center gap-3">
          <span className="font-display text-2xl font-bold tracking-tight text-[#F5F2EB] group-hover:text-[#E09F4C] transition-colors drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            Auditeca
          </span>
        </Link>

        {/* Controles discretos de mídia */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSound}
            aria-label={isMuted ? 'Ativar som' : 'Desativar som'}
            className="p-2.5 rounded-full bg-black/40 hover:bg-black/70 border border-white/10 text-[#F5F2EB]/80 hover:text-white transition-all backdrop-blur-md shadow-lg hover:scale-105"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[#E09F4C]" />}
          </button>

          {hasEnded && (
            <button
              onClick={handleReplay}
              aria-label="Rever animação"
              className="p-2.5 rounded-full bg-black/40 hover:bg-black/70 border border-white/10 text-[#F5F2EB]/80 hover:text-white transition-all backdrop-blur-md shadow-lg hover:scale-105"
              title="Rever vídeo"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <Link
            href="/sign-in"
            className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-medium text-[#F5F2EB] backdrop-blur-md transition-all hover:scale-[1.02] shadow-md"
          >
            Entrar
          </Link>
        </div>
      </header>

      {/* 4. CONTEÚDO HERO NO LADO OPOSTO (ESQUERDA) */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-12 py-16 sm:py-24 grid grid-cols-1 lg:grid-cols-12 items-center flex-1">
        <div className="lg:col-span-7 flex flex-col items-start text-left">
          <AnimatePresence>
            {hasEnded ? (
              <motion.div
                key="content-revealed"
                initial={{ opacity: 0, x: -35, filter: 'blur(8px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-start gap-6"
              >
                {/* Tag editorial sutil */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.7 }}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E09F4C]/15 border border-[#E09F4C]/30 text-[#E09F4C] text-xs font-medium tracking-wide uppercase shadow-[0_2px_12px_rgba(0,0,0,0.5)] backdrop-blur-md"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E09F4C] animate-pulse" />
                  Audiolivro Sincronizado 3D
                </motion.div>

                {/* Frase de Destaque com Forte Sombra Projetada */}
                <h1
                  className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#F5F2EB] leading-[1.12] tracking-tight"
                  style={{
                    textShadow:
                      '0 4px 16px rgba(0, 0, 0, 0.95), 0 8px 36px rgba(0, 0, 0, 0.9), 0 1px 2px rgba(0, 0, 0, 1)',
                  }}
                >
                  Onde cada palavra ganha voz.
                </h1>

                {/* Subtítulo Complementar */}
                <p
                  className="text-lg sm:text-xl text-[#F5F2EB]/90 max-w-xl font-normal leading-relaxed"
                  style={{
                    textShadow:
                      '0 2px 12px rgba(0, 0, 0, 0.95), 0 4px 20px rgba(0, 0, 0, 0.85)',
                  }}
                >
                  A experiência definitiva de leitura sincronizada com áudio imersivo. Ouça cada narrativa ganhando vida enquanto acompanha o texto em harmonia.
                </p>

                {/* Ações (CTA) */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.8 }}
                  className="flex flex-wrap items-center gap-4 pt-2"
                >
                  <Link
                    href="/sign-in"
                    className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-[#E09F4C] hover:bg-[#c98b3c] text-[#0B1117] font-semibold text-base transition-all duration-200 shadow-[0_10px_30px_-5px_rgba(224,159,76,0.4)] hover:shadow-[0_15px_35px_-5px_rgba(224,159,76,0.6)] hover:scale-[1.03] active:scale-[0.98]"
                  >
                    Começar a Explorar
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </Link>

                  <button
                    onClick={handleReplay}
                    className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-[#F5F2EB]/90 hover:text-white font-medium text-sm backdrop-blur-md transition-all hover:scale-[1.02]"
                  >
                    <RotateCcw className="w-4 h-4 text-[#E09F4C]" />
                    Rever Animação
                  </button>
                </motion.div>
              </motion.div>
            ) : (
              // Indicador sutil de reprodução enquanto o vídeo acontece
              <motion.div
                key="playing-cue"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.4 } }}
                className="flex items-center gap-3 text-xs tracking-wider uppercase text-white/50 backdrop-blur-sm bg-black/20 px-3.5 py-1.5 rounded-full border border-white/5"
              >
                <span className="w-2 h-2 rounded-full bg-[#E09F4C] animate-ping" />
                Carregando narrativa...
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Lado Direito (espaço preservado para o livro 3D do vídeo) */}
        <div className="lg:col-span-5 pointer-events-none" />
      </div>

      {/* 5. RODAPÉ SUTIL */}
      <footer className="relative z-20 w-full max-w-7xl mx-auto px-6 sm:px-12 pb-6 flex items-center justify-between text-xs text-white/50">
        <span>© {new Date().getFullYear()} Auditeca · Leitura em 3D</span>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="hover:text-white transition-colors">
            Acessar conta
          </Link>
        </div>
      </footer>
    </main>
  )
}
