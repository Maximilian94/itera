-- AlterTable
ALTER TABLE "exams" ADD COLUMN     "examBoardId" UUID;

-- CreateIndex
CREATE INDEX "exams_examBoardId_idx" ON "exams"("examBoardId");

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_examBoardId_fkey" FOREIGN KEY ("examBoardId") REFERENCES "exam_boards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

