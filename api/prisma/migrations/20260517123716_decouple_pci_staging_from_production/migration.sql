/*
  Warnings:

  - You are about to drop the column `concursoId` on the `pci_exam_entries` table. All the data in the column will be lost.
  - You are about to drop the column `examBoardId` on the `pci_exam_entries` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "pci_exam_entries" DROP CONSTRAINT "pci_exam_entries_concursoId_fkey";

-- DropForeignKey
ALTER TABLE "pci_exam_entries" DROP CONSTRAINT "pci_exam_entries_examBoardId_fkey";

-- AlterTable
ALTER TABLE "pci_exam_entries" DROP COLUMN "concursoId",
DROP COLUMN "examBoardId";
