-- CreateEnum
CREATE TYPE "TrainingStage" AS ENUM ('EXAM', 'DIAGNOSIS', 'STUDY', 'RETRY', 'FINAL');

-- CreateTable
CREATE TABLE "training_sessions" (
    "id" UUID NOT NULL,
    "currentStage" "TrainingStage" NOT NULL DEFAULT 'EXAM',
    "finalScorePercentage" DECIMAL(5,2),
    "finalFeedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID NOT NULL,
    "examBaseAttemptId" UUID NOT NULL,
    "examBaseId" UUID NOT NULL,

    CONSTRAINT "training_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_retry_answers" (
    "trainingSessionId" UUID NOT NULL,
    "examBaseQuestionId" UUID NOT NULL,
    "selectedAlternativeId" UUID NOT NULL,

    CONSTRAINT "training_retry_answers_pkey" PRIMARY KEY ("trainingSessionId","examBaseQuestionId")
);

-- CreateTable
CREATE TABLE "subject_feedbacks" (
    "id" UUID NOT NULL,
    "examBaseAttemptId" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "evaluation" TEXT NOT NULL,
    "recommendations" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subject_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_study_items" (
    "id" UUID NOT NULL,
    "trainingSessionId" UUID NOT NULL,
    "subjectFeedbackId" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "topic" TEXT,
    "explanation" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_study_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_exercises" (
    "id" UUID NOT NULL,
    "trainingStudyItemId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "statement" TEXT NOT NULL,
    "correctAlternativeKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_exercise_alternatives" (
    "id" UUID NOT NULL,
    "studyExerciseId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_exercise_alternatives_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "training_sessions_examBaseAttemptId_key" ON "training_sessions"("examBaseAttemptId");

-- CreateIndex
CREATE INDEX "training_sessions_userId_idx" ON "training_sessions"("userId");

-- CreateIndex
CREATE INDEX "training_sessions_examBaseId_idx" ON "training_sessions"("examBaseId");

-- CreateIndex
CREATE INDEX "training_retry_answers_trainingSessionId_idx" ON "training_retry_answers"("trainingSessionId");

-- CreateIndex
CREATE INDEX "training_retry_answers_examBaseQuestionId_idx" ON "training_retry_answers"("examBaseQuestionId");

-- CreateIndex
CREATE INDEX "subject_feedbacks_examBaseAttemptId_idx" ON "subject_feedbacks"("examBaseAttemptId");

-- CreateIndex
CREATE UNIQUE INDEX "subject_feedbacks_examBaseAttemptId_subject_key" ON "subject_feedbacks"("examBaseAttemptId", "subject");

-- CreateIndex
CREATE INDEX "training_study_items_trainingSessionId_idx" ON "training_study_items"("trainingSessionId");

-- CreateIndex
CREATE INDEX "training_study_items_subjectFeedbackId_idx" ON "training_study_items"("subjectFeedbackId");

-- CreateIndex
CREATE UNIQUE INDEX "training_study_items_trainingSessionId_subjectFeedbackId_key" ON "training_study_items"("trainingSessionId", "subjectFeedbackId");

-- CreateIndex
CREATE INDEX "study_exercises_trainingStudyItemId_idx" ON "study_exercises"("trainingStudyItemId");

-- CreateIndex
CREATE INDEX "study_exercise_alternatives_studyExerciseId_idx" ON "study_exercise_alternatives"("studyExerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "study_exercise_alternatives_studyExerciseId_key_key" ON "study_exercise_alternatives"("studyExerciseId", "key");

-- AddForeignKey
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_examBaseAttemptId_fkey" FOREIGN KEY ("examBaseAttemptId") REFERENCES "exam_base_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_examBaseId_fkey" FOREIGN KEY ("examBaseId") REFERENCES "exam_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_retry_answers" ADD CONSTRAINT "training_retry_answers_trainingSessionId_fkey" FOREIGN KEY ("trainingSessionId") REFERENCES "training_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_retry_answers" ADD CONSTRAINT "training_retry_answers_examBaseQuestionId_fkey" FOREIGN KEY ("examBaseQuestionId") REFERENCES "exam_base_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_retry_answers" ADD CONSTRAINT "training_retry_answers_selectedAlternativeId_fkey" FOREIGN KEY ("selectedAlternativeId") REFERENCES "exam_base_question_alternatives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_feedbacks" ADD CONSTRAINT "subject_feedbacks_examBaseAttemptId_fkey" FOREIGN KEY ("examBaseAttemptId") REFERENCES "exam_base_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_study_items" ADD CONSTRAINT "training_study_items_trainingSessionId_fkey" FOREIGN KEY ("trainingSessionId") REFERENCES "training_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_study_items" ADD CONSTRAINT "training_study_items_subjectFeedbackId_fkey" FOREIGN KEY ("subjectFeedbackId") REFERENCES "subject_feedbacks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_exercises" ADD CONSTRAINT "study_exercises_trainingStudyItemId_fkey" FOREIGN KEY ("trainingStudyItemId") REFERENCES "training_study_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_exercise_alternatives" ADD CONSTRAINT "study_exercise_alternatives_studyExerciseId_fkey" FOREIGN KEY ("studyExerciseId") REFERENCES "study_exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
