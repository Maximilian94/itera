-- AlterTable
ALTER TABLE "exam_base_attempts" ADD COLUMN     "subjectFilter" TEXT[] DEFAULT ARRAY[]::TEXT[];
