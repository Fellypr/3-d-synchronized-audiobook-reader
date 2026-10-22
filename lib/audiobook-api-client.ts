/**
 * Cliente de Integração com a API Python (FastAPI + edge-tts) no Render
 * Endpoint padrão: https://api-edge-tts.onrender.com
 */

export type WordTiming = {
  p: string
  i: number
  f: number
}

export type ProcessBookOptions = {
  voz?: string
  rate?: string
  pitch?: string
  termoCabecalho?: string
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

  constructor(baseUrl = 'https://api-edge-tts.onrender.com') {
    this.baseUrl = baseUrl.replace(/\/+$/, '')
  }

  /**
   * Envia o PDF ou DOCX diretamente para processamento e geração de audiolivro sincronizado.
   * Se o servidor no Render estiver em hibernação (plano gratuito), o próprio proxy do Render
   * segura a requisição enquanto inicializa o container (geralmente entre 30 e 60 segundos).
   */
  async processarLivro(
    file: File,
    options: ProcessBookOptions = {},
    onStatusUpdate?: (status: string) => void
  ): Promise<ProcessBookResult> {
    const {
      voz = 'pt-BR-AntonioNeural',
      rate = '+0%',
      pitch = '-5Hz',
      termoCabecalho,
    } = options

    onStatusUpdate?.(`Enviando "${file.name}" para a API...`)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('voz', voz)
    formData.append('rate', rate)
    formData.append('pitch', pitch)
    formData.append('retornar_mapa_inline', 'true')
    if (termoCabecalho?.trim()) {
      formData.append('termo_cabecalho', termoCabecalho.trim())
    }

    // Timer visual enquanto a IA processa e o Render acorda se necessário
    const processStart = Date.now()
    const timerInterval = setInterval(() => {
      const elapsed = Math.round((Date.now() - processStart) / 1000)
      if (elapsed < 30) {
        onStatusUpdate?.(
          `Conectando ao servidor e gerando narração neural (${elapsed}s)...`
        )
      } else {
        onStatusUpdate?.(
          `Sintetizando áudio com IA (${elapsed}s)... (Se o servidor estava hibernando, ele leva até ~50s para iniciar)`
        )
      }
    }, 1200)

    let response: Response
    try {
      response = await fetch(`${this.baseUrl}/processar-livro/`, {
        method: 'POST',
        body: formData,
      })
    } catch (fetchErr: any) {
      clearInterval(timerInterval)
      const msg = fetchErr?.message || String(fetchErr)
      throw new Error(
        `Falha de conexão com a API no Render: ${msg}. Verifique se o servidor está ativo em ${this.baseUrl}`
      )
    } finally {
      clearInterval(timerInterval)
    }

    if (!response.ok) {
      let errorMsg = `Erro na API: ${response.status} ${response.statusText}`
      try {
        const errJson = await response.json()
        if (errJson?.detail) errorMsg = errJson.detail
      } catch {}
      throw new Error(errorMsg)
    }

    const payload = await response.json()
    const title = payload.nome_livro || file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ')

    // Normaliza URLs para HTTPS
    const rawAudioUrl = String(payload.download_audio_url || '').replace(/^http:\/\//i, 'https://')
    const rawMapaUrl = String(payload.download_mapa_url || '').replace(/^http:\/\//i, 'https://')

    // O FastAPI retorna os tempos na propriedade 'mapa' (com fallback para 'mapa_tempos')
    const rawWords = payload.mapa || payload.mapa_tempos || []

    onStatusUpdate?.('Baixando áudio gerado para salvar na sua biblioteca...')
    const audioRes = await fetch(rawAudioUrl)
    if (!audioRes.ok) {
      throw new Error('Não foi possível baixar o arquivo de áudio gerado pela API.')
    }
    const audioBlob = await audioRes.blob()

    let words: WordTiming[] = []
    if (Array.isArray(rawWords) && rawWords.length > 0 && typeof rawWords[0]?.p === 'string') {
      words = rawWords
    } else if (rawMapaUrl) {
      onStatusUpdate?.('Baixando mapa de sincronização...')
      const jsonRes = await fetch(rawMapaUrl)
      if (jsonRes.ok) {
        words = await jsonRes.json()
      }
    }

    const jsonBlob = new Blob([JSON.stringify(words, null, 2)], {
      type: 'application/json',
    })

    return {
      title,
      jobId: payload.job_id,
      audioUrl: rawAudioUrl,
      mapaUrl: rawMapaUrl,
      words,
      durationSeconds: payload.duracao_segundos ?? 0,
      totalWords: payload.total_palavras ?? words.length,
      audioBlob,
      jsonBlob,
    }
  }
}
