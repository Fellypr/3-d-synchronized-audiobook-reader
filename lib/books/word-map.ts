export type WordMapEntry = { p: string; i: number; f: number }

export function isValidWordMap(value: unknown): value is WordMapEntry[] | { words: WordMapEntry[] } {
  const words = Array.isArray(value)
    ? value
    : value && typeof value === 'object' && 'words' in value && Array.isArray(value.words)
      ? value.words
      : null

  if (!words || words.length === 0) return false

  let previousStart = -1
  return words.every((entry) => {
    if (!entry || typeof entry !== 'object') return false
    const word = entry as Partial<WordMapEntry>
    const valid = typeof word.p === 'string'
      && word.p.trim().length > 0
      && Number.isFinite(word.i)
      && Number.isFinite(word.f)
      && Number(word.i) >= 0
      && Number(word.f) >= Number(word.i)
      && Number(word.i) >= previousStart

    if (valid) previousStart = Number(word.i)
    return valid
  })
}
