import type { DemoWord, TechPillar, HowItWorksStep, PersonaTarget, FaqItem } from '../types/landing.types'

export const DEMO_WORDS: DemoWord[] = [
  // Página 1 (Esquerda)
  { id: 0, text: 'A', start: 0.0, end: 0.28, page: 1 },
  { id: 1, text: 'leitura', start: 0.32, end: 0.85, page: 1 },
  { id: 2, text: 'sincronizada', start: 0.9, end: 1.82, page: 1 },
  { id: 3, text: 'aproxima', start: 1.88, end: 2.38, page: 1 },
  { id: 4, text: 'o', start: 2.42, end: 2.62, page: 1 },
  { id: 5, text: 'ritmo', start: 2.68, end: 3.22, page: 1 },
  { id: 6, text: 'da', start: 3.28, end: 3.56, page: 1 },
  { id: 7, text: 'voz', start: 3.6, end: 4.18, page: 1 },
  { id: 8, text: 'à', start: 4.22, end: 4.4, page: 1 },
  { id: 9, text: 'página.', start: 4.45, end: 5.35, page: 1 },
  { id: 10, text: 'Quando', start: 5.5, end: 5.92, page: 1 },
  { id: 11, text: 'os', start: 5.96, end: 6.12, page: 1 },
  { id: 12, text: 'olhos', start: 6.18, end: 6.64, page: 1 },
  { id: 13, text: 'e', start: 6.68, end: 6.84, page: 1 },
  { id: 14, text: 'os', start: 6.88, end: 7.02, page: 1 },
  { id: 15, text: 'ouvidos', start: 7.08, end: 7.55, page: 1 },
  { id: 16, text: 'caminham', start: 7.62, end: 8.28, page: 1 },
  { id: 17, text: 'juntos,', start: 8.34, end: 8.92, page: 1 },
  { id: 18, text: 'fica', start: 9.05, end: 9.32, page: 1 },
  { id: 19, text: 'mais', start: 9.38, end: 9.88, page: 1 },
  { id: 20, text: 'fácil', start: 9.94, end: 10.45, page: 1 },
  { id: 21, text: 'manter', start: 10.5, end: 10.82, page: 1 },
  { id: 22, text: 'o', start: 10.88, end: 11.12, page: 1 },
  { id: 23, text: 'foco', start: 11.18, end: 11.78, page: 1 },
  { id: 24, text: 'em', start: 11.84, end: 12.18, page: 1 },
  { id: 25, text: 'textos', start: 12.24, end: 12.65, page: 1 },
  { id: 26, text: 'longos.', start: 12.72, end: 13.4, page: 1 },

  // Página 2 (Direita)
  { id: 27, text: 'Na', start: 13.65, end: 13.88, page: 2 },
  { id: 28, text: 'Auditeca,', start: 13.94, end: 14.65, page: 2 },
  { id: 29, text: 'você', start: 14.72, end: 15.12, page: 2 },
  { id: 30, text: 'acompanha', start: 15.18, end: 15.98, page: 2 },
  { id: 31, text: 'cada', start: 16.04, end: 16.55, page: 2 },
  { id: 32, text: 'trecho', start: 16.6, end: 17.08, page: 2 },
  { id: 33, text: 'no', start: 17.14, end: 17.42, page: 2 },
  { id: 34, text: 'seu', start: 17.48, end: 17.95, page: 2 },
  { id: 35, text: 'PDF', start: 18.0, end: 18.48, page: 2 },
  { id: 36, text: 'original', start: 18.54, end: 19.18, page: 2 },
  { id: 37, text: 'ou', start: 19.24, end: 19.48, page: 2 },
  { id: 38, text: 'em', start: 19.54, end: 19.85, page: 2 },
  { id: 39, text: 'leitura', start: 19.9, end: 20.48, page: 2 },
  { id: 40, text: 'limpa.', start: 20.54, end: 21.2, page: 2 },
  { id: 41, text: 'Clique', start: 21.4, end: 21.82, page: 2 },
  { id: 42, text: 'em', start: 21.88, end: 22.08, page: 2 },
  { id: 43, text: 'qualquer', start: 22.14, end: 22.62, page: 2 },
  { id: 44, text: 'palavra', start: 22.68, end: 23.18, page: 2 },
  { id: 45, text: 'para', start: 23.24, end: 23.52, page: 2 },
  { id: 46, text: 'pular', start: 23.58, end: 23.95, page: 2 },
  { id: 47, text: 'direto', start: 24.02, end: 24.58, page: 2 },
  { id: 48, text: 'para', start: 24.64, end: 24.98, page: 2 },
  { id: 49, text: 'aquele', start: 25.04, end: 25.48, page: 2 },
  { id: 50, text: 'instante', start: 25.54, end: 26.15, page: 2 },
  { id: 51, text: 'do áudio.', start: 26.22, end: 27.0, page: 2 },
]

export const TECH_PILLARS: TechPillar[] = [
  {
    id: 'sync-engine',
    index: '01',
    title: 'Realce palavra por palavra',
    summary: 'Mapeamento temporal alinhado ao áudio',
    detail:
      'Cada palavra é vinculada ao seu instante exato na narração, iluminando o texto conforme o áudio avança sem que você perca a linha.',
  },
  {
    id: 'pdf-sheet',
    index: '02',
    title: 'Preservação da folha original do PDF',
    summary: 'Gráficos, tabelas e notas intactos',
    detail:
      'Em vez de desmontar o documento em texto corrido sem formatação, o modo Folha Real projeta o destaque diretamente sobre as páginas originais.',
  },
  {
    id: 'book-3d',
    index: '03',
    title: 'Leitura com sensação de livro aberto',
    summary: 'Temas Sépia, Dark Velvet e Papel Claro',
    detail:
      'Lombada sombreada, iluminação ambiente suave e três paletas pensadas para longas sessões de estudo ou leitura noturna.',
  },
  {
    id: 'cloud-sync',
    index: '04',
    title: 'Progresso sincronizado na mesma conta',
    summary: 'Do computador para o celular sem atrito',
    detail:
      'Sua estante, seus livros e o segundo exato em que você pausou ficam salvos na conta e acompanham você em qualquer aparelho.',
  },
]

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    step: '01',
    title: 'Envie seu livro em PDF',
    description: 'Biblioteca pessoal',
    detail:
      'Adicione seus arquivos PDF ou livros na estante. A estrutura de páginas e capítulos é preparada mantendo a diagramação.',
  },
  {
    step: '02',
    title: 'Sincronize texto e narração',
    description: 'Alinhamento de palavras',
    detail:
      'O áudio é alinhado ao texto para que cada palavra receba suas coordenadas de tempo e posição na página.',
  },
  {
    step: '03',
    title: 'Leia e ouça no leitor 3D',
    description: 'Controle total do ritmo',
    detail:
      'Ajuste a velocidade, alterne entre Folha Real e texto corrido e clique em qualquer palavra para pular o áudio até lá.',
  },
  {
    step: '04',
    title: 'Continue em outro aparelho',
    description: 'Histórico contínuo',
    detail:
      'Ao entrar com a mesma conta no celular ou no computador, seus livros e a última posição reproduzida já estarão lá.',
  },
]

export const PERSONAS_DATA: PersonaTarget[] = [
  {
    id: 'academic',
    category: 'Estudo & Pesquisa',
    title: 'Acompanhe manuais técnicos, artigos e códigos sem perder o contexto visual',
    summary:
      'Livros de computação, direito ou medicina dependem de diagramas, fórmulas e tabelas. No leitor, você ouve a explicação enquanto enxerga a página original.',
    highlights: [
      'Clique em qualquer termo da página para repetir a explicação daquele trecho.',
      'Acelere a narração (1.25x ou 1.5x) mantendo o acompanhamento visual ativo.',
      'Salve marcadores rápidos para revisar capítulos antes de provas ou reuniões.',
    ],
    workflowNote: 'Ideal no modo Folha Real para livros diagramados e apostilas.',
  },
  {
    id: 'neurodivergent',
    category: 'Foco & Acessibilidade',
    title: 'Leitura guiada para reduzir saltos de linha e dispersão',
    summary:
      'Para quem convive com TDAH ou dislexia, blocos densos de texto cansam rápido. O cursor visual sincronizado à voz ancora a atenção linha após linha.',
    highlights: [
      'Destaque em tempo real evita reler o mesmo parágrafo várias vezes.',
      'Alterne para o modo Texto Fluido quando quiser menos estímulos visuais na tela.',
      'Escolha o tema Sépia ou Dark Velvet para reduzir o brilho excessivo.',
    ],
    workflowNote: 'Combina estímulo visual e auditivo em um único ritmo contínuo.',
  },
  {
    id: 'commuter',
    category: 'Entre Aparelhos',
    title: 'Alterne entre ler na mesa e ouvir no caminho sem caçar minutos',
    summary:
      'Comece um capítulo no computador durante a manhã, feche a aba e continue exatamente do mesmo segundo ao abrir a conta no celular.',
    highlights: [
      'A mesma biblioteca e os mesmos arquivos disponíveis em qualquer dispositivo conectado.',
      'Progresso salvo automaticamente no banco de dados vinculado à sua conta.',
      'Interface adaptada para página única em telas menores e duas páginas no desktop.',
    ],
    workflowNote: 'Uma conta única, sincronizada entre navegador desktop e mobile.',
  },
]

export const FAQ_DATA: FaqItem[] = [
  {
    id: 'faq-1',
    question: 'Como funciona a sincronização palavra por palavra?',
    answer:
      'Cada palavra do texto é associada ao seu tempo exato de início e fim no áudio. Enquanto a narração toca, o leitor consulta esse mapa em tempo real e ilumina a palavra correspondente.',
  },
  {
    id: 'faq-2',
    question: 'Qual a diferença entre Folha Real e Texto Fluido?',
    answer:
      'Na Folha Real, o PDF é renderizado com sua diagramação original — preservando imagens, quadros e colunas — com o destaque sobreposto às palavras. No Texto Fluido, o foco vai para uma leitura limpa e contínua, confortável em telas menores.',
  },
  {
    id: 'faq-3',
    question: 'Se eu entrar com a mesma conta em outro aparelho, vejo meus livros?',
    answer:
      'Sim. Seus livros e o ponto exato onde você parou ficam associados à sua conta no banco de dados, permitindo continuar de qualquer dispositivo.',
  },
  {
    id: 'faq-4',
    question: 'Posso clicar em qualquer palavra para avançar ou voltar o áudio?',
    answer:
      'Sim. Tanto no modo Folha Real quanto no Texto Fluido, clicar em uma palavra reposiciona o áudio imediatamente para o instante em que ela é falada.',
  },
]
