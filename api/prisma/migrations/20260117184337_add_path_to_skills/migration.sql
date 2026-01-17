-- 1. Add columns parentId and path (path as optional first to not break migrations)
ALTER TABLE "skills" ADD COLUMN "parentId" UUID;
ALTER TABLE "skills" ADD COLUMN "path" TEXT;

-- 2. Fill path with the own ID for the existing records
-- This ensures that no record has a null path
UPDATE "skills" SET "path" = CAST("id" AS TEXT);

-- 3. Now that the data is filled, we apply the NOT NULL and UNIQUE constraints
ALTER TABLE "skills" ALTER COLUMN "path" SET NOT NULL;
CREATE UNIQUE INDEX "skills_path_key" ON "skills"("path");
CREATE INDEX "skills_path_idx" ON "skills"("path");

-- 4. Add foreign key for the hierarchy
ALTER TABLE "skills" ADD CONSTRAINT "skills_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
