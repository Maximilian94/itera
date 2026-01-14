import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {ButtonModule} from 'primeng/button';
import type {Question} from '../../api/api.types';
import { ExamInExecution } from '../../services/exam/ui/adapters/exam.adapter';
import { AttemptsInProgressResponse, AttemptsResponse } from '../../services/exam/domain/exam.interface';
import {ExamOptionCardDirective} from '../../services/exam/ui/directives/exam-option-card.directive';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faChevronLeft, faChevronRight} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-question-tab-content',
  standalone: true,
  imports: [CommonModule, ButtonModule, ExamOptionCardDirective, FaIconComponent],
  templateUrl: './question-tab-content.html',
  styleUrl: './question-tab-content.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionTabContent {
  protected readonly faChevronRight = faChevronRight;
  protected readonly faChevronLeft = faChevronLeft;
  protected readonly alphabet:string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

  @Input({ required: true }) question!: Question;
  @Input({ required: true }) selectedOptionId!: string | null;
  @Input() disableSelection: boolean = false;
  @Input({ required: true }) examStatus!: ExamInExecution["exam"]["status"];
  @Input({ required: true }) attempt!: AttemptsResponse | AttemptsInProgressResponse;
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
