// Blutdruck-Tagebuch (Ausbauplan A10.4): freiwillig, nur Werte und Verlauf – keine Bewertung, keine Grenzwerte.

import { newId, nowUtc, type Db } from './db';

export type BloodPressure = { id: string; day: string; measuredAt: string; systolic: number; diastolic: number; pulse: number | null; note: string | null };

export function listBloodPressure(db: Db, limit = 200) {
  return db.getAllAsync<BloodPressure>(
    `SELECT id, day, measured_at_utc AS measuredAt, systolic, diastolic, pulse, note FROM blood_pressure
     ORDER BY measured_at_utc DESC LIMIT ?`,
    limit
  );
}

export async function addBloodPressure(db: Db, entry: Omit<BloodPressure, 'id'>) {
  await db.runAsync(
    'INSERT INTO blood_pressure (id, day, measured_at_utc, systolic, diastolic, pulse, note, created_at_utc) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    newId(),
    entry.day,
    entry.measuredAt,
    entry.systolic,
    entry.diastolic,
    entry.pulse,
    entry.note?.trim() || null,
    nowUtc()
  );
}

export async function deleteBloodPressure(db: Db, id: string) {
  await db.runAsync('DELETE FROM blood_pressure WHERE id = ?', id);
}
