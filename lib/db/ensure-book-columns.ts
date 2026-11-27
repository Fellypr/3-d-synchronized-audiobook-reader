import { pool } from '@/lib/db'

let readyPromise: Promise<void> | null = null

/**
 * Ensures the `accentColor` column exists in `book` on production databases
 * (e.g. Vercel) without requiring manual migration runs.
 */
export function ensureBookAccentColumn(): Promise<void> {
  if (!readyPromise) {
    readyPromise = pool
      .query(`ALTER TABLE "book" ADD COLUMN IF NOT EXISTS "accentColor" text;`)
      .then(() => undefined)
      .catch((err) => {
        readyPromise = null
        throw err
      })
  }
  return readyPromise
}
