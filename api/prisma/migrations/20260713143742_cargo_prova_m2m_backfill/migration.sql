-- AlterTable
ALTER TABLE "concursos" ADD COLUMN     "registrationEnd" TIMESTAMP(3),
ADD COLUMN     "registrationStart" TIMESTAMP(3),
ADD COLUMN     "resultDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "exam_syllabus_groups" ADD COLUMN     "cargoId" UUID;

-- CreateTable
CREATE TABLE "cargos" (
    "id" UUID NOT NULL,
    "slug" TEXT,
    "role" TEXT NOT NULL,
    "description" TEXT,
    "requirements" TEXT,
    "salaryBase" DECIMAL(10,2),
    "workload" TEXT,
    "vacancyCount" INTEGER,
    "hasReserveList" BOOLEAN NOT NULL DEFAULT false,
    "applicantCount" INTEGER,
    "registrationFee" DECIMAL(10,2),
    "minPassingGradeNonQuota" DECIMAL(5,2),
    "actualCutScore" DECIMAL(5,2),
    "isNursingRelevant" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "concursoId" UUID NOT NULL,

    CONSTRAINT "cargos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cargo_provas" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cargoId" UUID NOT NULL,
    "examBaseId" UUID NOT NULL,
    "provaLabel" TEXT,
    "isOficial" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "cargo_provas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cargos_slug_key" ON "cargos"("slug");

-- CreateIndex
CREATE INDEX "cargos_concursoId_idx" ON "cargos"("concursoId");

-- CreateIndex
CREATE INDEX "cargos_role_idx" ON "cargos"("role");

-- CreateIndex
CREATE INDEX "cargo_provas_examBaseId_idx" ON "cargo_provas"("examBaseId");

-- CreateIndex
CREATE UNIQUE INDEX "cargo_provas_cargoId_examBaseId_key" ON "cargo_provas"("cargoId", "examBaseId");

-- CreateIndex
CREATE INDEX "exam_syllabus_groups_cargoId_idx" ON "exam_syllabus_groups"("cargoId");

-- AddForeignKey
ALTER TABLE "cargos" ADD CONSTRAINT "cargos_concursoId_fkey" FOREIGN KEY ("concursoId") REFERENCES "concursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargo_provas" ADD CONSTRAINT "cargo_provas_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "cargos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargo_provas" ADD CONSTRAINT "cargo_provas_examBaseId_fkey" FOREIGN KEY ("examBaseId") REFERENCES "exam_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_syllabus_groups" ADD CONSTRAINT "exam_syllabus_groups_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "cargos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- BACKFILL (R3.2 — aditivo, sem drops; colunas antigas seguem em dual-write)
--
-- IDs determinísticos tornam o backfill idempotente (ON CONFLICT DO NOTHING):
--   cargo de grupo      → id = cargoGroupId
--   cargo standalone    → id = id da própria ExamBase (o fallback por UUID de
--                         getCargoDetail continua funcionando por construção)
-- ============================================================================

-- 1a. Concursos para provas órfãs com institution (o find-or-create do
--     lazy-link, em SQL). slug fica NULL — o self-heal da leitura gera um.
--     Ano em UTC (T1.2): examDate é timestamp armazenado em UTC.
INSERT INTO "concursos" (id, slug, institution, year, "governmentScope", state, city, "examBoardId")
SELECT gen_random_uuid(), NULL, t.institution, t.year, t."governmentScope", t.state, t.city, t."examBoardId"
FROM (
  SELECT DISTINCT ON (institution, (EXTRACT(YEAR FROM "examDate"))::int, "examBoardId")
    institution,
    (EXTRACT(YEAR FROM "examDate"))::int AS year,
    "governmentScope", state, city, "examBoardId"
  FROM "exam_bases"
  WHERE institution IS NOT NULL AND "concursoId" IS NULL
  ORDER BY institution, (EXTRACT(YEAR FROM "examDate"))::int, "examBoardId", "examDate" ASC, id ASC
) t
WHERE NOT EXISTS (
  SELECT 1 FROM "concursos" c
  WHERE c.institution = t.institution
    AND c.year = t.year
    AND c."examBoardId" IS NOT DISTINCT FROM t."examBoardId"
);

-- 1b. Vincula toda prova órfã ao seu concurso (o updateMany do lazy-link).
UPDATE "exam_bases" eb
SET "concursoId" = c.id
FROM "concursos" c
WHERE eb."concursoId" IS NULL
  AND eb.institution IS NOT NULL
  AND c.institution = eb.institution
  AND c.year = (EXTRACT(YEAR FROM eb."examDate"))::int
  AND c."examBoardId" IS NOT DISTINCT FROM eb."examBoardId";

-- 2. Cargos: 1 por grupo (ficha do representante = primária; fallback
--    determinístico examDate asc, id asc) + 1 por prova standalone.
--    Prova sem concursoId (sem institution) fica sem cargo — invisível nas
--    páginas de concurso, comportamento atual preservado.
WITH rep AS (
  SELECT DISTINCT ON (COALESCE("cargoGroupId", id))
    COALESCE("cargoGroupId", id) AS cargo_id,
    id AS rep_id
  FROM "exam_bases"
  WHERE "concursoId" IS NOT NULL
  ORDER BY COALESCE("cargoGroupId", id), "isPrimaryProva" DESC, "examDate" ASC, id ASC
)
INSERT INTO "cargos" (
  id, slug, role, description, requirements, "salaryBase", workload,
  "vacancyCount", "hasReserveList", "applicantCount", "registrationFee",
  "minPassingGradeNonQuota", "actualCutScore", "isNursingRelevant",
  "concursoId", "updatedAt"
)
SELECT
  rep.cargo_id, eb.slug, eb.role, eb.description, eb.requirements, eb."salaryBase", eb.workload,
  eb."vacancyCount", eb."hasReserveList", eb."applicantCount", eb."registrationFee",
  eb."minPassingGradeNonQuota", eb."actualCutScore", eb."isNursingRelevant",
  eb."concursoId", CURRENT_TIMESTAMP
FROM rep
JOIN "exam_bases" eb ON eb.id = rep.rep_id
ON CONFLICT (id) DO NOTHING;

-- 3. Vínculos cargo_provas: isOficial = ser o representante (exatamente 1 por
--    cargo, mesmo que os dados antigos tenham 0 ou 2 isPrimaryProva no grupo);
--    order = oficial primeiro, depois examDate asc.
WITH rep AS (
  SELECT DISTINCT ON (COALESCE("cargoGroupId", id))
    COALESCE("cargoGroupId", id) AS cargo_id,
    id AS rep_id
  FROM "exam_bases"
  WHERE "concursoId" IS NOT NULL
  ORDER BY COALESCE("cargoGroupId", id), "isPrimaryProva" DESC, "examDate" ASC, id ASC
)
INSERT INTO "cargo_provas" (id, "cargoId", "examBaseId", "provaLabel", "isOficial", "order")
SELECT
  gen_random_uuid(),
  c.id,
  eb.id,
  eb."provaLabel",
  (eb.id = rep.rep_id),
  (ROW_NUMBER() OVER (
     PARTITION BY c.id
     ORDER BY (eb.id = rep.rep_id) DESC, eb."examDate" ASC, eb.id ASC
   ) - 1)::int
FROM "exam_bases" eb
JOIN rep ON rep.cargo_id = COALESCE(eb."cargoGroupId", eb.id)
JOIN "cargos" c ON c.id = rep.cargo_id
WHERE eb."concursoId" IS NOT NULL
ON CONFLICT ("cargoId", "examBaseId") DO NOTHING;

-- 4. Conteúdo programático: dono passa a ser o Cargo, backfill via prova
--    OFICIAL (o syllabus canônico era o da primária). Syllabus de provas
--    não-oficiais fica com cargoId NULL (mantém examBaseId até R6.1).
UPDATE "exam_syllabus_groups" sg
SET "cargoId" = cp."cargoId"
FROM "cargo_provas" cp
WHERE cp."examBaseId" = sg."examBaseId"
  AND cp."isOficial"
  AND sg."cargoId" IS NULL;

-- 5. Janela/edital do Concurso (R3.1 §2b): agregado das provas vinculadas —
--    start mais cedo, end/resultado mais tarde; editalUrl da prova mais
--    antiga com valor (mesma regra do self-heal), só onde ainda é NULL.
UPDATE "concursos" c
SET "registrationStart" = agg.min_start,
    "registrationEnd"   = agg.max_end,
    "resultDate"        = agg.max_result
FROM (
  SELECT "concursoId",
         MIN("registrationStart") AS min_start,
         MAX("registrationEnd")   AS max_end,
         MAX("resultDate")        AS max_result
  FROM "exam_bases"
  WHERE "concursoId" IS NOT NULL
  GROUP BY "concursoId"
) agg
WHERE agg."concursoId" = c.id
  AND c."registrationStart" IS NULL
  AND c."registrationEnd" IS NULL
  AND c."resultDate" IS NULL;

UPDATE "concursos" c
SET "editalUrl" = sub."editalUrl"
FROM (
  SELECT DISTINCT ON ("concursoId") "concursoId", "editalUrl"
  FROM "exam_bases"
  WHERE "concursoId" IS NOT NULL AND "editalUrl" IS NOT NULL
  ORDER BY "concursoId", "examDate" ASC, id ASC
) sub
WHERE sub."concursoId" = c.id
  AND c."editalUrl" IS NULL;

-- 6. Invariante no banco: no máximo 1 prova oficial por cargo (a lição do
--    antigo T1.3, agora por construção).
CREATE UNIQUE INDEX "cargo_provas_one_oficial_per_cargo"
ON "cargo_provas" ("cargoId")
WHERE "isOficial";
