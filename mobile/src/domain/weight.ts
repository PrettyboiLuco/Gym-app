// Gewichtsverlauf (Register GOAL-003, UX-002). Einzelne Tageswerte schwanken; angezeigt wird ein
// Mittelwert über ein Zeitfenster, und ohne genug Messungen gar kein Trend.

import { daysBetween, shiftDay } from './dates';
import { mean } from './math';

export type WeightEntry = { id: string; day: string; kg: number };

/**
 * Für die Anzeige (Fortschritt, Heute, Ziele) reicht eine Messung in 7 Tagen: Wer sich nur ein- oder zweimal pro Woche
 * wiegt, sieht trotzdem seinen Wochenschnitt. Strenger (4 Wiegetage) bleiben nur Rechnungen, die daraus Kalorien
 * ableiten (Coach, Wochen-Check, Einblicke) – dort würde eine einzelne Wasser-Schwankung sonst das Ziel verstellen.
 */
export const DISPLAY_MIN_DAYS = 1;

/**
 * Mittelwert der letzten `days` Tage bis einschließlich `endDay`, gebildet über Tagesmittel: Mehrere Messungen an
 * einem Tag zählen als ein Tag, sonst würde ein Tag mit vier Messungen den Schnitt bestimmen und allein „genug
 * Messungen“ ergeben. Ohne Messungen an mindestens `minDays` Tagen gibt es keinen Trend.
 */
export function weightTrend(entries: Pick<WeightEntry, 'day' | 'kg'>[], endDay: string, days = 7, minDays = 4): number | null {
  const means = dailyMeans(entries, endDay, days);
  if (means.length < minDays) return null;
  return mean(means.map((d) => d.kg));
}

/**
 * Veränderung des 7-Tage-Durchschnitts gegenüber der Woche davor. Ohne zwei gültige
 * Durchschnitte gibt es keine Aussage (null) statt einer erfundenen.
 */
export function weeklyChange(entries: Pick<WeightEntry, 'day' | 'kg'>[], endDay: string, minDays = 4): number | null {
  const now = weightTrend(entries, endDay, 7, minDays);
  const before = weightTrend(entries, shiftDay(endDay, -7), 7, minDays);
  return now === null || before === null ? null : now - before;
}

/** Ein Wert pro Tag (Mittel bei mehreren Messungen), aufsteigend nach Datum, nur im Zeitraum. */
export function dailyMeans(entries: Pick<WeightEntry, 'day' | 'kg'>[], endDay: string, days: number) {
  const byDay = new Map<string, number[]>();
  for (const e of entries) {
    const ago = daysBetween(e.day, endDay);
    if (ago < 0 || ago >= days) continue;
    byDay.set(e.day, [...(byDay.get(e.day) ?? []), e.kg]);
  }
  return [...byDay.entries()].map(([day, values]) => ({ day, kg: mean(values)! })).sort((a, b) => (a.day < b.day ? -1 : 1));
}

/**
 * Hochrechnung für das Diagramm: Wohin führt das aktuelle Wochentempo, höchstens 4 Wochen weit oder bis zum
 * Ziel? Nur wenn sich das Gewicht messbar (≥ 0,05 kg/Woche) in Richtung Ziel bewegt – sonst keine Linie.
 * Ausdrücklich eine Hochrechnung, keine Vorhersage.
 */
export function projectWeight(
  trendKg: number | null,
  weeklyChangeKg: number | null,
  targetKg: number | null,
  today: string
): { day: string; kg: number } | null {
  if (trendKg === null || weeklyChangeKg === null || targetKg === null) return null;
  if (Math.abs(weeklyChangeKg) < 0.05) return null;
  const towards = Math.sign(targetKg - trendKg) === Math.sign(weeklyChangeKg);
  if (!towards || Math.abs(targetKg - trendKg) < 0.05) return null;
  const days = Math.min(28, Math.ceil((Math.abs(targetKg - trendKg) / Math.abs(weeklyChangeKg)) * 7));
  return { day: shiftDay(today, days), kg: Math.round((trendKg + (weeklyChangeKg / 7) * days) * 10) / 10 };
}
