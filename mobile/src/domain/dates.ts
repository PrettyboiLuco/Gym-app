// Kalendertage als Text (YYYY-MM-DD). Gerechnet wird immer um 12 Uhr UTC: So verschiebt keine Zeitzone und keine
// Sommerzeit einen Tag. Einzige Stelle für diese Hilfen – bitte nicht in einzelnen Dateien nachbauen.

export const DAY_MS = 86_400_000;

/** Tag verschieben, z. B. shiftDay('2026-11-01', -7) → '2026-10-25'. */
export function shiftDay(day: string, delta: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Ganze Tage von `from` bis `to` (positiv, wenn `to` später ist). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / DAY_MS);
}

/** Montag der Woche (ISO), in der `day` liegt. */
export function weekStart(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** Wochentag nach ISO: 1 = Montag … 7 = Sonntag. */
export function isoWeekday(day: string): number {
  const d = new Date(`${day}T12:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

/** Die 7 Tage ab `monday`. */
export function weekDays(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => shiftDay(monday, i));
}
