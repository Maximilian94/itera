-- AlterTable
ALTER TABLE "exam_bases" ADD COLUMN     "isNursingRelevant" BOOLEAN NOT NULL DEFAULT true;

-- Backfill heurístico (usado UMA vez; daqui em diante a flag é explícita, controlada pelo admin):
-- cargos existentes cujo role não menciona enfermagem ficam fora da página do concurso.
-- Revisão manual via Prisma Studio (ex.: "Enfermeiro do Trabalho" contém "enferm" e permanece true;
-- "Médico do Trabalho" não contém e vira false).
UPDATE "exam_bases"
SET "isNursingRelevant" = false
WHERE "role" NOT ILIKE '%enferm%';
