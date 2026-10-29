// Datenbank-Migrationen. Jede Version kommt als neuer Eintrag ans Ende; bestehende Einträge
// werden nie geändert, damit vorhandene Daten bei Updates erhalten bleiben.

export const MIGRATIONS: string[] = [
  // Version 1: Körpergewicht
  `CREATE TABLE weight_entry (
     id TEXT PRIMARY KEY NOT NULL,
     day TEXT NOT NULL,
     kg REAL NOT NULL CHECK (kg > 0),
     recorded_at_utc TEXT NOT NULL
   );
   CREATE INDEX weight_entry_day ON weight_entry (day);`,
];
