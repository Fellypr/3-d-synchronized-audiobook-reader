import { NextResponse } from 'next/server'
import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { audiobookProgress, book } from '@/lib/db/schema'

async function getUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user ?? null
}

async function findOwnedBook(userId: string, bookId?: string | null, bookName?: string | null) {
  const condition = bookId
    ? and(eq(book.id, bookId), eq(book.userId, userId))
    : bookName
      ? and(eq(book.name, bookName.trim()), eq(book.userId, userId))
      : eq(book.userId, '')

  const [ownedBook] = await db.select().from(book).where(condition).limit(1)
  return ownedBook
}

export async function GET(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const searchParams = new URL(request.url).searchParams
  const ownedBook = await findOwnedBook(
    user.id,
    searchParams.get('bookId')?.trim(),
    searchParams.get('bookName')?.trim(),
  )
  if (!ownedBook) return NextResponse.json({ error: 'Livro não encontrado.' }, { status: 404 })

  let [saved] = await db.select().from(audiobookProgress).where(
    and(eq(audiobookProgress.userId, user.id), eq(audiobookProgress.bookId, ownedBook.id)),
  ).orderBy(desc(audiobookProgress.updatedAt)).limit(1)

  if (!saved) {
    ;[saved] = await db.select().from(audiobookProgress).where(
      and(eq(audiobookProgress.userId, user.id), eq(audiobookProgress.bookName, ownedBook.name), isNull(audiobookProgress.bookId)),
    ).orderBy(desc(audiobookProgress.updatedAt)).limit(1)
  }

  return NextResponse.json({
    bookId: ownedBook.id,
    currentTime: saved?.currentTime ?? 0,
    listenedSeconds: saved?.listenedSeconds ?? null,
    durationSeconds: ownedBook.durationSeconds,
    updatedAt: saved?.updatedAt ?? null,
  })
}

export async function PUT(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  let body: { bookId?: string; bookName?: string; currentTime?: number; listenedSeconds?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corpo da solicitação inválido.' }, { status: 400 })
  }

  const currentTime = Number(body.currentTime)
  const hasMeasuredListening = typeof body.listenedSeconds === 'number'
  const listenedSeconds = body.listenedSeconds
  if (
    !Number.isFinite(currentTime)
    || currentTime < 0
    || (hasMeasuredListening && (!Number.isFinite(listenedSeconds) || Number(listenedSeconds) < 0))
  ) {
    return NextResponse.json({ error: 'Progresso inválido.' }, { status: 400 })
  }

  const ownedBook = await findOwnedBook(user.id, body.bookId, body.bookName)
  if (!ownedBook) return NextResponse.json({ error: 'Livro não encontrado.' }, { status: 404 })

  const boundedTime = ownedBook.durationSeconds
    ? Math.min(currentTime, ownedBook.durationSeconds)
    : currentTime
  const now = new Date()
  const listenedValue = hasMeasuredListening ? Number(listenedSeconds) : null

  await db.insert(audiobookProgress).values({
    id: randomUUID(),
    userId: user.id,
    bookId: ownedBook.id,
    bookName: ownedBook.name,
    currentTime: boundedTime,
    listenedSeconds: listenedValue,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: [audiobookProgress.userId, audiobookProgress.bookName],
    set: {
      bookId: ownedBook.id,
      currentTime: boundedTime,
      ...(hasMeasuredListening ? {
        listenedSeconds: sql`GREATEST(COALESCE(${audiobookProgress.listenedSeconds}, 0), COALESCE(EXCLUDED."listenedSeconds", 0))`,
      } : {}),
      updatedAt: now,
    },
  })

  return NextResponse.json({ ok: true, currentTime: boundedTime, listenedSeconds: listenedValue, updatedAt: now })
}
