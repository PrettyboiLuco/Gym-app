// Datenbank-Migrationen. Jede Version kommt als neuer Eintrag ans Ende; bestehende Einträge
// werden nie geändert, damit vorhandene Daten bei Updates erhalten bleiben.

import { HIIT_EXERCISES, MORE_STRENGTH_EXERCISES, MOVEMENT_PATTERNS, STARTER_EXERCISES, STRETCH_EXERCISES } from '@/domain/exercises';

import type { Db } from './db';

const starterInserts = STARTER_EXERCISES.map(
  (e) =>
    `INSERT INTO exercise (id, name_key, custom_name, equipment, muscle_group, created_at_utc)
     VALUES ('${e.id}', 'exercises.${e.id}', NULL, '${e.equipment}', '${e.muscleGroup}', '2026-10-29T00:00:00Z');`
).join('\n');

// Ab Version 6: Übungen mit Art, Seiten, Haltezeit und Messung (Register STRETCH-007, UX-011).
const phase5Inserts = [
  ...HIIT_EXERCISES.map(
    (e) => `INSERT INTO exercise (id, name_key, custom_name, equipment, muscle_group, created_at_utc, kind, sides, hold_seconds, measure)
     VALUES ('${e.id}', 'exercises.${e.id}', NULL, '${e.equipment}', '${e.muscleGroup}', '2026-10-30T00:00:00Z', 'kraft', '${e.sides}', NULL, '${e.measure}');`
  ),
  ...STRETCH_EXERCISES.map(
    (e) => `INSERT INTO exercise (id, name_key, custom_name, equipment, muscle_group, created_at_utc, kind, sides, hold_seconds, measure)
     VALUES ('${e.id}', 'exercises.${e.id}', NULL, '${e.equipment}', '${e.muscleGroup}', '2026-10-30T00:00:00Z', '${e.kind}', '${e.sides}', ${e.holdSeconds}, 'zeit');`
  ),
].join('\n');

// Ab Version 8: weitere Kraftübungen für Vorlagen und Ersatzübungen (Phase 8).
const phase8Inserts = MORE_STRENGTH_EXERCISES.map(
  (e) => `INSERT INTO exercise (id, name_key, custom_name, equipment, muscle_group, created_at_utc, kind, sides, hold_seconds, measure)
     VALUES ('${e.id}', 'exercises.${e.id}', NULL, '${e.equipment}', '${e.muscleGroup}', '2026-10-30T00:00:00Z', 'kraft', '${e.sides}', NULL, 'wdh');`
).join('\n');

const patternList = MOVEMENT_PATTERNS.map((p) => `'${p}'`).join(', ');

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
     -- Zubereitung getrennt halten, z. B. Reis roh vs. gekocht (FOOD-011); NULL = keine Angabe.
     prep TEXT CHECK (prep IS NULL OR prep IN ('roh', 'gekocht')),
     NUTRIENTS,
     serving_amount REAL CHECK (serving_amount IS NULL OR serving_amount > 0),
     favorite INTEGER NOT NULL DEFAULT 0 CHECK (favorite IN (0, 1)),
     -- Aus der Liste entfernt; bleibt für alte Einträge, Vorlagen und Rezepte erhalten.
     archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
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
     -- 'portion' nur für Rezepte ohne Endgewicht (FOOD-017).
     unit TEXT NOT NULL CHECK (unit IN ('g', 'ml', 'portion')),
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

  // Version 4: Körper, Ziele, Kalorienziel (Register GOAL-001–005, UX-002, CALC, COACH-004)
  // Ziele sind versioniert mit Gültig-ab-Datum: ein neues Ziel ändert vergangene Tage nicht (GOAL-002).
  `CREATE TABLE calorie_goal (
     id TEXT PRIMARY KEY NOT NULL,
     valid_from TEXT NOT NULL,
     -- NULL = ab diesem Tag kein Kalorienziel.
     kcal INTEGER CHECK (kcal IS NULL OR kcal BETWEEN 500 AND 10000),
     source TEXT NOT NULL CHECK (source IN ('eigen', 'rechner')),
     -- Rechner-Eingaben als Schnappschuss (JSON), damit die Herkunft nachvollziehbar bleibt.
     inputs TEXT,
     created_at_utc TEXT NOT NULL
   );
   CREATE INDEX calorie_goal_from ON calorie_goal (valid_from);
   -- Bisheriges Ziel aus den Ernährungs-Einstellungen gilt für alle bisherigen Tage weiter.
   INSERT INTO calorie_goal (id, valid_from, kcal, source, inputs, created_at_utc)
     SELECT 'migriert-v4', '0001-01-01', CAST(json_extract(value, '$.kcalGoal') AS INTEGER), 'eigen', NULL, '2026-10-29T00:00:00Z'
     FROM app_state WHERE key = 'nutrition_settings' AND json_extract(value, '$.kcalGoal') IS NOT NULL;
   CREATE TABLE goal (
     id TEXT PRIMARY KEY NOT NULL,
     kind TEXT NOT NULL CHECK (kind IN ('gewicht', 'kraft', 'gewohnheit')),
     created_at_utc TEXT NOT NULL
   );
   CREATE TABLE goal_version (
     id TEXT PRIMARY KEY NOT NULL,
     goal_id TEXT NOT NULL REFERENCES goal (id),
     version INTEGER NOT NULL CHECK (version > 0),
     valid_from TEXT NOT NULL,
     status TEXT NOT NULL CHECK (status IN ('aktiv', 'beendet')),
     direction TEXT CHECK (direction IS NULL OR direction IN ('abnehmen', 'halten', 'zunehmen')),
     target_kg REAL CHECK (target_kg IS NULL OR target_kg >= 0),
     start_kg REAL CHECK (start_kg IS NULL OR start_kg > 0),
     exercise_id TEXT REFERENCES exercise (id),
     target_reps INTEGER CHECK (target_reps IS NULL OR target_reps BETWEEN 1 AND 100),
     habit TEXT CHECK (habit IS NULL OR habit IN ('training', 'trinken')),
     per_week INTEGER CHECK (per_week IS NULL OR per_week BETWEEN 1 AND 7),
     created_at_utc TEXT NOT NULL,
     UNIQUE (goal_id, version)
   );
   CREATE TABLE body_measurement (
     id TEXT PRIMARY KEY NOT NULL,
     day TEXT NOT NULL,
     site TEXT NOT NULL CHECK (site IN ('taille', 'huefte', 'brust', 'arm', 'oberschenkel')),
     cm REAL NOT NULL CHECK (cm > 0),
     recorded_at_utc TEXT NOT NULL
   );
   CREATE INDEX body_measurement_site ON body_measurement (site, day);`,

  // Version 5: Fortschrittsfotos (Register GOAL-008). Nur der Dateiname steht hier; die Datei liegt im
  // App-Ordner auf dem Gerät. Kein Upload, keine Weitergabe.
  `CREATE TABLE progress_photo (
     id TEXT PRIMARY KEY NOT NULL,
     day TEXT NOT NULL,
     pose TEXT NOT NULL CHECK (pose IN ('vorne', 'seite', 'hinten')),
     file_name TEXT NOT NULL UNIQUE,
     created_at_utc TEXT NOT NULL
   );
   CREATE INDEX progress_photo_day ON progress_photo (day);`,

  // Version 6: Dehnung, Mobilität, HIIT (Register STRETCH-001–007, HIIT-001–005, UX-011, GOAL-001)
  `ALTER TABLE exercise ADD COLUMN kind TEXT NOT NULL DEFAULT 'kraft'
     CHECK (kind IN ('kraft', 'dehnung_statisch', 'dehnung_dynamisch', 'mobilitaet'));
   ALTER TABLE exercise ADD COLUMN sides TEXT NOT NULL DEFAULT 'beidseitig' CHECK (sides IN ('beidseitig', 'einseitig'));
   ALTER TABLE exercise ADD COLUMN hold_seconds INTEGER CHECK (hold_seconds IS NULL OR hold_seconds BETWEEN 5 AND 300);
   ALTER TABLE exercise ADD COLUMN measure TEXT NOT NULL DEFAULT 'wdh' CHECK (measure IN ('wdh', 'zeit'));
   UPDATE exercise SET measure = 'zeit' WHERE id = 'plank';
   ${phase5Inserts}
   -- Zeit-Sätze (UX-011): Bei Übungen mit Messung „zeit“ gilt target_seconds; reps_min/reps_max
   -- bleiben dann 1/1 als Platzhalter, weil die alte Spalte keine NULL-Werte erlaubt.
   ALTER TABLE plan_item ADD COLUMN target_seconds INTEGER CHECK (target_seconds IS NULL OR target_seconds BETWEEN 5 AND 600);
   -- Plank wurde bisher in Wiederholungen geplant; der bisherige Höchstwert wird als Sekunden übernommen.
   UPDATE plan_item SET target_seconds = MIN(600, MAX(5, reps_max)), reps_min = 1, reps_max = 1 WHERE exercise_id = 'plank';
   ALTER TABLE set_log ADD COLUMN planned_seconds INTEGER CHECK (planned_seconds IS NULL OR planned_seconds > 0);
   ALTER TABLE set_log ADD COLUMN seconds INTEGER CHECK (seconds IS NULL OR seconds > 0);
   -- Aufwärmen/Cool-down je Trainingstag vorschlagen (STRETCH-001/002), Standard an.
   ALTER TABLE plan_day ADD COLUMN warmup INTEGER NOT NULL DEFAULT 1 CHECK (warmup IN (0, 1));
   ALTER TABLE plan_day ADD COLUMN cooldown INTEGER NOT NULL DEFAULT 1 CHECK (cooldown IN (0, 1));
   -- Eigene Dehnroutinen und HIIT-Abläufe, versioniert wie Pläne (STRETCH-003, HIIT-004).
   CREATE TABLE routine (
     id TEXT PRIMARY KEY NOT NULL,
     kind TEXT NOT NULL CHECK (kind IN ('dehnen', 'hiit')),
     created_at_utc TEXT NOT NULL
   );
   CREATE TABLE routine_version (
     id TEXT PRIMARY KEY NOT NULL,
     routine_id TEXT NOT NULL REFERENCES routine (id),
     version INTEGER NOT NULL CHECK (version > 0),
     name TEXT NOT NULL CHECK (length(trim(name)) > 0),
     active INTEGER NOT NULL CHECK (active IN (0, 1)),
     switch_seconds INTEGER NOT NULL CHECK (switch_seconds BETWEEN 0 AND 30),
     transition_seconds INTEGER NOT NULL CHECK (transition_seconds BETWEEN 0 AND 60),
     work_seconds INTEGER NOT NULL CHECK (work_seconds BETWEEN 5 AND 300),
     rest_seconds INTEGER NOT NULL CHECK (rest_seconds BETWEEN 0 AND 300),
     rounds INTEGER NOT NULL CHECK (rounds BETWEEN 1 AND 20),
     round_rest_seconds INTEGER NOT NULL CHECK (round_rest_seconds BETWEEN 0 AND 600),
     created_at_utc TEXT NOT NULL,
     UNIQUE (routine_id, version)
   );
   CREATE TABLE routine_item (
     id TEXT PRIMARY KEY NOT NULL,
     routine_version_id TEXT NOT NULL REFERENCES routine_version (id),
     position INTEGER NOT NULL,
     exercise_id TEXT NOT NULL REFERENCES exercise (id),
     seconds INTEGER NOT NULL CHECK (seconds BETWEEN 5 AND 300)
   );
   -- Protokoll absolvierter Einheiten, getrennt von Kraft-Sätzen (STRETCH-005, HIIT-005).
   CREATE TABLE timed_session (
     id TEXT PRIMARY KEY NOT NULL,
     kind TEXT NOT NULL CHECK (kind IN ('dehnen', 'hiit', 'aufwaermen', 'cooldown')),
     name TEXT NOT NULL,
     source TEXT NOT NULL,
     routine_version_id TEXT REFERENCES routine_version (id),
     workout_session_id TEXT REFERENCES workout_session (id),
     status TEXT NOT NULL CHECK (status IN ('aktiv', 'abgeschlossen', 'abgebrochen')),
     abort_reason TEXT,
     planned_seconds INTEGER NOT NULL CHECK (planned_seconds > 0),
     done_seconds INTEGER CHECK (done_seconds IS NULL OR done_seconds >= 0),
     rounds_done INTEGER CHECK (rounds_done IS NULL OR rounds_done >= 0),
     -- Übungsfolge als Schnappschuss (JSON-Liste von Übungs-IDs).
     items TEXT NOT NULL,
     started_at_utc TEXT NOT NULL,
     finished_at_utc TEXT
   );
   CREATE INDEX timed_session_started ON timed_session (started_at_utc);
   -- Beweglichkeits-Selbsttest (Kap. 21.2 Punkt 5): Abstand Fingerspitzen–Boden in cm, 0 = Boden erreicht.
   CREATE TABLE flexibility_test (
     id TEXT PRIMARY KEY NOT NULL,
     day TEXT NOT NULL,
     test TEXT NOT NULL CHECK (test IN ('finger_boden')),
     cm REAL NOT NULL CHECK (cm BETWEEN 0 AND 100),
     recorded_at_utc TEXT NOT NULL
   );
   -- Ziele: neue Art „beweglichkeit“ und Gewohnheit „dehnen“. SQLite kann CHECK-Regeln nicht ändern,
   -- daher werden goal und goal_version neu angelegt. Reihenfolge so, dass nie ein Verweis ins Leere zeigt:
   -- Versionen sichern, Kind- vor Elterntabelle löschen, neu anlegen, zurückkopieren.
   CREATE TABLE goal_new (
     id TEXT PRIMARY KEY NOT NULL,
     kind TEXT NOT NULL CHECK (kind IN ('gewicht', 'kraft', 'gewohnheit', 'beweglichkeit')),
     created_at_utc TEXT NOT NULL
   );
   INSERT INTO goal_new (id, kind, created_at_utc) SELECT id, kind, created_at_utc FROM goal;
   CREATE TABLE goal_version_backup AS SELECT * FROM goal_version;
   DROP TABLE goal_version;
   DROP TABLE goal;
   ALTER TABLE goal_new RENAME TO goal;
   CREATE TABLE goal_version (
     id TEXT PRIMARY KEY NOT NULL,
     goal_id TEXT NOT NULL REFERENCES goal (id),
     version INTEGER NOT NULL CHECK (version > 0),
     valid_from TEXT NOT NULL,
     status TEXT NOT NULL CHECK (status IN ('aktiv', 'beendet')),
     direction TEXT CHECK (direction IS NULL OR direction IN ('abnehmen', 'halten', 'zunehmen')),
     target_kg REAL CHECK (target_kg IS NULL OR target_kg >= 0),
     start_kg REAL CHECK (start_kg IS NULL OR start_kg > 0),
     exercise_id TEXT REFERENCES exercise (id),
     target_reps INTEGER CHECK (target_reps IS NULL OR target_reps BETWEEN 1 AND 100),
     habit TEXT CHECK (habit IS NULL OR habit IN ('training', 'trinken', 'dehnen')),
     per_week INTEGER CHECK (per_week IS NULL OR per_week BETWEEN 1 AND 7),
     target_cm REAL CHECK (target_cm IS NULL OR target_cm BETWEEN 0 AND 100),
     created_at_utc TEXT NOT NULL,
     UNIQUE (goal_id, version)
   );
   INSERT INTO goal_version (id, goal_id, version, valid_from, status, direction, target_kg, start_kg, exercise_id,
     target_reps, habit, per_week, target_cm, created_at_utc)
     SELECT id, goal_id, version, valid_from, status, direction, target_kg, start_kg, exercise_id,
     target_reps, habit, per_week, NULL, created_at_utc FROM goal_version_backup;
   DROP TABLE goal_version_backup;`,

  // Version 7: Schritte und Gewohnheit „Schritte“ (Register HEALTH-005/006, GOAL-001)
  // Pro Tag und Quelle; Abrufzeit und Fenster werden gespeichert (HEALTH-006).
  `CREATE TABLE steps_entry (
     id TEXT PRIMARY KEY NOT NULL,
     day TEXT NOT NULL,
     steps INTEGER NOT NULL CHECK (steps BETWEEN 0 AND 100000),
     source TEXT NOT NULL CHECK (source IN ('manuell', 'apple_health')),
     window_from_utc TEXT,
     window_to_utc TEXT,
     fetched_at_utc TEXT NOT NULL
   );
   CREATE INDEX steps_entry_day ON steps_entry (day);
   -- goal_version wird von keiner Tabelle referenziert und kann direkt neu angelegt werden.
   CREATE TABLE goal_version_new (
     id TEXT PRIMARY KEY NOT NULL,
     goal_id TEXT NOT NULL REFERENCES goal (id),
     version INTEGER NOT NULL CHECK (version > 0),
     valid_from TEXT NOT NULL,
     status TEXT NOT NULL CHECK (status IN ('aktiv', 'beendet')),
     direction TEXT CHECK (direction IS NULL OR direction IN ('abnehmen', 'halten', 'zunehmen')),
     target_kg REAL CHECK (target_kg IS NULL OR target_kg >= 0),
     start_kg REAL CHECK (start_kg IS NULL OR start_kg > 0),
     exercise_id TEXT REFERENCES exercise (id),
     target_reps INTEGER CHECK (target_reps IS NULL OR target_reps BETWEEN 1 AND 100),
     habit TEXT CHECK (habit IS NULL OR habit IN ('training', 'trinken', 'dehnen', 'schritte')),
     per_week INTEGER CHECK (per_week IS NULL OR per_week BETWEEN 1 AND 7),
     target_cm REAL CHECK (target_cm IS NULL OR target_cm BETWEEN 0 AND 100),
     target_steps INTEGER CHECK (target_steps IS NULL OR target_steps BETWEEN 1000 AND 50000),
     created_at_utc TEXT NOT NULL,
     UNIQUE (goal_id, version)
   );
   INSERT INTO goal_version_new (id, goal_id, version, valid_from, status, direction, target_kg, start_kg, exercise_id,
     target_reps, habit, per_week, target_cm, target_steps, created_at_utc)
     SELECT id, goal_id, version, valid_from, status, direction, target_kg, start_kg, exercise_id,
     target_reps, habit, per_week, target_cm, NULL, created_at_utc FROM goal_version;
   DROP TABLE goal_version;
   ALTER TABLE goal_version_new RENAME TO goal_version;`,

  // Version 8: Planassistent (Register TRAIN-005–011, -016, Phase 8)
  // Bewegungsmuster für eigene Übungen (NULL = aus der Muskelgruppe abgeleitet). Startübungen haben
  // ihr Muster im Code (domain/exercises.ts), damit Korrekturen ohne Migration möglich sind.
  `ALTER TABLE exercise ADD COLUMN pattern TEXT CHECK (pattern IS NULL OR pattern IN (${patternList}));
   -- Grund der Änderung (z. B. „Planassistent: 6 → 4 Tage“) für die Versionsliste.
   ALTER TABLE plan_version ADD COLUMN note TEXT;
   -- Befristete Version „nur diese Woche“ (TRAIN-008): gilt bis einschließlich valid_until, danach wird
   -- return_version_id wieder aktiv. Die Standardversion bleibt dabei unverändert.
   ALTER TABLE plan_version ADD COLUMN valid_until TEXT;
   ALTER TABLE plan_version ADD COLUMN return_version_id TEXT REFERENCES plan_version (id);
   ${phase8Inserts}`,

  // Version 9: Coach-Check-in, Schlaf, Allergene (Register COACH-006, -008, -009, Phase 9)
  // Allergene/Spuren als JSON-Liste laut Produktangabe; NULL = unbekannt, '[]' = keine angegeben.
  `ALTER TABLE food ADD COLUMN allergens TEXT;
   ALTER TABLE food ADD COLUMN traces TEXT;
   ALTER TABLE food ADD COLUMN diet TEXT CHECK (diet IS NULL OR diet IN ('vegan', 'vegetarisch', 'nicht_vegetarisch'));
   -- Schlaf nur als Erholungskontext, nie als Kalorienfaktor (COACH-006). day = Tag des Aufwachens.
   CREATE TABLE sleep_entry (
     id TEXT PRIMARY KEY NOT NULL,
     day TEXT NOT NULL,
     hours REAL NOT NULL CHECK (hours > 0 AND hours <= 16),
     quality INTEGER CHECK (quality IS NULL OR quality BETWEEN 1 AND 5),
     recorded_at_utc TEXT NOT NULL
   );
   CREATE INDEX sleep_entry_day ON sleep_entry (day);
   -- Wöchentlicher Check-in (COACH-008): Zusammenfassung und Vorschlag als Schnappschuss, Entscheidung getrennt.
   CREATE TABLE checkin (
     id TEXT PRIMARY KEY NOT NULL,
     week_end TEXT NOT NULL,
     rules_version INTEGER NOT NULL,
     summary TEXT NOT NULL,
     suggestion TEXT,
     decision TEXT NOT NULL CHECK (decision IN ('angenommen', 'abgelehnt', 'ohne')),
     created_at_utc TEXT NOT NULL
   );`,
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
