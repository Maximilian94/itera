-- AlterTable
ALTER TABLE "exam_base_questions" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

-- Backfill: set order based on createdAt per exam_base_id
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "examBaseId" ORDER BY "createdAt" ASC) - 1 AS rn
  FROM "exam_base_questions"
)
UPDATE "exam_base_questions" q
SET "order" = n.rn
FROM numbered n
WHERE q.id = n.id;

-- CreateIndex
CREATE INDEX "exam_base_questions_examBaseId_order_idx" ON "exam_base_questions"("examBaseId", "order");
