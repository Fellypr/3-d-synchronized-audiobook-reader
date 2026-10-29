'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  FileAudio,
  FileJson,
  FileText,
  Home,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Settings2,
  X,
} from 'lucide-react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { mapPdfDocumentToWords, type PageWordRange, type WordPosition } from '@/lib/books/pdf-sync'
import { PdfPageSheet } from '@/components/reader-dashboard/pdf-page-sheet'

type Word = { p: string; i: number; f: number }

const demoText = ``

function makeWords(text: string): Word[] {
  return text.match(/\S+(?:\n\n|\n)?/g)?.map((p, i) => ({ p, i: i * 0.72, f: i * 0.72 + 0.58 })) ?? []
}

function findWord(words: Word[], time: number) {
  let lo = 0,
    hi = words.length - 1,
    answer = 0
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (words[mid].i <= time) {
      answer = mid
      lo = mid + 1
    } else hi = mid - 1
  }
  return words[answer]?.f >= time ? answer : answer
}

function storageKey(prefix: string, bookName: string) {
  return `${prefix}_${bookName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')}`
}

export function AudiobookReader({ userName, bookId }: { userName?: string; bookId?: string }) {
  const router = useRouter()
  const [words, setWords] = useState<Word[]>(() => makeWords(demoText))
  const [title, setTitle] = useState('Entendendo Algoritmos')
  const [active, setActive] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState<number | null>(null)
  const [speed, setSpeed] = useState(1)
  const [fontSize, setFontSize] = useState(19)
  const [lineHeight, setLineHeight] = useState(1.7)
  const [font, setFont] = useState('Arial')
  const [theme, setThemeState] = useState<'sepia' | 'light' | 'night'>('sepia')
  const [highlight, setHighlight] = useState('blue')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [page, setPage] = useState(0)
  const [flip, setFlip] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)
  const [pdfPageRanges, setPdfPageRanges] = useState<PageWordRange[]>([])
  const [pdfWordPositions, setPdfWordPositions] = useState<Map<number, WordPosition[]>>(new Map())
  const [viewMode, setViewMode] = useState<'sheet' | 'text'>('sheet')
  const [pdfZoom, setPdfZoom] = useState<number>(1.0)
  const [audioReady, setAudioReady] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [resumePrompt, setResumePrompt] = useState<number | null>(null)
  const [restoreTime, setRestoreTime] = useState<number | null>(null)

  const audioRef = useRef<HTMLAudioElement>(null)
  const pendingAudioRef = useRef<File | null>(null)
  const pendingJsonRef = useRef<File | null>(null)
  const rafRef = useRef<number | null>(null)
  const restoredBookRef = useRef<string | null>(null)
  const storageHydratedRef = useRef(false)
  const listenedSecondsRef = useRef(0)
  const listenedSecondsMeasuredRef = useRef(false)
  const playbackSampleRef = useRef<{ position: number; wallTime: number } | null>(null)
  const durationSavedRef = useRef<string | null>(null)
  const lastProgressSaveRef = useRef(0)

  const bookKey = useMemo(() => storageKey('book', title), [title])
  const progressKey = useMemo(() => storageKey('audiobook_progress', title), [title])
  const settingsKey = useMemo(() => storageKey('audiobook_settings', title), [title])
  const listenedSecondsKey = useMemo(() => storageKey('audiobook_listened_seconds', title), [title])

  const isSheetMode = Boolean(pdfDoc && viewMode === 'sheet')
  const wordsPerPage = Math.max(34, Math.round(58 - (fontSize - 16) * 1.6 - (lineHeight - 1.5) * 10))
  const pages = useMemo(() => {
    const result: Word[][] = []
    for (let i = 0; i < words.length; i += wordsPerPage) result.push(words.slice(i, i + wordsPerPage))
    return result
  }, [words, wordsPerPage])

  const totalPages = isSheetMode && pdfDoc ? pdfDoc.numPages : pages.length

  const totalSpreads = useMemo(() => {
    if (isSheetMode && pdfDoc) {
      return Math.max(1, Math.ceil(pdfDoc.numPages / 2))
    }
    return Math.max(1, Math.ceil(pages.length / 2))
  }, [isSheetMode, pdfDoc, pages.length])

  const spreadStart = page * wordsPerPage * 2
  const currentSpread = [
    words.slice(spreadStart, spreadStart + wordsPerPage),
    words.slice(spreadStart + wordsPerPage, spreadStart + wordsPerPage * 2),
  ]
  const duration = audioDuration ?? Math.max(1, (words.at(-1)?.f ?? 1) + 0.5)

  // Identify whether the currently active spoken word is on the right side page
  const isMobileRightPage = useMemo(() => {
    if (isSheetMode && pdfDoc && pdfPageRanges.length > 0) {
      const range = pdfPageRanges.find((r) => active >= r.startWordIndex && active <= r.endWordIndex)
      if (range) {
        return range.pageNumber % 2 === 0
      }
    }
    const rightSpreadStart = page * wordsPerPage * 2 + wordsPerPage
    return active >= rightSpreadStart
  }, [active, isSheetMode, pdfDoc, pdfPageRanges, page, wordsPerPage])

  const syncReaderToTime = useCallback(
    (nextTime: number) => {
      if (!Number.isFinite(nextTime) || nextTime < 0) return
      const index = findWord(words, nextTime)
      setTime(nextTime)
      setActive(index)
      if (pdfDoc && viewMode === 'sheet' && pdfPageRanges.length > 0) {
        const range = pdfPageRanges.find((r) => index >= r.startWordIndex && index <= r.endWordIndex)
        const targetPageNum = range
          ? range.pageNumber
          : Math.min(pdfDoc.numPages, Math.floor((index / Math.max(1, words.length)) * pdfDoc.numPages) + 1)
        const targetSpread = Math.min(totalSpreads - 1, Math.floor((targetPageNum - 1) / 2))
        setPage(targetSpread)
      } else {
        setPage(Math.min(totalSpreads - 1, Math.floor(index / (wordsPerPage * 2))))
      }
    },
    [pdfDoc, pdfPageRanges, totalSpreads, viewMode, words, wordsPerPage]
  )

  const tick = useCallback(() => {
    const next = audioRef.current ? audioRef.current.currentTime : Math.min(duration, time + 0.045 * speed)
    setTime(next)
    const index = findWord(words, next)
    setActive(index)
    let nextPage: number
    if (pdfDoc && viewMode === 'sheet' && pdfPageRanges.length > 0) {
      const range = pdfPageRanges.find((r) => index >= r.startWordIndex && index <= r.endWordIndex)
      const targetPageNum = range
        ? range.pageNumber
        : Math.min(pdfDoc.numPages, Math.floor((index / Math.max(1, words.length)) * pdfDoc.numPages) + 1)
      nextPage = Math.min(totalSpreads - 1, Math.floor((targetPageNum - 1) / 2))
    } else {
      nextPage = Math.min(totalSpreads - 1, Math.floor(index / (wordsPerPage * 2)))
    }
    if (nextPage !== page) {
      setPage(nextPage)
      setFlip((value) => value + 1)
    }
    if (playing) rafRef.current = requestAnimationFrame(tick)
  }, [duration, page, pdfDoc, pdfPageRanges, playing, speed, time, totalSpreads, viewMode, words, wordsPerPage])

  useEffect(() => {
    if (playing) rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [playing, tick])

  useEffect(() => {
    if (!pdfUrl) {
      setPdfDoc(null)
      setPdfPageRanges([])
      setPdfWordPositions(new Map())
      return
    }

    let cancelled = false
    async function loadPdf() {
      try {
        const pdfjsLib = await import('pdfjs-dist')
        if (typeof window !== 'undefined') {
          pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
        }

        const doc = await pdfjsLib.getDocument(pdfUrl!).promise
        if (cancelled) return
        setPdfDoc(doc)

        if (words.length > 0) {
          const { pageRanges, pageWordPositions } = await mapPdfDocumentToWords(doc, words)
          if (!cancelled) {
            setPdfPageRanges(pageRanges)
            setPdfWordPositions(pageWordPositions)
          }
        }
      } catch (err) {
        console.warn('[audiobook-reader] Falha ao carregar PDF original:', err)
      }
    }

    void loadPdf()
    return () => {
      cancelled = true
    }
  }, [pdfUrl, words])

  useEffect(() => {
    let cancelled = false
    fetch(bookId ? `/api/books?id=${encodeURIComponent(bookId)}` : '/api/books')
      .then((response) => (response.ok ? response.json() : null))
      .then(async (payload) => {
        const savedBook = payload?.book as {
          name?: string
          audioUrl?: string
          jsonUrl?: string
          pdfUrl?: string | null
          coverUrl?: string | null
        } | null
        if (cancelled || !savedBook?.audioUrl) {
          setIsLoading(false)
          return
        }

        const savedName = savedBook.name || 'Audiobook'
        setTitle(savedName)
        setAudioUrl(savedBook.audioUrl)
        if (savedBook.coverUrl) setCoverUrl(savedBook.coverUrl)
        if (savedBook.pdfUrl) setPdfUrl(savedBook.pdfUrl)

        try {
          const progressPath = bookId
            ? `/api/progress?bookId=${encodeURIComponent(bookId)}`
            : `/api/progress?bookName=${encodeURIComponent(savedName)}`
          const progressResponse = await fetch(progressPath)
          if (progressResponse.ok) {
            const progressPayload = (await progressResponse.json()) as {
              currentTime?: number
              listenedSeconds?: number | null
              durationSeconds?: number | null
            }
            const savedTime = Number(progressPayload.currentTime)
            if (Number.isFinite(savedTime) && savedTime > 0) setRestoreTime(savedTime)
            if (Number.isFinite(progressPayload.durationSeconds) && Number(progressPayload.durationSeconds) > 0) {
              setAudioDuration(Number(progressPayload.durationSeconds))
            }
            const savedListening = progressPayload.listenedSeconds
            if (typeof savedListening === 'number' && Number.isFinite(savedListening) && savedListening >= 0) {
              listenedSecondsRef.current = savedListening
              listenedSecondsMeasuredRef.current = true
            }
          }
        } catch {}

        if (!savedBook.jsonUrl) {
          setIsLoading(false)
          return
        }
        try {
          const jsonResponse = await fetch(savedBook.jsonUrl, { cache: 'no-store' })
          if (!jsonResponse.ok) throw new Error(`Map request failed: ${jsonResponse.status}`)
          const jsonPayload = (await jsonResponse.json()) as Word[] | { words?: Word[] }
          const savedWords = Array.isArray(jsonPayload) ? jsonPayload : jsonPayload.words
          if (!Array.isArray(savedWords) || !savedWords[0]?.p || cancelled) return
          setWords(savedWords)
        } catch {
        } finally {
          if (!cancelled) setIsLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [bookId])

  useEffect(() => {
    if (restoredBookRef.current === bookKey) return
    restoredBookRef.current = bookKey
    try {
      const savedProgress = Number(localStorage.getItem(progressKey))
      storageHydratedRef.current = true
      const savedSettings = JSON.parse(localStorage.getItem(settingsKey) || '{}') as {
        theme?: string
        fontSize?: number
        font?: string
        speed?: number
        pdfZoom?: number
      }
      const savedListeningValue = localStorage.getItem(listenedSecondsKey)
      if (savedListeningValue !== null) {
        const savedListening = Number(savedListeningValue)
        if (Number.isFinite(savedListening) && savedListening >= 0) {
          listenedSecondsRef.current = Math.max(savedListening, listenedSecondsRef.current)
          listenedSecondsMeasuredRef.current = true
        }
      }
      if (savedSettings.theme === 'sepia' || savedSettings.theme === 'light' || savedSettings.theme === 'night') {
        setThemeState(savedSettings.theme)
      }
      if (typeof savedSettings.fontSize === 'number') setFontSize(Math.min(30, Math.max(16, savedSettings.fontSize)))
      if (typeof savedSettings.font === 'string') setFont(savedSettings.font)
      if (typeof savedSettings.speed === 'number') setSpeed(savedSettings.speed)
      if (typeof savedSettings.pdfZoom === 'number') setPdfZoom(savedSettings.pdfZoom)
      if (savedProgress > 0 && savedProgress < duration) setResumePrompt(savedProgress)
    } catch {}
  }, [bookKey, duration, listenedSecondsKey, progressKey, settingsKey])

  useEffect(() => {
    if (!storageHydratedRef.current) return
    try {
      localStorage.setItem(progressKey, String(time))
    } catch {}
  }, [progressKey, time])

  useEffect(() => {
    if (!storageHydratedRef.current) return
    try {
      localStorage.setItem(settingsKey, JSON.stringify({ theme, fontSize, font, speed, pdfZoom }))
    } catch {}
  }, [font, fontSize, pdfZoom, settingsKey, speed, theme])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !audioUrl) {
      setAudioReady(false)
      return
    }

    audio.playbackRate = speed
    setPlaying(false)
    audio.load()
    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA && Number.isFinite(audio.duration) && audio.duration > 0) {
      setAudioReady(true)
    }
  }, [audioUrl, speed])

  useEffect(() => {
    const audio = audioRef.current
    const mediaDuration = audio?.duration ?? 0
    if (
      !audio ||
      !audioReady ||
      restoreTime === null ||
      !Number.isFinite(restoreTime) ||
      !Number.isFinite(mediaDuration) ||
      mediaDuration <= 0
    )
      return

    const nextTime = Math.min(Math.max(0, restoreTime), Math.max(0, mediaDuration - 0.05))
    if (!Number.isFinite(nextTime)) return
    audio.currentTime = nextTime
    syncReaderToTime(nextTime)
  }, [audioReady, restoreTime, syncReaderToTime])

  function setTheme(nextTheme: 'sepia' | 'light' | 'night') {
    setThemeState(nextTheme)
  }

  function saveProgress(nextTime: number) {
    const safeTime = Math.max(0, audioDuration ? Math.min(nextTime, audioDuration) : nextTime)
    setTime(safeTime)
    try {
      localStorage.setItem(progressKey, String(safeTime))
      localStorage.setItem(listenedSecondsKey, String(listenedSecondsRef.current))
    } catch {}
    if (listenedSecondsMeasuredRef.current) {
      try {
        localStorage.setItem(listenedSecondsKey, String(listenedSecondsRef.current))
      } catch {}
    }
    const body = {
      ...(bookId ? { bookId } : { bookName: title }),
      currentTime: safeTime,
      ...(listenedSecondsMeasuredRef.current ? { listenedSeconds: listenedSecondsRef.current } : {}),
    }
    void fetch('/api/progress', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {})
  }

  function handleGoHome() {
    const audio = audioRef.current
    if (audio && !audio.paused) {
      audio.pause()
    }
    const currentTime = audio?.currentTime ?? time
    saveProgress(currentTime)
    router.push('/')
  }

  function recordListeningTime(audio: HTMLAudioElement, force = false) {
    const now = performance.now()
    const sample = playbackSampleRef.current
    if (sample) {
      const elapsed = (now - sample.wallTime) / 1000
      const mediaDelta = audio.currentTime - sample.position
      const elapsedFromPosition = mediaDelta / Math.max(audio.playbackRate, 0.25)
      if (elapsed > 0 && elapsed <= 15 && elapsedFromPosition > 0) {
        const confirmedSeconds = Math.min(elapsed, elapsedFromPosition)
        listenedSecondsRef.current += confirmedSeconds
        listenedSecondsMeasuredRef.current = true
      }
    }
    playbackSampleRef.current = !audio.paused || force ? { position: audio.currentTime, wallTime: now } : null
  }

  function persistAudioDuration(seconds: number) {
    if (!bookId || !Number.isFinite(seconds) || seconds <= 0) return
    const key = `${bookId}:${seconds}`
    if (durationSavedRef.current === key) return
    durationSavedRef.current = key
    void fetch('/api/books', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ bookId, durationSeconds: seconds }),
    }).catch(() => {
      durationSavedRef.current = null
    })
  }

  async function togglePlayback() {
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
  }

  function handleSkip(offset: number) {
    if (!audioRef.current) return
    const maxDur = audioDuration ?? duration
    const next = Math.max(0, Math.min(maxDur, time + offset))
    audioRef.current.currentTime = next
    setTime(next)
    syncReaderToTime(next)
    saveProgress(next)
  }

  const availableSpeeds = [0.75, 1, 1.25, 1.5, 2]
  function cycleSpeed() {
    const nextIdx = (availableSpeeds.indexOf(speed) + 1) % availableSpeeds.length
    const nextSpeed = availableSpeeds[nextIdx] ?? 1
    setSpeed(nextSpeed)
    if (audioRef.current) audioRef.current.playbackRate = nextSpeed
  }

  function seek(index: number) {
    const next = words[index]?.i ?? 0
    playbackSampleRef.current = null
    if (audioRef.current) {
      audioRef.current.currentTime = next
      if (audioUrl) void audioRef.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    }
    saveProgress(next)
    setActive(index)
  }

  function navigate(nextPage: number) {
    const next = Math.max(0, Math.min(totalSpreads - 1, nextPage))
    setPage(next)
    setFlip((value) => value + 1)
    if (pdfDoc && viewMode === 'sheet' && pdfPageRanges.length > 0) {
      const targetPageNum = next * 2 + 1
      const range = pdfPageRanges.find((r) => r.pageNumber === targetPageNum)
      if (range && words[range.startWordIndex]) {
        seek(range.startWordIndex)
        return
      }
    }
    const index = next * wordsPerPage * 2
    if (words[index]) seek(index)
  }

  async function persistBook(audio: File, json: File) {
    const name = json.name.replace(/\.json$/i, '')
    setIsLoading(true)
    const formData = new FormData()
    formData.append('audio', audio)
    formData.append('json', json)
    formData.append('name', name)
    const response = await fetch('/api/books', { method: 'POST', body: formData })
    if (!response.ok) throw new Error('Book upload failed')
    const payload = await response.json()
    setAudioUrl(payload.book.audioUrl)
    setTitle(payload.book.name)
    setUploadOpen(false)
  }

  async function loadJson(file: File) {
    const parsed = JSON.parse(await file.text())
    if (Array.isArray(parsed) && parsed[0]?.p) {
      setWords(parsed)
      setTitle(file.name.replace(/\.json$/i, ''))
      setPage(0)
      setActive(0)
      setTime(0)
    }
  }

  function selectAudio(file: File) {
    pendingAudioRef.current = file
    if (pendingJsonRef.current) void persistBook(file, pendingJsonRef.current).catch(() => {})
  }

  async function selectJson(file: File) {
    pendingJsonRef.current = file
    await loadJson(file)
    if (pendingAudioRef.current) await persistBook(pendingAudioRef.current, file)
  }

  function loadDemo() {
    setWords(makeWords(demoText))
    setTitle('Entendendo Algoritmos')
    setPage(0)
    setActive(0)
    setTime(0)
    setUploadOpen(false)
  }

  const textColors = theme === 'night' ? 'text-[#ece7dd]' : 'text-[#24211c]'
  const pageBg = theme === 'night' ? 'bg-[#141519]' : theme === 'light' ? 'bg-[#fcfbf7]' : 'bg-[#f6f0e4]'

  function handleAudioLoadedMetadata(event: React.SyntheticEvent<HTMLAudioElement>) {
    const audio = event.currentTarget
    const mediaDuration = audio.duration
    if (!Number.isFinite(mediaDuration) || mediaDuration <= 0) return
    setAudioDuration(mediaDuration)
    setAudioReady(true)
    audio.playbackRate = speed
    persistAudioDuration(mediaDuration)
    const saved = restoreTime ?? Number(localStorage.getItem(progressKey) || 0)
    if (Number.isFinite(saved) && saved > 0) {
      const nextTime = Math.min(saved, Math.max(0, mediaDuration - 0.05))
      audio.currentTime = nextTime
      syncReaderToTime(nextTime)
    }
  }

  function handleAudioTimeUpdate(event: React.SyntheticEvent<HTMLAudioElement>) {
    const audio = event.currentTarget
    const nextTime = audio.currentTime
    if (!Number.isFinite(nextTime)) return
    syncReaderToTime(nextTime)
    if (audio.paused) return

    recordListeningTime(audio)
    const now = performance.now()
    if (now - lastProgressSaveRef.current >= 15_000) {
      lastProgressSaveRef.current = now
      saveProgress(nextTime)
    }
  }

  function handleAudioPause(event: React.SyntheticEvent<HTMLAudioElement>) {
    const audio = event.currentTarget
    recordListeningTime(audio)
    playbackSampleRef.current = null
    saveProgress(audio.currentTime)
    setPlaying(false)
  }

  function handleAudioEnd(event: React.SyntheticEvent<HTMLAudioElement>) {
    const audio = event.currentTarget
    recordListeningTime(audio)
    playbackSampleRef.current = null
    saveProgress(Number.isFinite(audio.duration) ? audio.duration : audio.currentTime)
    setPlaying(false)
  }

  function handleAudioPlay(event: React.SyntheticEvent<HTMLAudioElement>) {
    const audio = event.currentTarget
    playbackSampleRef.current = { position: audio.currentTime, wallTime: performance.now() }
    setPlaying(true)
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#0a0c0f] text-[#f2efe9] antialiased selection:bg-[#e09f4c]/30 selection:text-white">
      {/* Ambient Warm Spotlight over the Reading Desk */}
      <div className="pointer-events-none fixed inset-0 z-0 book-ambient-glow" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(224,159,76,0.12),transparent_70%)]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(5,6,8,0.7)_100%)]" />

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-6 backdrop-blur-md"
            role="status"
            aria-live="polite"
            aria-label="Carregando livro"
          >
            <div className="flex min-w-[210px] flex-col items-center gap-4 rounded-2xl border border-white/15 bg-[#12161f]/95 px-8 py-7 text-center shadow-2xl">
              <div
                className="size-10 animate-spin rounded-full border-[3px] border-amber-500/20 border-t-amber-400"
                aria-hidden="true"
              />
              <div>
                <p className="font-serif font-semibold text-[#f5f2eb]">Carregando audiolivro</p>
                <p className="mt-1 text-xs text-[#9aa6b6]">Preparando áudio e sincronização</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <audio
        ref={audioRef}
        src={audioUrl ?? undefined}
        preload="metadata"
        onLoadedMetadata={handleAudioLoadedMetadata}
        onTimeUpdate={handleAudioTimeUpdate}
        onSeeking={() => {
          playbackSampleRef.current = null
        }}
        onSeeked={(event) => {
          if (!event.currentTarget.paused) {
            playbackSampleRef.current = { position: event.currentTarget.currentTime, wallTime: performance.now() }
          }
        }}
        onPause={handleAudioPause}
        onPlay={handleAudioPlay}
        onEnded={handleAudioEnd}
      />

      {/* Resume Prompt Modal */}
      <AnimatePresence>
        {resumePrompt !== null && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            className="fixed left-1/2 top-20 z-50 w-[calc(100%-32px)] max-w-md -translate-x-1/2 rounded-2xl border border-white/15 bg-[#141820]/95 p-5 shadow-2xl backdrop-blur-xl"
          >
            <p className="font-serif text-base font-semibold text-[#f5f2eb]">Continuar de onde parou?</p>
            <p className="mt-1 text-sm text-[#9aa6b6]">
              Você estava em {Math.floor(resumePrompt / 60)}:{String(Math.floor(resumePrompt % 60)).padStart(2, '0')}.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  const audio = audioRef.current
                  const mediaDuration = audio?.duration ?? 0
                  const nextTime =
                    Number.isFinite(mediaDuration) && mediaDuration > 0
                      ? Math.min(resumePrompt, Math.max(0, mediaDuration - 0.05))
                      : resumePrompt
                  if (audio && Number.isFinite(nextTime)) audio.currentTime = nextTime
                  syncReaderToTime(nextTime)
                  setRestoreTime(nextTime)
                  setResumePrompt(null)
                }}
                className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-sm font-semibold text-[#0b1117] transition-colors"
              >
                Sim, continuar
              </button>
              <button
                onClick={() => {
                  saveProgress(0)
                  setResumePrompt(null)
                  setTime(0)
                  setActive(0)
                  setPage(0)
                }}
                className="rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-2 text-sm text-[#d0d7e0] transition-colors"
              >
                Do início
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Refined Header */}
      <header className="sticky top-0 z-40 flex h-16 md:h-20 items-center justify-between border-b border-white/10 bg-[#0d1015]/85 px-4 backdrop-blur-xl md:px-8">
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 pr-2">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={title}
              className="size-8 sm:size-10 shrink-0 rounded-lg object-cover border border-white/15 shadow-md shadow-black/40 ring-1 ring-amber-500/20"
              onError={() => setCoverUrl(null)}
            />
          ) : (
            <div className="flex size-8 sm:size-10 shrink-0 items-center justify-center rounded-lg bg-[#19222d] border border-white/10 text-amber-400/90 shadow-md">
              <BookOpen className="size-4 sm:size-5" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400/70 truncate">
              Leitor Sincronizado
            </p>
            <h1
              className="font-serif text-sm sm:text-base md:text-lg font-semibold text-[#f5f2eb] truncate max-w-[150px] xs:max-w-[210px] sm:max-w-xs md:max-w-md lg:max-w-lg leading-tight"
              title={title}
            >
              {title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <span className="hidden text-xs text-[#9aa6b6] lg:inline max-w-[120px] truncate">{userName}</span>
          {pdfDoc && (
            <button
              onClick={() => setViewMode(viewMode === 'sheet' ? 'text' : 'sheet')}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 sm:px-3 text-xs font-medium transition-all ${
                viewMode === 'sheet'
                  ? 'border-amber-500/40 bg-amber-500/15 text-amber-300 font-semibold shadow-xs'
                  : 'border-white/10 bg-white/5 text-[#d0d7e0] hover:bg-white/10'
              }`}
              title={viewMode === 'sheet' ? 'Alternar para texto corrido ajustável' : 'Exibir folha real do PDF'}
            >
              <FileText className="size-3.5" />
              <span className="hidden xs:inline">{viewMode === 'sheet' ? 'Folha Real' : 'Texto'}</span>
            </button>
          )}
          <button
            onClick={handleGoHome}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium text-[#f0ede6] hover:bg-white/10 hover:border-white/20 transition-all"
            aria-label="Voltar à biblioteca"
            title="Salvar e voltar ao menu"
          >
            <Home className="size-3.5 sm:size-4" />
            <span className="hidden sm:inline">Biblioteca</span>
          </button>
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium transition-all ${
              settingsOpen
                ? 'border-amber-500/40 bg-amber-500/20 text-amber-300'
                : 'border-white/10 bg-white/5 text-[#f0ede6] hover:bg-white/10 hover:border-white/20'
            }`}
            aria-label="Ajustes de leitura"
          >
            <span className="font-serif font-bold text-xs sm:text-sm">Aa</span>
            <span className="hidden md:inline">Ajustes</span>
            <Settings2 className="size-3.5 sm:size-4" />
          </button>
        </div>

        
      </header>

{/* Reading Settings Drawer (Bottom Sheet on Mobile, Popover on Desktop) */}
        <AnimatePresence>
          {settingsOpen && (
            <>
              {/* Mobile backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSettingsOpen(false)}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
              />

              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-white/15 bg-[#12161f] p-5 shadow-2xl safe-area-bottom md:fixed md:right-8 md:top-20 md:bottom-auto md:w-[320px] md:rounded-2xl md:border md:border-white/10"
              >
                {/* Drag handle for mobile */}
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20 md:hidden" />

                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-serif text-sm font-semibold text-[#f5f2eb]">Ajustes de Leitura</h2>
                  <button
                    onClick={() => setSettingsOpen(false)}
                    className="rounded-full p-1 text-[#9aa6b6] hover:bg-white/10 hover:text-white"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {pdfDoc && (
                  <div className="mb-4">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-amber-400/80">
                      Modo de visualização
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setViewMode('sheet')}
                        className={`rounded-xl border p-2 text-xs font-medium transition-all ${
                          viewMode === 'sheet'
                            ? 'border-amber-500/40 bg-amber-500/20 text-amber-300 font-semibold'
                            : 'border-white/10 bg-white/5 text-[#c8d0dc] hover:bg-white/10'
                        }`}
                      >
                        📖 Folha Real (PDF)
                      </button>
                      <button
                        onClick={() => setViewMode('text')}
                        className={`rounded-xl border p-2 text-xs font-medium transition-all ${
                          viewMode === 'text'
                            ? 'border-amber-500/40 bg-amber-500/20 text-amber-300 font-semibold'
                            : 'border-white/10 bg-white/5 text-[#c8d0dc] hover:bg-white/10'
                        }`}
                      >
                        📝 Texto Corrido
                      </button>
                    </div>
                  </div>
                )}

                {pdfDoc && viewMode === 'sheet' && (
                  <div className="mb-4">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-amber-400/80">
                      Preenchimento da Folha
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        [1.0, 'Original'],
                        [1.12, 'Preenchido'],
                        [1.25, 'Ampliado'],
                      ].map(([val, label]) => (
                        <button
                          key={String(val)}
                          onClick={() => setPdfZoom(Number(val))}
                          className={`rounded-xl border p-2 text-xs transition-all ${
                            pdfZoom === val
                              ? 'border-amber-500/50 bg-amber-500/20 text-amber-300 font-semibold'
                              : 'border-white/10 bg-white/5 text-[#c8d0dc] hover:bg-white/10'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <label className="mb-3 block text-[10px] font-semibold uppercase tracking-wider text-amber-400/80">
                  Tipografia
                  <select
                    value={font}
                    onChange={(e) => setFont(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-[#1a202c] p-2 text-xs text-[#f5f2eb] outline-none focus:border-amber-500/40"
                  >
                    <option value="Arial">Arial (Sans)</option>
                    <option value="Georgia">Georgia (Serif)</option>
                    <option value="Verdana">Verdana (Legível)</option>
                    <option value="Monospace">Monospace</option>
                  </select>
                </label>

                <div className="mb-3.5 flex items-center justify-between">
                  <span className="text-xs text-[#d0d7e0]">Tamanho da fonte · {fontSize}px</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setFontSize((v) => Math.max(16, v - 1))}
                      className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-white hover:bg-white/10"
                    >
                      <Minus className="size-3" />
                    </button>
                    <button
                      onClick={() => setFontSize((v) => Math.min(30, v + 1))}
                      className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-white hover:bg-white/10"
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>
                </div>

                <div className="mb-3.5">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-amber-400/80">Tema da Página</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      ['sepia', 'Âmbar Sepia'],
                      ['light', 'Papel Claro'],
                      ['night', 'Dark Velvet'],
                    ].map(([id, label]) => (
                      <button
                        key={id}
                        onClick={() => setTheme(id as any)}
                        className={`rounded-xl border p-2 text-xs transition-all ${
                          theme === id
                            ? 'border-amber-500/50 bg-amber-500/20 text-amber-300 font-semibold'
                            : 'border-white/10 bg-white/5 text-[#c8d0dc] hover:bg-white/10'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-amber-400/80">Destaque de Palavras</p>
                  <select
                    value={highlight}
                    onChange={(e) => setHighlight(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#1a202c] p-2 text-xs text-[#f5f2eb] outline-none focus:border-amber-500/40"
                  >
                    <option value="blue">Realce azul / âmbar brilhante</option>
                    <option value="underline">Apenas sublinhado suave</option>
                    <option value="focus">Modo Foco / Karaokê</option>
                  </select>
                </div>
              </motion.section>
            </>
          )}
        </AnimatePresence>


      {/* Main Reading Canvas */}
      <div className="relative z-10 mx-auto flex max-w-[1300px] flex-col px-3.5 pb-36 pt-4 sm:px-6 sm:pt-6 md:px-10 md:pt-8">
        {/* Subheader info & Bookmark */}
        <div className="mb-3.5 sm:mb-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/80">
              Capítulo 01
            </p>
            <p className="mt-0.5 text-xs text-[#9fa7b5]">
              {Math.round((active / Math.max(1, words.length - 1)) * 100)}% concluído · {words.length.toLocaleString('pt-BR')} palavras
            </p>
          </div>
          <button
            onClick={() => setBookmarked(!bookmarked)}
            className={`rounded-full border p-2 sm:p-2.5 transition-all ${
              bookmarked
                ? 'border-amber-500/40 bg-amber-500/20 text-amber-300 shadow-md shadow-amber-500/10'
                : 'border-white/10 bg-white/5 text-[#c8d0dc] hover:bg-white/10'
            }`}
            aria-label="Marcar página"
            title={bookmarked ? 'Página marcada' : 'Marcar página atual'}
          >
            {bookmarked ? (
              <BookmarkCheck className="size-4 sm:size-5 fill-amber-400 text-amber-400" />
            ) : (
              <Bookmark className="size-4 sm:size-5" />
            )}
          </button>
        </div>

        {/* 3D Realistic Book Stage */}
        <div className="relative mx-auto w-full max-w-[1240px] [perspective:1800px]">
          {/* Ambient Table Contact Shadow */}
          <div className="pointer-events-none absolute -inset-x-6 bottom-[-22px] h-14 rounded-[50%] bg-black/80 blur-2xl opacity-90" />

          {/* Satin Ribbon Bookmark Hanging from Top Spine (Desktop) */}
          <div className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 z-30 hidden md:block">
            <div className="relative h-20 w-3.5 bg-gradient-to-b from-[#8f251a] via-[#c23b2e] to-[#8f251a] shadow-lg rounded-b-sm border-x border-[#ff8b80]/20" />
          </div>

          {/* Hardcover Casing & Multi-layered Fore-edge Page Stack */}
          <div className="relative book-3d-hardcover rounded-lg sm:rounded-xl p-1.5 sm:p-2.5 md:p-3.5">
            {/* 3D Spine Gutter Depression (Desktop) */}
            <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 hidden w-12 -translate-x-1/2 book-spine-shadow-3d md:block" />

            {/* Book Body (Spread on Desktop, Active Single Page on Mobile) */}
            <div className="grid min-h-[540px] sm:min-h-[640px] md:min-h-[760px] grid-cols-1 overflow-hidden rounded-[3px] md:grid-cols-2 md:gap-[2px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${flip}-${viewMode}`}
                  initial={{ opacity: 0.65, scale: 0.995 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="contents"
                >
                  {isSheetMode && pdfDoc ? (
                    <>
                      <PdfPageSheet
                        pdfDoc={pdfDoc}
                        pageNumber={page * 2 + 1}
                        activeWordIndex={active}
                        wordPositions={pdfWordPositions.get(page * 2 + 1) ?? []}
                        onWordClick={seek}
                        theme={theme}
                        highlight={highlight}
                        side="left"
                        isMobileActive={!isMobileRightPage}
                        zoom={pdfZoom}
                      />
                      <PdfPageSheet
                        pdfDoc={pdfDoc}
                        pageNumber={page * 2 + 2}
                        activeWordIndex={active}
                        wordPositions={pdfWordPositions.get(page * 2 + 2) ?? []}
                        onWordClick={seek}
                        theme={theme}
                        highlight={highlight}
                        side="right"
                        isMobileActive={isMobileRightPage}
                        zoom={pdfZoom}
                      />
                    </>
                  ) : (
                    currentSpread.map((side, sideIndex) => {
                      const isRight = sideIndex === 1
                      const isMobileVisible = isRight ? isMobileRightPage : !isMobileRightPage
                      return (
                        <article
                          key={sideIndex}
                          className={`relative min-h-[540px] sm:min-h-[640px] md:min-h-[760px] overflow-hidden p-6 sm:p-8 md:p-12 ${pageBg} ${
                            isRight
                              ? 'book-page-curve-right rounded-r-[2px] md:pl-12'
                              : 'book-page-curve-left rounded-l-[2px] md:pr-12'
                          } ${isMobileVisible ? 'block' : 'hidden md:block'}`}
                          style={{ fontFamily: font === 'Monospace' ? 'monospace' : font, fontSize, lineHeight }}
                        >
                          {/* Sombra suave interna da encadernação */}
                          <div
                            className={`pointer-events-none absolute bottom-0 ${
                              sideIndex === 0 ? 'right-0 bg-gradient-to-l' : 'left-0 bg-gradient-to-r'
                            } top-0 w-6 from-black/15 to-transparent opacity-70`}
                          />

                          <div className={`${textColors} select-text leading-relaxed`}>
                            {side.map((word) => {
                              const index = words.indexOf(word)
                              const isActive = index === active
                              const dimmed = highlight === 'focus' && active !== index
                              return (
                                <span
                                  key={index}
                                  className={
                                    word.p.includes('\n\n')
                                      ? 'mb-[0.9em] block'
                                      : word.p.includes('\n')
                                      ? 'after:content-["\\A"] after:whitespace-pre'
                                      : ''
                                  }
                                >
                                  <button
                                    onClick={() => seek(index)}
                                    className={`mr-[0.22em] inline rounded-[3px] text-left transition-all duration-150 ${
                                      dimmed ? 'opacity-35' : ''
                                    } ${
                                      isActive
                                        ? highlight === 'underline'
                                          ? 'border-b-[3px] border-amber-500 font-bold text-amber-600 dark:text-amber-400'
                                          : 'bg-amber-500/25 ring-2 ring-amber-400/50 font-bold text-amber-950 dark:text-amber-200 shadow-xs'
                                        : 'hover:bg-amber-500/10'
                                    }`}
                                    aria-label={`Pular para ${word.p.replace(/\n/g, '')}`}
                                  >
                                    {word.p.replace(/\n/g, '')}
                                  </button>
                                  {word.p.includes('\n\n') ? null : ' '}
                                </span>
                              )
                            })}
                          </div>

                          <div
                            className={`absolute bottom-3 sm:bottom-4 ${
                              sideIndex === 0 ? 'left-6 sm:left-8' : 'right-6 sm:right-8'
                            } text-[10px] sm:text-[11px] font-medium ${
                              theme === 'night' ? 'text-white/30' : 'text-black/30'
                            }`}
                          >
                            {page * 2 + sideIndex + 1}
                          </div>
                        </article>
                      )
                    })
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Page Switcher Bar */}
        <div className="mx-auto mt-3 sm:mt-5 mb-2 flex w-full max-w-[1120px] items-center justify-between text-xs text-[#9aa6b6]">
          <button
            onClick={() => navigate(page - 1)}
            disabled={page === 0}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft className="size-4" />
            <span>Anterior</span>
          </button>

          <span className="font-medium text-amber-400/90 text-[11px] sm:text-xs">
            <span className="hidden sm:inline">Páginas {page * 2 + 1}–{Math.min(page * 2 + 2, totalPages)} de {totalPages}</span>
            <span className="sm:hidden">
              Página {isMobileRightPage ? Math.min(page * 2 + 2, totalPages) : page * 2 + 1} de {totalPages}
            </span>
          </span>

          <button
            onClick={() => navigate(page + 1)}
            disabled={page >= totalSpreads - 1}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <span>Próxima</span>
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Floating Ergonomic Audio Player Dock */}
      <footer className="fixed bottom-3 sm:bottom-5 left-1/2 z-40 flex w-[calc(100%-16px)] sm:w-[calc(100%-32px)] max-w-4xl -translate-x-1/2 flex-col gap-2 rounded-2xl border border-white/15 bg-[#101318]/92 p-3 sm:px-6 sm:py-3.5 text-white shadow-2xl backdrop-blur-2xl safe-area-bottom">
        {/* Scrubber & Time */}
        <div className="flex w-full items-center gap-2.5">
          <span className="w-10 text-right text-[10px] sm:text-xs font-mono text-amber-400/80">
            {Math.floor(time / 60)}:{String(Math.floor(time % 60)).padStart(2, '0')}
          </span>

          <div className="relative flex-1">
            <input
              aria-label="Progresso do áudio"
              type="range"
              min="0"
              max={duration}
              step="0.01"
              value={time}
              onChange={(e) => {
                const t = Number(e.target.value)
                if (audioRef.current) audioRef.current.currentTime = t
                saveProgress(t)
                setActive(findWord(words, t))
              }}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-amber-500 hover:accent-amber-400"
            />
          </div>

          <span className="w-10 text-[10px] sm:text-xs font-mono text-[#8a96a6]">
            {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
          </span>
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between">
          {/* Left: Quick Page info or upload */}
          <div className="flex items-center gap-2 text-xs text-[#9aa6b6]">
            <span className="hidden sm:inline font-medium text-amber-400/70">
              Spreads: {page + 1}/{totalSpreads}
            </span>
          </div>

          {/* Center Playback Controls */}
          <div className="flex items-center gap-2.5 sm:gap-4 mx-auto">
            <button
              onClick={() => handleSkip(-10)}
              className="flex size-9 sm:size-10 items-center justify-center rounded-full text-[#c8d0dc] hover:bg-white/10 hover:text-white transition-colors"
              title="Voltar 10 segundos"
              aria-label="Voltar 10 segundos"
            >
              <RotateCcw className="size-4 sm:size-5" />
            </button>

            <button
              onClick={() => void togglePlayback()}
              disabled={!audioUrl}
              className="flex size-11 sm:size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-[#0b1117] shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
              aria-label={playing ? 'Pausar' : 'Reproduzir'}
              title={audioUrl ? (playing ? 'Pausar' : 'Reproduzir') : 'Carregando áudio...'}
            >
              {playing ? <Pause className="size-5 fill-current" /> : <Play className="ml-0.5 size-5 fill-current" />}
            </button>

            <button
              onClick={() => handleSkip(10)}
              className="flex size-9 sm:size-10 items-center justify-center rounded-full text-[#c8d0dc] hover:bg-white/10 hover:text-white transition-colors"
              title="Avançar 10 segundos"
              aria-label="Avançar 10 segundos"
            >
              <RotateCw className="size-4 sm:size-5" />
            </button>
          </div>

          {/* Right: Speed Button */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={cycleSpeed}
              className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-semibold text-amber-300 hover:bg-white/10 transition-colors"
              title="Alterar velocidade de reprodução"
            >
              {speed}x
            </button>
          </div>
        </div>
      </footer>

      {/* Upload Modal (fallback / legacy support) */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <section className="w-full max-w-md rounded-2xl border border-white/15 bg-[#12161f] p-6 shadow-2xl text-[#f5f2eb]">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="font-serif text-lg font-semibold">Carregar Audiobook</h2>
                <p className="mt-1 text-xs text-[#9aa6b6]">Áudio sincronizado com timestamps de palavras.</p>
              </div>
              <button onClick={() => setUploadOpen(false)} className="text-[#9aa6b6] hover:text-white">
                <X className="size-5" />
              </button>
            </div>
            <div className="grid gap-3">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/20 p-4 hover:bg-white/5 transition-colors">
                <FileAudio className="size-5 text-amber-400" />
                <span className="flex-1 text-sm">
                  Arquivo de áudio <small className="block text-[#9aa6b6]">MP3, WAV, M4A</small>
                </span>
                <input
                  type="file"
                  accept="audio/*"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) selectAudio(file)
                  }}
                />
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/20 p-4 hover:bg-white/5 transition-colors">
                <FileJson className="size-5 text-amber-400" />
                <span className="flex-1 text-sm">
                  Limites das palavras <small className="block text-[#9aa6b6]">JSON com p, i, f</small>
                </span>
                <input
                  type="file"
                  accept="application/json,.json"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) selectJson(file).catch(() => {})
                  }}
                />
              </label>
            </div>
            <button
              onClick={loadDemo}
              className="mt-5 w-full rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-3 text-sm font-semibold text-[#0b1117] transition-colors"
            >
              Carregar demonstração
            </button>
          </section>
        </div>
      )}
    </main>
  )
}
