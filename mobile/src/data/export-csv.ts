// Export als CSV (Ausbauplan A5): je Bereich eine Datei zum Anschauen und Weiterverwenden (Excel, Numbers).
// Die Komplettsicherung (JSON, data/backup.ts) bleibt der Weg für Umzug und Wiederherstellung.

import { toCsv, type Cell } from '@/domain/csv';
import { localDay, timeZone } from '@/domain/time';
import { exerciseName } from '@/format/exercise-name';
import { t } from '@/i18n';

import type { CardioEntry } from './cardio';
import type { Db } from './db';
import { listActiveGoals } from './goals';
import { listExercises } from './training';

export const EXPORT_AREAS = ['training', 'cardio', 'ablaeufe', 'ernaehrung', 'befinden', 'fasten', 'gewicht', 'masse', 'schlaf', 'blutdruck', 'ziele'] as const;
export type ExportArea = (typeof EXPORT_AREAS)[number];

/** wie components/cardio-row (ohne UI-Abhängigkeiten, damit testbar) */
const cardioName = (e: Pick<CardioEntry, 'activity' | 'customName'>) =>
  e.activity === 'sonstiges' && e.customName ? e.customName : t(`cardio.activities.${e.activity}`);

const time = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '');
const day = (iso: string | null) => (iso ? localDay(new Date(iso), timeZone) : '');

async function trainingCsv(db: Db) {
  const names = new Map((await listExercises(db)).map((e) => [e.id, exerciseName(e)]));
  const rows = await db.getAllAsync<{
    startedAt: string;
    status: string;
    planName: string | null;
    dayName: string | null;
    sessionNote: string | null;
    exerciseId: string;
    position: number;
    setType: string;
    weightKg: number | null;
    reps: number | null;
    seconds: number | null;
    rir: number | null;
    note: string | null;
    completedAt: string | null;
  }>(
    `SELECT s.started_at_utc AS startedAt, s.status, v.name AS planName, d.name AS dayName, s.note AS sessionNote,
       l.exercise_id AS exerciseId, l.position, l.set_type AS setType, l.weight_kg AS weightKg, l.reps, l.seconds, l.rir,
       l.note, l.completed_at_utc AS completedAt
     FROM set_log l JOIN workout_session s ON s.id = l.session_id
     LEFT JOIN plan_day d ON d.id = s.plan_day_id LEFT JOIN plan_version v ON v.id = d.plan_version_id
     WHERE l.completed_at_utc IS NOT NULL ORDER BY s.started_at_utc, l.position`
  );
  return toCsv(
    ['Datum', 'Uhrzeit', 'Plan', 'Tag', 'Übung', 'Satzart', 'Gewicht (kg)', 'Wiederholungen', 'Sekunden', 'RIR', 'Satz-Notiz', 'Trainings-Notiz', 'Status'],
    rows.map((r): Cell[] => [
      day(r.startedAt),
      time(r.startedAt),
      r.planName,
      r.dayName,
      names.get(r.exerciseId) ?? r.exerciseId,
      t(`logger.types.${r.setType}`),
      r.weightKg,
      r.reps,
      r.seconds,
      r.rir,
      r.note,
      r.sessionNote,
      t(`history.status.${r.status}`),
    ])
  );
}

async function cardioCsv(db: Db) {
  const rows = await db.getAllAsync<CardioEntry>(
    `SELECT id, session_id AS sessionId, activity, custom_name AS customName, day, planned_minutes AS plannedMinutes, at_end AS atEnd,
       minutes, distance_km AS distanceKm, avg_hr AS avgHr, effort, level, note, timer_started_at_utc AS timerStartedAt,
       completed_at_utc AS completedAt
     FROM cardio_log WHERE completed_at_utc IS NOT NULL ORDER BY day, completed_at_utc`
  );
  return toCsv(
    ['Datum', 'Aktivität', 'Minuten', 'Strecke (km)', 'Ø Puls', 'Anstrengung (1–10)', 'Stufe/Steigung', 'Notiz', 'Im Training'],
    rows.map((r): Cell[] => [
      r.day,
      cardioName(r),
      r.minutes,
      r.distanceKm,
      r.avgHr,
      r.effort,
      r.level,
      r.note,
      r.sessionId ? t('onboarding.yes') : t('onboarding.no'),
    ])
  );
}

async function nutritionCsv(db: Db) {
  const rows = await db.getAllAsync<Record<string, string | number | null>>(
    `SELECT diary_date AS day, occurred_at_utc AS at, kind, meal, drink_type AS drinkType, name, brand, amount, unit, kcal, protein, carbs,
       fat, fiber, sugar, sat_fat AS satFat, salt, caffeine_mg AS caffeine
     FROM consumption_event ORDER BY diary_date, occurred_at_utc`
  );
  return toCsv(
    [
      'Datum',
      'Uhrzeit',
      'Mahlzeit/Getränk',
      'Name',
      'Marke',
      'Menge',
      'Einheit',
      'kcal',
      'Eiweiß (g)',
      'Kohlenhydrate (g)',
      'Fett (g)',
      'Ballaststoffe (g)',
      'Zucker (g)',
      'Ges. Fettsäuren (g)',
      'Salz (g)',
      'Koffein (mg)',
    ],
    rows.map((r): Cell[] => [
      r.day,
      time(r.at as string),
      r.kind === 'essen' ? t(`nutrition.meals.${r.meal ?? 'snack'}`) : t(`nutrition.drinkTypes.${r.drinkType ?? 'sonstiges'}`),
      r.name,
      r.brand,
      r.amount,
      r.unit === 'portion' ? t('nutrition.recipe.log.portionsLabel') : r.unit,
      r.kcal,
      r.protein,
      r.carbs,
      r.fat,
      r.fiber,
      r.sugar,
      r.satFat,
      r.salt,
      r.caffeine,
    ])
  );
}

/** Hunger, Sättigung und Stimmung je Mahlzeit (B1, W10): Stufen 1–5, leer = keine Angabe. */
async function feelingCsv(db: Db) {
  const rows = await db.getAllAsync<{ day: string; meal: string; hunger: number | null; fullness: number | null; mood: number | null }>(
    `SELECT day, meal, hunger, fullness, mood FROM meal_feeling
     ORDER BY day, CASE meal WHEN 'fruehstueck' THEN 0 WHEN 'mittag' THEN 1 WHEN 'abend' THEN 2 ELSE 3 END`
  );
  return toCsv(
    ['Datum', 'Mahlzeit', 'Hunger (1–5)', 'Sättigung (1–5)', 'Stimmung (1–5)'],
    rows.map((r): Cell[] => [r.day, t(`nutrition.meals.${r.meal}`), r.hunger, r.fullness, r.mood])
  );
}

/** Fasten-Fenster (B1, W8): Beginn, Ende, geplante und tatsächliche Dauer. */
async function fastingCsv(db: Db) {
  const rows = await db.getAllAsync<{ start: string; end: string | null; planned: number }>(
    'SELECT started_at_utc AS start, ended_at_utc AS end, planned_hours AS planned FROM fasting_period ORDER BY started_at_utc'
  );
  return toCsv(
    ['Beginn (Datum)', 'Beginn (Uhrzeit)', 'Ende (Datum)', 'Ende (Uhrzeit)', 'Geplant (h)', 'Dauer (h)'],
    rows.map((r): Cell[] => [
      day(r.start),
      time(r.start),
      day(r.end),
      time(r.end),
      r.planned,
      r.end ? Math.round((Date.parse(r.end) - Date.parse(r.start)) / 360_000) / 10 : null,
    ])
  );
}

async function weightCsv(db: Db) {
  const rows = await db.getAllAsync<{ day: string; kg: number; at: string }>(
    'SELECT day, kg, recorded_at_utc AS at FROM weight_entry ORDER BY day, recorded_at_utc'
  );
  return toCsv(
    ['Datum', 'Gewicht (kg)', 'Erfasst um'],
    rows.map((r) => [r.day, r.kg, time(r.at)])
  );
}

async function measurementCsv(db: Db) {
  const rows = await db.getAllAsync<{ day: string; site: string; cm: number }>('SELECT day, site, cm FROM body_measurement ORDER BY day, site');
  return toCsv(
    ['Datum', 'Stelle', 'cm'],
    rows.map((r) => [r.day, t(`measure.sites.${r.site}`), r.cm])
  );
}

async function sleepCsv(db: Db) {
  const rows = await db.getAllAsync<{
    day: string;
    bed: string | null;
    wake: string | null;
    hours: number | null;
    quality: number | null;
    energy: number | null;
    soreness: number | null;
    factors: string | null;
    note: string | null;
  }>(
    `SELECT day, bed_time AS bed, wake_time AS wake, sleep_hours AS hours, sleep_quality AS quality, energy, soreness, factors, note
     FROM daily_check ORDER BY day`
  );
  const factorText = (json: string | null) => {
    try {
      return (JSON.parse(json ?? '[]') as string[]).map((f) => t(`readiness.factors.${f}`)).join(', ');
    } catch {
      return '';
    }
  };
  return toCsv(
    ['Datum', 'Ins Bett', 'Aufgestanden', 'Schlaf (h)', 'Schlafqualität (1–5)', 'Energie (1–5)', 'Muskelkater (1–5)', 'Faktoren am Vortag', 'Notiz'],
    rows.map((r): Cell[] => [r.day, r.bed, r.wake, r.hours, r.quality, r.energy, r.soreness, factorText(r.factors), r.note])
  );
}

async function bloodPressureCsv(db: Db) {
  const rows = await db.getAllAsync<{ day: string; at: string; sys: number; dia: number; pulse: number | null; note: string | null }>(
    'SELECT day, measured_at_utc AS at, systolic AS sys, diastolic AS dia, pulse, note FROM blood_pressure ORDER BY measured_at_utc'
  );
  return toCsv(
    ['Datum', 'Uhrzeit', 'Oberer Wert (mmHg)', 'Unterer Wert (mmHg)', 'Puls', 'Notiz'],
    rows.map((r): Cell[] => [r.day, time(r.at), r.sys, r.dia, r.pulse, r.note])
  );
}

/** Dehnen, HIIT, Aufwärmen, Cool-down (Fahrplan 5): ein Ablauf je Zeile, mit Ausgang und Dauer. */
async function timedCsv(db: Db) {
  const rows = await db.getAllAsync<{
    at: string;
    kind: string;
    name: string;
    status: string;
    reason: string | null;
    planned: number;
    done: number | null;
    rounds: number | null;
  }>(
    `SELECT started_at_utc AS at, kind, name, status, abort_reason AS reason, planned_seconds AS planned, done_seconds AS done,
     rounds_done AS rounds FROM timed_session WHERE status <> 'aktiv' ORDER BY started_at_utc`
  );
  return toCsv(
    ['Datum', 'Uhrzeit', 'Art', 'Name', 'Status', 'Abbruchgrund', 'Geplant (min)', 'Gemacht (min)', 'Runden'],
    rows.map((r): Cell[] => [
      localDay(new Date(r.at), timeZone),
      time(r.at),
      t(`history.kind.${r.kind}`),
      r.name,
      t(`history.status.${r.status}`),
      r.reason,
      Math.round(r.planned / 6) / 10,
      r.done === null ? null : Math.round(r.done / 6) / 10,
      r.rounds,
    ])
  );
}

async function goalsCsv(db: Db) {
  const names = new Map((await listExercises(db)).map((e) => [e.id, exerciseName(e)]));
  const goals = await listActiveGoals(db);
  return toCsv(
    ['Art', 'Gültig ab', 'Zielgewicht (kg)', 'Übung', 'Ziel-Wdh.', 'Gewohnheit', 'pro Woche', 'Ziel (cm)'],
    goals.map((g): Cell[] => [
      t(`goals.kindOption.${g.kind}`),
      g.validFrom,
      g.targetKg,
      g.exerciseId ? (names.get(g.exerciseId) ?? g.exerciseId) : null,
      g.targetReps,
      g.habit ? t(`goals.habit.${g.habit}`) : null,
      g.perWeek,
      g.targetCm,
    ])
  );
}

const BUILDERS: Record<ExportArea, (db: Db) => Promise<string>> = {
  training: trainingCsv,
  cardio: cardioCsv,
  ablaeufe: timedCsv,
  ernaehrung: nutritionCsv,
  befinden: feelingCsv,
  fasten: fastingCsv,
  gewicht: weightCsv,
  masse: measurementCsv,
  schlaf: sleepCsv,
  blutdruck: bloodPressureCsv,
  ziele: goalsCsv,
};

export function buildCsv(db: Db, area: ExportArea) {
  return BUILDERS[area](db);
}
