// Bereitschaft, Schlaf und Journal (Ausbauplan A6). Ohne KI: feste, prüfbare Regeln, verglichen mit den eigenen
// Werten der letzten 28 Tage. Ergebnis ist ein Trainingsvorschlag, nie ein Befund. Alle Schwellen sind Vorschläge bis
// zur Fachprüfung (docs/Fachpruefung_Mappe.md, Abschnitt I).
//
// Regeln Fassung 1:
// - Grundlage: Schnitt der letzten 28 Tage vor heute; unter 7 Morgen-Checks → „noch am Lernen“ (keine Ampel).
// - Punkte: Schlaf ≥ 1 h unter dem Schnitt → 1, ≥ 2 h → 2; Schlafqualität 1–2 → 1. Energie ≥ 1 unter dem Schnitt → 1,
//   ≥ 2 → 2. Muskelkater ≥ 1 über dem Schnitt → 1, Wert 4–5 → 2. Trainingslast (7 Tage gegen den Wochenschnitt der
//   letzten 28 Tage) über 1,3 → 1, über 1,5 → 2 – erst ab 14 Tagen mit Last.
// - Summe 0–1 grün, 2–3 gelb, ab 4 rot. Gelb bietet „je Übung 1 Satz weniger“ an, Rot „leicht oder Dehnen“ –
//   beides nur als Angebot für heute, nie automatisch.
// - Trainingslast = Dauer (min) × Anstrengung (1–10) je Einheit (Kraft und Cardio); ohne Anstrengung keine Last.
// - Schlafschuld = Summe der Stunden unter dem eigenen Schlafziel in den letzten 14 Nächten (mehr Schlaf an
//   anderen Tagen wird nicht gegengerechnet). Regelmäßigkeit = Streuung der Aufsteh- und Bettzeit in Minuten.
// - Journal: Unterschiede erst ab je 5 Tagen mit und ohne Faktor und ab 0,5 Punkten bzw. 0,5 h – immer mit dem
//   Hinweis, dass es Zufall sein kann.

import { daysBetween } from './dates';
import { mean } from './math';

export const READINESS_RULES_VERSION = 1;
export const BASELINE_DAYS = 28;
export const MIN_BASELINE_CHECKS = 7;
export const MIN_LOAD_HISTORY_DAYS = 14;
export const SLEEP_GOAL_DEFAULT = 8;
export const SLEEP_GOAL_RANGE = { min: 5, max: 11 } as const;
export const DEBT_NIGHTS = 14;
export const JOURNAL_MIN_DAYS = 5;
export const MAX_SESSION_MINUTES = 240;

export const STATUSES = ['krank', 'verletzt', 'pause'] as const;
export type Status = (typeof STATUSES)[number];

/** Frei ankreuzbare Faktoren des Vortags (Journal). */
export const MANUAL_FACTORS = ['stress', 'bildschirm', 'reise', 'nickerchen', 'spaetTrainiert', 'laerm'] as const;
/** Aus dem Tagebuch des Vortags erkannt. */
export const AUTO_FACTORS = ['alkohol', 'koffeinSpaet', 'spaetGegessen', 'vielGegessen'] as const;
export type Factor = (typeof MANUAL_FACTORS)[number] | (typeof AUTO_FACTORS)[number];

export type DailyCheck = {
  day: string;
  bedTime: string | null;
  wakeTime: string | null;
  sleepHours: number | null;
  sleepQuality: number | null;
  energy: number | null;
  /** 1 = kein Muskelkater … 5 = stark. */
  soreness: number | null;
  /** Faktoren des Vortags (eigene Auswahl). */
  factors: Factor[];
  note: string | null;
};

export type Level = 'gruen' | 'gelb' | 'rot';
export type ReasonKey = 'schlaf' | 'schlafQualitaet' | 'energie' | 'muskelkater' | 'last';
export type Reason = { key: ReasonKey; points: number; value: number; baseline: number | null };

export type Readiness =
  | { kind: 'offen' }
  | { kind: 'status'; status: Status }
  | { kind: 'lernen'; checks: number; needed: number; reasons: Reason[] }
  | { kind: 'ampel'; level: Level; points: number; reasons: Reason[]; baselineChecks: number };

export type LoadDay = { day: string; load: number };
export type LoadRatio = { acute: number; chronicWeekly: number; ratio: number | null; historyDays: number };

/** Last einer Einheit: Dauer × Anstrengung (sRPE). Ohne Anstrengung oder Dauer keine Last. */
export function sessionLoad(minutes: number | null, effort: number | null): number | null {
  if (minutes === null || effort === null || !(minutes > 0) || effort < 1 || effort > 10) return null;
  return Math.round(Math.min(minutes, MAX_SESSION_MINUTES) * effort);
}

/** Akute Last (7 Tage bis heute) gegen den Wochenschnitt der letzten 28 Tage. */
export function loadRatio(loads: LoadDay[], today: string): LoadRatio {
  const inWindow = (from: number) => loads.filter((l) => daysBetween(l.day, today) >= 0 && daysBetween(l.day, today) < from);
  const acute = inWindow(7).reduce((s, l) => s + l.load, 0);
  const chronicWeekly = inWindow(BASELINE_DAYS).reduce((s, l) => s + l.load, 0) / 4;
  const first = loads
    .filter((l) => l.load > 0)
    .map((l) => l.day)
    .sort()[0];
  const historyDays = first ? daysBetween(first, today) + 1 : 0;
  const ratio = historyDays >= MIN_LOAD_HISTORY_DAYS && chronicWeekly > 0 ? Math.round((acute / chronicWeekly) * 100) / 100 : null;
  return { acute, chronicWeekly: Math.round(chronicWeekly), ratio, historyDays };
}

function reasonsFor(check: DailyCheck, history: DailyCheck[], ratio: number | null): Reason[] {
  const base = (pick: (c: DailyCheck) => number | null) => mean(history.map(pick).filter((v): v is number => v !== null));
  const reasons: Reason[] = [];
  const sleepBase = base((c) => c.sleepHours);
  if (check.sleepHours !== null && sleepBase !== null) {
    const drop = sleepBase - check.sleepHours;
    const points = drop >= 2 ? 2 : drop >= 1 ? 1 : 0;
    if (points) reasons.push({ key: 'schlaf', points, value: check.sleepHours, baseline: sleepBase });
  }
  if (check.sleepQuality !== null && check.sleepQuality <= 2) {
    reasons.push({ key: 'schlafQualitaet', points: 1, value: check.sleepQuality, baseline: base((c) => c.sleepQuality) });
  }
  const energyBase = base((c) => c.energy);
  if (check.energy !== null && energyBase !== null) {
    const drop = energyBase - check.energy;
    const points = drop >= 2 ? 2 : drop >= 1 ? 1 : 0;
    if (points) reasons.push({ key: 'energie', points, value: check.energy, baseline: energyBase });
  }
  if (check.soreness !== null) {
    const soreBase = base((c) => c.soreness);
    const rise = soreBase === null ? 0 : check.soreness - soreBase;
    const points = check.soreness >= 4 ? 2 : rise >= 1 ? 1 : 0;
    if (points) reasons.push({ key: 'muskelkater', points, value: check.soreness, baseline: soreBase });
  }
  if (ratio !== null) {
    const points = ratio > 1.5 ? 2 : ratio > 1.3 ? 1 : 0;
    if (points) reasons.push({ key: 'last', points, value: ratio, baseline: 1 });
  }
  return reasons.sort((a, b) => b.points - a.points);
}

/**
 * Ampel für heute. `history` = Morgen-Checks der 28 Tage vor heute (heute ausgenommen).
 * Ein aktiver Status (krank, verletzt, Pause) ersetzt die Ampel.
 */
export function readiness(check: DailyCheck | null, history: DailyCheck[], ratio: number | null, status: Status | null): Readiness {
  if (status) return { kind: 'status', status };
  if (!check || (check.energy === null && check.sleepHours === null && check.soreness === null)) return { kind: 'offen' };
  const window = history.filter((c) => c.day < check.day && daysBetween(c.day, check.day) <= BASELINE_DAYS);
  const counted = window.filter((c) => c.energy !== null || c.sleepHours !== null).length;
  const reasons = reasonsFor(check, window, ratio);
  if (counted < MIN_BASELINE_CHECKS) return { kind: 'lernen', checks: counted, needed: MIN_BASELINE_CHECKS, reasons };
  const points = reasons.reduce((s, r) => s + r.points, 0);
  const level: Level = points >= 4 ? 'rot' : points >= 2 ? 'gelb' : 'gruen';
  return { kind: 'ampel', level, points, reasons, baselineChecks: counted };
}

// ------------------------------------------------------------------------------------- Schlaf

/** „23:30“ → Minuten; Bettzeiten vor 12 Uhr zählen als nach Mitternacht (für Schnitt und Streuung). */
function clockMinutes(text: string | null, bedTime = false): number | null {
  const m = text ? /^(\d{1,2}):(\d{2})$/.exec(text.trim()) : null;
  if (!m || +m[1] > 23 || +m[2] > 59) return null;
  const min = +m[1] * 60 + +m[2];
  return bedTime && min < 12 * 60 ? min + 24 * 60 : min;
}

/** Schlafdauer aus Bett- und Aufstehzeit (über Mitternacht), auf 0,25 h gerundet. */
export function hoursBetween(bedTime: string, wakeTime: string): number | null {
  const bed = clockMinutes(bedTime);
  const wake = clockMinutes(wakeTime);
  if (bed === null || wake === null) return null;
  const minutes = (wake - bed + 24 * 60) % (24 * 60);
  if (minutes === 0 || minutes > 16 * 60) return null;
  return Math.round((minutes / 60) * 4) / 4;
}

function spread(values: number[]): number | null {
  if (values.length < JOURNAL_MIN_DAYS) return null;
  const m = mean(values)!;
  return Math.round(Math.sqrt(values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length));
}

export type SleepStats = {
  nights: number;
  avgHours: number | null;
  debtHours: number;
  /** Streuung in Minuten; null = zu wenige Zeiten erfasst. */
  wakeSpread: number | null;
  bedSpread: number | null;
};

export function sleepStats(checks: DailyCheck[], today: string, goalHours: number): SleepStats {
  const recent = checks.filter((c) => daysBetween(c.day, today) >= 0 && daysBetween(c.day, today) < DEBT_NIGHTS);
  const hours = recent.map((c) => c.sleepHours).filter((h): h is number => h !== null);
  const debt = hours.reduce((s, h) => s + Math.max(0, goalHours - h), 0);
  return {
    nights: hours.length,
    avgHours: mean(hours),
    debtHours: Math.round(debt * 10) / 10,
    wakeSpread: spread(recent.map((c) => clockMinutes(c.wakeTime)).filter((v): v is number => v !== null)),
    bedSpread: spread(recent.map((c) => clockMinutes(c.bedTime, true)).filter((v): v is number => v !== null)),
  };
}

/** Bettzeit für das Schlafziel: Aufstehzeit minus Ziel (Minuten seit Mitternacht). */
export function bedtimeFor(wakeTime: string, goalHours: number): number | null {
  const wake = clockMinutes(wakeTime);
  if (wake === null || !(goalHours > 0)) return null;
  return (((wake - Math.round(goalHours * 60)) % 1440) + 1440) % 1440;
}

// ------------------------------------------------------------------------------------ Journal

export type DiaryEvening = {
  alcohol: boolean;
  lateCaffeineMg: number;
  /** Uhrzeit der letzten Mahlzeit (Minuten seit Mitternacht, Ortszeit); null = keine. */
  lastMealMinutes: number | null;
  kcal: number | null;
  goalKcal: number | null;
};

export const LATE_CAFFEINE_MG = 50;
export const LATE_MEAL_MINUTES = 21 * 60;
export const MUCH_OVER_GOAL_KCAL = 500;

/** Faktoren, die sich aus dem Tagebuch des Vortags ergeben. */
export function autoFactors(e: DiaryEvening): Factor[] {
  const out: Factor[] = [];
  if (e.alcohol) out.push('alkohol');
  if (e.lateCaffeineMg >= LATE_CAFFEINE_MG) out.push('koffeinSpaet');
  if (e.lastMealMinutes !== null && e.lastMealMinutes >= LATE_MEAL_MINUTES) out.push('spaetGegessen');
  if (e.kcal !== null && e.goalKcal !== null && e.kcal > e.goalKcal + MUCH_OVER_GOAL_KCAL) out.push('vielGegessen');
  return out;
}

export type JournalMetric = 'energy' | 'sleepHours' | 'sleepQuality';
export type JournalFinding = {
  factor: Factor;
  metric: JournalMetric;
  withAvg: number;
  withoutAvg: number;
  withDays: number;
  withoutDays: number;
  diff: number;
};

const METRIC_MIN_DIFF: Record<JournalMetric, number> = { energy: 0.5, sleepQuality: 0.5, sleepHours: 0.5 };

/**
 * „An Tagen mit … war deine Energie am nächsten Morgen im Schnitt …“. `days` = Morgen-Checks mit allen Faktoren des
 * Vortags (eigene und aus dem Tagebuch). Nur Unterschiede mit genug Tagen auf beiden Seiten, größte zuerst.
 */
export function journalFindings(days: (DailyCheck & { allFactors: Factor[] })[]): JournalFinding[] {
  const factors = new Set(days.flatMap((d) => d.allFactors));
  const out: JournalFinding[] = [];
  for (const factor of factors) {
    for (const metric of ['energy', 'sleepHours', 'sleepQuality'] as const) {
      const withF = days.filter((d) => d.allFactors.includes(factor) && d[metric] !== null).map((d) => d[metric] as number);
      const without = days.filter((d) => !d.allFactors.includes(factor) && d[metric] !== null).map((d) => d[metric] as number);
      if (withF.length < JOURNAL_MIN_DAYS || without.length < JOURNAL_MIN_DAYS) continue;
      const withAvg = mean(withF)!;
      const withoutAvg = mean(without)!;
      const diff = Math.round((withAvg - withoutAvg) * 10) / 10;
      if (Math.abs(diff) < METRIC_MIN_DIFF[metric]) continue;
      out.push({ factor, metric, withAvg, withoutAvg, withDays: withF.length, withoutDays: without.length, diff });
    }
  }
  return out.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
}

// ------------------------------------------------------------------------------------ Angebote

export type Offer = 'wenigerSaetze' | 'leicht' | 'dehnen';

export function offersFor(r: Readiness): Offer[] {
  if (r.kind !== 'ampel') return [];
  if (r.level === 'gelb') return ['wenigerSaetze'];
  if (r.level === 'rot') return ['leicht', 'dehnen'];
  return [];
}

/** Sätze für eine leichtere Fassung: „weniger“ = 1 Satz weniger, „leicht“ = halbe Sätze (je mindestens 1). */
export function lighterSets(sets: number, offer: 'wenigerSaetze' | 'leicht'): number {
  return Math.max(1, offer === 'leicht' ? Math.ceil(sets / 2) : sets - 1);
}

/** Ist an diesem Tag ein Status aktiv? to_day = null heißt „bis auf Weiteres“. */
export function statusOn(periods: { status: Status; fromDay: string; toDay: string | null }[], day: string): Status | null {
  const hit = periods.filter((p) => p.fromDay <= day && (p.toDay === null || p.toDay >= day)).sort((a, b) => b.fromDay.localeCompare(a.fromDay))[0];
  return hit?.status ?? null;
}
