/**
 * Cliente de Integração com a API de Audiolivros v2.0
 * Suporta túnel de logs e progresso em tempo real via Server-Sent Events (SSE).
 */

export type WordTiming = {
  p: string
  i: number
  f: number
}

export type LogEvent = {
  tipo?: 'log'
  nivel?: string
  mensagem: string
  tempo?: string
}

export type ProgressEvent = {
  tipo?: 'progresso'
  porcentagem: number
  parte_atual?: number
  total_partes?: number
  mensagem?: string
}

export type ProcessBookOptions = {
  voz?: string
  rate?: string
  pitch?: string
  termoCabecalho?: string
  onLog?: (log: LogEvent) => void
  onProgress?: (progress: ProgressEvent) => void
  onStatusUpdate?: (status: string) => void
  signal?: AbortSignal
}

export type ProcessBookResult = {
  title: string
  jobId: string
  audioUrl: string
  mapaUrl: string
  words: WordTiming[]
  durationSeconds: number
  totalWords: number
  audioBlob: Blob
  jsonBlob: Blob
}

export class AudiobookApiClient {
  private baseUrl: string

  constructor(baseUrl = process.env.NEXT_PUBLIC_AUDIOBOOK_API_URL || 'https://api-edge-tts.onrender.com') {
    this.baseUrl = baseUrl.replace(/\/+$/, '')
  }

  /**
   * Resolve uma URL retornada pela API (podendo ser relativa ou absoluta, HTTP ou HTTPS).
   */
  private resolveUrl(url?: string): string {
    if (!url) return ''
    let resolved = url.trim()
    if (!resolved.startsWith('http://') && !resolved.startsWith('https://')) {
      resolved = new URL(resolved.startsWith('/') ? resolved : `/${resolved}`, this.baseUrl).toString()
    }
    // No navegador sob HTTPS, converte http para https para evitar bloqueio de conteúdo misto
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && resolved.startsWith('http://')) {
      resolved = resolved.replace(/^http:\/\//i, 'https://')
    }
    return resolved
  }

  private async fetchAudioBlob(url: string, signal?: AbortSignal): Promise<Blob> {
    const resolved = this.resolveUrl(url)
    const res = await fetch(resolved, { signal })
    if (!res.ok) {
      throw new Error(`Não foi possível baixar o áudio (${res.status} ${res.statusText}).`)
    }
    return await res.blob()
  }

  private async fetchWordMap(
    url?: string,
    inlineWords?: any,
    signal?: AbortSignal
  ): Promise<{ words: WordTiming[]; jsonBlob: Blob }> {
    let words: WordTiming[] = []

    if (Array.isArray(inlineWords) && inlineWords.length > 0 && typeof inlineWords[0]?.p === 'string') {
      words = inlineWords
    } else if (url) {
      const resolved = this.resolveUrl(url)
      const res = await fetch(resolved, { signal })
      if (res.ok) {
        const data = await res.json()
        words = Array.isArray(data) ? data : data.words || data.mapa || []
      }
    }

    const jsonBlob = new Blob([JSON.stringify(words, null, 2)], {
      type: 'application/json',
    })

    return { words, jsonBlob }
  }

  /**
   * Envia o documento para processamento (POST /processar-livro/) e conecta
   * imediatamente ao túnel SSE (GET /jobs/{job_id}/stream) para emitir logs
   * e porcentagem de progresso em tempo real.
   */
  async processarLivro(
    file: File,
    options: ProcessBookOptions = {},
    legacyStatusCallback?: (status: string) => void
  ): Promise<ProcessBookResult> {
    const {
      voz = 'pt-BR-AntonioNeural',
      rate = '+0%',
      pitch = '-5Hz',
      termoCabecalho,
      onLog,
      onProgress,
      onStatusUpdate = legacyStatusCallback,
      signal,
    } = options

    onStatusUpdate?.('Iniciando processamento na nuvem...')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('voz', voz)
    formData.append('rate', rate)
    formData.append('pitch', pitch)
    formData.append('retornar_mapa_inline', 'true')
    if (termoCabecalho?.trim()) {
      formData.append('termo_cabecalho', termoCabecalho.trim())
    }

    // Dispara log inicial no terminal
    onLog?.({
      tipo: 'log',
      nivel: 'INFO',
      mensagem: `Enviando arquivo "${file.name}" (${(file.size / (1024 * 1024)).toFixed(2)} MB) para a API...`,
      tempo: new Date().toLocaleTimeString('pt-BR'),
    })

    // 1. Inicia o Job (retorno imediato na API v2.0)
    let response: Response
    try {
      response = await fetch(`${this.baseUrl}/processar-livro/`, {
        method: 'POST',
        body: formData,
        signal,
      })
    } catch (fetchErr: any) {
      if (fetchErr?.name === 'AbortError') {
        throw fetchErr
      }
      const msg = fetchErr?.message || String(fetchErr)
      throw new Error(`Falha de conexão com a API: ${msg}. Verifique se o servidor está ativo em ${this.baseUrl}`)
    }

    if (!response.ok) {
      let errorMsg = `Erro na API: ${response.status} ${response.statusText}`
      try {
        const errJson = await response.json()
        if (errJson?.detail) errorMsg = errJson.detail
        else if (errJson?.mensagem) errorMsg = errJson.mensagem
        else if (errJson?.error) errorMsg = errJson.error
      } catch {}
      throw new Error(errorMsg)
    }

    const jobData = await response.json()
    const jobId = jobData.job_id || ''
    const title = jobData.nome_livro || file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ')

    // Se a API não retornou stream_url (ex: resposta v1 síncrona legada), realiza download direto
    if (!jobData.stream_url) {
      onStatusUpdate?.('Processamento concluído. Baixando arquivos...')
      const rawAudioUrl = this.resolveUrl(jobData.download_audio_url)
      const rawMapaUrl = this.resolveUrl(jobData.download_mapa_url)
      const [audioBlob, jsonResult] = await Promise.all([
        this.fetchAudioBlob(rawAudioUrl, signal),
        this.fetchWordMap(rawMapaUrl, jobData.mapa || jobData.mapa_tempos, signal),
      ])

      return {
        title,
        jobId,
        audioUrl: rawAudioUrl,
        mapaUrl: rawMapaUrl,
        words: jsonResult.words,
        durationSeconds: jobData.duracao_segundos ?? 0,
        totalWords: jsonResult.words.length,
        audioBlob,
        jsonBlob: jsonResult.jsonBlob,
      }
    }

    // 2. Abre o Túnel SSE para streaming de logs e progresso em tempo real
    const streamUrl = this.resolveUrl(jobData.stream_url)

    return new Promise<ProcessBookResult>((resolve, reject) => {
      let canalLogs: EventSource | null = null
      let isSettled = false

      const closeEventSource = () => {
        if (canalLogs) {
          try {
            canalLogs.close()
          } catch {}
          canalLogs = null
        }
      }

      if (signal) {
        signal.addEventListener('abort', () => {
          if (!isSettled) {
            isSettled = true
            closeEventSource()
            reject(new DOMException('Operação cancelada', 'AbortError'))
          }
        })
      }

      onLog?.({
        tipo: 'log',
        nivel: 'INFO',
        mensagem: `Túnel SSE conectado para o Job [${jobId || 'ativo'}]. Aguardando etapas...`,
        tempo: new Date().toLocaleTimeString('pt-BR'),
      })

      canalLogs = new EventSource(streamUrl)

      const handleRawMessage = async (rawString: string) => {
        if (!rawString || !rawString.trim()) return

        let evento: any
        try {
          evento = JSON.parse(rawString)
        } catch {
          // Linha de texto simples
          onLog?.({
            tipo: 'log',
            nivel: 'INFO',
            mensagem: rawString,
            tempo: new Date().toLocaleTimeString('pt-BR'),
          })
          return
        }

        const tipo = evento.tipo

        if (tipo === 'log') {
          onLog?.({
            tipo: 'log',
            nivel: evento.nivel || 'INFO',
            mensagem: evento.mensagem || '',
            tempo: evento.tempo || new Date().toLocaleTimeString('pt-BR'),
          })
        }

        if (tipo === 'progresso') {
          const porcentagem =
            typeof evento.porcentagem === 'number'
              ? evento.porcentagem
              : Number(evento.porcentagem) || 0

          onProgress?.({
            tipo: 'progresso',
            porcentagem,
            parte_atual: evento.parte_atual,
            total_partes: evento.total_partes,
            mensagem: evento.mensagem,
          })

          const statusMsg = evento.mensagem || `Progresso: ${porcentagem}%`
          onStatusUpdate?.(statusMsg)
        }

        if (tipo === 'concluido') {
          if (isSettled) return
          isSettled = true
          closeEventSource()

          onStatusUpdate?.('Áudio e sincronização gerados com sucesso!')
          onProgress?.({
            tipo: 'progresso',
            porcentagem: 100,
            mensagem: 'Áudio e sincronização gerados com sucesso!',
          })

          onLog?.({
            tipo: 'log',
            nivel: 'SUCCESS',
            mensagem: 'Processamento concluído com sucesso! Baixando arquivos gerados...',
            tempo: new Date().toLocaleTimeString('pt-BR'),
          })

          try {
            const finalAudioUrl = this.resolveUrl(
              evento.download_audio_url || jobData.download_audio_url
            )
            const finalMapaUrl = this.resolveUrl(
              evento.download_mapa_url || jobData.download_mapa_url
            )

            const [audioBlob, jsonResult] = await Promise.all([
              this.fetchAudioBlob(finalAudioUrl, signal),
              this.fetchWordMap(finalMapaUrl, evento.mapa || jobData.mapa, signal),
            ])

            resolve({
              title: evento.nome_livro || title,
              jobId: evento.job_id || jobId,
              audioUrl: finalAudioUrl,
              mapaUrl: finalMapaUrl,
              words: jsonResult.words,
              durationSeconds:
                (typeof evento.duracao_minutos === 'number'
                  ? evento.duracao_minutos * 60
                  : undefined) ??
                jobData.duracao_segundos ??
                0,
              totalWords: jsonResult.words.length,
              audioBlob,
              jsonBlob: jsonResult.jsonBlob,
            })
          } catch (downloadErr: any) {
            reject(new Error(`Falha ao baixar arquivos gerados: ${downloadErr.message || downloadErr}`))
          }
        }

        if (tipo === 'erro') {
          if (isSettled) return
          isSettled = true
          closeEventSource()

          const erroMsg = evento.mensagem || 'Ocorreu um erro no processamento do audiolivro.'
          onStatusUpdate?.(`Erro: ${erroMsg}`)
          onLog?.({
            tipo: 'log',
            nivel: 'ERROR',
            mensagem: `Erro: ${erroMsg}`,
            tempo: new Date().toLocaleTimeString('pt-BR'),
          })
          reject(new Error(erroMsg))
        }
      }

      canalLogs.onmessage = (event) => {
        void handleRawMessage(event.data)
      }

      // Suporte para eventos SSE nomeados caso a API use "event: log" etc
      canalLogs.addEventListener('log', (event: any) => void handleRawMessage(event.data))
      canalLogs.addEventListener('progresso', (event: any) => void handleRawMessage(event.data))
      canalLogs.addEventListener('concluido', (event: any) => void handleRawMessage(event.data))
      canalLogs.addEventListener('erro', (event: any) => void handleRawMessage(event.data))

      canalLogs.onerror = (err) => {
        if (isSettled) return
        isSettled = true
        closeEventSource()
        console.error('Erro na conexão SSE:', err)
        const errMsg = 'Conexão com o servidor de logs perdida.'
        onStatusUpdate?.(errMsg)
        onLog?.({
          tipo: 'log',
          nivel: 'ERROR',
          mensagem: errMsg,
          tempo: new Date().toLocaleTimeString('pt-BR'),
        })
        reject(new Error(errMsg))
      }
    })
  }
}
