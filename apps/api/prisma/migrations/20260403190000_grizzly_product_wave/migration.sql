-- CreateEnum
CREATE TYPE "NewsletterSubscriberStatus" AS ENUM ('PENDING', 'ACTIVE', 'UNSUBSCRIBED');

-- CreateEnum
CREATE TYPE "CommentModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'SPAM', 'REJECTED');

-- AlterTable
ALTER TABLE "Blog" ADD COLUMN     "customDomain" TEXT,
ADD COLUMN     "customDomainVerifyToken" TEXT,
ADD COLUMN     "customDomainVerifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Blog_customDomain_key" ON "Blog"("customDomain");

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "blogId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostTag" (
    "postId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "PostTag_pkey" PRIMARY KEY ("postId","tagId")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "blogId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "NewsletterSubscriberStatus" NOT NULL DEFAULT 'PENDING',
    "confirmToken" TEXT NOT NULL,
    "unsubToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorName" TEXT,
    "authorEmail" TEXT,
    "body" TEXT NOT NULL,
    "status" "CommentModerationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostRevision" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "contentMarkdown" TEXT,
    "blocks" JSONB,
    "blockSchemaVersion" INTEGER NOT NULL DEFAULT 1,
    "contentHtml" TEXT,
    "excerpt" TEXT,
    "searchableText" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageViewRollup" (
    "id" TEXT NOT NULL,
    "blogId" TEXT NOT NULL,
    "postId" TEXT NOT NULL DEFAULT '',
    "day" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PageViewRollup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Asset_blogId_idx" ON "Asset"("blogId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_blogId_idx" ON "NewsletterSubscriber"("blogId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_confirmToken_key" ON "NewsletterSubscriber"("confirmToken");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_unsubToken_key" ON "NewsletterSubscriber"("unsubToken");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_blogId_email_key" ON "NewsletterSubscriber"("blogId", "email");

-- CreateIndex
CREATE INDEX "Comment_postId_status_idx" ON "Comment"("postId", "status");

-- CreateIndex
CREATE INDEX "PostRevision_postId_createdAt_idx" ON "PostRevision"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "PageViewRollup_blogId_idx" ON "PageViewRollup"("blogId");

-- CreateIndex
CREATE UNIQUE INDEX "PageViewRollup_blogId_postId_day_key" ON "PageViewRollup"("blogId", "postId", "day");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_blogId_fkey" FOREIGN KEY ("blogId") REFERENCES "Blog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTag" ADD CONSTRAINT "PostTag_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTag" ADD CONSTRAINT "PostTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterSubscriber" ADD CONSTRAINT "NewsletterSubscriber_blogId_fkey" FOREIGN KEY ("blogId") REFERENCES "Blog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostRevision" ADD CONSTRAINT "PostRevision_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostRevision" ADD CONSTRAINT "PostRevision_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageViewRollup" ADD CONSTRAINT "PageViewRollup_blogId_fkey" FOREIGN KEY ("blogId") REFERENCES "Blog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
