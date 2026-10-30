// Phase 6: Erinnerungen, Timer-Hinweise, Schritte, Sicherungsdatei.

import { describe, expect, test } from '@jest/globals';

import { backupSummary, checkBackup } from '../backup';
import { EMPTY_FEEDBACK, feedbackText, isEmptyFeedback } from '../feedback';
import { drinkTimes, formatTime, parseTime, toExpoWeekday, upcomingAlerts, validateReminders, DEFAULT_REMINDERS } from '../reminders';
import { parseSteps, stepGoalDays, stepsAverage, stepsForDay, type StepEntry } from '../steps';
import { hiitSteps } from '../timeline';

describe('Erinnerungen (UX-007, TIME-011)', () => {
  test('Uhrzeit lesen und schreiben', () => {
    expect(parseTime('7:30')).toBe(450);
    expect(parseTime('24:00')).toBeNull();
    expect(parseTime('abc')).toBeNull();
    expect(formatTime(450)).toBe('07:30');
  });
  test('Trinkzeiten nur im Fenster (Ruhezeit außerhalb)', () => {
    expect(drinkTimes('09:00', '20:00', 3).map(formatTime)).toEqual(['09:00', '12:00', '15:00', '18:00']);
    expect(drinkTimes('20:00', '09:00', 2)).toEqual([]);
  });
  test('höchstens 12 Trinkerinnerungen pro Tag', () => expect(drinkTimes('00:00', '23:59', 1)).toHaveLength(12));
  test('Wochentage: Montag = 1 in der App, Expo zählt ab Sonntag', () => {
    expect(toExpoWeekday(1)).toBe(2);
    expect(toExpoWeekday(7)).toBe(1);
  });
  test('Prüfung nur für eingeschaltete Erinnerungen', () => {
    expect(validateReminders(DEFAULT_REMINDERS)).toEqual([]);
    expect(
      validateReminders({
        ...DEFAULT_REMINDERS,
        training: { enabled: true, weekdays: [], time: '25:00' },
        drink: { enabled: true, from: '18:00', to: '08:00', everyHours: 9 },
      })
    ).toEqual(['trainingTime', 'weekdays', 'drinkWindow', 'drinkEvery']);
  });
});

describe('Timer-Hinweise bei gesperrtem Handy (UX-006, HEALTH-012)', () => {
  const steps = hiitSteps({ items: [{ exerciseId: 'a', bothSides: false }, { exerciseId: 'b', bothSides: false }], workSeconds: 20, restSeconds: 10, rounds: 1, roundRestSeconds: 0, prepSeconds: 0 });
  test('kommende Wechsel ab jetzt, letzter ist das Ende', () => {
    const alerts = upcomingAlerts(steps, 5_000, 1_000_000);
    expect(alerts.map((a) => a.kind)).toEqual(['pause', 'belastung', 'ende']);
    expect(alerts[0].atMs).toBe(1_000_000 + 15_000);
    expect(alerts[1].exerciseId).toBe('b');
  });
  test('vergangene Wechsel werden nicht geplant', () => expect(upcomingAlerts(steps, 25_000, 0).map((a) => a.kind)).toEqual(['belastung', 'ende']));
  test('Obergrenze für geplante Mitteilungen', () => {
    const long = hiitSteps({ items: [{ exerciseId: 'a', bothSides: false }], workSeconds: 10, restSeconds: 0, rounds: 20, roundRestSeconds: 5, prepSeconds: 0 });
    expect(upcomingAlerts(long, 0, 0, 10)).toHaveLength(10);
  });
});

describe('Schritte (HEALTH-005–007)', () => {
  const e = (day: string, steps: number, source: StepEntry['source'], fetchedAt: string): StepEntry => ({ id: `${day}${fetchedAt}`, day, steps, source, fetchedAt });
  const entries = [
    e('2026-10-30', 6000, 'manuell', '2026-10-30T10:00:00Z'),
    e('2026-10-30', 9000, 'manuell', '2026-10-30T20:00:00Z'),
    e('2026-10-29', 4000, 'manuell', '2026-10-29T20:00:00Z'),
    e('2026-10-29', 7500, 'apple_health', '2026-10-29T21:00:00Z'),
  ];
  test('neuester eigener Eintrag gilt', () => expect(stepsForDay(entries, '2026-10-30')).toEqual({ steps: 9000, source: 'manuell' }));
  test('Apple Health hat Vorrang, Quellen werden nicht addiert', () =>
    expect(stepsForDay(entries, '2026-10-29')).toEqual({ steps: 7500, source: 'apple_health' }));
  test('Schrittziel-Tage', () => expect(stepGoalDays(entries, 8000)).toEqual(['2026-10-30']));
  test('Durchschnitt nur über Tage mit Wert', () => expect(stepsAverage(entries, ['2026-10-30', '2026-10-29', '2026-10-28'])).toBe(8250));
  test('Eingabe mit Tausenderpunkt', () => {
    expect(parseSteps('10.500')).toBe(10500);
    expect(parseSteps('-5')).toBeNull();
    expect(parseSteps('200000')).toBeNull();
  });
});

describe('Sicherungsdatei prüfen (TECH-014)', () => {
  const valid = { app: 'gym-app', format: 1, schemaVersion: 7, exportedAt: '2026-10-30T10:00:00Z', tables: { workout_session: [{}, {}] }, appState: {}, photos: null };
  test('gültige Datei', () => {
    const { manifest, problem } = checkBackup(JSON.stringify(valid), 7);
    expect(problem).toBeNull();
    expect(backupSummary(manifest!).workouts).toBe(2);
  });
  test('Fehlerfälle', () => {
    expect(checkBackup('kein json', 7).problem).toBe('notJson');
    expect(checkBackup(JSON.stringify({ ...valid, app: 'andere' }), 7).problem).toBe('notOurs');
    expect(checkBackup(JSON.stringify({ ...valid, format: 2 }), 7).problem).toBe('format');
    expect(checkBackup(JSON.stringify({ ...valid, schemaVersion: 8 }), 7).problem).toBe('newer');
    expect(checkBackup(JSON.stringify({ ...valid, tables: { x: 5 } }), 7).problem).toBe('broken');
  });
});

describe('Feedback (BUS-002, BUS-016)', () => {
  const labels = (key: string, vars?: Record<string, unknown>) => (vars ? `${key}${JSON.stringify(vars)}` : key);
  const usage = { workouts: 3, sets: 40, diaryDays: 5, stretchSessions: 2, hiitSessions: 1, activeGoals: 2, weightEntries: 6, firstUseDay: '2026-10-29' };
  test('leere Antworten werden erkannt', () => expect(isEmptyFeedback(EMPTY_FEEDBACK)).toBe(true));
  test('Text enthält nur Beantwortetes', () => {
    const text = feedbackText({ ...EMPTY_FEEDBACK, missing: 'Pläne zum Nachmachen', pay: 'bis4' }, null, { version: '1.0.0', date: '2026-10-30' }, labels);
    expect(text).toContain('feedback.text.missing: Pläne zum Nachmachen');
    expect(text).toContain('feedback.text.pay: feedback.pay.bis4');
    expect(text).not.toContain('feedback.text.annoying');
    expect(text).not.toContain('usageHeader');
  });
  test('Nutzungsübersicht nur, wenn angehängt', () => {
    const text = feedbackText({ ...EMPTY_FEEDBACK, recommend: 8 }, usage, { version: '1.0.0', date: '2026-10-30' }, labels);
    expect(text).toContain('8/10');
    expect(text).toContain('"workouts":3');
  });
});
