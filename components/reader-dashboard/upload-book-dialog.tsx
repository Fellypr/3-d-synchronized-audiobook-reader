'use client'

import { useRef, useState } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import {
  FileAudio2,
  FileJson2,
  Upload,
  X,
  Loader2,
  Type,
  Image as ImageIcon,
  Sparkles,
  FileText,
  Mic,
  Gauge,
} from 'lucide-react'
import { upload } from '@vercel/blob/client'
import { useSession } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AudiobookApiClient } from '@/lib/audiobook-api-client'

type UploadBookDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdded: () => void
  userId?: string
}

type ExistingBook = { id: string; name: string }

type UploadMode = 'ai' | 'manual'

const VOZES_DISPONIVEIS = [
  { id: 'pt-BR-AntonioNeural', nome: 'Antônio (Masculino - Natural/Expressivo)' },
  { id: 'pt-BR-FranciscaNeural', nome: 'Francisca (Feminino - Fluido/Profissional)' },
  { id: 'pt-BR-ThalitaNeural', nome: 'Thalita (Feminino - Expressivo/Jovem)' },
  { id: 'pt-PT-DuarteNeural', nome: 'Duarte (Português de Portugal - Masculino)' },
  { id: 'pt-PT-RaquelNeural', nome: 'Raquel (Português de Portugal - Feminino)' },
]

async function uploadToBlob(
  pathname: string,
  file: File,
  onProgress?: (percentage: number) => void,
) {
  try {
    return await upload(pathname, file, {
      access: 'private',
      handleUploadUrl: '/api/books/upload',
      multipart: file.size > 4.5 * 1024 * 1024,
      onUploadProgress: onProgress ? ({ percentage }) => onProgress(percentage) : undefined,
    })
  } catch (err: any) {
    const msg = err?.message || String(err)
    if (msg.includes('public') || msg.includes('access mode') || msg.includes('BlobAccessError')) {
      return await upload(pathname, file, {
        access: 'public',
        handleUploadUrl: '/api/books/upload',
        multipart: file.size > 4.5 * 1024 * 1024,
        onUploadProgress: onProgress ? ({ percentage }) => onProgress(percentage) : undefined,
      })
    }
    throw err
  }
}

function cleanFileNameToTitle(fileName: string) {
  return fileName
    .replace(/\.(json|mp3|wav|m4a|aac|ogg|flac|opus|pdf|docx)$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim()
}

export function UploadBookDialog({ open, onOpenChange, onAdded, userId }: UploadBookDialogProps) {
  const { data: session } = useSession()
  const activeUserId = userId || session?.user?.id

  const [mode, setMode] = useState<UploadMode>('ai')

  // Inputs manuais
  const audioInputRef = useRef<HTMLInputElement>(null)
  const jsonInputRef = useRef<HTMLInputElement>(null)
  const [audio, setAudio] = useState<File | null>(null)
  const [wordMap, setWordMap] = useState<File | null>(null)

  // Inputs de IA (PDF/DOCX)
  const docInputRef = useRef<HTMLInputElement>(null)
  const [docFile, setDocFile] = useState<File | null>(null)
  const [selectedVoice, setSelectedVoice] = useState('pt-BR-AntonioNeural')
  const [selectedRate, setSelectedRate] = useState('+0%')
  const [headerFilter, setHeaderFilter] = useState('')

  // Campos compartilhados
  const [title, setTitle] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [isTitleCustomized, setIsTitleCustomized] = useState(false)
  const [busy, setBusy] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [conflict, setConflict] = useState<ExistingBook | null>(null)
  const pendingFilesRef = useRef<{ audio: File; json: File; name: string } | null>(null)

  function setAudioFile(file?: File) {
    setAudio(file ?? null)
    setFieldError('')
    setError('')
    setConflict(null)
    if (file && (!title.trim() || !isTitleCustomized) && !wordMap) {
      setTitle(cleanFileNameToTitle(file.name))
    }
  }

  function setMapFile(file?: File) {
    setWordMap(file ?? null)
    setFieldError('')
    setError('')
    setConflict(null)
    if (file && (!title.trim() || !isTitleCustomized)) {
      setTitle(cleanFileNameToTitle(file.name))
    }
  }

  function setDocumentFile(file?: File) {
    setDocFile(file ?? null)
    setFieldError('')
    setError('')
    setConflict(null)
    if (file && (!title.trim() || !isTitleCustomized)) {
      setTitle(cleanFileNameToTitle(file.name))
    }
  }

  function resetAndClose() {
    setAudio(null)
    setWordMap(null)
    setDocFile(null)
    setTitle('')
    setCoverUrl('')
    setHeaderFilter('')
    setIsTitleCustomized(false)
    setConflict(null)
    setError('')
    setFieldError('')
    setUploadStatus('')
    setUploadProgress(0)
    pendingFilesRef.current = null
    if (audioInputRef.current) audioInputRef.current.value = ''
    if (jsonInputRef.current) jsonInputRef.current.value = ''
    if (docInputRef.current) docInputRef.current.value = ''
    onOpenChange(false)
    onAdded()
  }

  /**
   * Salva os arquivos de áudio e mapa na infraestrutura permanente (Vercel Blob / Local Storage)
   */
  async function persistBookFiles(audioFile: File, jsonFile: File, bookName: string, replaceExisting = false) {
    const sanitizedName = bookName.replace(/[^a-z0-9_-]+/gi, '_')
    const audioExt = audioFile.name.split('.').pop()?.toLowerCase() || 'mp3'
    const userFolder = activeUserId ? `audiobooks/${activeUserId}` : 'audiobooks'
    const audioPathname = `${userFolder}/${sanitizedName}.${audioExt}`
    const jsonPathname = `${userFolder}/${sanitizedName}.json`

    let usedDirectUpload = false
    let directAudioPathname = ''
    let directJsonPathname = ''
    let directError: Error | null = null

    try {
      setUploadStatus('Salvando mapa de palavras na nuvem...')
      const jsonBlob = await uploadToBlob(jsonPathname, jsonFile)
      directJsonPathname = jsonBlob.pathname

      const audioMb = (audioFile.size / (1024 * 1024)).toFixed(1)
      setUploadStatus(`Salvando áudio: 0% (${audioMb} MB)...`)
      const audioBlob = await uploadToBlob(audioPathname, audioFile, (percentage) => {
        setUploadProgress(percentage)
        setUploadStatus(`Salvando áudio: ${percentage}% de ${audioMb} MB`)
      })
      directAudioPathname = audioBlob.pathname
      usedDirectUpload = true
    } catch (directErr) {
      directError = directErr instanceof Error ? directErr : new Error(String(directErr))
      console.warn('[upload] Direct client upload failed, tentando fallback:', directErr)
    }

    if (usedDirectUpload) {
      setUploadProgress(100)
      setUploadStatus('Registrando livro na biblioteca...')
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: bookName,
          coverUrl: coverUrl.trim() || undefined,
          audioUrl: directAudioPathname,
          jsonUrl: directJsonPathname,
          replaceExisting,
        }),
      })

      let payload: any = null
      try {
        payload = await response.json()
      } catch {}

      if (response.status === 409 && payload?.book) {
        pendingFilesRef.current = { audio: audioFile, json: jsonFile, name: bookName }
        setConflict(payload.book)
        return
      }

      if (!response.ok) {
        setError(payload?.error || 'Erro ao registrar livro na biblioteca.')
        return
      }

      resetAndClose()
      return
    }

    const isLocalhost = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.endsWith('.local')
    )

    if (!isLocalhost && audioFile.size > 4.5 * 1024 * 1024) {
      const detail = directError?.message || 'Falha ao conectar com o Vercel Blob.'
      setError(`Não foi possível enviar o áudio (${(audioFile.size / (1024 * 1024)).toFixed(1)} MB): ${detail}`)
      return
    }

    // Fallback: servidor
    setUploadStatus('Finalizando gravação via servidor...')
    const formData = new FormData()
    formData.append('audio', audioFile)
    formData.append('json', jsonFile)
    formData.append('name', bookName)
    if (coverUrl.trim()) formData.append('coverUrl', coverUrl.trim())
    formData.append('replaceExisting', String(replaceExisting))

    const response = await fetch('/api/books', { method: 'POST', body: formData })
    let payload: any = null
    try {
      payload = await response.json()
    } catch {}

    if (response.status === 409 && payload?.book) {
      pendingFilesRef.current = { audio: audioFile, json: jsonFile, name: bookName }
      setConflict(payload.book)
      return
    }

    if (!response.ok) {
      setError(payload?.error || `Erro ${response.status}: Não foi possível adicionar o livro.`)
      return
    }

    resetAndClose()
  }

  async function submit(replaceExisting = false) {
    setFieldError('')
    setError('')

    // Se já temos arquivos pendentes de conflito resolvido
    if (replaceExisting && pendingFilesRef.current) {
      setBusy(true)
      try {
        await persistBookFiles(
          pendingFilesRef.current.audio,
          pendingFilesRef.current.json,
          pendingFilesRef.current.name,
          true
        )
      } finally {
        setBusy(false)
      }
      return
    }

    if (mode === 'ai') {
      if (!docFile) {
        setFieldError('Selecione um arquivo PDF ou DOCX.')
        docInputRef.current?.focus()
        return
      }

      const name = (title.trim() || cleanFileNameToTitle(docFile.name)).trim()
      if (!name) {
        setFieldError('Informe um título para o livro.')
        return
      }

      setBusy(true)
      setUploadProgress(0)

      try {
        const client = new AudiobookApiClient('https://api-edge-tts.onrender.com')

        const result = await client.processarLivro(
          docFile,
          {
            voz: selectedVoice,
            rate: selectedRate,
            termoCabecalho: headerFilter,
          },
          (status) => setUploadStatus(status)
        )

        // Converte blobs gerados em objetos File para salvamento permanente
        const audioFile = new File([result.audioBlob], `${name}.mp3`, { type: 'audio/mpeg' })
        const jsonFile = new File([result.jsonBlob], `${name}.json`, { type: 'application/json' })

        await persistBookFiles(audioFile, jsonFile, name, replaceExisting)
      } catch (err: any) {
        console.error('[UploadBookDialog] Erro na síntese via IA:', err)
        setError(err?.message || 'Falha ao processar o documento com a API de IA.')
      } finally {
        setBusy(false)
      }

      return
    }

    // Modo Manual
    if (!audio) {
      setFieldError('Selecione um arquivo de áudio.')
      audioInputRef.current?.focus()
      return
    }
    if (!wordMap) {
      setFieldError('Selecione o mapa de palavras em JSON.')
      jsonInputRef.current?.focus()
      return
    }

    const name = (title.trim() || cleanFileNameToTitle(wordMap.name)).trim()
    if (!name) {
      setFieldError('Informe um título válido para o livro.')
      return
    }

    setBusy(true)
    setUploadProgress(0)
    setUploadStatus('Preparando arquivos...')

    try {
      await persistBookFiles(audio, wordMap, name, replaceExisting)
    } catch (fetchErr) {
      console.error('[upload-book] Upload error:', fetchErr)
      setError(fetchErr instanceof Error ? fetchErr.message : 'Falha na conexão ao adicionar o livro.')
    } finally {
      setBusy(false)
      setUploadStatus('')
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px] transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 max-h-[min(90dvh,46rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-library-border bg-library-surface p-5 text-library-ink shadow-2xl outline-none sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-display text-2xl font-semibold tracking-tight">Adicionar livro</Dialog.Title>
              <Dialog.Description className="mt-2 max-w-md text-sm leading-6 text-library-muted">
                Converta documentos com IA (Edge-TTS) ou faça upload de arquivos já sincronizados.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Fechar diálogo"
              disabled={busy}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-library-muted transition-colors hover:bg-library-selected hover:text-library-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-library-accent disabled:opacity-50"
            >
              <X aria-hidden="true" className="size-5" />
            </Dialog.Close>
          </div>

          {/* Seletor de Modo (Abas) */}
          <div className="mt-5 grid grid-cols-2 rounded-xl bg-library-selected/70 p-1 text-sm font-medium">
            <button
              type="button"
              disabled={busy}
              onClick={() => { setMode('ai'); setFieldError(''); setError('') }}
              className={`flex items-center justify-center gap-2 rounded-lg py-2 transition-all ${
                mode === 'ai'
                  ? 'bg-library-surface text-library-ink shadow-sm'
                  : 'text-library-muted hover:text-library-ink'
              }`}
            >
              <Sparkles className="size-4 text-library-accent" />
              <span>Gerar com IA</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => { setMode('manual'); setFieldError(''); setError('') }}
              className={`flex items-center justify-center gap-2 rounded-lg py-2 transition-all ${
                mode === 'manual'
                  ? 'bg-library-surface text-library-ink shadow-sm'
                  : 'text-library-muted hover:text-library-ink'
              }`}
            >
              <FileAudio2 className="size-4 text-library-muted" />
              <span>Upload Manual</span>
            </button>
          </div>

          <form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); void submit() }}>
            {mode === 'ai' ? (
              <>
                {/* Seleção do PDF/DOCX */}
                <label className="group flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-library-border px-4 py-3 transition-colors hover:border-library-accent/70 hover:bg-library-selected/60 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-library-accent">
                  <FileText aria-hidden="true" className="size-5 shrink-0 text-library-accent" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">Documento (PDF ou DOCX)</span>
                    <span className="mt-0.5 block text-xs text-library-muted">Extração de texto e síntese de voz com mapa</span>
                  </span>
                  <span className="max-w-36 truncate text-sm text-library-muted sm:max-w-48">
                    {docFile?.name ?? 'Selecionar arquivo'}
                  </span>
                  <Input
                    ref={docInputRef}
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="sr-only"
                    aria-label="Selecionar documento PDF ou DOCX"
                    disabled={busy}
                    onChange={(event) => setDocumentFile(event.currentTarget.files?.[0])}
                  />
                </label>

                {/* Seleção de Voz Neural */}
                <div className="space-y-1.5">
                  <label htmlFor="ai-voice-select" className="flex items-center gap-2 text-sm font-medium text-library-ink">
                    <Mic className="size-4 text-library-accent" />
                    Voz do Narrador (Edge-TTS)
                  </label>
                  <select
                    id="ai-voice-select"
                    value={selectedVoice}
                    disabled={busy}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    className="h-11 w-full rounded-md border border-library-border bg-library-surface px-3 text-sm text-library-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-library-accent"
                  >
                    {VOZES_DISPONIVEIS.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ajuste de Velocidade e Filtro de Cabeçalho */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="ai-rate-select" className="flex items-center gap-2 text-sm font-medium text-library-ink">
                      <Gauge className="size-4 text-library-accent" />
                      Velocidade da Narração
                    </label>
                    <select
                      id="ai-rate-select"
                      value={selectedRate}
                      disabled={busy}
                      onChange={(e) => setSelectedRate(e.target.value)}
                      className="h-11 w-full rounded-md border border-library-border bg-library-surface px-3 text-sm text-library-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-library-accent"
                    >
                      <option value="-20%">Mais lenta (-20%)</option>
                      <option value="-10%">Levemente lenta (-10%)</option>
                      <option value="+0%">Normal (+0%)</option>
                      <option value="+10%">Levemente rápida (+10%)</option>
                      <option value="+20%">Rápida (+20%)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="ai-header-filter" className="flex items-center gap-2 text-sm font-medium text-library-ink">
                      <Type className="size-4 text-library-muted" />
                      Filtro de Cabeçalho <span className="text-xs text-library-muted">(opcional)</span>
                    </label>
                    <Input
                      id="ai-header-filter"
                      type="text"
                      value={headerFilter}
                      onChange={(e) => setHeaderFilter(e.target.value)}
                      placeholder="Ex: Título repetido nas páginas"
                      disabled={busy}
                      className="h-11 border-library-border bg-library-surface text-library-ink placeholder:text-library-muted focus-visible:outline-library-accent text-sm"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Upload Manual de Áudio */}
                <label className="group flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-library-border px-4 py-3 transition-colors hover:border-library-accent/70 hover:bg-library-selected/60 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-library-accent">
                  <FileAudio2 aria-hidden="true" className="size-5 shrink-0 text-library-accent" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">Áudio</span>
                    <span className="mt-0.5 block text-sm text-library-muted">MP3, WAV, M4A ou outro formato</span>
                  </span>
                  <span className="max-w-36 truncate text-sm text-library-muted sm:max-w-48">{audio?.name ?? 'Selecionar'}</span>
                  <Input
                    ref={audioInputRef}
                    type="file"
                    accept="audio/*"
                    className="sr-only"
                    aria-label="Selecionar arquivo de áudio"
                    disabled={busy}
                    onChange={(event) => setAudioFile(event.currentTarget.files?.[0])}
                  />
                </label>

                {/* Upload Manual de JSON */}
                <label className="group flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-library-border px-4 py-3 transition-colors hover:border-library-accent/70 hover:bg-library-selected/60 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-library-accent">
                  <FileJson2 aria-hidden="true" className="size-5 shrink-0 text-library-accent" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">Mapa de palavras</span>
                    <span className="mt-0.5 block text-sm text-library-muted">JSON com texto e tempos por palavra (p, i, f)</span>
                  </span>
                  <span className="max-w-36 truncate text-sm text-library-muted sm:max-w-48">{wordMap?.name ?? 'Selecionar'}</span>
                  <Input
                    ref={jsonInputRef}
                    type="file"
                    accept="application/json,.json"
                    className="sr-only"
                    aria-label="Selecionar mapa de palavras JSON"
                    disabled={busy}
                    onChange={(event) => setMapFile(event.currentTarget.files?.[0])}
                  />
                </label>
              </>
            )}

            {/* Título do Livro */}
            <div className="space-y-1.5">
              <label htmlFor="book-title-input" className="flex items-center gap-2 text-sm font-medium text-library-ink">
                <Type className="size-4 text-library-accent" />
                Título do livro
              </label>
              <Input
                id="book-title-input"
                type="text"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value)
                  setIsTitleCustomized(true)
                }}
                placeholder={
                  mode === 'ai' && docFile
                    ? cleanFileNameToTitle(docFile.name)
                    : wordMap
                    ? cleanFileNameToTitle(wordMap.name)
                    : 'Ex: Dom Casmurro'
                }
                disabled={busy}
                className="h-11 border-library-border bg-library-surface text-library-ink placeholder:text-library-muted focus-visible:outline-library-accent"
              />
            </div>

            {/* Capa do Livro */}
            <div className="space-y-1.5">
              <label htmlFor="book-cover-input" className="flex items-center gap-2 text-sm font-medium text-library-ink">
                <ImageIcon className="size-4 text-library-accent" />
                URL da imagem da capa <span className="text-xs font-normal text-library-muted">(opcional)</span>
              </label>
              <div className="flex items-center gap-3">
                <Input
                  id="book-cover-input"
                  type="url"
                  value={coverUrl}
                  onChange={(event) => setCoverUrl(event.target.value)}
                  placeholder="https://exemplo.com/capa.jpg"
                  disabled={busy}
                  className="h-11 flex-1 border-library-border bg-library-surface text-library-ink placeholder:text-library-muted focus-visible:outline-library-accent"
                />
                {coverUrl.trim() && (
                  <div className="relative size-11 shrink-0 overflow-hidden rounded-lg border border-library-border bg-library-selected">
                    <img
                      src={coverUrl.trim()}
                      alt="Prévia da capa"
                      className="size-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none'
                      }}
                      onLoad={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'block'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {fieldError && <p role="alert" className="text-sm font-medium text-destructive">{fieldError}</p>}
            {error && <div role="alert" aria-live="assertive" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</div>}

            {busy && (
              <div className="space-y-2 rounded-xl border border-library-border bg-library-selected/50 p-4" aria-live="polite">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium text-library-ink">
                    <Loader2 className="size-4 animate-spin text-library-accent" />
                    {uploadStatus || 'Processando audiolivro…'}
                  </span>
                  {uploadProgress > 0 && (
                    <span className="font-semibold text-library-accent">{uploadProgress}%</span>
                  )}
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-library-border">
                  <div
                    className="h-full bg-library-accent transition-all duration-200"
                    style={{ width: `${Math.max(uploadProgress, 8)}%` }}
                  />
                </div>
                {mode === 'ai' && (
                  <p className="text-xs text-library-muted">
                    Dica: Se o servidor no Render estiver hibernando, ele levará até 60s para acordar. O áudio e a sincronização serão gerados logo em seguida.
                  </p>
                )}
              </div>
            )}

            {conflict && (
              <div role="alert" aria-live="polite" className="rounded-xl border border-library-border bg-library-selected/70 p-4">
                <p className="text-sm font-medium">Já existe “{conflict.name}”.</p>
                <p className="mt-1 text-sm text-library-muted">Substituirá os arquivos e manterá a posição de leitura.</p>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="outline" className="h-11" disabled={busy} onClick={() => setConflict(null)}>Cancelar</Button>
                  <Button type="button" disabled={busy} className="h-11 bg-library-ink text-library-surface hover:bg-library-ink/90" onClick={() => void submit(true)}>
                    {busy && <Loader2 className="size-4 animate-spin" />}
                    {busy ? (uploadStatus || 'Enviando…') : 'Substituir livro'}
                  </Button>
                </div>
              </div>
            )}

            {!conflict && (
              <Button
                type="submit"
                disabled={
                  busy ||
                  (mode === 'ai' && !docFile) ||
                  (mode === 'manual' && (!audio || !wordMap)) ||
                  (!title.trim() && !docFile && !wordMap)
                }
                className="h-11 w-full bg-library-accent text-library-accent-foreground hover:bg-library-accent/90"
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : mode === 'ai' ? (
                  <Sparkles aria-hidden="true" className="size-4" />
                ) : (
                  <Upload aria-hidden="true" className="size-4" />
                )}
                {busy
                  ? uploadStatus || 'Processando…'
                  : mode === 'ai'
                  ? 'Gerar Audiolivro com IA'
                  : 'Adicionar livro'}
              </Button>
            )}
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
