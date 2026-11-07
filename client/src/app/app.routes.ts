import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards';

export const routes: Routes = [
  { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./pages/login.component').then((m) => m.LoginComponent) },
  { path: '', canActivate: [authGuard], loadComponent: () => import('./pages/dashboard.component').then((m) => m.DashboardComponent) },
  { path: 'board', canActivate: [authGuard], loadComponent: () => import('./pages/board.component').then((m) => m.BoardComponent) },
  { path: 'tasks', canActivate: [authGuard], loadComponent: () => import('./pages/tasks.component').then((m) => m.TasksComponent) },
  { path: 'settings', canActivate: [authGuard], loadComponent: () => import('./pages/settings.component').then((m) => m.SettingsComponent) },
  { path: 'error', loadComponent: () => import('./pages/error.component').then((m) => m.ErrorComponent) },
  { path: '**', loadComponent: () => import('./pages/not-found.component').then((m) => m.NotFoundComponent) }
];
