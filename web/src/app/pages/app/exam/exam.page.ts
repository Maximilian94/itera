import {ChangeDetectionStrategy, Component, computed, inject, Signal, signal} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {take} from 'rxjs';
import {CommonModule} from '@angular/common';
import {ExamsService} from '../../../api/exams.service';
import {QuestionHeader} from '../../../components/question-header/question-header';
import {ProgressBar} from 'primeng/progressbar';
import {type ExamTab, ExamTabs} from '../../../components/exam-tabs/exam-tabs';
import {QuestionTabContent} from '../../../components/question-tab-content/question-tab-content';
import {Button} from 'primeng/button';
import {ExamService, QuestionWithAttempt} from '../../../services/exam/ui/exam.service';
import {ExamNavButtonDirective} from '../../../services/exam/ui/directives/exam-nav-button.directive';
import {toObservable} from '@angular/core/rxjs-interop';
import {Exam} from '@domain/exam/exam.interface';

@Component({
  selector: 'app-exam-page',
  standalone: true,
  imports: [CommonModule, QuestionHeader, ProgressBar, ExamTabs, Button, ExamNavButtonDirective, QuestionTabContent],
  templateUrl: './exam.page.html',
  styleUrls: ['./exam.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ExamsService],
})
export class ExamPage {
  private readonly route = inject(ActivatedRoute);
  private readonly examService = inject(ExamService);

  readonly loading: Signal<boolean> = this.examService.loading;

  // Exam Data
  readonly exam: Signal<Exam | null> = this.examService.examInExecution;
  readonly progressValue:Signal<number> = this.createProgressSignal();
  readonly questionsAmount:Signal<number> = computed(() => this.exam()?.questions?.length || 0);
  readonly questionsWithAttempt:Signal<QuestionWithAttempt[]> = this.examService.questionsWithAttempt;

  // Active Question
  readonly currentQuestion:Signal<QuestionWithAttempt | null> = this.examService.currentQuestion;
  readonly currentQuestionIndex: Signal<number | null> = this.examService.currentQuestionIndex;

  readonly disableNextQuestionButton:Signal<boolean> = this.disableNextQuestionSignal();
  readonly disablePreviousQuestionButton:Signal<boolean> = this.disablePreviousQuestionSignal();

  // Tabs
  readonly activeTab = signal<ExamTab>('question');
  readonly errorMessage:Signal<string | null> = this.examService.errorMessage;
  readonly finishingSig = signal(false);

  constructor() {
    this.loadExam();
  }

  setCurrentQuestionByIndex(index:number):void {
    this.examService.setCurrentQuestionIndex(index)
  }

  nextQuestion() {
    this.examService.nextQuestion();
  }

  prevQuestion() {
    this.examService.prevQuestion();
  }

  start() {
    this.examService.startExam()
  }

  finish() {
    this.examService.finishExam();
  }

  selectOption(attemptId: string | undefined, optionSelectedId: string | null) {
    if(!attemptId) return;

    this.examService.answerQuestionV2({
      attemptId,
      optionSelectedId
    });
  }

  private loadExam():void {
    this.route.paramMap.pipe(
      take(1),
    ).subscribe(params => {
      const examId = params.get('examId');
      if(!examId) return;
      this.examService.loadExam(examId);
    })

    toObservable(this.exam).pipe(take(2)).subscribe(exam => {
      if(exam?.questions && exam?.questions.length) {
        this.examService.setCurrentQuestionIndex(0)
      }
    })
  }

  private createProgressSignal():Signal<number> {
    return computed<number>(() => {
      const questionsWithAttempts = this.examService.questionsWithAttempt();
      const totalQuestions:number = questionsWithAttempts.length;
      const answeredQuestions: number = questionsWithAttempts.filter((q: QuestionWithAttempt) => q.attemptData?.selectedOptionId).length;

      return Math.round((answeredQuestions / totalQuestions) * 100);
    })
  }

  private disableNextQuestionSignal(): Signal<boolean> {
    return computed<boolean>(() => {
      const exam = this.exam()
      const currentQuestionIndex = this.currentQuestionIndex()
      if(!exam || currentQuestionIndex === null) return true;
      return currentQuestionIndex >= exam.questions.length - 1;
    })
  }

  private disablePreviousQuestionSignal(): Signal<boolean> {
    return computed<boolean>(() => {
      const currentQuestionIndex = this.currentQuestionIndex()
      if(currentQuestionIndex === null) return true;
      return currentQuestionIndex <= 0
    });
  }
}
