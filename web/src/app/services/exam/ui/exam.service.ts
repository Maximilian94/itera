import {Inject, Injectable, Signal, signal} from '@angular/core';
import {APIExamResponse, APIFinishExameAnswerRequest, AttemptsInProgressResponse, AttemptsResponse, EXAM_REPOSITORY_TOKEN, ExamRepositoryInterface, Uuid} from '../domain/exam.interface';
import {finalize, take, tap} from 'rxjs';
import {ExamInExecution, toExamInExecution} from './adapters/exam.adapter';

type questionId = string;
export type AttemptsObject = Record<questionId, AttemptsResponse | AttemptsInProgressResponse>;

@Injectable({
  providedIn: 'root',
})
export class ExamService {
  private _loading = signal(false);
  private _originalExam = signal<APIExamResponse | null>(null);
  private _examInExecution = signal<ExamInExecution | null>(null);
  private _attempts = signal<AttemptsObject>({});

  public loading: Signal<boolean> = this._loading.asReadonly();
  public examInExecution: Signal<ExamInExecution | null> = this._examInExecution.asReadonly();
  public attempts = this._attempts.asReadonly();
  public errorMessage = signal<string | null>(null);



  constructor(@Inject(EXAM_REPOSITORY_TOKEN) private repository: ExamRepositoryInterface) {}

  loadExam(examId: string) {
    this._loading.set(true);

    this.repository.getExam$(examId).pipe(
      take(1),
      finalize(() => this._loading.set(false)),
      tap((res) => {
        if(res.exam.status !== "finished"){
          this._attempts.set(this.generateAttemptsData(res));
        } else {
          this.repository.getAttempts$(examId).subscribe((attempts) => {
            this._attempts.set(attempts.reduce((acc, attempt) => {
              acc[attempt.questionId] = attempt;
              return acc;
            }, {} as AttemptsObject));
          });
        }
      }),
    ).subscribe({
       next: (examResponse: APIExamResponse) => {
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
        error: (_error: Error) => {},
        complete: () => {},
    })
  }

  answerQuestion({questionId, selectedOptionId}:{questionId: string, selectedOptionId: string}):void {

    const oldAttempt = this._attempts()[questionId];
    const newAttemptsObject:AttemptsObject = {...this._attempts()};
    newAttemptsObject[questionId] = { ...oldAttempt, selectedOptionId };
    this._attempts.update(() => newAttemptsObject)

  }

  unselectAnsweredQuestion(questionId: string):void {
    const oldAttempt = this._attempts()[questionId];
    const newAttemptsObject:AttemptsObject = {...this._attempts()};
    newAttemptsObject[questionId] = { ...oldAttempt, selectedOptionId: null };
    this._attempts.update(() => newAttemptsObject)
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

    const attempts = this.attempts();
    const examId = this._examInExecution()?.exam.id;

    if(!examId) {
      this.errorMessage.set('Exam not found');
      return;
    }

    const answers: APIFinishExameAnswerRequest[] = Object.entries(attempts).map(([questionId, selectedOptionId]) => ({
      questionId: questionId as Uuid,
      selectedOptionId: selectedOptionId.selectedOptionId as Uuid,
    }));

    if(!answers.length) {
      this.errorMessage.set('You must answer all questions to finish the exam');
      return;
    }

    if(answers.some((answer) => answer.selectedOptionId === null)) {
      this.errorMessage.set('You must select an option for each question');
      return;
    }

    this.repository.finishExam$(examId, {
      answers,
    }).pipe(
      take(1),
      finalize(() => this._loading.set(false)),
    ).subscribe({
      next: () => {
        this.errorMessage.set(null);
      },
      error: (_error: Error) => {
        this.errorMessage.set('Error finishing exam');
      },
      complete: () => {
      },
    });
  }

  startExam():void {
    const examInExecution = this._examInExecution();
    // TODO -> handle error
    if(!examInExecution) return;

    const examId = examInExecution.exam.id;

    this.repository.startExam$(examId).subscribe({
      next: () => {
        this._examInExecution.set({ ...examInExecution, exam: { ...examInExecution.exam, status: 'in_progress' } });
      },
      error: (error: Error) => {
        console.error('Error starting exam', error);
      },
      complete: () => {
        console.log('Exam started');
      },
    });
  }

  private generateAttemptsData(exam:APIExamResponse):AttemptsObject {
    const attempts: AttemptsObject = {};
    exam.questions.forEach((q) => {
      attempts[q.id] = {
        questionId: q.id,
        selectedOptionId: null,
        isCorrect: undefined,
        correctOptionId: null,
      };
    });
    return attempts;
  }
}
