import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { filter } from 'rxjs';
import { SideBar } from "../../components/side-bar/side-bar.component";

@Component({
  selector: 'app-app-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    SideBar
],
  templateUrl: './app.page.html',
  styleUrls: ['./app.page.scss'],
})
export class AppPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private readonly urlSig = signal(this.router.url);
  readonly url = computed(() => this.urlSig());

  readonly isHistoryActive = computed(() => this.url().startsWith('/app/history'));
  readonly isHomeActive = computed(() => this.url().startsWith('/app') && !this.isHistoryActive());

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      )
      .subscribe((e) => this.urlSig.set(e.urlAfterRedirects));
  }

  async logout() {
    this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}


