// Tages-Marken im Verlauf (Migration 29): bewusst gesetzter Ruhetag. Nur Anzeige – zählt nicht als Training.

import { nowUtc, type Db } from './db';

export type DayMark = { day: string; kind: 'ruhetag' };

export function listDayMarks(db: Db, fromDay: string, toDay: string) {
  return db.getAllAsync<DayMark>('SELECT day, kind FROM day_mark WHERE day >= ? AND day <= ? ORDER BY day', fromDay, toDay);
}

/** Ruhetag setzen bzw. wieder entfernen. */
export async function setRestDay(db: Db, day: string, on: boolean) {
  if (on) await db.runAsync("INSERT OR REPLACE INTO day_mark (day, kind, created_at_utc) VALUES (?, 'ruhetag', ?)", day, nowUtc());
  else await db.runAsync('DELETE FROM day_mark WHERE day = ?', day);
}
