'use client'

import { useRef, useState } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { FileAudio2, FileJson2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type UploadBookDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdded: () => void
}

type ExistingBook = { id: string; name: string }

function errorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string') {
    return payload.error
  }
  return fallback
}

export function UploadBookDialog({ open, onOpenChange, onAdded }: UploadBookDialogProps) {
  const audioInputRef = useRef<HTMLInputElement>(null)
  const jsonInputRef = useRef<HTMLInputElement>(null)
  const [audio, setAudio] = useState<File | null>(null)
  const [wordMap, setWordMap] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [conflict, setConflict] = useState<ExistingBook | null>(null)

  function setAudioFile(file?: File) {
    setAudio(file ?? null)
    setFieldError('')
    setError('')
    setConflict(null)
  }

  function setMapFile(file?: File) {
    setWordMap(file ?? null)
    setFieldError('')
    setError('')
    setConflict(null)
  }

  async function submit(replaceExisting = false) {
    setFieldError('')
    setError('')

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

    const name = wordMap.name.replace(/\.json$/i, '').trim()
    if (!name) {
      setFieldError('O arquivo JSON precisa ter um nome válido.')
      return
    }

    const formData = new FormData()
    formData.append('audio', audio)
    formData.append('json', wordMap)
    formData.append('name', name)
    formData.append('replaceExisting', String(replaceExisting))

    setBusy(true)
    try {
      const response = await fetch('/api/books', { method: 'POST', body: formData })
      const payload: unknown = await response.json().catch(() => null)

      if (response.status === 409 && payload && typeof payload === 'object' && 'book' in payload) {
        const book = (payload as { book: ExistingBook }).book
        setConflict(book)
        return
      }
      if (!response.ok) {
        setError(errorMessage(payload, 'Não foi possível adicionar o livro. Tente novamente.'))
        return
      }

      setAudio(null)
      setWordMap(null)
      setConflict(null)
      setError('')
      setFieldError('')
      if (audioInputRef.current) audioInputRef.current.value = ''
      if (jsonInputRef.current) jsonInputRef.current.value = ''
      onOpenChange(false)
      onAdded()
    } catch {
      setError('Não foi possível adicionar o livro agora. Tente novamente; seus arquivos continuam selecionados.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px] transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 max-h-[min(90dvh,44rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-library-border bg-library-surface p-5 text-library-ink shadow-2xl outline-none sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-display text-2xl font-semibold tracking-tight">Adicionar livro</Dialog.Title>
              <Dialog.Description className="mt-2 max-w-md text-sm leading-6 text-library-muted">
                Selecione o áudio e o mapa JSON com o texto e o tempo de cada palavra.
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

          <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); void submit() }}>
            <label className="group flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-library-border px-4 py-3 transition-colors hover:border-library-accent/70 hover:bg-library-selected/60 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-library-accent">
              <FileAudio2 aria-hidden="true" className="size-5 shrink-0 text-library-accent" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">Áudio</span>
                <span className="mt-0.5 block text-sm text-library-muted">MP3, WAV, M4A ou outro formato de áudio</span>
              </span>
              <span className="max-w-36 truncate text-sm text-library-muted sm:max-w-48">{audio?.name ?? 'Selecionar'}</span>
              <Input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                className="sr-only"
                aria-label="Selecionar arquivo de áudio"
                onChange={(event) => setAudioFile(event.currentTarget.files?.[0])}
              />
            </label>

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
                onChange={(event) => setMapFile(event.currentTarget.files?.[0])}
              />
            </label>

            {fieldError && <p role="alert" className="text-sm font-medium text-destructive">{fieldError}</p>}
            {error && <div role="alert" aria-live="assertive" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</div>}

            {conflict && (
              <div role="alert" aria-live="polite" className="rounded-xl border border-library-border bg-library-selected/70 p-4">
                <p className="text-sm font-medium">Já existe “{conflict.name}”.</p>
                <p className="mt-1 text-sm text-library-muted">Substituirá os arquivos e manterá a posição de leitura.</p>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="outline" className="h-11" onClick={() => setConflict(null)}>Cancelar</Button>
                  <Button type="button" disabled={busy} className="h-11 bg-library-ink text-library-surface hover:bg-library-ink/90" onClick={() => void submit(true)}>
                    {busy ? 'Enviando…' : 'Substituir livro'}
                  </Button>
                </div>
              </div>
            )}

            {!conflict && (
              <Button type="submit" disabled={busy || !audio || !wordMap} className="h-11 w-full bg-library-accent text-library-accent-foreground hover:bg-library-accent/90">
                <Upload aria-hidden="true" className="size-4" />
                {busy ? 'Enviando arquivos…' : 'Adicionar livro'}
              </Button>
            )}
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
