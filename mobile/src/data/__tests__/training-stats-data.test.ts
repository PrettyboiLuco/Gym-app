// A8: Deload als befristete Woche, Geräteprofile, bevorzugte Wochentage, Statistik und Satzzeit aus der Datenbank.

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import type { Db } from '../db';
import { migrate } from '../migrations';
import { createTestDb } from '../testing/node-db';
import { activeVersion, expireTemporaryPlans, loadPlanDraft, savePlan } from '../training';
import {
  activeEquipment,
  deloadOffer,
  loadDeloadState,
  loadEquipmentProfiles,
  loadPeriodStats,
  loadSecondsPerSet,
  saveActiveEquipmentProfile,
  saveDeloadState,
  savePreferredWeekdays,
  startDeload,
} from '../training-stats';
import { loadTrainingWeek } from '../training-week';

let db: Db & { close(): void };
beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

const plan = { name: 'GK', days: [{ name: 'A', items: [{ exerciseId: 'kniebeuge', sets: 4, repsMin: 6, repsMax: 8, restSeconds: 120, rir: '1' }] }] };

async function session(id: string, start: string, minutes: number, sets: { ex: string; kg: number; reps: number }[]) {
  const end = new Date(Date.parse(start) + minutes * 60_000).toISOString();
  await db.runAsync("INSERT INTO workout_session (id, status, started_at_utc, finished_at_utc) VALUES (?, 'abgeschlossen', ?, ?)", id, start, end);
  for (const [i, s] of sets.entries()) {
    await db.runAsync(
      'INSERT INTO set_log (id, session_id, exercise_id, position, weight_kg, reps, rest_seconds, completed_at_utc) VALUES (?, ?, ?, ?, ?, ?, 90, ?)',
      `${id}-${i}`,
      id,
      s.ex,
      i,
      s.kg,
      s.reps,
      end
    );
  }
}

describe('Deload', () => {
  test('Angebot nach 8 Wochen am Stück, leichte Woche bis Sonntag, danach wieder der Plan', async () => {
    const planId = await savePlan(db, null, plan);
    const before = await activeVersion(db, planId);
    for (let w = 0; w < 8; w++)
      await session(`w${w}`, new Date(Date.parse('2026-11-02T17:00:00Z') - w * 7 * 86_400_000).toISOString(), 60, [{ ex: 'kniebeuge', kg: 100, reps: 6 }]);
    expect(await deloadOffer(db, '2026-11-03')).toMatchObject({ due: true, weeks: 8 });
    await saveDeloadState(db, { ...(await loadDeloadState(db)), snoozedUntil: '2026-11-09' });
    expect((await deloadOffer(db, '2026-11-03')).due).toBe(false);
    expect(await startDeload(db, '2026-11-03', '2026-11-08', 'Leichte Woche')).toBe(true);
    expect((await loadPlanDraft(db, planId))!.days[0].items[0]).toMatchObject({ sets: 2, rir: '3' });
    expect((await deloadOffer(db, '2026-11-10')).weeks).toBe(0);
    await expireTemporaryPlans(db, '2026-11-09');
    expect((await activeVersion(db, planId))!.id).toBe(before!.id);
  });
});

describe('Geräteprofile und Wochentage', () => {
  test('Standardprofile, Wechsel wirkt auf die nutzbaren Geräte', async () => {
    const { profiles, activeId } = await loadEquipmentProfiles(db, ['langhantel']);
    expect(profiles.map((p) => p.id)).toEqual(['studio', 'zuhause', 'hotel']);
    expect(activeId).toBe('studio');
    await saveActiveEquipmentProfile(db, 'zuhause');
    const { equipment } = await activeEquipment(db, ['langhantel']);
    expect(equipment).toEqual(expect.arrayContaining(['koerpergewicht', 'kurzhantel']));
    expect(equipment).not.toContain('langhantel');
  });
  test('bevorzugte Wochentage erscheinen als geplante Tage, wenn der Coach keine hat', async () => {
    await savePreferredWeekdays(db, [5, 1, 3]);
    expect((await loadTrainingWeek(db, '2026-11-04')).planned).toEqual([true, false, true, false, true, false, false]);
  });
});

describe('Statistik und Satzzeit', () => {
  test('Monatszahlen und eigene Satzzeit', async () => {
    for (let i = 0; i < 3; i++) {
      await session(
        `s${i}`,
        `2026-10-0${i + 2}T17:00:00Z`,
        30,
        [...Array(8)].map((_, j) => ({ ex: j < 4 ? 'kniebeuge' : 'bankdruecken', kg: 80 + i * 5, reps: 5 }))
      );
    }
    const s = await loadPeriodStats(db, '2026-10-01', '2026-10-31');
    expect(s).toMatchObject({ sessions: 3, sets: 24 });
    expect(s.records.map((r) => r.exerciseId).sort()).toEqual(['bankdruecken', 'kniebeuge']);
    // 30 min − 6 × 90 s Pause − 2 × 60 s Wechsel = 1140 s / 8 Sätze ≈ 143 s
    expect(await loadSecondsPerSet(db)).toBe(143);
  });
});
