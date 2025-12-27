import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [JsonPipe],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  private readonly http = inject(HttpClient);

  protected readonly title = signal('web');

  protected readonly apiHealth = signal<{ ok: boolean } | null>(null);
  protected readonly apiHealthError = signal<string | null>(null);

  ngOnInit() {
    this.http.get<{ ok: boolean }>('http://localhost:3000/health').subscribe({
      next: (res) => this.apiHealth.set(res),
      error: (err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Failed to reach API /health';
        this.apiHealthError.set(message);
      },
    });
  }
}
