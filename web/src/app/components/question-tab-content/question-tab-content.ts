import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {ButtonModule} from 'primeng/button';
import type {Question} from '../../api/api.types';

@Component({
  selector: 'app-question-tab-content',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './question-tab-content.html',
  styleUrl: './question-tab-content.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionTabContent {
  @Input({ required: true }) question!: Question;
  @Input() selectedOptionId: string | null = null;

  @Output() optionSelected = new EventEmitter<string>();
  @Output() uncheckedOption = new EventEmitter<void>();

  protected alphabet:string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

  // When user clicks the already-selected option, emit null to "unselect".
  onButtonClick(optionId: string): void {
    if(optionId === this.selectedOptionId) {
      this.uncheckedOption.emit();
      return;
    }

    this.optionSelected.emit(optionId);
  }
}


