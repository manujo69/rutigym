import { Injectable, computed, inject, signal } from '@angular/core';

import { GROUP_ORDER, exerciseById } from './exercise-catalog';
import {
  DEFAULT_KG,
  DEFAULT_REPS,
  DEFAULT_SERIES,
  DAY_LABELS,
  DAY_ORDER,
  DayKey,
  Exercise,
  ExerciseGroup,
  ExerciseValues,
  MAX_SERIES,
  PlannedExercise,
  SessionExercise,
  SessionLogs,
  SetEntry,
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
  toIsoDate,
  todayKey,
} from './models';
import { ROUTINE_REPOSITORY, RoutineMap, RoutineSnapshot } from './data/routine.repository';

const LEGACY_PLAN_KEY = 'rutigym.plan.v2';
const LEGACY_LOGS_KEY = 'rutigym.logs.v2';
const LEGACY_LAST_VALUES_KEY = 'rutigym.last-values.v1';
const LEGACY_SESSIONS_KEY = 'rutigym.sessions.v1';
const LEGACY_DEMO_KEY = 'rutigym.demo-seeded.v1';
const LEGACY_MIGRATED_META = 'legacy_migrated';
const DEMO_SEEDED_META = 'demo_seeded';

type LastValues = Readonly<Record<string, ExerciseValues>>;

interface LegacyData {
  readonly days: readonly DayKey[];
  readonly routines: RoutineMap;
  readonly logs: SessionLogs;
  readonly lastValues: LastValues;
  readonly sessions: readonly WorkoutSession[];
  readonly demoSeeded: boolean;
}

function readLegacyJson<T>(key: string): T | null {
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
 * per-day workout log (extra sets included), the last values used per exercise and the
 * finished sessions. State is signal based; persistence goes through `RoutineRepository`
 * (SQLite in the app), and is hydrated once during app bootstrap.
 */
@Injectable({ providedIn: 'root' })
export class RoutineStore {
  private readonly repository = inject(ROUTINE_REPOSITORY);

  private readonly planState = signal<TrainingPlan | null>(null);
  private readonly logsState = signal<SessionLogs>({});
  private readonly lastValuesState = signal<LastValues>({});
  private readonly sessionsState = signal<readonly WorkoutSession[]>([]);
  private readonly draftDaysState = signal<readonly DayKey[] | null>(null);
  private readonly demoSeededState = signal(false);
  private initialized = false;

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
      (total, day) => total + this.routinesFor(day).reduce((sum, item) => sum + item.series, 0),
      0,
    ),
  );

  /** Days picked in the setup flow before the plan is saved. */
  readonly draftDays = this.draftDaysState.asReadonly();

  /** Loads the persisted state once. Called by the app initializer before rendering. */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    let snapshot = await this.repository.load();
    if (snapshot.meta[LEGACY_MIGRATED_META] !== '1' && this.isBlank(snapshot)) {
      const legacy = this.readLegacy();
      if (legacy) {
        await this.importLegacy(legacy);
        await this.repository.setMeta(LEGACY_MIGRATED_META, '1');
        snapshot = await this.repository.load();
      }
    }

    this.hydrate(snapshot);
    this.initialized = true;
  }

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
    const routine = this.routinesFor(day);
    return GROUP_ORDER.map((group) => ({
      group,
      exercises: routine.filter((item) => exerciseById(item.exerciseId)?.group === group),
    })).filter((section) => section.exercises.length > 0);
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

    const plan: TrainingPlan = { days: keep, routines, updatedAt: new Date().toISOString() };
    this.planState.set(plan);
    this.draftDaysState.set(null);
    this.persist(() => this.repository.savePlan(plan.days, plan.routines));
  }

  clearPlan(): void {
    this.planState.set(null);
    this.draftDaysState.set(null);
    this.persist(() => this.repository.clearPlan());
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
    this.logsState.set({ ...this.logsState(), [day]: dayLogs });

    this.persist(() => this.repository.saveSets(day, exerciseId, normalized));

    const last = normalized[normalized.length - 1];
    if (last) {
      const values = { reps: last.reps, kg: last.kg };
      this.lastValuesState.set({ ...this.lastValuesState(), [exerciseId]: values });
      this.persist(() => this.repository.saveLastValue(exerciseId, values));
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
        letter: DAY_LABELS[day].letter,
        label: planned ? this.focusFor(day) : 'Descanso',
        state: sessions.some((session) => session.date === date)
          ? 'done'
          : planned
            ? 'planned'
            : 'rest',
      };
    });
  }

  /** Seeds one demo week only when there is no history and nothing was ever seeded. */
  ensureDemoHistory(reference: Date = new Date()): void {
    if (this.sessionsState().length > 0 || this.demoSeededState()) {
      return;
    }

    this.demoSeededState.set(true);
    this.persist(() => this.repository.setMeta(DEMO_SEEDED_META, '1'));

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
    this.demoSeededState.set(true);
    this.persist(() => this.repository.setMeta(DEMO_SEEDED_META, '1'));
    this.persistSessions(this.sessionsState().filter((session) => !session.demo));
  }

  private hydrate(snapshot: RoutineSnapshot): void {
    this.planState.set(
      snapshot.days.length > 0
        ? {
            days: snapshot.days,
            routines: snapshot.routines,
            updatedAt: new Date().toISOString(),
          }
        : null,
    );
    this.logsState.set(snapshot.logs);
    this.lastValuesState.set(snapshot.lastValues);
    this.sessionsState.set(snapshot.sessions);
    this.demoSeededState.set(snapshot.meta[DEMO_SEEDED_META] === '1');
  }

  private isBlank(snapshot: RoutineSnapshot): boolean {
    return (
      snapshot.days.length === 0 &&
      snapshot.sessions.length === 0 &&
      Object.keys(snapshot.logs).length === 0
    );
  }

  private readLegacy(): LegacyData | null {
    const plan = readLegacyJson<{ days?: DayKey[]; routines?: RoutineMap }>(LEGACY_PLAN_KEY);
    const logs = readLegacyJson<SessionLogs>(LEGACY_LOGS_KEY) ?? {};
    const lastValues = readLegacyJson<LastValues>(LEGACY_LAST_VALUES_KEY) ?? {};
    const sessions = readLegacyJson<WorkoutSession[]>(LEGACY_SESSIONS_KEY) ?? [];
    const demoSeeded = readLegacyJson<boolean>(LEGACY_DEMO_KEY) === true;
    const days = (plan?.days ?? []).filter((day) => DAY_ORDER.includes(day));

    if (days.length === 0 && sessions.length === 0 && Object.keys(logs).length === 0) {
      return null;
    }

    return { days, routines: plan?.routines ?? {}, logs, lastValues, sessions, demoSeeded };
  }

  private async importLegacy(legacy: LegacyData): Promise<void> {
    await this.repository.savePlan(legacy.days, legacy.routines);

    for (const [day, exercises] of Object.entries(legacy.logs)) {
      if (!DAY_ORDER.includes(day as DayKey) || !exercises) {
        continue;
      }
      for (const [exerciseId, entries] of Object.entries(exercises)) {
        await this.repository.saveSets(day as DayKey, exerciseId, entries);
      }
    }

    for (const [exerciseId, values] of Object.entries(legacy.lastValues)) {
      await this.repository.saveLastValue(exerciseId, values);
    }

    if (legacy.sessions.length > 0) {
      await this.repository.replaceSessions(legacy.sessions);
    }
    if (legacy.demoSeeded) {
      await this.repository.setMeta(DEMO_SEEDED_META, '1');
    }
  }

  private updateRoutine(day: DayKey, routine: readonly PlannedExercise[]): void {
    const plan = this.planState();
    if (!plan) {
      return;
    }
    this.planState.set({
      days: plan.days,
      routines: { ...plan.routines, [day]: routine.map((item) => ({ ...item })) },
      updatedAt: new Date().toISOString(),
    });
    this.persist(() => this.repository.saveRoutine(day, routine));
  }

  private clearDayLogs(day: DayKey): void {
    const logs: Record<string, unknown> = { ...this.logsState() };
    delete logs[day];
    this.logsState.set(logs as SessionLogs);
    this.persist(() => this.repository.deleteDayLogs(day));
  }

  private persistSessions(sessions: readonly WorkoutSession[]): void {
    this.sessionsState.set(sessions);
    this.persist(() => this.repository.replaceSessions(sessions));
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

  private persist(write: () => Promise<void>): void {
    void write().catch((error) => {
      console.error('[Rutigym] no se pudo guardar en SQLite', error);
    });
  }
}
