import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import os from 'os'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const TARGET_API_URL = (
  process.env.AUDIOBOOK_API_URL ||
  process.env.NEXT_PUBLIC_AUDIOBOOK_API_URL ||
  'http://147.15.26.202'
).replace(/\/+$/, '')

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const uploadId = (formData.get('upload_id') as string)?.trim()
    const chunkIndexStr = formData.get('chunk_index') as string
    const totalChunksStr = formData.get('total_chunks') as string
    const filename = (formData.get('filename') as string) || 'documento.pdf'
    const chunkData = formData.get('chunk') as Blob | File | null

    if (!uploadId || chunkIndexStr === null || totalChunksStr === null || !chunkData) {
      return NextResponse.json(
        { detail: 'Campos upload_id, chunk_index, total_chunks e chunk são obrigatórios.' },
        { status: 400 }
      )
    }

    const chunkIndex = parseInt(chunkIndexStr, 10)
    const totalChunks = parseInt(totalChunksStr, 10)

    if (isNaN(chunkIndex) || isNaN(totalChunks) || totalChunks <= 0 || chunkIndex < 0 || chunkIndex >= totalChunks) {
      return NextResponse.json({ detail: 'Índices de fatias inválidos.' }, { status: 400 })
    }

    // Diretório temporário dedicado para este upload
    // os.tmpdir() é seguro e disponível em qualquer ambiente Node / Linux / Vercel
    const sanitizedId = uploadId.replace(/[^a-zA-Z0-9_-]/g, '')
    const uploadDir = path.join(os.tmpdir(), 'auditeca_chunks', sanitizedId)
    await fs.promises.mkdir(uploadDir, { recursive: true })

    // Salva o chunk recebido no disco
    const chunkPath = path.join(uploadDir, `chunk_${chunkIndex}.part`)
    const arrayBuf = await chunkData.arrayBuffer()
    await fs.promises.writeFile(chunkPath, Buffer.from(arrayBuf))

    // Confere se todos os chunks (0 a totalChunks - 1) já foram recebidos
    let allChunksPresent = true
    for (let i = 0; i < totalChunks; i++) {
      const p = path.join(uploadDir, `chunk_${i}.part`)
      try {
        await fs.promises.access(p, fs.constants.F_OK)
      } catch {
        allChunksPresent = false
        break
      }
    }

    // Se ainda faltam fatias, apenas confirma o recebimento
    if (!allChunksPresent) {
      return NextResponse.json({
        success: true,
        chunk_index: chunkIndex,
        total_chunks: totalChunks,
        complete: false,
      })
    }

    // ─────────────────────────────────────────────────────────────
    // TODAS AS FATIAS RECEBIDAS! REMONTAGEM CONSOLIDADA
    // ─────────────────────────────────────────────────────────────
    console.log(`[ChunkProxy] Todas as ${totalChunks} fatias recebidas para ${sanitizedId}. Remontando arquivo ${filename}...`)

    const buffers: Buffer[] = []
    for (let i = 0; i < totalChunks; i++) {
      const p = path.join(uploadDir, `chunk_${i}.part`)
      const partBuf = await fs.promises.readFile(p)
      buffers.push(partBuf)
    }
    const fullBuffer = Buffer.concat(buffers)
    console.log(`[ChunkProxy] Arquivo ${filename} consolidado com sucesso (${(fullBuffer.length / (1024 * 1024)).toFixed(2)} MB). Enviando para API...`)

    // Monta o FormData completo para repassar à VPS da Oracle (ou servidor local)
    const targetFormData = new FormData()
    const mimeType = filename.toLowerCase().endsWith('.docx')
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : 'application/pdf'

    targetFormData.append('file', new Blob([fullBuffer], { type: mimeType }), filename)
    targetFormData.append('voz', (formData.get('voz') as string) || 'pt-BR-AntonioNeural')
    targetFormData.append('rate', (formData.get('rate') as string) || '+0%')
    targetFormData.append('pitch', (formData.get('pitch') as string) || '-5Hz')
    targetFormData.append('retornar_mapa_inline', 'true')

    const termo = formData.get('termo_cabecalho') as string
    if (termo?.trim()) targetFormData.append('termo_cabecalho', termo.trim())
    const pIni = formData.get('pagina_inicial') as string
    if (pIni?.trim()) targetFormData.append('pagina_inicial', pIni.trim())
    const pFim = formData.get('pagina_final') as string
    if (pFim?.trim()) targetFormData.append('pagina_final', pFim.trim())

    // Envia o arquivo completo server-to-server para a VPS
    const targetUrl = `${TARGET_API_URL}/processar-livro/`
    const vpsResponse = await fetch(targetUrl, {
      method: 'POST',
      body: targetFormData,
    })

    // Limpa a pasta temporária dos chunks em background para não ocupar espaço
    void fs.promises.rm(uploadDir, { recursive: true, force: true }).catch(() => {})

    if (!vpsResponse.ok) {
      let errorMsg = `Erro na API remota: ${vpsResponse.status} ${vpsResponse.statusText}`
      try {
        const errJson = await vpsResponse.json()
        if (errJson?.detail) errorMsg = errJson.detail
        else if (errJson?.mensagem) errorMsg = errJson.mensagem
        else if (errJson?.error) errorMsg = errJson.error
      } catch {}
      return NextResponse.json({ detail: errorMsg }, { status: vpsResponse.status })
    }

    const jobData = await vpsResponse.json()
    return NextResponse.json({
      success: true,
      complete: true,
      ...jobData,
    })
  } catch (err: any) {
    console.error('[ChunkProxy Error] Falha no processamento de fatia:', err)
    return NextResponse.json(
      { detail: `Falha no upload fragmentado: ${err?.message || String(err)}` },
      { status: 500 }
    )
  }
}
