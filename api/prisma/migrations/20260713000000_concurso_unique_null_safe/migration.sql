-- T1.1 (lazy-link): o @@unique([institution, year, examBoardId]) não protege
-- quando examBoardId é NULL (NULLs são distintos no Postgres) — dois requests
-- simultâneos para uma prova sem banca podiam criar dois Concursos duplicados.
-- Esta migration (1) deduplica o estado existente e (2) fecha a brecha com um
-- índice único parcial sobre (institution, year) WHERE examBoardId IS NULL,
-- mantendo o unique composto para o caso não-NULL.

-- 1a. Reponta exam_bases.concursoId das duplicatas para o sobrevivente
--     (o mais antigo; empate determinístico por id). A FK é ON DELETE SET NULL,
--     então repontar ANTES do delete preserva o vínculo lazy-link já populado.
WITH ranked AS (
  SELECT
    id,
    FIRST_VALUE(id) OVER (
      PARTITION BY "institution", "year"
      ORDER BY "createdAt" ASC, id ASC
    ) AS survivor_id
  FROM "concursos"
  WHERE "examBoardId" IS NULL
)
UPDATE "exam_bases" eb
SET "concursoId" = r.survivor_id
FROM ranked r
WHERE eb."concursoId" = r.id
  AND r.id <> r.survivor_id;

-- 1b. Remove as duplicatas (idempotente: sem duplicatas, nada a deletar).
WITH ranked AS (
  SELECT
    id,
    FIRST_VALUE(id) OVER (
      PARTITION BY "institution", "year"
      ORDER BY "createdAt" ASC, id ASC
    ) AS survivor_id
  FROM "concursos"
  WHERE "examBoardId" IS NULL
)
DELETE FROM "concursos" c
USING ranked r
WHERE c.id = r.id
  AND r.id <> r.survivor_id;

-- 2. Unique NULL-safe: cobre a lacuna do unique composto para banca NULL.
CREATE UNIQUE INDEX "concursos_institution_year_no_board_key"
ON "concursos" ("institution", "year")
WHERE "examBoardId" IS NULL;
