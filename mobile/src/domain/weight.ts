// Gewichtsverlauf (Register GOAL-003, UX-002). Einzelne Tageswerte schwanken; angezeigt wird ein
// Mittelwert über ein Zeitfenster, und ohne genug Messungen gar kein Trend.

export type WeightEntry = { id: string; day: string; kg: number };

const DAY_MS = 24 * 60 * 60 * 1000;

function dayNumber(day: string): number {
  return Math.round(Date.parse(`${day}T00:00:00Z`) / DAY_MS);
}

/** Mittelwert der Messungen in den letzten `days` Tagen bis einschließlich `endDay`. */
export function weightTrend(
  entries: Pick<WeightEntry, 'day' | 'kg'>[],
  endDay: string,
  days = 7,
  minEntries = 4
): number | null {
  const end = dayNumber(endDay);
  const window = entries.filter((e) => {
    const d = dayNumber(e.day);
    return d <= end && d > end - days;
  });
  if (window.length < minEntries) return null;
  return window.reduce((sum, e) => sum + e.kg, 0) / window.length;
}

/** Liest eine Gewichtseingabe wie „80,5“ oder „80.5“. Unplausible Werte ergeben null. */
export function parseWeight(input: string): number | null {
  const normalized = input.trim().replace(',', '.');
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(normalized)) return null;
  const kg = Number(normalized);
  return kg >= 20 && kg <= 400 ? kg : null;
}
