import {computed, Inject, Injectable, Signal, signal} from '@angular/core';
import {EXAM_REPOSITORY_TOKEN, ExamRepositoryInterface} from '../domain/exam.interface';
import {finalize, forkJoin, take} from 'rxjs';
import {ATTEMPT_REPOSITORY_TOKEN, AttemptRepositoryInterface} from '../domain/attempt.interface';
import {AttemptAnswer, Exam, Question} from '@domain/exam/exam.interface';

export type QuestionWithAttempt = {
  questionData: Question,
  attemptData: AttemptAnswer | undefined,
}

@Injectable({
  providedIn: 'root',
})
export class ExamService {
  private _loading = signal(false);
  private _originalExam = signal<Exam | null>(null);
  private _attempts = signal<AttemptAnswer[]>([]);
  private _currentQuestionIndex = signal<number | null>(null);

  public loading: Signal<boolean> = this._loading.asReadonly();
  public examInExecution: Signal<Exam | null> = this._originalExam.asReadonly();
  public questionsWithAttempt:Signal<QuestionWithAttempt[]> = this.questionWithAttemptComputed();

  public errorMessage = signal<string | null>(null);
  public currentQuestion:Signal<QuestionWithAttempt | null> = this.computeCurrentQuestionByIndex();
  // TODO -> We should consider add index on question
  public currentQuestionIndex = this._currentQuestionIndex.asReadonly();



  constructor(
    @Inject(EXAM_REPOSITORY_TOKEN) private repository: ExamRepositoryInterface,
    @Inject(ATTEMPT_REPOSITORY_TOKEN) private attemptRepository: AttemptRepositoryInterface,
  ) {}

  loadExam(examId: string) {
    this._loading.set(true);

    const getExamObservable = this.repository.getExamV2$(examId);
    const getAttemptsObservable = this.repository.getAttemptsV2$(examId);

    forkJoin([getExamObservable, getAttemptsObservable]).pipe(
      take(1),
      finalize(() => this._loading.set(false)),
    ).subscribe({
      error: () => {},
      next: ([exam, attemptAnswers]) => {
        this._originalExam.set(exam)
        this._attempts.set(attemptAnswers)
        this.setCurrentQuestionIndex(0)
      },
    })

    // this.repository.getExam$(examId).pipe(
    //   take(1),
    //   // finalize(() => this._loading.set(false)),
    //   tap((res) => {
    //     if(res.exam.status !== "finished"){
    //       this._attempts.set(this.generateAttemptsData(res));
    //     } else {
    //       this.repository.getAttempts$(examId).subscribe((attempts) => {
    //         this._attempts.set(this.transformAttemptsData(attempts));
    //       });
    //     }
    //   }),
    // ).subscribe({
    //    next: (examResponse: APIExamResponse) => {
    //       this._originalExam.set(examResponse);
    //     },
    //     error: (_error: Error) => {},
    //     complete: () => {},
    // })
  }

  answerQuestionV2(input: { attemptId: string, optionSelectedId: string | null }){
    const originalAttempts = this._attempts();

    const optimisticAttempts = originalAttempts.map(attempt => {
      if (attempt.id === input.attemptId) {
        return {
          ...attempt,
          selectedOptionId: input.optionSelectedId,
          status: 'pending'
        };
      }
      return attempt;
    });

    this._attempts.set(optimisticAttempts);

    this.attemptRepository.answerAttempt$({ attemptId: input.attemptId, optionSelectedId: input.optionSelectedId })
      .subscribe({
        next: (confirmedAttemptAnswer) => {
          const finalAttempts = this._attempts().map(attempt => {
            if (attempt.id === input.attemptId) {
              return confirmedAttemptAnswer;
            }
            return attempt;
          });

          this._attempts.set(finalAttempts);
        },
        error: (_) => {
          // TODO Show error to the user
          this._attempts.set(originalAttempts);
        }
        }
      );
  }

  finishExam():void {
    this._loading.set(true);

    const exam= this._originalExam()
    // TODO -> Handle Error
    if(!exam) return;

    this.repository.finishExam$(exam.id).subscribe({
      next: (exam) => {
        this._originalExam.set(exam)
        this.repository.getAttemptsV2$(exam.id).subscribe({
          next: (attempts) => {
            this._attempts.set(attempts);
            this._loading.set(false);
          }
        })
      }
    })

    // TODO
    // const examId = this.examInExecution()?.exam.id;

    // if(!examId) {
    //   this.errorMessage.set('Exam not found');
    //   return;
    // }

    // TODO
    // this.repository.finishExam$(examId, {
    //   answers,
    // }).pipe(
    //   take(1),
    //   switchMap((res) => {
    //     if(res.exam.status !== "finished"){
    //       return of({examResponse: res, attempts: []});
    //     } else {
    //       return this.repository.getAttempts$(examId).pipe(map((attempts) => {
    //         return {examResponse: res, attempts}
    //       }));
    //     }
    //   }),
    //   finalize(() => this._loading.set(false)),
    // ).subscribe({
    //   next: (res) => {
    //     if(res.examResponse.exam.status === "finished"){
    //       this.errorMessage.set(null);
    //       // TODO
    //       // this._originalExam.set({...res.examResponse})
    //       // this._attempts.set(this.transformAttemptsData(res.attempts));
    //     }
    //   },
    //   error: (_error: Error) => {
    //     this.errorMessage.set('Error finishing exam');
    //   },
    //   complete: () => {
    //
    //   },
    // });
  }

  startExam():void {
    // TODO
    const examInExecution = this.examInExecution();
    // TODO -> handle error
    if(!examInExecution) return;

    const examId = examInExecution.id;

    this.repository.startExam$(examId).subscribe({
      next: (exam) => {
        this._originalExam.set(exam)
      },
      error: (error: Error) => {
        console.error('Error starting exam', error);
      },
    });
  }

  setCurrentQuestionIndex(index:number){
    // TODO
    if(index === null) return;
    if(index < 0) return;

    const exam = this._originalExam();
    if(!exam) return;
    if(!exam.questions || !exam.questions.length) return;
    if(index >= exam.questions.length) return;

    this._currentQuestionIndex.set(index);
  }

  nextQuestion(){
    const currentQuestionIndex = this.currentQuestionIndex();
    if(typeof currentQuestionIndex !== 'number') return;
    this.setCurrentQuestionIndex(currentQuestionIndex + 1)
  }

  prevQuestion(){
    const currentQuestionIndex = this.currentQuestionIndex();
    if(typeof currentQuestionIndex !== 'number') return;
    this.setCurrentQuestionIndex(currentQuestionIndex - 1)
  }

  private computeCurrentQuestionByIndex(): Signal<QuestionWithAttempt | null> {
    return computed(() => {
      // TODO
      const questionsWithAttempt = this.questionsWithAttempt();
      console.log("questionsWithAttempt ", questionsWithAttempt)
      const currentQuestionIndex = this.currentQuestionIndex();
      if(!questionsWithAttempt) return null;
      if(currentQuestionIndex === null) return null;
      if(currentQuestionIndex < 0) return null;

      const currentQuestion = questionsWithAttempt[currentQuestionIndex];
      console.log("currentQuestion", currentQuestion);

      return currentQuestion;
    })
  }

  private questionWithAttemptComputed():Signal<QuestionWithAttempt[]> {
    return computed(() => {
      const exam = this._originalExam();
      const attempts = this._attempts();

      console.log("Computed", exam, attempts)

      const questions = exam?.questions;
      console.log("Novo Questions", questions);

      if (!questions) {
        return [];
      }

      const findAttemptData = (questionId:string) => {
        const attempt = attempts.find((a) => a.questionId === questionId);
        console.log("questionId", questionId)
        console.log("Attempt", attempt)
        return attempt;
      }

      const response:QuestionWithAttempt[] = questions.map((question) => {
        return {
          questionData: question,
          attemptData: findAttemptData(question.id)
        }
      })

      console.log("Response", response)
      return response;
    })
  }
}
