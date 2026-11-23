import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { book } from '@/lib/db/schema'
import { saveAudiobookFile } from '@/lib/storage'
import { sanitizeWordMap } from '@/lib/books/word-map'

export async function POST(request: Request) {
  const reqHeaders = await headers()
  const session = await auth.api.getSession({ headers: reqHeaders })
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  let body: {
    bookId?: string
    jobId?: string
    apiUrl?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corpo JSON inválido.' }, { status: 400 })
  }

  const { bookId, jobId, apiUrl } = body
  const fallbackApiUrl = process.env.AUDIOBOOK_API_URL || process.env.NEXT_PUBLIC_AUDIOBOOK_API_URL || 'http://147.15.26.202'
  const rawApiUrl = apiUrl && !apiUrl.startsWith('/') && !apiUrl.includes('/api/audiobook')
    ? apiUrl
    : fallbackApiUrl
  const cleanApiUrl = rawApiUrl.replace(/\/+$/, '')

  if (!bookId || !jobId) {
    return NextResponse.json({ error: 'bookId e jobId são obrigatórios.' }, { status: 400 })
  }

  // Busca o livro no banco
  const [existing] = await db
    .select()
    .from(book)
    .where(and(eq(book.id, bookId), eq(book.userId, session.user.id)))
    .limit(1)

  if (!existing) {
    return NextResponse.json({ error: 'Livro não encontrado.' }, { status: 404 })
  }

  // Se já está concluído, não precisa de sincronização
  if (existing.status === 'concluido') {
    return NextResponse.json({ success: true, updated: false, status: 'concluido' })
  }

  // Consulta o status do job na API de áudio
  const statusEndpoint = `${cleanApiUrl}/status/${encodeURIComponent(jobId)}?_t=${Date.now()}`

  let statusData: any = null
  try {
    const statusRes = await fetch(statusEndpoint, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store' },
    })
    if (!statusRes.ok) {
      return NextResponse.json({
        success: false,
        error: `API retornou status ${statusRes.status}`,
      })
    }
    statusData = await statusRes.json()
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: `Falha ao consultar API: ${err?.message || err}`,
    })
  }

  const novasPartes = Number(statusData.partes_concluidas) || 0
  const totalPartes = Number(statusData.total_partes) || existing.totalParts || 0
  const statusJob = statusData.status === 'concluido' ? 'concluido' : 'processando'
  const partesAtuais = existing.completedParts || 0

  // Se não houve avanço de partes e o status não mudou para concluído, não há o que atualizar
  const deveAtualizar = novasPartes > partesAtuais || (statusJob === 'concluido' && existing.status !== 'concluido')
  if (!deveAtualizar) {
    return NextResponse.json({
      success: true,
      updated: false,
      completedParts: partesAtuais,
      totalParts: totalPartes,
      status: existing.status,
    })
  }

  // Baixa o novo áudio e o mapa atualizado diretamente servidor-para-servidor
  const rawAudioUrl = statusData.download_audio_url || `${cleanApiUrl}/download/${jobId}/audio`
  const rawMapaUrl = statusData.download_mapa_url || `${cleanApiUrl}/download/${jobId}/mapa`

  const sepAudio = rawAudioUrl.includes('?') ? '&' : '?'
  const sepMapa = rawMapaUrl.includes('?') ? '&' : '?'
  const freshAudioUrl = `${rawAudioUrl}${sepAudio}_t=${Date.now()}`
  const freshMapaUrl = `${rawMapaUrl}${sepMapa}_t=${Date.now()}`

  try {
    const [audioRes, mapaRes] = await Promise.all([
      fetch(freshAudioUrl, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache, no-store' } }),
      fetch(freshMapaUrl, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache, no-store' } }),
    ])

    if (!audioRes.ok || !mapaRes.ok) {
      console.warn('[sync-job] Falha ao baixar arquivos parciais da API:', {
        audioStatus: audioRes.status,
        mapaStatus: mapaRes.status,
      })
      return NextResponse.json({
        success: false,
        error: 'Arquivos ainda não disponíveis para download na API.',
      })
    }

    const audioArrayBuffer = await audioRes.arrayBuffer()
    const mapaText = await mapaRes.text()

    let parsedMap: unknown
    try {
      parsedMap = JSON.parse(mapaText)
    } catch {
      return NextResponse.json({ success: false, error: 'Mapa JSON retornado é inválido.' })
    }

    const rawWords = Array.isArray(parsedMap) ? parsedMap : (parsedMap as any)?.words || (parsedMap as any)?.mapa || []
    const sanitizedWords = sanitizeWordMap(rawWords)

    const prefix = `audiobooks/${session.user.id}/${existing.name.replace(/[^a-z0-9_-]+/gi, '_')}`

    const audioFile = new File([audioArrayBuffer], `${existing.name}.mp3`, { type: 'audio/mpeg' })
    const cleanJsonFile = new File(
      [JSON.stringify(sanitizedWords, null, 2)],
      `${existing.name}.json`,
      { type: 'application/json' }
    )

    const [audioBlob, jsonBlob] = await Promise.all([
      saveAudiobookFile(prefix, 'audio', audioFile),
      saveAudiobookFile(prefix, 'json', cleanJsonFile),
    ])

    const duracaoSegundos = typeof statusData.duracao_segundos === 'number'
      ? statusData.duracao_segundos
      : existing.durationSeconds

    const now = new Date()
    const [updated] = await db
      .update(book)
      .set({
        audioUrl: audioBlob.pathname,
        jsonUrl: jsonBlob.pathname,
        durationSeconds: duracaoSegundos,
        status: statusJob,
        completedParts: novasPartes,
        totalParts: totalPartes,
        updatedAt: now,
      })
      .where(and(eq(book.id, existing.id), eq(book.userId, session.user.id)))
      .returning()

    console.log(`[sync-job] Livro "${existing.name}" atualizado com sucesso: ${novasPartes}/${totalPartes} partes (${statusJob}).`)

    return NextResponse.json({
      success: true,
      updated: true,
      completedParts: novasPartes,
      totalParts: totalPartes,
      status: statusJob,
      durationSeconds: duracaoSegundos,
      book: {
        ...updated,
        audioUrl: `/api/books/file?pathname=${encodeURIComponent(updated.audioUrl)}`,
        jsonUrl: `/api/books/file?pathname=${encodeURIComponent(updated.jsonUrl)}`,
      },
    })
  } catch (err: any) {
    console.error('[sync-job] Erro ao sincronizar macro-bloco:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Falha ao salvar arquivos sincronizados.' },
      { status: 500 }
    )
  }
}
