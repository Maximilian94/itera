-- AlterTable
ALTER TABLE "exam_bases" ADD COLUMN     "applicantCount" INTEGER,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "registrationDate" TIMESTAMP(3),
ADD COLUMN     "registrationFee" DECIMAL(10,2),
ADD COLUMN     "vacancyCount" INTEGER,
ADD COLUMN     "workload" TEXT;
