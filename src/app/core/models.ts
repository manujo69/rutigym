export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type ExerciseGroup = 'CORE' | 'PIERNAS' | 'BRAZOS';

export interface Exercise {
  readonly id: string;
  readonly name: string;
  readonly group: ExerciseGroup;
  /** Machine illustration served from `public/exercises/`. Omitted when there is no photo. */
  readonly image?: string;
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

/** A finished workout: the snapshot of an exercise with the values of every series. */
export interface SessionExercise {
  readonly exerciseId: string;
  readonly sets: readonly SetEntry[];
}

export interface WorkoutSession {
  readonly id: string;
  /** Local calendar date, `YYYY-MM-DD`. */
  readonly date: string;
  readonly day: DayKey;
  readonly exercises: readonly SessionExercise[];
  /** Seeded demo data, safe to delete. */
  readonly demo?: boolean;
}

export type WeekDayState = 'done' | 'planned' | 'rest';

export interface WeekDay {
  readonly date: string;
  readonly day: DayKey;
  readonly letter: string;
  readonly label: string;
  readonly state: WeekDayState;
}

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

/** Local calendar date as `YYYY-MM-DD` (no UTC drift). */
export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

/** Monday of the week that contains `date`. */
export function startOfWeek(date: Date): Date {
  const offset = (date.getDay() + 6) % 7;
  return addDays(date, -offset);
}

/** `2026-11-11` → `MIÉ 11 NOV`. */
export function formatSessionDate(isoDate: string): string {
  const date = parseIsoDate(isoDate);
  const formatted = new Intl.DateTimeFormat('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
  return formatted.replace(/\./g, '').toUpperCase();
}

/** `80` → `80`, `82.5` → `82,5`. */
export function formatKg(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',');
}
