// Erinnerungen und Timer-Hinweise (Register UX-007, TIME-011, HEALTH-012, UX-006). Alles optional und
// standardmäßig aus. Lokale Mitteilungen werden von iOS nicht garantiert pünktlich zugestellt (HEALTH-012);
// die Zeitrechnung in der App bleibt deshalb maßgeblich.

import { shiftDay } from './dates';
import { MEALS, type Meal } from './nutrition';
import type { Step } from './timeline';

export type ReminderSettings = {
  /** Hinweise bei gesperrtem Handy: Pausenende und Wechsel in Dehn-/HIIT-Abläufen. */
  timerAlerts: boolean;
  training: { enabled: boolean; weekdays: number[]; time: string };
  /** Trinken nur im Fenster from–to (außerhalb = Ruhezeit), alle `everyHours` Stunden. */
  drink: { enabled: boolean; from: string; to: string; everyHours: number };
  /** Morgen-Check (A6.2) täglich zur gewählten Zeit. */
  morning: { enabled: boolean; time: string };
  /** Bettzeit (A6.9): 30 Minuten vor der Bettzeit aus Aufstehzeit und Schlafziel. */
  bedtime: { enabled: boolean };
  /**
   * Mahlzeit-Erinnerungen (B1, W4): je Mahlzeit eine Uhrzeit. Die Mitteilung kommt nur, wenn für diese Mahlzeit an dem
   * Tag noch nichts eingetragen ist.
   */
  meals: Record<Meal, { enabled: boolean; time: string }>;
};

/** Wochentage 1 = Montag … 7 = Sonntag (wie im Kalender üblich). */
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export const DEFAULT_REMINDERS: ReminderSettings = {
  timerAlerts: false,
  training: { enabled: false, weekdays: [1, 3, 5], time: '18:00' },
  drink: { enabled: false, from: '09:00', to: '20:00', everyHours: 2 },
  morning: { enabled: false, time: '07:30' },
  bedtime: { enabled: false },
  meals: {
    fruehstueck: { enabled: false, time: '09:00' },
    mittag: { enabled: false, time: '13:00' },
    abend: { enabled: false, time: '19:00' },
    snack: { enabled: false, time: '16:00' },
  },
};

/** Vorlauf der Bettzeit-Erinnerung in Minuten. */
export const BEDTIME_LEAD_MINUTES = 30;

/** „7:30“ oder „07:30“ → Minuten seit Mitternacht; ungültig → null. */
export function parseTime(text: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h <= 23 && min <= 59 ? h * 60 + min : null;
}

export function formatTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** Erinnerungszeiten fürs Trinken im Fenster, Beginn eingeschlossen; höchstens 12 am Tag. */
export function drinkTimes(from: string, to: string, everyHours: number): number[] {
  const start = parseTime(from);
  const end = parseTime(to);
  if (start === null || end === null || end <= start || everyHours < 1) return [];
  const times: number[] = [];
  for (let t = start; t <= end && times.length < 12; t += everyHours * 60) times.push(t);
  return times;
}

/** Expo nummeriert Wochentage 1 = Sonntag … 7 = Samstag. */
export function toExpoWeekday(weekday: number): number {
  return (weekday % 7) + 1;
}

export type ReminderProblem = 'trainingTime' | 'weekdays' | 'drinkWindow' | 'drinkEvery' | 'morningTime' | 'mealTime';

export function validateReminders(r: ReminderSettings): ReminderProblem[] {
  const problems: ReminderProblem[] = [];
  if (r.training.enabled) {
    if (parseTime(r.training.time) === null) problems.push('trainingTime');
    if (r.training.weekdays.length === 0) problems.push('weekdays');
  }
  if (r.drink.enabled) {
    const start = parseTime(r.drink.from);
    const end = parseTime(r.drink.to);
    if (start === null || end === null || end <= start) problems.push('drinkWindow');
    if (!Number.isInteger(r.drink.everyHours) || r.drink.everyHours < 1 || r.drink.everyHours > 6) problems.push('drinkEvery');
  }
  if (r.morning.enabled && parseTime(r.morning.time) === null) problems.push('morningTime');
  if (MEALS.some((m) => r.meals[m].enabled && parseTime(r.meals[m].time) === null)) problems.push('mealTime');
  return problems;
}

export type PlannedAlert = { atMs: number; kind: Step['kind'] | 'ende'; exerciseId: string | null };

/**
 * iOS behält höchstens 64 geplante Mitteilungen je App und verwirft den Rest still – seit iOS 10 die zuerst
 * geplanten, also unsere wiederkehrenden Erinnerungen, sobald ein langer Ablauf viele Timer-Hinweise plant.
 * Timer-Hinweise bekommen deshalb nur, was neben den Erinnerungen, dem Pausen-Hinweis und einer Reserve frei bleibt.
 */
export const IOS_NOTIFICATION_LIMIT = 64;
const RESERVE = 3;

/** Wiederkehrende Erinnerungen (je eine geplante Mitteilung), ohne Mahlzeit-Erinnerungen. */
function repeatingCount(r: ReminderSettings): number {
  const training = r.training.enabled && parseTime(r.training.time) !== null ? new Set(r.training.weekdays).size : 0;
  const drink = r.drink.enabled ? drinkTimes(r.drink.from, r.drink.to, r.drink.everyHours).length : 0;
  return training + drink + (r.morning.enabled ? 1 : 0) + (r.bedtime.enabled ? 1 : 0);
}

/** Alle geplanten Erinnerungen inklusive der Mahlzeit-Erinnerungen der kommenden Tage. */
export function reminderCount(r: ReminderSettings, otherReminders = 0): number {
  return repeatingCount(r) + enabledMeals(r).length * mealReminderDays(r, otherReminders);
}

/**
 * Wie viele Hinweise ein Dehn-/HIIT-Ablauf oder der Intervall-Timer planen darf (höchstens 50). `otherReminders` =
 * weitere geplante Mitteilungen außerhalb dieser Einstellungen (Supplements, Ende des Fasten-Fensters).
 */
export function timerAlertBudget(r: ReminderSettings, otherReminders = 0): number {
  return Math.max(0, Math.min(50, IOS_NOTIFICATION_LIMIT - reminderCount(r, otherReminders) - otherReminders - 1 - RESERVE));
}

// ------------------------------------------------------------------------- Mahlzeit-Erinnerungen

/**
 * Mahlzeit-Erinnerungen werden als einzelne Mitteilungen für die nächsten Tage geplant (höchstens eine Woche), weil
 * „nur, wenn noch nichts eingetragen ist“ als wiederkehrende Mitteilung nicht geht. Beim Eintragen fällt die heutige
 * Mitteilung der Mahlzeit weg; beim Öffnen der App wird neu geplant.
 */
export const MEAL_REMINDER_MAX_DAYS = 7;
/** So viele Plätze bleiben für Timer-Hinweise mindestens frei (Dehn-/HIIT-Abläufe, Intervall-Timer). */
const TIMER_MIN = 20;

export const enabledMeals = (r: ReminderSettings): Meal[] => MEALS.filter((m) => r.meals[m].enabled && parseTime(r.meals[m].time) !== null);

/** Für wie viele Tage (heute eingeschlossen) Mahlzeit-Erinnerungen ins iOS-Limit von 64 passen. */
export function mealReminderDays(r: ReminderSettings, otherReminders = 0): number {
  const meals = enabledMeals(r).length;
  if (meals === 0) return 0;
  const free = IOS_NOTIFICATION_LIMIT - repeatingCount(r) - otherReminders - 1 - RESERVE - TIMER_MIN;
  return Math.max(0, Math.min(MEAL_REMINDER_MAX_DAYS, Math.floor(free / meals)));
}

export type MealAlert = { id: string; day: string; meal: Meal; atMs: number };

/**
 * Geplante Mahlzeit-Erinnerungen ab `today`: je eingeschalteter Mahlzeit und Tag eine, aber nur in der Zukunft und nur,
 * wenn für Tag und Mahlzeit noch nichts eingetragen ist (`logged` enthält „Tag|Mahlzeit“, auch geplante Einträge).
 */
export function mealReminderPlan(r: ReminderSettings, today: string, nowMs: number, logged: ReadonlySet<string>, otherReminders = 0): MealAlert[] {
  const days = mealReminderDays(r, otherReminders);
  const alerts: MealAlert[] = [];
  for (let d = 0; d < days; d++) {
    const day = shiftDay(today, d);
    for (const meal of enabledMeals(r)) {
      if (logged.has(`${day}|${meal}`)) continue;
      const minutes = parseTime(r.meals[meal].time)!;
      const at = new Date(`${day}T00:00:00`);
      at.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
      if (at.getTime() <= nowMs) continue;
      alerts.push({ id: `${day}-${meal}`, day, meal, atMs: at.getTime() });
    }
  }
  return alerts.sort((a, b) => a.atMs - b.atMs);
}

/**
 * Hinweise für die kommenden Wechsel eines Ablaufs ab `elapsedMs`, z. B. wenn das Handy gesperrt wird.
 * iOS erlaubt nur eine begrenzte Zahl geplanter Mitteilungen; daher höchstens `max` (Standard 50).
 */
export function upcomingAlerts(steps: Step[], elapsedMs: number, nowMs: number, max = 50): PlannedAlert[] {
  const alerts: PlannedAlert[] = [];
  let boundary = 0;
  for (let i = 0; i < steps.length; i++) {
    boundary += steps[i].seconds * 1000;
    if (boundary <= elapsedMs) continue;
    const atMs = nowMs + (boundary - elapsedMs);
    const next = steps[i + 1];
    alerts.push(next ? { atMs, kind: next.kind, exerciseId: next.exerciseId } : { atMs, kind: 'ende', exerciseId: null });
    if (alerts.length >= max) break;
  }
  return alerts;
}
