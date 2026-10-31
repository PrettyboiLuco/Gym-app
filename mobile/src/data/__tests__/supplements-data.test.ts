// Supplement-Tracker (31.10.2026): Regeln, Speichern, Abhaken, Sicherung, Löschen und Erinnerungs-Budget.

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import { DEFAULT_REMINDERS, IOS_NOTIFICATION_LIMIT, reminderCount, timerAlertBudget } from '@/domain/reminders';
import { BACKUP_TABLES } from '@/domain/backup';
import {
  EMPTY_SUPPLEMENT_FORM,
  MAX_SUPPLEMENT_REMINDERS,
  parseSupplementForm,
  supplementToForm,
  takenOnDays,
} from '@/domain/supplements';

import { deleteAllData, exportBackup, restoreBackup } from '../backup';
import type { Db } from '../db';
import { migrate } from '../migrations';
import { archiveSupplement, listSupplements, loggedDays, saveSupplement, setTaken, supplementReminders } from '../supplements';
import { createTestDb } from '../testing/node-db';

let db: Db & { close(): void };

beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

const form = (f: Partial<typeof EMPTY_SUPPLEMENT_FORM>) => ({ ...EMPTY_SUPPLEMENT_FORM, ...f });

describe('Eingabe (keine Vorgaben der App)', () => {
  test('nur Name genügt; Menge und Erinnerung sind freiwillig', () => {
    expect(parseSupplementForm(form({ name: '  Vitamin   D ' }), 0)).toEqual({
      value: { name: 'Vitamin D', amount: null, unit: null, reminderTime: null },
      problems: [],
    });
  });
  test('Menge mit Komma und Einheit, Uhrzeit wird vereinheitlicht', () => {
    expect(parseSupplementForm(form({ name: 'Kreatin', amount: '3,5', unit: 'g', reminderTime: '8:05' }), 0).value).toEqual({
      name: 'Kreatin',
      amount: 3.5,
      unit: 'g',
      reminderTime: '08:05',
    });
  });
  test('Fehler: kein Name, Menge ohne Einheit, ungültige Menge oder Uhrzeit', () => {
    expect(parseSupplementForm(form({ name: ' ' }), 0).problems).toEqual(['name']);
    expect(parseSupplementForm(form({ name: 'X', amount: '5' }), 0).problems).toEqual(['unit']);
    expect(parseSupplementForm(form({ name: 'X', amount: '0', unit: 'mg' }), 0).problems).toEqual(['amount']);
    expect(parseSupplementForm(form({ name: 'X', amount: 'viel', unit: 'mg' }), 0).problems).toEqual(['amount']);
    expect(parseSupplementForm(form({ name: 'X', reminderTime: '25:00' }), 0).problems).toEqual(['time']);
    expect(parseSupplementForm(form({ name: 'X'.repeat(61) }), 0).problems).toEqual(['name']);
  });
  test('höchstens 5 Supplements mit Erinnerung', () => {
    expect(parseSupplementForm(form({ name: 'X', reminderTime: '09:00' }), MAX_SUPPLEMENT_REMINDERS).problems).toEqual(['tooManyReminders']);
    expect(parseSupplementForm(form({ name: 'X' }), MAX_SUPPLEMENT_REMINDERS).problems).toEqual([]);
  });
  test('Formular aus gespeichertem Eintrag', () =>
    expect(supplementToForm({ id: 'a', name: 'Omega-3', amount: 1.5, unit: 'kapsel', reminderTime: null })).toEqual({
      name: 'Omega-3',
      amount: '1,5',
      unit: 'kapsel',
      reminderTime: '',
    }));
  test('Tage in den letzten 7 Tagen', () => {
    expect(takenOnDays(['2026-10-31', '2026-10-30', '2026-10-25', '2026-10-24'], '2026-10-31')).toBe(3);
    expect(takenOnDays([], '2026-10-31')).toBe(0);
  });
});

describe('Speichern und Abhaken', () => {
  test('anlegen, abhaken (einmal pro Tag), wieder offen', async () => {
    const id = await saveSupplement(db, null, { name: 'Magnesium', amount: 300, unit: 'mg', reminderTime: null });
    const [s] = await listSupplements(db);
    expect(s).toEqual({ id, name: 'Magnesium', amount: 300, unit: 'mg', reminderTime: null });
    await setTaken(db, s, '2026-10-31', true);
    await setTaken(db, s, '2026-10-31', true);
    expect((await loggedDays(db, '2026-10-25')).get(id)).toEqual(['2026-10-31']);
    await setTaken(db, s, '2026-10-31', false);
    expect((await loggedDays(db, '2026-10-25')).get(id)).toBeUndefined();
  });
  test('Änderung lässt abgehakte Tage unverändert (Schnappschuss)', async () => {
    const id = await saveSupplement(db, null, { name: 'Kreatin', amount: 3, unit: 'g', reminderTime: null });
    await setTaken(db, (await listSupplements(db))[0], '2026-10-30', true);
    await saveSupplement(db, id, { name: 'Kreatin Monohydrat', amount: 5, unit: 'g', reminderTime: null });
    expect(await db.getAllAsync('SELECT name, amount, unit FROM supplement_log')).toEqual([{ name: 'Kreatin', amount: 3, unit: 'g' }]);
  });
  test('Entfernen nimmt aus der Liste und löscht die Erinnerung, Verlauf bleibt', async () => {
    const id = await saveSupplement(db, null, { name: 'Vitamin D', amount: null, unit: null, reminderTime: '08:00' });
    await setTaken(db, (await listSupplements(db))[0], '2026-10-30', true);
    expect(await supplementReminders(db)).toHaveLength(1);
    await archiveSupplement(db, id);
    expect(await listSupplements(db)).toEqual([]);
    expect(await supplementReminders(db)).toEqual([]);
    expect((await loggedDays(db, '2026-10-01')).get(id)).toEqual(['2026-10-30']);
  });
});

describe('Sicherung und Löschen', () => {
  test('jede Tabelle der Datenbank ist in Sicherung und „Alle Daten löschen“ enthalten', async () => {
    const tables = (await db.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"))
      .map((t) => t.name)
      .filter((name) => name !== 'app_state');
    expect([...tables].sort()).toEqual([...BACKUP_TABLES].sort());
  });
  test('Supplements kommen mit in die Sicherung und werden mit gelöscht', async () => {
    await saveSupplement(db, null, { name: 'Zink', amount: 10, unit: 'mg', reminderTime: '21:00' });
    await setTaken(db, (await listSupplements(db))[0], '2026-10-31', true);
    const backup = JSON.parse(JSON.stringify(await exportBackup(db, null)));
    expect(backup.tables.supplement).toHaveLength(1);
    expect(backup.tables.supplement_log).toHaveLength(1);
    await deleteAllData(db);
    expect(await listSupplements(db)).toEqual([]);
    await restoreBackup(db, backup);
    expect((await listSupplements(db))[0].name).toBe('Zink');
    expect(await db.getAllAsync('PRAGMA foreign_key_check')).toEqual([]);
  });
});

describe('Erinnerungen bleiben unter der iOS-Grenze', () => {
  test('alle Erinnerungen an + 5 Supplements + Pausen-Hinweis + Timer ≤ 64', () => {
    const all = {
      ...DEFAULT_REMINDERS,
      training: { enabled: true, weekdays: [1, 2, 3, 4, 5, 6, 7], time: '18:00' },
      drink: { enabled: true, from: '00:00', to: '23:59', everyHours: 1 },
    };
    const budget = timerAlertBudget(all, MAX_SUPPLEMENT_REMINDERS);
    expect(budget).toBe(36);
    expect(reminderCount(all) + MAX_SUPPLEMENT_REMINDERS + 1 + budget).toBeLessThanOrEqual(IOS_NOTIFICATION_LIMIT);
  });
});
