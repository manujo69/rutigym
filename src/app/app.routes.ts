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
  {
    path: 'entrenar',
    title: 'Entrenar · Rutigym',
    loadComponent: () => import('./features/train/train.page').then((m) => m.TrainPage),
  },
  {
    path: 'entrenar/:day',
    title: 'Rutina del día · Rutigym',
    loadComponent: () => import('./features/train/train-day.page').then((m) => m.TrainDayPage),
  },
  {
    path: 'entrenar/:day/:exerciseId',
    title: 'Registro de series · Rutigym',
    loadComponent: () =>
      import('./features/train/exercise-log.page').then((m) => m.ExerciseLogPage),
  },
  { path: '**', redirectTo: '' },
];
