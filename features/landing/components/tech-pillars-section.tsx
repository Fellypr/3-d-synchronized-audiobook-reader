import { TECH_PILLARS } from '../data/landing-data'
import { ScrollReveal } from './scroll-reveal'

export function TechPillarsSection() {
  return (
    <section
      id="tech-pillars"
      className="relative py-20 sm:py-28 bg-background text-foreground border-t border-border"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Coluna Esquerda: Título Editorial */}
          <ScrollReveal className="lg:col-span-5 lg:sticky lg:top-24">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary block mb-3">
              02 · Arquitetura de Leitura
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-tight">
              Construído para preservar o texto e respeitar o ritmo da voz.
            </h2>
            <p className="mt-4 text-base text-muted-foreground leading-relaxed">
              Cada detalhe do leitor evita distrações: do alinhamento entre áudio e página até a continuidade entre dispositivos.
            </p>
          </ScrollReveal>

          {/* Coluna Direita: Lista Editorial Limpa sem Caixas Genéricas */}
          <div className="lg:col-span-7 divide-y divide-border border-t border-b border-border">
            {TECH_PILLARS.map((pillar, index) => (
              <ScrollReveal
                key={pillar.id}
                delay={index * 0.08}
                className="py-8 first:pt-6 last:pb-6 grid grid-cols-1 sm:grid-cols-12 gap-4 items-baseline"
              >
                <div className="sm:col-span-2">
                  <span className="font-mono text-sm font-semibold text-primary">
                    {pillar.index}
                  </span>
                </div>
                <div className="sm:col-span-10">
                  <h3 className="font-display text-xl font-bold text-foreground leading-snug">
                    {pillar.title}
                  </h3>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1 mb-3">
                    {pillar.summary}
                  </p>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {pillar.detail}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
