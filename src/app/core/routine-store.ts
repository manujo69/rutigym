import { Injectable, computed, signal } from '@angular/core';

import { EXERCISES, exerciseById } from './exercise-catalog';
import {
  DEFAULT_SERIES,
  DAY_ORDER,
  DayKey,
  Exercise,
  ExerciseGroup,
  MAX_SERIES,
  PlannedExercise,
  SetEntry,
  SessionLogs,
  TrainingPlan,
  clampSeries,
  formatDays,
  sortDays,
  todayKey,
} from './models';

const PLAN_STORAGE_KEY = 'rutigym.plan.v1';
const LOGS_STORAGE_KEY = 'rutigym.logs.v1';

function readFromStorage<T>(key: string): T | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeToStorage(key: string, value: unknown): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable (private mode, quota); the in-memory state stays authoritative.
  }
}

export interface GroupedExercises {
  readonly group: ExerciseGroup;
  readonly exercises: readonly PlannedExercise[];
}

export interface DaySelection {
  readonly day: DayKey;
  readonly label: string;
  readonly totalSeries: number;
  readonly doneSeries: number;
}

/**
 * Single source of truth for the configured weekly plan and the per-day workout log.
 * State is signal based and mirrored into `localStorage` so the MVP survives a reload.
 */
@Injectable({ providedIn: 'root' })
export class RoutineStore {
  private readonly planState = signal<TrainingPlan | null>(this.readPlan());
  private readonly logsState = signal<SessionLogs>(this.readLogs());
  private readonly draftDaysState = signal<readonly DayKey[] | null>(null);

  readonly plan = this.planState.asReadonly();
  readonly hasPlan = computed(() => {
    const plan = this.planState();
    return !!plan && plan.days.length > 0;
  });
  readonly days = computed<readonly DayKey[]>(() => this.planState()?.days ?? []);
  readonly daysLabel = computed(() => formatDays(this.days()));
  readonly plannedExercises = computed<readonly PlannedExercise[]>(
    () => this.planState()?.exercises ?? [],
  );
  readonly totalSeries = computed(() =>
    this.plannedExercises().reduce((total, item) => total + item.series, 0),
  );
  readonly today = computed(() => todayKey());

  /** Days picked in the setup flow before the plan is saved. */
  readonly draftDays = this.draftDaysState.asReadonly();

  setDraftDays(days: readonly DayKey[] | null): void {
    this.draftDaysState.set(days ? sortDays(days) : null);
  }

  seriesFor(exerciseId: string): number {
    const planned = this.plannedExercises().find((item) => item.exerciseId === exerciseId);
    return planned?.series ?? DEFAULT_SERIES;
  }

  groupedExercises(): GroupedExercises[] {
    const groups: ExerciseGroup[] = ['CORE', 'PIERNAS', 'BRAZOS'];
    return groups
      .map((group) => ({
        group,
        exercises: this.plannedExercises().filter(
          (item) => exerciseById(item.exerciseId)?.group === group,
        ),
      }))
      .filter((section) => section.exercises.length > 0);
  }

  exerciseFor(planned: PlannedExercise): Exercise | undefined {
    return exerciseById(planned.exerciseId);
  }

  /** Saves the weekly plan; series defaults to the current value or 3. */
  savePlan(days: readonly DayKey[], series: Readonly<Record<string, number>>): void {
    const plan: TrainingPlan = {
      days: sortDays(days.filter((day) => DAY_ORDER.includes(day))),
      exercises: EXERCISES.map((exercise) => ({
        exerciseId: exercise.id,
        series: clampSeries(series[exercise.id] ?? DEFAULT_SERIES),
      })),
      updatedAt: new Date().toISOString(),
    };

    this.planState.set(plan);
    this.draftDaysState.set(null);
    writeToStorage(PLAN_STORAGE_KEY, plan);
  }

  clearPlan(): void {
    this.planState.set(null);
    this.draftDaysState.set(null);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(PLAN_STORAGE_KEY);
      } catch {
        // Ignore storage failures; the in-memory plan is already cleared.
      }
    }
  }

  /** One entry per configured series, seeded from what the user already logged. */
  setsFor(day: DayKey, exerciseId: string): SetEntry[] {
    const total = Math.min(MAX_SERIES, Math.max(1, this.seriesFor(exerciseId)));
    const stored = this.logsState()[day]?.[exerciseId] ?? [];
    return Array.from({ length: total }, (_, index) => {
      const entry = stored[index];
      return {
        reps: entry?.reps ?? null,
        kg: entry?.kg ?? null,
        done: entry?.done ?? false,
      };
    });
  }

  saveSets(day: DayKey, exerciseId: string, entries: readonly SetEntry[]): void {
    const dayLogs = { ...(this.logsState()[day] ?? {}) };
    dayLogs[exerciseId] = entries.map((entry) => ({ ...entry }));
    const logs: SessionLogs = { ...this.logsState(), [day]: dayLogs };

    this.logsState.set(logs);
    writeToStorage(LOGS_STORAGE_KEY, logs);
  }

  progressFor(day: DayKey, exerciseId: string): { done: number; total: number } {
    const sets = this.setsFor(day, exerciseId);
    return { done: sets.filter((entry) => entry.done).length, total: sets.length };
  }

  dayProgressFor(day: DayKey): { done: number; total: number } {
    return this.plannedExercises().reduce(
      (acc, item) => {
        const progress = this.progressFor(day, item.exerciseId);
        return { done: acc.done + progress.done, total: acc.total + progress.total };
      },
      { done: 0, total: 0 },
    );
  }

  /** Configured days in weekday order, ready for the "Entrenar" list. */
  daySelections(): DaySelection[] {
    return this.days().map((day) => {
      const progress = this.dayProgressFor(day);
      return {
        day,
        label: formatDays([day]),
        totalSeries: progress.total,
        doneSeries: progress.done,
      };
    });
  }

  /** Today when it belongs to the plan, otherwise the first configured day. */
  defaultDay(): DayKey | null {
    if (!this.hasPlan()) {
      return null;
    }
    const current = todayKey();
    return this.days().includes(current) ? current : this.days()[0];
  }

  private readPlan(): TrainingPlan | null {
    const stored = readFromStorage<TrainingPlan>(PLAN_STORAGE_KEY);
    if (!stored || !Array.isArray(stored.days) || stored.days.length === 0) {
      return null;
    }
    return {
      days: sortDays(stored.days.filter((day) => DAY_ORDER.includes(day))),
      exercises: Array.isArray(stored.exercises)
        ? stored.exercises.map((item) => ({
            exerciseId: item.exerciseId,
            series: clampSeries(Number(item.series)),
          }))
        : [],
      updatedAt: stored.updatedAt ?? new Date().toISOString(),
    };
  }

  private readLogs(): SessionLogs {
    const stored = readFromStorage<SessionLogs>(LOGS_STORAGE_KEY);
    return stored && typeof stored === 'object' ? stored : {};
  }
}
