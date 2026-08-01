-- AlterTable
ALTER TABLE "exam_syllabus_groups" ADD COLUMN     "maxScore" DECIMAL(7,2),
ADD COLUMN     "questionCount" INTEGER,
ADD COLUMN     "weight" DECIMAL(6,2),
ALTER COLUMN "examBaseId" DROP NOT NULL;
