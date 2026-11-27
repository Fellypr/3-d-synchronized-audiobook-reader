export type BookmarkCategoryId =
  | 'conceito'
  | 'ideia'
  | 'duvida'
  | 'ponto-chave'
  | 'colorido'

export interface BookmarkCategoryConfig {
  id: BookmarkCategoryId
  label: string
  description: string
  color: string
  bgClass: string
  borderClass: string
  textClass: string
}

export const BOOKMARK_CATEGORIES: BookmarkCategoryConfig[] = [
  {
    id: 'conceito',
    label: 'Conceito',
    description: 'Uma teoria que quero estudar',
    color: '#3882C7',
    bgClass: 'bg-[#3882C7]/28',
    borderClass: 'border-[#3882C7]',
    textClass: 'text-[#6DB3F2]',
  },
  {
    id: 'ideia',
    label: 'Ideia',
    description: 'Algo que quero aplicar',
    color: '#3FB950',
    bgClass: 'bg-[#3FB950]/28',
    borderClass: 'border-[#3FB950]',
    textClass: 'text-[#6FE07E]',
  },
  {
    id: 'duvida',
    label: 'Dúvida',
    description: 'Algo que não compreendi',
    color: '#A855F7',
    bgClass: 'bg-[#A855F7]/28',
    borderClass: 'border-[#A855F7]',
    textClass: 'text-[#C88CFF]',
  },
  {
    id: 'ponto-chave',
    label: 'Ponto-chave',
    description: 'Uma conclusão importante',
    color: '#E09F4C',
    bgClass: 'bg-[#E09F4C]/30',
    borderClass: 'border-[#E09F4C]',
    textClass: 'text-[#F3BA55]',
  },
  {
    id: 'colorido',
    label: 'Texto colorido',
    description: 'Destaque personalizado',
    color: '#EC4899',
    bgClass: 'bg-[#EC4899]/28',
    borderClass: 'border-[#EC4899]',
    textClass: 'text-[#F472B6]',
  },
]

export function getCategoryConfig(categoryId?: string | null): BookmarkCategoryConfig {
  return (
    BOOKMARK_CATEGORIES.find((c) => c.id === categoryId) ?? BOOKMARK_CATEGORIES[3]
  )
}

export interface BookmarkItem {
  id: string
  userId: string
  bookId: string | null
  bookName: string
  chapter: string | null
  section: string | null
  pageNumber: number | null
  wordIndex: number
  endWordIndex: number | null
  title: string | null
  category: BookmarkCategoryId | string
  color: string
  selectedText: string
  textPrefix: string | null
  textSuffix: string | null
  audioTimeSeconds: number | null
  note: string | null
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
  endWordIndex?: number | null
  title?: string | null
  category?: BookmarkCategoryId | string
  color?: string
  selectedText: string
  textPrefix?: string | null
  textSuffix?: string | null
  audioTimeSeconds?: number | null
  note?: string | null
}

export interface UpdateBookmarkPayload {
  id: string
  title?: string | null
  note?: string | null
  category?: BookmarkCategoryId | string
  color?: string
}
