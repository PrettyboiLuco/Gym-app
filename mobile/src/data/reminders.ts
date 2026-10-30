// Einstellungen für Erinnerungen, Timer-Hinweise und App-Sperre im gespeicherten App-Zustand.

import { DEFAULT_REMINDERS, type ReminderSettings } from '@/domain/reminders';

import { readState, writeState } from './app-state';
import type { Db } from './db';

export async function loadReminders(db: Db): Promise<ReminderSettings> {
  const s = await readState<Partial<ReminderSettings>>(db, 'reminders', {});
  return {
    timerAlerts: s.timerAlerts ?? DEFAULT_REMINDERS.timerAlerts,
    training: { ...DEFAULT_REMINDERS.training, ...s.training },
    drink: { ...DEFAULT_REMINDERS.drink, ...s.drink },
  };
}

export const saveReminders = (db: Db, r: ReminderSettings) => writeState(db, 'reminders', r);

/** App-Sperre mit Face ID bzw. Gerätecode (Standard aus). */
export const loadAppLock = (db: Db) => readState<boolean>(db, 'app_lock', false);
export const saveAppLock = (db: Db, on: boolean) => writeState(db, 'app_lock', on);
