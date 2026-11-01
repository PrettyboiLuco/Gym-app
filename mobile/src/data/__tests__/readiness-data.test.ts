// A6: Migration 23 (Schlaf → Morgen-Check), Status, Trainingslast, Journal aus dem Tagebuch, „leichter heute“.

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import { EMPTY_PROFILE } from '@/domain/profile';
import { DEFAULT_REMINDERS, reminderCount } from '@/domain/reminders';

import { exportBackup, restoreBackup } from '../backup';
import { checkinInput, deleteSleep, listSleep, saveSleep } from '../coach';
import type { Db } from '../db';
import { MIGRATIONS, migrate } from '../migrations';
import { logCaffeineDrink } from '../nutrition';
import {
  diaryFactors,
  endStatus,
  getCheck,
  lighterPlanToday,
  loadDays,
  readinessToday,
  saveCheck,
  setSessionFeedback,
  startStatus,
  statusDuring,
  statusToday,
} from '../readiness';
import { createTestDb } from '../testing/node-db';
import { activeVersion, expireTemporaryPlans, listActivePlans, loadPlanDraft, savePlan } from '../training';

let db: Db & { close(): void };
beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

const TODAY = '2026-11-01';

describe('Morgen-Check', () => {
  test('Migration 23 übernimmt Schlafeinträge (je Tag den neuesten)', async () => {
    const old = createTestDb();
    await old.execAsync('PRAGMA foreign_keys = ON;');
    for (let v = 0; v < 22; v++) await old.execAsync(MIGRATIONS[v]);
    await old.execAsync('PRAGMA user_version = 22');
    await old.runAsync("INSERT INTO sleep_entry (id, day, hours, quality, recorded_at_utc) VALUES ('a', '2026-10-30', 6, 3, '2026-10-30T07:00:00Z')");
    await old.runAsync("INSERT INTO sleep_entry (id, day, hours, quality, recorded_at_utc) VALUES ('b', '2026-10-30', 7.5, 4, '2026-10-30T08:00:00Z')");
    await old.runAsync("INSERT INTO sleep_entry (id, day, hours, quality, recorded_at_utc) VALUES ('c', '2026-10-31', 8, NULL, '2026-10-31T07:00:00Z')");
    await migrate(old);
    expect((await listSleep(old)).map((s) => [s.day, s.hours, s.quality])).toEqual([
      ['2026-10-31', 8, null],
      ['2026-10-30', 7.5, 4],
    ]);
    old.close();
  });

  test('Schlaf und Check teilen sich einen Eintrag je Tag; Löschen nimmt nur den Schlaf', async () => {
    await saveCheck(db, TODAY, { energy: 4, soreness: 2 });
    await saveSleep(db, TODAY, 7, 4);
    expect(await getCheck(db, TODAY)).toMatchObject({ sleepHours: 7, sleepQuality: 4, energy: 4, soreness: 2 });
    const [s] = await listSleep(db);
    await deleteSleep(db, s.id);
    expect(await getCheck(db, TODAY)).toMatchObject({ sleepHours: null, energy: 4 });
    await saveSleep(db, '2026-10-31', 6, null);
    const [y] = await listSleep(db);
    await deleteSleep(db, y.id);
    expect(await getCheck(db, '2026-10-31')).toBeNull();
  });

  test('nur eigene Faktoren werden gespeichert', async () => {
    await saveCheck(db, TODAY, { factors: ['stress', 'alkohol' as never] });
    expect((await getCheck(db, TODAY))!.factors).toEqual(['stress']);
  });

  test('alte Sicherung ohne Morgen-Check: Schlaf wird übernommen', async () => {
    await saveSleep(db, TODAY, 7, 3);
    const m = JSON.parse(JSON.stringify(await exportBackup(db, null)));
    m.tables.sleep_entry = [{ id: 's1', day: TODAY, hours: 7, quality: 3, recorded_at_utc: `${TODAY}T07:00:00Z` }];
    delete m.tables.daily_check;
    await restoreBackup(db, m);
    expect(await getCheck(db, TODAY)).toMatchObject({ sleepHours: 7, sleepQuality: 3 });
  });
});

describe('Status', () => {
  test('setzen, Zeitraum, beenden; Check-in-Woche pausiert', async () => {
    await startStatus(db, 'krank', '2026-10-28');
    expect((await statusToday(db, TODAY))?.status).toBe('krank');
    await startStatus(db, 'verletzt', TODAY);
    expect((await statusToday(db, TODAY))?.status).toBe('verletzt');
    expect(await statusDuring(db, '2026-10-25', '2026-10-29')).toBe('krank');
    const input = await checkinInput(db, '2026-10-31', EMPTY_PROFILE, 'Europe/Berlin');
    expect(input.paused).toBe('krank');
    await endStatus(db, TODAY);
    expect(await statusToday(db, TODAY)).toBeNull();
    expect(await statusDuring(db, '2026-10-28', '2026-10-31')).toBe('krank');
    expect((await readinessToday(db, TODAY)).readiness.kind).toBe('offen');
  });
});

describe('Trainingslast und Journal', () => {
  test('Dauer × Anstrengung je Tag; Cardio im Training zählt nicht doppelt', async () => {
    await db.runAsync(
      "INSERT INTO workout_session (id, status, started_at_utc, finished_at_utc) VALUES ('w1', 'abgeschlossen', '2026-10-30T16:00:00Z', '2026-10-30T17:00:00Z')"
    );
    await setSessionFeedback(db, 'w1', 7, { brust: { pump: 3 } });
    await db.runAsync(
      "INSERT INTO cardio_log (id, session_id, activity, day, minutes, effort, completed_at_utc, created_at_utc) VALUES ('c1', 'w1', 'laufband', '2026-10-30', 20, 5, 'x', 'x'), ('c2', NULL, 'laufen', '2026-10-31', 30, 6, 'x', 'x')"
    );
    expect(await loadDays(db, '2026-10-01')).toEqual([
      { day: '2026-10-30', load: 420 },
      { day: '2026-10-31', load: 180 },
    ]);
  });

  test('Faktoren aus dem Tagebuch des Vortags', async () => {
    await logCaffeineDrink(
      db,
      { name: 'Espresso', ml: 40, kcal: 1, carbs: 0, sugar: 0, caffeineMg: 80, drinkType: 'kaffee_tee' },
      { diaryDate: '2026-10-31', at: new Date(2026, 9, 31, 17, 0), timeZone: 'Europe/Berlin' }
    );
    expect(await diaryFactors(db, '2026-10-31')).toEqual(['koffeinSpaet']);
    expect(await diaryFactors(db, '2026-10-30')).toEqual([]);
  });
});

describe('Leichter heute', () => {
  test('befristete Fassung nur bis heute, morgen wieder der Plan', async () => {
    const planId = await savePlan(db, null, {
      name: 'GK',
      days: [{ name: 'A', items: [{ exerciseId: 'kniebeuge', sets: 3, repsMin: 6, repsMax: 8, restSeconds: 120 }] }],
    });
    const before = await activeVersion(db, planId);
    expect(await lighterPlanToday(db, 'wenigerSaetze', TODAY, 'Nur heute')).toBe('angepasst');
    expect(await lighterPlanToday(db, 'wenigerSaetze', TODAY, 'Nur heute')).toBe('schon');
    expect((await loadPlanDraft(db, planId))!.days[0].items[0].sets).toBe(2);
    expect((await activeVersion(db, planId))!.validUntil).toBe(TODAY);
    await expireTemporaryPlans(db, '2026-11-02');
    expect((await activeVersion(db, planId))!.id).toBe(before!.id);
    expect((await listActivePlans(db))[0].planId).toBe(planId);
  });
  test('ohne Plan kein Angebot', async () => {
    expect(await lighterPlanToday(db, 'leicht', TODAY, 'x')).toBe('keinPlan');
  });
});

test('Erinnerungen zählen Morgen-Check und Bettzeit', () => {
  expect(reminderCount({ ...DEFAULT_REMINDERS, morning: { enabled: true, time: '07:00' }, bedtime: { enabled: true } })).toBe(2);
});
