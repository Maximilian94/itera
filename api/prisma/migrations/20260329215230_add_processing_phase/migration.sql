-- CreateEnum
CREATE TYPE "ProcessingPhase" AS ENUM ('EDITAL', 'PROVA', 'GABARITO', 'REVISAO', 'EXPLICACOES', 'CONCLUIDO');

-- AlterTable
ALTER TABLE "exam_bases" ADD COLUMN     "processingPhase" "ProcessingPhase" NOT NULL DEFAULT 'EDITAL';
