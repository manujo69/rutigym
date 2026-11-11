import { InjectionToken } from '@angular/core';

import {
  DayKey,
  ExerciseValues,
  PlannedExercise,
  SessionLogs,
  SetEntry,
  WorkoutSession,
} from '../models';

export type RoutineMap = Readonly<Partial<Record<DayKey, readonly PlannedExercise[]>>>;

/** Everything the app needs to render after a cold start. */
export interface RoutineSnapshot {
  readonly days: readonly DayKey[];
  readonly routines: RoutineMap;
  readonly logs: SessionLogs;
  readonly lastValues: Readonly<Record<string, ExerciseValues>>;
  readonly sessions: readonly WorkoutSession[];
  readonly meta: Readonly<Record<string, string>>;
}

/**
 * Persistence boundary. The SQLite implementation backs the app; the in-memory one keeps the
 * specs fast and independent from the native/web SQLite runtime.
 */
export interface RoutineRepository {
  load(): Promise<RoutineSnapshot>;
  savePlan(days: readonly DayKey[], routines: RoutineMap): Promise<void>;
  saveRoutine(day: DayKey, routine: readonly PlannedExercise[]): Promise<void>;
  saveSets(day: DayKey, exerciseId: string, entries: readonly SetEntry[]): Promise<void>;
  deleteDayLogs(day: DayKey): Promise<void>;
  saveLastValue(exerciseId: string, values: ExerciseValues): Promise<void>;
  replaceSessions(sessions: readonly WorkoutSession[]): Promise<void>;
  clearPlan(): Promise<void>;
  setMeta(key: string, value: string): Promise<void>;
}

export const ROUTINE_REPOSITORY = new InjectionToken<RoutineRepository>('RoutineRepository');

export const EMPTY_SNAPSHOT: RoutineSnapshot = {
  days: [],
  routines: {},
  logs: {},
  lastValues: {},
  sessions: [],
  meta: {},
};
