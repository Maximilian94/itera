import {computed, Inject, Injectable, Signal, signal} from '@angular/core';
import {
  APIExamResponse, APIFinishExameAnswerRequest,
  APIQuestion, AttemptsInProgressResponse, AttemptsResponse, EXAM_REPOSITORY_TOKEN, ExamRepositoryInterface, Uuid} from '../domain/exam.interface';
import {finalize, map, of, switchMap, take, tap} from 'rxjs';

type questionId = string;
export type AttemptsObject = Record<questionId, AttemptsResponse | AttemptsInProgressResponse>;

@Injectable({
  providedIn: 'root',
})
export class ExamService {
  private _loading = signal(false);
  private _originalExam = signal<APIExamResponse | null>(null);
  private _attempts = signal<AttemptsObject>({});
  private _currentQuestionIndex = signal<number | null>(null);

  public loading: Signal<boolean> = this._loading.asReadonly();
  public examInExecution: Signal<APIExamResponse | null> = this._originalExam.asReadonly();
  public attempts = this._attempts.asReadonly();
  public errorMessage = signal<string | null>(null);
  public currentQuestion = this.setCurrentQuestionByIndex();
  // TODO -> We should consider add index on question
  public currentQuestionIndex = this._currentQuestionIndex.asReadonly();



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
            this._attempts.set(this.transformAttemptsData(attempts));
          });
        }
      }),
    ).subscribe({
       next: (examResponse: APIExamResponse) => {
          this._originalExam.set(examResponse);
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

  finishExam():void {
    this._loading.set(true);

    const attempts = this.attempts();
    const examId = this.examInExecution()?.exam.id;

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
      switchMap((res) => {
        if(res.exam.status !== "finished"){
          return of({examResponse: res, attempts: []});
        } else {
          return this.repository.getAttempts$(examId).pipe(map((attempts) => {
            return {examResponse: res, attempts}
          }));
        }
      }),
      finalize(() => this._loading.set(false)),
    ).subscribe({
      next: (res) => {
        if(res.examResponse.exam.status === "finished"){
          this.errorMessage.set(null);
          this._originalExam.set({...res.examResponse})
          this._attempts.set(this.transformAttemptsData(res.attempts));
        }
      },
      error: (_error: Error) => {
        this.errorMessage.set('Error finishing exam');
      },
      complete: () => {

      },
    });
  }

  startExam():void {
    const examInExecution = this.examInExecution();
    // TODO -> handle error
    if(!examInExecution) return;

    const examId = examInExecution.exam.id;

    this.repository.startExam$(examId).subscribe({
      next: (exam) => {
        this._originalExam.update((prev) => {
          const newData = {...prev};
          if(prev){
            newData.exam = {...prev.exam}
          }

          newData.exam = {...newData.exam, ...exam.exam}
          const questions = prev?.questions || []
          return {
            exam: {...newData.exam, ...exam.exam},
            questions
          };
        });
      },
      error: (error: Error) => {
        console.error('Error starting exam', error);
      },
      complete: () => {
        console.log('Exam started');
      },
    });
  }

  setCurrentQuestionIndex(index:number){
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

  private setCurrentQuestionByIndex(): Signal<APIQuestion | null> {
    return computed(() => {
      const currentQuestionIndex = this.currentQuestionIndex();
      if(currentQuestionIndex === null) return null;
      if(currentQuestionIndex < 0) return null;

      const exam = this._originalExam();
      if(!exam) return null;
      if(!exam.questions || !exam.questions.length) return null;
      if(currentQuestionIndex >= exam.questions.length) return null;

      return exam.questions[currentQuestionIndex];
    })
  }

  private transformAttemptsData(attempts:AttemptsResponse[]): AttemptsObject {
    return attempts.reduce((acc, attempt) => {
      acc[attempt.questionId] = attempt;
      return acc;
    }, {} as AttemptsObject)
  }
}
