import type { WeightEntry } from '@/domain/weight';

import { newId, nowUtc, type Db } from './db';

export function listWeights(db: Db) {
  return db.getAllAsync<WeightEntry>(
    'SELECT id, day, kg FROM weight_entry ORDER BY day DESC, recorded_at_utc DESC'
  );
}

export async function addWeight(db: Db, day: string, kg: number) {
  await db.runAsync(
    'INSERT INTO weight_entry (id, day, kg, recorded_at_utc) VALUES (?, ?, ?, ?)',
    newId(),
    day,
    kg,
    nowUtc()
  );
}

export async function deleteWeight(db: Db, id: string) {
  await db.runAsync('DELETE FROM weight_entry WHERE id = ?', id);
}
