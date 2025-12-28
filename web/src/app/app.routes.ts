import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { guestGuard } from './auth/guest.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/app/app.page').then((m) => m.AppPage),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./pages/practice/practice.page').then((m) => m.PracticePage),
      },
      {
        path: 'exams/:examId/questions/:questionId',
        loadComponent: () => import('./pages/question/question.page').then((m) => m.QuestionPage),
      },
    ],
  },
];
