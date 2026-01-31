/*
  Warnings:

  - You are about to drop the column `isCorrect` on the `attempts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "attempts" DROP COLUMN "isCorrect",
ALTER COLUMN "selectedOptionId" DROP NOT NULL;
