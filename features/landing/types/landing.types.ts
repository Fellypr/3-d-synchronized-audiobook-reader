export type ReaderTheme = 'sepia' | 'light' | 'night'

export type ViewMode = 'sheet' | 'text'

export interface DemoWord {
  id: number
  text: string
  start: number
  end: number
  page: 1 | 2
}

export interface TechPillar {
  id: string
  index: string
  title: string
  summary: string
  detail: string
}

export interface HowItWorksStep {
  step: string
  title: string
  description: string
  detail: string
}

export interface PersonaTarget {
  id: string
  category: string
  title: string
  summary: string
  highlights: string[]
  workflowNote: string
}

export interface FaqItem {
  id: string
  question: string
  answer: string
}

export interface SimulatorState {
  isPlaying: boolean
  currentTime: number
  speed: number
  theme: ReaderTheme
  viewMode: ViewMode
  activeWordIndex: number
}
