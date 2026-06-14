-- AlterTable
ALTER TABLE "exam_bases" ADD COLUMN     "cargoGroupId" UUID,
ADD COLUMN     "isPrimaryProva" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "provaLabel" TEXT;

-- CreateIndex
CREATE INDEX "exam_bases_cargoGroupId_idx" ON "exam_bases"("cargoGroupId");
