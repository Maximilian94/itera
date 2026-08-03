-- CreateEnum
CREATE TYPE "PreferenceMobility" AS ENUM ('ONLY_MY_CITY', 'MY_STATE', 'ANYWHERE');

-- CreateEnum
CREATE TYPE "CareerStage" AS ENUM ('STUDENT', 'RECENT_GRAD', 'COREN_REGISTERED');

-- CreateEnum
CREATE TYPE "ExamHorizon" AS ENUM ('ASAP', 'LONG_TERM');

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "state" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "mobility" "PreferenceMobility" NOT NULL,
    "careerStage" "CareerStage" NOT NULL,
    "minSalary" DECIMAL(10,2),
    "horizon" "ExamHorizon" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
