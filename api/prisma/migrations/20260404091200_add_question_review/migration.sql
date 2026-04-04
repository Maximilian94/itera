-- AlterTable
ALTER TABLE "exam_base_questions" ADD COLUMN     "createdById" UUID;

-- CreateTable
CREATE TABLE "exam_base_question_reviews" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "questionId" UUID NOT NULL,
    "reviewerId" UUID NOT NULL,

    CONSTRAINT "exam_base_question_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exam_base_question_reviews_questionId_idx" ON "exam_base_question_reviews"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "exam_base_question_reviews_questionId_reviewerId_key" ON "exam_base_question_reviews"("questionId", "reviewerId");

-- AddForeignKey
ALTER TABLE "exam_base_questions" ADD CONSTRAINT "exam_base_questions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_base_question_reviews" ADD CONSTRAINT "exam_base_question_reviews_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "exam_base_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_base_question_reviews" ADD CONSTRAINT "exam_base_question_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
