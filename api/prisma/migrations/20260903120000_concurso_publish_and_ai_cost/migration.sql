-- CreateEnum
CREATE TYPE "ConcursoAiPhase" AS ENUM ('NEWS_EXTRACT', 'LINK_SEARCH', 'DOCUMENTS_CHECK', 'DOCUMENT_ANALYSIS');

-- AlterTable
ALTER TABLE "concursos" ADD COLUMN "publishedAt" TIMESTAMP(3);

-- Backfill: tudo que já existe continua visível. O gate de publicação nasce
-- agora e só vale para o que a descoberta criar daqui em diante — sem isto,
-- a migration esvaziaria o /concursos de todo mundo.
UPDATE "concursos" SET "publishedAt" = "createdAt";

-- CreateTable
CREATE TABLE "concurso_ai_costs" (
    "id" UUID NOT NULL,
    "concursoId" UUID NOT NULL,
    "phase" "ConcursoAiPhase" NOT NULL,
    "usd" DECIMAL(10,6) NOT NULL,
    "entries" JSONB NOT NULL,
    "documentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "concurso_ai_costs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "concurso_ai_costs_concursoId_phase_idx" ON "concurso_ai_costs"("concursoId", "phase");

-- AddForeignKey
ALTER TABLE "concurso_ai_costs" ADD CONSTRAINT "concurso_ai_costs_concursoId_fkey" FOREIGN KEY ("concursoId") REFERENCES "concursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
