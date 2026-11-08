// Daten für die Auswertung im Training (Ausbauplan A8): Satzzeiten, Statistik, Muskelkarte, Deload, Geräteprofile,
// bevorzugte Wochentage.

import type { Equipment } from '@/domain/exercises';
import { loadModeOf } from '@/domain/logger';
import { zoneDay } from '@/domain/time';
import {
  DEFAULT_PROFILES,
  DELOAD_WEEKS_DEFAULT,
  deloadDraft,
  deloadDue,
  exerciseTrends,
  periodStats,
  personalSecondsPerSet,
  trainingWeeksInBlock,
  usableEquipment,
  type EquipmentProfile,
  type ExerciseTrend,
  type PeriodStats,
  type StatSet,
} from '@/domain/training-stats';

import { readState, writeState } from './app-state';
import type { Db } from './db';
import { activeVersion, insertPlanVersion, listActivePlans, listExercises, loadPlanDraft } from './training';

// --------------------------------------------------------------------------- Satzzeit

/** Eigene Sekunden je Satz aus den letzten 10 abgeschlossenen Trainings (null = noch zu wenige). */
export async function loadSecondsPerSet(db: Db): Promise<number | null> {
  const sessions = await db.getAllAsync<{ id: string; start: string; end: string }>(
    `SELECT id, started_at_utc AS start, finished_at_utc AS end FROM workout_session
     WHERE status = 'abgeschlossen' AND finished_at_utc IS NOT NULL ORDER BY started_at_utc DESC LIMIT 10`
  );
  const timings = [];
  for (const s of sessions) {
    const sets = await db.getAllAsync<{ exerciseId: string; restSeconds: number }>(
      `SELECT exercise_id AS exerciseId, rest_seconds AS restSeconds FROM set_log
       WHERE session_id = ? AND completed_at_utc IS NOT NULL ORDER BY completed_at_utc`,
      s.id
    );
    timings.push({ durationSec: (Date.parse(s.end) - Date.parse(s.start)) / 1000, sets });
  }
  return personalSecondsPerSet(timings);
}

// ------------------------------------------------------------------------------ Statistik

export async function allSets(db: Db): Promise<StatSet[]> {
  const rows = await db.getAllAsync<Omit<StatSet, 'day'> & { at: string; tz: string | null }>(
    `SELECT l.session_id AS sessionId, s.started_at_utc AS at, s.time_zone AS tz, l.exercise_id AS exerciseId, l.set_type AS setType,
       l.weight_kg AS weightKg, l.reps, l.seconds
     FROM set_log l JOIN workout_session s ON s.id = l.session_id
     WHERE s.status = 'abgeschlossen' AND l.completed_at_utc IS NOT NULL ORDER BY s.started_at_utc, l.position`
  );
  return rows.map(({ at, tz, ...r }) => ({ ...r, day: zoneDay(at, tz) }));
}

/** Belastungsart je Übung (Gegengewicht, einseitig …) für Volumen und Bestleistungen. */
async function modeLookup(db: Db) {
  const byId = new Map((await listExercises(db)).map((e) => [e.id, e]));
  return (id: string) => {
    const e = byId.get(id);
    return e ? loadModeOf(e) : 'normal';
  };
}

const listCardio = (db: Db) =>
  db.getAllAsync<{ day: string; minutes: number | null }>('SELECT day, minutes FROM cardio_log WHERE completed_at_utc IS NOT NULL');

export async function loadPeriodStats(db: Db, from: string, to: string): Promise<PeriodStats> {
  const [sets, cardio, modeOf] = await Promise.all([allSets(db), listCardio(db), modeLookup(db)]);
  return periodStats(sets, cardio, from, to, modeOf);
}

/** Zeitraum und Vergleichszeitraum mit einmal gelesenen Sätzen (Kennzahlen mit „ggü. Vormonat“). */
export async function loadPeriodComparison(
  db: Db,
  current: { from: string; to: string },
  previous: { from: string; to: string }
): Promise<{ current: PeriodStats; previous: PeriodStats }> {
  const [sets, cardio, modeOf] = await Promise.all([allSets(db), listCardio(db), modeLookup(db)]);
  return {
    current: periodStats(sets, cardio, current.from, current.to, modeOf),
    previous: periodStats(sets, cardio, previous.from, previous.to, modeOf),
  };
}

/** Statistik-Seite: Zeitraum, Vergleichszeitraum und Verlauf aus einmal gelesenen Sätzen (vorher zweimal alle Sätze). */
export async function loadStatsOverview(
  db: Db,
  current: { from: string; to: string },
  previous: { from: string; to: string },
  today: string
): Promise<{ current: PeriodStats; previous: PeriodStats; trends: ExerciseTrend[] }> {
  const [sets, cardio, modeOf] = await Promise.all([allSets(db), listCardio(db), modeLookup(db)]);
  return {
    current: periodStats(sets, cardio, current.from, current.to, modeOf),
    previous: periodStats(sets, cardio, previous.from, previous.to, modeOf),
    trends: exerciseTrends(sets, today, modeOf),
  };
}

/** „Bestleistungen & Verlauf“: häufigste Übungen der letzten 8 Wochen mit Wochenwerten und letzter Bestleistung. */
export async function loadExerciseTrends(db: Db, today: string): Promise<ExerciseTrend[]> {
  const [sets, modeOf] = await Promise.all([allSets(db), modeLookup(db)]);
  return exerciseTrends(sets, today, modeOf);
}

// ------------------------------------------------------------------------------------ Deload

export type DeloadState = { intervalWeeks: number; lastEnd: string | null; snoozedUntil: string | null };

export const loadDeloadState = async (db: Db): Promise<DeloadState> => ({
  intervalWeeks: DELOAD_WEEKS_DEFAULT,
  lastEnd: null,
  snoozedUntil: null,
  ...(await readState<Partial<DeloadState>>(db, 'deload', {})),
});
export const saveDeloadState = (db: Db, s: DeloadState) => writeState(db, 'deload', s);

/** Wochen am Stück im aktuellen Block und ob eine leichte Woche angeboten wird. */
export async function deloadOffer(db: Db, today: string): Promise<{ due: boolean; weeks: number; state: DeloadState }> {
  const [state, sessions, plans] = await Promise.all([
    loadDeloadState(db),
    db.getAllAsync<{ at: string; tz: string | null }>("SELECT started_at_utc AS at, time_zone AS tz FROM workout_session WHERE status = 'abgeschlossen'"),
    listActivePlans(db),
  ]);
  const weeks = trainingWeeksInBlock(
    sessions.map((s) => zoneDay(s.at, s.tz)),
    today,
    state.lastEnd
  );
  const hasPlan = plans.some((p) => p.days.length > 0);
  return { due: hasPlan && deloadDue(weeks, state.intervalWeeks, state.snoozedUntil, today), weeks, state };
}

/** Leichte Woche bis Sonntag als befristete Planfassung; danach gilt wieder der Plan (TRAIN-008). */
export async function startDeload(db: Db, today: string, sunday: string, note: string): Promise<boolean> {
  const plan = (await listActivePlans(db)).find((p) => p.days.length > 0);
  if (!plan) return false;
  const [draft, current] = await Promise.all([loadPlanDraft(db, plan.planId), activeVersion(db, plan.planId)]);
  if (!draft || !current) return false;
  const returnVersionId = current.validUntil && current.validUntil <= sunday ? current.returnVersionId : current.id;
  const state = await loadDeloadState(db);
  // Planfassung und Deload-Stand zusammen: sonst gäbe es eine leichte Woche, die den 8-Wochen-Zähler nicht zurücksetzt.
  await db.withTransactionAsync(async () => {
    await insertPlanVersion(db, plan.planId, deloadDraft(draft), { validUntil: sunday, returnVersionId, note });
    await saveDeloadState(db, { ...state, lastEnd: sunday, snoozedUntil: null });
  });
  return true;
}

// ------------------------------------------------------------------------------ Geräteprofile

export async function loadEquipmentProfiles(db: Db, studio: Equipment[]): Promise<{ profiles: EquipmentProfile[]; activeId: string }> {
  const profiles = await readState<EquipmentProfile[] | null>(db, 'equipment_profiles', null);
  const activeId = await readState<string>(db, 'equipment_profile_active', 'studio');
  const list = profiles ?? DEFAULT_PROFILES(studio);
  return { profiles: list, activeId: list.some((p) => p.id === activeId) ? activeId : list[0].id };
}

export const saveEquipmentProfiles = (db: Db, profiles: EquipmentProfile[]) => writeState(db, 'equipment_profiles', profiles);
export const saveActiveEquipmentProfile = (db: Db, id: string) => writeState(db, 'equipment_profile_active', id);

export async function activeEquipment(db: Db, studio: Equipment[]): Promise<{ profile: EquipmentProfile; equipment: Equipment[] }> {
  const { profiles, activeId } = await loadEquipmentProfiles(db, studio);
  const profile = profiles.find((p) => p.id === activeId)!;
  return { profile, equipment: usableEquipment(profile) };
}

// ------------------------------------------------------------------------- Wochentage

/** Bevorzugte Trainingstage (1 = Montag … 7 = Sonntag) aus dem Planassistenten; leer = keine Angabe. */
export const loadPreferredWeekdays = (db: Db) => readState<number[]>(db, 'preferred_weekdays', []);
export const savePreferredWeekdays = (db: Db, days: number[]) => writeState(db, 'preferred_weekdays', [...new Set(days)].sort());
