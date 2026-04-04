-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "blocks" JSONB,
ADD COLUMN     "blockSchemaVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "excerpt" TEXT,
ADD COLUMN     "searchableText" TEXT;

-- AlterTable
ALTER TABLE "Post" ALTER COLUMN "contentMarkdown" DROP NOT NULL;

-- Backfill excerpt + searchable text for existing Markdown posts
UPDATE "Post"
SET
  "searchableText" = "contentMarkdown",
  "excerpt" = LEFT("contentMarkdown", 280)
WHERE "contentMarkdown" IS NOT NULL
  AND "searchableText" IS NULL;
