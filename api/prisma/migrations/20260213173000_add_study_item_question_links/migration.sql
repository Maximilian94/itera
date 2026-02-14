-- CreateTable
CREATE TABLE "training_study_item_question_links" (
  "trainingStudyItemId" UUID NOT NULL,
  "examBaseQuestionId" UUID NOT NULL,
  "selectedAlternativeId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "training_study_item_question_links_pkey" PRIMARY KEY ("trainingStudyItemId","examBaseQuestionId")
);

-- CreateIndex
CREATE INDEX "training_study_item_question_links_trainingStudyItemId_idx" ON "training_study_item_question_links"("trainingStudyItemId");

-- CreateIndex
CREATE INDEX "training_study_item_question_links_examBaseQuestionId_idx" ON "training_study_item_question_links"("examBaseQuestionId");

-- AddForeignKey
ALTER TABLE "training_study_item_question_links" ADD CONSTRAINT "training_study_item_question_links_trainingStudyItemId_fkey" FOREIGN KEY ("trainingStudyItemId") REFERENCES "training_study_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_study_item_question_links" ADD CONSTRAINT "training_study_item_question_links_examBaseQuestionId_fkey" FOREIGN KEY ("examBaseQuestionId") REFERENCES "exam_base_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_study_item_question_links" ADD CONSTRAINT "training_study_item_question_links_selectedAlternativeId_fkey" FOREIGN KEY ("selectedAlternativeId") REFERENCES "exam_base_question_alternatives"("id") ON DELETE SET NULL ON UPDATE CASCADE;
