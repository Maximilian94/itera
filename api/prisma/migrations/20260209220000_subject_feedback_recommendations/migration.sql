-- CreateTable
CREATE TABLE "subject_feedback_recommendations" (
    "id" UUID NOT NULL,
    "subjectFeedbackId" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subject_feedback_recommendations_pkey" PRIMARY KEY ("id")
);

-- Backfill: one recommendation per existing subject_feedback (title = "Recomendações", text = old recommendations)
INSERT INTO "subject_feedback_recommendations" ("id", "subjectFeedbackId", "title", "text", "order", "createdAt")
SELECT gen_random_uuid(), "id", 'Recomendações', "recommendations", 0, CURRENT_TIMESTAMP
FROM "subject_feedbacks"
WHERE "recommendations" IS NOT NULL AND trim("recommendations") != '';

-- DropColumn
ALTER TABLE "subject_feedbacks" DROP COLUMN "recommendations";

-- CreateIndex
CREATE INDEX "subject_feedback_recommendations_subjectFeedbackId_idx" ON "subject_feedback_recommendations"("subjectFeedbackId");

-- AddForeignKey
ALTER TABLE "subject_feedback_recommendations" ADD CONSTRAINT "subject_feedback_recommendations_subjectFeedbackId_fkey" FOREIGN KEY ("subjectFeedbackId") REFERENCES "subject_feedbacks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
