// Phase 4: versionierte Ziele, Kalorienziel, Körpermaße, Fotos, Profil, Migrationen 4 und 5.

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import { writeState } from '../app-state';
import type { Db } from '../db';
import {
  activeWeightGoal,
  addMeasurements,
  calorieGoalOn,
  deleteMeasurement,
  drinkGoalDays,
  endGoal,
  liftSets,
  listActiveGoals,
  listCalorieGoals,
  listGoalVersions,
  listMeasurements,
  saveGoal,
  setCalorieGoal,
  trainingDays,
} from '../goals';
import { MIGRATIONS, migrate } from '../migrations';
import { logWater } from '../nutrition';
import { addPhoto, deleteAllPhotos, deletePhoto, listPhotos } from '../photos';
import { loadOnboardingDone, loadProfile, saveOnboardingDone, saveProfile } from '../profile';
import { createTestDb } from '../testing/node-db';
import { addSet, completeSet, listSessionSets, startSession } from '../training';

let db: Db & { close(): void };

beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

describe('Migration 4', () => {
  test('bisheriges Kalorienziel aus den Einstellungen gilt für alle bisherigen Tage', async () => {
    const old = createTestDb();
    // Stand nach Phase 3: Version 3 mit Kalorienziel in den Einstellungen.
    for (let v = 0; v < 3; v++) await old.execAsync(MIGRATIONS[v]);
    await old.execAsync('PRAGMA user_version = 3');
    await writeState(old, 'nutrition_settings', { kcalGoal: 2400, drinkGoalMl: 1500, glassSizes: [250], hideNumbers: false });
    await migrate(old);
    expect((await calorieGoalOn(old, '2026-01-01'))?.kcal).toBe(2400);
    expect((await calorieGoalOn(old, '2026-10-29'))?.kcal).toBe(2400);
    old.close();
  });
  test('ohne bisheriges Ziel kein Ziel', async () => {
    expect(await calorieGoalOn(db, '2026-10-29')).toBeNull();
  });
});

describe('Kalorienziel versioniert (GOAL-002)', () => {
  test('neues Ziel ändert vergangene Tage nicht', async () => {
    await setCalorieGoal(db, 2500, '2026-10-01');
    await setCalorieGoal(db, 2200, '2026-10-20', 'rechner', { resting: 1780 });
    expect((await calorieGoalOn(db, '2026-09-30'))).toBeNull();
    expect((await calorieGoalOn(db, '2026-10-10'))?.kcal).toBe(2500);
    expect((await calorieGoalOn(db, '2026-10-20'))?.kcal).toBe(2200);
    expect((await calorieGoalOn(db, '2026-10-20'))?.source).toBe('rechner');
  });
  test('zweite Änderung am selben Tag gewinnt', async () => {
    await setCalorieGoal(db, 2500, '2026-10-29');
    await setCalorieGoal(db, 2300, '2026-10-29');
    expect((await calorieGoalOn(db, '2026-10-29'))?.kcal).toBe(2300);
    expect(await listCalorieGoals(db)).toHaveLength(2);
  });
  test('Ziel ab einem Tag entfernen', async () => {
    await setCalorieGoal(db, 2500, '2026-10-01');
    await setCalorieGoal(db, null, '2026-10-29');
    expect(await calorieGoalOn(db, '2026-10-29')).toBeNull();
    expect((await calorieGoalOn(db, '2026-10-28'))?.kcal).toBe(2500);
  });
  test('Datenbank lehnt unplausible Werte ab', async () => {
    await expect(setCalorieGoal(db, 100, '2026-10-29')).rejects.toThrow();
  });
});

describe('Ziele (GOAL-001, GOAL-002, GOAL-005)', () => {
  test('mehrere Ziele gleichzeitig', async () => {
    await saveGoal(db, null, { kind: 'gewicht', direction: 'abnehmen', targetKg: 75 }, '2026-10-01', 80);
    await saveGoal(db, null, { kind: 'kraft', exerciseId: 'kniebeuge', targetKg: 100, targetReps: 5 }, '2026-10-01', 80);
    await saveGoal(db, null, { kind: 'gewohnheit', habit: 'training', perWeek: 3 }, '2026-10-01', 80);
    expect((await listActiveGoals(db)).map((g) => g.kind)).toEqual(['gewicht', 'kraft', 'gewohnheit']);
  });
  test('Änderung erzeugt neue Version, alte bleibt unverändert', async () => {
    const id = await saveGoal(db, null, { kind: 'gewicht', direction: 'abnehmen', targetKg: 75 }, '2026-09-01', 80);
    const before = await listGoalVersions(db, id);
    await saveGoal(db, id, { kind: 'gewicht', direction: 'halten', targetKg: null }, '2026-10-01', 78);
    const after = await listGoalVersions(db, id);
    expect(after).toHaveLength(2);
    expect(after[1]).toEqual(before[0]);
    expect(after[0].direction).toBe('halten');
    expect(after[0].validFrom).toBe('2026-10-01');
  });
  test('nur ein Gewichtsziel: zweites wird neue Version des ersten', async () => {
    const first = await saveGoal(db, null, { kind: 'gewicht', direction: 'abnehmen', targetKg: 75 }, '2026-09-01', 80);
    const second = await saveGoal(db, null, { kind: 'gewicht', direction: 'abnehmen', targetKg: 74 }, '2026-10-01', 79);
    expect(second).toBe(first);
    expect((await listActiveGoals(db)).filter((g) => g.kind === 'gewicht')).toHaveLength(1);
  });
  test('Startgewicht bleibt bei gleicher Richtung', async () => {
    const id = await saveGoal(db, null, { kind: 'gewicht', direction: 'abnehmen', targetKg: 75 }, '2026-09-01', 80);
    await saveGoal(db, id, { kind: 'gewicht', direction: 'abnehmen', targetKg: 74 }, '2026-10-01', 78);
    expect((await activeWeightGoal(db))?.startKg).toBe(80);
    await saveGoal(db, id, { kind: 'gewicht', direction: 'zunehmen', targetKg: 82 }, '2026-10-02', 78);
    expect((await activeWeightGoal(db))?.startKg).toBe(78);
  });
  test('Ziel beenden: verschwindet aus der Liste, Verlauf bleibt', async () => {
    const id = await saveGoal(db, null, { kind: 'gewohnheit', habit: 'trinken', perWeek: 5 }, '2026-10-01', null);
    await endGoal(db, id, '2026-10-29');
    expect(await listActiveGoals(db)).toHaveLength(0);
    const versions = await listGoalVersions(db, id);
    expect(versions.map((v) => v.status)).toEqual(['beendet', 'aktiv']);
    expect(versions[0].perWeek).toBe(5);
  });
  test('Kraftziel braucht eine vorhandene Übung', async () => {
    await expect(
      saveGoal(db, null, { kind: 'kraft', exerciseId: 'gibt-es-nicht', targetKg: 100, targetReps: 5 }, '2026-10-01', null)
    ).rejects.toThrow();
  });
});

describe('Fortschrittsdaten', () => {
  test('Sätze einer Übung und Trainingstage', async () => {
    const session = await startSession(db, null);
    await addSet(db, session, 'kniebeuge');
    const [set] = await listSessionSets(db, session);
    await completeSet(db, set.id, 90, 5);
    const sets = await liftSets(db, 'kniebeuge', 'Europe/Berlin');
    expect(sets).toHaveLength(1);
    expect(sets[0].weightKg).toBe(90);
    expect(await trainingDays(db, '2000-01-01T00:00:00Z', 'Europe/Berlin')).toHaveLength(1);
  });
  test('Tage mit erreichtem Trinkziel', async () => {
    const when = (diaryDate: string) => ({ diaryDate, at: new Date(), timeZone: 'Europe/Berlin' });
    await logWater(db, 1000, when('2026-10-27'), 'Wasser');
    await logWater(db, 600, when('2026-10-27'), 'Wasser');
    await logWater(db, 500, when('2026-10-28'), 'Wasser');
    expect(await drinkGoalDays(db, '2026-10-26', 1500)).toEqual(['2026-10-27']);
  });
});

describe('Körpermaße (GOAL-004)', () => {
  test('mehrere Maße eines Tages, löschen', async () => {
    await addMeasurements(db, '2026-10-29', { taille: 84, arm: 35.5 });
    const list = await listMeasurements(db);
    expect(list.map((m) => m.site).sort()).toEqual(['arm', 'taille']);
    await deleteMeasurement(db, list[0].id);
    expect(await listMeasurements(db)).toHaveLength(1);
  });
  test('Datenbank lehnt unbekannte Stelle ab', async () => {
    await expect(addMeasurements(db, '2026-10-29', { nacken: 40 } as never)).rejects.toThrow();
  });
});

describe('Profil und Erststart (UX-010)', () => {
  test('Standard: leer, kg/cm, Erststart offen', async () => {
    const profile = await loadProfile(db);
    expect(profile.units).toEqual({ weight: 'kg', length: 'cm' });
    expect(profile.adult).toBe(false);
    expect(await loadOnboardingDone(db)).toBe(false);
  });
  test('speichern und laden', async () => {
    const profile = await loadProfile(db);
    await saveProfile(db, { ...profile, adult: true, heightCm: 180, units: { weight: 'lb', length: 'cm' } });
    await saveOnboardingDone(db);
    expect((await loadProfile(db)).heightCm).toBe(180);
    expect((await loadProfile(db)).units.weight).toBe('lb');
    expect(await loadOnboardingDone(db)).toBe(true);
  });
});

describe('Fortschrittsfotos (GOAL-008)', () => {
  test('speichern, auflisten, einzeln und alle löschen', async () => {
    await addPhoto(db, '2026-10-01', 'vorne', 'a.jpg');
    await addPhoto(db, '2026-10-30', 'vorne', 'b.jpg');
    await addPhoto(db, '2026-10-30', 'seite', 'c.jpg');
    const list = await listPhotos(db);
    expect(list.map((p) => p.fileName)).toEqual(['c.jpg', 'b.jpg', 'a.jpg']);
    expect(await deletePhoto(db, list[0].id)).toBe('c.jpg');
    expect((await deleteAllPhotos(db)).sort()).toEqual(['a.jpg', 'b.jpg']);
    expect(await listPhotos(db)).toHaveLength(0);
  });
  test('Datenbank lehnt unbekannte Ansicht und doppelte Datei ab', async () => {
    await expect(addPhoto(db, '2026-10-30', 'oben' as never, 'x.jpg')).rejects.toThrow();
    await addPhoto(db, '2026-10-30', 'vorne', 'y.jpg');
    await expect(addPhoto(db, '2026-10-30', 'seite', 'y.jpg')).rejects.toThrow();
  });
  test('Fotos sind standardmäßig aus', async () => {
    expect((await loadProfile(db)).photos).toBe(false);
  });
});
