import { and, desc, eq, or } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { book, audiobookProgress } from '@/lib/db/schema'
import { isValidWordMap, sanitizeWordMap } from '@/lib/books/word-map'
import { saveAudiobookFile, deleteAudiobookFiles } from '@/lib/storage'

async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  const bookId = new URL(request.url).searchParams.get('id')
  const [latest] = await db.select().from(book).where(bookId
    ? and(eq(book.userId, session.user.id), eq(book.id, bookId))
    : eq(book.userId, session.user.id),
  ).orderBy(desc(book.updatedAt)).limit(1)
  if (!latest) return NextResponse.json({ book: null })
  return NextResponse.json({
    book: {
      ...latest,
      audioUrl: `/api/books/file?pathname=${encodeURIComponent(latest.audioUrl)}`,
      jsonUrl: `/api/books/file?pathname=${encodeURIComponent(latest.jsonUrl)}`,
      pdfUrl: latest.pdfUrl ? `/api/books/file?pathname=${encodeURIComponent(latest.pdfUrl)}` : null,
    },
  })
}

export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  let body: {
    bookId?: string
    durationSeconds?: number
    status?: string
    completedParts?: number
    totalParts?: number
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corpo da solicitação inválido.' }, { status: 400 })
  }

  if (!body.bookId) {
    return NextResponse.json({ error: 'ID do livro obrigatório.' }, { status: 400 })
  }

  const updateFields: any = { updatedAt: new Date() }
  if (typeof body.durationSeconds === 'number' && Number.isFinite(body.durationSeconds) && body.durationSeconds > 0) {
    updateFields.durationSeconds = body.durationSeconds
  }
  if (typeof body.status === 'string') {
    updateFields.status = body.status
  }
  if (typeof body.completedParts === 'number') {
    updateFields.completedParts = body.completedParts
  }
  if (typeof body.totalParts === 'number') {
    updateFields.totalParts = body.totalParts
  }

  const [updated] = await db.update(book)
    .set(updateFields)
    .where(and(eq(book.id, body.bookId), eq(book.userId, session.user.id)))
    .returning()

  if (!updated) return NextResponse.json({ error: 'Livro não encontrado.' }, { status: 404 })
  return NextResponse.json(updated)
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  // Support direct JSON submission when client uploads directly to Vercel Blob
  if (request.headers.get('content-type')?.includes('application/json')) {
    let body: {
      name?: string
      audioUrl?: string
      jsonUrl?: string
      pdfUrl?: string
      coverUrl?: string
      replaceExisting?: boolean
      status?: string
      jobId?: string
      completedParts?: number
      totalParts?: number
      durationSeconds?: number
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Corpo JSON inválido.' }, { status: 400 })
    }

    const name = String(body.name || '').trim()
    const audioUrl = String(body.audioUrl || '').trim()
    const jsonUrl = String(body.jsonUrl || '').trim()
    const pdfUrl = body.pdfUrl?.trim() || null
    const coverUrl = body.coverUrl?.trim() || null
    const replaceExisting = Boolean(body.replaceExisting)
    const status = body.status || 'concluido'
    const jobId = body.jobId?.trim() || null
    const completedParts = typeof body.completedParts === 'number' ? body.completedParts : 0
    const totalParts = typeof body.totalParts === 'number' ? body.totalParts : 0
    const durationSeconds = typeof body.durationSeconds === 'number' ? body.durationSeconds : null

    if (!name || !audioUrl || !jsonUrl) {
      return NextResponse.json({ error: 'Dados incompletos (nome, áudio e mapa JSON são obrigatórios).' }, { status: 400 })
    }

    const [existing] = await db.select().from(book).where(
      and(eq(book.userId, session.user.id), eq(book.name, name)),
    ).limit(1)

    if (existing && !replaceExisting) {
      return NextResponse.json({
        code: 'BOOK_EXISTS',
        error: `Já existe um livro chamado “${existing.name}”.`,
        book: { id: existing.id, name: existing.name },
      }, { status: 409 })
    }

    try {
      const now = new Date()
      const [saved] = existing
        ? await db.update(book)
          .set({
            audioUrl,
            jsonUrl,
            pdfUrl: pdfUrl ?? existing.pdfUrl,
            coverUrl: coverUrl ?? existing.coverUrl,
            durationSeconds: durationSeconds ?? existing.durationSeconds,
            status,
            jobId: jobId ?? existing.jobId,
            completedParts,
            totalParts,
            updatedAt: now,
          })
          .where(and(eq(book.id, existing.id), eq(book.userId, session.user.id)))
          .returning()
        : await db.insert(book).values({
          id: randomUUID(),
          userId: session.user.id,
          name,
          audioUrl,
          jsonUrl,
          pdfUrl,
          coverUrl,
          durationSeconds,
          status,
          jobId,
          completedParts,
          totalParts,
          createdAt: now,
          updatedAt: now,
        }).returning()

      return NextResponse.json({
        book: {
          ...saved,
          audioUrl: `/api/books/file?pathname=${encodeURIComponent(saved.audioUrl)}`,
          jsonUrl: `/api/books/file?pathname=${encodeURIComponent(saved.jsonUrl)}`,
          pdfUrl: saved.pdfUrl ? `/api/books/file?pathname=${encodeURIComponent(saved.pdfUrl)}` : null,
        },
      })
    } catch (error) {
      console.error('[audiobook] Book save failed:', error)
      return NextResponse.json({
        error: error instanceof Error ? error.message : 'Não foi possível salvar o livro no banco de dados.',
      }, { status: 500 })
    }
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Não foi possível ler os arquivos enviados.' }, { status: 400 })
  }

  const audio = formData.get('audio')
  const json = formData.get('json')
  const name = String(formData.get('name') || '').trim()
  const rawCoverUrl = formData.get('coverUrl')
  const coverUrl = typeof rawCoverUrl === 'string' && rawCoverUrl.trim() ? rawCoverUrl.trim() : null
  const replaceExisting = formData.get('replaceExisting') === 'true'

  if (!(audio instanceof File) || !(json instanceof File) || !name) {
    return NextResponse.json({ error: 'Selecione um áudio, um mapa de palavras e informe o nome do livro.' }, { status: 400 })
  }
  const audioExtension = audio.name.split('.').pop()?.toLowerCase()
  const isRecognizedAudio = audio.type.startsWith('audio/') || ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'opus'].includes(audioExtension ?? '')
  if (audio.size === 0 || json.size === 0 || !isRecognizedAudio || json.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Verifique o áudio e o arquivo JSON (máximo de 10 MB).' }, { status: 400 })
  }

  let parsedMap: unknown
  try {
    parsedMap = JSON.parse(await json.text())
  } catch {
    return NextResponse.json({ error: 'O mapa de palavras não contém um JSON válido.' }, { status: 400 })
  }
  const sanitizedWords = sanitizeWordMap(parsedMap)
  if (!sanitizedWords || sanitizedWords.length === 0) {
    return NextResponse.json({ error: 'O mapa deve conter palavras e tempos válidos nos campos p, i e f.' }, { status: 400 })
  }

  const cleanJsonFile = new File(
    [JSON.stringify(sanitizedWords, null, 2)],
    json.name || `${name}.json`,
    { type: 'application/json' }
  )

  const [existing] = await db.select().from(book).where(
    and(eq(book.userId, session.user.id), eq(book.name, name)),
  ).limit(1)

  if (existing && !replaceExisting) {
    return NextResponse.json({
      code: 'BOOK_EXISTS',
      error: `Já existe um livro chamado “${existing.name}”.`,
      book: { id: existing.id, name: existing.name },
    }, { status: 409 })
  }

  try {
    const prefix = `audiobooks/${session.user.id}/${name.replace(/[^a-z0-9_-]+/gi, '_')}`
    const pdf = formData.get('pdf')
    const status = String(formData.get('status') || 'concluido')
    const rawJobId = formData.get('jobId')
    const jobId = typeof rawJobId === 'string' && rawJobId.trim() ? rawJobId.trim() : null
    const rawCompletedParts = formData.get('completedParts')
    const completedParts = rawCompletedParts ? Number(rawCompletedParts) || 0 : 0
    const rawTotalParts = formData.get('totalParts')
    const totalParts = rawTotalParts ? Number(rawTotalParts) || 0 : 0
    const rawDuration = formData.get('durationSeconds')
    const durationSeconds = rawDuration ? Number(rawDuration) || null : null

    const [audioBlob, jsonBlob, pdfBlob] = await Promise.all([
      saveAudiobookFile(prefix, 'audio', audio),
      saveAudiobookFile(prefix, 'json', cleanJsonFile),
      pdf instanceof File && pdf.size > 0 ? saveAudiobookFile(prefix, 'pdf', pdf) : Promise.resolve(null),
    ])
    const now = new Date()
    const [saved] = existing
      ? await db.update(book)
        .set({
          audioUrl: audioBlob.pathname,
          jsonUrl: jsonBlob.pathname,
          pdfUrl: pdfBlob ? pdfBlob.pathname : existing.pdfUrl,
          coverUrl: coverUrl ?? existing.coverUrl,
          durationSeconds: durationSeconds ?? existing.durationSeconds,
          status,
          jobId: jobId ?? existing.jobId,
          completedParts,
          totalParts,
          updatedAt: now,
        })
        .where(and(eq(book.id, existing.id), eq(book.userId, session.user.id)))
        .returning()
      : await db.insert(book).values({
        id: randomUUID(),
        userId: session.user.id,
        name,
        audioUrl: audioBlob.pathname,
        jsonUrl: jsonBlob.pathname,
        pdfUrl: pdfBlob ? pdfBlob.pathname : null,
        coverUrl,
        durationSeconds,
        status,
        jobId,
        completedParts,
        totalParts,
        createdAt: now,
        updatedAt: now,
      }).returning()

    return NextResponse.json({
      book: {
        ...saved,
        audioUrl: `/api/books/file?pathname=${encodeURIComponent(saved.audioUrl)}`,
        jsonUrl: `/api/books/file?pathname=${encodeURIComponent(saved.jsonUrl)}`,
        pdfUrl: saved.pdfUrl ? `/api/books/file?pathname=${encodeURIComponent(saved.pdfUrl)}` : null,
      },
    })
  } catch (error) {
    console.error('[audiobook] Book upload failed:', error)
    const message = error instanceof Error ? error.message : 'Não foi possível adicionar o livro agora.'
    return NextResponse.json({
      error: message,
      details: error instanceof Error ? error.stack : String(error),
    }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const url = new URL(request.url)
  let bookId = url.searchParams.get('id')
  if (!bookId) {
    try {
      const body = await request.json()
      bookId = body.id || body.bookId
    } catch {}
  }

  if (!bookId) {
    return NextResponse.json({ error: 'ID do livro não informado.' }, { status: 400 })
  }

  console.log('[api/books] DELETE request for bookId:', bookId, 'by userId:', session.user.id)

  const [existing] = await db.select().from(book).where(
    and(eq(book.id, bookId), eq(book.userId, session.user.id)),
  ).limit(1)

  if (!existing) {
    return NextResponse.json({ error: 'Livro não encontrado.' }, { status: 404 })
  }

  try {
    // 1. Delete associated progress entries for this book
    await db.delete(audiobookProgress).where(
      and(
        eq(audiobookProgress.userId, session.user.id),
        or(eq(audiobookProgress.bookId, bookId), eq(audiobookProgress.bookName, existing.name)),
      ),
    )

    // 2. Delete the book record from database
    await db.delete(book).where(
      and(eq(book.id, bookId), eq(book.userId, session.user.id)),
    )

    // 3. Delete stored audio, json and pdf files (local + blob)
    await deleteAudiobookFiles(existing.audioUrl, existing.jsonUrl, existing.pdfUrl)

    console.log('[api/books] Successfully deleted book:', existing.name, 'id:', bookId)
    return NextResponse.json({ success: true, id: bookId, name: existing.name })
  } catch (err) {
    console.error('[api/books] Failed to delete book:', err)
    return NextResponse.json({ error: 'Erro ao excluir o livro.' }, { status: 500 })
  }
}

