import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';

@Component({
  selector: 'app-app-page',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Card, Button],
  templateUrl: './app.page.html',
  styleUrls: ['./app.page.scss'],
})
export class AppPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  async logout() {
    this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}


