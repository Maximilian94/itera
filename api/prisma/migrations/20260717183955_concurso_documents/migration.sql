-- CreateTable
CREATE TABLE "concurso_documents" (
    "id" UUID NOT NULL,
    "concursoId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "url" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'OUTRO',
    "publishedAt" TIMESTAMP(3),
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "concurso_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "concurso_documents_concursoId_publishedAt_idx" ON "concurso_documents"("concursoId", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "concurso_documents_concursoId_url_key" ON "concurso_documents"("concursoId", "url");

-- AddForeignKey
ALTER TABLE "concurso_documents" ADD CONSTRAINT "concurso_documents_concursoId_fkey" FOREIGN KEY ("concursoId") REFERENCES "concursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
