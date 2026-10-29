// Datenbank-Migrationen. Jede Version kommt als neuer Eintrag ans Ende; bestehende Einträge
// werden nie geändert, damit vorhandene Daten bei Updates erhalten bleiben.

import { STARTER_EXERCISES } from '@/domain/exercises';

import type { Db } from './db';

const starterInserts = STARTER_EXERCISES.map(
  (e) =>
    `INSERT INTO exercise (id, name_key, custom_name, equipment, muscle_group, created_at_utc)
     VALUES ('${e.id}', 'exercises.${e.id}', NULL, '${e.equipment}', '${e.muscleGroup}', '2026-10-29T00:00:00Z');`
).join('\n');

export const MIGRATIONS: string[] = [
  // Version 1: Körpergewicht
  `CREATE TABLE weight_entry (
     id TEXT PRIMARY KEY NOT NULL,
     day TEXT NOT NULL,
     kg REAL NOT NULL CHECK (kg > 0),
     recorded_at_utc TEXT NOT NULL
   );
   CREATE INDEX weight_entry_day ON weight_entry (day);`,

  // Version 2: Training (Register TRAIN-002–015, HEALTH-008/009/011)
  `CREATE TABLE exercise (
     id TEXT PRIMARY KEY NOT NULL,
     name_key TEXT,
     custom_name TEXT,
     equipment TEXT NOT NULL,
     muscle_group TEXT NOT NULL,
     created_at_utc TEXT NOT NULL,
     CHECK (name_key IS NOT NULL OR custom_name IS NOT NULL)
   );
   CREATE TABLE plan (
     id TEXT PRIMARY KEY NOT NULL,
     created_at_utc TEXT NOT NULL
   );
   CREATE TABLE plan_version (
     id TEXT PRIMARY KEY NOT NULL,
     plan_id TEXT NOT NULL REFERENCES plan (id),
     version INTEGER NOT NULL CHECK (version > 0),
     name TEXT NOT NULL,
     active INTEGER NOT NULL CHECK (active IN (0, 1)),
     created_at_utc TEXT NOT NULL,
     UNIQUE (plan_id, version)
   );
   CREATE TABLE plan_day (
     id TEXT PRIMARY KEY NOT NULL,
     plan_version_id TEXT NOT NULL REFERENCES plan_version (id),
     position INTEGER NOT NULL,
     name TEXT NOT NULL
   );
   CREATE TABLE plan_item (
     id TEXT PRIMARY KEY NOT NULL,
     plan_day_id TEXT NOT NULL REFERENCES plan_day (id),
     position INTEGER NOT NULL,
     exercise_id TEXT NOT NULL REFERENCES exercise (id),
     sets INTEGER NOT NULL CHECK (sets BETWEEN 1 AND 20),
     reps_min INTEGER NOT NULL CHECK (reps_min BETWEEN 1 AND 100),
     reps_max INTEGER NOT NULL CHECK (reps_max >= reps_min AND reps_max <= 100),
     rest_seconds INTEGER NOT NULL CHECK (rest_seconds BETWEEN 0 AND 1800)
   );
   CREATE TABLE workout_session (
     id TEXT PRIMARY KEY NOT NULL,
     plan_day_id TEXT REFERENCES plan_day (id),
     status TEXT NOT NULL CHECK (status IN ('aktiv', 'abgeschlossen', 'abgebrochen')),
     abort_reason TEXT,
     started_at_utc TEXT NOT NULL,
     finished_at_utc TEXT
   );
   CREATE TABLE set_log (
     id TEXT PRIMARY KEY NOT NULL,
     session_id TEXT NOT NULL REFERENCES workout_session (id),
     exercise_id TEXT NOT NULL REFERENCES exercise (id),
     position INTEGER NOT NULL,
     planned_reps_min INTEGER,
     planned_reps_max INTEGER,
     rest_seconds INTEGER NOT NULL DEFAULT 0,
     weight_kg REAL CHECK (weight_kg IS NULL OR weight_kg >= 0),
     reps INTEGER CHECK (reps IS NULL OR reps > 0),
     completed_at_utc TEXT
   );
   CREATE INDEX set_log_exercise ON set_log (exercise_id, completed_at_utc);
   CREATE TABLE app_state (
     key TEXT PRIMARY KEY NOT NULL,
     value TEXT NOT NULL
   );
   ${starterInserts}`,
];

/** Bringt die Datenbank auf den neuesten Stand. Jede Version läuft in einer eigenen Transaktion. */
export async function migrate(db: Db) {
  await db.execAsync('PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let version = current; version < MIGRATIONS.length; version++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[version]);
      await db.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
  }
}
