import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {LINK} from '../../../app.routes';
import {Button, ButtonIcon} from 'primeng/button';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faListCheck, faPlay} from '@fortawesome/free-solid-svg-icons';

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
  imports: [CommonModule, DatePipe, RouterLink, Button, FaIconComponent, ButtonIcon],
  templateUrl: './history.page.html',
  styleUrls: ['./history.page.scss'],
})
export class HistoryPage {
  private readonly http = inject(HttpClient);
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

  protected readonly LINK = LINK;
  protected readonly faPlay = faPlay;
  protected readonly faListCheck = faListCheck;
}


