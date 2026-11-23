import { NextRequest, NextResponse } from 'next/server'
import { del, get } from '@vercel/blob'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const TARGET_API_URL = (
  process.env.AUDIOBOOK_API_URL ||
  process.env.NEXT_PUBLIC_AUDIOBOOK_API_URL ||
  'http://147.15.26.202'
).replace(/\/+$/, '')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      blobUrl,
      filename = 'documento.pdf',
      voz = 'pt-BR-AntonioNeural',
      rate = '+0%',
      pitch = '-5Hz',
      termoCabecalho,
      paginaInicial,
      paginaFinal,
    } = body

    if (!blobUrl || typeof blobUrl !== 'string') {
      return NextResponse.json({ detail: 'Parâmetro blobUrl é obrigatório.' }, { status: 400 })
    }

    console.log(`[RelayBlob] Baixando arquivo ${filename} do Vercel Blob: ${blobUrl}...`)

    // 1. Baixa o arquivo do Vercel Blob para a memória do servidor
    let fileBuffer: Buffer | null = null

    // Tentativa 1: Download direto (se for público)
    try {
      const directRes = await fetch(blobUrl)
      if (directRes.ok) {
        fileBuffer = Buffer.from(await directRes.arrayBuffer())
      }
    } catch (fetchErr) {
      console.warn('[RelayBlob] Download direto sem token falhou, tentando com token...', fetchErr)
    }

    // Tentativa 2: Download com token de autorização
    if (!fileBuffer && process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const authRes = await fetch(blobUrl, {
          headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
        })
        if (authRes.ok) {
          fileBuffer = Buffer.from(await authRes.arrayBuffer())
        }
      } catch (authErr) {
        console.warn('[RelayBlob] Download com token falhou, tentando via SDK...', authErr)
      }
    }

    // Tentativa 3: Usando o SDK @vercel/blob
    if (!fileBuffer) {
      try {
        const token = process.env.BLOB_READ_WRITE_TOKEN
        const blobInfo =
          (await get(blobUrl, { access: 'private', token }).catch(() => null)) ||
          (await get(blobUrl, { access: 'public', token }).catch(() => null))

        if (blobInfo?.stream) {
          const reader = blobInfo.stream.getReader()
          const chunks: Uint8Array[] = []
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            if (value) chunks.push(value)
          }
          fileBuffer = Buffer.concat(chunks)
        }
      } catch (sdkErr) {
        console.error('[RelayBlob] Falha ao baixar via SDK @vercel/blob:', sdkErr)
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json(
        { detail: 'Não foi possível baixar o documento armazenado no Vercel Blob.' },
        { status: 502 }
      )
    }

    const fileSizeMb = (fileBuffer.length / (1024 * 1024)).toFixed(2)
    console.log(`[RelayBlob] Documento ${filename} (${fileSizeMb} MB) obtido com sucesso. Enviando para a VPS (${TARGET_API_URL})...`)

    // 2. Monta o FormData multipart para enviar à API de Audiolivros
    const targetFormData = new FormData()
    const mimeType = filename.toLowerCase().endsWith('.docx')
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : 'application/pdf'

    targetFormData.append('file', new Blob([fileBuffer], { type: mimeType }), filename)
    targetFormData.append('voz', voz)
    targetFormData.append('rate', rate)
    targetFormData.append('pitch', pitch)
    targetFormData.append('retornar_mapa_inline', 'true')

    if (termoCabecalho?.trim()) targetFormData.append('termo_cabecalho', termoCabecalho.trim())
    if (paginaInicial) targetFormData.append('pagina_inicial', String(paginaInicial))
    if (paginaFinal) targetFormData.append('pagina_final', String(paginaFinal))

    // 3. Envia o arquivo completo server-to-server para a VPS
    const targetUrl = `${TARGET_API_URL}/processar-livro/`
    const vpsResponse = await fetch(targetUrl, {
      method: 'POST',
      body: targetFormData,
    })

    // 4. Limpeza: apaga o arquivo temporário do Vercel Blob em segundo plano
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      void del(blobUrl).catch((delErr) => {
        console.warn('[RelayBlob] Aviso ao limpar arquivo temporário do Blob:', delErr)
      })
    }

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
    console.log(`[RelayBlob] Livro ${filename} iniciado na VPS com sucesso! Job ID: ${jobData.job_id}`)

    return NextResponse.json({
      success: true,
      ...jobData,
    })
  } catch (err: any) {
    console.error('[RelayBlob Error] Falha ao processar relay via Blob:', err)
    return NextResponse.json(
      { detail: `Falha no encaminhamento via Blob: ${err?.message || String(err)}` },
      { status: 500 }
    )
  }
}
