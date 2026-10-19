import { put, get } from '@vercel/blob'
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
  // If Vercel Blob token is provided, use Vercel Blob
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`${pathPrefix}.${extension}`, file, {
      access: 'private',
      addRandomSuffix: true,
    })
    return { pathname: blob.pathname }
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

  // Check if file exists locally first
  if (localPath.startsWith(path.resolve(STORAGE_DIR)) && fs.existsSync(localPath)) {
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
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const result = await get(pathname, { access: 'private' })
    if (!result) return new Response('Not found', { status: 404 })

    return new Response(result.stream, {
      headers: {
        'Content-Type': result.blob.contentType ?? 'application/octet-stream',
        'Cache-Control': 'private, no-cache',
        ETag: result.blob.etag,
        'Accept-Ranges': 'bytes',
      },
    })
  }

  return new Response('Not found', { status: 404 })
}
