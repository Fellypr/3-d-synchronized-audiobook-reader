import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { serveAudiobookFile } from '@/lib/storage'

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const pathname = new URL(request.url).searchParams.get('pathname')
  if (!pathname || !pathname.startsWith(`audiobooks/${session.user.id}/`)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    return await serveAudiobookFile(pathname, request)
  } catch (error) {
    console.error('[v0] Book file delivery failed:', error)
    return NextResponse.json({ error: 'File delivery failed' }, { status: 500 })
  }
}
