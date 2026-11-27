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

    // 1.2 Adicionar pdfUrl na tabela book
    await pool.query(`
      ALTER TABLE "book" 
      ADD COLUMN IF NOT EXISTS "pdfUrl" text;
    `)
    console.log('✓ Coluna "pdfUrl" adicionada/verificada em "book"')

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

    // 5. Criar tabela bookmarks caso não exista
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "bookmarks" (
        "id" text PRIMARY KEY NOT NULL,
        "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "bookId" text REFERENCES "book"("id") ON DELETE CASCADE,
        "bookName" text NOT NULL,
        "chapter" text,
        "section" text,
        "pageNumber" integer,
        "wordIndex" integer NOT NULL,
        "selectedText" text NOT NULL,
        "textPrefix" text,
        "textSuffix" text,
        "audioTimeSeconds" real,
        "createdAt" timestamp DEFAULT now() NOT NULL,
        "updatedAt" timestamp DEFAULT now() NOT NULL
      );
    `)
    console.log('✓ Tabela "bookmarks" criada/verificada')

    // 5.1 Criar índices da tabela bookmarks
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
    console.log('✓ Índices da tabela "bookmarks" criados/verificados')

    // 6. Adicionar colunas de marca-texto e anotações em bookmarks
    await pool.query(`
      ALTER TABLE "bookmarks"
      ADD COLUMN IF NOT EXISTS "endWordIndex" integer,
      ADD COLUMN IF NOT EXISTS "title" text,
      ADD COLUMN IF NOT EXISTS "category" text NOT NULL DEFAULT 'ponto-chave',
      ADD COLUMN IF NOT EXISTS "color" text NOT NULL DEFAULT '#E09F4C',
      ADD COLUMN IF NOT EXISTS "note" text;
    `)
    console.log('✓ Colunas de destaque colorido e notas verificadas em "bookmarks"')

    console.log('Migrações concluídas com sucesso!')
  } catch (err) {
    console.error('Erro ao executar migração:', err)
  } finally {
    await pool.end()
  }
}

migrate()
