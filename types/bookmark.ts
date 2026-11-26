export interface BookmarkItem {
  id: string
  userId: string
  bookId: string | null
  bookName: string
  chapter: string | null
  section: string | null
  pageNumber: number | null
  wordIndex: number
  selectedText: string
  textPrefix: string | null
  textSuffix: string | null
  audioTimeSeconds: number | null
  createdAt: string | Date
  updatedAt: string | Date
}

export interface CreateBookmarkPayload {
  bookId?: string | null
  bookName: string
  chapter?: string | null
  section?: string | null
  pageNumber?: number | null
  wordIndex: number
  selectedText: string
  textPrefix?: string | null
  textSuffix?: string | null
  audioTimeSeconds?: number | null
}
