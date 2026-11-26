import { HOW_IT_WORKS_STEPS } from '../data/landing-data'
import { ScrollReveal } from './scroll-reveal'

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="relative py-20 sm:py-28 bg-card/40 text-foreground border-t border-border"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        {/* Cabeçalho Editorial Alinhado à Esquerda */}
        <ScrollReveal className="max-w-2xl mb-14">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary block mb-3">
            03 · Fluxo de Uso
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Do arquivo PDF ao livro falado em quatro etapas
          </h2>
        </ScrollReveal>

        {/* Etapas em Grade Limpa com Divisória Superior */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {HOW_IT_WORKS_STEPS.map((step, index) => (
            <ScrollReveal
              key={step.step}
              delay={index * 0.08}
              className="pt-6 border-t-2 border-border hover:border-primary transition-colors duration-300 flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs font-semibold tracking-widest text-primary">
                  PASSO {step.step}
                </span>
                <span className="text-xs text-muted-foreground">
                  {step.description}
                </span>
              </div>

              <h3 className="font-display text-lg font-bold text-foreground mb-3 leading-snug">
                {step.title}
              </h3>

              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.detail}
              </p>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
