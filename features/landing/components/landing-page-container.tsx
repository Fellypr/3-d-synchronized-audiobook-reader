'use client'

import { motion, useScroll, useSpring } from 'framer-motion'
import { HeroSection } from './hero-section'
import { InteractiveDemoSection } from './interactive-demo-section'
import { TechPillarsSection } from './tech-pillars-section'
import { HowItWorksSection } from './how-it-works-section'
import { PersonasSection } from './personas-section'
import { FaqSection } from './faq-section'
import { CtaFooterSection } from './cta-footer-section'

export function LandingPageContainer() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 30,
    restDelta: 0.001,
  })

  return (
    <main className="relative min-h-screen w-full bg-[#0B1117] text-[#F5F2EB] selection:bg-[#E09F4C]/30 selection:text-[#F5F2EB]">
      {/* Barra de Progresso de Scroll Superior */}
      <motion.div
        style={{ scaleX }}
        className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#C6802C] via-[#E09F4C] to-[#F4BA6D] origin-left z-50 pointer-events-none shadow-[0_0_12px_rgba(224,159,76,0.6)]"
      />
      {/* 1. Hero com Vídeo Preservado e Controles Não-bloqueantes */}
      <HeroSection />

      {/* 2. Simulador Interativo 3D com Click-to-Seek, Temas e Velocidade */}
      <InteractiveDemoSection />

      {/* 3. Pilares Tecnológicos & Neurociência de Retenção */}
      <TechPillarsSection />

      {/* 4. Como Funciona (Pipeline de IA e Diagramação) */}
      <HowItWorksSection />

      {/* 5. Casos de Uso / Personas (Pesquisa, TDAH, Mobilidade) */}
      <PersonasSection />

      {/* 6. FAQ (Perguntas Frequentes) */}
      <FaqSection />

      {/* 7. CTA de Conversão e Rodapé Completo */}
      <CtaFooterSection />
    </main>
  )
}
