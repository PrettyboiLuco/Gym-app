// Supplement-Tracker (Entscheidung Luc 31.10.2026): nur erfassen und auf Wunsch erinnern. Die App empfiehlt nichts,
// schlägt keine Menge vor, nennt keine Marken und verspricht keine Wirkung (Health-Claims-Verordnung, LAW-010).
// Name, Menge und Einheit stammen ausschließlich von dir.

import { parseTime } from './reminders';

export const SUPPLEMENT_UNITS = ['g', 'mg', 'mcg', 'ie', 'ml', 'kapsel', 'tablette', 'tropfen', 'messloeffel', 'portion'] as const;
export type SupplementUnit = (typeof SUPPLEMENT_UNITS)[number];

export const MAX_SUPPLEMENTS = 15;
/** Erinnerungen zählen in die iOS-Grenze von 64 geplanten Mitteilungen (siehe reminders.ts). */
export const MAX_SUPPLEMENT_REMINDERS = 5;
export const MAX_SUPPLEMENT_NAME = 60;

export type Supplement = {
  id: string;
  name: string;
  amount: number | null;
  unit: SupplementUnit | null;
  /** „HH:MM“ oder null = keine Erinnerung. */
  reminderTime: string | null;
};

export type SupplementForm = { name: string; amount: string; unit: SupplementUnit | null; reminderTime: string };
export const EMPTY_SUPPLEMENT_FORM: SupplementForm = { name: '', amount: '', unit: null, reminderTime: '' };

export type SupplementProblem = 'name' | 'amount' | 'unit' | 'time' | 'tooManyReminders';

export function supplementToForm(s: Supplement): SupplementForm {
  return { name: s.name, amount: s.amount === null ? '' : String(s.amount).replace('.', ','), unit: s.unit, reminderTime: s.reminderTime ?? '' };
}

/**
 * Prüft die Eingabe. Menge ist freiwillig; wer eine Menge einträgt, wählt auch die Einheit. `otherReminders` = wie
 * viele andere Supplements schon eine Erinnerung haben.
 */
export function parseSupplementForm(
  form: SupplementForm,
  otherReminders: number
): { value: Omit<Supplement, 'id'> | null; problems: SupplementProblem[] } {
  const problems: SupplementProblem[] = [];
  const name = form.name.trim().replace(/\s+/g, ' ');
  if (name.length === 0 || name.length > MAX_SUPPLEMENT_NAME) problems.push('name');

  let amount: number | null = null;
  const amountText = form.amount.trim().replace(',', '.');
  if (amountText !== '') {
    amount = /^\d{1,5}(\.\d{1,3})?$/.test(amountText) ? Number(amountText) : NaN;
    if (!(amount > 0 && amount <= 10000)) problems.push('amount');
  }
  if (amountText !== '' && form.unit === null) problems.push('unit');

  const timeText = form.reminderTime.trim();
  const minutes = timeText === '' ? null : parseTime(timeText);
  if (timeText !== '' && minutes === null) problems.push('time');
  if (minutes !== null && otherReminders >= MAX_SUPPLEMENT_REMINDERS) problems.push('tooManyReminders');

  if (problems.length > 0) return { value: null, problems };
  const reminderTime = minutes === null ? null : `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  return { value: { name, amount: amount === null || Number.isNaN(amount) ? null : amount, unit: amount === null ? null : form.unit, reminderTime }, problems: [] };
}

/** An wie vielen der `days` Tage bis einschließlich `today` etwas abgehakt wurde. */
export function takenOnDays(loggedDays: string[], today: string, days = 7): number {
  const end = Date.parse(`${today}T12:00:00Z`);
  const start = end - (days - 1) * 86_400_000;
  return new Set(loggedDays.filter((d) => {
    const t = Date.parse(`${d}T12:00:00Z`);
    return t >= start && t <= end;
  })).size;
}
