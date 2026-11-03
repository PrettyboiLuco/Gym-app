// Einblicke (W9): gewählte Kacheln (app_state) und die Tageswerte der letzten Wochen für Kacheln und Wochen-Muster.

import { shiftDay } from '@/domain/dates';
import { cleanTiles, completeFood, PATTERN_WEEKS, SPARK_DAYS, type InsightDay, type InsightTile } from '@/domain/insights';
import { stepsForDay } from '@/domain/steps';
import type { WeightEntry } from '@/domain/weight';

import { readState, writeState } from './app-state';
import { listSleep } from './coach';
import type { Db } from './db';
import { calorieGoalOn, trainingDays } from './goals';
import { daySums } from './nutrition';
import { readinessHistory } from './readiness';
import { listSteps } from './steps';
import { listWeights } from './weights';

const TILES_KEY = 'insight_tiles';

/** Gewählte Kacheln; ohne Auswahl die Vorgabe. Unbekannte Einträge (ältere Fassungen) fallen weg. */
export const loadInsightTiles = async (db: Db): Promise<InsightTile[]> => cleanTiles(await readState<unknown>(db, TILES_KEY, null));

export const saveInsightTiles = (db: Db, tiles: readonly InsightTile[]) => writeState(db, TILES_KEY, cleanTiles(tiles));

/**
 * Tageswerte von 8 Wochen vor dem letzten abgeschlossenen Ernährungstag (`foodEnd`) bis heute, ältester zuerst, dazu alle
 * Gewichtsmessungen (der Trend braucht auch Tage vor dem Fenster). Nur lesend – keine Transaktion nötig.
 */
export async function loadInsightData(
  db: Db,
  today: string,
  foodEnd: string,
  timeZone: string,
  withReadiness = true
): Promise<{ days: InsightDay[]; weights: WeightEntry[] }> {
  const start = shiftDay(foodEnd < today ? foodEnd : today, -(PATTERN_WEEKS * 7 - 1));
  const [sums, trained, steps, sleep, weights, history] = await Promise.all([
    daySums(db, start, today),
    // Etwas früher anfangen, damit Zeitzonen den ersten Tag nicht abschneiden; gezählt wird nach lokalem Tag.
    trainingDays(db, `${shiftDay(start, -1)}T00:00:00.000Z`, timeZone),
    listSteps(db, start),
    listSleep(db, start),
    listWeights(db),
    withReadiness ? readinessHistory(db, today, SPARK_DAYS) : Promise.resolve([]),
  ]);
  const sumByDay = new Map(sums.map((s) => [s.day, s]));
  const trainedSet = new Set(trained);
  const sleepByDay = new Map(sleep.map((s) => [s.day, s.hours]));
  const levelByDay = new Map(history.map((h) => [h.day, h.readiness.kind === 'ampel' ? h.readiness.level : null]));

  const days: InsightDay[] = [];
  for (let day = start; day <= today; day = shiftDay(day, 1)) {
    const sum = sumByDay.get(day);
    const food = sum ? completeFood(sum) : null;
    // Eiweißziel nur an erfassten Tagen nachschlagen – das Ziel kann sich von Tag zu Tag ändern (Trainings-/Ruhetag).
    const proteinGoal = food ? ((await calorieGoalOn(db, day))?.macros?.protein ?? null) : null;
    days.push({
      day,
      food,
      proteinGoal,
      trained: trainedSet.has(day),
      steps: stepsForDay(steps, day)?.steps ?? null,
      sleepHours: sleepByDay.get(day) ?? null,
      readiness: levelByDay.get(day) ?? null,
    });
  }
  return { days, weights };
}
