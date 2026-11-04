// Bestätigte Fehler aus der ChatGPT-Prüfung (04.11.2026): Supersatz-Pause bei fester Pausenwahl, Zusatzsatz im Supersatz,
// Muskelkarte früherer Wochen, Cardio beim Planumbau. Vor dem Fix schlugen die „BUG“-Fälle fehl.

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import { STARTER_EXERCISES, MORE_STRENGTH_EXERCISES } from '@/domain/exercises';
import { tallyMuscles } from '@/domain/muscle-map';
import { rebuildPlan, type PlannerExercise } from '@/domain/planner';
import { restSecondsFor } from '@/domain/training';

import type { Db } from '../db';
import { migrate } from '../migrations';
import { createTestDb } from '../testing/node-db';
import { addSet, listActivePlans, listExercises, listSessionSets, loadPlanDraft, savePlan, startSession } from '../training';
import { loadWeekTally } from '../training-week';

let db: Db & { close(): void };
beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

const item = (exerciseId: string, sets: number, restSeconds: number, superset: number | null = null, targetSeconds: number | null = null) => ({
  exerciseId,
  sets,
  repsMin: 8,
  repsMax: 12,
  restSeconds,
  superset,
  targetSeconds,
});

async function session(id: string, start: string, end: string, sets: { ex: string; n: number }[]) {
  await db.runAsync("INSERT INTO workout_session (id, status, started_at_utc, finished_at_utc) VALUES (?, 'abgeschlossen', ?, ?)", id, start, end);
  let p = 0;
  for (const s of sets)
    for (let k = 0; k < s.n; k++)
      await db.runAsync(
        'INSERT INTO set_log (id, session_id, exercise_id, position, weight_kg, reps, rest_seconds, completed_at_utc) VALUES (?, ?, ?, ?, 50, 8, 90, ?)',
        `${id}-${p}`,
        id,
        s.ex,
        p++,
        end
      );
}

describe('Behauptung 2: Nullpausen bei Supersätzen', () => {
  async function supersetSession() {
    await savePlan(db, null, { name: 'S', days: [{ name: 'A', items: [item('latzug', 2, 90, 1), item('rudern_maschine', 2, 60, 1)] }] });
    const [plan] = await listActivePlans(db);
    const id = await startSession(db, plan.days[0].id);
    return { id, rows: await listSessionSets(db, id) };
  }

  test('OK: ohne gewählte Pause – 0 s zwischen A1 und B1, volle Pause nach der Runde', async () => {
    const { rows } = await supersetSession();
    expect(rows.map((r) => restSecondsFor(null, r.restSeconds, r.superset != null))).toEqual([0, 60, 0, 60]);
  });

  test('gewählte feste Pause („nach jedem Satz 90 s“) überschreibt die Supersatz-Nullpause', async () => {
    const { rows } = await supersetSession();
    // session/[id].tsx:358 → restSecondsFor(restChoice, row.restSeconds); domain/training.ts:194–196
    expect(rows.map((r) => restSecondsFor(90, r.restSeconds, r.superset != null))).toEqual([0, 90, 0, 90]);
  });

  test('„Satz hinzufügen“ bei der ersten Supersatz-Übung erbt deren Nullpause, obwohl er allein läuft', async () => {
    const { id } = await supersetSession();
    await addSet(db, id, 'latzug');
    const added = (await listSessionSets(db, id)).at(-1)!;
    expect(added.superset).toBeNull();
    // data/training.ts:555–575 übernimmt rest_seconds des letzten Satzes (0) → nach dem Extra-Satz gar keine Pause.
    expect(added.restSeconds).toBeGreaterThan(0);
  });
});

describe('Behauptung 4: historische Muskelkarte', () => {
  test('Karte der Vorwoche zählt auch alle Sätze der Wochen danach (keine Obergrenze)', async () => {
    await session('alt', '2026-10-27T12:00:00.000Z', '2026-10-27T13:00:00.000Z', [{ ex: 'bankdruecken', n: 3 }]);
    await session('neu', '2026-11-03T12:00:00.000Z', '2026-11-03T13:00:00.000Z', [{ ex: 'kniebeuge', n: 4 }]);
    const exercises = new Map((await listExercises(db)).map((e) => [e.id, e]));
    const lastWeek = await loadWeekTally(db, '2026-10-28');
    expect(lastWeek).toEqual(tallyMuscles([{ exercise: exercises.get('bankdruecken')!, sets: 3 }]));
  });
});

describe('Behauptung 5: Cardio-Blöcke beim Planumbau', () => {
  const EXERCISES: PlannerExercise[] = [...STARTER_EXERCISES, ...MORE_STRENGTH_EXERCISES].map((e) => ({
    id: e.id,
    equipment: e.equipment,
    muscleGroup: e.muscleGroup,
    kind: 'kraft',
    measure: 'wdh',
  }));
  const it = (id: string) => ({ exerciseId: id, sets: 3, repsMin: 8, repsMax: 12, restSeconds: 90, targetSeconds: null });

  test('Umbau (Planassistent) verliert die Cardio-Einträge der Plantage', async () => {
    const planId = await savePlan(db, null, {
      name: 'OU',
      days: [
        {
          name: 'Ober',
          items: ['bankdruecken', 'langhantelrudern', 'schulterdruecken_kh'].map(it),
          cardio: [{ activity: 'laufband', minutes: 15, atEnd: true }],
        },
        {
          name: 'Unter',
          items: ['kniebeuge', 'rumaenisches_kreuzheben', 'beinpresse'].map(it),
          cardio: [{ activity: 'ergometer', minutes: 10, atEnd: false }],
        },
      ],
    });
    const current = (await loadPlanDraft(db, planId))!;
    expect(current.days.flatMap((d) => d.cardio ?? [])).toHaveLength(2);
    const p = rebuildPlan({
      current,
      exercises: EXERCISES,
      days: 3,
      minutes: 75,
      split: 'auto',
      locked: [],
      blockedEquipment: [],
      blockedExercises: [],
      dayName: (type, letter) => (letter ? `${type} ${letter}` : type),
    });
    // assistant.tsx:241 speichert genau diesen Entwurf als neue Planversion.
    await savePlan(db, planId, p.draft);
    const after = (await loadPlanDraft(db, planId))!;
    expect(after.days.flatMap((d) => d.cardio ?? []).length).toBeGreaterThan(0);
  });
});
