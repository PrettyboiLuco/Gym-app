// Supplement-Tracker: Liste, Abhaken pro Tag, Erinnerungen. Nur auf dem Gerät; kommt mit in die Sicherung.

import type { Supplement, SupplementUnit } from '@/domain/supplements';

import { newId, nowUtc, type Db } from './db';

type Row = { id: string; name: string; amount: number | null; unit: SupplementUnit | null; reminder_time: string | null };
const toSupplement = (r: Row): Supplement => ({ id: r.id, name: r.name, amount: r.amount, unit: r.unit, reminderTime: r.reminder_time });

export async function listSupplements(db: Db): Promise<Supplement[]> {
  const rows = await db.getAllAsync<Row>(
    'SELECT id, name, amount, unit, reminder_time FROM supplement WHERE archived = 0 ORDER BY position, created_at_utc'
  );
  return rows.map(toSupplement);
}

/** Neu anlegen (id = null) oder ändern. Abgehakte Tage behalten ihren Schnappschuss. */
export async function saveSupplement(db: Db, id: string | null, value: Omit<Supplement, 'id'>): Promise<string> {
  if (id) {
    await db.runAsync(
      'UPDATE supplement SET name = ?, amount = ?, unit = ?, reminder_time = ? WHERE id = ?',
      value.name,
      value.amount,
      value.unit,
      value.reminderTime,
      id
    );
    return id;
  }
  const newSupplementId = newId();
  const max = await db.getFirstAsync<{ p: number | null }>('SELECT MAX(position) AS p FROM supplement');
  await db.runAsync(
    'INSERT INTO supplement (id, name, amount, unit, reminder_time, position, archived, created_at_utc) VALUES (?, ?, ?, ?, ?, ?, 0, ?)',
    newSupplementId,
    value.name,
    value.amount,
    value.unit,
    value.reminderTime,
    (max?.p ?? -1) + 1,
    nowUtc()
  );
  return newSupplementId;
}

/** Aus der Liste nehmen; erfasste Tage bleiben im Verlauf. */
export async function archiveSupplement(db: Db, id: string) {
  await db.runAsync('UPDATE supplement SET archived = 1, reminder_time = NULL WHERE id = ?', id);
}

/** Abgehakt am Tag `day` (ein Haken pro Supplement und Tag). */
export async function setTaken(db: Db, supplement: Supplement, day: string, taken: boolean) {
  if (!taken) {
    await db.runAsync('DELETE FROM supplement_log WHERE supplement_id = ? AND day = ?', supplement.id, day);
    return;
  }
  await db.runAsync(
    `INSERT INTO supplement_log (id, supplement_id, day, name, amount, unit, taken_at_utc) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (supplement_id, day) DO NOTHING`,
    newId(),
    supplement.id,
    day,
    supplement.name,
    supplement.amount,
    supplement.unit,
    nowUtc()
  );
}

/** Abgehakte Tage je Supplement ab `fromDay`. */
export async function loggedDays(db: Db, fromDay: string): Promise<Map<string, string[]>> {
  const rows = await db.getAllAsync<{ supplement_id: string; day: string }>(
    'SELECT supplement_id, day FROM supplement_log WHERE day >= ?',
    fromDay
  );
  const map = new Map<string, string[]>();
  for (const r of rows) map.set(r.supplement_id, [...(map.get(r.supplement_id) ?? []), r.day]);
  return map;
}

/** Supplements mit Erinnerung (für die Planung der Mitteilungen). */
export async function supplementReminders(db: Db): Promise<Supplement[]> {
  return (await listSupplements(db)).filter((s) => s.reminderTime !== null);
}
