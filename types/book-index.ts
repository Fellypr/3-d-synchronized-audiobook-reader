import type { BookmarkItem } from './bookmark'

export interface BookIndexItem {
  id: string
  title: string
  pageNumber: number // 1-based page number
  items?: BookIndexItem[]
}

export interface BookOutlineResult {
  items: BookIndexItem[]
  hasOutline: boolean
}

export interface BookIndexSidebarProps {
  isOpen: boolean
  onClose: () => void
  items: BookIndexItem[]
  currentPage: number // 1-based current page
  currentSpreadPage?: number // 1-based current spread end page
  totalPages: number
  onSelectPage: (pageNumber: number) => void
  bookmarks?: BookmarkItem[]
  onSelectBookmark?: (bookmark: BookmarkItem) => void
  onDeleteBookmark?: (id: string) => Promise<void> | void
  isDeletingBookmarkId?: string | null
}
