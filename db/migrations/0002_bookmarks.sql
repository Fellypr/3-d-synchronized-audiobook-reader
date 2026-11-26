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

CREATE INDEX IF NOT EXISTS "bookmarks_user_book_idx" ON "bookmarks" ("userId", "bookId");
CREATE INDEX IF NOT EXISTS "bookmarks_user_book_name_idx" ON "bookmarks" ("userId", "bookName");
CREATE INDEX IF NOT EXISTS "bookmarks_user_created_at_idx" ON "bookmarks" ("userId", "createdAt");
