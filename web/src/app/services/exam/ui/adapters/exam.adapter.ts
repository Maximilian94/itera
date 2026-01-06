import type { ExamResponse } from '../../../../api/exams.service';
import type { Exam, Question, Uuid } from '../../../../api/api.types';

export type AnswerMap = Partial<Record<Uuid, Uuid>>;

export interface QuestionInExecution extends Question {
  answered: boolean;
  selectedOptionId: Uuid | null;
  isCurrentQuestion: boolean;
}

export interface ExamInExecution {
  exam: Exam;
  questions: QuestionInExecution[];
}

export interface ToExamInExecutionInput {
  /** Raw API payload. */
  examResponse: ExamResponse;
  /**
   * questionId that should be marked as the current question.
   * Defaults to the first question id (if any).
   */
  currentQuestionId?: Uuid | null;
  /**
   * Map: questionId -> selectedOptionId.
   * Used to pre-mark answered questions and compute their per-question UI state.
   */
  answers?: AnswerMap;
}

/**
 * Adapter that enriches the API exam payload with UI-friendly state for the exam execution screen.
 *
 * Note: This is *presentation/UI state* (answered/current), not domain business rules.
 */
export function toExamInExecution(input: ToExamInExecutionInput): ExamInExecution {
  const { examResponse, answers = {} } = input;

  const fallbackCurrent = examResponse.questions[0]?.id ?? null;
  const currentQuestionId = input.currentQuestionId ?? fallbackCurrent;

  return {
    exam: examResponse.exam,
    questions: examResponse.questions.map((q) => {
      const selectedOptionId = answers[q.id] ?? null;
      const answered = !!selectedOptionId;
      const isCurrentQuestion = currentQuestionId !== null && q.id === currentQuestionId;

      return {
        ...q,
        answered,
        selectedOptionId,
        isCurrentQuestion,
      };
    }),
  };
}


