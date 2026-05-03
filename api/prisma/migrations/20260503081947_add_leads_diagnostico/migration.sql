-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "fonteLp" TEXT,
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "utmTerm" TEXT,
    "fbclid" TEXT,
    "gclid" TEXT,
    "landingPage" TEXT,
    "referrer" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "fbp" TEXT,
    "fbc" TEXT,
    "qualificacao" JSONB,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_tags" (
    "leadId" UUID NOT NULL,
    "tagId" UUID NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_tags_pkey" PRIMARY KEY ("leadId","tagId")
);

-- CreateTable
CREATE TABLE "lead_events" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostico_respostas" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "respostas" JSONB NOT NULL,
    "resultado" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diagnostico_respostas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leads_email_key" ON "leads"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE INDEX "lead_tags_tagId_idx" ON "lead_tags"("tagId");

-- CreateIndex
CREATE INDEX "lead_events_leadId_createdAt_idx" ON "lead_events"("leadId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "lead_events_type_idx" ON "lead_events"("type");

-- CreateIndex
CREATE INDEX "diagnostico_respostas_leadId_idx" ON "diagnostico_respostas"("leadId");

-- AddForeignKey
ALTER TABLE "lead_tags" ADD CONSTRAINT "lead_tags_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_tags" ADD CONSTRAINT "lead_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostico_respostas" ADD CONSTRAINT "diagnostico_respostas_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed das tags base. ON CONFLICT garante idempotência se a migration for re-aplicada manualmente.
INSERT INTO "tags" ("id", "name", "createdAt") VALUES
  -- Origem
  (gen_random_uuid(), 'lp_edital', NOW()),
  (gen_random_uuid(), 'lp_plantao', NOW()),
  (gen_random_uuid(), 'wizard_direto', NOW()),
  -- Marketing source
  (gen_random_uuid(), 'paid_meta', NOW()),
  (gen_random_uuid(), 'paid_google', NOW()),
  (gen_random_uuid(), 'organic_social', NOW()),
  (gen_random_uuid(), 'direct', NOW()),
  -- Diagnóstico (ciclo)
  (gen_random_uuid(), 'diagnostico_concluido', NOW()),
  (gen_random_uuid(), 'qualificacao_concluida', NOW()),
  -- Perfil
  (gen_random_uuid(), 'perfil_sobrecarregado', NOW()),
  (gen_random_uuid(), 'perfil_esforcado_sem_direcao', NOW()),
  (gen_random_uuid(), 'perfil_em_evolucao', NOW()),
  (gen_random_uuid(), 'perfil_estrategico', NOW()),
  -- Qualificação
  (gen_random_uuid(), 'enfermeiro_formado', NOW()),
  (gen_random_uuid(), 'enfermeiro_em_formacao', NOW()),
  (gen_random_uuid(), 'nao_enfermeiro', NOW()),
  (gen_random_uuid(), 'trabalha_saude', NOW()),
  (gen_random_uuid(), 'estudando_concurso', NOW()),
  (gen_random_uuid(), 'intencao_concurso_3m', NOW()),
  (gen_random_uuid(), 'intencao_concurso_6m', NOW()),
  (gen_random_uuid(), 'intencao_concurso_12m', NOW()),
  -- Engajamento
  (gen_random_uuid(), 'email_aberto', NOW()),
  (gen_random_uuid(), 'email_clicado', NOW()),
  (gen_random_uuid(), 'unsubscribed', NOW())
ON CONFLICT ("name") DO NOTHING;
