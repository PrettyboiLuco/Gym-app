// Bestätigte Fehler aus der ChatGPT-Prüfung, Teil 2 (04.11.2026): Training beenden während eines Zeit-Satz-Countdowns,
// Cardio-Stoppuhr beim Speichern und beim Trainingsende, Cardio/Woche nach Mitternacht, Cardio-Notiz im Planeditor.
// Vor dem Fix schlugen diese Fälle fehl.

import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { planDraftToForm, planFormToDraft } from '@/components/plan-form-logic';
import { heldSeconds } from '@/components/set-table-logic';
import { CARDIO_ACTIVITIES, defaultCardioMinutes, elapsedMinutes, parseCardioForm } from '@/domain/cardio';
import { isoWeekday } from '@/domain/dates';
import { DEFAULT_REMINDERS } from '@/domain/reminders';
import { localDay, timeZone } from '@/domain/time';
import { startRest } from '@/domain/training';
import { syncRestAlert } from '@/services/alerts';
import { endWorkout } from '@/services/workout-end';

import { addCardio, completeCardio, getCardio, listCardioForSession, setCardioTimer } from '../cardio';
import type { Db } from '../db';
import { migrate } from '../migrations';
import { saveReminders } from '../reminders';
import { createTestDb } from '../testing/node-db';
import { finishSession, getSession, listActivePlans, listSessionSets, loadPlanDraft, loadRestTimer, saveRestTimer, savePlan, startSession } from '../training';
import { loadTrainingWeekOf } from '../training-week';

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

const item = (exerciseId: string, sets: number, restSeconds: number, targetSeconds: number | null = null) => ({
  exerciseId,
  sets,
  repsMin: 8,
  repsMax: 12,
  restSeconds,
  superset: null,
  targetSeconds,
});

const restAlerts = () => [...mockScheduled.keys()].filter((k) => k.startsWith('timer-pause-'));

async function plankSession() {
  await savePlan(db, null, { name: 'P', days: [{ name: 'Core', items: [item('plank', 2, 60, 45)] }] });
  const [plan] = await listActivePlans(db);
  const id = await startSession(db, plan.days[0].id);
  return { id, rows: await listSessionSets(db, id) };
}

// ------------------------------------------------------------------------------------------------ 1
describe('Training beenden während ein Zeit-Satz-Countdown läuft', () => {
  test('der Satz wird mit den gehaltenen Sekunden VOR dem Ende gespeichert; danach läuft keine Pause und keine Mitteilung', async () => {
    await saveReminders(db, { ...DEFAULT_REMINDERS, timerAlerts: true });
    const { id, rows } = await plankSession();
    // Eine Pause vom vorigen Satz läuft noch, samt Mitteilung „Pause vorbei“.
    const rest = startRest(null, 60, Date.now());
    await saveRestTimer(db, rest);
    await syncRestAlert(db, rest);
    expect(restAlerts()).toHaveLength(1);

    await endWorkout(db, id, { status: 'abgeschlossen', held: { setId: rows[0].id, seconds: 30 } });

    const session = (await getSession(db, id))!;
    const [set, open] = await listSessionSets(db, id);
    expect(session.status).toBe('abgeschlossen');
    expect(set.seconds).toBe(30);
    expect(set.completedAt! <= session.finishedAt!).toBe(true);
    expect(open.completedAt).toBeNull();
    const timer = await loadRestTimer(db);
    expect(timer === null || timer.stopped === true).toBe(true);
    expect(restAlerts()).toEqual([]);
  });

  test('vergessenes Training mit laufendem Countdown: Ende = Zeitpunkt des gerade eingetragenen Satzes', async () => {
    const { id, rows } = await plankSession();
    await endWorkout(db, id, { status: 'abgeschlossen', stale: true, held: { setId: rows[0].id, seconds: 20 } });
    const session = (await getSession(db, id))!;
    const [set] = await listSessionSets(db, id);
    expect(set.seconds).toBe(20);
    expect(session.finishedAt).toBe(set.completedAt);
  });

  test('vergessenes Training ohne Satz: Ende = Start, Status wie gewählt', async () => {
    const { id } = await plankSession();
    await endWorkout(db, id, { status: 'abgebrochen', reason: 'vergessen', stale: true });
    const session = (await getSession(db, id))!;
    expect(session.status).toBe('abgebrochen');
    expect(session.finishedAt).toBe(session.startedAt);
  });

  test('gehaltene Sekunden aus dem Countdown: mindestens 1, höchstens das Ziel', () => {
    const hold = { seconds: 45, endAtMs: 100_000 };
    expect(heldSeconds(hold, 100_000 - 15_000)).toBe(30);
    expect(heldSeconds(hold, 100_000 - 45_000)).toBe(1);
    expect(heldSeconds(hold, 200_000)).toBe(45);
  });
});

// ------------------------------------------------------------------------------------------------ 2
describe('Cardio-Stoppuhr beim Speichern und beim Trainingsende', () => {
  test('laufende Stoppuhr (35 min) ohne getippte Minuten → gespeichert wird die gemessene Zeit, nicht die geplanten 20 min', async () => {
    const id = await addCardio(db, { activity: CARDIO_ACTIVITIES[0], plannedMinutes: 20 });
    await setCardioTimer(db, id, true);
    const started = new Date(Date.now() - 35 * 60_000).toISOString();
    await db.runAsync('UPDATE cardio_log SET timer_started_at_utc = ? WHERE id = ?', started, id);
    const now = Date.now();
    const minutes = defaultCardioMinutes(await getCardio(db, id), now);
    expect(minutes).toBeCloseTo(elapsedMinutes(started, now), 5);
    expect(minutes).toBeGreaterThan(34);
  });

  test('ohne Planminuten: laufende Stoppuhr ergibt Minuten statt „Minuten fehlen“', async () => {
    const id = await addCardio(db, { activity: CARDIO_ACTIVITIES[0] });
    await setCardioTimer(db, id, true);
    const minutes = defaultCardioMinutes(await getCardio(db, id), Date.now() + 5 * 60_000);
    expect(minutes).not.toBeNull();
    const parsed = parseCardioForm({ minutes: String(minutes), distance: '', avgHr: '', effort: null, level: '', note: '' });
    expect(parsed.problems).toEqual([]);
  });

  test('ohne Stoppuhr bleibt es bei gespeicherten bzw. geplanten Minuten', async () => {
    const id = await addCardio(db, { activity: CARDIO_ACTIVITIES[0], plannedMinutes: 20 });
    expect(defaultCardioMinutes(await getCardio(db, id), Date.now())).toBe(20);
    expect(defaultCardioMinutes(null, Date.now())).toBeNull();
  });

  test('Training beenden, während eine Cardio-Stoppuhr läuft → Eintrag mit gemessener Zeit erledigt; nicht gestartetes Cardio bleibt offen', async () => {
    await savePlan(db, null, {
      name: 'P',
      days: [
        {
          name: 'A',
          items: [item('bankdruecken', 1, 90)],
          cardio: [
            { activity: CARDIO_ACTIVITIES[0], minutes: 15, atEnd: true },
            { activity: CARDIO_ACTIVITIES[1], minutes: 10, atEnd: true },
          ],
        },
      ],
    });
    const [plan] = await listActivePlans(db);
    const id = await startSession(db, plan.days[0].id);
    const [running, untouched] = await listCardioForSession(db, id);
    const started = new Date(Date.now() - 12 * 60_000).toISOString();
    await db.runAsync('UPDATE cardio_log SET timer_started_at_utc = ? WHERE id = ?', started, running.id);
    await finishSession(db, id, 'abgeschlossen');
    const after = await listCardioForSession(db, id);
    const done = after.find((c) => c.id === running.id)!;
    expect(done.completedAt).not.toBeNull();
    expect(done.timerStartedAt).toBeNull();
    expect(done.minutes!).toBeGreaterThanOrEqual(11.9);
    expect(done.minutes!).toBeLessThan(12.5);
    const open = after.find((c) => c.id === untouched.id)!;
    expect(open.completedAt).toBeNull();
    expect(open.minutes).toBeNull();
  });

  test('vergessenes Training: Stoppuhr nach dem letzten Satz gestartet → Uhr aus, Eintrag bleibt „nicht gemacht“', async () => {
    const id = await startSession(db, null);
    const c = await addCardio(db, { activity: CARDIO_ACTIVITIES[0], sessionId: id });
    await setCardioTimer(db, c, true);
    const session = (await getSession(db, id))!;
    await finishSession(db, id, 'abgeschlossen', undefined, new Date(Date.parse(session.startedAt) - 1000).toISOString());
    const entry = (await getCardio(db, c))!;
    expect(entry.completedAt).toBeNull();
    expect(entry.timerStartedAt).toBeNull();
  });
});

// ------------------------------------------------------------------------------------------------ 3
describe('Mitternacht: Cardio und Woche gehören zum Starttag des Trainings', () => {
  const START = '2026-11-08T23:30:00.000Z';

  async function lateSession() {
    await db.runAsync("INSERT INTO workout_session (id, status, started_at_utc) VALUES ('s', 'aktiv', ?)", START);
  }

  test('Cardio, das im Training (nach Mitternacht) hinzugefügt wird, bekommt den Starttag der Session', async () => {
    await lateSession();
    const c = await addCardio(db, { activity: 'laufband', sessionId: 's' });
    await completeCardio(db, c, { minutes: 10, distanceKm: null, avgHr: null, effort: null, level: null, note: null });
    expect((await getCardio(db, c))!.day).toBe(localDay(new Date(START), timeZone));
  });

  test('ein ausdrücklich gewählter Tag bleibt (Cardio für sich)', async () => {
    const c = await addCardio(db, { activity: 'laufband', day: '2026-10-01' });
    expect((await getCardio(db, c))!.day).toBe('2026-10-01');
  });

  test('Zusammenfassung: die Woche des Trainingsstarts, nicht die von heute', async () => {
    await lateSession();
    await db.runAsync(
      "INSERT INTO set_log (id, session_id, exercise_id, position, weight_kg, reps, rest_seconds, completed_at_utc) VALUES ('l1', 's', 'bankdruecken', 0, 50, 8, 90, ?)",
      '2026-11-09T00:10:00.000Z'
    );
    await finishSession(db, 's', 'abgeschlossen', undefined, '2026-11-09T00:30:00.000Z');
    const startDay = localDay(new Date(START), timeZone);
    const week = await loadTrainingWeekOf(db, START);
    expect(week.todayIndex).toBe(isoWeekday(startDay) - 1);
    expect(week.done[week.todayIndex]).toBe(true);
    expect(week.doneSets[week.todayIndex]).toBe(1);
  });
});

// ------------------------------------------------------------------------------------------------ 4
describe('Planeditor: Notiz geplanter Cardio-Blöcke', () => {
  test('Laden und Speichern im Editor behalten die Cardio-Notiz', async () => {
    const planId = await savePlan(db, null, {
      name: 'P',
      days: [{ name: 'A', items: [item('bankdruecken', 3, 90)], cardio: [{ activity: 'laufband', minutes: 15, atEnd: true, note: 'Steigung 8 %' }] }],
    });
    const draft = (await loadPlanDraft(db, planId))!;
    expect(draft.days[0].cardio?.[0].note).toBe('Steigung 8 %');
    const roundTrip = planFormToDraft(planDraftToForm(draft), () => false);
    await savePlan(db, planId, roundTrip);
    expect((await loadPlanDraft(db, planId))!.days[0].cardio?.[0].note).toBe('Steigung 8 %');
  });
});

describe('Cardio-Notiz aus dem Plan', () => {
  test('startSession übernimmt die Notiz eines geplanten Cardio-Blocks in den offenen Eintrag', async () => {
    const planId = await savePlan(db, null, {
      name: 'C',
      days: [
        {
          name: 'A',
          items: [{ exerciseId: 'bankdruecken', sets: 1, repsMin: 8, repsMax: 12, restSeconds: 90, targetSeconds: null }],
          cardio: [{ activity: 'laufband', minutes: 15, atEnd: true, note: 'Steigung 8 %' }],
        },
      ],
    });
    const day = (await listActivePlans(db)).find((p) => p.planId === planId)!.days[0];
    const sessionId = await startSession(db, day.id);
    const [entry] = await listCardioForSession(db, sessionId);
    expect(entry.note).toBe('Steigung 8 %');
  });
});
