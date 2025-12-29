import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { environment } from '../../../../environments/environment';

type QuestionWithStatus = {
  id: string;
  statement: string;
  skillId: string;
  options: { id: string; text: string }[];
  status: 'correct' | 'incorrect' | 'unanswered';
};

type ExamResultsResponse = {
  exam: {
    id: string;
    createdAt: string;
    questionCount: number;
    correctCount: number;
    incorrectCount: number;
    unansweredCount: number;
  };
  questions: QuestionWithStatus[];
};

@Component({
  selector: 'app-exam-results-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './exam-results.page.html',
  styleUrls: ['./exam-results.page.scss'],
})
export class ExamResultsPage {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly baseUrl = environment.apiBaseUrl;

  readonly loadingSig = signal(true);
  readonly errorSig = signal<string | null>(null);
  readonly dataSig = signal<ExamResultsResponse | null>(null);

  readonly correct = computed(() => (this.dataSig()?.questions ?? []).filter((q) => q.status === 'correct'));
  readonly incorrect = computed(() => (this.dataSig()?.questions ?? []).filter((q) => q.status === 'incorrect'));
  readonly unanswered = computed(() => (this.dataSig()?.questions ?? []).filter((q) => q.status === 'unanswered'));

  constructor() {
    const examId = this.route.snapshot.paramMap.get('examId') ?? '';
    this.http
      .get<ExamResultsResponse>(`${this.baseUrl}/exams/${examId}/results`)
      .pipe(finalize(() => this.loadingSig.set(false)))
      .subscribe({
        next: (res) => this.dataSig.set(res),
        error: () => this.errorSig.set('Falha ao carregar resultados'),
      });
  }
}


