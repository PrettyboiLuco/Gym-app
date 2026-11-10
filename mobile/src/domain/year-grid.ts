// Raster „Dein Jahr“ (Idee aus fin, 10.11.2026): 52 Wochen × 7 Tage, Montag oben, die laufende Woche rechts.

import { shiftDay, weekStart } from './dates';

export type YearCell = { day: string; col: number; row: number; future: boolean };

/** Zellen der letzten `weeks` Wochen bis einschließlich der laufenden Woche; Tage nach heute sind `future`. */
export function yearCells(today: string, weeks = 52): YearCell[] {
  const firstMonday = shiftDay(weekStart(today), -7 * (weeks - 1));
  const out: YearCell[] = [];
  for (let col = 0; col < weeks; col++)
    for (let row = 0; row < 7; row++) {
      const day = shiftDay(firstMonday, col * 7 + row);
      out.push({ day, col, row, future: day > today });
    }
  return out;
}

/** Wochen mit mindestens einem Trainingstag (ruhige Kennzahl statt Serie). */
export function activeWeeks(days: readonly string[]): number {
  return new Set(days.map((d) => weekStart(d))).size;
}
