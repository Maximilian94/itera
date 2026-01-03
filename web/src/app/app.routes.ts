import {Routes} from '@angular/router';
import {authGuard} from './auth/auth.guard';
import {guestGuard} from './auth/guest.guard';

export const PATH = {
  app: 'app',
  home: 'home',
  history: 'history',
  exams: 'exams',
  questions: 'questions',
  createExam: 'create-exam',
} as const;

export const LINK = {
  home: () => ['/', PATH.app, PATH.home] as const,
  history: () => ['/', PATH.app, PATH.history] as const,
  examResults: (examId: string) => ['/', PATH.app, PATH.history, examId] as const,
  question: (examId: string, questionId: string) =>
    ['/', PATH.app, PATH.exams, examId, PATH.questions, questionId] as const,
  createExam: () => ['/', PATH.app, PATH.createExam] as const,
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
        path: 'create-exam',
        loadComponent: () => import('./pages/app/create-exam/create-exam').then((m) => m.CreateExam),
      },
    ],
  },
];
