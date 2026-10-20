import { put } from '@vercel/blob'
import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const STORAGE_DIR = path.join(process.cwd(), '.storage')

async function getAllFiles(dir, base = '') {
  let results = []
  const list = await fsPromises.readdir(dir, { withFileTypes: true })
  for (const file of list) {
    const fullPath = path.join(dir, file.name)
    const relPath = base ? `${base}/${file.name}` : file.name
    if (file.isDirectory()) {
      results = results.concat(await getAllFiles(fullPath, relPath))
    } else if (!file.name.endsWith('.meta')) {
      results.push({ fullPath, relPath })
    }
  }
  return results
}

async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    console.error('❌ ERRO: BLOB_READ_WRITE_TOKEN não foi encontrado no arquivo .env.local')
    console.log('👉 Adicione o BLOB_READ_WRITE_TOKEN no seu .env.local antes de executar este script.')
    process.exit(1)
  }

  if (!fs.existsSync(STORAGE_DIR)) {
    console.log('ℹ️ Nenhuma pasta .storage encontrada.')
    return
  }

  const files = await getAllFiles(STORAGE_DIR)
  if (files.length === 0) {
    console.log('ℹ️ Nenhum arquivo encontrado em .storage para sincronizar.')
    return
  }

  console.log(`📦 Encontrados ${files.length} arquivo(s) locais em .storage para enviar ao Vercel Blob:\n`)

  for (const { fullPath, relPath } of files) {
    const stat = await fsPromises.stat(fullPath)
    const sizeMb = (stat.size / (1024 * 1024)).toFixed(2)
    console.log(`⬆️ Enviando ${relPath} (${sizeMb} MB)...`)

    let contentType = relPath.endsWith('.json') ? 'application/json' : 'audio/mpeg'
    const metaPath = `${fullPath}.meta`
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(await fsPromises.readFile(metaPath, 'utf-8'))
        if (meta.contentType) contentType = meta.contentType
      } catch {}
    }

    const fileBuffer = await fsPromises.readFile(fullPath)
    let blob
    try {
      blob = await put(relPath, fileBuffer, {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType,
        token,
      })
    } catch (putErr) {
      const msg = putErr?.message || String(putErr)
      if (msg.includes('private') || msg.includes('access mode')) {
        blob = await put(relPath, fileBuffer, {
          access: 'private',
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType,
          token,
        })
      } else {
        throw putErr
      }
    }

    console.log(`✅ Sucesso! Pathname: ${blob.pathname}`)
  }

  console.log('\n🎉 Todos os arquivos locais foram sincronizados com sucesso no Vercel Blob!')
}

main().catch((err) => {
  console.error('❌ Erro durante a sincronização:', err)
  process.exit(1)
})
