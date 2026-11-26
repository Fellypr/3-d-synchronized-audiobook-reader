'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus } from 'lucide-react'
import { FAQ_DATA } from '../data/landing-data'
import { ScrollReveal } from './scroll-reveal'

export function FaqSection() {
  const [openId, setOpenId] = useState<string | null>(FAQ_DATA[0]?.id ?? null)

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id))
  }

  return (
    <section
      id="faq"
      className="relative py-20 sm:py-28 bg-card/40 text-foreground border-t border-border"
    >
      <div className="max-w-5xl mx-auto px-6 sm:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Cabeçalho Editorial à Esquerda */}
          <ScrollReveal className="lg:col-span-4">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary block mb-3">
              05 · Dúvidas
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              Perguntas frequentes
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
              Detalhes práticos sobre formatos, sincronização e uso em múltiplos aparelhos.
            </p>
          </ScrollReveal>

          {/* Acordeão Minimalista com Linhas Divisórias */}
          <div className="lg:col-span-8 divide-y divide-border border-t border-b border-border">
            {FAQ_DATA.map((item) => {
              const isOpen = openId === item.id
              return (
                <div key={item.id} className="py-1">
                  <button
                    type="button"
                    onClick={() => toggle(item.id)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between py-5 text-left gap-4 group"
                  >
                    <span className="font-display text-base sm:text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                      {item.question}
                    </span>
                    <span className="text-muted-foreground group-hover:text-primary shrink-0 transition-colors">
                      {isOpen ? <Minus className="size-4" /> : <Plus className="size-4" />}
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <p className="pb-6 pr-8 text-sm sm:text-base text-muted-foreground leading-relaxed">
                          {item.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
