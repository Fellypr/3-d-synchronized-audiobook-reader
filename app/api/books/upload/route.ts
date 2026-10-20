import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[upload] BLOB_READ_WRITE_TOKEN não configurado em produção')
    } else {
      console.warn('[upload] BLOB_READ_WRITE_TOKEN ausente localmente. O sistema utilizará o armazenamento local.')
    }
    return NextResponse.json(
      {
        error:
          'O Vercel Blob não está configurado neste ambiente (BLOB_READ_WRITE_TOKEN ausente).',
        directUploadDisabled: true,
      },
      { status: 503 },
    )
  }

  let body: HandleUploadBody
  try {
    body = (await request.json()) as HandleUploadBody
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 })
  }

  // Only authenticate when generating the client token from user browser
  // When body.type is blob.upload-completed, it is a server-to-server webhook from Vercel without cookies
  let sessionUser: { id: string } | null = null
  if (body.type === 'blob.generate-client-token') {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado. Faça login novamente.' }, { status: 401 })
    }
    sessionUser = session.user
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        return {
          addRandomSuffix: true,
          maximumSizeInBytes: 500 * 1024 * 1024, // 500 MB
          tokenPayload: sessionUser ? JSON.stringify({ userId: sessionUser.id }) : undefined,
        }
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('[upload] Direct client upload finished:', blob.pathname)
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    console.error('[upload] Token generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha ao gerar token de upload direto.' },
      { status: 400 },
    )
  }
}
