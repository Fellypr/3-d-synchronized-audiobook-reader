import { NextResponse } from 'next/server'
import { and, desc, eq, or } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ensureBookmarksTable } from '@/lib/db/ensure-bookmarks'
import { book, bookmarks } from '@/lib/db/schema'

async function getUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user ?? null
}

export async function GET(request: Request) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    await ensureBookmarksTable()

    const { searchParams } = new URL(request.url)
    const bookId = searchParams.get('bookId')?.trim()
    const bookName = searchParams.get('bookName')?.trim()

    const filterConditions = []
    if (bookId && bookName) {
      filterConditions.push(or(eq(bookmarks.bookId, bookId), eq(bookmarks.bookName, bookName)))
    } else if (bookId) {
      filterConditions.push(eq(bookmarks.bookId, bookId))
    } else if (bookName) {
      filterConditions.push(eq(bookmarks.bookName, bookName))
    }

    const items = await db
      .select()
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, user.id), ...filterConditions))
      .orderBy(desc(bookmarks.createdAt))

    return NextResponse.json(items)
  } catch (err) {
    console.error('[api/bookmarks][GET]', err)
    return NextResponse.json({ error: 'Erro ao listar marcadores.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    await ensureBookmarksTable()

    let body: {
      bookId?: string | null
      bookName?: string
      chapter?: string | null
      section?: string | null
      pageNumber?: number | null
      wordIndex?: number
      endWordIndex?: number | null
      title?: string | null
      category?: string | null
      color?: string | null
      selectedText?: string
      textPrefix?: string | null
      textSuffix?: string | null
      audioTimeSeconds?: number | null
      note?: string | null
    }

    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Corpo da solicitação inválido.' }, { status: 400 })
    }

    const bookName = body.bookName?.trim()
    const selectedText = body.selectedText?.trim()
    const wordIndex = typeof body.wordIndex === 'number' ? body.wordIndex : Number(body.wordIndex)

    if (!bookName) {
      return NextResponse.json({ error: 'O nome do livro (bookName) é obrigatório.' }, { status: 400 })
    }

    if (!selectedText) {
      return NextResponse.json({ error: 'O texto selecionado (selectedText) é obrigatório.' }, { status: 400 })
    }

    if (!Number.isInteger(wordIndex) || wordIndex < 0) {
      return NextResponse.json(
        { error: 'O índice da palavra (wordIndex) deve ser um número inteiro não negativo.' },
        { status: 400 }
      )
    }

    const pageNumber =
      typeof body.pageNumber === 'number' && Number.isInteger(body.pageNumber)
        ? body.pageNumber
        : body.pageNumber
        ? Number.parseInt(String(body.pageNumber), 10)
        : null

    const audioTimeSeconds =
      typeof body.audioTimeSeconds === 'number' && Number.isFinite(body.audioTimeSeconds)
        ? body.audioTimeSeconds
        : body.audioTimeSeconds != null
        ? Number.parseFloat(String(body.audioTimeSeconds))
        : null

    const endWordIndexRaw =
      typeof body.endWordIndex === 'number'
        ? body.endWordIndex
        : body.endWordIndex != null
        ? Number.parseInt(String(body.endWordIndex), 10)
        : wordIndex
    const endWordIndex =
      Number.isInteger(endWordIndexRaw) && endWordIndexRaw >= wordIndex ? endWordIndexRaw : wordIndex

    // Verify bookId exists in `book` for this user to prevent FK violation (23503)
    let safeBookId: string | null = body.bookId?.trim() || null
    if (safeBookId) {
      const [owned] = await db
        .select({ id: book.id })
        .from(book)
        .where(and(eq(book.id, safeBookId), eq(book.userId, user.id)))
        .limit(1)
      if (!owned) {
        safeBookId = null
      }
    }

    const newBookmark = {
      id: randomUUID(),
      userId: user.id,
      bookId: safeBookId,
      bookName,
      chapter: body.chapter?.trim() || null,
      section: body.section?.trim() || null,
      pageNumber: Number.isInteger(pageNumber) ? pageNumber : null,
      wordIndex,
      endWordIndex,
      title: body.title?.trim() || null,
      category: body.category?.trim() || 'ponto-chave',
      color: body.color?.trim() || '#E09F4C',
      selectedText,
      textPrefix: body.textPrefix ?? null,
      textSuffix: body.textSuffix ?? null,
      audioTimeSeconds: Number.isFinite(audioTimeSeconds) ? audioTimeSeconds : null,
      note: body.note?.trim() || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const [created] = await db.insert(bookmarks).values(newBookmark).returning()

    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    console.error('[api/bookmarks][POST]', err)
    return NextResponse.json({ error: 'Erro ao salvar marcador.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    await ensureBookmarksTable()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')?.trim()

    if (!id) {
      return NextResponse.json({ error: 'Parâmetro id é obrigatório.' }, { status: 400 })
    }

    const [deleted] = await db
      .delete(bookmarks)
      .where(and(eq(bookmarks.id, id), eq(bookmarks.userId, user.id)))
      .returning()

    if (!deleted) {
      return NextResponse.json({ error: 'Marcador não encontrado.' }, { status: 404 })
    }

    return NextResponse.json({ success: true, id: deleted.id })
  } catch (err) {
    console.error('[api/bookmarks][DELETE]', err)
    return NextResponse.json({ error: 'Erro ao excluir marcador.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    await ensureBookmarksTable()

    let body: {
      id?: string
      title?: string | null
      note?: string | null
      category?: string | null
      color?: string | null
    }

    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Corpo da solicitação inválido.' }, { status: 400 })
    }

    const id = body.id?.trim()
    if (!id) {
      return NextResponse.json({ error: 'O ID do marcador é obrigatório.' }, { status: 400 })
    }

    const updates: {
      title?: string | null
      note?: string | null
      category?: string
      color?: string
      updatedAt: Date
    } = { updatedAt: new Date() }

    if (body.title !== undefined) updates.title = body.title?.trim() || null
    if (body.note !== undefined) updates.note = body.note?.trim() || null
    if (body.category) updates.category = body.category.trim()
    if (body.color) updates.color = body.color.trim()

    const [updated] = await db
      .update(bookmarks)
      .set(updates)
      .where(and(eq(bookmarks.id, id), eq(bookmarks.userId, user.id)))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Marcador não encontrado.' }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[api/bookmarks][PATCH]', err)
    return NextResponse.json({ error: 'Erro ao atualizar marcador.' }, { status: 500 })
  }
}
