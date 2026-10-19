import type { audiobookProgress, book } from '@/lib/db/schema'
import type { InferSelectModel } from 'drizzle-orm'

export type BookRecord = InferSelectModel<typeof book>
export type ProgressRecord = InferSelectModel<typeof audiobookProgress>

export type DashboardBook = BookRecord & {
  currentTime: number
  listenedSeconds: number
  progressPercent: number | null
  lastReadAt: Date | null
}

export type BookReadingState = 'not-started' | 'in-progress' | 'completed'

export function getProgressPercent(currentTime: number, durationSeconds: number | null | undefined) {
  if (!Number.isFinite(durationSeconds) || !durationSeconds || durationSeconds <= 0) return null
  return Math.min(100, Math.max(0, Math.round((currentTime / durationSeconds) * 100)))
}

export function getBookReadingState(book: Pick<DashboardBook, 'currentTime' | 'durationSeconds'>): BookReadingState {
  if (book.currentTime <= 0) return 'not-started'
  if (book.durationSeconds && book.currentTime >= book.durationSeconds) return 'completed'
  return 'in-progress'
}

export function formatPosition(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const remainder = safeSeconds % 60

  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
  return `${minutes}:${String(remainder).padStart(2, '0')}`
}

export function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const remainder = safeSeconds % 60

  if (hours > 0 && minutes > 0) return `${hours} h ${minutes} min`
  if (hours > 0) return `${hours} h`
  if (minutes > 0) return `${minutes} min`
  return `${remainder} s`
}

export function formatBookCount(count: number) {
  return `${count} ${count === 1 ? 'livro' : 'livros'}`
}

export function buildDashboardBooks(books: BookRecord[], progress: ProgressRecord[]): DashboardBook[] {
  const progressById = new Map<string, ProgressRecord>()
  const legacyProgressByName = new Map<string, ProgressRecord>()

  for (const entry of progress) {
    if (entry.bookId) {
      const existing = progressById.get(entry.bookId)
      if (!existing || existing.updatedAt < entry.updatedAt) progressById.set(entry.bookId, entry)
    } else {
      const existing = legacyProgressByName.get(entry.bookName)
      if (!existing || existing.updatedAt < entry.updatedAt) legacyProgressByName.set(entry.bookName, entry)
    }
  }

  return books
    .map((item) => {
      const saved = progressById.get(item.id) ?? legacyProgressByName.get(item.name)
      return {
        ...item,
        currentTime: Math.max(0, saved?.currentTime ?? 0),
        listenedSeconds: Math.max(0, saved?.listenedSeconds ?? 0),
        progressPercent: getProgressPercent(saved?.currentTime ?? 0, item.durationSeconds),
        lastReadAt: saved && saved.currentTime > 0 ? saved.updatedAt : null,
      }
    })
    .sort((first, second) => {
      if (first.lastReadAt && second.lastReadAt) return second.lastReadAt.getTime() - first.lastReadAt.getTime()
      if (first.lastReadAt) return -1
      if (second.lastReadAt) return 1
      return second.updatedAt.getTime() - first.updatedAt.getTime()
    })
}
