import { Injectable, computed, signal } from '@angular/core';

import { exerciseById } from './exercise-catalog';
import {
  DEFAULT_KG,
  DEFAULT_REPS,
  DEFAULT_SERIES,
  DAY_ORDER,
  DayKey,
  Exercise,
  ExerciseGroup,
  ExerciseValues,
  MAX_SERIES,
  PlannedExercise,
  SetEntry,
  SessionLogs,
  TrainingPlan,
  clampKg,
  clampReps,
  clampSeries,
  formatDays,
  sortDays,
  todayKey,
} from './models';

const PLAN_STORAGE_KEY = 'rutigym.plan.v2';
const LOGS_STORAGE_KEY = 'rutigym.logs.v2';
const LAST_VALUES_STORAGE_KEY = 'rutigym.last-values.v1';

type LastValues = Readonly<Record<string, ExerciseValues>>;

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
  readonly exercises: number;
  readonly totalSeries: number;
  readonly doneSeries: number;
}

/**
 * Single source of truth for the weekly plan — one independent routine per day — the
 * per-day workout log (extra sets included) and the last values used per exercise.
 * Signal based, mirrored into `localStorage` so the MVP survives a reload.
 */
@Injectable({ providedIn: 'root' })
export class RoutineStore {
  private readonly planState = signal<TrainingPlan | null>(this.readPlan());
  private readonly logsState = signal<SessionLogs>(this.readLogs());
  private readonly lastValuesState = signal<LastValues>(this.readLastValues());
  private readonly draftDaysState = signal<readonly DayKey[] | null>(null);

  readonly plan = this.planState.asReadonly();
  readonly hasPlan = computed(() => {
    const plan = this.planState();
    return !!plan && plan.days.length > 0;
  });
  readonly days = computed<readonly DayKey[]>(() => this.planState()?.days ?? []);
  readonly daysLabel = computed(() => formatDays(this.days()));
  readonly today = computed(() => todayKey());
  readonly totalExercises = computed(() =>
    this.days().reduce((total, day) => total + this.routinesFor(day).length, 0),
  );
  readonly totalSeries = computed(() =>
    this.days().reduce(
      (total, day) =>
        total + this.routinesFor(day).reduce((sum, item) => sum + item.series, 0),
      0,
    ),
  );

  /** Days picked in the setup flow before the plan is saved. */
  readonly draftDays = this.draftDaysState.asReadonly();

  setDraftDays(days: readonly DayKey[] | null): void {
    this.draftDaysState.set(days ? sortDays(days) : null);
  }

  /** Every configured day starts with an empty routine. */
  routinesFor(day: DayKey): readonly PlannedExercise[] {
    return this.planState()?.routines?.[day] ?? [];
  }

  isPlanned(day: DayKey, exerciseId: string): boolean {
    return this.routinesFor(day).some((item) => item.exerciseId === exerciseId);
  }

  /** Configured series for that exercise on that day, or 0 when it is not part of the routine. */
  seriesFor(day: DayKey, exerciseId: string): number {
    return this.routinesFor(day).find((item) => item.exerciseId === exerciseId)?.series ?? 0;
  }

  addExercise(day: DayKey, exerciseId: string, series: number = DEFAULT_SERIES): void {
    if (!this.planState() || !exerciseById(exerciseId) || this.isPlanned(day, exerciseId)) {
      return;
    }
    this.updateRoutine(day, [...this.routinesFor(day), { exerciseId, series: clampSeries(series) }]);
  }

  setSeries(day: DayKey, exerciseId: string, series: number): void {
    if (!this.isPlanned(day, exerciseId)) {
      return;
    }
    this.updateRoutine(
      day,
      this.routinesFor(day).map((item) =>
        item.exerciseId === exerciseId ? { ...item, series: clampSeries(series) } : item,
      ),
    );
  }

  removeExercise(day: DayKey, exerciseId: string): void {
    this.updateRoutine(
      day,
      this.routinesFor(day).filter((item) => item.exerciseId !== exerciseId),
    );
  }

  clearDayRoutine(day: DayKey): void {
    this.updateRoutine(day, []);
  }

  groupedExercises(day: DayKey): GroupedExercises[] {
    const groups: ExerciseGroup[] = ['CORE', 'PIERNAS', 'BRAZOS'];
    const routine = this.routinesFor(day);
    return groups
      .map((group) => ({
        group,
        exercises: routine.filter((item) => exerciseById(item.exerciseId)?.group === group),
      }))
      .filter((section) => section.exercises.length > 0);
  }

  exerciseFor(planned: PlannedExercise): Exercise | undefined {
    return exerciseById(planned.exerciseId);
  }

  /** Saves the configured days; routines of days that stay in the plan are preserved. */
  savePlan(days: readonly DayKey[]): void {
    const previous = this.planState();
    const routines: Partial<Record<DayKey, readonly PlannedExercise[]>> = {
      ...(previous?.routines ?? {}),
    };
    const keep = sortDays(days.filter((day) => DAY_ORDER.includes(day)));
    for (const day of keep) {
      routines[day] ??= [];
    }

    this.persistPlan({ days: keep, routines, updatedAt: new Date().toISOString() });
    this.draftDaysState.set(null);
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

  /** Last values used for an exercise, or the session defaults when it was never logged. */
  lastValuesFor(exerciseId: string): ExerciseValues {
    return this.lastValuesState()[exerciseId] ?? { reps: DEFAULT_REPS, kg: DEFAULT_KG };
  }

  /**
   * Planned series plus any extra series added in this session, seeded from what the user
   * already logged — otherwise from the last values of that exercise, otherwise 10 reps / 20 kg.
   */
  setsFor(day: DayKey, exerciseId: string): SetEntry[] {
    const stored = this.logsState()[day]?.[exerciseId] ?? [];
    const total = Math.max(this.seriesFor(day, exerciseId), stored.length);
    const seed = this.lastValuesFor(exerciseId);

    return Array.from({ length: total }, (_, index) => {
      const entry = stored[index];
      return {
        reps: entry ? clampReps(entry.reps) : seed.reps,
        kg: entry ? clampKg(entry.kg) : seed.kg,
        done: entry?.done ?? false,
      };
    });
  }

  /** Appends one extra series to the session log of that exercise. */
  addSeries(day: DayKey, exerciseId: string): void {
    const current = this.setsFor(day, exerciseId);
    const previous = current[current.length - 1];
    const seed = previous ?? this.lastValuesFor(exerciseId);
    this.saveSets(day, exerciseId, [
      ...current,
      { reps: clampReps(seed.reps), kg: clampKg(seed.kg), done: false },
    ]);
  }

  saveSets(day: DayKey, exerciseId: string, entries: readonly SetEntry[]): void {
    const dayLogs = { ...(this.logsState()[day] ?? {}) };
    const normalized = entries.map((entry) => ({
      reps: clampReps(entry.reps),
      kg: clampKg(entry.kg),
      done: entry.done,
    }));
    dayLogs[exerciseId] = normalized;
    const logs: SessionLogs = { ...this.logsState(), [day]: dayLogs };
    this.logsState.set(logs);
    writeToStorage(LOGS_STORAGE_KEY, logs);

    const last = normalized[normalized.length - 1];
    if (last) {
      const values: LastValues = {
        ...this.lastValuesState(),
        [exerciseId]: { reps: last.reps, kg: last.kg },
      };
      this.lastValuesState.set(values);
      writeToStorage(LAST_VALUES_STORAGE_KEY, values);
    }
  }

  progressFor(day: DayKey, exerciseId: string): { done: number; total: number } {
    const sets = this.setsFor(day, exerciseId);
    return { done: sets.filter((entry) => entry.done).length, total: sets.length };
  }

  dayProgressFor(day: DayKey): { done: number; total: number } {
    return this.routinesFor(day).reduce(
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
        exercises: this.routinesFor(day).length,
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

  private updateRoutine(day: DayKey, routine: readonly PlannedExercise[]): void {
    const plan = this.planState();
    if (!plan) {
      return;
    }
    this.persistPlan({
      days: plan.days,
      routines: { ...plan.routines, [day]: routine.map((item) => ({ ...item })) },
      updatedAt: new Date().toISOString(),
    });
  }

  private persistPlan(plan: TrainingPlan): void {
    this.planState.set(plan);
    writeToStorage(PLAN_STORAGE_KEY, plan);
  }

  private readPlan(): TrainingPlan | null {
    const stored = readFromStorage<TrainingPlan>(PLAN_STORAGE_KEY);
    if (!stored || !Array.isArray(stored.days) || stored.days.length === 0) {
      return null;
    }

    const routines: Partial<Record<DayKey, readonly PlannedExercise[]>> = {};
    const storedRoutines = (stored.routines ?? {}) as Record<
      string,
      readonly PlannedExercise[] | undefined
    >;
    for (const [day, routine] of Object.entries(storedRoutines)) {
      if (!DAY_ORDER.includes(day as DayKey) || !Array.isArray(routine)) {
        continue;
      }
      routines[day as DayKey] = routine
        .filter((item) => !!exerciseById(item.exerciseId))
        .map((item) => ({ exerciseId: item.exerciseId, series: clampSeries(Number(item.series)) }));
    }

    return {
      days: sortDays(stored.days.filter((day) => DAY_ORDER.includes(day))),
      routines,
      updatedAt: stored.updatedAt ?? new Date().toISOString(),
    };
  }

  private readLogs(): SessionLogs {
    const stored = readFromStorage<SessionLogs>(LOGS_STORAGE_KEY);
    if (!stored || typeof stored !== 'object') {
      return {};
    }

    const logs: Record<string, Record<string, readonly SetEntry[]>> = {};
    for (const [day, exercises] of Object.entries(stored as Record<string, unknown>)) {
      if (!DAY_ORDER.includes(day as DayKey) || !exercises || typeof exercises !== 'object') {
        continue;
      }
      const byExercise: Record<string, readonly SetEntry[]> = {};
      for (const [exerciseId, entries] of Object.entries(exercises as Record<string, unknown>)) {
        if (!Array.isArray(entries)) {
          continue;
        }
        byExercise[exerciseId] = entries.map((entry: Partial<SetEntry>) => ({
          reps: clampReps(Number(entry?.reps ?? DEFAULT_REPS)),
          kg: clampKg(Number(entry?.kg ?? DEFAULT_KG)),
          done: !!entry?.done,
        }));
      }
      logs[day] = byExercise;
    }
    return logs;
  }

  private readLastValues(): LastValues {
    const stored = readFromStorage<Record<string, Partial<ExerciseValues>>>(LAST_VALUES_STORAGE_KEY);
    if (!stored || typeof stored !== 'object') {
      return {};
    }
    const values: Record<string, ExerciseValues> = {};
    for (const [exerciseId, entry] of Object.entries(stored)) {
      if (!entry || typeof entry !== 'object') {
        continue;
      }
      values[exerciseId] = {
        reps: clampReps(Number(entry.reps ?? DEFAULT_REPS)),
        kg: clampKg(Number(entry.kg ?? DEFAULT_KG)),
      };
    }
    return values;
  }
}
