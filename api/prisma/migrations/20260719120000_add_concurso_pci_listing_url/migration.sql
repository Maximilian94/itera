-- AlterTable
ALTER TABLE "concursos" ADD COLUMN "pciListingUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "concursos_pciListingUrl_key" ON "concursos"("pciListingUrl");
