-- CreateTable
CREATE TABLE "training_retries" (
    "id" UUID NOT NULL,
    "trainingSessionId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_retries_pkey" PRIMARY KEY ("id")
);

-- Add column to training_retry_answers (nullable for backfill)
ALTER TABLE "training_retry_answers" ADD COLUMN "trainingRetryId" UUID;

-- Create one TrainingRetry per session that has answers
INSERT INTO "training_retries" ("id", "trainingSessionId", "createdAt")
SELECT gen_random_uuid(), "trainingSessionId", CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "trainingSessionId" FROM "training_retry_answers") AS s;

UPDATE "training_retry_answers" AS a
SET "trainingRetryId" = r.id
FROM "training_retries" AS r
WHERE r."trainingSessionId" = a."trainingSessionId";

-- Drop old PK and FK
ALTER TABLE "training_retry_answers" DROP CONSTRAINT "training_retry_answers_pkey";

ALTER TABLE "training_retry_answers" DROP CONSTRAINT IF EXISTS "training_retry_answers_trainingSessionId_fkey";

-- Drop old column and make new one NOT NULL
ALTER TABLE "training_retry_answers" DROP COLUMN "trainingSessionId";

-- For any rows that might have null (sessions with no answers), we don't have any - so we can set NOT NULL
ALTER TABLE "training_retry_answers" ALTER COLUMN "trainingRetryId" SET NOT NULL;

-- Add new PK
ALTER TABLE "training_retry_answers" ADD CONSTRAINT "training_retry_answers_pkey" PRIMARY KEY ("trainingRetryId", "examBaseQuestionId");

-- CreateIndex
CREATE INDEX "training_retries_trainingSessionId_idx" ON "training_retries"("trainingSessionId");

CREATE INDEX "training_retry_answers_trainingRetryId_idx" ON "training_retry_answers"("trainingRetryId");

-- AddForeignKey
ALTER TABLE "training_retries" ADD CONSTRAINT "training_retries_trainingSessionId_fkey" FOREIGN KEY ("trainingSessionId") REFERENCES "training_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "training_retry_answers" ADD CONSTRAINT "training_retry_answers_trainingRetryId_fkey" FOREIGN KEY ("trainingRetryId") REFERENCES "training_retries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
