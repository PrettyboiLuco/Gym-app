// Einstellungen für Wochenbudget, angeheftete Nährstoffe und Ernährungsform (Ausbauplan B2) im gespeicherten
// App-Zustand (Schlüssel „targets_settings“, kommt mit app_state in die Sicherung) und die Ziele eines Tages daraus.

import { MICRO_KEYS, type MicroKey } from '@/domain/basis-foods';
import { planWeek, sanitizeBudget, type BudgetSettings, type WeekBudget } from '@/domain/budget';
import type { Macros } from '@/domain/coach';
import { weekDays, weekStart } from '@/domain/dates';
import { dietMacros, effectiveDietProfile, sanitizeDietProfile, showsNetCarbs, carbLimit, type DietProfile } from '@/domain/diet-profile';
import { microRefs, sanitizePins, type MicroRef } from '@/domain/micro-targets';
import { weightTrend } from '@/domain/weight';

import { readState, writeState } from './app-state';
import { loadCoachSetup } from './coach';
import type { Db } from './db';
import { calorieFloorOn, calorieGoalOn } from './goals';
import { daySums, diaryDayAt, loadNutritionSettings } from './nutrition';
import { loadProfile } from './profile';
import { listWeights } from './weights';

export type TargetsSettings = {
  budget: BudgetSettings;
  /** Angeheftete Vitamine/Mineralstoffe (höchstens 3) für die Tagesübersicht. */
  pinnedMicros: MicroKey[];
  dietProfile: DietProfile;
};

const KEY = 'targets_settings';

export async function loadTargetsSettings(db: Db): Promise<TargetsSettings> {
  const raw = await readState<Partial<TargetsSettings> | null>(db, KEY, null);
  return {
    budget: sanitizeBudget(raw?.budget),
    pinnedMicros: sanitizePins(raw?.pinnedMicros, MICRO_KEYS),
    dietProfile: sanitizeDietProfile(raw?.dietProfile),
  };
}

export const saveTargetsSettings = (db: Db, settings: TargetsSettings) => writeState(db, KEY, settings);

/** Ziele eines Tages für Tagesübersicht, „Was fehlt mir heute?“ und die Nährstoff-Bildschirme. */
export type DayTargets = {
  /** Kalorienziel des Tages (mit Wochenbudget und Übertrag, falls eingeschaltet); null = keins. */
  kcal: number | null;
  /** Ziel laut Kalorienziel ohne Wochenbudget. */
  goalKcal: number | null;
  /** Makros des Tages nach Ernährungsform; null = keine (kein Coach-Ziel). */
  macros: Macros | null;
  budget: WeekBudget | null;
  /** Ernährungsform, die gerade gilt (bei sensibler Situation nie Low-Carb/Keto). */
  dietProfile: DietProfile;
  /** Netto-Kohlenhydrate zeigen, mit Obergrenze in g. */
  netCarbs: { limit: number | null } | null;
  pinned: MicroKey[];
  refs: Record<MicroKey, MicroRef>;
  /** Sensible Situation oder „ohne Zahlen“: keine Zahlen zeigen. */
  hidden: boolean;
  sensitive: boolean;
  settings: TargetsSettings;
};

async function weightOn(db: Db, day: string): Promise<number | null> {
  const weights = await listWeights(db);
  return weightTrend(weights, day) ?? weights.find((w) => w.day <= day)?.kg ?? null;
}

/** Wochenbudget der Woche, in der `day` liegt (ohne Prüfung auf „Zahlen ausblenden“). */
/**
 * Wochenbudget für `day`. Einträge an Tagen nach `today` sind geplant (Kopieren in die Zukunft, B1) und zählen weder als
 * gegessen noch für den Übertrag.
 */
export async function weekBudgetFor(db: Db, day: string, settings: BudgetSettings, today = diaryDayAt()): Promise<WeekBudget | null> {
  const days = weekDays(weekStart(day));
  const [goals, sums, floor, setup] = await Promise.all([
    Promise.all(days.map((d) => calorieGoalOn(db, d))),
    daySums(db, days[0], days[6]),
    calorieFloorOn(db, day),
    loadCoachSetup(db),
  ]);
  const byDay = new Map(sums.map((s) => [s.day, s]));
  const current = goals[days.indexOf(day)];
  return planWeek({
    goals: goals.map((g) => g?.kcal ?? null),
    days: days.map((d) => {
      const s = byDay.get(d);
      if (d > today || !s || s.entries === 0) return { kcal: null, complete: false, unknown: 0 };
      return { kcal: s.kcal ?? 0, complete: s.unknownKcal === 0 && !s.flagged, unknown: s.unknownKcal };
    }),
    index: days.indexOf(day),
    trainingWeekdays: current?.plan?.trainingWeekdays ?? setup?.trainingWeekdays ?? [],
    settings,
    floor,
  });
}

export async function loadDayTargets(db: Db, day: string): Promise<DayTargets> {
  const [settings, nutrition, profile, goal] = await Promise.all([loadTargetsSettings(db), loadNutritionSettings(db), loadProfile(db), calorieGoalOn(db, day)]);
  const hidden = profile.sensitive || nutrition.hideNumbers;
  const dietProfile = effectiveDietProfile(settings.dietProfile, profile.sensitive);
  const budget = settings.budget.enabled && !hidden && goal?.kcal != null ? await weekBudgetFor(db, day, settings.budget) : null;
  const kcal = budget ? budget.dayTarget : (goal?.kcal ?? null);
  let macros = goal?.macros ?? null;
  if (macros && kcal !== null && goal?.kcal != null) {
    macros = dietMacros(dietProfile, kcal, macros, goal.kcal, dietProfile === 'eiweissreich' ? await weightOn(db, day) : null);
  }
  return {
    kcal,
    goalKcal: goal?.kcal ?? null,
    macros,
    budget,
    dietProfile,
    netCarbs: showsNetCarbs(dietProfile) ? { limit: kcal !== null ? carbLimit(dietProfile, kcal) : null } : null,
    pinned: settings.pinnedMicros,
    refs: microRefs(profile.formulaTerm),
    hidden,
    sensitive: profile.sensitive,
    settings,
  };
}

/** Makros des Tages für eine (noch nicht gespeicherte) Ernährungsform; null ohne Coach-Makros oder Kalorienziel. */
export async function dietPreview(db: Db, day: string, profile: DietProfile): Promise<Macros | null> {
  const [targets, goal] = await Promise.all([loadDayTargets(db, day), calorieGoalOn(db, day)]);
  if (targets.kcal === null || goal?.kcal == null || !goal.macros) return null;
  const effective = effectiveDietProfile(profile, targets.sensitive);
  return dietMacros(effective, targets.kcal, goal.macros, goal.kcal, effective === 'eiweissreich' ? await weightOn(db, day) : null);
}
