'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface ScrollRevealProps {
  children: ReactNode
  delay?: number
  className?: string
  yOffset?: number
}

/**
 * Wrapper reutilizável para animações suaves disparadas ao entrar na viewport (scroll).
 */
export function ScrollReveal({
  children,
  delay = 0,
  className = '',
  yOffset = 28,
}: ScrollRevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: yOffset }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{
        duration: 0.65,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
