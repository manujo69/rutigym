import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { ROUTINE_REPOSITORY } from './core/data/routine.repository';
import { SqliteRoutineRepository } from './core/data/sqlite-routine.repository';
import { RoutineStore } from './core/routine-store';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    { provide: ROUTINE_REPOSITORY, useClass: SqliteRoutineRepository },
    // Hydrates the store from SQLite before the first render.
    provideAppInitializer(() => inject(RoutineStore).init()),
  ],
};
