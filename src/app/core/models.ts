export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type ExerciseGroup = 'CORE' | 'PIERNAS' | 'BRAZOS';

export interface Exercise {
  readonly id: string;
  readonly name: string;
  readonly group: ExerciseGroup;
}

export interface PlannedExercise {
  readonly exerciseId: string;
  readonly series: number;
}

export interface TrainingPlan {
  readonly days: readonly DayKey[];
  /** One independent, ordered routine per day. Days outside the plan may keep their stored routine. */
  readonly routines: Readonly<Partial<Record<DayKey, readonly PlannedExercise[]>>>;
  readonly updatedAt: string;
}

/** Values used by a set; one row of the session log. */
export interface SetEntry {
  readonly reps: number;
  readonly kg: number;
  readonly done: boolean;
}

export interface ExerciseValues {
  readonly reps: number;
  readonly kg: number;
}

export type ExerciseLogs = Readonly<Record<string, readonly SetEntry[]>>;

export type SessionLogs = Readonly<Partial<Record<DayKey, ExerciseLogs>>>;

export const DAY_ORDER: readonly DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const DAY_LABELS: Readonly<Record<DayKey, { letter: string; long: string }>> = {
  mon: { letter: 'L', long: 'LUNES' },
  tue: { letter: 'M', long: 'MARTES' },
  wed: { letter: 'X', long: 'MIÉRCOLES' },
  thu: { letter: 'J', long: 'JUEVES' },
  fri: { letter: 'V', long: 'VIERNES' },
  sat: { letter: 'S', long: 'SÁBADO' },
  sun: { letter: 'D', long: 'DOMINGO' },
};

export const MIN_SERIES = 1;
export const MAX_SERIES = 10;
export const DEFAULT_SERIES = 3;

/** Session defaults: used only when the exercise has never been logged. */
export const DEFAULT_REPS = 10;
export const DEFAULT_KG = 20;
export const REPS_STEP = 1;
export const KG_STEP = 2.5;
export const MAX_REPS = 999;
export const MAX_KG = 500;

/** Maps a JavaScript `Date.getDay()` index (0 = Sunday) to a `DayKey`. */
export function dayKeyFromJsDay(jsDay: number): DayKey {
  return DAY_ORDER[(jsDay + 6) % 7];
}

export function todayKey(date: Date = new Date()): DayKey {
  return dayKeyFromJsDay(date.getDay());
}

export function sortDays(days: readonly DayKey[]): DayKey[] {
  return [...days].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
}

/** Formats `['mon','wed','fri']` as `LUNES, MIÉRCOLES y VIERNES`. */
export function formatDays(days: readonly DayKey[]): string {
  const long = sortDays(days).map((day) => DAY_LABELS[day].long);
  if (long.length <= 1) {
    return long.join('');
  }
  return `${long.slice(0, -1).join(', ')} y ${long[long.length - 1]}`;
}

export function clampSeries(value: number): number {
  if (Number.isNaN(value)) {
    return DEFAULT_SERIES;
  }
  return Math.min(MAX_SERIES, Math.max(MIN_SERIES, Math.round(value)));
}

export function clampReps(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_REPS;
  }
  return Math.min(MAX_REPS, Math.max(0, Math.round(value)));
}

export function clampKg(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_KG;
  }
  return Math.min(MAX_KG, Math.max(0, Math.round(value * 10) / 10));
}
