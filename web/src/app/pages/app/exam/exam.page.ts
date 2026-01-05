import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-exam-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './exam.page.html',
  styleUrls: ['./exam.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExamPage {}


