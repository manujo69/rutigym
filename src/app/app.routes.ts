import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Rutigym',
    loadComponent: () => import('./features/home/home-component/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'configurar',
    title: 'Configuración · Rutigym',
    loadComponent: () => import('./features/config/config-component/config.component').then((m) => m.ConfigComponent),
  },
  {
    path: 'configurar/dias',
    title: 'Días de entrenamiento · Rutigym',
    loadComponent: () => import('./features/config/config-days-component/config-days.component').then((m) => m.ConfigDaysComponent),
  },
  {
    path: 'configurar/rutinas/:day',
    title: 'Rutina del día · Rutigym',
    loadComponent: () => import('./features/config/config-day-component/config-day.component').then((m) => m.ConfigDayComponent),
  },
  {
    path: 'configurar/rutinas/:day/agregar',
    title: 'Añadir ejercicios · Rutigym',
    loadComponent: () =>
      import('./features/config/config-add-exercises-component/config-add-exercises.component').then((m) => m.ConfigAddExercisesComponent),
  },
  {
    path: 'progreso',
    title: 'Progreso · Rutigym',
    loadComponent: () =>
      import('./features/progress/progress-component/progress.component').then((m) => m.ProgressComponent),
  },
  {
    path: 'entrenar',
    title: 'Entrenar · Rutigym',
    loadComponent: () => import('./features/train/train-component/train.component').then((m) => m.TrainComponent),
  },
  {
    path: 'entrenar/:day',
    title: 'Rutina del día · Rutigym',
    loadComponent: () => import('./features/train/train-day-component/train-day.component').then((m) => m.TrainDayComponent),
  },
  {
    path: 'entrenar/:day/:exerciseId',
    title: 'Registro de series · Rutigym',
    loadComponent: () =>
      import('./features/train/exercise-log-component/exercise-log.component').then((m) => m.ExerciseLogComponent),
  },
  { path: '**', redirectTo: '' },
];
