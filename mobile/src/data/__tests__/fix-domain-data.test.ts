// Fehlerbehebungen 03.11.2026, Datenschicht: Wiederherstellen, Transaktionen, Rekorde/Bericht bei Gegengewicht,
// Untergrenze, Trainingslast, erster Nutzungstag. Je Befund ein Test, damit er nicht zurückkommt.

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';

import { CALORIE_FLOOR, restingEnergy } from '@/domain/energy';
import { parsePlanFile } from '@/domain/plan-file';
import { EMPTY_PROFILE } from '@/domain/profile';

import { deleteAllData, exportBackup, restoreBackup } from '../backup';
import { checkinInput, deleteSleep, listSleep, saveSleep } from '../coach';
import type { Db } from '../db';
import { usageSummary } from '../feedback';
import { adjustCalorieGoal, calorieFloorOn, calorieGoalOn, setCalorieGoal } from '../goals';
import { migrate } from '../migrations';
import { loadOnlineSetting, onlineAllowed, saveOnlineSetting } from '../online';
import { applyPlanImport } from '../plan-import';
import { saveProfile } from '../profile';
import { diaryFactors, firstLoadDay, getCheck, setSessionFeedback } from '../readiness';
import { buildReport } from '../report';
import { createTestDb } from '../testing/node-db';
import { addCustomExercise, completeSet, finishSession, listActivePlans, listExercises, previousBests, savePlan, startSession } from '../training';
import { addWeight } from '../weights';

let db: Db & { close(): void };
beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(async () => {
  // Zwischenspeicher „Online-Funktionen“ ist modulweit – für die anderen Tests wieder auf Standard.
  await saveOnlineSetting(db, true);
  db.close();
});

const TODAY = '2026-11-01';

describe('Wiederherstellen und Löschen', () => {
  test('D11: „Online-Funktionen aus“ aus der Sicherung gilt sofort, nach „Alle Daten löschen“ wieder der Standard', async () => {
    await saveOnlineSetting(db, false);
    const backup = JSON.parse(JSON.stringify(await exportBackup(db, null)));
    await saveOnlineSetting(db, true);
    expect(onlineAllowed()).toBe(true);
    await restoreBackup(db, backup);
    expect(onlineAllowed()).toBe(false);
    await deleteAllData(db);
    expect(onlineAllowed()).toBe(true);
    expect(await loadOnlineSetting(db)).toBe(true);
  });

  test('D12: gelöschter Schlaf kommt aus einer neuen Sicherung nicht zurück (sleep_entry nur bei alten)', async () => {
    await saveSleep(db, TODAY, 7, 3);
    const [sleep] = await listSleep(db);
    await deleteSleep(db, sleep.id);
    const m = JSON.parse(JSON.stringify(await exportBackup(db, null)));
    // Die alte Tabelle wird weiter mitgesichert; ein Rest darin darf den gelöschten Wert nicht zurückbringen.
    m.tables.sleep_entry = [{ id: 's1', day: TODAY, hours: 7, quality: 3, recorded_at_utc: `${TODAY}T07:00:00Z` }];
    await restoreBackup(db, m);
    expect(await getCheck(db, TODAY)).toBeNull();
  });

  test('D13: eine laufende Dehn-/HIIT-Einheit aus der Sicherung gilt danach als abgebrochen', async () => {
    await db.runAsync(
      `INSERT INTO timed_session (id, kind, name, source, status, planned_seconds, items, started_at_utc)
       VALUES ('t1', 'dehnen', 'Morgens', 'vorlage', 'aktiv', 300, '[]', '2026-11-01T07:00:00Z')`
    );
    const m = JSON.parse(JSON.stringify(await exportBackup(db, null)));
    await restoreBackup(db, m);
    const row = await db.getFirstAsync<{ status: string; finished: string | null }>(
      "SELECT status, finished_at_utc AS finished FROM timed_session WHERE id = 't1'"
    );
    expect(row).toMatchObject({ status: 'abgebrochen' });
    expect(row?.finished).not.toBeNull();
  });
});

describe('Transaktionen', () => {
  const plan = {
    name: 'P',
    days: [{ name: 'A', items: [{ exerciseId: 'latzug', sets: 3, repsMin: 8, repsMax: 12, restSeconds: 90 }] }],
  };

  test('D14: zwei gleichzeitige Starts legen ein Training an, ohne Fehler', async () => {
    await savePlan(db, null, plan);
    const [p] = await listActivePlans(db);
    const [a, b] = await Promise.all([startSession(db, p.days[0].id), startSession(db, p.days[0].id)]);
    expect(b).toBe(a);
    expect(await db.getAllAsync("SELECT id FROM workout_session WHERE status = 'aktiv'")).toHaveLength(1);
    expect(await db.getAllAsync('SELECT id FROM set_log WHERE session_id = ?', a)).toHaveLength(3);
  });

  test('D14: parallele Speichervorgänge laufen nacheinander statt „transaction within a transaction“', async () => {
    const ids = await Promise.all([savePlan(db, null, plan), savePlan(db, null, { ...plan, name: 'Q' }), startSession(db, null)]);
    expect(new Set(ids).size).toBe(3);
    expect(await listActivePlans(db)).toHaveLength(2);
  });

  test('D15: scheitert der Plan-Import, bleiben die bisherigen Pläne aktiv', async () => {
    const oldId = await savePlan(db, null, plan);
    const text = readFileSync(join(__dirname, '../presets/lucs-training.myhealth.json'), 'utf8');
    const imp = parsePlanFile(text, new Set((await listExercises(db)).map((e) => e.id)));
    if (!imp.ok) throw new Error('Plan-Datei ungültig');
    // Eine Übung, die es nicht gibt, lässt das Speichern des neuen Plans scheitern (Fremdschlüssel).
    const broken = {
      ...imp,
      draft: { ...imp.draft, days: [{ ...imp.draft.days[0], items: [{ ...imp.draft.days[0].items[0], exerciseId: 'gibt_es_nicht' }] }] },
    };
    await expect(applyPlanImport(db, broken, { replace: true, goals: false }, TODAY)).rejects.toThrow();
    expect((await listActivePlans(db)).map((p) => p.planId)).toEqual([oldId]);
    expect(await db.getAllAsync('SELECT id FROM exercise WHERE custom_name IS NOT NULL')).toHaveLength(0);
  });
});

describe('Gegengewicht', () => {
  test('D4: bester Satz im Bericht ist der mit der wenigsten Unterstützung', async () => {
    const id = await startSession(db, null);
    for (const kg of [40, 25, 30]) {
      await db.runAsync(
        `INSERT INTO set_log (id, session_id, exercise_id, position, rest_seconds, weight_kg, reps, completed_at_utc)
         VALUES (?, ?, 'klimmzuege_unterstuetzt', ?, 90, ?, 8, ?)`,
        `s${kg}`,
        id,
        kg,
        kg,
        '2026-11-01T10:00:00Z'
      );
    }
    await finishSession(db, id, 'abgeschlossen');
    const r = await buildReport(db, '2000-01-01', '2100-01-01');
    expect(r.training.top[0]).toMatchObject({ bestKg: 25, bestReps: 8, e1rm: null });
  });
});

describe('Gleiches Gewicht mit Toleranz (D1)', () => {
  test('135 lb aus Import (2 Stellen) und Eingabe zählen als dasselbe Höchstgewicht', async () => {
    const exerciseId = await addCustomExercise(db, 'Bankdrücken lb', 'langhantel', 'brust');
    const old = await startSession(db, null);
    await db.runAsync(
      `INSERT INTO set_log (id, session_id, exercise_id, position, rest_seconds, weight_kg, reps, completed_at_utc)
       VALUES ('i1', ?, ?, 0, 90, 61.23, 5, '2026-10-01T10:00:00Z'), ('i2', ?, ?, 1, 90, 61.23, 8, '2026-10-01T10:05:00Z')`,
      old,
      exerciseId,
      old,
      exerciseId
    );
    await db.runAsync("UPDATE workout_session SET status = 'abgeschlossen', started_at_utc = '2026-10-01T09:00:00Z' WHERE id = ?", old);
    const [best] = await previousBests(db, [exerciseId], 'neu', '2026-11-01T00:00:00Z');
    expect(best.repsAtMaxKg).toBe(8);
    // Eingabe „135“ lb im Training: 61,2349… kg
    const now = await startSession(db, null);
    await db.runAsync(`INSERT INTO set_log (id, session_id, exercise_id, position, rest_seconds) VALUES ('n1', ?, ?, 0, 90)`, now, exerciseId);
    await completeSet(db, 'n1', 135 * 0.45359237, 8);
    expect(await previousBests(db, [exerciseId], old, '2100-01-01T00:00:00Z')).toEqual([expect.objectContaining({ maxKg: 135 * 0.45359237, repsAtMaxKg: 8 })]);
  });
});

describe('Untergrenze max(1200, Ruheenergie) (D10)', () => {
  const profile = { ...EMPTY_PROFILE, birthMonth: '1986-01', heightCm: 158, formulaTerm: '-161' as const };

  test('aus Profil und Gewicht; ohne Angaben 1200', async () => {
    expect(await calorieFloorOn(db, TODAY)).toBe(CALORIE_FLOOR);
    await saveProfile(db, { ...profile, heightCm: 190, formulaTerm: '+5', birthMonth: '1996-01' });
    await addWeight(db, TODAY, 100);
    // 10·100 + 6,25·190 − 5·30 + 5 = 2042,5 → 2050
    expect(restingEnergy(100, 190, 30, '+5')).toBe(2042.5);
    expect(await calorieFloorOn(db, TODAY)).toBe(2050);
  });

  test('neu skaliertes Coach-Ziel: Ruhetag nie unter der Ruheenergie', async () => {
    await saveProfile(db, { ...profile, heightCm: 190, formulaTerm: '+5', birthMonth: '1996-01' });
    await addWeight(db, TODAY, 100);
    const plan = { kcal: 2600, trainingKcal: 2800, restKcal: 2450, trainingWeekdays: [1, 3, 5], macros: { protein: 160, fat: 87, carbs: 314, fiber: 30 } };
    await setCalorieGoal(db, 2600, '2026-10-01', 'coach', null, plan);
    await adjustCalorieGoal(db, 2150, TODAY, 'eigen');
    const goal = await calorieGoalOn(db, TODAY);
    expect(goal?.plan?.restKcal).toBe(2050);
  });

  test('der Check-in bekommt die Untergrenze mit', async () => {
    await saveProfile(db, { ...profile, heightCm: 190, formulaTerm: '+5', birthMonth: '1996-01' });
    await addWeight(db, '2026-10-30', 100);
    const input = await checkinInput(db, '2026-10-31', EMPTY_PROFILE, 'Europe/Berlin');
    expect(input.floor).toBe(2050);
  });
});

describe('Trainingslast und Journal', () => {
  test('D7: erster Lasttag kommt aus der ganzen Datenbank, nicht aus dem geladenen Fenster', async () => {
    expect(await firstLoadDay(db)).toBeNull();
    const id = await startSession(db, null);
    await finishSession(db, id, 'abgeschlossen');
    await db.runAsync("UPDATE workout_session SET started_at_utc = '2026-06-01T10:00:00Z', finished_at_utc = '2026-06-01T11:00:00Z' WHERE id = ?", id);
    expect(await firstLoadDay(db)).toBeNull(); // ohne Anstrengung keine Last
    await setSessionFeedback(db, id, 6, null);
    expect(await firstLoadDay(db)).toBe('2026-06-01');
  });

  test('D8: Mahlzeit um 4:30 ist mit „Tag endet um Mitternacht“ keine späte Mahlzeit', async () => {
    // Uhrzeit in Ortszeit des Testrechners, wie in diaryFactors (getHours).
    const at = new Date(2026, 9, 31, 4, 30).toISOString();
    await db.runAsync(
      `INSERT INTO consumption_event (id, kind, diary_date, occurred_at_utc, time_zone, utc_offset_min, name, amount, unit, kcal, recorded_at_utc)
       VALUES ('e1', 'essen', '2026-10-31', ?, 'UTC', 0, 'Brot', 100, 'g', 250, ?)`,
      at,
      at
    );
    expect(await diaryFactors(db, '2026-10-31')).not.toContain('spaetGegessen');
  });
});

describe('Erster Nutzungstag (D17)', () => {
  test('Training kurz nach Mitternacht zählt zum lokalen Tag', async () => {
    const id = await startSession(db, null);
    await db.runAsync("UPDATE workout_session SET started_at_utc = '2026-10-31T23:30:00Z' WHERE id = ?", id);
    expect((await usageSummary(db, 'Europe/Berlin')).firstUseDay).toBe('2026-11-01');
    expect((await usageSummary(db, 'UTC')).firstUseDay).toBe('2026-10-31');
  });
});
