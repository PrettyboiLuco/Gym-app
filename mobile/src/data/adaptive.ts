// Daten für den adaptiven Energiebedarf (Ausbauplan A7): Aufnahme der letzten Wochen, Gewicht, Einrichtung, Regelwahl.

import { shiftDay } from '@/domain/dates';
import { estimateExpenditure, weeklyBalance, WINDOW_DAYS, type Estimate, type WeekBalance } from '@/domain/adaptive';

import { readState, writeState } from './app-state';
import type { Db } from './db';
import { daySums } from './nutrition';
import { listWeights } from './weights';

export type ExpenditureData = { estimate: Estimate; weeks: WeekBalance[] };

/** Schätzung über die 28 Tage bis `endDay` (meist gestern) und der Wochenverlauf. */
export async function expenditure(db: Db, endDay: string): Promise<ExpenditureData> {
  const [days, weights] = await Promise.all([daySums(db, shiftDay(endDay, -(WINDOW_DAYS + 7)), endDay), listWeights(db)]);
  return { estimate: estimateExpenditure(days, weights, endDay), weeks: weeklyBalance(days, weights, endDay) };
}

/** Check-in-Regeln: 1 = Schritte je nach Gewichtsverlauf (Standard), 2 = nach geschätztem Verbrauch (vorläufig). */
export const loadCheckinRules = (db: Db) => readState<1 | 2>(db, 'checkin_rules', 1);
export const saveCheckinRules = (db: Db, rules: 1 | 2) => writeState(db, 'checkin_rules', rules);
