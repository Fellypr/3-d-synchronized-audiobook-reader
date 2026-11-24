import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { book } from '@/lib/db/schema'

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
  const fallbackApiUrl = process.env.AUDIOBOOK_API_URL || process.env.NEXT_PUBLIC_AUDIOBOOK_API_URL || 'https://auditeca-api.duckdns.org'
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

  const totalPartes = Number(statusData.total_partes) || existing.totalParts || 0
  const statusJob = statusData.status === 'concluido' ? 'concluido' : 'processando'
  const novasPartes =
    statusJob === 'concluido'
      ? totalPartes
      : Number(statusData.partes_concluidas) || existing.completedParts || 0
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

  // Aponta diretamente para o armazenamento permanente na VPS com HTTPS (sem baixar centenas de MB na Vercel ou usar Blob suspenso)
  let finalAudioUrl = String(statusData.download_audio_url || `${cleanApiUrl}/download/${jobId}/audio`).trim()
  let finalMapaUrl = String(statusData.download_mapa_url || `${cleanApiUrl}/download/${jobId}/mapa`).trim()

  if (finalAudioUrl.includes('147.15.26.202')) {
    finalAudioUrl = finalAudioUrl.replace(/^https?:\/\/147\.15\.26\.202(:\d+)?/i, 'https://auditeca-api.duckdns.org')
  }
  if (finalMapaUrl.includes('147.15.26.202')) {
    finalMapaUrl = finalMapaUrl.replace(/^https?:\/\/147\.15\.26\.202(:\d+)?/i, 'https://auditeca-api.duckdns.org')
  }

  try {
    const duracaoSegundos =
      typeof statusData.duracao_segundos === 'number' ? statusData.duracao_segundos : existing.durationSeconds

    const now = new Date()
    const [updated] = await db
      .update(book)
      .set({
        audioUrl: finalAudioUrl,
        jsonUrl: finalMapaUrl,
        durationSeconds: duracaoSegundos,
        status: statusJob,
        completedParts: novasPartes,
        totalParts: totalPartes,
        updatedAt: now,
      })
      .where(and(eq(book.id, existing.id), eq(book.userId, session.user.id)))
      .returning()

    console.log(
      `[sync-job] Livro "${existing.name}" sincronizado com sucesso via VPS: ${novasPartes}/${totalPartes} partes (${statusJob}).`
    )

    return NextResponse.json({
      success: true,
      updated: true,
      completedParts: novasPartes,
      totalParts: totalPartes,
      status: statusJob,
      durationSeconds: duracaoSegundos,
      book: {
        ...updated,
        audioUrl:
          updated.audioUrl.startsWith('http://') || updated.audioUrl.startsWith('https://')
            ? updated.audioUrl
            : `/api/books/file?pathname=${encodeURIComponent(updated.audioUrl)}`,
        jsonUrl:
          updated.jsonUrl.startsWith('http://') || updated.jsonUrl.startsWith('https://')
            ? updated.jsonUrl
            : `/api/books/file?pathname=${encodeURIComponent(updated.jsonUrl)}`,
      },
    })
  } catch (err: any) {
    console.error('[sync-job] Erro ao atualizar registro do livro no banco:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Falha ao atualizar status do livro sincronizado.' },
      { status: 500 }
    )
  }
}
