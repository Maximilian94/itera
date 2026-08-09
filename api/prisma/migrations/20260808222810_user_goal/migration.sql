-- CreateTable
CREATE TABLE "user_goals" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "userId" UUID NOT NULL,
    "cargoId" UUID NOT NULL,

    CONSTRAINT "user_goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_goals_userId_idx" ON "user_goals"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_goals_userId_cargoId_key" ON "user_goals"("userId", "cargoId");

-- AddForeignKey
ALTER TABLE "user_goals" ADD CONSTRAINT "user_goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_goals" ADD CONSTRAINT "user_goals_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "cargos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
