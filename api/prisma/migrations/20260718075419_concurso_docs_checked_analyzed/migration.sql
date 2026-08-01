-- AlterTable
ALTER TABLE "concurso_documents" ADD COLUMN     "analyzedAt" TIMESTAMP(3),
ADD COLUMN     "changesAppliedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "concursos" ADD COLUMN     "documentsCheckedAt" TIMESTAMP(3);
