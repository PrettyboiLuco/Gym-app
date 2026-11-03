// Fasten-Timer (Ausbauplan B1, E2): Einstellungen im App-Zustand, Fenster in der Tabelle fasting_period.

import { DEFAULT_FASTING, validFastingHours, type FastingPeriod, type FastingSettings } from '@/domain/fasting';

import { readState, writeState } from './app-state';
import { newId, nowUtc, type Db } from './db';

const COLUMNS = 'id, started_at_utc AS startedAt, planned_hours AS plannedHours, ended_at_utc AS endedAt';

export async function loadFastingSettings(db: Db): Promise<FastingSettings> {
  const s = await readState<Partial<FastingSettings>>(db, 'fasting', {});
  return {
    enabled: s.enabled ?? DEFAULT_FASTING.enabled,
    hours: typeof s.hours === 'number' && validFastingHours(s.hours) ? s.hours : DEFAULT_FASTING.hours,
    notify: s.notify ?? DEFAULT_FASTING.notify,
  };
}

export const saveFastingSettings = (db: Db, s: FastingSettings) => writeState(db, 'fasting', s);

/** Das laufende Fenster (höchstens eins), sonst null. */
export function currentFast(db: Db) {
  return db.getFirstAsync<FastingPeriod>(`SELECT ${COLUMNS} FROM fasting_period WHERE ended_at_utc IS NULL ORDER BY started_at_utc DESC`);
}

/** Beendete Fenster, neueste zuerst. */
export function listFasts(db: Db, limit = 30) {
  return db.getAllAsync<FastingPeriod>(`SELECT ${COLUMNS} FROM fasting_period WHERE ended_at_utc IS NOT NULL ORDER BY started_at_utc DESC LIMIT ?`, limit);
}

/** Startet ein Fenster. Läuft schon eins, wird es zuerst beendet (in derselben Transaktion). */
export async function startFast(db: Db, plannedHours: number, at: Date = new Date()) {
  if (!validFastingHours(plannedHours)) throw new Error('invalid hours');
  const id = newId();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE fasting_period SET ended_at_utc = ? WHERE ended_at_utc IS NULL', at.toISOString());
    await db.runAsync(
      'INSERT INTO fasting_period (id, started_at_utc, planned_hours, ended_at_utc, created_at_utc) VALUES (?, ?, ?, NULL, ?)',
      id,
      at.toISOString(),
      plannedHours,
      nowUtc()
    );
  });
  return id;
}

/** Beendet das laufende Fenster; das Ende liegt nie vor dem Start. */
export async function stopFast(db: Db, id: string, at: Date = new Date()) {
  await db.runAsync('UPDATE fasting_period SET ended_at_utc = MAX(started_at_utc, ?) WHERE id = ? AND ended_at_utc IS NULL', at.toISOString(), id);
}

export async function deleteFast(db: Db, id: string) {
  await db.runAsync('DELETE FROM fasting_period WHERE id = ?', id);
}
