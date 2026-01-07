import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ExamService } from '../../../services/exam/ui/exam.service';

type ExamListItem = {
  id: string;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  status: 'not_started' | 'in_progress' | 'finished';
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
  private readonly examService = inject(ExamService);
  private readonly baseUrl = environment.apiBaseUrl;

  readonly loadingSig = signal(false);
  readonly errorSig = signal<string | null>(null);
  readonly examsSig = signal<ExamListItem[]>([]);
  readonly actionLoadingIdSig = signal<string | null>(null);

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

  async start(examId: string) {
    this.examService.startExam$(examId).pipe(
      finalize(() => this.actionLoadingIdSig.set(null))
    ).subscribe({
      next: () => this.router.navigateByUrl(`/app/exams/${examId}`),
      error: () => this.errorSig.set('Falha ao iniciar prova'),
    });
  }

  finish(examId: string) {
    this.actionLoadingIdSig.set(examId);
    this.http
      .post(`${this.baseUrl}/exams/${examId}/finish`, {})
      .pipe(finalize(() => this.actionLoadingIdSig.set(null)))
      .subscribe({
        next: () => this.load(),
        error: () => this.errorSig.set('Falha ao finalizar prova'),
      });
  }

  async open(examId: string) {
    await this.router.navigateByUrl(`/app/history/${examId}`);
  }
}


