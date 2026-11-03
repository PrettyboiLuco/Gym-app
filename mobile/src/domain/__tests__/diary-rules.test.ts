// Tagebuch-Ausbau B1: Fasten-Phasen, Mahlzeit-Erinnerungen, Kopieren auf Tage, Essensfenster, Getränke-Schnellwahl.

import { describe, expect, test } from '@jest/globals';

import {
  atTimeOnDay,
  byTime,
  copyDayOptions,
  copyTargets,
  eatingWindow,
  freshIds,
  isPlannedDay,
  MAX_COPY_DAYS,
  minutesOfDay,
  pushRecent,
  quickDrinks,
  shiftToDay,
} from '../diary';
import { DEFAULT_FASTING, fastingStatus, fastingSummary, fastingVisible, splitDuration, templateFor, validFastingHours, type FastingPeriod } from '../fasting';
import { cleanFeeling, EMPTY_FEELING, feelingEmpty, toggleLevel } from '../meal-feeling';
import {
  DEFAULT_REMINDERS,
  IOS_NOTIFICATION_LIMIT,
  mealReminderDays,
  mealReminderPlan,
  reminderCount,
  timerAlertBudget,
  validateReminders,
  type ReminderSettings,
} from '../reminders';

const H = 3_600_000;
const local = (day: string, hour: number, minute = 0) => {
  const d = new Date(`${day}T00:00:00`);
  d.setHours(hour, minute, 0, 0);
  return d;
};

describe('Fasten-Timer', () => {
  const start = '2026-11-03T18:00:00.000Z';
  test('Phasen: läuft, dann erreicht; Ring auf 0…1 begrenzt', () => {
    const t0 = Date.parse(start);
    expect(fastingStatus({ startedAt: start, plannedHours: 16 }, t0 + 4 * H)).toMatchObject({ phase: 'laeuft', remainingMs: 12 * H, progress: 0.25 });
    expect(fastingStatus({ startedAt: start, plannedHours: 16 }, t0 + 16 * H)).toMatchObject({ phase: 'erreicht', remainingMs: 0, progress: 1 });
    expect(fastingStatus({ startedAt: start, plannedHours: 16 }, t0 + 20 * H)).toMatchObject({ phase: 'erreicht', elapsedMs: 20 * H, progress: 1 });
    // Uhr vor dem Start (z. B. Zeitumstellung): nichts Negatives.
    expect(fastingStatus({ startedAt: start, plannedHours: 16 }, t0 - H)).toMatchObject({ elapsedMs: 0, progress: 0 });
    expect(fastingStatus({ startedAt: start, plannedHours: 16 }, t0).endAtMs).toBe(t0 + 16 * H);
  });

  test('standardmäßig aus und bei sensibler Situation nie sichtbar', () => {
    expect(DEFAULT_FASTING.enabled).toBe(false);
    expect(fastingVisible(DEFAULT_FASTING, false)).toBe(false);
    expect(fastingVisible({ enabled: true }, false)).toBe(true);
    expect(fastingVisible({ enabled: true }, true)).toBe(false);
  });

  test('Vorlagen, Grenzen, Dauer', () => {
    expect(templateFor(16)).toBe('16:8');
    expect(templateFor(13)).toBeNull();
    expect([validFastingHours(0.5), validFastingHours(12), validFastingHours(49), validFastingHours(NaN)]).toEqual([false, true, false, false]);
    expect(splitDuration(15 * H + 42 * 60_000 + 59_000)).toEqual({ hours: 15, minutes: 42 });
  });

  test('Verlauf der letzten 7 Tage: nur zählen, nicht werten', () => {
    const now = Date.parse('2026-11-10T12:00:00Z');
    const p = (id: string, startIso: string, hours: number, planned: number): FastingPeriod => ({
      id,
      startedAt: startIso,
      plannedHours: planned,
      endedAt: new Date(Date.parse(startIso) + hours * H).toISOString(),
    });
    const list = [p('a', '2026-11-08T18:00:00Z', 16.5, 16), p('b', '2026-11-09T19:00:00Z', 12, 16), p('alt', '2026-10-01T19:00:00Z', 16, 16)];
    expect(fastingSummary(list, now)).toEqual({ count: 2, reached: 1, averageMs: 14.25 * H });
    expect(fastingSummary([], now)).toEqual({ count: 0, reached: 0, averageMs: null });
  });
});

describe('Kopieren auf Tage (W5)', () => {
  test('Zieltage ohne Quelltag, ohne Doppelte, sortiert, begrenzt', () => {
    expect(copyTargets('2026-11-03', ['2026-11-05', '2026-11-03', '2026-11-04', '2026-11-05', 'kaputt'])).toEqual(['2026-11-04', '2026-11-05']);
    const many = Array.from({ length: 40 }, (_, i) => `2026-12-${String(i + 1).padStart(2, '0')}`).filter((d) => d <= '2026-12-31');
    expect(copyTargets('2026-11-03', many)).toHaveLength(Math.min(MAX_COPY_DAYS, many.length));
  });

  test('Auswahl: eine Woche zurück bis zwei Wochen voraus, ohne Quelltag', () => {
    const options = copyDayOptions('2026-11-03', '2026-11-03');
    expect(options[0]).toBe('2026-10-27');
    expect(options[options.length - 1]).toBe('2026-11-17');
    expect(options).not.toContain('2026-11-03');
    expect(options).toHaveLength(21);
  });

  test('geplant = nach heute; Uhrzeit bleibt beim Verschieben', () => {
    expect([isPlannedDay('2026-11-04', '2026-11-03'), isPlannedDay('2026-11-03', '2026-11-03')]).toEqual([true, false]);
    const at = local('2026-11-03', 7, 45).toISOString();
    const moved = shiftToDay(at, '2026-11-03', '2026-11-10');
    expect([moved.getDate(), moved.getHours(), moved.getMinutes()]).toEqual([10, 7, 45]);
    expect(minutesOfDay(atTimeOnDay('2026-11-05', 19 * 60 + 5).toISOString())).toBe(19 * 60 + 5);
  });
});

describe('Zeitleiste und Essensfenster (W6)', () => {
  const e = (hour: number, kind: 'essen' | 'getraenk' = 'essen', kcal: number | null = 300) => ({
    kind,
    kcal,
    occurredAt: local('2026-11-03', hour).toISOString(),
  });

  test('erste bis letzte Mahlzeit; Wasser und schwarzer Kaffee zählen nicht', () => {
    const w = eatingWindow([e(19), e(7, 'getraenk', 2), e(8), e(21, 'getraenk', 0), e(13), e(16, 'getraenk', 120)]);
    expect(w).toMatchObject({ firstAt: local('2026-11-03', 8).toISOString(), lastAt: local('2026-11-03', 19).toISOString(), hours: 11, count: 4 });
    expect(eatingWindow([e(7, 'getraenk', 0)])).toBeNull();
    expect(eatingWindow([e(12)])?.hours).toBe(0);
  });

  test('Zeitleiste nach Uhrzeit, gleiche Zeit in alter Reihenfolge', () => {
    const list = [
      { id: 'b', occurredAt: '2026-11-03T12:00:00Z' },
      { id: 'a', occurredAt: '2026-11-03T08:00:00Z' },
      { id: 'c', occurredAt: '2026-11-03T12:00:00Z' },
    ];
    expect(byTime(list).map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('Getränke und Hervorhebung', () => {
  test('vier zuletzt genutzte vorne, aufgefüllt aus der Liste; Unbekanntes fällt weg', () => {
    const all = ['kaffee', 'espresso', 'tee', 'cola', 'mate', 'energy'];
    expect(quickDrinks(all, [])).toEqual(['kaffee', 'espresso', 'tee', 'cola']);
    expect(quickDrinks(all, ['mate', 'weg', 'energy'])).toEqual(['mate', 'energy', 'kaffee', 'espresso']);
    expect(pushRecent(['a', 'b', 'c'], 'b', 3)).toEqual(['b', 'a', 'c']);
    expect(pushRecent(['a', 'b', 'c'], 'd', 3)).toEqual(['d', 'a', 'b']);
  });

  test('neu ist nur, was seit dem letzten Stand desselben Tages dazukam', () => {
    expect(freshIds(null, ['a', 'b'])).toEqual([]);
    expect(freshIds(new Set(['a']), ['a', 'b', 'c'])).toEqual(['b', 'c']);
  });
});

describe('Hunger, Sättigung, Stimmung (W10)', () => {
  test('Stufen 1–5, ungültig = keine Angabe, nochmal tippen entfernt', () => {
    expect(cleanFeeling({ hunger: 3, fullness: 9, mood: '2' })).toEqual({ hunger: 3, fullness: null, mood: null });
    const f = toggleLevel(EMPTY_FEELING, 'mood', 4);
    expect(f.mood).toBe(4);
    expect(feelingEmpty(toggleLevel(f, 'mood', 4))).toBe(true);
  });
});

describe('Mahlzeit-Erinnerungen (W4)', () => {
  const withMeals = (meals: Partial<ReminderSettings['meals']>): ReminderSettings => ({
    ...DEFAULT_REMINDERS,
    meals: { ...DEFAULT_REMINDERS.meals, ...meals },
  });
  const r = withMeals({ fruehstueck: { enabled: true, time: '09:00' }, abend: { enabled: true, time: '19:30' } });

  test('nur Zukunft, nur ohne Eintrag; bereits eingetragene Mahlzeit entfällt', () => {
    const now = local('2026-11-03', 10).getTime();
    const plan = mealReminderPlan(r, '2026-11-03', now, new Set(['2026-11-04|fruehstueck']));
    // Heute ist das Frühstück vorbei (9:00 < 10:00), morgen ist es schon (geplant) eingetragen.
    expect(plan.slice(0, 3).map((a) => a.id)).toEqual(['2026-11-03-abend', '2026-11-04-abend', '2026-11-05-fruehstueck']);
    expect(plan[0].atMs).toBe(local('2026-11-03', 19, 30).getTime());
    expect(plan).toHaveLength(2 * 7 - 2);
    const logged = mealReminderPlan(r, '2026-11-03', now, new Set(['2026-11-03|abend']));
    expect(logged.map((a) => a.id)).not.toContain('2026-11-03-abend');
  });

  test('aus = nichts geplant; ungültige Uhrzeit wird gemeldet', () => {
    expect(mealReminderPlan(DEFAULT_REMINDERS, '2026-11-03', 0, new Set())).toEqual([]);
    expect(validateReminders(withMeals({ mittag: { enabled: true, time: '25:00' } }))).toContain('mealTime');
    expect(validateReminders(r)).toEqual([]);
  });

  test('iOS-Limit von 64: Tage werden gekürzt, Timer behalten Platz', () => {
    const all = withMeals({
      fruehstueck: { enabled: true, time: '08:00' },
      mittag: { enabled: true, time: '12:30' },
      abend: { enabled: true, time: '19:00' },
      snack: { enabled: true, time: '16:00' },
    });
    expect(mealReminderDays(all)).toBe(7);
    const busy: ReminderSettings = {
      ...all,
      drink: { enabled: true, from: '08:00', to: '20:00', everyHours: 1 },
      training: { enabled: true, weekdays: [1, 2, 3, 4, 5, 6, 7], time: '18:00' },
      morning: { enabled: true, time: '07:00' },
      bedtime: { enabled: true },
    };
    const days = mealReminderDays(busy, 5);
    expect(days).toBeLessThan(7);
    expect(reminderCount(busy, 5) + 5 + timerAlertBudget(busy, 5)).toBeLessThanOrEqual(IOS_NOTIFICATION_LIMIT);
    expect(timerAlertBudget(busy, 5)).toBeGreaterThanOrEqual(20);
    // Ohne Mahlzeit-Erinnerungen bleibt alles wie bisher.
    expect(reminderCount(DEFAULT_REMINDERS)).toBe(0);
  });
});
