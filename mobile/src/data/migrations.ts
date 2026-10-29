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

  // Version 3: Ernährung, Getränke, Rezepte, Vorlagen (Register FOOD, TIME, TRACK)
  // Nährwerte: NULL = unbekannt, nie stillschweigend 0.
  `CREATE TABLE food (
     id TEXT PRIMARY KEY NOT NULL,
     source TEXT NOT NULL CHECK (source IN ('eigen', 'off')),
     barcode TEXT,
     name TEXT NOT NULL CHECK (length(trim(name)) > 0),
     brand TEXT,
     basis TEXT NOT NULL CHECK (basis IN ('g', 'ml')),
     NUTRIENTS,
     serving_amount REAL CHECK (serving_amount IS NULL OR serving_amount > 0),
     favorite INTEGER NOT NULL DEFAULT 0 CHECK (favorite IN (0, 1)),
     fetched_at_utc TEXT,
     created_at_utc TEXT NOT NULL,
     updated_at_utc TEXT NOT NULL
   );
   CREATE INDEX food_barcode ON food (barcode);
   CREATE TABLE recipe (
     id TEXT PRIMARY KEY NOT NULL,
     created_at_utc TEXT NOT NULL
   );
   CREATE TABLE recipe_version (
     id TEXT PRIMARY KEY NOT NULL,
     recipe_id TEXT NOT NULL REFERENCES recipe (id),
     version INTEGER NOT NULL CHECK (version > 0),
     name TEXT NOT NULL CHECK (length(trim(name)) > 0),
     end_weight_g REAL CHECK (end_weight_g IS NULL OR end_weight_g > 0),
     portions INTEGER CHECK (portions IS NULL OR portions > 0),
     active INTEGER NOT NULL CHECK (active IN (0, 1)),
     created_at_utc TEXT NOT NULL,
     UNIQUE (recipe_id, version)
   );
   CREATE TABLE recipe_ingredient (
     id TEXT PRIMARY KEY NOT NULL,
     recipe_version_id TEXT NOT NULL REFERENCES recipe_version (id),
     position INTEGER NOT NULL,
     food_id TEXT REFERENCES food (id),
     name TEXT NOT NULL,
     amount REAL NOT NULL CHECK (amount > 0),
     unit TEXT NOT NULL CHECK (unit IN ('g', 'ml')),
     NUTRIENTS
   );
   CREATE TABLE meal_template (
     id TEXT PRIMARY KEY NOT NULL,
     name TEXT NOT NULL CHECK (length(trim(name)) > 0),
     created_at_utc TEXT NOT NULL
   );
   CREATE TABLE meal_template_item (
     id TEXT PRIMARY KEY NOT NULL,
     template_id TEXT NOT NULL REFERENCES meal_template (id) ON DELETE CASCADE,
     position INTEGER NOT NULL,
     food_id TEXT NOT NULL REFERENCES food (id),
     amount REAL NOT NULL CHECK (amount > 0),
     unit TEXT NOT NULL CHECK (unit IN ('g', 'ml'))
   );
   -- Ein Eintrag für Essen und Getränke: kalorienhaltige Getränke zählen genau einmal (TIME-005).
   -- Name und Nährwerte sind ein Schnappschuss; spätere Produktänderungen ändern ihn nicht (FOOD-012).
   CREATE TABLE consumption_event (
     id TEXT PRIMARY KEY NOT NULL,
     kind TEXT NOT NULL CHECK (kind IN ('essen', 'getraenk')),
     meal TEXT CHECK (meal IS NULL OR meal IN ('fruehstueck', 'mittag', 'abend', 'snack')),
     drink_type TEXT CHECK (drink_type IS NULL OR drink_type IN ('wasser', 'kaffee_tee', 'milch', 'saft', 'softdrink', 'alkohol', 'sonstiges')),
     food_id TEXT REFERENCES food (id),
     recipe_version_id TEXT REFERENCES recipe_version (id),
     name TEXT NOT NULL,
     brand TEXT,
     amount REAL NOT NULL CHECK (amount > 0),
     unit TEXT NOT NULL CHECK (unit IN ('g', 'ml')),
     NUTRIENTS,
     occurred_at_utc TEXT NOT NULL,
     recorded_at_utc TEXT NOT NULL,
     time_zone TEXT NOT NULL,
     utc_offset_min INTEGER NOT NULL,
     diary_date TEXT NOT NULL
   );
   CREATE INDEX consumption_diary ON consumption_event (diary_date);`.replaceAll('NUTRIENTS', `kcal REAL CHECK (kcal IS NULL OR kcal >= 0),
     protein REAL CHECK (protein IS NULL OR protein >= 0),
     carbs REAL CHECK (carbs IS NULL OR carbs >= 0),
     fat REAL CHECK (fat IS NULL OR fat >= 0)`),
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
