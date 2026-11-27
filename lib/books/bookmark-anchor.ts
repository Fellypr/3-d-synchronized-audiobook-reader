import type { BookIndexItem } from '@/types/book-index'

type WordItem = { p: string; i?: number; f?: number }

export interface TextAnchor {
  selectedText: string
  textPrefix: string
  textSuffix: string
}

/**
 * Limpa o texto da palavra removendo quebras de linha e pontuações excessivas para âncora limpa.
 */
function cleanWordText(word: WordItem | undefined): string {
  if (!word || !word.p) return ''
  return word.p.replace(/\r?\n+/g, ' ').trim()
}

/**
 * Gera selectedText (3-5 palavras), textPrefix (~40 chars) e textSuffix (~40 chars)
 * a partir de words e wordIndex.
 */
export function extractTextAnchor(words: WordItem[], wordIndex: number): TextAnchor {
  if (!words || words.length === 0) {
    return {
      selectedText: '',
      textPrefix: '',
      textSuffix: '',
    }
  }

  const safeIndex = Math.max(0, Math.min(words.length - 1, wordIndex))

  // Seleciona de 3 a 5 palavras a partir do safeIndex
  const wordCount = Math.min(4, words.length - safeIndex)
  const selectedWordsList: string[] = []
  for (let i = 0; i < wordCount; i++) {
    const text = cleanWordText(words[safeIndex + i])
    if (text) {
      selectedWordsList.push(text)
    }
  }
  const selectedText = selectedWordsList.join(' ').trim() || cleanWordText(words[safeIndex]) || 'Marcação'

  // Monta textPrefix (~40 caracteres anteriores)
  const prefixWords: string[] = []
  let prefixChars = 0
  for (let i = safeIndex - 1; i >= 0 && prefixChars < 40; i--) {
    const text = cleanWordText(words[i])
    if (text) {
      prefixWords.unshift(text)
      prefixChars += text.length + 1
    }
  }
  let textPrefix = prefixWords.join(' ').trim()
  if (textPrefix.length > 50) {
    textPrefix = textPrefix.slice(-50).trim()
  }

  // Monta textSuffix (~40 caracteres posteriores)
  const suffixWords: string[] = []
  let suffixChars = 0
  for (let i = safeIndex + wordCount; i < words.length && suffixChars < 40; i++) {
    const text = cleanWordText(words[i])
    if (text) {
      suffixWords.push(text)
      suffixChars += text.length + 1
    }
  }
  let textSuffix = suffixWords.join(' ').trim()
  if (textSuffix.length > 50) {
    textSuffix = textSuffix.slice(0, 50).trim()
  }

  return {
    selectedText,
    textPrefix,
    textSuffix,
  }
}

/**
 * Extrai selectedText, textPrefix e textSuffix para um intervalo de palavras [startIndex..endIndex]
 * selecionado por arraste do mouse.
 */
export function extractRangeAnchor(
  words: WordItem[],
  startIndex: number,
  endIndex: number
): TextAnchor {
  if (!words || words.length === 0) {
    return { selectedText: '', textPrefix: '', textSuffix: '' }
  }

  const minIdx = Math.max(0, Math.min(words.length - 1, Math.min(startIndex, endIndex)))
  const maxIdx = Math.max(minIdx, Math.min(words.length - 1, Math.max(startIndex, endIndex)))

  const selectedWordsList: string[] = []
  for (let i = minIdx; i <= maxIdx; i++) {
    const text = cleanWordText(words[i])
    if (text) selectedWordsList.push(text)
  }
  const selectedText = selectedWordsList.join(' ').trim() || cleanWordText(words[minIdx]) || 'Trecho destacado'

  const prefixWords: string[] = []
  let prefixChars = 0
  for (let i = minIdx - 1; i >= 0 && prefixChars < 40; i--) {
    const text = cleanWordText(words[i])
    if (text) {
      prefixWords.unshift(text)
      prefixChars += text.length + 1
    }
  }
  const textPrefix = prefixWords.join(' ').trim().slice(-50).trim()

  const suffixWords: string[] = []
  let suffixChars = 0
  for (let i = maxIdx + 1; i < words.length && suffixChars < 40; i++) {
    const text = cleanWordText(words[i])
    if (text) {
      suffixWords.push(text)
      suffixChars += text.length + 1
    }
  }
  const textSuffix = suffixWords.join(' ').trim().slice(0, 50).trim()

  return { selectedText, textPrefix, textSuffix }
}

/**
 * Localiza o wordIndex exato comparando selectedText e contexto (prefix/suffix),
 * com fallback para bookmark.wordIndex se não encontrar correspondência ou se words estiver vazio.
 */
export function resolveBookmarkWordIndex(
  words: WordItem[],
  bookmark: {
    wordIndex: number
    selectedText?: string | null
    textPrefix?: string | null
    textSuffix?: string | null
  }
): number {
  if (!words || words.length === 0) {
    return bookmark.wordIndex ?? 0
  }

  const fallbackIndex = Math.max(0, Math.min(words.length - 1, bookmark.wordIndex ?? 0))
  const targetText = bookmark.selectedText?.trim().toLowerCase()

  if (!targetText) {
    return fallbackIndex
  }

  const cleanWords = words.map((w) => cleanWordText(w).toLowerCase())
  const targetWords = targetText.split(/\s+/).filter(Boolean)

  if (targetWords.length === 0) {
    return fallbackIndex
  }

  // 1. Tentar encontrar a sequência próxima ao fallbackIndex (janela de +/- 60 palavras)
  const windowRadius = 60
  const searchStart = Math.max(0, fallbackIndex - windowRadius)
  const searchEnd = Math.min(words.length, fallbackIndex + windowRadius + 1)

  for (let i = searchStart; i < searchEnd; i++) {
    let match = true
    for (let j = 0; j < targetWords.length; j++) {
      if (cleanWords[i + j] !== targetWords[j]) {
        match = false
        break
      }
    }
    if (match) {
      return i
    }
  }

  // 2. Busca global pela sequência caso tenha ocorrido reindexação drástica
  for (let i = 0; i < words.length; i++) {
    let match = true
    for (let j = 0; j < targetWords.length; j++) {
      if (cleanWords[i + j] !== targetWords[j]) {
        match = false
        break
      }
    }
    if (match) {
      return i
    }
  }

  // 3. Fallback: buscar apenas a primeira palavra alvo mais próxima do fallbackIndex
  const firstWord = targetWords[0]
  let bestCandidate = fallbackIndex
  let minDistance = Infinity

  for (let i = searchStart; i < searchEnd; i++) {
    if (cleanWords[i] === firstWord) {
      const dist = Math.abs(i - fallbackIndex)
      if (dist < minDistance) {
        minDistance = dist
        bestCandidate = i
      }
    }
  }

  if (minDistance !== Infinity) {
    return bestCandidate
  }

  return fallbackIndex
}

/**
 * Identifica o capítulo e seção ativos com base no pageNumber e outlineItems.
 */
export function findActiveChapterAndSection(
  outlineItems: BookIndexItem[],
  pageNumber: number
): { chapter: string | null; section: string | null } {
  if (!outlineItems || outlineItems.length === 0 || !pageNumber || pageNumber <= 0) {
    return { chapter: null, section: null }
  }

  let activeChapter: BookIndexItem | null = null
  let activeSection: BookIndexItem | null = null

  for (let i = 0; i < outlineItems.length; i++) {
    const cur = outlineItems[i]
    const next = outlineItems[i + 1]
    const nextStart = next ? next.pageNumber : Infinity

    if (pageNumber >= cur.pageNumber && pageNumber < nextStart) {
      activeChapter = cur

      // Procurar dentro de subitens (seções) se houver
      if (cur.items && cur.items.length > 0) {
        for (let j = 0; j < cur.items.length; j++) {
          const sub = cur.items[j]
          const nextSub = cur.items[j + 1]
          const nextSubStart = nextSub ? nextSub.pageNumber : nextStart

          if (pageNumber >= sub.pageNumber && pageNumber < nextSubStart) {
            activeSection = sub
            break
          }
        }
      }
      break
    }
  }

  return {
    chapter: activeChapter ? activeChapter.title : null,
    section: activeSection ? activeSection.title : null,
  }
}
