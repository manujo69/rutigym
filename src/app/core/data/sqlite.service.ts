import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

export const DATABASE_NAME = 'rutigym';
const DATABASE_VERSION = 1;

/**
 * Schema v1. One table per concept so the data can be queried and audited, instead of JSON blobs.
 * Days are keys (`mon`..`sun`) and `position` keeps the order the user created.
 */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plan_day (
  day TEXT PRIMARY KEY,
  position INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS routine_item (
  day TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  series INTEGER NOT NULL,
  position INTEGER NOT NULL,
  PRIMARY KEY (day, exercise_id)
);

CREATE TABLE IF NOT EXISTS set_log (
  day TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  kg REAL NOT NULL,
  done INTEGER NOT NULL,
  PRIMARY KEY (day, exercise_id, position)
);

CREATE TABLE IF NOT EXISTS last_value (
  exercise_id TEXT PRIMARY KEY,
  reps INTEGER NOT NULL,
  kg REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS workout_session (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  day TEXT NOT NULL,
  demo INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS session_set (
  session_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  kg REAL NOT NULL,
  done INTEGER NOT NULL,
  PRIMARY KEY (session_id, exercise_id, position)
);

CREATE INDEX IF NOT EXISTS idx_session_set_session ON session_set (session_id);
CREATE INDEX IF NOT EXISTS idx_routine_item_day ON routine_item (day);
CREATE INDEX IF NOT EXISTS idx_set_log_day ON set_log (day);
`;

/** Owns the single SQLite connection and creates the schema on first use. */
@Injectable({ providedIn: 'root' })
export class SqliteService {
  private readonly sqlite = new SQLiteConnection(CapacitorSQLite);
  private connectionPromise: Promise<SQLiteDBConnection> | null = null;

  getConnection(): Promise<SQLiteDBConnection> {
    this.connectionPromise ??= this.open();
    return this.connectionPromise;
  }

  /**
   * Flushes the in-memory database into IndexedDB (web only). Native SQLite writes are already
   * durable, so this is a no-op there.
   */
  async persist(): Promise<void> {
    if (Capacitor.getPlatform() === 'web') {
      await this.sqlite.saveToStore(DATABASE_NAME);
    }
  }

  private async open(): Promise<SQLiteDBConnection> {
    // On the web the plugin is backed by jeep-sqlite + sql.js; the wasm lives in /assets.
    if (Capacitor.getPlatform() === 'web') {
      await this.sqlite.initWebStore();
    }

    const existing = await this.sqlite.isConnection(DATABASE_NAME, false);
    const connection = existing.result
      ? await this.sqlite.retrieveConnection(DATABASE_NAME, false)
      : await this.sqlite.createConnection(
          DATABASE_NAME,
          false,
          'no-encryption',
          DATABASE_VERSION,
          false,
        );

    await connection.open();
    await connection.execute(SCHEMA);
    return connection;
  }
}
