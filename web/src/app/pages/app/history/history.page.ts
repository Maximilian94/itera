import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { environment } from '../../../../environments/environment';

type ExamListItem = {
  id: string;
  createdAt: string;
  questionCount: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
};

@Component({
  selector: 'app-history-page',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './history.page.html',
  styleUrls: ['./history.page.scss'],
})
export class HistoryPage {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = environment.apiBaseUrl;

  readonly loadingSig = signal(false);
  readonly errorSig = signal<string | null>(null);
  readonly examsSig = signal<ExamListItem[]>([]);

  readonly hasExams = computed(() => this.examsSig().length > 0);

  constructor() {
    this.load();
  }

  load() {
    this.loadingSig.set(true);
    this.errorSig.set(null);

    this.http
      .get<{ exams: ExamListItem[] }>(`${this.baseUrl}/exams`)
      .pipe(finalize(() => this.loadingSig.set(false)))
      .subscribe({
        next: (res) =>
          this.examsSig.set(
            [...res.exams].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0)),
          ),
        error: () => this.errorSig.set('Falha ao carregar histórico'),
      });
  }

  async open(examId: string) {
    await this.router.navigateByUrl(`/app/history/${examId}`);
  }
}


