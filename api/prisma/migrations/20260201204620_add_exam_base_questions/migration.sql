-- CreateTable
CREATE TABLE "exam_base_questions" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "examBaseId" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "subtopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "statement" TEXT NOT NULL,
    "correctAlternative" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "exam_base_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_base_question_alternatives" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "examBaseQuestionId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,

    CONSTRAINT "exam_base_question_alternatives_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exam_base_questions_examBaseId_idx" ON "exam_base_questions"("examBaseId");

-- CreateIndex
CREATE INDEX "exam_base_questions_examBaseId_subject_idx" ON "exam_base_questions"("examBaseId", "subject");

-- CreateIndex
CREATE INDEX "exam_base_questions_examBaseId_topic_idx" ON "exam_base_questions"("examBaseId", "topic");

-- CreateIndex
CREATE INDEX "exam_base_question_alternatives_examBaseQuestionId_idx" ON "exam_base_question_alternatives"("examBaseQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "exam_base_question_alternatives_examBaseQuestionId_key_key" ON "exam_base_question_alternatives"("examBaseQuestionId", "key");

-- AddForeignKey
ALTER TABLE "exam_base_questions" ADD CONSTRAINT "exam_base_questions_examBaseId_fkey" FOREIGN KEY ("examBaseId") REFERENCES "exam_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_base_question_alternatives" ADD CONSTRAINT "exam_base_question_alternatives_examBaseQuestionId_fkey" FOREIGN KEY ("examBaseQuestionId") REFERENCES "exam_base_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
