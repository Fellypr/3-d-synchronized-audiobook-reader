export type WordMapEntry = { p: string; i: number; f: number }

/**
 * Normaliza e sanitiza um mapa de palavras:
 * - Garante que p seja uma string limpa e não vazia.
 * - Garante que i e f sejam números finitos >= 0.
 * - Garante que f >= i.
 * - Corrige desvios milimétricos entre blocos de áudio (i < previousStart).
 * - Suporta formatos alternativos (palavra/inicio/fim, word/start/end).
 */
export function sanitizeWordMap(value: unknown): WordMapEntry[] | null {
  const rawWords = Array.isArray(value)
    ? value
    : value && typeof value === 'object' && 'words' in value && Array.isArray((value as any).words)
      ? (value as any).words
      : value && typeof value === 'object' && 'mapa' in value && Array.isArray((value as any).mapa)
        ? (value as any).mapa
        : null

  if (!rawWords || rawWords.length === 0) return null

  const cleaned: WordMapEntry[] = []
  let previousStart = 0

  for (const entry of rawWords) {
    if (!entry || typeof entry !== 'object') continue
    const raw = entry as Record<string, unknown>

    const rawWord = raw.p ?? raw.palavra ?? raw.word ?? raw.text
    if (typeof rawWord !== 'string') continue
    const p = rawWord.trim()
    if (!p) continue

    const rawStart = Number(raw.i ?? raw.inicio ?? raw.start)
    const rawEnd = Number(raw.f ?? raw.fim ?? raw.end)

    if (!Number.isFinite(rawStart) || !Number.isFinite(rawEnd)) continue

    let i = Math.max(0, rawStart)
    // Se o início veio menor que o anterior (ex: junção de lotes do TTS ou drift de áudio), ajusta
    if (i < previousStart) {
      i = previousStart
    }

    let f = Math.max(i, rawEnd)

    // Arredonda para 3 casas decimais
    i = Math.round(i * 1000) / 1000
    f = Math.round(f * 1000) / 1000

    previousStart = i
    cleaned.push({ p, i, f })
  }

  return cleaned.length > 0 ? cleaned : null
}

export function isValidWordMap(value: unknown): value is WordMapEntry[] | { words: WordMapEntry[] } {
  return sanitizeWordMap(value) !== null
}
