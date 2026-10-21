import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function migrate() {
  const connectionString = (process.env.DATABASE_URL || '').replace(/sslmode=(?:require|prefer|verify-ca)\b/g, 'sslmode=verify-full')
  const pool = new Pool({ connectionString })
  try {
    console.log('Aplicando migrações no banco Neon...')

    // 1. Adicionar durationSeconds na tabela book
    await pool.query(`
      ALTER TABLE "book" 
      ADD COLUMN IF NOT EXISTS "durationSeconds" real;
    `)
    console.log('✓ Coluna "durationSeconds" adicionada/verificada em "book"')

    // 1.1 Adicionar coverUrl na tabela book
    await pool.query(`
      ALTER TABLE "book" 
      ADD COLUMN IF NOT EXISTS "coverUrl" text;
    `)
    console.log('✓ Coluna "coverUrl" adicionada/verificada em "book"')

    // 2. Adicionar bookId na tabela audiobookProgress
    await pool.query(`
      ALTER TABLE "audiobookProgress" 
      ADD COLUMN IF NOT EXISTS "bookId" text;
    `)
    console.log('✓ Coluna "bookId" adicionada/verificada em "audiobookProgress"')

    // 3. Adicionar listenedSeconds na tabela audiobookProgress
    await pool.query(`
      ALTER TABLE "audiobookProgress" 
      ADD COLUMN IF NOT EXISTS "listenedSeconds" real;
    `)
    console.log('✓ Coluna "listenedSeconds" adicionada/verificada em "audiobookProgress"')

    // 4. Criar índice único em (userId, bookId) caso não exista
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "audiobookProgress_user_book_id_unique" 
      ON "audiobookProgress" ("userId", "bookId") 
      WHERE "bookId" IS NOT NULL;
    `)
    console.log('✓ Índice "audiobookProgress_user_book_id_unique" criado/verificado')

    console.log('Migrações concluídas com sucesso!')
  } catch (err) {
    console.error('Erro ao executar migração:', err)
  } finally {
    await pool.end()
  }
}

migrate()
