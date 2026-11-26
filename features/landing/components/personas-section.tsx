'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import { PERSONAS_DATA } from '../data/landing-data'
import { ScrollReveal } from './scroll-reveal'

export function PersonasSection() {
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(PERSONAS_DATA[0].id)

  const activePersona = PERSONAS_DATA.find((p) => p.id === selectedPersonaId) ?? PERSONAS_DATA[0]

  return (
    <section
      id="personas"
      className="relative py-20 sm:py-28 bg-background text-foreground border-t border-border"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        {/* Cabeçalho */}
        <ScrollReveal className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary block mb-3">
              04 · Cenários de Leitura
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              Adaptado ao seu jeito de ler
            </h2>
          </div>

          {/* Abas Horizontais Limpas */}
          <div
            role="tablist"
            aria-label="Cenários de uso"
            className="inline-flex flex-wrap gap-2 border-b border-border pb-2"
          >
            {PERSONAS_DATA.map((persona) => {
              const isSelected = persona.id === selectedPersonaId
              return (
                <button
                  key={persona.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedPersonaId(persona.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                  }`}
                >
                  {persona.category}
                </button>
              )
            })}
          </div>
        </ScrollReveal>

        {/* Painel Editorial do Cenário Ativo */}
        <div className="rounded-2xl bg-card border border-border p-8 sm:p-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePersona.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start"
            >
              <div className="lg:col-span-6">
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-foreground leading-snug">
                  {activePersona.title}
                </h3>
                <p className="mt-4 text-base text-muted-foreground leading-relaxed">
                  {activePersona.summary}
                </p>
                <p className="mt-6 pt-4 border-t border-border text-xs font-mono text-primary">
                  {activePersona.workflowNote}
                </p>
              </div>

              <div className="lg:col-span-6 space-y-4">
                {activePersona.highlights.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3.5 p-4 rounded-xl bg-background/70 border border-border"
                  >
                    <Check className="size-4 text-primary shrink-0 mt-1" />
                    <p className="text-sm sm:text-base text-foreground/90 leading-relaxed">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
