import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faChevronLeft, faChevronRight, faClock, faEye} from '@fortawesome/free-solid-svg-icons';
import {Button} from 'primeng/button';
import {faThumbtack} from '@fortawesome/free-solid-svg-icons/faThumbtack';

@Component({
  selector: 'app-question-header',
  standalone: true,
  imports: [FaIconComponent, Button],
  templateUrl: './question-header.html',
  styleUrl: './question-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionHeader {
  @Input({ required: true }) current!: number; // 1-based
  @Input({ required: true }) total!: number;

  @Input() disablePrev = false;
  @Input() disableNext = false;

  @Output() prev = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  @Output() watch = new EventEmitter<void>();

  protected elapsedText: string = "00:00"

  protected readonly faWatch = faEye;
  protected readonly faClock = faClock;
  protected readonly faPrev = faChevronLeft;
  protected readonly faNext = faChevronRight;
  protected readonly faThumbtack = faThumbtack;
}


