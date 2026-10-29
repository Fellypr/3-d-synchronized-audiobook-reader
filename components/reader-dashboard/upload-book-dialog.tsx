'use client'

import { useEffect, useRef, useState } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import {
  FileAudio2,
  FileJson2,
  Upload,
  X,
  Type,
  Image as ImageIcon,
  Sparkles,
  FileText,
  Mic,
  Gauge,
  Terminal,
  SlidersHorizontal,
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

type TerminalLog = {
  id: string
  tempo: string
  nivel: string
  mensagem: string
}

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
  const manualPdfInputRef = useRef<HTMLInputElement>(null)
  const [audio, setAudio] = useState<File | null>(null)
  const [wordMap, setWordMap] = useState<File | null>(null)
  const [manualPdf, setManualPdf] = useState<File | null>(null)

  // Inputs de IA (PDF/DOCX)
  const docInputRef = useRef<HTMLInputElement>(null)
  const [docFile, setDocFile] = useState<File | null>(null)
  const [selectedVoice, setSelectedVoice] = useState('pt-BR-AntonioNeural')
  const [selectedRate, setSelectedRate] = useState('+0%')
  const [headerFilter, setHeaderFilter] = useState('')
  const [apiUrl, setApiUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('audiobook_api_url')
      if (saved) return saved
    }
    return process.env.NEXT_PUBLIC_AUDIOBOOK_API_URL || 'https://api-edge-tts.onrender.com'
  })
  const [showApiConfig, setShowApiConfig] = useState(false)

  // Campos compartilhados
  const [title, setTitle] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [isTitleCustomized, setIsTitleCustomized] = useState(false)
  const [busy, setBusy] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [logs, setLogs] = useState<TerminalLog[]>([])
  const [error, setError] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [conflict, setConflict] = useState<ExistingBook | null>(null)

  const pendingFilesRef = useRef<{ audio: File; json: File; pdf?: File; name: string } | null>(null)
  const terminalLogsRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Auto-scroll do painel de logs estilo terminal sempre que novas linhas chegam
  useEffect(() => {
    if (terminalLogsRef.current) {
      terminalLogsRef.current.scrollTop = terminalLogsRef.current.scrollHeight
    }
  }, [logs])

  function addLog(mensagem: string, nivel: string = 'INFO') {
    setLogs((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        tempo: new Date().toLocaleTimeString('pt-BR'),
        nivel,
        mensagem,
      },
    ])
  }

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
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setAudio(null)
    setWordMap(null)
    setManualPdf(null)
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
    setLogs([])
    pendingFilesRef.current = null
    if (audioInputRef.current) audioInputRef.current.value = ''
    if (jsonInputRef.current) jsonInputRef.current.value = ''
    if (manualPdfInputRef.current) manualPdfInputRef.current.value = ''
    if (docInputRef.current) docInputRef.current.value = ''
    onOpenChange(false)
    onAdded()
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && busy) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      setBusy(false)
    }
    onOpenChange(nextOpen)
  }

  /**
   * Salva os arquivos de áudio, mapa e PDF original na infraestrutura permanente (Vercel Blob / Local Storage)
   */
  async function persistBookFiles(
    audioFile: File,
    jsonFile: File,
    bookName: string,
    replaceExisting = false,
    pdfFile?: File | null,
  ) {
    const sanitizedName = bookName.replace(/[^a-z0-9_-]+/gi, '_')
    const audioExt = audioFile.name.split('.').pop()?.toLowerCase() || 'mp3'
    const userFolder = activeUserId ? `audiobooks/${activeUserId}` : 'audiobooks'
    const audioPathname = `${userFolder}/${sanitizedName}.${audioExt}`
    const jsonPathname = `${userFolder}/${sanitizedName}.json`

    let usedDirectUpload = false
    let directAudioPathname = ''
    let directJsonPathname = ''
    let directPdfPathname = ''
    let directError: Error | null = null

    try {
      if (pdfFile) {
        const pdfExt = pdfFile.name.split('.').pop()?.toLowerCase() || 'pdf'
        const pdfPathname = `${userFolder}/${sanitizedName}.${pdfExt}`
        setUploadStatus('Salvando documento original na nuvem...')
        addLog(`Salvando documento original (${pdfFile.name})...`, 'INFO')
        const pdfBlob = await uploadToBlob(pdfPathname, pdfFile)
        directPdfPathname = pdfBlob.pathname
      }

      setUploadStatus('Salvando mapa de sincronização...')
      addLog('Salvando mapa de sincronização na nuvem...', 'INFO')
      const jsonBlob = await uploadToBlob(jsonPathname, jsonFile)
      directJsonPathname = jsonBlob.pathname

      const audioMb = (audioFile.size / (1024 * 1024)).toFixed(1)
      setUploadStatus(`Salvando áudio: 0% (${audioMb} MB)...`)
      addLog(`Salvando arquivo de áudio sintetizado (${audioMb} MB)...`, 'INFO')

      const audioBlob = await uploadToBlob(audioPathname, audioFile, (percentage) => {
        setUploadProgress(percentage)
        setUploadStatus(`Salvando áudio: ${percentage}% de ${audioMb} MB`)
      })
      directAudioPathname = audioBlob.pathname
      usedDirectUpload = true
    } catch (directErr) {
      directError = directErr instanceof Error ? directErr : new Error(String(directErr))
      console.warn('[upload] Direct client upload failed, tentando fallback:', directErr)
      addLog(`Aviso no upload direto, utilizando canal do servidor: ${directError.message}`, 'WARN')
    }

    if (usedDirectUpload) {
      setUploadProgress(100)
      setUploadStatus('Registrando livro na biblioteca...')
      addLog('Registrando livro na biblioteca do leitor 3D...', 'INFO')

      const response = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: bookName,
          coverUrl: coverUrl.trim() || undefined,
          audioUrl: directAudioPathname,
          jsonUrl: directJsonPathname,
          pdfUrl: directPdfPathname || undefined,
          replaceExisting,
        }),
      })

      let payload: any = null
      try {
        payload = await response.json()
      } catch {}

      if (response.status === 409 && payload?.book) {
        pendingFilesRef.current = { audio: audioFile, json: jsonFile, pdf: pdfFile ?? undefined, name: bookName }
        setConflict(payload.book)
        return
      }

      if (!response.ok) {
        const msg = payload?.error || 'Erro ao registrar livro na biblioteca.'
        setError(msg)
        addLog(`Erro: ${msg}`, 'ERROR')
        return
      }

      addLog('Livro salvo com sucesso! Abrindo leitor...', 'SUCCESS')
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
      const msg = `Não foi possível enviar o áudio (${(audioFile.size / (1024 * 1024)).toFixed(1)} MB): ${detail}`
      setError(msg)
      addLog(msg, 'ERROR')
      return
    }

    // Fallback: servidor
    setUploadStatus('Finalizando gravação via servidor...')
    addLog('Enviando dados consolidados via servidor...', 'INFO')

    const formData = new FormData()
    formData.append('audio', audioFile)
    formData.append('json', jsonFile)
    formData.append('name', bookName)
    if (pdfFile) formData.append('pdf', pdfFile)
    if (coverUrl.trim()) formData.append('coverUrl', coverUrl.trim())
    formData.append('replaceExisting', String(replaceExisting))

    const response = await fetch('/api/books', { method: 'POST', body: formData })
    let payload: any = null
    try {
      payload = await response.json()
    } catch {}

    if (response.status === 409 && payload?.book) {
      pendingFilesRef.current = { audio: audioFile, json: jsonFile, pdf: pdfFile ?? undefined, name: bookName }
      setConflict(payload.book)
      return
    }

    if (!response.ok) {
      const msg = payload?.error || `Erro ${response.status}: Não foi possível adicionar o livro.`
      setError(msg)
      addLog(msg, 'ERROR')
      return
    }

    addLog('Livro salvo com sucesso!', 'SUCCESS')
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
          true,
          pendingFilesRef.current.pdf
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
      setLogs([])
      setUploadStatus('Iniciando processamento na nuvem...')

      const abortController = new AbortController()
      abortControllerRef.current = abortController

      try {
        const client = new AudiobookApiClient(apiUrl.trim() || 'https://api-edge-tts.onrender.com')

        const result = await client.processarLivro(
          docFile,
          {
            voz: selectedVoice,
            rate: selectedRate,
            termoCabecalho: headerFilter,
            signal: abortController.signal,
            onLog: (log) => {
              addLog(log.mensagem, log.nivel || 'INFO')
            },
            onProgress: (prog) => {
              setUploadProgress(prog.porcentagem)
              if (prog.mensagem) {
                setUploadStatus(prog.mensagem)
              }
            },
            onStatusUpdate: (status) => {
              setUploadStatus(status)
            },
          }
        )

        setUploadStatus('Salvando livro na sua biblioteca...')
        addLog('Áudio e mapa recebidos com sucesso. Gravando na biblioteca...', 'SUCCESS')

        // Converte blobs gerados em objetos File para salvamento permanente
        const audioFile = new File([result.audioBlob], `${name}.mp3`, { type: 'audio/mpeg' })
        const jsonFile = new File([result.jsonBlob], `${name}.json`, { type: 'application/json' })

        await persistBookFiles(audioFile, jsonFile, name, replaceExisting, docFile)
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          addLog('Processamento cancelado pelo usuário.', 'WARN')
          setUploadStatus('Processamento cancelado.')
          return
        }
        console.error('[UploadBookDialog] Erro na síntese via IA:', err)
        const errMsg = err?.message || 'Falha ao processar o documento com a API de IA.'
        setError(errMsg)
        setUploadStatus(`Erro: ${errMsg}`)
        addLog(`Erro: ${errMsg}`, 'ERROR')
      } finally {
        setBusy(false)
        abortControllerRef.current = null
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
    setLogs([])
    setUploadStatus('Preparando arquivos...')
    addLog(`Iniciando upload manual do livro "${name}"...`, 'INFO')

    try {
      await persistBookFiles(audio, wordMap, name, replaceExisting, manualPdf)
    } catch (fetchErr) {
      console.error('[upload-book] Upload error:', fetchErr)
      const msg = fetchErr instanceof Error ? fetchErr.message : 'Falha na conexão ao adicionar o livro.'
      setError(msg)
      addLog(msg, 'ERROR')
    } finally {
      setBusy(false)
      setUploadStatus('')
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 max-h-[min(90dvh,50rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-library-border bg-library-surface p-6 text-library-ink shadow-2xl outline-none sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-brand text-2xl font-medium tracking-tight text-library-ink">
                Adicionar livro
              </Dialog.Title>
              <Dialog.Description className="mt-1.5 max-w-md text-xs sm:text-sm leading-relaxed text-library-muted">
                Sintetize voz sincronizada via IA (Edge-TTS) ou envie arquivos já preparados.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Fechar diálogo"
              disabled={busy}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-library-border/50 text-library-muted transition-colors hover:bg-library-selected hover:text-library-ink focus-visible:outline-2 focus-visible:outline-library-accent disabled:opacity-50"
            >
              <X aria-hidden="true" className="size-4" />
            </Dialog.Close>
          </div>

          {/* Seletor de Modo (Abas) */}
          <div className="mt-5 grid grid-cols-2 rounded-xl border border-library-border/60 bg-library-page/60 p-1 text-xs sm:text-sm font-medium">
            <button
              type="button"
              disabled={busy}
              onClick={() => { setMode('ai'); setFieldError(''); setError('') }}
              className={`flex items-center justify-center gap-2 rounded-lg py-2 transition-all duration-150 ${
                mode === 'ai'
                  ? 'border border-library-accent/30 bg-library-selected text-library-ink shadow-xs font-semibold'
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
              className={`flex items-center justify-center gap-2 rounded-lg py-2 transition-all duration-150 ${
                mode === 'manual'
                  ? 'border border-library-accent/30 bg-library-selected text-library-ink shadow-xs font-semibold'
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

                {/* Configuração Avançada do Endpoint da API (Hugging Face / Render) */}
                <div className="pt-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setShowApiConfig(!showApiConfig)}
                    className="flex items-center gap-1.5 text-xs text-library-muted hover:text-library-ink transition-colors"
                  >
                    <SlidersHorizontal className="size-3 text-library-accent" />
                    <span>{showApiConfig ? 'Ocultar configurações da API' : 'Configurar URL da API (Hugging Face / Render)'}</span>
                  </button>

                  {showApiConfig && (
                    <div className="mt-2 space-y-1.5 rounded-xl border border-library-border/50 bg-library-page/40 p-3">
                      <label htmlFor="ai-api-url-input" className="block text-xs font-medium text-library-ink">
                        URL Base da API (v2.0 com SSE)
                      </label>
                      <Input
                        id="ai-api-url-input"
                        type="url"
                        value={apiUrl}
                        disabled={busy}
                        onChange={(e) => {
                          const val = e.target.value
                          setApiUrl(val)
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('audiobook_api_url', val)
                          }
                        }}
                        placeholder="https://SEU-SPACE.hf.space ou https://api-edge-tts.onrender.com"
                        className="h-9 border-library-border bg-library-surface text-library-ink text-xs font-mono"
                      />
                      <p className="text-[11px] leading-relaxed text-library-muted">
                        Insira a URL do seu Space no Hugging Face (<code className="rounded bg-black/20 px-1 py-0.5">https://SEU-SPACE.hf.space</code>) ou servidor próprio.
                      </p>
                    </div>
                  )}
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

                {/* Upload Manual de Documento PDF (Opcional) */}
                <label className="group flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-library-border px-4 py-3 transition-colors hover:border-library-accent/70 hover:bg-library-selected/60 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-library-accent">
                  <FileText aria-hidden="true" className="size-5 shrink-0 text-library-accent" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">Documento PDF <span className="text-xs text-library-muted">(opcional)</span></span>
                    <span className="mt-0.5 block text-sm text-library-muted">Arquivo original para visualização da folha real</span>
                  </span>
                  <span className="max-w-36 truncate text-sm text-library-muted sm:max-w-48">{manualPdf?.name ?? 'Selecionar'}</span>
                  <Input
                    ref={manualPdfInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="sr-only"
                    aria-label="Selecionar documento PDF original"
                    disabled={busy}
                    onChange={(event) => setManualPdf(event.currentTarget.files?.[0] ?? null)}
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

            {/* ── Painel de Logs em Tempo Real e Barra de Progresso Viva ── */}
            {busy && (
              <div
                className="space-y-3 rounded-xl border border-[#30363d] bg-[#0d1117] p-4 text-white shadow-2xl"
                aria-live="polite"
              >
                {/* Cabeçalho do Console Terminal */}
                <div className="flex items-center justify-between border-b border-[#30363d]/80 pb-2.5 text-xs">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="flex size-2 rounded-full bg-emerald-400 animate-pulse" />
                    <Terminal className="size-3.5 text-emerald-400" />
                    <span className="font-semibold text-emerald-400">terminal</span>
                    <span className="text-[#8b949e]">/</span>
                    <span className="text-neutral-300">logs em tempo real</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full border border-[#f85149]/60 bg-[#f85149]/40" />
                    <span className="size-2.5 rounded-full border border-[#d29922]/60 bg-[#d29922]/40" />
                    <span className="size-2.5 rounded-full border border-[#3fb950]/60 bg-[#3fb950]/40" />
                  </div>
                </div>

                {/* Console de Logs com Auto-scroll */}
                <div
                  id="terminal-logs"
                  ref={terminalLogsRef}
                  style={{
                    background: '#0d1117',
                    color: '#58a6ff',
                    fontFamily: 'monospace',
                    height: '160px',
                    overflowY: 'auto',
                    padding: '10px',
                    borderRadius: '6px',
                  }}
                  className="space-y-1 text-xs select-text scrollbar-thin scrollbar-thumb-neutral-700"
                >
                  {logs.length === 0 ? (
                    <div className="italic text-[#8b949e]">Conectando ao túnel de logs da API...</div>
                  ) : (
                    logs.map((log) => (
                      <div
                        key={log.id}
                        className={`log-entry log-${(log.nivel || 'info').toLowerCase()}`}
                      >
                        [{log.tempo}] {log.mensagem}
                      </div>
                    ))
                  )}
                </div>

                {/* Barra de Progresso e Status em Tempo Real */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span id="status-texto" className="truncate pr-2 font-medium text-neutral-200">
                      {uploadStatus || 'Iniciando processamento na nuvem...'}
                    </span>
                    <span className="shrink-0 font-bold text-emerald-400">
                      {uploadProgress}%
                    </span>
                  </div>

                  <div className="h-3.5 w-full overflow-hidden rounded-full bg-[#161b22] border border-[#30363d] p-0.5">
                    <div
                      id="barra-progresso"
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 text-[9px] font-bold text-white flex items-center justify-center transition-all duration-300 shadow-sm"
                      style={{ width: `${Math.max(uploadProgress, 4)}%` }}
                    >
                      {uploadProgress > 10 ? `${uploadProgress}%` : ''}
                    </div>
                  </div>
                </div>

                {/* Ação de Cancelar */}
                <div className="flex items-center justify-between pt-1 text-xs text-[#8b949e]">
                  <span>Canal SSE ativo</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (abortControllerRef.current) {
                        abortControllerRef.current.abort()
                        abortControllerRef.current = null
                      }
                      setBusy(false)
                    }}
                    className="text-neutral-400 hover:text-red-400 transition-colors underline underline-offset-4"
                  >
                    Cancelar processamento
                  </button>
                </div>
              </div>
            )}

            {conflict && (
              <div role="alert" aria-live="polite" className="rounded-xl border border-library-border bg-library-selected/70 p-4">
                <p className="text-sm font-medium">Já existe “{conflict.name}”.</p>
                <p className="mt-1 text-sm text-library-muted">Substituirá os arquivos e manterá a posição de leitura.</p>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="outline" className="h-10 rounded-xl" disabled={busy} onClick={() => setConflict(null)}>
                    Cancelar
                  </Button>
                  <Button type="button" disabled={busy} className="h-10 rounded-xl bg-library-ink text-library-surface hover:bg-library-ink/90 font-medium" onClick={() => void submit(true)}>
                    Substituir livro
                  </Button>
                </div>
              </div>
            )}

            {!conflict && !busy && (
              <Button
                type="submit"
                disabled={
                  busy ||
                  (mode === 'ai' && !docFile) ||
                  (mode === 'manual' && (!audio || !wordMap)) ||
                  (!title.trim() && !docFile && !wordMap)
                }
                className="h-11 w-full rounded-xl bg-library-accent font-semibold text-library-accent-foreground shadow-sm transition-all hover:bg-library-accent/90 active:scale-[0.98] disabled:opacity-50"
              >
                {mode === 'ai' ? (
                  <Sparkles aria-hidden="true" className="size-4" />
                ) : (
                  <Upload aria-hidden="true" className="size-4" />
                )}
                <span>
                  {mode === 'ai'
                    ? 'Gerar Audiolivro com IA'
                    : 'Adicionar à biblioteca'}
                </span>
              </Button>
            )}
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
