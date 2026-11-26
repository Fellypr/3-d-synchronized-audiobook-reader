import type { Metadata } from 'next'
import { LandingPageContainer } from '@/features/landing'

export const metadata: Metadata = {
  title: 'Auditeca | Leitura Sincronizada em Livro 3D e Audiolivro Imersivo',
  description:
    'Experimente o primeiro leitor de audiolivros do Brasil com física tátil de livro 3D aberto e sincronização palavra por palavra em tempo real. Ouça, veja e aprenda até 3x mais rápido.',
  keywords: [
    'audiolivro',
    'audiobook',
    'leitura sincronizada',
    'livro 3d',
    'forced alignment',
    'auditeca',
    'leitor pdf',
    'acessibilidade dislexia tdah',
  ],
  openGraph: {
    title: 'Auditeca | Onde cada palavra ganha voz em 3D',
    description:
      'Acompanhe o texto em harmonia com áudio imersivo, clique nas palavras para saltar e sinta a textura de um livro físico.',
    type: 'website',
    locale: 'pt_BR',
    url: 'https://auditeca.com.br',
  },
}

export default function LandingPage() {
  return <LandingPageContainer />
}
