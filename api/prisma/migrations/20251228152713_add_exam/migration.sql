-- AlterTable
ALTER TABLE "attempts" ADD COLUMN     "examId" UUID;

-- CreateTable
CREATE TABLE "exams" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "questionCount" INTEGER NOT NULL,
    "onlyUnsolved" BOOLEAN NOT NULL DEFAULT false,
    "filterSkillIds" TEXT[],
    "userId" UUID NOT NULL,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_questions" (
    "order" INTEGER NOT NULL,
    "examId" UUID NOT NULL,
    "questionId" UUID NOT NULL,

    CONSTRAINT "exam_questions_pkey" PRIMARY KEY ("examId","questionId")
);

-- CreateIndex
CREATE INDEX "exams_userId_createdAt_idx" ON "exams"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "exam_questions_examId_order_idx" ON "exam_questions"("examId", "order");

-- CreateIndex
CREATE INDEX "attempts_examId_createdAt_idx" ON "attempts"("examId", "createdAt");

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
