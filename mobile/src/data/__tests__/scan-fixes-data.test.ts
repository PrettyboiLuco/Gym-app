// Fehler aus dem Phase 1 Scan (docs/Phase_1_Scan.md), Datenschicht – je Fehler ein Test, damit er nicht zurückkommt.

import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';

import { effectiveModules } from '@/domain/modules';
import { foodToForm, parseFoodForm } from '@/domain/nutrition';
import { parsePlanFile } from '@/domain/plan-file';

import { readState } from '../app-state';
import { restoreBackup } from '../backup';
import { addBloodPressure } from '../blood-pressure';
import type { Db } from '../db';
import { fetchPage, OnlineDisabledError } from '../meal-plan';
import { MIGRATIONS, migrate } from '../migrations';
import { getFood, loadNutritionSettings, per100, saveFood, saveNutritionSettings } from '../nutrition';
import { fetchProduct } from '../off';
import { loadOnlineSetting, saveOnlineSetting } from '../online';
import { applyPlanImport } from '../plan-import';
import { loadProfile, saveProfile } from '../profile';
import { buildReport } from '../report';
import { createTestDb } from '../testing/node-db';
import { listActivePlans, listExercises, startSession } from '../training';
import { loadTrainingWeek, plannedMuscles } from '../training-week';

let db: Db & { close(): void };
beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

describe('Phase 1 Scan – Daten', () => {
  test('F2: Doppeltipp auf „Training starten“ legt nur ein Training an', async () => {
    const a = await startSession(db, null);
    const b = await startSession(db, null);
    expect(b).toBe(a);
    const rows = await db.getAllAsync<{ id: string }>("SELECT id FROM workout_session WHERE status = 'aktiv'");
    expect(rows).toHaveLength(1);
  });

  test('F5: Lebensmittel im Formular bearbeiten behält den Koffeinwert', async () => {
    const id = await saveFood(
      db,
      null,
      {
        name: 'Energy',
        brand: null,
        barcode: null,
        basis: 'ml',
        per100: { kcal: 45, protein: 0, carbs: 11, fat: 0, fiber: null },
        servingAmount: 250,
        caffeine: 32,
      },
      'off'
    );
    const food = (await getFood(db, id))!;
    const { draft } = parseFoodForm({ ...foodToForm({ ...food, per100: per100(food) }), name: 'Energy Zero' });
    await saveFood(db, id, draft!);
    const after = (await getFood(db, id))!;
    expect(after.name).toBe('Energy Zero');
    expect(after.caffeine).toBe(32);
  });

  test('F6: Ernährung aus und wieder an – der Coach bleibt an', async () => {
    const p = await loadProfile(db);
    await saveProfile(db, { ...p, modules: { ...p.modules, ernaehrung: false } });
    const off = await loadProfile(db);
    expect(effectiveModules(off.modules).coach).toBe(false);
    await saveProfile(db, { ...off, modules: { ...off.modules, ernaehrung: true } });
    expect(effectiveModules((await loadProfile(db)).modules).coach).toBe(true);
  });

  test('F11: Sicherung aus Version 14 bekommt beim Wiederherstellen die neuen Kabel-Geräte', async () => {
    const old = createTestDb();
    await old.execAsync('PRAGMA foreign_keys = ON;');
    for (let v = 0; v < 14; v++) await old.execAsync(MIGRATIONS[v]);
    await old.runAsync("INSERT INTO app_state (key, value) VALUES ('profile', ?)", JSON.stringify({ equipment: ['kabel', 'koerpergewicht'] }));
    const appState: Record<string, unknown> = {};
    for (const r of await old.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM app_state')) appState[r.key] = JSON.parse(r.value);
    old.close();
    await restoreBackup(db, { app: 'gym-app', format: 1, schemaVersion: 14, exportedAt: '', tables: {}, appState, photos: null } as never);
    const profile = await readState<{ equipment: string[] }>(db, 'profile', { equipment: [] });
    expect(profile.equipment).toEqual(expect.arrayContaining(['kabel', 'kabel_crossover', 'kabel_doppel']));
  });

  test('TRACK-006: Bericht blendet Ernährungszahlen bei „ohne Zahlen“ aus; Blutdruck nur als Schnitt', async () => {
    await saveNutritionSettings(db, { ...(await loadNutritionSettings(db)), hideNumbers: true });
    await addBloodPressure(db, { day: '2026-10-20', measuredAt: '2026-10-20T07:00:00.000Z', systolic: 120, diastolic: 80, pulse: 60, note: null });
    const r = await buildReport(db, '2026-10-01', '2026-10-31');
    expect(r.nutritionHidden).toBe(true);
    expect(r.nutrition).toBeNull();
    expect(r.bloodPressure).toMatchObject({ count: 1, systolic: 120, diastolic: 80 });
  });

  test('LAW-018: Online-Funktionen aus – keine Anfrage an Open Food Facts oder eine Rezeptseite', async () => {
    const fetchSpy = jest.fn();
    (globalThis as { fetch: unknown }).fetch = fetchSpy;
    await saveOnlineSetting(db, false);
    expect(await loadOnlineSetting(db)).toBe(false);
    expect(await fetchProduct('4000000000001')).toEqual({ ok: false, error: 'disabled' });
    await expect(fetchPage('https://example.org/rezept')).rejects.toBeInstanceOf(OnlineDisabledError);
    expect(fetchSpy).not.toHaveBeenCalled();
    await saveOnlineSetting(db, true);
  });

  test('T1/U4: Satz-Woche und Muskelkarte aus Lucs Plan (Sonntag, Push ist dran)', async () => {
    const text = readFileSync(join(__dirname, '../presets/lucs-training.myhealth.json'), 'utf8');
    const imp = parsePlanFile(text, new Set((await listExercises(db)).map((e) => e.id)));
    if (!imp.ok) throw new Error('Plan-Datei ungültig');
    await applyPlanImport(db, imp, { replace: true, goals: false }, '2026-11-01');
    const week = await loadTrainingWeek(db, '2026-11-01');
    // Mo Pull 18, Mi Oberkörper 17, Fr Beine 13, So Push 16 – wie in Lucs Plan
    expect(week.plannedSets).toEqual([18, 0, 17, 0, 13, 0, 16]);
    expect(week.doneSets).toEqual([0, 0, 0, 0, 0, 0, 0]);
    const plans = await listActivePlans(db);
    const push = await plannedMuscles(db, plans[0].days[0].id);
    expect(Object.keys(push).sort()).toEqual(expect.arrayContaining(['arme', 'brust', 'schultern']));
  });
});
