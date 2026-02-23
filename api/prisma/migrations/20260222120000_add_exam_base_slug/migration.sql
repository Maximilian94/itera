-- AlterTable
ALTER TABLE "exam_bases" ADD COLUMN "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "exam_bases_slug_key" ON "exam_bases"("slug");
