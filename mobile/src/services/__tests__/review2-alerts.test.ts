// Prüftest (Gutachten 2): Mahlzeit-Erinnerungen verschwinden nach dem Ausschalten und werden nach dem Löschen aller
// Mitteilungen neu geplant (services/alerts.ts, Zwischenspeicher lastMealPlan).

import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import type { Db } from '@/data/db';
import { migrate } from '@/data/migrations';
import { saveReminders } from '@/data/reminders';
import { createTestDb } from '@/data/testing/node-db';
import { shiftDay } from '@/domain/dates';
import { DEFAULT_REMINDERS, type ReminderSettings } from '@/domain/reminders';
import { todayDay } from '@/domain/time';
import { applyReminders, cancelAllAlerts, syncMealReminders } from '@/services/alerts';

// Mitteilungen im Speicher statt auf dem Gerät (jest.mock wird vor die Importe gehoben).
const mockScheduled = new Map<string, unknown>();
jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DATE: 'date', DAILY: 'daily', WEEKLY: 'weekly' },
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  getAllScheduledNotificationsAsync: jest.fn(async () => [...mockScheduled.keys()].map((identifier) => ({ identifier }))),
  cancelScheduledNotificationAsync: jest.fn(async (id: string) => {
    mockScheduled.delete(id);
  }),
  scheduleNotificationAsync: jest.fn(async (req: { identifier: string; trigger: unknown }) => {
    mockScheduled.set(req.identifier, req.trigger);
  }),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => mockScheduled.clear()),
}));

let db: Db & { close(): void };
beforeEach(async () => {
  mockScheduled.clear();
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

// Morgen relativ zur echten Uhr: Mitteilungen in der Vergangenheit werden nie geplant (replaceAlerts prüft Date.now()),
// ein festes Datum ließ den Test mit der Zeit rot werden.
const DAY = shiftDay(todayDay(), 1);
const EARLY = new Date(`${DAY}T00:00:00`).getTime() + 6 * 3_600_000; // 06:00 Ortszeit

const mealIds = () => [...mockScheduled.keys()].filter((k) => k.startsWith('mahlzeit-')).sort();

describe('Mahlzeit-Erinnerungen', () => {
  test('nach dem Ausschalten werden die schon geplanten Mitteilungen gelöscht', async () => {
    const on: ReminderSettings = { ...DEFAULT_REMINDERS, meals: { ...DEFAULT_REMINDERS.meals, fruehstueck: { enabled: true, time: '09:00' } } };
    await saveReminders(db, on);
    const today = DAY;
    const early = EARLY;
    await syncMealReminders(db, today, early);
    expect(mealIds().length).toBeGreaterThan(0);

    // Nutzer schaltet alle Mahlzeit-Erinnerungen aus und speichert (more/notifications.tsx → applyReminders).
    const off: ReminderSettings = { ...DEFAULT_REMINDERS };
    await saveReminders(db, off);
    await applyReminders(db, off);
    expect(mealIds()).toEqual([]);
  });

  test('Ernährungsbereich ausgeschaltet: geplante Mahlzeit-Erinnerungen verschwinden', async () => {
    const on: ReminderSettings = { ...DEFAULT_REMINDERS, meals: { ...DEFAULT_REMINDERS.meals, mittag: { enabled: true, time: '13:00' } } };
    await saveReminders(db, on);
    const early = EARLY;
    await syncMealReminders(db, DAY, early);
    expect(mealIds().length).toBeGreaterThan(0);
    await db.runAsync('INSERT INTO app_state (key, value) VALUES (\'profile\', \'{"modules":{"ernaehrung":false}}\')');
    await applyReminders(db, on);
    expect(mealIds()).toEqual([]);
  });

  test('nach dem Löschen aller Mitteilungen plant derselbe Plan wieder neu', async () => {
    const on: ReminderSettings = { ...DEFAULT_REMINDERS, meals: { ...DEFAULT_REMINDERS.meals, abend: { enabled: true, time: '19:00' } } };
    await saveReminders(db, on);
    const early = EARLY;
    await syncMealReminders(db, DAY, early);
    const planned = mealIds();
    expect(planned.length).toBeGreaterThan(0);
    await cancelAllAlerts();
    expect(mealIds()).toEqual([]);
    await syncMealReminders(db, DAY, early);
    expect(mealIds()).toEqual(planned);
  });
});
