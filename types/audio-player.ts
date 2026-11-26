export type PlayerMode = 'classic' | 'compact'

export interface AudioPlayerState {
  time: number
  duration: number
  playing: boolean
  speed: number
  page: number
  totalPages: number
  totalSpreads: number
  title: string
  coverUrl?: string | null
  audioUrl?: string | null
  isAudioReady?: boolean
}

export interface AudioPlayerActions {
  togglePlayback: () => Promise<void> | void
  handleSeek: (nextTime: number) => void
  handleSkip: (offset: number) => void
  cycleSpeed: () => void
  navigatePage: (nextPage: number) => void
  setPlayerMode: (mode: PlayerMode) => void
}

export interface AudioPlayerProps {
  state: AudioPlayerState
  actions: AudioPlayerActions
}
