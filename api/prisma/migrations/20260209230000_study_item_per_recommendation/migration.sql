-- AlterTable: add subjectFeedbackRecommendationId (nullable for backfill)
ALTER TABLE "training_study_items" ADD COLUMN "subjectFeedbackRecommendationId" UUID;

-- Backfill: set subjectFeedbackRecommendationId to the first recommendation (by order) for each subjectFeedbackId
UPDATE "training_study_items" t
SET "subjectFeedbackRecommendationId" = (
  SELECT r.id FROM "subject_feedback_recommendations" r
  WHERE r."subjectFeedbackId" = t."subjectFeedbackId"
  ORDER BY r."order" ASC
  LIMIT 1
);

-- Set topic = recommendation title for all rows (existing rows had topic from before; now one item = one recommendation)
UPDATE "training_study_items" t
SET topic = r.title
FROM "subject_feedback_recommendations" r
WHERE t."subjectFeedbackRecommendationId" = r.id;

-- Insert one row per extra recommendation (2nd, 3rd, ...) for each existing study item
INSERT INTO "training_study_items" (id, "trainingSessionId", "subjectFeedbackRecommendationId", subject, topic, explanation, "completedAt", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  t."trainingSessionId",
  r.id,
  t.subject,
  r.title,
  NULL,
  t."completedAt",
  NOW(),
  NOW()
FROM "training_study_items" t
JOIN "subject_feedback_recommendations" r ON r."subjectFeedbackId" = t."subjectFeedbackId"
WHERE t."subjectFeedbackRecommendationId" IS DISTINCT FROM r.id;

-- Drop old FK and unique/index, then column
ALTER TABLE "training_study_items" DROP CONSTRAINT "training_study_items_subjectFeedbackId_fkey";
DROP INDEX "training_study_items_trainingSessionId_subjectFeedbackId_key";
DROP INDEX "training_study_items_subjectFeedbackId_idx";
ALTER TABLE "training_study_items" DROP COLUMN "subjectFeedbackId";

-- Make new column required and add constraints
ALTER TABLE "training_study_items" ALTER COLUMN "subjectFeedbackRecommendationId" SET NOT NULL;
CREATE UNIQUE INDEX "training_study_items_trainingSessionId_subjectFeedbackRecommendationId_key" ON "training_study_items"("trainingSessionId", "subjectFeedbackRecommendationId");
CREATE INDEX "training_study_items_subjectFeedbackRecommendationId_idx" ON "training_study_items"("subjectFeedbackRecommendationId");
ALTER TABLE "training_study_items" ADD CONSTRAINT "training_study_items_subjectFeedbackRecommendationId_fkey" FOREIGN KEY ("subjectFeedbackRecommendationId") REFERENCES "subject_feedback_recommendations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
