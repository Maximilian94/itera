-- CreateEnum
CREATE TYPE "PciEntryStatus" AS ENUM ('PENDING', 'PROMOTED', 'SKIPPED', 'UNAVAILABLE');

-- AlterTable
ALTER TABLE "exam_bases" ADD COLUMN     "concursoId" UUID;

-- CreateTable
CREATE TABLE "concursos" (
    "id" UUID NOT NULL,
    "institution" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "governmentScope" "GovernmentScope" NOT NULL,
    "state" TEXT,
    "city" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "examBoardId" UUID,

    CONSTRAINT "concursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pci_exam_entries" (
    "id" UUID NOT NULL,
    "downloadUrl" TEXT NOT NULL,
    "examName" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "institution" TEXT NOT NULL,
    "examBoardRaw" TEXT NOT NULL,
    "cargoSlug" TEXT NOT NULL,
    "cargoRaw" TEXT,
    "governmentScope" "GovernmentScope",
    "state" TEXT,
    "city" TEXT,
    "priorityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "PciEntryStatus" NOT NULL DEFAULT 'PENDING',
    "promotedToId" UUID,
    "concursoId" UUID,
    "examBoardId" UUID,
    "scraperRunId" UUID,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pageUrl" TEXT NOT NULL,

    CONSTRAINT "pci_exam_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scraper_runs" (
    "id" UUID NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "cargoSlugs" TEXT[],
    "totalPages" INTEGER NOT NULL DEFAULT 0,
    "totalEntries" INTEGER NOT NULL DEFAULT 0,
    "newEntries" INTEGER NOT NULL DEFAULT 0,
    "lastCargoSlug" TEXT,
    "lastPage" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'running',
    "errorLog" TEXT,

    CONSTRAINT "scraper_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "concursos_year_idx" ON "concursos"("year");

-- CreateIndex
CREATE UNIQUE INDEX "concursos_institution_year_examBoardId_key" ON "concursos"("institution", "year", "examBoardId");

-- CreateIndex
CREATE UNIQUE INDEX "pci_exam_entries_downloadUrl_key" ON "pci_exam_entries"("downloadUrl");

-- CreateIndex
CREATE INDEX "pci_exam_entries_status_priorityScore_idx" ON "pci_exam_entries"("status", "priorityScore" DESC);

-- CreateIndex
CREATE INDEX "pci_exam_entries_year_idx" ON "pci_exam_entries"("year");

-- CreateIndex
CREATE INDEX "pci_exam_entries_examBoardRaw_idx" ON "pci_exam_entries"("examBoardRaw");

-- CreateIndex
CREATE INDEX "pci_exam_entries_cargoSlug_idx" ON "pci_exam_entries"("cargoSlug");

-- CreateIndex
CREATE INDEX "pci_exam_entries_scraperRunId_idx" ON "pci_exam_entries"("scraperRunId");

-- CreateIndex
CREATE INDEX "exam_bases_concursoId_idx" ON "exam_bases"("concursoId");

-- AddForeignKey
ALTER TABLE "concursos" ADD CONSTRAINT "concursos_examBoardId_fkey" FOREIGN KEY ("examBoardId") REFERENCES "exam_boards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_bases" ADD CONSTRAINT "exam_bases_concursoId_fkey" FOREIGN KEY ("concursoId") REFERENCES "concursos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pci_exam_entries" ADD CONSTRAINT "pci_exam_entries_concursoId_fkey" FOREIGN KEY ("concursoId") REFERENCES "concursos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pci_exam_entries" ADD CONSTRAINT "pci_exam_entries_examBoardId_fkey" FOREIGN KEY ("examBoardId") REFERENCES "exam_boards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pci_exam_entries" ADD CONSTRAINT "pci_exam_entries_scraperRunId_fkey" FOREIGN KEY ("scraperRunId") REFERENCES "scraper_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
