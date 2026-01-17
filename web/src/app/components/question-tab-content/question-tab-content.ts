import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {ButtonModule} from 'primeng/button';
import { ExamInExecution } from '../../services/exam/ui/adapters/exam.adapter';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faChevronLeft, faChevronRight} from '@fortawesome/free-solid-svg-icons';
import {QuestionWithAttempt} from '../../services/exam/ui/exam.service';
import {AttemptAnswerFinished, AttemptAnswerInProgress} from '@domain/exam/exam.interface';
import {ExamOptionCardDirective} from '../../services/exam/ui/directives/exam-option-card.directive';

@Component({
  selector: 'app-question-tab-content',
  standalone: true,
  imports: [CommonModule, ButtonModule, FaIconComponent, ExamOptionCardDirective],
  templateUrl: './question-tab-content.html',
  styleUrl: './question-tab-content.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionTabContent {
  protected readonly faChevronRight = faChevronRight;
  protected readonly faChevronLeft = faChevronLeft;
  protected readonly alphabet:string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

  @Input({ required: true }) question!: QuestionWithAttempt;
  @Input() selectedOptionId: string | null | undefined;
  @Input() disableSelection: boolean = false;
  @Input({ required: true }) examStatus!: ExamInExecution["exam"]["status"];
  @Input({ required: true }) attempt:  AttemptAnswerInProgress | AttemptAnswerFinished | undefined;
  @Input() disablePrev = false;
  @Input() disableNext = false;

  @Output() optionSelected = new EventEmitter<string>();
  @Output() uncheckedOption = new EventEmitter<void>();
  @Output() prev = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();

  // When user clicks the already-selected option, emit null to "unselect".
  onButtonClick(optionId: string): void {
    if(this.disableSelection) return;

    if(optionId === this.selectedOptionId) {
      this.uncheckedOption.emit();
      return;
    }

    this.optionSelected.emit(optionId);
  }
}
