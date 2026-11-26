import Link from 'next/link'
import { ArrowRight, BookOpen } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ScrollReveal } from './scroll-reveal'

export function CtaFooterSection() {
  return (
    <footer className="relative bg-background text-foreground border-t border-border overflow-hidden">
      {/* ── CHAMADA FINAL SÓBRIA ── */}
      <ScrollReveal className="relative z-10 max-w-4xl mx-auto px-6 sm:px-10 py-20 sm:py-24 text-center">
        <h2 className="font-display text-3xl sm:text-5xl font-bold text-foreground tracking-tight leading-tight">
          Comece sua próxima leitura com áudio sincronizado.
        </h2>

        <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Crie sua conta gratuita para enviar seus PDFs, acompanhar cada palavra na página e continuar de onde parou em qualquer aparelho.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/sign-in"
            className={cn(
              buttonVariants({ variant: 'default', size: 'lg' }),
              'rounded-full px-8 h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20',
            )}
          >
            Criar conta gratuita
            <ArrowRight className="size-4 ml-1" />
          </Link>

          <Link
            href="/sign-in"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'lg' }),
              'rounded-full px-7 h-12 text-base border-border bg-card/50 hover:bg-secondary text-foreground',
            )}
          >
            Acessar biblioteca
          </Link>
        </div>
      </ScrollReveal>

      {/* ── RODAPÉ EDITORIAL ── */}
      <div className="relative z-10 border-t border-border py-8 max-w-7xl mx-auto px-6 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2.5">
          <div className="size-6 rounded-md bg-primary flex items-center justify-center">
            <BookOpen className="size-3.5 text-primary-foreground stroke-[2.4]" />
          </div>
          <span className="font-display text-sm font-bold text-foreground">
            Auditeca
          </span>
          <span className="text-border">·</span>
          <span>Leitor de audiolivros sincronizados</span>
        </div>

        <div className="flex items-center gap-6">
          <a href="#interactive-simulator" className="hover:text-foreground transition-colors">
            Simulador
          </a>
          <a href="#tech-pillars" className="hover:text-foreground transition-colors">
            Arquitetura
          </a>
          <a href="#faq" className="hover:text-foreground transition-colors">
            Dúvidas
          </a>
          <Link href="/sign-in" className="hover:text-foreground transition-colors">
            Entrar
          </Link>
        </div>
      </div>
    </footer>
  )
}
