'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, FileAudio, FileJson, Minus, Pause, Play, Plus, Settings2, SkipBack, SkipForward, Upload, X } from 'lucide-react'

 type Word = { p: string; i: number; f: number }

const demoText = `Entendendo Algoritmos. Um guia ilustrado para programadores e outras pessoas curiosas. Este capítulo apresenta uma forma prática de pensar sobre problemas e construir soluções elegantes. Algoritmos são apenas passos que seguimos para resolver uma tarefa. Quando você aprende a reconhecer padrões, consegue transformar problemas complexos em pequenos problemas mais simples. A busca binária é um exemplo clássico: em vez de verificar cada item, eliminamos metade das possibilidades a cada tentativa. Essa ideia aparece em muitos lugares, desde listas ordenadas até sistemas de recomendação. A recursão é outra ferramenta poderosa. Para entender recursão, primeiro precisamos entender o caso-base, que é quando a função para de chamar a si mesma. Em seguida vem o caso recursivo, que reduz o problema até chegar ao caso-base. Com prática, essas ideias se tornam uma segunda natureza. O objetivo não é memorizar cada algoritmo, mas aprender a escolher a ferramenta certa para cada situação.`

function makeWords(text: string): Word[] { return text.match(/\S+(?:\n\n|\n)?/g)?.map((p, i) => ({ p, i: i * 0.72, f: i * 0.72 + 0.58 })) ?? [] }
function findWord(words: Word[], time: number) { let lo = 0, hi = words.length - 1, answer = 0; while (lo <= hi) { const mid = (lo + hi) >> 1; if (words[mid].i <= time) { answer = mid; lo = mid + 1 } else hi = mid - 1 } return words[answer]?.f >= time ? answer : answer }
function storageKey(prefix: string, bookName: string) { return `${prefix}_${bookName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')}` }

export function AudiobookReader({ userName, bookId }: { userName?: string; bookId?: string }) {
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
  const [theme, setThemeState] = useState('sepia')
  const [highlight, setHighlight] = useState('blue')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [page, setPage] = useState(0)
  const [flip, setFlip] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
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

  const wordsPerPage = Math.max(34, Math.round(58 - (fontSize - 16) * 1.6 - (lineHeight - 1.5) * 10))
  const pages = useMemo(() => { const result: Word[][] = []; for (let i = 0; i < words.length; i += wordsPerPage) result.push(words.slice(i, i + wordsPerPage)); return result }, [words, wordsPerPage])
  const totalSpreads = Math.max(1, Math.ceil(pages.length / 2))
  const spreadStart = page * wordsPerPage * 2
  const currentSpread = [words.slice(spreadStart, spreadStart + wordsPerPage), words.slice(spreadStart + wordsPerPage, spreadStart + wordsPerPage * 2)]
  const duration = audioDuration ?? Math.max(1, (words.at(-1)?.f ?? 1) + 0.5)

  const syncReaderToTime = useCallback((nextTime: number) => {
    if (!Number.isFinite(nextTime) || nextTime < 0) return
    const index = findWord(words, nextTime)
    setTime(nextTime)
    setActive(index)
    setPage(Math.min(totalSpreads - 1, Math.floor(index / (wordsPerPage * 2))))
  }, [totalSpreads, words, wordsPerPage])

  const tick = useCallback(() => { const next = audioRef.current ? audioRef.current.currentTime : Math.min(duration, time + 0.045 * speed); setTime(next); const index = findWord(words, next); setActive(index); const nextPage = Math.min(totalSpreads - 1, Math.floor(index / (wordsPerPage * 2))); if (nextPage !== page) { setPage(nextPage); setFlip((value) => value + 1) }; if (playing) rafRef.current = requestAnimationFrame(tick) }, [duration, page, playing, speed, time, totalSpreads, words, wordsPerPage])
  useEffect(() => { if (playing) rafRef.current = requestAnimationFrame(tick); return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) } }, [playing, tick])

  useEffect(() => {
    let cancelled = false
    fetch(bookId ? `/api/books?id=${encodeURIComponent(bookId)}` : '/api/books').then(response => response.ok ? response.json() : null).then(async payload => {
      const savedBook = payload?.book as { name?: string; audioUrl?: string; jsonUrl?: string } | null
      if (cancelled || !savedBook?.audioUrl) {
        setIsLoading(false)
        return
      }

      // Set the source independently of the word-map request so a slow or
      // unavailable JSON fetch cannot leave the play button disabled.
      const savedName = savedBook.name || 'Audiobook'
      setTitle(savedName)
      setAudioUrl(savedBook.audioUrl)
      try {
        const progressPath = bookId
          ? `/api/progress?bookId=${encodeURIComponent(bookId)}`
          : `/api/progress?bookName=${encodeURIComponent(savedName)}`
        const progressResponse = await fetch(progressPath)
        if (progressResponse.ok) {
          const progressPayload = await progressResponse.json() as { currentTime?: number; listenedSeconds?: number | null; durationSeconds?: number | null }
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
      } catch {
        // Local storage remains the fallback when the progress request is unavailable.
      }

      if (!savedBook.jsonUrl) {
        setIsLoading(false)
        return
      }
      try {
        const jsonResponse = await fetch(savedBook.jsonUrl, { cache: 'no-store' })
        if (!jsonResponse.ok) throw new Error(`Map request failed: ${jsonResponse.status}`)
        const payload = await jsonResponse.json() as Word[] | { words?: Word[] }
        const savedWords = Array.isArray(payload) ? payload : payload.words
        if (!Array.isArray(savedWords) || !savedWords[0]?.p || cancelled) return
        setWords(savedWords)
        // Keep the complete map in React state. The timestamp can arrive from
        // Neon after this request, so the synchronization below runs again when
        // restoreTime changes instead of restoring against a stale closure value.
      } catch {
        // The audio remains playable even if the map needs to be retried.
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }).catch(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (restoredBookRef.current === bookKey) return
    restoredBookRef.current = bookKey
    try {
      const savedProgress = Number(localStorage.getItem(progressKey))
      storageHydratedRef.current = true
      const savedSettings = JSON.parse(localStorage.getItem(settingsKey) || '{}') as { theme?: string; fontSize?: number; font?: string; speed?: number }
      const savedListeningValue = localStorage.getItem(listenedSecondsKey)
      if (savedListeningValue !== null) {
        const savedListening = Number(savedListeningValue)
        if (Number.isFinite(savedListening) && savedListening >= 0) {
          listenedSecondsRef.current = Math.max(savedListening, listenedSecondsRef.current)
          listenedSecondsMeasuredRef.current = true
        }
      }
      if (savedSettings.theme === 'sepia' || savedSettings.theme === 'light' || savedSettings.theme === 'night') setThemeState(savedSettings.theme)
      if (typeof savedSettings.fontSize === 'number') setFontSize(Math.min(30, Math.max(16, savedSettings.fontSize)))
      if (typeof savedSettings.font === 'string') setFont(savedSettings.font)
      if (typeof savedSettings.speed === 'number') setSpeed(savedSettings.speed)
      if (savedProgress > 0 && savedProgress < duration) setResumePrompt(savedProgress)
    } catch {}
  }, [bookKey, duration, listenedSecondsKey, progressKey, settingsKey])

  useEffect(() => {
    if (!storageHydratedRef.current) return
    try { localStorage.setItem(progressKey, String(time)) } catch {}
  }, [progressKey, time])
  useEffect(() => {
    if (!storageHydratedRef.current) return
    try { localStorage.setItem(settingsKey, JSON.stringify({ theme, fontSize, font, speed })) } catch {}
  }, [font, fontSize, settingsKey, speed, theme])
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
    ) return

    const nextTime = Math.min(Math.max(0, restoreTime), Math.max(0, mediaDuration - 0.05))
    if (!Number.isFinite(nextTime)) return
    audio.currentTime = nextTime
    syncReaderToTime(nextTime)
  }, [audioReady, restoreTime, syncReaderToTime])

  function setTheme(nextTheme: string) {
    if (nextTheme !== 'sepia' && nextTheme !== 'light' && nextTheme !== 'night') return
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
      try { localStorage.setItem(listenedSecondsKey, String(listenedSecondsRef.current)) } catch {}
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
    playbackSampleRef.current = !audio.paused || force
      ? { position: audio.currentTime, wallTime: now }
      : null
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
  function navigate(nextPage: number) { const next = Math.max(0, Math.min(totalSpreads - 1, nextPage)); setPage(next); setFlip((value) => value + 1); const index = next * wordsPerPage * 2; if (words[index]) seek(index) }
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
    // isLoading will be cleared by the onLoadedMetadata / audioReady flow
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
  function loadDemo() { setWords(makeWords(demoText)); setTitle('Entendendo Algoritmos'); setPage(0); setActive(0); setTime(0); setUploadOpen(false) }
  const textColors = theme === 'night' ? 'text-[#e7e2d7]' : 'text-[#25231f]'
  const pageBg = theme === 'night' ? 'bg-[#181a1b]' : theme === 'light' ? 'bg-white' : 'bg-[#fbf8f1]'

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

  return <main className="min-h-screen overflow-hidden bg-[#e8e4db] text-[#242320]" style={{ backgroundImage: 'radial-gradient(#c6c0b4 0.7px, transparent 0.7px)', backgroundSize: '17px 17px' }}>
    <AnimatePresence>
      {isLoading && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-[#20201e]/35 p-6 backdrop-blur-md" role="status" aria-live="polite" aria-label="Carregando livro">
        <div className="flex min-w-[190px] flex-col items-center gap-4 rounded-2xl border border-white/20 bg-[#faf9f6]/90 px-8 py-7 text-center shadow-2xl">
          <div className="size-9 animate-spin rounded-full border-[3px] border-[#d8d0c4] border-t-[#20201e]" aria-hidden="true" />
          <div><p className="font-semibold text-[#292723]">Carregando seu livro</p><p className="mt-1 text-sm text-[#756e65]">Preparando áudio e mapa de palavras</p></div>
        </div>
      </motion.div>}
    </AnimatePresence>
    <audio
      ref={audioRef}
      src={audioUrl ?? undefined}
      preload="metadata"
      onLoadedMetadata={handleAudioLoadedMetadata}
      onTimeUpdate={handleAudioTimeUpdate}
      onSeeking={() => { playbackSampleRef.current = null }}
      onSeeked={(event) => {
        if (!event.currentTarget.paused) {
          playbackSampleRef.current = { position: event.currentTarget.currentTime, wallTime: performance.now() }
        }
      }}
      onPause={handleAudioPause}
      onPlay={handleAudioPlay}
      onEnded={handleAudioEnd}
    />
    <AnimatePresence>{resumePrompt !== null && <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="fixed left-1/2 top-20 z-40 w-[calc(100%-32px)] max-w-lg -translate-x-1/2 rounded-2xl border border-black/10 bg-[#faf9f6] p-5 shadow-2xl"><p className="text-sm font-semibold">Deseja continuar de onde parou?</p><p className="mt-1 text-sm text-[#756e65]">Você estava em {Math.floor(resumePrompt / 60)}:{String(Math.floor(resumePrompt % 60)).padStart(2, '0')}.</p><div className="mt-4 flex gap-2"><button onClick={() => { const audio = audioRef.current; const mediaDuration = audio?.duration ?? 0; const nextTime = Number.isFinite(mediaDuration) && mediaDuration > 0 ? Math.min(resumePrompt, Math.max(0, mediaDuration - 0.05)) : resumePrompt; if (audio && Number.isFinite(nextTime)) audio.currentTime = nextTime; syncReaderToTime(nextTime); setRestoreTime(nextTime); setResumePrompt(null) }} className="rounded-xl bg-[#20201e] px-4 py-2 text-sm font-medium text-white">Sim, continuar</button><button onClick={() => { saveProgress(0); setResumePrompt(null); setTime(0); setActive(0); setPage(0) }} className="rounded-xl border border-black/10 px-4 py-2 text-sm">Recomeçar do início</button></div></motion.div>}</AnimatePresence>
    <header className="relative z-20 flex h-[76px] items-center justify-between border-b border-black/10 bg-[#f7f5f0]/90 px-5 backdrop-blur-md md:px-10">
      <div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-lg bg-[#20201e] text-[#f8f3e7]"><BookOpen className="size-5" /></div><div><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#777166]">Synchronized Reader</p><h1 className="font-serif text-lg font-medium">{title}</h1></div></div>
      <div className="flex items-center gap-2"><span className="hidden text-xs text-[#756e65] lg:inline">{userName}</span><button onClick={() => setSettingsOpen(!settingsOpen)} className="flex items-center gap-2 rounded-full border border-black/10 bg-white/60 px-3 py-2 text-sm hover:bg-white" aria-label="Text settings"><span className="font-serif font-bold">Aa</span><span className="hidden sm:inline">Reading settings</span><Settings2 className="size-4" /></button><button onClick={() => setUploadOpen(true)} className="flex items-center gap-2 rounded-full bg-[#20201e] px-4 py-2 text-sm font-medium text-white hover:bg-black"><Upload className="size-4" /> <span className="hidden sm:inline">Load book</span></button></div>
      <AnimatePresence>{settingsOpen && <motion.section initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute right-5 top-[68px] w-[310px] rounded-2xl border border-black/10 bg-[#faf9f6] p-5 shadow-xl md:right-10"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Reading settings</h2><button onClick={() => setSettingsOpen(false)}><X className="size-4" /></button></div><label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-[#80796e]">Typeface<select value={font} onChange={e => setFont(e.target.value)} className="mt-1 w-full rounded-lg border border-black/10 bg-white p-2 text-sm"><option>Arial</option><option>Georgia</option><option>Verdana</option><option>Monospace</option></select></label><div className="mb-4 flex items-center justify-between"><span className="text-sm">Text size · {fontSize}px</span><div className="flex gap-1"><button onClick={() => setFontSize(v => Math.max(16, v - 1))} className="rounded-md border p-2"><Minus className="size-3" /></button><button onClick={() => setFontSize(v => Math.min(30, v + 1))} className="rounded-md border p-2"><Plus className="size-3" /></button></div></div><label className="mb-4 block text-xs font-semibold uppercase tracking-wider text-[#80796e]">Line spacing<select value={lineHeight} onChange={e => setLineHeight(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-black/10 bg-white p-2 text-sm"><option value={1.5}>1.5</option><option value={1.7}>1.7</option><option value={2}>2.0</option><option value={2.2}>2.2</option></select></label><div className="mb-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#80796e]">Theme</p><div className="grid grid-cols-3 gap-2">{[['sepia','Warm paper'],['light','Pure light'],['night','Dark night']].map(([id, label]) => <button key={id} onClick={() => setTheme(id)} className={`rounded-lg border p-2 text-xs ${theme === id ? 'border-[#0066ff] ring-1 ring-[#0066ff]' : ''}`}>{label}</button>)}</div></div><div><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#80796e]">Highlight</p><select value={highlight} onChange={e => setHighlight(e.target.value)} className="w-full rounded-lg border border-black/10 bg-white p-2 text-sm"><option value="blue">Blue highlight + bottom line</option><option value="underline">Blue underline only</option><option value="focus">Focus / karaoke mode</option></select></div></motion.section>}</AnimatePresence>
    </header>
    <div className="mx-auto flex max-w-[1280px] flex-col px-4 pb-36 pt-8 md:px-10 md:pt-12"><div className="mb-6 flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#887f73]">Chapter 01 · The basics</p><p className="mt-1 text-sm text-[#766f66]">{Math.round((active / Math.max(1, words.length - 1)) * 100)}% completed · {words.length.toLocaleString()} words</p></div><button onClick={() => setBookmarked(!bookmarked)} className="rounded-full border border-black/10 bg-white/50 p-2.5" aria-label="Bookmark page">{bookmarked ? <BookmarkCheck className="size-5 fill-[#20201e]" /> : <Bookmark className="size-5" />}</button></div>
      <div className="relative mx-auto w-full max-w-[1120px] [perspective:2000px]"><div className="absolute -inset-x-5 bottom-[-18px] h-10 rounded-[50%] bg-black/20 blur-2xl" /><div className="relative grid min-h-[560px] grid-cols-1 overflow-hidden rounded-[4px] bg-[#b0a99e] p-2 shadow-2xl md:grid-cols-2 md:gap-[2px] md:p-3"><div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 hidden w-8 -translate-x-1/2 bg-gradient-to-r from-transparent via-black/15 to-transparent md:block" /><AnimatePresence mode="wait"><motion.div key={flip} initial={{ rotateY: -88, opacity: 0.4 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }} className="contents">{currentSpread.map((side, sideIndex) => <article key={sideIndex} className={`relative min-h-[550px] overflow-hidden p-7 shadow-[inset_0_0_28px_rgba(90,69,40,0.07)] sm:p-10 md:p-12 ${pageBg} ${sideIndex === 0 ? 'rounded-l-[2px] md:pr-14' : 'hidden rounded-r-[2px] md:block md:pl-14'}`} style={{ fontFamily: font === 'Monospace' ? 'monospace' : font, fontSize, lineHeight }}><div className={`absolute bottom-0 ${sideIndex === 0 ? 'left-0' : 'right-0'} top-0 w-4 bg-gradient-to-r from-black/10 to-transparent opacity-50`} /><p className={`mb-7 text-[10px] font-bold uppercase tracking-[0.28em] ${theme === 'night' ? 'text-white/40' : 'text-black/30'}`}>{sideIndex === 0 ? 'Entendendo algoritmos' : '01 · fundamentos'}</p><div className={textColors}>{side.map(word => { const index = words.indexOf(word); const isActive = index === active; const dimmed = highlight === 'focus' && active !== index; return <span key={index} className={word.p.includes('\n\n') ? 'mb-[0.9em] block' : word.p.includes('\n') ? 'after:content-["\\A"] after:whitespace-pre' : ''}><button onClick={() => seek(index)} className={`mr-[0.25em] inline rounded-sm text-left transition-all duration-150 ${dimmed ? 'opacity-40' : ''} ${isActive ? (highlight === 'underline' ? 'border-b-[3px] border-[#0066ff] font-bold text-[#003380]' : 'bg-[#cce0ff] font-bold text-[#003380]') : ''}`} aria-label={`Seek to ${word.p.replace(/\n/g, '')}`}>{word.p.replace(/\n/g, '')}</button>{word.p.includes('\n\n') ? null : ' '}</span> })}</div><div className={`absolute bottom-5 ${sideIndex === 0 ? 'left-8' : 'right-8'} text-[10px] font-medium ${theme === 'night' ? 'text-white/30' : 'text-black/30'}`}>{page * 2 + sideIndex + 1}</div></article>)}</motion.div></AnimatePresence></div></div>
      <div className="mx-auto mt-6 flex w-full max-w-[1120px] items-center justify-between text-xs text-[#766f66]"><button onClick={() => navigate(page - 1)} disabled={page === 0} className="flex items-center gap-1 rounded-full px-3 py-2 hover:bg-white/50 disabled:opacity-30"><ChevronLeft className="size-4" /> Previous spread</button><span>Page {page * 2 + 1}–{Math.min(page * 2 + 2, pages.length)} of {pages.length}</span><button onClick={() => navigate(page + 1)} disabled={page >= totalSpreads - 1} className="flex items-center gap-1 rounded-full px-3 py-2 hover:bg-white/50 disabled:opacity-30">Next spread <ChevronRight className="size-4" /></button></div>
    </div>
    <footer className="fixed bottom-5 left-1/2 z-30 flex w-[calc(100%-24px)] max-w-[920px] -translate-x-1/2 items-center gap-3 rounded-2xl border border-white/60 bg-[#252522]/95 px-4 py-3 text-white shadow-2xl backdrop-blur-xl md:gap-5 md:px-6"><button onClick={() => { const t = Math.max(0, time - 10); if (audioRef.current) audioRef.current.currentTime = t; setTime(t) }} className="hidden text-white/60 hover:text-white sm:block"><SkipBack className="size-4" /></button><button onClick={() => void togglePlayback()} disabled={!audioUrl} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-[#252522] hover:bg-[#dfe9ff] disabled:cursor-not-allowed disabled:opacity-50" aria-label={playing ? 'Pause' : 'Play'} title={audioUrl ? (playing ? 'Pause' : 'Play') : 'Load an audio file first'}>{playing ? <Pause className="size-4 fill-current" /> : <Play className="ml-0.5 size-4 fill-current" />}</button><button onClick={() => { const t = Math.min(duration, time + 10); if (audioRef.current) audioRef.current.currentTime = t; setTime(t) }} className="hidden text-white/60 hover:text-white sm:block"><SkipForward className="size-4" /></button><div className="min-w-0 flex-1"><div className="mb-1 flex justify-between text-[10px] text-white/50"><span>{Math.floor(time / 60)}:{String(Math.floor(time % 60)).padStart(2, '0')}</span><span>{Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}</span></div><input aria-label="Audio progress" type="range" min="0" max={duration} step="0.01" value={time} onChange={e => { const t = Number(e.target.value); if (audioRef.current) audioRef.current.currentTime = t; saveProgress(t); setActive(findWord(words, t)) }} className="h-1 w-full accent-[#8db7ff]" /></div><select value={speed} onChange={e => setSpeed(Number(e.target.value))} className="hidden rounded-md border border-white/15 bg-white/10 px-2 py-1 text-xs sm:block"><option value={0.75}>0.75x</option><option value={1}>1x</option><option value={1.25}>1.25x</option><option value={1.5}>1.5x</option><option value={2}>2x</option></select><span className="hidden whitespace-nowrap text-xs text-white/60 md:block">{page + 1} / {totalSpreads}</span></footer>
    {uploadOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"><section className="w-full max-w-md rounded-2xl bg-[#faf9f6] p-6 shadow-2xl"><div className="mb-6 flex items-start justify-between"><div><h2 className="text-xl font-semibold">Load your audiobook</h2><p className="mt-1 text-sm text-[#756e65]">Pair audio with word-level timestamps.</p></div><button onClick={() => setUploadOpen(false)}><X className="size-5" /></button></div><div className="grid gap-3"><label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-black/20 p-4 hover:bg-white"><FileAudio className="size-5" /><span className="flex-1 text-sm">Audio file <small className="block text-[#867d72]">MP3, WAV, M4A</small></span><input type="file" accept="audio/*" className="sr-only" onChange={e => { const file = e.target.files?.[0]; if (file) selectAudio(file) }} /></label><label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-black/20 p-4 hover:bg-white"><FileJson className="size-5" /><span className="flex-1 text-sm">Word boundaries <small className="block text-[#867d72]">JSON array with p, i, f</small></span><input type="file" accept="application/json,.json" className="sr-only" onChange={e => { const file = e.target.files?.[0]; if (file) selectJson(file).catch(() => {}) }} /></label></div><button onClick={loadDemo} className="mt-5 w-full rounded-xl bg-[#20201e] px-4 py-3 text-sm font-medium text-white hover:bg-black">Load demo book</button></section></div>}
  </main>
}
