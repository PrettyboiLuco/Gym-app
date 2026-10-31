// Erinnerungen und Timer-Hinweise (Register UX-007, TIME-011, HEALTH-012, UX-006). Alles optional und
// standardmäßig aus. Lokale Mitteilungen werden von iOS nicht garantiert pünktlich zugestellt (HEALTH-012);
// die Zeitrechnung in der App bleibt deshalb maßgeblich.

import type { Step } from './timeline';

export type ReminderSettings = {
  /** Hinweise bei gesperrtem Handy: Pausenende und Wechsel in Dehn-/HIIT-Abläufen. */
  timerAlerts: boolean;
  training: { enabled: boolean; weekdays: number[]; time: string };
  /** Trinken nur im Fenster from–to (außerhalb = Ruhezeit), alle `everyHours` Stunden. */
  drink: { enabled: boolean; from: string; to: string; everyHours: number };
};

/** Wochentage 1 = Montag … 7 = Sonntag (wie im Kalender üblich). */
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export const DEFAULT_REMINDERS: ReminderSettings = {
  timerAlerts: false,
  training: { enabled: false, weekdays: [1, 3, 5], time: '18:00' },
  drink: { enabled: false, from: '09:00', to: '20:00', everyHours: 2 },
};

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

export type ReminderProblem = 'trainingTime' | 'weekdays' | 'drinkWindow' | 'drinkEvery';

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

export function reminderCount(r: ReminderSettings): number {
  const training = r.training.enabled && parseTime(r.training.time) !== null ? new Set(r.training.weekdays).size : 0;
  const drink = r.drink.enabled ? drinkTimes(r.drink.from, r.drink.to, r.drink.everyHours).length : 0;
  return training + drink;
}

/**
 * Wie viele Hinweise ein Dehn-/HIIT-Ablauf oder der Intervall-Timer planen darf (höchstens 50). `otherReminders` =
 * weitere wiederkehrende Erinnerungen außerhalb dieser Einstellungen (Supplements).
 */
export function timerAlertBudget(r: ReminderSettings, otherReminders = 0): number {
  return Math.max(0, Math.min(50, IOS_NOTIFICATION_LIMIT - reminderCount(r) - otherReminders - 1 - RESERVE));
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
