import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autorizado. Faça login novamente.' }, { status: 401 })
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('[upload] BLOB_READ_WRITE_TOKEN não configurado')
    return NextResponse.json(
      {
        error:
          'O Vercel Blob não está configurado neste ambiente (BLOB_READ_WRITE_TOKEN ausente). Acesse o painel da Vercel (Project > Storage > Blob) para criar o repositório e vincular ao projeto.',
      },
      { status: 500 },
    )
  }

  let body: HandleUploadBody
  try {
    body = (await request.json()) as HandleUploadBody
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 })
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        return {
          addRandomSuffix: true,
          maximumSizeInBytes: 500 * 1024 * 1024, // 500 MB
          tokenPayload: JSON.stringify({ userId: session.user.id }),
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
