import { Pipe, PipeTransform } from '@angular/core';
import type { ButtonSeverity } from 'primeng/button';

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
  transform(isCurrentQuestion: boolean, answered: boolean): ButtonSeverity {
    if (isCurrentQuestion) return 'contrast';
    if (answered) return 'primary';
    return 'secondary';
  }
}


