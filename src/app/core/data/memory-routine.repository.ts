import { Injectable } from '@angular/core';

import { DayKey, ExerciseValues, PlannedExercise, SetEntry, WorkoutSession } from '../models';
import { RoutineMap, RoutineRepository, RoutineSnapshot } from './routine.repository';

/** Test double: same contract, no SQLite, state kept in memory. */
@Injectable()
export class MemoryRoutineRepository implements RoutineRepository {
  private days: DayKey[] = [];
  private routines: Record<string, PlannedExercise[]> = {};
  private logs: Record<string, Record<string, SetEntry[]>> = {};
  private lastValues: Record<string, ExerciseValues> = {};
  private sessions: WorkoutSession[] = [];
  private meta: Record<string, string> = {};

  async load(): Promise<RoutineSnapshot> {
    return {
      days: [...this.days],
      routines: structuredClone(this.routines) as RoutineMap,
      logs: structuredClone(this.logs),
      lastValues: { ...this.lastValues },
      sessions: structuredClone(this.sessions),
      meta: { ...this.meta },
    };
  }

  async savePlan(days: readonly DayKey[], routines: RoutineMap): Promise<void> {
    this.days = [...days];
    this.routines = structuredClone(routines) as Record<string, PlannedExercise[]>;
  }

  async saveRoutine(day: DayKey, routine: readonly PlannedExercise[]): Promise<void> {
    this.routines[day] = routine.map((item) => ({ ...item }));
  }

  async saveSets(day: DayKey, exerciseId: string, entries: readonly SetEntry[]): Promise<void> {
    this.logs[day] ??= {};
    this.logs[day][exerciseId] = entries.map((entry) => ({ ...entry }));
  }

  async deleteDayLogs(day: DayKey): Promise<void> {
    delete this.logs[day];
  }

  async saveLastValue(exerciseId: string, values: ExerciseValues): Promise<void> {
    this.lastValues[exerciseId] = { ...values };
  }

  async replaceSessions(sessions: readonly WorkoutSession[]): Promise<void> {
    this.sessions = structuredClone(sessions) as WorkoutSession[];
  }

  async clearPlan(): Promise<void> {
    this.days = [];
    this.routines = {};
  }

  async setMeta(key: string, value: string): Promise<void> {
    this.meta[key] = value;
  }
}
