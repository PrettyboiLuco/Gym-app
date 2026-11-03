// Hunger, Sättigung und Stimmung je Mahlzeit (Ausbauplan B1, W10) in der Tabelle meal_feeling.

import { cleanFeeling, feelingEmpty, type DayFeelings, type MealFeeling } from '@/domain/meal-feeling';
import type { Meal } from '@/domain/nutrition';

import { newId, nowUtc, type Db } from './db';

export async function loadDayFeelings(db: Db, day: string): Promise<DayFeelings> {
  const rows = await db.getAllAsync<{ meal: Meal; hunger: number | null; fullness: number | null; mood: number | null }>(
    'SELECT meal, hunger, fullness, mood FROM meal_feeling WHERE day = ?',
    day
  );
  const result: DayFeelings = {};
  for (const r of rows) result[r.meal] = cleanFeeling(r);
  return result;
}

/** Speichert die Angaben einer Mahlzeit; ganz leer = Zeile entfernen. */
export async function saveMealFeeling(db: Db, day: string, meal: Meal, feeling: MealFeeling) {
  const f = cleanFeeling(feeling);
  if (feelingEmpty(f)) {
    await db.runAsync('DELETE FROM meal_feeling WHERE day = ? AND meal = ?', day, meal);
    return;
  }
  await db.runAsync(
    `INSERT INTO meal_feeling (id, day, meal, hunger, fullness, mood, updated_at_utc) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (day, meal) DO UPDATE SET hunger = excluded.hunger, fullness = excluded.fullness, mood = excluded.mood,
       updated_at_utc = excluded.updated_at_utc`,
    newId(),
    day,
    meal,
    f.hunger,
    f.fullness,
    f.mood,
    nowUtc()
  );
}
