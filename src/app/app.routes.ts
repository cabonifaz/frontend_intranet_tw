import { Routes } from '@angular/router';
import { autenticacionGuard } from './core/guards/autenticacion.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/autenticacion/login/login.component').then(
        m => m.LoginComponent
      ),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        m => m.DashboardComponent
      ),
    canActivate: [autenticacionGuard],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
