// Datenbankzugriffe für Morgen-Check, Status, Trainingslast, Journal und das Angebot „leichter heute“ (Ausbauplan A6).

import { lateCaffeineMg } from '@/domain/caffeine';
import { shiftDay } from '@/domain/dates';
import {
  autoFactors,
  BASELINE_DAYS,
  lighterSets,
  loadRatio,
  MANUAL_FACTORS,
  readiness,
  SLEEP_GOAL_DEFAULT,
  sessionLoad,
  statusOn,
  type DailyCheck,
  type Factor,
  type LoadDay,
  type Readiness,
  type Status,
} from '@/domain/readiness';
import { localDay, timeZone } from '@/domain/time';

import { readState, writeState } from './app-state';
import { newId, nowUtc, type Db } from './db';
import { calorieGoalOn } from './goals';
import { activeVersion, listActivePlans, loadPlanDraft, savePlan } from './training';

const CHECK_COLUMNS = `day, bed_time AS bedTime, wake_time AS wakeTime, sleep_hours AS sleepHours, sleep_quality AS sleepQuality,
  energy, soreness, factors, note`;

type Row = Omit<DailyCheck, 'factors'> & { factors: string | null };

const parseFactors = (json: string | null): Factor[] => {
  try {
    const v = json ? JSON.parse(json) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};
const toCheck = (r: Row): DailyCheck => ({ ...r, factors: parseFactors(r.factors) });

export async function getCheck(db: Db, day: string): Promise<DailyCheck | null> {
  const r = await db.getFirstAsync<Row>(`SELECT ${CHECK_COLUMNS} FROM daily_check WHERE day = ?`, day);
  return r ? toCheck(r) : null;
}

export async function listChecks(db: Db, fromDay: string, toDay = '9999-12-31'): Promise<DailyCheck[]> {
  const rows = await db.getAllAsync<Row>(`SELECT ${CHECK_COLUMNS} FROM daily_check WHERE day BETWEEN ? AND ? ORDER BY day`, fromDay, toDay);
  return rows.map(toCheck);
}

/** Speichert (Teile) des Morgen-Checks eines Tages; nicht genannte Felder bleiben, wie sie sind. */
export async function saveCheck(db: Db, day: string, change: Partial<Omit<DailyCheck, 'day'>>) {
  const current = await getCheck(db, day);
  const next: DailyCheck = {
    day,
    bedTime: null,
    wakeTime: null,
    sleepHours: null,
    sleepQuality: null,
    energy: null,
    soreness: null,
    factors: [],
    note: null,
    ...current,
    ...change,
  };
  const factors = next.factors.filter((f) => (MANUAL_FACTORS as readonly string[]).includes(f));
  await db.runAsync(
    `INSERT INTO daily_check (id, day, bed_time, wake_time, sleep_hours, sleep_quality, energy, soreness, factors, note, recorded_at_utc)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (day) DO UPDATE SET bed_time = excluded.bed_time, wake_time = excluded.wake_time, sleep_hours = excluded.sleep_hours,
       sleep_quality = excluded.sleep_quality, energy = excluded.energy, soreness = excluded.soreness, factors = excluded.factors,
       note = excluded.note, recorded_at_utc = excluded.recorded_at_utc`,
    newId(),
    day,
    next.bedTime,
    next.wakeTime,
    next.sleepHours,
    next.sleepQuality,
    next.energy,
    next.soreness,
    factors.length ? JSON.stringify(factors) : null,
    next.note?.trim() || null,
    nowUtc()
  );
}

/** Alte Sicherungen kennen nur sleep_entry: Einträge übernehmen, die im Morgen-Check fehlen. */
export async function adoptSleepEntries(db: Db) {
  await db.runAsync(
    `INSERT INTO daily_check (id, day, sleep_hours, sleep_quality, recorded_at_utc)
     SELECT id, day, hours, quality, recorded_at_utc FROM sleep_entry s
     WHERE s.day NOT IN (SELECT day FROM daily_check)
       AND s.recorded_at_utc = (SELECT MAX(recorded_at_utc) FROM sleep_entry WHERE day = s.day)
     GROUP BY day`
  );
}

// ------------------------------------------------------------------------------------- Status

export type StatusPeriod = { id: string; status: Status; fromDay: string; toDay: string | null; note: string | null };

export function listStatus(db: Db) {
  return db.getAllAsync<StatusPeriod>(
    'SELECT id, status, from_day AS fromDay, to_day AS toDay, note FROM status_period ORDER BY from_day DESC, created_at_utc DESC'
  );
}

export async function statusToday(db: Db, today: string): Promise<StatusPeriod | null> {
  const list = await listStatus(db);
  const status = statusOn(list, today);
  return status ? (list.find((p) => p.status === status && p.fromDay <= today && (p.toDay === null || p.toDay >= today)) ?? null) : null;
}

/** Neuer Status ab heute; ein laufender endet gestern (nie zwei gleichzeitig). */
export async function startStatus(db: Db, status: Status, today: string, note: string | null = null) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE status_period SET to_day = ? WHERE to_day IS NULL OR to_day >= ?', shiftDay(today, -1), today);
    await db.runAsync('DELETE FROM status_period WHERE to_day < from_day');
    await db.runAsync(
      'INSERT INTO status_period (id, status, from_day, to_day, note, created_at_utc) VALUES (?, ?, ?, NULL, ?, ?)',
      newId(),
      status,
      today,
      note?.trim() || null,
      nowUtc()
    );
  });
}

/** „Wieder fit“: laufender Status endet gestern; begann er heute, wird er gelöscht. */
export async function endStatus(db: Db, today: string) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM status_period WHERE from_day >= ? AND (to_day IS NULL OR to_day >= ?)', today, today);
    await db.runAsync('UPDATE status_period SET to_day = ? WHERE to_day IS NULL OR to_day >= ?', shiftDay(today, -1), today);
  });
}

/** Gab es in diesem Zeitraum einen Status? (z. B. Check-in-Woche) */
export async function statusDuring(db: Db, fromDay: string, toDay: string): Promise<Status | null> {
  const row = await db.getFirstAsync<{ status: Status }>(
    'SELECT status FROM status_period WHERE from_day <= ? AND (to_day IS NULL OR to_day >= ?) ORDER BY from_day DESC LIMIT 1',
    toDay,
    fromDay
  );
  return row?.status ?? null;
}

// ------------------------------------------------------------------------------------- Ziele

export const loadSleepGoal = async (db: Db) => {
  const own = await readState<number | null>(db, 'sleep_goal', null);
  if (own) return own;
  const setup = await readState<{ sleepHours?: number | null } | null>(db, 'coach_setup', null);
  return setup?.sleepHours ?? SLEEP_GOAL_DEFAULT;
};
export const saveSleepGoal = (db: Db, hours: number) => writeState(db, 'sleep_goal', hours);
export const loadWakeTime = (db: Db) => readState<string | null>(db, 'wake_time', null);
export const saveWakeTime = (db: Db, time: string | null) => writeState(db, 'wake_time', time);

// ----------------------------------------------------------------------------- Trainingslast

/** Last je Tag: Trainings (Dauer × Anstrengung) und Cardio außerhalb eines Trainings (Minuten × Anstrengung). */
export async function loadDays(db: Db, fromDay: string): Promise<LoadDay[]> {
  const sessions = await db.getAllAsync<{ start: string; end: string | null; effort: number | null }>(
    `SELECT started_at_utc AS start, finished_at_utc AS end, effort FROM workout_session
     WHERE status = 'abgeschlossen' AND started_at_utc >= ?`,
    `${shiftDay(fromDay, -1)}T00:00:00.000Z`
  );
  const cardio = await db.getAllAsync<{ day: string; minutes: number | null; effort: number | null }>(
    'SELECT day, minutes, effort FROM cardio_log WHERE session_id IS NULL AND completed_at_utc IS NOT NULL AND day >= ?',
    fromDay
  );
  const byDay = new Map<string, number>();
  for (const s of sessions) {
    const minutes = s.end ? (Date.parse(s.end) - Date.parse(s.start)) / 60_000 : null;
    const load = sessionLoad(minutes, s.effort);
    const day = localDay(new Date(s.start), timeZone);
    if (load !== null && day >= fromDay) byDay.set(day, (byDay.get(day) ?? 0) + load);
  }
  for (const c of cardio) {
    const load = sessionLoad(c.minutes, c.effort);
    if (load !== null) byDay.set(c.day, (byDay.get(c.day) ?? 0) + load);
  }
  return [...byDay.entries()].map(([day, load]) => ({ day, load })).sort((a, b) => a.day.localeCompare(b.day));
}

export async function setSessionFeedback(db: Db, sessionId: string, effort: number | null, feedback: Record<string, Record<string, number>> | null) {
  await db.runAsync(
    'UPDATE workout_session SET effort = ?, feedback = ? WHERE id = ?',
    effort,
    feedback && Object.keys(feedback).length ? JSON.stringify(feedback) : null,
    sessionId
  );
}

export async function getSessionFeedback(db: Db, sessionId: string) {
  const row = await db.getFirstAsync<{ effort: number | null; feedback: string | null }>(
    'SELECT effort, feedback FROM workout_session WHERE id = ?',
    sessionId
  );
  let feedback: Record<string, Record<string, number>> = {};
  try {
    feedback = row?.feedback ? JSON.parse(row.feedback) : {};
  } catch {
    feedback = {};
  }
  return { effort: row?.effort ?? null, feedback };
}

// ------------------------------------------------------------------------------------ Journal

/** Faktoren aus dem Tagebuch eines Tages (der Abend vor dem Morgen-Check). */
export async function diaryFactors(db: Db, day: string): Promise<Factor[]> {
  const events = await db.getAllAsync<{ kind: string; drinkType: string | null; kcal: number | null; caffeineMg: number | null; occurredAt: string }>(
    `SELECT kind, drink_type AS drinkType, kcal, caffeine_mg AS caffeineMg, occurred_at_utc AS occurredAt FROM consumption_event WHERE diary_date = ?`,
    day
  );
  if (events.length === 0) return [];
  const meals = events.filter((e) => e.kind === 'essen');
  const minutes = (iso: string) => {
    const d = new Date(iso);
    const m = d.getHours() * 60 + d.getMinutes();
    // Nach Mitternacht gebucht, aber noch derselbe Ernährungstag → später als 24 Uhr
    return m < 5 * 60 ? m + 24 * 60 : m;
  };
  const goal = await calorieGoalOn(db, day);
  const kcal = meals.some((e) => e.kcal !== null) ? events.reduce((s, e) => s + (e.kcal ?? 0), 0) : null;
  return autoFactors({
    alcohol: events.some((e) => e.drinkType === 'alkohol'),
    lateCaffeineMg: lateCaffeineMg(events),
    lastMealMinutes: meals.length ? Math.max(...meals.map((e) => minutes(e.occurredAt))) : null,
    kcal,
    goalKcal: goal?.kcal ?? null,
  });
}

/** Morgen-Checks mit allen Faktoren des Vortags (eigene + Tagebuch) für die Journal-Auswertung. */
export async function journalDays(db: Db, fromDay: string, toDay: string) {
  const checks = await listChecks(db, fromDay, toDay);
  const out: (DailyCheck & { allFactors: Factor[]; diary: Factor[] })[] = [];
  for (const c of checks) {
    const diary = await diaryFactors(db, shiftDay(c.day, -1));
    out.push({ ...c, diary, allFactors: [...new Set([...c.factors, ...diary])] });
  }
  return out;
}

// ------------------------------------------------------------------------------------- Ampel

export type ReadinessToday = { readiness: Readiness; check: DailyCheck | null; status: StatusPeriod | null; ratio: number | null };

export async function readinessToday(db: Db, today: string): Promise<ReadinessToday> {
  const [checks, status, loads] = await Promise.all([
    listChecks(db, shiftDay(today, -BASELINE_DAYS), today),
    statusToday(db, today),
    loadDays(db, shiftDay(today, -BASELINE_DAYS - 7)),
  ]);
  const check = checks.find((c) => c.day === today) ?? null;
  // Last bis gestern: das heutige Training soll die Ampel von heute nicht verändern.
  const { ratio } = loadRatio(
    loads.filter((l) => l.day < today),
    shiftDay(today, -1)
  );
  return { readiness: readiness(check, checks, ratio, status?.status ?? null), check, status, ratio };
}

// ----------------------------------------------------------------------------- Angebot heute

/**
 * Leichtere Fassung des aktiven Plans nur für heute (befristete Version bis heute, TRAIN-008). Morgen gilt
 * automatisch wieder die bisherige Version. Gibt false zurück, wenn es keinen Plan gibt.
 */
export async function lighterPlanToday(db: Db, offer: 'wenigerSaetze' | 'leicht', today: string, note: string): Promise<'angepasst' | 'schon' | 'keinPlan'> {
  // Nur einmal am Tag: ein zweites Antippen würde sonst noch einmal kürzen.
  if ((await lighterAppliedOn(db)) === today) return 'schon';
  const plan = (await listActivePlans(db)).find((p) => p.days.length > 0);
  if (!plan) return 'keinPlan';
  const [draft, current] = await Promise.all([loadPlanDraft(db, plan.planId), activeVersion(db, plan.planId)]);
  if (!draft || !current) return 'keinPlan';
  const lighter = {
    ...draft,
    days: draft.days.map((d) => ({ ...d, items: d.items.map((i) => ({ ...i, sets: lighterSets(i.sets, offer) })) })),
  };
  // Läuft eine befristete Fassung über heute hinaus, kehrt die leichte zu ihr zurück; endet sie heute, zu deren Ziel.
  const returnVersionId = current.validUntil && current.validUntil <= today ? current.returnVersionId : current.id;
  await savePlan(db, plan.planId, lighter, { validUntil: today, returnVersionId, note });
  await writeState(db, 'lighter_today', today);
  return 'angepasst';
}

const lighterAppliedOn = (db: Db) => readState<string | null>(db, 'lighter_today', null);

// ------------------------------------------------------------------------------------ Verlauf

export type HistoryDay = { day: string; check: DailyCheck | null; readiness: Readiness; load: number };

/** Bereitschaft, Schlaf und Last der letzten `days` Tage (neueste zuerst), jeweils mit dem damaligen Schnitt. */
export async function readinessHistory(db: Db, today: string, days = 28): Promise<HistoryDay[]> {
  const from = shiftDay(today, -(days - 1));
  const [checks, loads, periods] = await Promise.all([
    listChecks(db, shiftDay(from, -BASELINE_DAYS), today),
    loadDays(db, shiftDay(from, -BASELINE_DAYS - 7)),
    listStatus(db),
  ]);
  const out: HistoryDay[] = [];
  for (let i = 0; i < days; i++) {
    const day = shiftDay(today, -i);
    const check = checks.find((c) => c.day === day) ?? null;
    const { ratio } = loadRatio(
      loads.filter((l) => l.day < day),
      shiftDay(day, -1)
    );
    out.push({
      day,
      check,
      readiness: readiness(check, checks, ratio, statusOn(periods, day)),
      load: loads.find((l) => l.day === day)?.load ?? 0,
    });
  }
  return out;
}
