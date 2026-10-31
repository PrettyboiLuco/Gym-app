// Gewichtsverlauf (Register GOAL-003, UX-002). Einzelne Tageswerte schwanken; angezeigt wird ein
// Mittelwert über ein Zeitfenster, und ohne genug Messungen gar kein Trend.

export type WeightEntry = { id: string; day: string; kg: number };

const DAY_MS = 24 * 60 * 60 * 1000;

function dayNumber(day: string): number {
  return Math.round(Date.parse(`${day}T00:00:00Z`) / DAY_MS);
}

/**
 * Mittelwert der letzten `days` Tage bis einschließlich `endDay`, gebildet über Tagesmittel: Mehrere Messungen an
 * einem Tag zählen als ein Tag, sonst würde ein Tag mit vier Messungen den Schnitt bestimmen und allein „genug
 * Messungen“ ergeben. Ohne Messungen an mindestens `minDays` Tagen gibt es keinen Trend.
 */
export function weightTrend(
  entries: Pick<WeightEntry, 'day' | 'kg'>[],
  endDay: string,
  days = 7,
  minDays = 4
): number | null {
  const means = dailyMeans(entries, endDay, days);
  if (means.length < minDays) return null;
  return means.reduce((sum, d) => sum + d.kg, 0) / means.length;
}

/** Liest eine Gewichtseingabe wie „80,5“ oder „80.5“. Unplausible Werte ergeben null. */
export function parseWeight(input: string): number | null {
  const normalized = input.trim().replace(',', '.');
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(normalized)) return null;
  const kg = Number(normalized);
  return kg >= 20 && kg <= 400 ? kg : null;
}

/**
 * Veränderung des 7-Tage-Durchschnitts gegenüber der Woche davor. Ohne zwei gültige
 * Durchschnitte gibt es keine Aussage (null) statt einer erfundenen.
 */
export function weeklyChange(entries: Pick<WeightEntry, 'day' | 'kg'>[], endDay: string): number | null {
  const now = weightTrend(entries, endDay);
  const before = weightTrend(entries, shiftDayBy(endDay, -7));
  return now === null || before === null ? null : now - before;
}

/** Ein Wert pro Tag (Mittel bei mehreren Messungen), aufsteigend nach Datum, nur im Zeitraum. */
export function dailyMeans(entries: Pick<WeightEntry, 'day' | 'kg'>[], endDay: string, days: number) {
  const end = dayNumber(endDay);
  const byDay = new Map<string, number[]>();
  for (const e of entries) {
    const d = dayNumber(e.day);
    if (d > end || d <= end - days) continue;
    byDay.set(e.day, [...(byDay.get(e.day) ?? []), e.kg]);
  }
  return [...byDay.entries()]
    .map(([day, values]) => ({ day, kg: values.reduce((s, v) => s + v, 0) / values.length }))
    .sort((a, b) => (a.day < b.day ? -1 : 1));
}

function shiftDayBy(day: string, delta: number): string {
  return new Date((dayNumber(day) + delta) * DAY_MS).toISOString().slice(0, 10);
}
