// Tagebuch-Regeln ohne Datenbank (Ausbauplan B1): Einträge auf mehrere Tage kopieren (W5), geplante Tage, Uhrzeit
// und Essensfenster (W6), zuletzt genutzte Getränke (O5).

import { daysBetween, shiftDay } from './dates';

/** Höchstens so viele Tage auf einmal (ein Monat). */
export const MAX_COPY_DAYS = 31;
/** So weit reicht die Auswahl beim Kopieren und der Tagwechsler in die Zukunft. */
export const PLAN_AHEAD_DAYS = 14;
/** So weit reicht die Auswahl beim Kopieren in die Vergangenheit. */
export const COPY_BACK_DAYS = 7;

/** Ein Tag nach dem heutigen Ernährungstag ist „geplant“: Seine Einträge zählen erst am Tag selbst. */
export const isPlannedDay = (day: string, today: string) => day > today;

/** Tage zur Auswahl beim Kopieren: eine Woche zurück bis zwei Wochen voraus, ohne den Quelltag. */
export function copyDayOptions(sourceDay: string, today: string): string[] {
  const days: string[] = [];
  for (let d = -COPY_BACK_DAYS; d <= PLAN_AHEAD_DAYS; d++) {
    const day = shiftDay(today, d);
    if (day !== sourceDay) days.push(day);
  }
  return days;
}

/** Gewählte Zieltage aufbereitet: gültig, ohne Quelltag, ohne Doppelte, sortiert, höchstens MAX_COPY_DAYS. */
export function copyTargets(sourceDay: string, selected: readonly string[]): string[] {
  const valid = selected.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d !== sourceDay);
  return [...new Set(valid)].sort().slice(0, MAX_COPY_DAYS);
}

/**
 * Zeitpunkt eines Eintrags auf einen anderen Tag verschoben – gleiche Uhrzeit (Ortszeit), anderes Datum. So bleibt der
 * Morgenkaffee morgens, auch wenn er auf eine ganze Woche kopiert wird.
 */
export function shiftToDay(occurredAt: string, fromDay: string, toDay: string): Date {
  const at = new Date(occurredAt);
  at.setDate(at.getDate() + daysBetween(fromDay, toDay));
  return at;
}

/** Neue Uhrzeit (Minuten seit Mitternacht, Ortszeit) an einem Tagebuchtag. */
export function atTimeOnDay(day: string, minutes: number): Date {
  const at = new Date(`${day}T00:00:00`);
  at.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return at;
}

/** Minuten seit Mitternacht (Ortszeit) eines Zeitpunkts. */
export function minutesOfDay(iso: string): number {
  const at = new Date(iso);
  return at.getHours() * 60 + at.getMinutes();
}

type Timed = { kind: 'essen' | 'getraenk'; occurredAt: string; kcal: number | null };

/** Ab so vielen kcal zählt ein Getränk fürs Essensfenster (schwarzer Kaffee hat 2–5 kcal, Tee und Wasser 0). */
export const DRINK_WINDOW_KCAL = 20;

/** Zählt ein Eintrag fürs Essensfenster? Essen immer, Getränke nur mit nennenswert Kalorien (Saft, Milchkaffee). */
const countsAsIntake = (e: Timed) => e.kind === 'essen' || (e.kcal ?? 0) >= DRINK_WINDOW_KCAL;

export type EatingWindow = { firstAt: string; lastAt: string; hours: number; count: number };

/**
 * Essensfenster eines Tages: erste und letzte Mahlzeit bzw. kalorienhaltiges Getränk und der Abstand in Stunden
 * (auf 0,1 h). Reine Anzeige ohne Bewertung. Null, wenn nichts dazu zählt.
 */
export function eatingWindow(events: readonly Timed[]): EatingWindow | null {
  const times = events
    .filter(countsAsIntake)
    .map((e) => e.occurredAt)
    .sort((a, b) => Date.parse(a) - Date.parse(b));
  if (times.length === 0) return null;
  const first = times[0];
  const last = times[times.length - 1];
  return { firstAt: first, lastAt: last, hours: Math.round((Date.parse(last) - Date.parse(first)) / 360_000) / 10, count: times.length };
}

/** Einträge in Uhrzeit-Reihenfolge (Zeitleiste); bei gleicher Zeit bleibt die bisherige Reihenfolge. */
export function byTime<T extends { occurredAt: string }>(events: readonly T[]): T[] {
  return events
    .map((e, i) => ({ e, i }))
    .sort((a, b) => Date.parse(a.e.occurredAt) - Date.parse(b.e.occurredAt) || a.i - b.i)
    .map((x) => x.e);
}

/** Zuletzt genutzte Getränke vorne, ohne Doppelte, höchstens `max`. */
export function pushRecent(list: readonly string[], id: string, max = 12): string[] {
  return [id, ...list.filter((x) => x !== id)].slice(0, max);
}

/**
 * Die `count` Getränke für die Schnellwahl: zuerst die zuletzt genutzten (nur bekannte), aufgefüllt in der Reihenfolge
 * der Liste. Der Rest steht hinter „Mehr …“.
 */
export function quickDrinks(allIds: readonly string[], recent: readonly string[], count = 4): string[] {
  const known = recent.filter((id) => allIds.includes(id));
  return [...new Set([...known, ...allIds])].slice(0, count);
}

/** Neue Einträge seit dem letzten Stand desselben Tages (für die kurze Hervorhebung nach dem Eintragen). */
export function freshIds(previous: ReadonlySet<string> | null, current: readonly string[]): string[] {
  if (!previous) return [];
  return current.filter((id) => !previous.has(id));
}
