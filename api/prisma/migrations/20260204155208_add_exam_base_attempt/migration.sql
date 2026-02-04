-- CreateTable
CREATE TABLE "exam_base_attempts" (
    "id" UUID NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "examBaseId" UUID NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "exam_base_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_base_attempt_answers" (
    "examBaseAttemptId" UUID NOT NULL,
    "examBaseQuestionId" UUID NOT NULL,
    "selectedAlternativeId" UUID,

    CONSTRAINT "exam_base_attempt_answers_pkey" PRIMARY KEY ("examBaseAttemptId","examBaseQuestionId")
);

-- CreateIndex
CREATE INDEX "exam_base_attempts_examBaseId_idx" ON "exam_base_attempts"("examBaseId");

-- CreateIndex
CREATE INDEX "exam_base_attempts_userId_idx" ON "exam_base_attempts"("userId");

-- CreateIndex
CREATE INDEX "exam_base_attempt_answers_examBaseAttemptId_idx" ON "exam_base_attempt_answers"("examBaseAttemptId");

-- CreateIndex
CREATE INDEX "exam_base_attempt_answers_examBaseQuestionId_idx" ON "exam_base_attempt_answers"("examBaseQuestionId");

-- AddForeignKey
ALTER TABLE "exam_base_attempts" ADD CONSTRAINT "exam_base_attempts_examBaseId_fkey" FOREIGN KEY ("examBaseId") REFERENCES "exam_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_base_attempts" ADD CONSTRAINT "exam_base_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_base_attempt_answers" ADD CONSTRAINT "exam_base_attempt_answers_examBaseAttemptId_fkey" FOREIGN KEY ("examBaseAttemptId") REFERENCES "exam_base_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_base_attempt_answers" ADD CONSTRAINT "exam_base_attempt_answers_examBaseQuestionId_fkey" FOREIGN KEY ("examBaseQuestionId") REFERENCES "exam_base_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_base_attempt_answers" ADD CONSTRAINT "exam_base_attempt_answers_selectedAlternativeId_fkey" FOREIGN KEY ("selectedAlternativeId") REFERENCES "exam_base_question_alternatives"("id") ON DELETE SET NULL ON UPDATE CASCADE;
