-- CreateEnum
CREATE TYPE "GovernmentScope" AS ENUM ('MUNICIPAL', 'STATE', 'FEDERAL');

-- AlterTable
ALTER TABLE "exam_bases"
ADD COLUMN     "governmentScope" "GovernmentScope" NOT NULL DEFAULT 'FEDERAL',
ADD COLUMN     "state" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "salaryBase" DECIMAL(10,2);

-- DropDefault
ALTER TABLE "exam_bases" ALTER COLUMN "governmentScope" DROP DEFAULT;

