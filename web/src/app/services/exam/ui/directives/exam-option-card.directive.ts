import { Directive, HostBinding, HostListener, Input } from '@angular/core';
import type { ExamInExecution } from '../adapters/exam.adapter';
import type { AttemptsInProgressResponse, AttemptsResponse } from '../../domain/exam.interface';

type ExamStatus = ExamInExecution['exam']['status'];
type Attempt = AttemptsInProgressResponse | AttemptsResponse | null | undefined;

@Directive({
  selector: 'div[iteraExamOptionCard]',
  standalone: true,
  exportAs: 'iteraExamButton'
})
export class ExamOptionCardDirective {
  @Input({ required: true }) examStatus!: ExamStatus;
  @Input() attempt: Attempt = null;

  /** For option/badge buttons. */
  @Input() optionId?: string;

  /** External disabled flag from template. */
  @Input() disabledBase: boolean = false;

  @HostBinding('class.is-disabled')
  get disabledV2(): boolean {
    return this.disabledBase || this.examStatus === 'finished';
  }

  @HostBinding('class.selected')
  get isSelected(): boolean {
    const attempt = this.attempt;
    return attempt?.selectedOptionId === this.optionId
  }

  @HostBinding('class.in-progress')
  get isInProgress(): boolean {
    return this.examStatus === 'in_progress';
  }

  @HostBinding('class.is-correct')
  get isCorrect(): boolean {
    const attempt = this.attempt;
    if(!attempt) return false;
    return this.examStatus === 'finished' && attempt.correctOptionId === this.optionId;
  }

  @HostBinding('class.is-incorrect')
  get isIncorrect(): boolean {
    const attempt = this.attempt;
    if(!attempt) return false;
    return this.examStatus === 'finished' && attempt.correctOptionId !== this.optionId;
  }

  @HostListener('click', ['$event'])
  onClick(ev: MouseEvent) {
    if (this.disabledV2) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
    }
  }
}
