import { put, get, del } from '@vercel/blob'
import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { Readable } from 'node:stream'

const STORAGE_DIR = path.join(process.cwd(), '.storage')

export async function saveAudiobookFile(
  pathPrefix: string,
  extension: 'audio' | 'json',
  file: File
): Promise<{ pathname: string }> {
  console.log('[storage] saveAudiobookFile called:', {
    pathPrefix,
    extension,
    fileName: file.name,
    fileSize: file.size,
    hasBlobToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
  })

  // If Vercel Blob token is provided, use Vercel Blob
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      console.log(`[storage] Uploading to Vercel Blob: ${pathPrefix}.${extension}`)
      let blob
      try {
        blob = await put(`${pathPrefix}.${extension}`, file, {
          access: 'private',
          addRandomSuffix: true,
        })
      } catch (privErr: any) {
        const msg = privErr?.message || String(privErr)
        if (msg.includes('public') || msg.includes('access mode') || privErr?.name === 'BlobAccessError') {
          blob = await put(`${pathPrefix}.${extension}`, file, {
            access: 'public',
            addRandomSuffix: true,
          })
        } else {
          throw privErr
        }
      }
      console.log('[storage] Vercel Blob upload success:', { pathname: blob.pathname, url: blob.url })
      return { pathname: blob.pathname }
    } catch (uploadError) {
      console.error('[storage] Vercel Blob upload failed:', uploadError)
      throw uploadError
    }
  }

  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    throw new Error('BLOB_READ_WRITE_TOKEN não está configurado na Vercel. Configure o Vercel Blob para permitir uploads em produção.')
  }

  // Local filesystem fallback when developing locally without Vercel credentials
  const suffix = randomBytes(8).toString('hex')
  const pathname = `${pathPrefix}-${suffix}.${extension}`
  const fullPath = path.resolve(STORAGE_DIR, pathname)

  // Security guard against path traversal
  if (!fullPath.startsWith(path.resolve(STORAGE_DIR))) {
    throw new Error('Invalid path')
  }

  await fsPromises.mkdir(path.dirname(fullPath), { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  await fsPromises.writeFile(fullPath, buffer)

  // Save metadata with original MIME content-type
  const metaPath = `${fullPath}.meta`
  const meta = {
    contentType: file.type || (extension === 'json' ? 'application/json' : 'audio/mpeg'),
  }
  await fsPromises.writeFile(metaPath, JSON.stringify(meta), 'utf-8')

  return { pathname }
}

export async function serveAudiobookFile(pathname: string, request: Request): Promise<Response> {
  const localPath = path.resolve(STORAGE_DIR, pathname)
  const localExists = localPath.startsWith(path.resolve(STORAGE_DIR)) && fs.existsSync(localPath)
  const hasBlobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN)

  console.log('[storage] serveAudiobookFile called:', {
    pathname,
    localExists,
    hasBlobToken,
    blobTokenPrefix: process.env.BLOB_READ_WRITE_TOKEN
      ? `${process.env.BLOB_READ_WRITE_TOKEN.slice(0, 15)}...`
      : 'NONE',
  })

  // Check if file exists locally first
  if (localExists) {
    console.log('[storage] Serving file from local disk:', localPath)
    const stat = await fsPromises.stat(localPath)
    const fileSize = stat.size

    let contentType = pathname.endsWith('.json') ? 'application/json' : 'audio/mpeg'
    const metaPath = `${localPath}.meta`
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(await fsPromises.readFile(metaPath, 'utf-8'))
        if (meta.contentType) contentType = meta.contentType
      } catch {}
    }

    const range = request.headers.get('range')
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1

      if (isNaN(start) || start >= fileSize || end >= fileSize || start > end) {
        return new Response('Requested range not satisfiable', {
          status: 416,
          headers: {
            'Content-Range': `bytes */${fileSize}`,
          },
        })
      }

      const chunkSize = end - start + 1
      const stream = fs.createReadStream(localPath, { start, end })
      const webStream = Readable.toWeb(stream) as ReadableStream

      return new Response(webStream, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunkSize),
          'Content-Type': contentType,
          'Cache-Control': 'private, no-cache',
        },
      })
    }

    const stream = fs.createReadStream(localPath)
    const webStream = Readable.toWeb(stream) as ReadableStream

    return new Response(webStream, {
      status: 200,
      headers: {
        'Content-Length': String(fileSize),
        'Accept-Ranges': 'bytes',
        'Content-Type': contentType,
        'Cache-Control': 'private, no-cache',
      },
    })
  }

  // Fallback to Vercel Blob if credentials are provided
  if (hasBlobToken) {
    console.log('[storage] Querying Vercel Blob for pathname:', pathname)
    try {
      const range = request.headers.get('range')
      const ifNoneMatch = request.headers.get('if-none-match') || undefined

      let result: any = null
      try {
        result = await get(pathname, {
          access: 'private',
          ifNoneMatch,
          headers: range ? { range } : undefined,
        })
      } catch (privErr: any) {
        const msg = privErr?.message || String(privErr)
        if (msg.includes('public') || msg.includes('access mode') || privErr?.name === 'BlobAccessError') {
          result = await get(pathname, {
            access: 'public',
            ifNoneMatch,
            headers: range ? { range } : undefined,
          })
        } else {
          throw privErr
        }
      }

      if (!result) {
        console.warn('[storage] Vercel Blob: get returned null (blob not found) for:', pathname)
        return new Response(JSON.stringify({
          error: 'Not found in Vercel Blob',
          pathname,
          hint: 'O arquivo não foi encontrado no Vercel Blob. Pode ser necessário sincronizar ou reenviar o livro.',
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      console.log('[storage] Vercel Blob: file found successfully:', {
        pathname,
        contentType: result.blob.contentType,
        size: result.blob.size,
      })

      if (result.statusCode === 304) {
        return new Response(null, {
          status: 304,
          headers: {
            ETag: result.blob.etag,
            'Cache-Control': 'private, no-cache',
          },
        })
      }

      const headers: Record<string, string> = {
        'Content-Type': result.blob.contentType ?? (pathname.endsWith('.json') ? 'application/json' : 'audio/mpeg'),
        'Cache-Control': 'private, no-cache',
        ETag: result.blob.etag,
        'Accept-Ranges': 'bytes',
      }

      const contentRange = result.headers.get('content-range')
      const contentLength = result.headers.get('content-length')
      if (contentRange) headers['Content-Range'] = contentRange
      if (contentLength) headers['Content-Length'] = contentLength

      const isPartial = Boolean(range && contentRange)

      return new Response(result.stream, {
        status: isPartial ? 206 : 200,
        headers,
      })
    } catch (blobError) {
      console.error('[storage] Vercel Blob get error:', blobError)
      return new Response(JSON.stringify({
        error: 'Vercel Blob query failed',
        details: blobError instanceof Error ? blobError.message : String(blobError),
        pathname,
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  console.warn('[storage] File not found and no Vercel Blob token configured:', {
    pathname,
    localExists,
    hasBlobToken,
  })

  return new Response(JSON.stringify({
    error: 'Not found',
    pathname,
    localExists,
    hasBlobToken,
    message: hasBlobToken
      ? 'Arquivo não encontrado no disco local nem no Vercel Blob.'
      : 'BLOB_READ_WRITE_TOKEN não está definido nas variáveis de ambiente da Vercel e o arquivo não existe localmente.',
  }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function deleteAudiobookFiles(audioUrl?: string | null, jsonUrl?: string | null): Promise<void> {
  const paths = [audioUrl, jsonUrl].filter(Boolean) as string[]
  if (paths.length === 0) return

  // 1. Delete from local filesystem if exists
  for (const pathname of paths) {
    try {
      const localPath = path.resolve(STORAGE_DIR, pathname)
      if (localPath.startsWith(path.resolve(STORAGE_DIR)) && fs.existsSync(localPath)) {
        await fsPromises.unlink(localPath)
        const metaPath = `${localPath}.meta`
        if (fs.existsSync(metaPath)) {
          await fsPromises.unlink(metaPath).catch(() => {})
        }
        console.log('[storage] Deleted local file:', localPath)
      }
    } catch (err) {
      console.warn('[storage] Failed to delete local file:', pathname, err)
    }
  }

  // 2. Delete from Vercel Blob if token is available
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      console.log('[storage] Deleting files from Vercel Blob:', paths)
      await del(paths)
      console.log('[storage] Vercel Blob deletion succeeded for:', paths)
    } catch (err) {
      console.warn('[storage] Failed to delete from Vercel Blob:', paths, err)
    }
  }
}

