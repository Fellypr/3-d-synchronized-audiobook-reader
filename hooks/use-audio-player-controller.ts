'use client'

import { useCallback } from 'react'
import type { AudioPlayerActions, PlayerMode } from '@/types/audio-player'

interface UseAudioPlayerControllerParams {
  audioRef: React.RefObject<HTMLAudioElement | null>
  audioUrl: string | null
  time: number
  duration: number
  audioDuration: number | null
  speed: number
  setSpeed: (speed: number) => void
  playing: boolean
  setPlaying: (playing: boolean) => void
  setTime: (time: number) => void
  saveProgress: (nextTime: number) => void
  syncReaderToTime: (nextTime: number) => void
  navigate: (nextPage: number) => void
  playerMode: PlayerMode
  setPlayerMode: (mode: PlayerMode) => void
}

const AVAILABLE_SPEEDS = [0.75, 1, 1.25, 1.5, 2]

export function useAudioPlayerController({
  audioRef,
  audioUrl,
  time,
  duration,
  audioDuration,
  speed,
  setSpeed,
  setPlaying,
  setTime,
  saveProgress,
  syncReaderToTime,
  navigate,
  setPlayerMode,
}: UseAudioPlayerControllerParams): AudioPlayerActions {
  const togglePlayback = useCallback(async () => {
    const audio = audioRef.current
    if (!audio || !audioUrl) return
    try {
      if (audio.paused) {
        await audio.play()
      } else {
        audio.pause()
        saveProgress(audio.currentTime)
        setPlaying(false)
      }
    } catch {
      setPlaying(false)
    }
  }, [audioRef, audioUrl, saveProgress, setPlaying])

  const handleSeek = useCallback(
    (nextTime: number) => {
      const maxDur = audioDuration ?? duration
      const bounded = Math.max(0, Math.min(maxDur, nextTime))
      if (audioRef.current) {
        audioRef.current.currentTime = bounded
      }
      setTime(bounded)
      syncReaderToTime(bounded)
      saveProgress(bounded)
    },
    [audioDuration, audioRef, duration, saveProgress, setTime, syncReaderToTime]
  )

  const handleSkip = useCallback(
    (offset: number) => {
      const maxDur = audioDuration ?? duration
      const next = Math.max(0, Math.min(maxDur, time + offset))
      if (audioRef.current) {
        audioRef.current.currentTime = next
      }
      setTime(next)
      syncReaderToTime(next)
      saveProgress(next)
    },
    [audioDuration, audioRef, duration, saveProgress, setTime, syncReaderToTime, time]
  )

  const cycleSpeed = useCallback(() => {
    const nextIdx = (AVAILABLE_SPEEDS.indexOf(speed) + 1) % AVAILABLE_SPEEDS.length
    const nextSpeed = AVAILABLE_SPEEDS[nextIdx] ?? 1
    setSpeed(nextSpeed)
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed
    }
  }, [audioRef, setSpeed, speed])

  const navigatePage = useCallback(
    (nextPage: number) => {
      navigate(nextPage)
    },
    [navigate]
  )

  return {
    togglePlayback,
    handleSeek,
    handleSkip,
    cycleSpeed,
    navigatePage,
    setPlayerMode,
  }
}
