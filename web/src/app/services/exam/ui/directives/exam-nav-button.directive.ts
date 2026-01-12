import { Directive, Input, OnChanges, SimpleChanges} from '@angular/core';
import type { ExamInExecution } from '../adapters/exam.adapter';
import type { AttemptsInProgressResponse, AttemptsResponse } from '../../domain/exam.interface';
import {Button, ButtonSeverity} from 'primeng/button';

type ExamStatus = ExamInExecution['exam']['status'];
type Attempt = AttemptsInProgressResponse | AttemptsResponse | null | undefined;

@Directive({
  selector: 'p-button[iteraExamNavButton]',
  standalone: true,
  exportAs: 'iteraExamNavButton'
})
export class ExamNavButtonDirective implements OnChanges {
  @Input({ required: true }) examStatus!: ExamStatus;
  @Input() attempt: Attempt = null;
  @Input() selectedOptionId: string | null = null;

  /** For nav buttons. */
  @Input() isCurrent: boolean = false;

  constructor(private button: Button) {
    this.setUp()
  }

  ngOnChanges(changes:SimpleChanges) {
    console.log(changes);
    this.setUp();
  }

  setUp() {
    if (this.isCurrent) {
      this.setOutline();
      this.setTextHigher()
    } else {
      this.removeOutline()
    }

    if(this.attempt?.isCorrect) {
      this.setSeverity("success");
      this.setOutlineColor("success");
    }

    if(this.examStatus === 'finished') {
      if(this.attempt?.isCorrect === false) {
        this.setSeverity("danger");
        this.setOutlineColor("danger")
      }
    }

    if(this.examStatus === "in_progress") {
      if(this.attempt?.selectedOptionId) {
        this.setSeverity("primary");
        this.setOutlineColor("primary");
      }

      if(!this.attempt?.selectedOptionId) {
        this.setSeverity("secondary");
        this.setOutlineColor("secondary")
      }
    }
  }

  setSeverity(severity: ButtonSeverity){
    this.button.severity = severity
  }

  setTextHigher(){
    this.button.style = {
      ...this.button.style,
      fontWeight: 'bold',
    }
  }

  setOutline() {
    this.button.style = {
      ...this.button.style,
      outlineWidth: '2px',
      outlineColor: "var(--p-button-primary-border-color)",
      outlineStyle: 'solid',
      outlineOffset: '2px',
    }
  }

  setOutlineColor(severity: ButtonSeverity) {
    this.button.style = {
      ...this.button.style,
      outlineColor: `var(--p-button-${severity}-border-color)`,
    }
  }

  removeOutline() {
    this.button.style = {
      outlineStyle: 'none',
    }
  }
}
