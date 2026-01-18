import {Routes} from '@angular/router';
import {authGuard} from './auth/auth.guard';
import {guestGuard} from './auth/guest.guard';

export const PATH = {
  app: 'app',
  home: 'home',
  history: 'history',
  exams: 'exams',
  questions: 'questions',
  exam: 'exam',
  tags: 'tags',
} as const;

export const LINK = {
  home: ['/', PATH.app, PATH.home] as const,
  history:  ['/', PATH.app, PATH.history] as const,
  question: (examId: string, questionId: string) =>
    ['/', PATH.app, PATH.exams, examId, PATH.questions, questionId] as const,
  exam: (examId: string) => ['/', PATH.app, PATH.exams, examId] as const,
  tags: ['/', PATH.app, PATH.tags] as const,
};

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
        path: "",
        pathMatch: "full",
        redirectTo: "home"
      },
      {
        path: 'home',
        loadComponent: () => import('./pages/app/home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'history',
        loadComponent: () => import('./pages/app/history/history.page').then((m) => m.HistoryPage),
      },
      {
        path: 'history/:examId',
        loadComponent: () => import('./pages/app/history/exam-results.page').then((m) => m.ExamResultsPage),
      },
      {
        path: 'exams/:examId/questions/:questionId',
        loadComponent: () => import('./pages/app/question/question.page').then((m) => m.QuestionPage),
      },
      {
        path: 'exams/:examId',
        loadComponent: () => import('./pages/app/exam/exam.page').then((m) => m.ExamPage),
      },
      {
        path: 'tags',
        loadComponent: () => import('./pages/app/skills/skills').then((m) => m.Skills),
      }
    ],
  },
];
