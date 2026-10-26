import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { and, eq, or } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { book } from '@/lib/db/schema'
import { serveAudiobookFile } from '@/lib/storage'

export async function GET(request: Request) {
  const reqHeaders = await headers()
  const session = await auth.api.getSession({ headers: reqHeaders })
  const pathname = new URL(request.url).searchParams.get('pathname')

  console.log('[api/books/file] Request received:', {
    url: request.url,
    pathname,
    sessionUser: session?.user ? { id: session.user.id, name: session.user.name } : null,
  })

  if (!session?.user) {
    console.warn('[api/books/file] Unauthorized access: no active session')
    return NextResponse.json({ error: 'Unauthorized', details: 'Sessão não encontrada ou expirada.' }, { status: 401 })
  }

  if (!pathname) {
    console.warn('[api/books/file] Missing pathname parameter')
    return NextResponse.json({ error: 'Not found', details: 'Parâmetro pathname ausente.' }, { status: 404 })
  }

  const expectedPrefix = `audiobooks/${session.user.id}/`
  const startsWithUser = pathname.startsWith(expectedPrefix)

  if (!startsWithUser) {
    // Check if user owns a book referencing this pathname in DB
    const [userBook] = await db.select({ id: book.id })
      .from(book)
      .where(and(
        eq(book.userId, session.user.id),
        or(
          eq(book.audioUrl, pathname),
          eq(book.jsonUrl, pathname),
          eq(book.pdfUrl, pathname),
        )
      ))
      .limit(1)

    if (!userBook) {
      console.warn('[api/books/file] Pathname mismatch with session user ID and not found in DB:', {
        expectedPrefix,
        receivedPathname: pathname,
        sessionUserId: session.user.id,
      })
      return NextResponse.json({
        error: 'Not found',
        details: `O arquivo solicitado não pertence a nenhum livro do usuário autenticado.`,
        pathname,
        userId: session.user.id,
      }, { status: 404 })
    }
  }

  try {
    return await serveAudiobookFile(pathname, request)
  } catch (error) {
    console.error('[api/books/file] Error serving file:', error)
    return NextResponse.json({
      error: 'File delivery failed',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}
