import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

function getNormalizedDatabaseUrl() {
  const url = process.env.DATABASE_URL
  if (!url) return undefined
  // Normalize sslmode to verify-full to silence node-postgres pg v9 security warning
  return url.replace(/sslmode=(?:require|prefer|verify-ca)\b/g, 'sslmode=verify-full')
}

export const pool = new Pool({ connectionString: getNormalizedDatabaseUrl() })
export const db = drizzle(pool, { schema })
