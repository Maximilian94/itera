-- AlterTable
ALTER TABLE "concursos" ADD COLUMN     "editalUrl" TEXT,
ADD COLUMN     "slug" TEXT;

-- AlterTable
ALTER TABLE "exam_bases" ADD COLUMN     "registrationEnd" TIMESTAMP(3),
ADD COLUMN     "registrationStart" TIMESTAMP(3),
ADD COLUMN     "requirements" TEXT,
ADD COLUMN     "resultDate" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "concursos_slug_key" ON "concursos"("slug");

-- Backfill: a antiga data única de inscrição vira o início da janela.
-- (registrationDate fica deprecada; coluna removida na limpeza final do épico MAX-11.)
UPDATE "exam_bases"
SET "registrationStart" = "registrationDate"
WHERE "registrationDate" IS NOT NULL
  AND "registrationStart" IS NULL;

-- Backfill: editalUrl no nível do concurso, copiada da primeira prova (por examDate) com valor.
UPDATE "concursos" c
SET "editalUrl" = sub."editalUrl"
FROM (
  SELECT DISTINCT ON ("concursoId") "concursoId", "editalUrl"
  FROM "exam_bases"
  WHERE "concursoId" IS NOT NULL
    AND "editalUrl" IS NOT NULL
  ORDER BY "concursoId", "examDate" ASC, "id" ASC
) sub
WHERE c."id" = sub."concursoId"
  AND c."editalUrl" IS NULL;
