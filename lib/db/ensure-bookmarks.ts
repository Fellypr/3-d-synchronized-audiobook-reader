import { pool } from '@/lib/db'

let readyPromise: Promise<void> | null = null

/**
 * Ensures the `bookmarks` table, columns, and indexes exist in the target database
 * (e.g. Vercel production) without requiring manual migration runs.
 * Runs once per serverless cold start and resets if an error occurs.
 */
export function ensureBookmarksTable(): Promise<void> {
  if (!readyPromise) {
    readyPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "bookmarks" (
          "id" text PRIMARY KEY,
          "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
          "bookId" text REFERENCES "book"("id") ON DELETE CASCADE,
          "bookName" text NOT NULL,
          "chapter" text,
          "section" text,
          "pageNumber" integer,
          "wordIndex" integer NOT NULL,
          "endWordIndex" integer,
          "title" text,
          "category" text NOT NULL DEFAULT 'ponto-chave',
          "color" text NOT NULL DEFAULT '#E09F4C',
          "selectedText" text NOT NULL,
          "textPrefix" text,
          "textSuffix" text,
          "audioTimeSeconds" real,
          "note" text,
          "createdAt" timestamp NOT NULL DEFAULT now(),
          "updatedAt" timestamp NOT NULL DEFAULT now()
        );
      `)

      await pool.query(`
        ALTER TABLE "bookmarks"
        ADD COLUMN IF NOT EXISTS "endWordIndex" integer,
        ADD COLUMN IF NOT EXISTS "title" text,
        ADD COLUMN IF NOT EXISTS "category" text NOT NULL DEFAULT 'ponto-chave',
        ADD COLUMN IF NOT EXISTS "color" text NOT NULL DEFAULT '#E09F4C',
        ADD COLUMN IF NOT EXISTS "note" text;
      `)

      await pool.query(`
        CREATE INDEX IF NOT EXISTS "bookmarks_user_book_idx"
        ON "bookmarks" ("userId", "bookId");
      `)
      await pool.query(`
        CREATE INDEX IF NOT EXISTS "bookmarks_user_book_name_idx"
        ON "bookmarks" ("userId", "bookName");
      `)
      await pool.query(`
        CREATE INDEX IF NOT EXISTS "bookmarks_user_created_at_idx"
        ON "bookmarks" ("userId", "createdAt");
      `)
    })().catch((err) => {
      readyPromise = null
      throw err
    })
  }

  return readyPromise
}
