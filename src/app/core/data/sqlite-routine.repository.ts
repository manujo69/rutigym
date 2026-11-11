import { Injectable } from '@angular/core';

import {
  DAY_ORDER,
  DayKey,
  ExerciseValues,
  PlannedExercise,
  SessionLogs,
  SetEntry,
  WorkoutSession,
  clampKg,
  clampReps,
  clampSeries,
  sortDays,
} from '../models';
import { RoutineMap, RoutineRepository, RoutineSnapshot } from './routine.repository';
import { SqliteService } from './sqlite.service';

interface DayRow {
  day: string;
}
interface RoutineRow {
  day: string;
  exercise_id: string;
  series: number;
}
interface SetRow {
  day: string;
  exercise_id: string;
  reps: number;
  kg: number;
  done: number;
}
interface LastValueRow {
  exercise_id: string;
  reps: number;
  kg: number;
}
interface SessionRow {
  id: string;
  date: string;
  day: string;
  demo: number;
}
interface SessionSetRow {
  session_id: string;
  exercise_id: string;
  reps: number;
  kg: number;
  done: number;
}
interface MetaRow {
  key: string;
  value: string;
}

interface Statement {
  readonly sql: string;
  readonly values?: readonly unknown[];
}

function asDay(value: string): DayKey | null {
  return DAY_ORDER.includes(value as DayKey) ? (value as DayKey) : null;
}

@Injectable({ providedIn: 'root' })
export class SqliteRoutineRepository implements RoutineRepository {
  constructor(private readonly sqlite: SqliteService) {}

  async load(): Promise<RoutineSnapshot> {
    const db = await this.sqlite.getConnection();

    const [days, routines, logs, lastValues, sessions, sessionSets, meta] = await Promise.all([
      db.query('SELECT day FROM plan_day ORDER BY position'),
      db.query('SELECT day, exercise_id, series FROM routine_item ORDER BY day, position'),
      db.query(
        'SELECT day, exercise_id, reps, kg, done FROM set_log ORDER BY day, exercise_id, position',
      ),
      db.query('SELECT exercise_id, reps, kg FROM last_value'),
      db.query('SELECT id, date, day, demo FROM workout_session ORDER BY date, id'),
      db.query(
        `SELECT session_id, exercise_id, reps, kg, done FROM session_set
         ORDER BY session_id, exercise_id, position`,
      ),
      db.query('SELECT key, value FROM app_meta'),
    ]);

    const routineMap: Record<string, PlannedExercise[]> = {};
    for (const row of (routines.values ?? []) as RoutineRow[]) {
      const day = asDay(row.day);
      if (!day) {
        continue;
      }
      (routineMap[day] ??= []).push({
        exerciseId: row.exercise_id,
        series: clampSeries(Number(row.series)),
      });
    }

    const logsByDay: Record<string, Record<string, SetEntry[]>> = {};
    for (const row of (logs.values ?? []) as SetRow[]) {
      const day = asDay(row.day);
      if (!day) {
        continue;
      }
      ((logsByDay[day] ??= {})[row.exercise_id] ??= []).push({
        reps: clampReps(Number(row.reps)),
        kg: clampKg(Number(row.kg)),
        done: !!row.done,
      });
    }

    const valuesByExercise: Record<string, ExerciseValues> = {};
    for (const row of (lastValues.values ?? []) as LastValueRow[]) {
      valuesByExercise[row.exercise_id] = {
        reps: clampReps(Number(row.reps)),
        kg: clampKg(Number(row.kg)),
      };
    }

    const sessionsById = new Map<string, { row: SessionRow; exercises: Map<string, SetEntry[]> }>();
    for (const row of (sessions.values ?? []) as SessionRow[]) {
      sessionsById.set(row.id, { row, exercises: new Map() });
    }
    for (const row of (sessionSets.values ?? []) as SessionSetRow[]) {
      const session = sessionsById.get(row.session_id);
      if (!session) {
        continue;
      }
      const entries = session.exercises.get(row.exercise_id) ?? [];
      entries.push({
        reps: clampReps(Number(row.reps)),
        kg: clampKg(Number(row.kg)),
        done: !!row.done,
      });
      session.exercises.set(row.exercise_id, entries);
    }

    const workoutSessions: WorkoutSession[] = [];
    for (const { row, exercises } of sessionsById.values()) {
      const day = asDay(row.day);
      if (!day) {
        continue;
      }
      workoutSessions.push({
        id: row.id,
        date: row.date,
        day,
        demo: !!row.demo,
        exercises: [...exercises.entries()].map(([exerciseId, sets]) => ({ exerciseId, sets })),
      });
    }

    const metaValues: Record<string, string> = {};
    for (const row of (meta.values ?? []) as MetaRow[]) {
      metaValues[row.key] = row.value;
    }

    return {
      days: sortDays(
        ((days.values ?? []) as DayRow[])
          .map((row) => asDay(row.day))
          .filter((day): day is DayKey => !!day),
      ),
      routines: routineMap as RoutineMap,
      logs: logsByDay as SessionLogs,
      lastValues: valuesByExercise,
      sessions: workoutSessions,
      meta: metaValues,
    };
  }

  savePlan(days: readonly DayKey[], routines: RoutineMap): Promise<void> {
    const statements: Statement[] = [
      { sql: 'DELETE FROM plan_day' },
      { sql: 'DELETE FROM routine_item' },
    ];

    days.forEach((day, index) => {
      statements.push({ sql: 'INSERT INTO plan_day (day, position) VALUES (?, ?)', values: [day, index] });
    });

    for (const [day, routine] of Object.entries(routines)) {
      ((routine ?? []) as readonly PlannedExercise[]).forEach((item, index) => {
        statements.push({
          sql: 'INSERT INTO routine_item (day, exercise_id, series, position) VALUES (?, ?, ?, ?)',
          values: [day, item.exerciseId, item.series, index],
        });
      });
    }

    return this.mutate(statements);
  }

  saveRoutine(day: DayKey, routine: readonly PlannedExercise[]): Promise<void> {
    const statements: Statement[] = [{ sql: 'DELETE FROM routine_item WHERE day = ?', values: [day] }];

    routine.forEach((item, index) => {
      statements.push({
        sql: 'INSERT INTO routine_item (day, exercise_id, series, position) VALUES (?, ?, ?, ?)',
        values: [day, item.exerciseId, item.series, index],
      });
    });

    return this.mutate(statements);
  }

  saveSets(day: DayKey, exerciseId: string, entries: readonly SetEntry[]): Promise<void> {
    const statements: Statement[] = [
      { sql: 'DELETE FROM set_log WHERE day = ? AND exercise_id = ?', values: [day, exerciseId] },
    ];

    entries.forEach((entry, index) => {
      statements.push({
        sql: `INSERT INTO set_log (day, exercise_id, position, reps, kg, done)
              VALUES (?, ?, ?, ?, ?, ?)`,
        values: [day, exerciseId, index, entry.reps, entry.kg, entry.done ? 1 : 0],
      });
    });

    return this.mutate(statements);
  }

  deleteDayLogs(day: DayKey): Promise<void> {
    return this.mutate([{ sql: 'DELETE FROM set_log WHERE day = ?', values: [day] }]);
  }

  saveLastValue(exerciseId: string, values: ExerciseValues): Promise<void> {
    return this.mutate([
      {
        sql: `INSERT INTO last_value (exercise_id, reps, kg) VALUES (?, ?, ?)
              ON CONFLICT(exercise_id) DO UPDATE SET reps = excluded.reps, kg = excluded.kg`,
        values: [exerciseId, values.reps, values.kg],
      },
    ]);
  }

  replaceSessions(sessions: readonly WorkoutSession[]): Promise<void> {
    const statements: Statement[] = [
      { sql: 'DELETE FROM session_set' },
      { sql: 'DELETE FROM workout_session' },
    ];

    for (const session of sessions) {
      statements.push({
        sql: 'INSERT INTO workout_session (id, date, day, demo) VALUES (?, ?, ?, ?)',
        values: [session.id, session.date, session.day, session.demo ? 1 : 0],
      });
      for (const exercise of session.exercises) {
        exercise.sets.forEach((set, index) => {
          statements.push({
            sql: `INSERT INTO session_set (session_id, exercise_id, position, reps, kg, done)
                  VALUES (?, ?, ?, ?, ?, ?)`,
            values: [session.id, exercise.exerciseId, index, set.reps, set.kg, set.done ? 1 : 0],
          });
        });
      }
    }

    return this.mutate(statements);
  }

  clearPlan(): Promise<void> {
    return this.mutate([{ sql: 'DELETE FROM plan_day' }, { sql: 'DELETE FROM routine_item' }]);
  }

  setMeta(key: string, value: string): Promise<void> {
    return this.mutate([
      {
        sql: `INSERT INTO app_meta (key, value) VALUES (?, ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        values: [key, value],
      },
    ]);
  }

  /** Runs the statements and flushes the web store once, so a reload sees the data. */
  private async mutate(statements: readonly Statement[]): Promise<void> {
    const db = await this.sqlite.getConnection();
    for (const statement of statements) {
      await db.run(statement.sql, statement.values ? [...statement.values] : []);
    }
    await this.sqlite.persist();
  }
}
