import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const TARGET_API_URL = (
  process.env.AUDIOBOOK_API_URL ||
  process.env.NEXT_PUBLIC_AUDIOBOOK_API_URL ||
  'http://147.15.26.202'
).replace(/\/+$/, '')

async function handleProxy(request: NextRequest, pathSegments?: string[]) {
  const path = pathSegments && pathSegments.length > 0 ? pathSegments.join('/') : ''
  const search = request.nextUrl.search
  // Se o endpoint tiver barra final ou não, respeita o path original
  const hasTrailingSlash = request.nextUrl.pathname.endsWith('/')
  const targetUrl = `${TARGET_API_URL}/${path}${hasTrailingSlash && path ? '/' : ''}${search}`

  const requestHeaders = new Headers()
  request.headers.forEach((val, key) => {
    const lowerKey = key.toLowerCase()
    // Filtra headers de salto e de transporte para não conflitar com a requisição do Node
    if (
      lowerKey !== 'host' &&
      lowerKey !== 'connection' &&
      lowerKey !== 'content-length' &&
      lowerKey !== 'transfer-encoding'
    ) {
      requestHeaders.set(key, val)
    }
  })

  const fetchOptions: RequestInit & { duplex?: string } = {
    method: request.method,
    headers: requestHeaders,
    redirect: 'follow',
  }

  // Para POST e uploads (multipart/form-data):
  // Buffera os bytes completamente em memória para calcular o Content-Length exato.
  // Isso evita erros de 'chunked stream desync' e 'fetch failed' típicos do undici no Node.js.
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      const arrayBuffer = await request.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      fetchOptions.body = buffer
      requestHeaders.set('content-length', String(buffer.length))
    } catch (readErr: any) {
      console.error('[AudiobookProxy Error] Falha ao ler corpo da requisição:', readErr)
      return NextResponse.json(
        { detail: `Falha ao receber o arquivo no servidor: ${readErr?.message || String(readErr)}` },
        { status: 400 }
      )
    }
  }

  try {
    const res = await fetch(targetUrl, fetchOptions)

    const responseHeaders = new Headers()
    res.headers.forEach((val, key) => {
      const lowerKey = key.toLowerCase()
      // Não propagar encoding se o payload já foi tratado
      if (lowerKey !== 'content-encoding') {
        responseHeaders.set(key, val)
      }
    })

    // Garante que SSE (Server-Sent Events) não seja armazenado em cache ou bufferizado
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('text/event-stream')) {
      responseHeaders.set('Cache-Control', 'no-cache, no-transform')
      responseHeaders.set('Connection', 'keep-alive')
      responseHeaders.set('X-Accel-Buffering', 'no')
      responseHeaders.delete('content-length')
    }

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    })
  } catch (err: any) {
    const causeMsg = err?.cause?.message || err?.cause?.code || (err?.cause ? String(err.cause) : '')
    const fullMsg = causeMsg ? `${err.message} (${causeMsg})` : err?.message || String(err)
    console.error(`[AudiobookProxy Error] Falha ao comunicar com ${targetUrl}:`, fullMsg, err)
    return NextResponse.json(
      {
        detail: `Falha de conexão com a API de Audiolivros: ${fullMsg}. Verifique se o servidor remoto está ativo em ${TARGET_API_URL}`,
      },
      { status: 502 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const resolvedParams = await params
  return handleProxy(request, resolvedParams?.path)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const resolvedParams = await params
  return handleProxy(request, resolvedParams?.path)
}

export async function OPTIONS(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const resolvedParams = await params
  return handleProxy(request, resolvedParams?.path)
}
