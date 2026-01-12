import { Pipe, PipeTransform } from '@angular/core';
import type { ButtonSeverity } from 'primeng/button';
import { ExamInExecution } from '../adapters/exam.adapter';
import { getExamContentStatus } from '../utils/exam.utils';

/**
 * Pure UI pipe to decide PrimeNG `p-button` severity for the question nav.
 *
 * Rules:
 * - current question: contrast
 * - answered (but not current): primary
 * - default: secondary
 */
@Pipe({
  name: 'questionNavSeverity',
  standalone: true,
  pure: true,
})
export class QuestionNavSeverityPipe implements PipeTransform {
  transform({
    examStatus,
    isOptionCorrect = undefined,
    isOptionSelected = null
  }:
  {
    examStatus: ExamInExecution["exam"]["status"],
    isOptionCorrect: boolean | undefined,
    isOptionSelected: boolean | null
  }): ButtonSeverity {
    return this.getButtonSeverity({examStatus, isOptionCorrect, isOptionSelected});
  }

  getButtonSeverity({examStatus, isOptionCorrect = undefined, isOptionSelected = null}: {examStatus: ExamInExecution["exam"]["status"], isOptionCorrect: boolean | undefined, isOptionSelected: boolean | null}): ButtonSeverity {
    const status = getExamContentStatus({examStatus, isOptionCorrect});

    if(status === "in_progress") {
      if (isOptionSelected) return "primary"
      return 'secondary';
    }

    if(isOptionSelected) {
      if(status === 'correct') return 'success';
      if(status === 'incorrect') return 'danger';
      return 'primary';
    }
    return 'secondary';
  }
}
