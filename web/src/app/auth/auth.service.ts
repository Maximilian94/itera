import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable, filter, map, shareReplay, tap } from 'rxjs';
import { TokenService } from './token.service';
import type { AuthResponse, AuthUser } from './auth.types';
import { environment } from '../../environments/environment';

type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokens = inject(TokenService);

  private readonly baseUrl = environment.apiBaseUrl;

  private readonly statusSig = signal<AuthStatus>('checking');
  private readonly userSig = signal<AuthUser | null>(null);

  /** Emits once auth state is resolved (i.e. not "checking"). */
  readonly ready$ = toObservable(this.statusSig).pipe(
    filter((s) => s !== 'checking'),
    map(() => void 0),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly status = computed(() => this.statusSig());
  readonly user = computed(() => this.userSig());
  readonly isChecking = computed(() => this.statusSig() === 'checking');
  readonly isLoggedIn = computed(() => this.statusSig() === 'authenticated');

  constructor() {
    this.bootstrap();
  }

  register$(input: { email: string; password: string }): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/register`, input)
      .pipe(
        tap((res) => {
          this.tokens.setToken(res.token);
          this.userSig.set(res.user);
          this.statusSig.set('authenticated');
        }),
      );
  }

  login$(input: { email: string; password: string }): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/login`, input)
      .pipe(
        tap((res) => {
          this.tokens.setToken(res.token);
          this.userSig.set(res.user);
          this.statusSig.set('authenticated');
        }),
      );
  }

  me$(): Observable<{ user: AuthUser }> {
    return this.http.get<{ user: AuthUser }>(`${this.baseUrl}/auth/me`);
  }

  logout() {
    this.tokens.clearToken();
    this.userSig.set(null);
    this.statusSig.set('unauthenticated');
  }

  private bootstrap() {
    const token = this.tokens.getToken();
    if (!token) {
      this.userSig.set(null);
      this.statusSig.set('unauthenticated');
      return;
    }

    this.statusSig.set('checking');
    this.me$().subscribe({
      next: (res) => {
        this.userSig.set(res.user);
        this.statusSig.set('authenticated');
      },
      error: () => {
        this.tokens.clearToken();
        this.userSig.set(null);
        this.statusSig.set('unauthenticated');
      },
    });
  }
}


