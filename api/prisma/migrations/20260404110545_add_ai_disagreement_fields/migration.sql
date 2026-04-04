-- AlterTable
ALTER TABLE "exam_base_questions" ADD COLUMN     "aiDisagreement" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aiDisagreementReason" TEXT;
