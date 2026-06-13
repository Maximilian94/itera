-- Limpeza final do épico MAX-11: a coluna deprecada `registrationDate` foi
-- substituída pela janela `registrationStart`/`registrationEnd`. O backfill
-- inicial ocorreu na migration 20260612145648_concurso_timeline_fields; aqui
-- repetimos por segurança (qualquer linha escrita em registrationDate entre as
-- duas migrations) antes de remover a coluna em definitivo.
UPDATE "exam_bases"
SET "registrationStart" = "registrationDate"
WHERE "registrationDate" IS NOT NULL
  AND "registrationStart" IS NULL;

-- AlterTable
ALTER TABLE "exam_bases" DROP COLUMN "registrationDate";
