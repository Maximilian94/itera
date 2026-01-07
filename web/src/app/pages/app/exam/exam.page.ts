import {ChangeDetectionStrategy, Component, computed, inject, Signal, signal, WritableSignal} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import { take} from 'rxjs';
import {CommonModule} from '@angular/common';
import {ExamsService} from '../../../api/exams.service';
import {QuestionHeader} from '../../../components/question-header/question-header';
import {ProgressBar} from 'primeng/progressbar';
import {type ExamTab, ExamTabs} from '../../../components/exam-tabs/exam-tabs';
import {QuestionTabContent} from '../../../components/question-tab-content/question-tab-content';
import {Button} from 'primeng/button';
import {ExamService} from '../../../services/exam/ui/exam.service';
import {ExamInExecution, QuestionInExecution} from '../../../services/exam/ui/adapters/exam.adapter';
import {QuestionNavSeverityPipe} from '../../../services/exam/ui/pipes/question-nav-severity.pipe';

@Component({
  selector: 'app-exam-page',
  standalone: true,
  imports: [CommonModule, QuestionHeader, ProgressBar, ExamTabs, QuestionTabContent, Button, QuestionNavSeverityPipe],
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
  readonly exam: Signal<ExamInExecution | null> = this.examService.examInExecution;
  readonly progressValue:Signal<number> = this.createProgressSignal();
  readonly questionsAmount:Signal<number> = computed(() => this.exam()?.questions?.length || 0);

  // Active Question
  readonly activeQuestionIndex:WritableSignal<number> = signal(0);
  readonly activeQuestion:Signal<QuestionInExecution | null> = this.activeQuestionSignal();
  readonly disableNextQuestionButton:Signal<boolean> = this.disableNextQuestionSignal();
  readonly disablePreviousQuestionButton:Signal<boolean> = this.disablePreviousQuestionSignal();

  // Tabs
  readonly activeTab = signal<ExamTab>('question');


  readonly finishingSig = signal(false);

  constructor() {
    this.loadExam();
  }

  goTo(questionIndex: number) {
    const exam:ExamInExecution | null = this.exam();
    if(!exam) return;
    if (questionIndex < 0 || questionIndex >= exam.questions?.length) return;

    this.activeQuestionIndex.set(questionIndex);
    this.activeTab.set('question');
    this.examService.setCurrentQuestion(exam.questions[questionIndex].id);
  }

  next() {
    this.goTo(this.activeQuestionIndex() + 1);
  }

  prev() {
    this.goTo(this.activeQuestionIndex() - 1);
  }

  finish() {
    this.examService.finishExam();
  }

  selectOption(questionId: string, selectedOptionId: string) {
    this.examService.answerQuestion({questionId, selectedOptionId})
  }

  uncheckOption(questionId: string) {
    this.examService.unselectAnsweredQuestion(questionId);
  }

  private loadExam():void {
    this.route.paramMap.pipe(take(1)).subscribe(params => {
      const examId = params.get('examId');
      if(!examId) return;
      this.examService.loadExam(examId)
    })
  }

  private createProgressSignal():Signal<number> {
    return computed<number>(() => {
      const exam = this.exam()
      if (!exam) return 0
      const totalQuestions:number = exam.questions.length
      const answeredQuestions:number = exam.questions.filter((e) => e.answered).length
      return Math.round((answeredQuestions / totalQuestions) * 100);
    })
  }

  private disableNextQuestionSignal(): Signal<boolean> {
    return computed<boolean>(() => {
      const exam = this.exam()
      if(!exam) return true;
      return this.activeQuestionIndex() >= exam.questions.length - 1
    })
  }

  private disablePreviousQuestionSignal(): Signal<boolean> {
    return computed<boolean>(() => this.activeQuestionIndex() <= 0);
  }

  private activeQuestionSignal():Signal<QuestionInExecution | null> {
    return computed<QuestionInExecution | null>(() => {
      const exam = this.exam();
      const activeQuestionIndex = this.activeQuestionIndex();
      console.log("activeQuestionIndex", activeQuestionIndex);
      console.log("exam", exam);
      if (!exam) return null;
      return exam.questions[activeQuestionIndex];
    });
  }
}
