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
  SessionExercise,
  SetEntry,
  SessionLogs,
  TrainingPlan,
  WeekDay,
  WorkoutSession,
  addDays,
  clampKg,
  clampReps,
  clampSeries,
  dayKeyFromJsDay,
  formatDays,
  sortDays,
  startOfWeek,
  todayKey,
  toIsoDate,
} from './models';

const PLAN_STORAGE_KEY = 'rutigym.plan.v2';
const LOGS_STORAGE_KEY = 'rutigym.logs.v2';
const LAST_VALUES_STORAGE_KEY = 'rutigym.last-values.v1';
const SESSIONS_STORAGE_KEY = 'rutigym.sessions.v1';
const DEMO_SEEDED_STORAGE_KEY = 'rutigym.demo-seeded.v1';

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
  private readonly sessionsState = signal<readonly WorkoutSession[]>(this.readSessions());
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
  daySelections(): DaySelection[] {    return this.days().map((day) => {
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

  /** Finished workouts, newest first. */
  readonly sessions = computed<readonly WorkoutSession[]>(() =>
    [...this.sessionsState()].sort((a, b) => {
      if (a.date !== b.date) {
        return a.date < b.date ? 1 : -1;
      }
      return DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day);
    }),
  );

  /**
   * Snapshots the completed series of that day as a dated session and clears the active log.
   * A day without any completed series records nothing.
   */
  finishDay(day: DayKey, reference: Date = new Date()): void {
    const exercises: SessionExercise[] = this.routinesFor(day)
      .map((item) => ({ exerciseId: item.exerciseId, sets: this.setsFor(day, item.exerciseId) }))
      .filter((item) => item.sets.some((set) => set.done));

    if (exercises.length === 0) {
      return;
    }

    const date = toIsoDate(reference);
    const id = `${date}-${day}`;
    const session: WorkoutSession = { id, date, day, exercises };
    this.persistSessions([...this.sessionsState().filter((item) => item.id !== id), session]);
    this.clearDayLogs(day);
  }

  /** The seven days of the week that contains `reference`, with their state. */
  weekOverview(reference: Date = new Date()): WeekDay[] {
    const monday = startOfWeek(reference);
    const sessions = this.sessionsState();

    return DAY_ORDER.map((day, index) => {
      const date = toIsoDate(addDays(monday, index));
      const planned = this.days().includes(day);
      return {
        date,
        day,
        number: index + 1,
        label: planned ? this.focusFor(day) : 'Descanso',
        state: sessions.some((session) => session.date === date)
          ? 'done'
          : planned
            ? 'planned'
            : 'rest',
      };
    });
  }

  /** Seeds one demo week (previous week plus the current one) only when there is no history. */
  ensureDemoHistory(reference: Date = new Date()): void {
    if (this.sessionsState().length > 0 || readFromStorage<boolean>(DEMO_SEEDED_STORAGE_KEY)) {
      return;
    }
    writeToStorage(DEMO_SEEDED_STORAGE_KEY, true);

    const monday = startOfWeek(reference);
    const today = toIsoDate(reference);
    const demoPlan: Array<{ offset: number; exercises: Array<[string, number, number]> }> = [
      {
        offset: -7,
        exercises: [
          ['core-plancha', 20, 0],
          ['core-crunch-polea', 15, 15],
          ['core-rueda', 12, 10],
        ],
      },
      {
        offset: -5,
        exercises: [
          ['piernas-sentadilla', 10, 40],
          ['piernas-prensa', 12, 90],
          ['piernas-extension', 15, 35],
        ],
      },
      {
        offset: -3,
        exercises: [
          ['brazos-curl-barra', 12, 25],
          ['brazos-press-frances', 10, 20],
          ['brazos-jalon-triceps', 15, 30],
        ],
      },
      {
        offset: 0,
        exercises: [
          ['core-plancha', 22, 0],
          ['core-elevacion-piernas', 15, 0],
        ],
      },
      {
        offset: 2,
        exercises: [
          ['piernas-prensa', 14, 95],
          ['piernas-peso-muerto', 10, 60],
          ['piernas-curl-femoral', 12, 40],
        ],
      },
    ];

    const demo: WorkoutSession[] = [];
    for (const entry of demoPlan) {
      const date = addDays(monday, entry.offset);
      const iso = toIsoDate(date);
      if (iso > today) {
        continue;
      }
      demo.push({
        id: `${iso}-${dayKeyFromJsDay(date.getDay())}`,
        date: iso,
        day: dayKeyFromJsDay(date.getDay()),
        demo: true,
        exercises: entry.exercises.map(([exerciseId, reps, kg]) => ({
          exerciseId,
          sets: [0, 1, 2].map((index) => ({
            reps: clampReps(reps - index),
            kg: clampKg(kg + index * 2.5),
            done: true,
          })),
        })),
      });
    }

    this.persistSessions(demo);
  }

  clearDemoSessions(): void {
    writeToStorage(DEMO_SEEDED_STORAGE_KEY, true);
    this.persistSessions(this.sessionsState().filter((session) => !session.demo));
  }

  private focusFor(day: DayKey): string {
    const routine = this.routinesFor(day);
    if (routine.length === 0) {
      return 'Libre';
    }
    const groups = new Set(
      routine.map((item) => exerciseById(item.exerciseId)?.group).filter(Boolean) as string[],
    );
    return groups.size > 1 ? 'FULL BODY' : [...groups][0];
  }

  private clearDayLogs(day: DayKey): void {
    const logs: Record<string, unknown> = { ...this.logsState() };
    delete logs[day];
    this.logsState.set(logs as SessionLogs);
    writeToStorage(LOGS_STORAGE_KEY, logs);
  }

  private persistSessions(sessions: readonly WorkoutSession[]): void {
    this.sessionsState.set(sessions);
    writeToStorage(SESSIONS_STORAGE_KEY, sessions);
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

  private readSessions(): readonly WorkoutSession[] {
    const stored = readFromStorage<WorkoutSession[]>(SESSIONS_STORAGE_KEY);
    if (!Array.isArray(stored)) {
      return [];
    }

    return stored
      .filter(
        (session) =>
          !!session &&
          typeof session.date === 'string' &&
          DAY_ORDER.includes(session.day as DayKey),
      )
      .map((session) => ({
        id: session.id ?? `${session.date}-${session.day}`,
        date: session.date,
        day: session.day,
        demo: !!session.demo,
        exercises: Array.isArray(session.exercises)
          ? session.exercises
              .filter((exercise) => !!exerciseById(exercise.exerciseId))
              .map((exercise) => ({
                exerciseId: exercise.exerciseId,
                sets: Array.isArray(exercise.sets)
                  ? (exercise.sets as readonly SetEntry[]).map((set) => ({
                      reps: clampReps(Number(set.reps)),
                      kg: clampKg(Number(set.kg)),
                      done: !!set.done,
                    }))
                  : [],
              }))
          : [],
      }));
  }

  private readLastValues(): LastValues {    const stored = readFromStorage<Record<string, Partial<ExerciseValues>>>(LAST_VALUES_STORAGE_KEY);
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
