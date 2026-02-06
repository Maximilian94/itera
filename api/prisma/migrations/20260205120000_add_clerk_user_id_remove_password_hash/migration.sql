-- AlterTable
ALTER TABLE "users" ADD COLUMN "clerkUserId" TEXT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "passwordHash";

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkUserId_key" ON "users"("clerkUserId");
