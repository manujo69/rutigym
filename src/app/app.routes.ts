import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Rutigym',
    loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage),
  },
  { path: '**', redirectTo: '' },
];
