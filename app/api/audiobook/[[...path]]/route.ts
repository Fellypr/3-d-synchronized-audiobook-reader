import { NextRequest, NextResponse } from 'next/server'

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
    if (lowerKey !== 'host' && lowerKey !== 'connection' && lowerKey !== 'content-length') {
      requestHeaders.set(key, val)
    }
  })

  const fetchOptions: RequestInit & { duplex?: string } = {
    method: request.method,
    headers: requestHeaders,
    redirect: 'follow',
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    fetchOptions.body = request.body
    fetchOptions.duplex = 'half'
  }

  try {
    const res = await fetch(targetUrl, fetchOptions)

    const responseHeaders = new Headers()
    res.headers.forEach((val, key) => {
      const lowerKey = key.toLowerCase()
      // Não propagar encoding ou content-length alterados se o stream foi decodificado
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
    }

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    })
  } catch (err: any) {
    console.error(`[AudiobookProxy Error] Falha ao comunicar com ${targetUrl}:`, err)
    return NextResponse.json(
      {
        detail: `Falha de conexão com a API de Audiolivros: ${err?.message || String(err)}. Verifique se o servidor remoto está ativo em ${TARGET_API_URL}`,
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
