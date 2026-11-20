import { SetEntry, WorkoutSession } from './models';

/** Estimación de 1 RM con la fórmula de Epley; 0 para series sin peso. */
export function oneRepMax(kg: number, reps: number): number {
  return kg > 0 && reps > 0 ? kg * (1 + reps / 30) : 0;
}

/** Volumen de una serie: kg × repeticiones. Un peso corporal no suma. */
export function setVolume(kg: number, reps: number): number {
  return kg > 0 && reps > 0 ? kg * reps : 0;
}

/** Series que cuentan como realizadas: marcadas y con peso. */
function performed(sets: readonly SetEntry[]): readonly SetEntry[] {
  return sets.filter((set) => set.done && set.kg > 0);
}

/** Volumen total de una sesión: solo series realizadas con peso. */
export function sessionVolume(session: WorkoutSession): number {
  return session.exercises.reduce(
    (total, exercise) =>
      total + performed(exercise.sets).reduce((sum, set) => sum + setVolume(set.kg, set.reps), 0),
    0,
  );
}

/** Índice (base 1) de la mejor serie por 1 RM; 0 si no hay series con peso. */
export function bestSetIndex(sets: readonly SetEntry[]): number {
  let best = 0;
  let bestRm = 0;
  sets.forEach((set, position) => {
    if (!set.done || set.kg <= 0) {
      return;
    }
    const rm = oneRepMax(set.kg, set.reps);
    if (rm > bestRm) {
      best = position + 1;
      bestRm = rm;
    }
  });
  return best;
}

export interface HistorySet {
  readonly index: number;
  readonly kg: number;
  readonly reps: number;
  readonly rm: number;
}

export interface ExerciseHistoryEntry {
  readonly sessionId: string;
  readonly date: string;
  readonly sets: readonly HistorySet[];
  /** Serie con el mejor 1 RM, en base 1. */
  readonly bestIndex: number;
  readonly bestRm: number;
  readonly volume: number;
}

/** Historial de un ejercicio, de la sesión más antigua a la más reciente. */
export function exerciseHistory(
  sessions: readonly WorkoutSession[],
  exerciseId: string,
): ExerciseHistoryEntry[] {
  return sessions
    .filter((session) => session.exercises.some((item) => item.exerciseId === exerciseId))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((session) => {
      const exercise = session.exercises.find((item) => item.exerciseId === exerciseId);
      const sets = exercise ? performed(exercise.sets) : [];
      const best = bestSetIndex(exercise?.sets ?? []);
      return {
        sessionId: session.id,
        date: session.date,
        sets: sets.map((set, position) => ({
          index: position + 1,
          kg: set.kg,
          reps: set.reps,
          rm: oneRepMax(set.kg, set.reps),
        })),
        bestIndex: best,
        bestRm: best > 0 ? oneRepMax(sets[best - 1].kg, sets[best - 1].reps) : 0,
        volume: sets.reduce((sum, set) => sum + setVolume(set.kg, set.reps), 0),
      };
    });
}

export interface RecordBadge {
  /** Índice de la serie que marca el récord, en base 1. */
  readonly setIndex: number;
  readonly rm: number;
  readonly previousRm: number;
}

/**
 * Series de la sesión que superan el récord anterior de su ejercicio. Solo hay insignia si ya
 * existía un registro previo con peso; en la primera sesión de un ejercicio no se marca nada.
 */
export function sessionRecords(
  session: WorkoutSession,
  previousSessions: readonly WorkoutSession[],
): ReadonlyMap<string, RecordBadge> {
  const badges = new Map<string, RecordBadge>();
  for (const exercise of session.exercises) {
    const best = bestSetIndex(exercise.sets);
    if (best === 0) {
      continue;
    }
    const set = exercise.sets[best - 1];
    const previousRm = exerciseHistory(previousSessions, exercise.exerciseId).reduce(
      (max, entry) => Math.max(max, entry.bestRm),
      0,
    );
    if (previousRm > 0 && oneRepMax(set.kg, set.reps) > previousRm) {
      badges.set(exercise.exerciseId, {
        setIndex: best,
        rm: oneRepMax(set.kg, set.reps),
        previousRm,
      });
    }
  }
  return badges;
}

/** ¿Hay alguna sesión guardada con ese ejercicio, para poder comparar? */
export function hasPreviousSession(
  sessions: readonly WorkoutSession[],
  exerciseId: string,
): boolean {
  return sessions.some((session) =>
    session.exercises.some((item) => item.exerciseId === exerciseId && performed(item.sets).length > 0),
  );
}
