-- CreateTable
CREATE TABLE "subject_feedback_recommendation_question_links" (
    "subjectFeedbackRecommendationId" UUID NOT NULL,
    "examBaseQuestionId" UUID NOT NULL,

    CONSTRAINT "subject_feedback_recommendation_question_links_pkey" PRIMARY KEY ("subjectFeedbackRecommendationId","examBaseQuestionId")
);

-- CreateIndex
CREATE INDEX "subject_feedback_recommendation_question_links_subjectFeedb_idx" ON "subject_feedback_recommendation_question_links"("subjectFeedbackRecommendationId");

-- CreateIndex
CREATE INDEX "subject_feedback_recommendation_question_links_examBaseQues_idx" ON "subject_feedback_recommendation_question_links"("examBaseQuestionId");

-- AddForeignKey
ALTER TABLE "subject_feedback_recommendation_question_links" ADD CONSTRAINT "subject_feedback_recommendation_question_links_subjectFeed_fkey" FOREIGN KEY ("subjectFeedbackRecommendationId") REFERENCES "subject_feedback_recommendations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_feedback_recommendation_question_links" ADD CONSTRAINT "subject_feedback_recommendation_question_links_examBaseQue_fkey" FOREIGN KEY ("examBaseQuestionId") REFERENCES "exam_base_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
