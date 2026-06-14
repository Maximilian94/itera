-- CreateTable
CREATE TABLE "exam_syllabus_groups" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "examBaseId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "topics" TEXT NOT NULL,

    CONSTRAINT "exam_syllabus_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exam_syllabus_groups_examBaseId_idx" ON "exam_syllabus_groups"("examBaseId");

-- AddForeignKey
ALTER TABLE "exam_syllabus_groups" ADD CONSTRAINT "exam_syllabus_groups_examBaseId_fkey" FOREIGN KEY ("examBaseId") REFERENCES "exam_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
