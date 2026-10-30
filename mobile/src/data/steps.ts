// Schritte in der Datenbank (Register HEALTH-005/006). Eigene Einträge jetzt, Apple Health mit dem
// Development Build (Phase 6.2); beide Quellen werden getrennt gespeichert und nie addiert.

import type { StepEntry, StepSource } from '@/domain/steps';

import { newId, nowUtc, type Db } from './db';

export function listSteps(db: Db, fromDay = '0000-01-01') {
  return db.getAllAsync<StepEntry>(
    `SELECT id, day, steps, source, fetched_at_utc AS fetchedAt FROM steps_entry
     WHERE day >= ? ORDER BY day DESC, fetched_at_utc DESC, rowid DESC`,
    fromDay
  );
}

/** Tagesstand speichern; ein neuer eigener Eintrag ersetzt den alten nicht, der neueste gilt. */
export async function addSteps(
  db: Db,
  day: string,
  steps: number,
  source: StepSource = 'manuell',
  window: { fromUtc: string; toUtc: string } | null = null
) {
  await db.runAsync(
    `INSERT INTO steps_entry (id, day, steps, source, window_from_utc, window_to_utc, fetched_at_utc)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    newId(),
    day,
    steps,
    source,
    window?.fromUtc ?? null,
    window?.toUtc ?? null,
    nowUtc()
  );
}

export async function deleteSteps(db: Db, id: string) {
  await db.runAsync('DELETE FROM steps_entry WHERE id = ?', id);
}
