import { EXERCISES } from './exercise-catalog';
import {
  DAY_ORDER,
  DayKey,
  ExerciseValues,
  PlannedExercise,
  SessionLogs,
  SetEntry,
  WorkoutSession,
} from './models';

export const BACKUP_APP = 'rutigym';
export const BACKUP_VERSION = 1;

/** Portable copy of everything the app stores, so a plan can move between devices. */
export interface RoutineBackup {
  readonly app: typeof BACKUP_APP;
  readonly version: typeof BACKUP_VERSION;
  readonly exportedAt: string;
  readonly days: readonly DayKey[];
  readonly routines: Readonly<Partial<Record<string, readonly PlannedExercise[]>>>;
  readonly logs: SessionLogs;
  readonly lastValues: Readonly<Record<string, ExerciseValues>>;
  readonly sessions: readonly WorkoutSession[];
}

export type ParsedBackup =
  | { readonly ok: true; readonly backup: RoutineBackup }
  | { readonly ok: false; readonly error: string };

interface BackupInput {
  readonly days: readonly DayKey[];
  readonly routines: Readonly<Partial<Record<string, readonly PlannedExercise[]>>>;
  readonly logs: SessionLogs;
  readonly lastValues: Readonly<Record<string, ExerciseValues>>;
  readonly sessions: readonly WorkoutSession[];
}

const KNOWN_EXERCISES = new Set(EXERCISES.map((exercise) => exercise.id));

export function serializeBackup(input: BackupInput): string {
  const backup: RoutineBackup = {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    days: input.days,
    routines: input.routines,
    logs: input.logs,
    lastValues: input.lastValues,
    sessions: input.sessions,
  };
  return JSON.stringify(backup, null, 2);
}

/** Validates the text a user pasted. Unknown exercises are dropped instead of breaking the plan. */
export function parseBackup(raw: string): ParsedBackup {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'El texto no es un JSON válido.' };
  }

  if (!isRecord(data)) {
    return { ok: false, error: 'La copia no tiene el formato de Rutigym.' };
  }
  if (data['app'] !== BACKUP_APP) {
    return { ok: false, error: 'La copia no es de Rutigym.' };
  }
  if (data['version'] !== BACKUP_VERSION) {
    return { ok: false, error: `Versión de copia no soportada: ${String(data['version'])}.` };
  }

  const days = parseDays(data['days']);
  if (!days) {
    return { ok: false, error: 'La lista de días no es válida.' };
  }

  const routines = parseRoutines(data['routines']);
  if (!routines) {
    return { ok: false, error: 'Las rutinas no son válidas.' };
  }

  const logs = parseLogs(data['logs']);
  if (!logs) {
    return { ok: false, error: 'Las series registradas no son válidas.' };
  }

  const lastValues = parseLastValues(data['lastValues']);
  if (!lastValues) {
    return { ok: false, error: 'Los últimos valores no son válidos.' };
  }

  const sessions = parseSessions(data['sessions']);
  if (!sessions) {
    return { ok: false, error: 'El historial de sesiones no es válido.' };
  }

  return {
    ok: true,
    backup: {
      app: BACKUP_APP,
      version: BACKUP_VERSION,
      exportedAt: typeof data['exportedAt'] === 'string' ? data['exportedAt'] : '',
      days,
      routines,
      logs,
      lastValues,
      sessions,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseDays(value: unknown): DayKey[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const days = value.filter(
    (day): day is DayKey => typeof day === 'string' && DAY_ORDER.includes(day as DayKey),
  );
  if (days.length !== value.length) {
    return null;
  }
  return DAY_ORDER.filter((day) => days.includes(day));
}

function parseRoutines(value: unknown): Record<string, PlannedExercise[]> | null {
  if (!isRecord(value)) {
    return null;
  }
  const routines: Record<string, PlannedExercise[]> = {};
  for (const [day, routine] of Object.entries(value)) {
    if (!DAY_ORDER.includes(day as DayKey) || !Array.isArray(routine)) {
      return null;
    }
    const items: PlannedExercise[] = [];
    for (const item of routine) {
      if (!isRecord(item)) {
        return null;
      }
      const exerciseId = item['exerciseId'];
      const series = item['series'];
      if (typeof exerciseId !== 'string' || !Number.isFinite(series)) {
        return null;
      }
      if (!KNOWN_EXERCISES.has(exerciseId)) {
        continue;
      }
      items.push({ exerciseId, series: Math.max(1, Math.round(Number(series))) });
    }
    if (items.length > 0) {
      routines[day] = items;
    }
  }
  return routines;
}

function parseSets(value: unknown): SetEntry[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const sets: SetEntry[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) {
      return null;
    }
    const { reps, kg, done } = entry;
    if (!Number.isFinite(reps) || !Number.isFinite(kg)) {
      return null;
    }
    sets.push({
      reps: Math.max(0, Math.round(Number(reps))),
      kg: Math.max(0, Number(kg)),
      done: done === true,
    });
  }
  return sets;
}

function parseLogs(value: unknown): SessionLogs | null {
  if (!isRecord(value)) {
    return null;
  }
  const logs: Record<string, Record<string, SetEntry[]>> = {};
  for (const [day, byExercise] of Object.entries(value)) {
    if (!DAY_ORDER.includes(day as DayKey) || !isRecord(byExercise)) {
      return null;
    }
    const entries: Record<string, SetEntry[]> = {};
    for (const [exerciseId, sets] of Object.entries(byExercise)) {
      if (!KNOWN_EXERCISES.has(exerciseId)) {
        continue;
      }
      const parsed = parseSets(sets);
      if (!parsed) {
        return null;
      }
      entries[exerciseId] = parsed;
    }
    logs[day] = entries;
  }
  return logs;
}

function parseLastValues(value: unknown): Record<string, ExerciseValues> | null {
  if (!isRecord(value)) {
    return null;
  }
  const values: Record<string, ExerciseValues> = {};
  for (const [exerciseId, entry] of Object.entries(value)) {
    if (!isRecord(entry)) {
      return null;
    }
    const { reps, kg } = entry;
    if (!Number.isFinite(reps) || !Number.isFinite(kg) || !KNOWN_EXERCISES.has(exerciseId)) {
      return null;
    }
    values[exerciseId] = { reps: Math.max(0, Math.round(Number(reps))), kg: Math.max(0, Number(kg)) };
  }
  return values;
}

function parseSessions(value: unknown): WorkoutSession[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const sessions: WorkoutSession[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) {
      return null;
    }
    const { id, date, day, demo } = entry;
    if (typeof id !== 'string' || typeof date !== 'string') {
      return null;
    }
    if (typeof day !== 'string' || !DAY_ORDER.includes(day as DayKey)) {
      return null;
    }
    const exercises = entry['exercises'];
    if (!Array.isArray(exercises)) {
      return null;
    }
    const parsedExercises = [];
    for (const exercise of exercises) {
      if (!isRecord(exercise) || typeof exercise['exerciseId'] !== 'string') {
        return null;
      }
      const sets = parseSets(exercise['sets']);
      if (!sets) {
        return null;
      }
      parsedExercises.push({ exerciseId: exercise['exerciseId'], sets });
    }
    sessions.push({
      id,
      date,
      day: day as DayKey,
      exercises: parsedExercises,
      ...(demo === true ? { demo: true } : {}),
    });
  }
  return sessions;
}
