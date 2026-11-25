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
  paginaInicial?: number
  paginaFinal?: number
  onLog?: (log: LogEvent) => void
  onProgress?: (progress: ProgressEvent) => void
  onStatusUpdate?: (status: string) => void
  onPartialReady?: (data: ProcessBookResult) => void
  onBlockReady?: (blockData: ProcessBookResult & { completedParts: number; totalParts: number; blockIndex: number; totalBlocks: number }) => void
  onCooldown?: (data: { seconds: number; nextBlock: number; totalBlocks: number; completedParts: number; totalParts: number; remainingParts: number }) => void
  onJobCreated?: (data: { jobId: string; nomeLivro?: string; totalPartes?: number }) => Promise<void> | void
  uploadBlobFn?: (file: File, onProgress?: (percentage: number) => void) => Promise<{ url: string }>
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

  constructor(baseUrl?: string) {
    const defaultUrl = process.env.NEXT_PUBLIC_AUDIOBOOK_API_URL || 'https://auditeca-api.duckdns.org'
    let rawUrl = (baseUrl || defaultUrl).trim()
    // Atualiza automaticamente o IP antigo para o novo domínio HTTPS seguro
    if (rawUrl.includes('147.15.26.202')) {
      rawUrl = rawUrl.replace(/^https?:\/\/147\.15\.26\.202(:\d+)?/i, 'https://auditeca-api.duckdns.org')
    }
    this.baseUrl = rawUrl.replace(/\/+$/, '')
  }

  /**
   * Resolve uma URL retornada pela API (podendo ser relativa ou absoluta, HTTP ou HTTPS).
   */
  private resolveUrl(url?: string): string {
    if (!url) return ''
    let resolved = url.trim()

    // Converte IP antigo para o domínio oficial seguro
    if (resolved.includes('147.15.26.202')) {
      resolved = resolved.replace(/^https?:\/\/147\.15\.26\.202(:\d+)?/i, 'https://auditeca-api.duckdns.org')
    } else if (!resolved.startsWith('http://') && !resolved.startsWith('https://')) {
      if (this.baseUrl.startsWith('/')) {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
        resolved = new URL(resolved.startsWith('/') ? resolved : `/${resolved}`, `${origin}${this.baseUrl}`).toString()
      } else {
        resolved = new URL(resolved.startsWith('/') ? resolved : `/${resolved}`, this.baseUrl).toString()
      }
    }

    // Converte http para https se o navegador estiver em https OU se a baseUrl do serviço for https
    // (evita que requisições no localhost recebam redirect 301 de HTTP para HTTPS que quebram CORS no navegador)
    if (resolved.startsWith('http://')) {
      const isBrowserHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
      const isBaseHttps = this.baseUrl.startsWith('https://')
      if (isBrowserHttps || isBaseHttps) {
        resolved = resolved.replace(/^http:\/\//i, 'https://')
      }
    }
    return resolved
  }

  private async fetchAudioBlob(url: string, signal?: AbortSignal): Promise<Blob> {
    const resolved = this.resolveUrl(url)
    const sep = resolved.includes('?') ? '&' : '?'
    const freshUrl = `${resolved}${sep}_t=${Date.now()}`
    const res = await fetch(freshUrl, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store' },
      signal,
    })
    if (!res.ok) {
      throw new Error(`Não foi possível baixar o áudio da API (${res.status} ${res.statusText}). URL: ${freshUrl}`)
    }
    return await res.blob()
  }

  private async fetchWordMap(
    url?: string,
    inlineWords?: any,
    signal?: AbortSignal
  ): Promise<{ words: WordTiming[]; jsonBlob: Blob }> {
    let words: WordTiming[] = []

    if (Array.isArray(inlineWords) && inlineWords.length > 0) {
      words = inlineWords
    } else if (url) {
      const resolved = this.resolveUrl(url)
      const sep = resolved.includes('?') ? '&' : '?'
      const freshUrl = `${resolved}${sep}_t=${Date.now()}`
      const res = await fetch(freshUrl, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store' },
        signal,
      })
      if (!res.ok) {
        throw new Error(`Falha ao baixar o mapa de palavras da API (${res.status} ${res.statusText}). URL: ${freshUrl}`)
      }
      const data = await res.json()
      words = Array.isArray(data) ? data : data.words || data.mapa || []
    }

    if (!words || words.length === 0) {
      throw new Error('A API retornou um mapa de palavras vazio. Verifique se o documento contém texto legível e se a API gerou os tempos.')
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
    if (options.paginaInicial && options.paginaInicial > 0) {
      formData.append('pagina_inicial', String(options.paginaInicial))
    }
    if (options.paginaFinal && options.paginaFinal > 0) {
      formData.append('pagina_final', String(options.paginaFinal))
    }

    // Dispara log inicial no terminal
    onLog?.({
      tipo: 'log',
      nivel: 'INFO',
      mensagem: `Enviando arquivo "${file.name}" (${(file.size / (1024 * 1024)).toFixed(2)} MB) para a API...`,
      tempo: new Date().toLocaleTimeString('pt-BR'),
    })

    // 1. Inicia o Job (retorno imediato na API v2.0)
    let jobData: any = null

    // Se o arquivo for maior que 3.5 MB e estiver passando pelo proxy interno da Vercel (/api/...),
    // usamos o pipeline de alta capacidade (upload direto para o Blob -> relay server-to-server para a VPS).
    // Para conexões diretas na VPS (como https://auditeca-api.duckdns.org), o envio direto suporta até 100 MB sem precisar de intermediários.
    if (file.size > 3.5 * 1024 * 1024 && this.baseUrl.startsWith('/api') && options.uploadBlobFn) {
      onLog?.({
        tipo: 'log',
        nivel: 'INFO',
        mensagem: `Arquivo de ${(file.size / (1024 * 1024)).toFixed(2)} MB excede o teto da Vercel (4.5 MB). Enviando via Vercel Blob de alta capacidade...`,
        tempo: new Date().toLocaleTimeString('pt-BR'),
      })
      onStatusUpdate?.('Enviando documento para a nuvem...')

      const blobResult = await options.uploadBlobFn(file, (percentage) => {
        onProgress?.({
          tipo: 'progresso',
          porcentagem: Math.round(percentage * 0.15),
          mensagem: `Enviando documento para o armazenamento (${percentage}%)...`,
        })
      })

      onLog?.({
        tipo: 'log',
        nivel: 'INFO',
        mensagem: 'Documento gravado na nuvem. Repassando para o motor de IA na VPS...',
        tempo: new Date().toLocaleTimeString('pt-BR'),
      })
      onStatusUpdate?.('Iniciando síntese na nuvem...')

      const relayResponse = await fetch('/api/audiobook/relay-blob', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blobUrl: blobResult.url,
          filename: file.name,
          voz,
          rate,
          pitch,
          termoCabecalho,
          paginaInicial: options.paginaInicial,
          paginaFinal: options.paginaFinal,
        }),
        signal,
      })

      if (!relayResponse.ok) {
        let errorMsg = `Erro no relay: ${relayResponse.status} ${relayResponse.statusText}`
        try {
          const errJson = await relayResponse.json()
          if (errJson?.detail) errorMsg = errJson.detail
          else if (errJson?.mensagem) errorMsg = errJson.mensagem
          else if (errJson?.error) errorMsg = errJson.error
        } catch {}
        throw new Error(errorMsg)
      }

      jobData = await relayResponse.json()
    } else {
      // Envio direto padrão para arquivos menores que 3.5 MB ou conexões diretas
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

      jobData = await response.json()
    }
    const jobId = jobData?.job_id || ''
    if (!jobId) {
      throw new Error('A API não retornou o identificador da tarefa (job_id).')
    }
    const title = jobData.nome_livro || file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ')

    if (options.onJobCreated) {
      try {
        await options.onJobCreated({
          jobId,
          nomeLivro: title,
          totalPartes: Number(jobData.total_partes) || 0,
        })
      } catch (jobCreatedErr) {
        console.warn('[AudiobookApiClient] Erro no callback onJobCreated:', jobCreatedErr)
      }
    }

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

        if (tipo === 'liberado_parcial') {
          onLog?.({
            tipo: 'log',
            nivel: 'SUCCESS',
            mensagem: '🎉 Primeiro trecho pronto para leitura antecipada! Continuando narração em segundo plano...',
            tempo: evento.tempo || new Date().toLocaleTimeString('pt-BR'),
          })
          if (options.onPartialReady) {
            try {
              const partialAudioUrl = this.resolveUrl(evento.download_audio_url || jobData.download_audio_url)
              const partialMapaUrl = this.resolveUrl(evento.download_mapa_url || jobData.download_mapa_url)
              const [audioBlob, jsonResult] = await Promise.all([
                this.fetchAudioBlob(partialAudioUrl, signal),
                this.fetchWordMap(partialMapaUrl, evento.mapa || jobData.mapa, signal),
              ])
              options.onPartialReady({
                title: evento.nome_livro || title,
                jobId: evento.job_id || jobId,
                audioUrl: partialAudioUrl,
                mapaUrl: partialMapaUrl,
                words: jsonResult.words,
                durationSeconds: (typeof evento.duracao_minutos === 'number' ? evento.duracao_minutos * 60 : evento.duracao_segundos) ?? 0,
                totalWords: jsonResult.words.length,
                audioBlob,
                jsonBlob: jsonResult.jsonBlob,
              })
            } catch (errParcial) {
              console.warn('[SSE] Erro ao carregar liberação parcial:', errParcial)
            }
          }
        }

        if (tipo === 'bloco_concluido') {
          const partesConcluidas = Number(evento.partes_concluidas) || 0
          const totalPartes = Number(evento.total_partes) || 0
          const blocoAtual = Number(evento.bloco_atual) || 1
          const totalBlocos = Number(evento.total_blocos) || 1
          const durMin = typeof evento.duracao_minutos === 'number' ? evento.duracao_minutos : Math.round((evento.duracao_segundos || 0) / 60)

          onLog?.({
            tipo: 'log',
            nivel: 'SUCCESS',
            mensagem: `✅ Macro-Bloco ${blocoAtual}/${totalBlocos} concluído (${partesConcluidas}/${totalPartes} partes | ~${durMin} min prontos)!`,
            tempo: evento.tempo || new Date().toLocaleTimeString('pt-BR'),
          })

          if (options.onBlockReady) {
            try {
              const partialAudioUrl = this.resolveUrl(evento.download_audio_url || jobData.download_audio_url)
              const partialMapaUrl = this.resolveUrl(evento.download_mapa_url || jobData.download_mapa_url)
              const [audioBlob, jsonResult] = await Promise.all([
                this.fetchAudioBlob(partialAudioUrl, signal),
                this.fetchWordMap(partialMapaUrl, evento.mapa || jobData.mapa, signal),
              ])
              options.onBlockReady({
                title: evento.nome_livro || title,
                jobId: evento.job_id || jobId,
                audioUrl: partialAudioUrl,
                mapaUrl: partialMapaUrl,
                words: jsonResult.words,
                durationSeconds: (typeof evento.duracao_minutos === 'number' ? evento.duracao_minutos * 60 : evento.duracao_segundos) ?? 0,
                totalWords: jsonResult.words.length,
                audioBlob,
                jsonBlob: jsonResult.jsonBlob,
                completedParts: partesConcluidas,
                totalParts: totalPartes,
                blockIndex: blocoAtual,
                totalBlocks: totalBlocos,
              })
            } catch (errBloco) {
              console.warn('[SSE] Erro ao carregar bloco consolidado:', errBloco)
            }
          }
        }

        if (tipo === 'cooldown') {
          const segundos = Number(evento.segundos) || 120
          const prox = Number(evento.proximo_bloco) || 2
          const totalB = Number(evento.total_blocos) || 2
          const partesRestantes = Number(evento.partes_restantes) || 0

          const msgCooldown = `⏸️ Pausa de resfriamento de ${segundos}s (limite Microsoft). Faltam ${partesRestantes} partes. Bloco ${prox}/${totalB} iniciará a seguir...`
          onLog?.({
            tipo: 'log',
            nivel: 'INFO',
            mensagem: msgCooldown,
            tempo: evento.tempo || new Date().toLocaleTimeString('pt-BR'),
          })
          onStatusUpdate?.(msgCooldown)

          options.onCooldown?.({
            seconds: segundos,
            nextBlock: prox,
            totalBlocks: totalB,
            completedParts: Number(evento.partes_concluidas) || 0,
            totalParts: Number(evento.total_partes) || 0,
            remainingParts: partesRestantes,
          })
        }

        if (tipo === 'concluido') {
          await finalizeSuccess(evento)
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

      const finalizeSuccess = async (evento: any) => {
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

      let sseRetries = 0
      const maxSseRetries = 3

      const startPollingFallback = () => {
        if (isSettled) return

        onLog?.({
          tipo: 'log',
          nivel: 'WARN',
          mensagem: 'Túnel de logs SSE oscilou. Alternando automaticamente para monitoramento resiliente de status...',
          tempo: new Date().toLocaleTimeString('pt-BR'),
        })

        if (!jobId) {
          isSettled = true
          const errMsg = 'Conexão com o servidor de logs perdida e nenhum Job ID registrado.'
          onStatusUpdate?.(errMsg)
          reject(new Error(errMsg))
          return
        }

        // Fallback resiliente: polling em /status/{job_id}
        const statusUrl = this.resolveUrl(jobData.status_url || `/status/${jobId}`)
        let pollAttempts = 0
        const maxPollAttempts = 1200 // até 60 minutos (3s * 1200)
        let lastReportedPercentage = -1
        const seenLogSignatures = new Set<string>()

        const pollInterval = setInterval(async () => {
          if (isSettled) {
            clearInterval(pollInterval)
            return
          }
          pollAttempts++
          if (pollAttempts > maxPollAttempts) {
            clearInterval(pollInterval)
            isSettled = true
            const timeoutMsg = 'Tempo limite de processamento atingido no servidor (60 minutos).'
            onLog?.({
              tipo: 'log',
              nivel: 'ERROR',
              mensagem: timeoutMsg,
              tempo: new Date().toLocaleTimeString('pt-BR'),
            })
            reject(new Error(timeoutMsg))
            return
          }

          try {
            const statusRes = await fetch(statusUrl, { signal })
            if (!statusRes.ok) return
            const statusData = await statusRes.json()

            // Transmite logs do servidor usando Set para nunca travar por corte de array
            if (Array.isArray(statusData.logs_recentes)) {
              for (const l of statusData.logs_recentes) {
                const sig = `${l.tempo || ''}|${l.mensagem || ''}`
                if (!seenLogSignatures.has(sig)) {
                  seenLogSignatures.add(sig)
                  if (l.mensagem) {
                    onLog?.({
                      tipo: 'log',
                      nivel: l.nivel || 'INFO',
                      mensagem: l.mensagem,
                      tempo: l.tempo || new Date().toLocaleTimeString('pt-BR'),
                    })

                    // Extrai progresso dinâmico de partes concluídas
                    const matchProg =
                      l.mensagem.match(/Sintetizadas\s+(\d+)\s+de\s+(\d+)\s+partes/i) ||
                      l.mensagem.match(/Parte\s+(\d+)\/(\d+)\s+concluída/i)
                    if (matchProg) {
                      const pAtual = parseInt(matchProg[1], 10)
                      const tPartes = parseInt(matchProg[2], 10)
                      if (tPartes > 0) {
                        const pct = Math.min(95, Math.round(10 + (pAtual / tPartes) * 85))
                        if (pct !== lastReportedPercentage) {
                          lastReportedPercentage = pct
                          onProgress?.({
                            tipo: 'progresso',
                            porcentagem: pct,
                            parte_atual: pAtual,
                            total_partes: tPartes,
                            mensagem: `Sintetizadas ${pAtual} de ${tPartes} partes (${pct}%)`,
                          })
                          onStatusUpdate?.(`Sintetizando partes: ${pAtual}/${tPartes} (${pct}%)...`)
                        }
                      }
                    }
                  }
                }
              }
            }

            if (
              statusData.status === 'concluido' ||
              statusData.status === 'sucesso' ||
              statusData.tipo === 'concluido'
            ) {
              clearInterval(pollInterval)
              await finalizeSuccess(statusData)
            } else if (statusData.status === 'erro' || statusData.tipo === 'erro') {
              clearInterval(pollInterval)
              isSettled = true
              const erroMsg = statusData.mensagem || 'Ocorreu um erro no processamento do audiolivro.'
              onStatusUpdate?.(`Erro: ${erroMsg}`)
              reject(new Error(erroMsg))
            } else if (statusData.progresso) {
              const porcentagem = Number(statusData.progresso) || 0
              if (porcentagem !== lastReportedPercentage) {
                lastReportedPercentage = porcentagem
                onProgress?.({
                  tipo: 'progresso',
                  porcentagem,
                  mensagem: statusData.mensagem || `Processando: ${porcentagem}%`,
                })
                onStatusUpdate?.(statusData.mensagem || `Processando audiolivro (${porcentagem}%)...`)
              }
            }
          } catch {
            // Ignora falhas momentâneas de rede no polling
          }
        }, 3000)
      }

      const attachEvents = (source: EventSource) => {
        source.onmessage = (event) => {
          void handleRawMessage(event.data)
        }

        source.addEventListener('log', (event: any) => void handleRawMessage(event.data))
        source.addEventListener('progresso', (event: any) => void handleRawMessage(event.data))
        source.addEventListener('bloco_concluido', (event: any) => void handleRawMessage(event.data))
        source.addEventListener('cooldown', (event: any) => void handleRawMessage(event.data))
        source.addEventListener('liberado_parcial', (event: any) => void handleRawMessage(event.data))
        source.addEventListener('concluido', (event: any) => void handleRawMessage(event.data))
        source.addEventListener('erro', (event: any) => void handleRawMessage(event.data))

        source.onerror = (err) => {
          if (isSettled) return
          closeEventSource()

          // Tenta reconectar até 3 vezes antes de desistir para polling
          if (sseRetries < maxSseRetries) {
            sseRetries++
            console.warn(`[SSE] Oscilação transitória. Reconectando (${sseRetries}/${maxSseRetries}) em 2s...`, err)
            onLog?.({
              tipo: 'log',
              nivel: 'WARN',
              mensagem: `Túnel SSE instável. Reconectando (${sseRetries}/${maxSseRetries})...`,
              tempo: new Date().toLocaleTimeString('pt-BR'),
            })
            setTimeout(() => {
              if (!isSettled) {
                canalLogs = new EventSource(streamUrl)
                attachEvents(canalLogs)
              }
            }, 2000)
            return
          }

          startPollingFallback()
        }
      }

      attachEvents(canalLogs)
    })
  }
}
