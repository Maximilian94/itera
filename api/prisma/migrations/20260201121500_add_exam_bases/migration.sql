-- CreateTable
CREATE TABLE "exam_bases" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "institution" TEXT,
    "role" TEXT NOT NULL,
    "examDate" TIMESTAMP(3) NOT NULL,
    "examBoardId" UUID,

    CONSTRAINT "exam_bases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exam_bases_examBoardId_idx" ON "exam_bases"("examBoardId");

-- AddForeignKey
ALTER TABLE "exam_bases" ADD CONSTRAINT "exam_bases_examBoardId_fkey" FOREIGN KEY ("examBoardId") REFERENCES "exam_boards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

