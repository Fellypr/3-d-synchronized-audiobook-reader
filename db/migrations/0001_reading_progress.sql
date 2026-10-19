-- Apply this additive migration before deploying code that reads the new columns.
-- Existing playback positions are retained; historical listening time is not inferred.

BEGIN;

ALTER TABLE "book"
  ADD COLUMN IF NOT EXISTS "durationSeconds" real;

ALTER TABLE "audiobookProgress"
  ADD COLUMN IF NOT EXISTS "bookId" text,
  ADD COLUMN IF NOT EXISTS "listenedSeconds" real;

UPDATE "audiobookProgress" AS progress
SET "bookId" = book."id"
FROM "book"
WHERE progress."bookId" IS NULL
  AND progress."userId" = book."userId"
  AND progress."bookName" = book."name";

CREATE UNIQUE INDEX IF NOT EXISTS "audiobookProgress_user_book_id_unique"
  ON "audiobookProgress" ("userId", "bookId");

COMMIT;
