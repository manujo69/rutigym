import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Rutigym',
    loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'configurar',
    title: 'Configuración · Rutigym',
    loadComponent: () => import('./features/config/config.page').then((m) => m.ConfigPage),
  },
  {
    path: 'configurar/dias',
    title: 'Días de entrenamiento · Rutigym',
    loadComponent: () => import('./features/config/config-days.page').then((m) => m.ConfigDaysPage),
  },
  {
    path: 'configurar/ejercicios',
    title: 'Ejercicios · Rutigym',
    loadComponent: () =>
      import('./features/config/config-exercises.page').then((m) => m.ConfigExercisesPage),
  },
  { path: '**', redirectTo: '' },
];
