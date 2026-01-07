import {Inject, Injectable, Signal, signal} from '@angular/core';
import {EXAM_REPOSITORY_TOKEN, ExamRepositoryInterface, Uuid} from '../domain/exam.interface';
import {finalize, take} from 'rxjs';
import {ExamResponse} from '../../../api/exams.service';
import {ExamInExecution, toExamInExecution} from './adapters/exam.adapter';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ExamService {
  private _loading = signal(false);
  private _originalExam = signal<ExamResponse | null>(null);
  private _examInExecution = signal<ExamInExecution | null>(null);

  public loading: Signal<boolean> = this._loading.asReadonly();
  public examInExecution: Signal<ExamInExecution | null> = this._examInExecution.asReadonly();

  constructor(@Inject(EXAM_REPOSITORY_TOKEN) private repository: ExamRepositoryInterface) {}

  loadExam(examId: string) {
    this._loading.set(true);
    console.log("repository",this.repository);

    this.repository.getExam$(examId).pipe(
      take(1),
      finalize(() => this._loading.set(false))).
      subscribe({
        next: (examResponse: ExamResponse) => {
          this._originalExam.set(examResponse);
          const firstId = examResponse.questions[0]?.id ?? null;
          this._examInExecution.set(
            toExamInExecution({
              examResponse,
              currentQuestionId: firstId,
              answers: {},
            }),
          );
        },
        error: (error: Error) => {
          console.error('Error loading exam', error);
        },
        complete: () => {
          console.log('Exam loaded');
        },
    })
  }

  answerQuestion({questionId, selectedOptionId}:{questionId: string, selectedOptionId: string}):void {
    this._examInExecution.update((prev) => {
      if(!prev) return null;
      const questionIndex = prev.questions.findIndex((q) => q.id === questionId);
      if(questionIndex < 0) return prev;

      const previousQuestion = prev.questions[questionIndex];

      const newQuestion = {
        ...previousQuestion,
        answered: true,
        selectedOptionId,
      };

      const newQuestions = prev.questions.slice();
      newQuestions[questionIndex] = newQuestion;

      return { ...prev, questions: newQuestions };
    });
  }

  unselectAnsweredQuestion(questionId: string):void {
    this._examInExecution.update((prev) => {
      if(!prev) return null;
      const questionIndex = prev.questions.findIndex((q) => q.id === questionId);
      if(questionIndex < 0) return prev;

      const previousQuestion = prev.questions[questionIndex];

      const newQuestion = {
        ...previousQuestion,
        answered: false,
        selectedOptionId: null
      };

      const newQuestions = prev.questions.slice();
      newQuestions[questionIndex] = newQuestion;

      return { ...prev, questions: newQuestions };
    });
  }

  setCurrentQuestion(questionId: string): void {
    this._examInExecution.update((previous) => {
      if (!previous) return null;

      const nextIdx = previous.questions.findIndex((q) => q.id === questionId);
      if (nextIdx < 0) return previous;

      const prevIdx = previous.questions.findIndex((q) => q.isCurrentQuestion);

      let questionsNext = previous.questions;

      // previous current -> false
      if (prevIdx >= 0 && prevIdx !== nextIdx) {
        const qPrev = previous.questions[prevIdx];
        questionsNext = questionsNext.slice();
        questionsNext[prevIdx] = { ...qPrev, isCurrentQuestion: false };
      }

      // new current -> true
      if (questionsNext === previous.questions) questionsNext = questionsNext.slice();
      questionsNext[nextIdx] = { ...questionsNext[nextIdx], isCurrentQuestion: true };

      return { ...previous, questions: questionsNext };
    });
  }

  finishExam():void {
    this._loading.set(true);

    const answers = this._examInExecution()?.questions.map((q) => ({
      questionId: q.id,
      selectedOptionId: q.selectedOptionId ?? '',
    })) ?? null;

    if(!answers) return;

    const examId = this._examInExecution()?.exam.id;
    if(!examId) return;

    this.repository.finishExam$(examId, {
      answers,
    }).pipe(
      take(1),
      finalize(() => this._loading.set(false))
    ).subscribe((response: any) => {
      console.log('Exam finished', response);
    });
  }

  startExam$(examId: Uuid):Observable<void> {
    return this.repository.startExam$(examId).pipe(
      take(1),
    )
  }
}
