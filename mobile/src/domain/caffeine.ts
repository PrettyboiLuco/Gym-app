// Koffein-Schnellwahl (Ausbauplan A3). Richtwerte nach EFSA (Scientific Opinion on the safety of caffeine, 2015):
// Tasse Filterkaffee 200 ml ≈ 90 mg, Espresso 60 ml ≈ 80 mg, Schwarztee 220 ml ≈ 50 mg, Cola 355 ml ≈ 40 mg,
// Energy-Drink 250 ml ≈ 80 mg. Mengen hier auf übliche Größen umgerechnet; Kalorien für die Zucker-Varianten
// aus üblichen Etiketten (Cola ≈ 42 kcal/100 ml, Energy ≈ 45 kcal/100 ml).

import type { DrinkType } from './nutrition';
import { localDay, timeZone } from './time';

export type CaffeineDrink = {
  id: string;
  ml: number;
  caffeineMg: number;
  kcal: number;
  carbs: number;
  sugar: number;
  drinkType: DrinkType;
};

export const CAFFEINE_DRINKS: CaffeineDrink[] = [
  { id: 'kaffee', ml: 200, caffeineMg: 90, kcal: 4, carbs: 0, sugar: 0, drinkType: 'kaffee_tee' },
  { id: 'espresso', ml: 40, caffeineMg: 55, kcal: 1, carbs: 0, sugar: 0, drinkType: 'kaffee_tee' },
  { id: 'doppio', ml: 60, caffeineMg: 80, kcal: 2, carbs: 0, sugar: 0, drinkType: 'kaffee_tee' },
  { id: 'schwarztee', ml: 250, caffeineMg: 55, kcal: 2, carbs: 0, sugar: 0, drinkType: 'kaffee_tee' },
  { id: 'gruentee', ml: 250, caffeineMg: 30, kcal: 2, carbs: 0, sugar: 0, drinkType: 'kaffee_tee' },
  { id: 'energy', ml: 250, caffeineMg: 80, kcal: 113, carbs: 27.5, sugar: 27.5, drinkType: 'softdrink' },
  { id: 'energyZero', ml: 250, caffeineMg: 80, kcal: 8, carbs: 0, sugar: 0, drinkType: 'softdrink' },
  { id: 'cola', ml: 330, caffeineMg: 33, kcal: 139, carbs: 35, sugar: 35, drinkType: 'softdrink' },
  { id: 'colaZero', ml: 330, caffeineMg: 33, kcal: 1, carbs: 0, sugar: 0, drinkType: 'softdrink' },
];

/**
 * Koffein nach einer Uhrzeit (Standard 14 Uhr) – für das Journal in A6 (Schlaf). Endet der Ernährungstag erst nach
 * Mitternacht, zählt Koffein nach Mitternacht (Kalendertag nach dem Tagebuchtag) ebenfalls als spät (Phase 1 Scan).
 */
export function lateCaffeineMg(events: { caffeineMg: number | null; occurredAt: string; diaryDate?: string }[], fromHourLocal = 14): number {
  const late = (e: { occurredAt: string; diaryDate?: string }) => {
    const at = new Date(e.occurredAt);
    return at.getHours() >= fromHourLocal || (e.diaryDate !== undefined && localDay(at, timeZone) > e.diaryDate);
  };
  return events.filter((e) => e.caffeineMg != null && late(e)).reduce((sum, e) => sum + (e.caffeineMg ?? 0), 0);
}
