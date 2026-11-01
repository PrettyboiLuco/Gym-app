// Cardio-Einträge (Ausbauplan A2): im Training (geplant oder hinzugefügt) oder für sich. Gespeichert wird in der
// lokalen Zeit des Tages, damit Wochensummen zum Kalender passen.

import { timeZone } from '@/components/nutrition-format';
import type { CardioActivity, CardioValues } from '@/domain/cardio';
import { localDay } from '@/domain/time';

import { newId, nowUtc, type Db } from './db';

export type CardioEntry = {
  id: string;
  sessionId: string | null;
  activity: CardioActivity;
  customName: string | null;
  day: string;
  plannedMinutes: number | null;
  atEnd: number;
  minutes: number | null;
  distanceKm: number | null;
  avgHr: number | null;
  effort: number | null;
  level: string | null;
  note: string | null;
  timerStartedAt: string | null;
  completedAt: string | null;
};

const COLUMNS = `id, session_id AS sessionId, activity, custom_name AS customName, day, planned_minutes AS plannedMinutes,
  at_end AS atEnd, minutes, distance_km AS distanceKm, avg_hr AS avgHr, effort, level, note,
  timer_started_at_utc AS timerStartedAt, completed_at_utc AS completedAt`;

export const today = () => localDay(new Date(), timeZone);

export function getCardio(db: Db, id: string) {
  return db.getFirstAsync<CardioEntry>(`SELECT ${COLUMNS} FROM cardio_log WHERE id = ?`, id);
}

export function listCardioForSession(db: Db, sessionId: string) {
  return db.getAllAsync<CardioEntry>(`SELECT ${COLUMNS} FROM cardio_log WHERE session_id = ? ORDER BY created_at_utc`, sessionId);
}

/** Erledigte Einträge zwischen zwei Tagen (einschließlich), neueste zuerst. */
export function listCardio(db: Db, fromDay: string, toDay: string) {
  return db.getAllAsync<CardioEntry>(
    `SELECT ${COLUMNS} FROM cardio_log WHERE completed_at_utc IS NOT NULL AND day >= ? AND day <= ?
     ORDER BY day DESC, completed_at_utc DESC`,
    fromDay,
    toDay
  );
}

/** Offene Einträge ohne Training (z. B. Stoppuhr läuft noch), damit nichts unsichtbar liegen bleibt. */
export function listOpenCardio(db: Db) {
  return db.getAllAsync<CardioEntry>(
    `SELECT ${COLUMNS} FROM cardio_log WHERE session_id IS NULL AND completed_at_utc IS NULL ORDER BY created_at_utc DESC`
  );
}

/** Neuer, noch offener Eintrag (z. B. „Cardio hinzufügen“ im Training). */
export async function addCardio(
  db: Db,
  entry: { activity: CardioActivity; customName?: string | null; sessionId?: string | null; plannedMinutes?: number | null; atEnd?: boolean; day?: string }
) {
  const id = newId();
  await db.runAsync(
    `INSERT INTO cardio_log (id, session_id, activity, custom_name, day, planned_minutes, at_end, created_at_utc)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    entry.sessionId ?? null,
    entry.activity,
    entry.customName?.trim() || null,
    entry.day ?? today(),
    entry.plannedMinutes ?? null,
    entry.atEnd === false ? 0 : 1,
    nowUtc()
  );
  return id;
}

/** Werte eintragen und als erledigt markieren (Stoppuhr wird beendet). */
export async function completeCardio(db: Db, id: string, values: CardioValues, change: { activity?: CardioActivity; customName?: string | null; day?: string } = {}) {
  await db.runAsync(
    `UPDATE cardio_log SET minutes = ?, distance_km = ?, avg_hr = ?, effort = ?, level = ?, note = ?, timer_started_at_utc = NULL,
     completed_at_utc = COALESCE(completed_at_utc, ?) WHERE id = ?`,
    values.minutes,
    values.distanceKm,
    values.avgHr,
    values.effort,
    values.level,
    values.note,
    nowUtc(),
    id
  );
  if (change.activity) await db.runAsync('UPDATE cardio_log SET activity = ? WHERE id = ?', change.activity, id);
  if (change.customName !== undefined) await db.runAsync('UPDATE cardio_log SET custom_name = ? WHERE id = ?', change.customName?.trim() || null, id);
  if (change.day) await db.runAsync('UPDATE cardio_log SET day = ? WHERE id = ?', change.day, id);
}

/** Stoppuhr starten/stoppen; der Startzeitpunkt bleibt gespeichert, auch wenn die App geschlossen wird. */
export async function setCardioTimer(db: Db, id: string, running: boolean) {
  await db.runAsync('UPDATE cardio_log SET timer_started_at_utc = ? WHERE id = ?', running ? nowUtc() : null, id);
}

export async function deleteCardio(db: Db, id: string) {
  await db.runAsync('DELETE FROM cardio_log WHERE id = ?', id);
}

/** Cardio-Minuten je Tag (erledigt) ab einem Tag – für Wochensumme und Trainingstage. */
export async function cardioMinutesByDay(db: Db, fromDay: string): Promise<{ day: string; minutes: number }[]> {
  return db.getAllAsync<{ day: string; minutes: number }>(
    `SELECT day, SUM(minutes) AS minutes FROM cardio_log WHERE completed_at_utc IS NOT NULL AND day >= ? GROUP BY day ORDER BY day`,
    fromDay
  );
}
