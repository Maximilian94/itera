import {APIQuestionOption, Uuid} from "../../web/src/app/services/exam/domain/exam.interface";

export type Exam = ExamNotStarted | ExamInProgress | ExamFinished;

export interface Option {
    id: string;
    text: string;
}

export interface Question {
    id: Uuid;
    statement: string;
    // skillId: Uuid;
    options: Option[];
}

interface ExamBase {
    id: string;
    createdAt: Date;
    startedAt: Date | null;
    finishedAt: Date | null;
    status: ExamStatus;
    questionCount: number;
    questions: Question[]; // TODO
    //    score: number; // TODO: add score
    //    correctCount: number; // TODO: add correct count
    //    incorrectCount: number; // TODO: add incorrect count
    //    unansweredCount: number; // TODO: add unanswered count
}

export interface ExamNotStarted extends ExamBase {
    status: 'not_started';
    startedAt: null;
    finishedAt: null;
}

export interface ExamInProgress extends ExamBase {
    status: 'in_progress';
    finishedAt: null;
    startedAt: Date
}
export interface ExamFinished extends ExamBase {
    status: 'finished';
    finishedAt: Date;
    startedAt: Date
}

export type ExamStatus = 'not_started' | 'in_progress' | 'finished';

export interface AttemptBase {
    id: string;
    createdAt: Date;
    questionId: string;
    selectedOptionId: string | null;
}

export interface AttemptAnswerInProgress extends AttemptBase {
    isCorrect: null;
    correctOptionId: null;
}

export interface AttemptAnswerFinished extends AttemptBase {
    isCorrect: boolean;
    correctOptionId: string;
}

export type AttemptAnswer = AttemptAnswerInProgress | AttemptAnswerFinished;
