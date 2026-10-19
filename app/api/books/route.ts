import { and, desc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { book } from '@/lib/db/schema'
import { isValidWordMap } from '@/lib/books/word-map'
import { saveAudiobookFile } from '@/lib/storage'

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
    },
  })
}

export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  let body: { bookId?: string; durationSeconds?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corpo da solicitação inválido.' }, { status: 400 })
  }

  const durationSeconds = Number(body.durationSeconds)
  if (!body.bookId || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return NextResponse.json({ error: 'Duração do áudio inválida.' }, { status: 400 })
  }

  const [updated] = await db.update(book)
    .set({ durationSeconds })
    .where(and(eq(book.id, body.bookId), eq(book.userId, session.user.id)))
    .returning({ id: book.id, durationSeconds: book.durationSeconds })

  if (!updated) return NextResponse.json({ error: 'Livro não encontrado.' }, { status: 404 })
  return NextResponse.json(updated)
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Não foi possível ler os arquivos enviados.' }, { status: 400 })
  }

  const audio = formData.get('audio')
  const json = formData.get('json')
  const name = String(formData.get('name') || '').trim()
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
  if (!isValidWordMap(parsedMap)) {
    return NextResponse.json({ error: 'O mapa deve conter palavras e tempos válidos nos campos p, i e f.' }, { status: 400 })
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
    const prefix = `audiobooks/${session.user.id}/${name.replace(/[^a-z0-9_-]+/gi, '_')}`
    const [audioBlob, jsonBlob] = await Promise.all([
      saveAudiobookFile(prefix, 'audio', audio),
      saveAudiobookFile(prefix, 'json', json),
    ])
    const now = new Date()
    const [saved] = existing
      ? await db.update(book)
        .set({ audioUrl: audioBlob.pathname, jsonUrl: jsonBlob.pathname, durationSeconds: null, updatedAt: now })
        .where(and(eq(book.id, existing.id), eq(book.userId, session.user.id)))
        .returning()
      : await db.insert(book).values({
        id: randomUUID(),
        userId: session.user.id,
        name,
        audioUrl: audioBlob.pathname,
        jsonUrl: jsonBlob.pathname,
        durationSeconds: null,
        createdAt: now,
        updatedAt: now,
      }).returning()

    return NextResponse.json({
      book: {
        ...saved,
        audioUrl: `/api/books/file?pathname=${encodeURIComponent(saved.audioUrl)}`,
        jsonUrl: `/api/books/file?pathname=${encodeURIComponent(saved.jsonUrl)}`,
      },
    })
  } catch (error) {
    console.error('[audiobook] Book upload failed:', error)
    return NextResponse.json({ error: 'Não foi possível adicionar o livro agora.' }, { status: 500 })
  }
}
