// Coach-Rechenkern (Fahrplan „Coach“ C2–C5, C8, C9). Ohne KI: feste, prüfbare Regeln. Alle Zahlen sind
// Vorschläge bis zur Fachprüfung (10.1) und stehen gesammelt hier.
//
// Fassung 1:
// - Bedarf = Ruheenergie (Mifflin-St Jeor) × Aktivität. Aktivität aus Schritten (ersetzt „Bewegung im Alltag“,
//   keine Doppelzählung, HEALTH-007) nach Tudor-Locke-Stufen + 0,065 je Gym-Tag pro Woche. Schlaf zählt nicht
//   (COACH-006).
// - Tempo: Cut −500 (oder −250), Bulk +250 (oder +500), Erhalt 0; nie unter max(1200, Ruheenergie).
// - Makros: Eiweiß 1,6 g/kg (Cut 2,0; ohne regelmäßiges Training 0,8 bzw. Cut 1,2), Fett 30 % (mind. 20 %),
//   Kohlenhydrate der Rest, Ballaststoffe mindestens 30 g (DGE).
// - Trainingstage +200 kcal, Ruhetage so viel weniger, dass der Wochenschnitt gleich bleibt (höchstens −300).

import {
  bmi,
  CALORIE_FLOOR,
  DELTA_OPTIONS,
  POPULATION_AGE,
  restingEnergy,
  UNDERWEIGHT_BMI,
  type FormulaTerm,
  type Goal,
} from './energy';

export const COACH_RULES_VERSION = 1;

/** Schritte pro Tag → Aktivitätsfaktor (Stufen nach Tudor-Locke; Zuordnung zum PAL vorläufig). */
export const STEP_LEVELS = [
  { minSteps: 0, pal: 1.4 },
  { minSteps: 5000, pal: 1.5 },
  { minSteps: 7500, pal: 1.6 },
  { minSteps: 10000, pal: 1.7 },
  { minSteps: 12500, pal: 1.8 },
] as const;
export const PAL_PER_GYM_DAY = 0.065;
export const STEPS_RANGE = { min: 0, max: 50000 };

/** Vorschlag des Coaches je Ziel; die anderen Stufen aus DELTA_OPTIONS sind wählbar. */
export const DEFAULT_DELTA: Record<Goal, number> = { abnehmen: -500, halten: 0, zunehmen: 250 };

export const PROTEIN_G_PER_KG = { training: 1.6, cutTraining: 2.0, general: 0.8, cutGeneral: 1.2 } as const;
/** Ab so vielen Gym-Tagen pro Woche gelten die Eiweißwerte für Training. */
export const TRAINING_DAYS_FOR_SPORT = 2;
export const FAT_SHARE = 0.3;
export const FAT_SHARE_MIN = 0.2;
export const FAT_SHARE_MAX = 0.4;

/**
 * Makro-Ausrichtung (Wunsch Luc 30.10.2026): „Standard“ wie oben; „Lean“ im Bodybuilding-Sinn mit weniger Fett
 * (20 %) und mehr Eiweiß (2,0 g/kg, Cut 2,2 g/kg), damit mehr Platz für Kohlenhydrate bleibt; „Eigene“ Werte frei
 * im Rahmen Eiweiß 0,8–2,5 g/kg und Fett 20–40 %. Fett nie unter 20 % (Hormone, fettlösliche Vitamine).
 */
export const MACRO_PROFILES = ['standard', 'lean', 'eigen'] as const;
export type MacroProfile = (typeof MACRO_PROFILES)[number];
export const LEAN = { proteinPerKg: 2.0, cutProteinPerKg: 2.2, fatShare: FAT_SHARE_MIN } as const;
export const PROTEIN_PER_KG_RANGE = { min: 0.8, max: 2.5 } as const;
export type MacroChoice = { profile: MacroProfile; proteinPerKg: number; fatShare: number };
export const FIBER_MIN_G = 30;

export const TRAINING_DAY_BONUS = 200;
export const REST_DAY_MAX_MINUS = 300;

export function palFromSteps(steps: number): number {
  return [...STEP_LEVELS].reverse().find((l) => steps >= l.minSteps)!.pal;
}

export function gymPal(gymDays: number): number {
  return Math.round(Math.min(7, Math.max(0, gymDays)) * PAL_PER_GYM_DAY * 1000) / 1000;
}

export type CoachInput = {
  weightKg: number | null;
  heightCm: number | null;
  age: number | null;
  term: FormulaTerm | null;
  /** Durchschnittliche Schritte pro Tag (eigene Angabe oder Schnitt der letzten Tage). */
  steps: number | null;
  gymDays: number;
  goal: Goal;
  delta: number;
  sensitive: boolean;
};

export type CoachMissing = 'weight' | 'height' | 'age' | 'term' | 'steps';

export type CoachEnergy =
  | { status: 'fehlt'; missing: CoachMissing[] }
  | { status: 'sensibel' }
  | { status: 'alter' }
  | { status: 'untergewicht' }
  | {
      status: 'ok';
      resting: number;
      stepPal: number;
      gymPal: number;
      pal: number;
      /** Erhaltungskalorien („Durchschnitt des Körpers“). */
      maintenance: number;
      /** Tagesziel im Schnitt (mit Bulk/Cut). */
      kcal: number;
      floor: number;
      /** Ziel wurde auf die Untergrenze angehoben. */
      floorApplied: boolean;
      lowBmi: boolean;
    };

const round10 = (v: number) => Math.round(v / 10) * 10;

/** Bedarf und Tagesziel. Keine Zahl ohne vollständige Angaben, außerhalb 19–78 Jahre oder bei sensibler Situation. */
export function coachEnergy(input: CoachInput): CoachEnergy {
  if (input.sensitive) return { status: 'sensibel' };
  const missing: CoachMissing[] = [];
  if (input.weightKg === null) missing.push('weight');
  if (input.heightCm === null) missing.push('height');
  if (input.age === null) missing.push('age');
  if (input.term === null) missing.push('term');
  if (input.steps === null) missing.push('steps');
  if (missing.length > 0) return { status: 'fehlt', missing };
  const kg = input.weightKg!;
  const cm = input.heightCm!;
  if (input.age! < POPULATION_AGE.min || input.age! > POPULATION_AGE.max) return { status: 'alter' };
  const lowBmi = bmi(kg, cm) < UNDERWEIGHT_BMI;
  if (lowBmi && input.goal === 'abnehmen') return { status: 'untergewicht' };
  if (!DELTA_OPTIONS[input.goal].includes(input.delta)) throw new Error('delta not allowed');
  const resting = restingEnergy(kg, cm, input.age!, input.term!);
  const stepPal = palFromSteps(input.steps!);
  const gym = gymPal(input.gymDays);
  const pal = Math.round((stepPal + gym) * 1000) / 1000;
  const maintenance = round10(resting * pal);
  const floor = Math.ceil(Math.max(CALORIE_FLOOR, resting) / 10) * 10;
  const wanted = round10(maintenance + input.delta);
  return {
    status: 'ok',
    resting,
    stepPal,
    gymPal: gym,
    pal,
    maintenance,
    kcal: Math.max(wanted, floor),
    floor,
    floorApplied: wanted < floor,
    lowBmi,
  };
}

export type Macros = { protein: number; fat: number; carbs: number; fiber: number };

/** Eiweiß in g pro Tag aus Gewicht, Ziel und Training. */
export function proteinTarget(kg: number, goal: Goal, gymDays: number): number {
  const training = gymDays >= TRAINING_DAYS_FOR_SPORT;
  const perKg = goal === 'abnehmen' ? (training ? PROTEIN_G_PER_KG.cutTraining : PROTEIN_G_PER_KG.cutGeneral) : training ? PROTEIN_G_PER_KG.training : PROTEIN_G_PER_KG.general;
  return Math.round(kg * perKg);
}

/** Eiweiß (g/Tag) und Fettanteil für die gewählte Ausrichtung; eigene Werte werden in den Rahmen gesetzt. */
export function macroSettings(choice: MacroChoice, kg: number, goal: Goal, gymDays: number): { protein: number; fatShare: number } {
  if (choice.profile === 'lean') {
    return { protein: Math.round(kg * (goal === 'abnehmen' ? LEAN.cutProteinPerKg : LEAN.proteinPerKg)), fatShare: LEAN.fatShare };
  }
  if (choice.profile === 'eigen') {
    const perKg = Math.min(PROTEIN_PER_KG_RANGE.max, Math.max(PROTEIN_PER_KG_RANGE.min, choice.proteinPerKg));
    return { protein: Math.round(kg * perKg), fatShare: Math.min(FAT_SHARE_MAX, Math.max(FAT_SHARE_MIN, choice.fatShare)) };
  }
  return { protein: proteinTarget(kg, goal, gymDays), fatShare: FAT_SHARE };
}

/**
 * Makros für ein Kalorienziel bei festem Eiweiß und Ballaststoffen: Fett 30 %, Kohlenhydrate der Rest. Reicht der Rest
 * nicht, sinkt Fett bis 20 %; Kohlenhydrate nie negativ.
 */
export function macrosFor(kcal: number, protein: number, fiber = FIBER_MIN_G, fatShare = FAT_SHARE): Macros {
  let fat = (kcal * Math.min(FAT_SHARE_MAX, Math.max(FAT_SHARE_MIN, fatShare))) / 9;
  let carbs = (kcal - protein * 4 - fat * 9) / 4;
  if (carbs < 0) {
    fat = Math.max((kcal * FAT_SHARE_MIN) / 9, (kcal - protein * 4) / 9);
    carbs = Math.max(0, (kcal - protein * 4 - fat * 9) / 4);
  }
  return { protein, fat: Math.round(fat), carbs: Math.round(carbs), fiber };
}

/** Trainings- und Ruhetagsziel bei gleichem Wochenschnitt; Ruhetag nie unter der Untergrenze. */
export function daySplit(kcal: number, trainingDays: number, floor: number): { training: number; rest: number } {
  const n = Math.min(7, Math.max(0, Math.round(trainingDays)));
  if (n === 0 || n === 7) return { training: kcal, rest: kcal };
  let bonus = TRAINING_DAY_BONUS;
  let minus = (bonus * n) / (7 - n);
  if (minus > REST_DAY_MAX_MINUS) {
    minus = REST_DAY_MAX_MINUS;
    bonus = (minus * (7 - n)) / n;
  }
  if (kcal - minus < floor) {
    minus = Math.max(0, kcal - floor);
    bonus = (minus * (7 - n)) / n;
  }
  return { training: round10(kcal + bonus), rest: round10(kcal - minus) };
}

/** Gespeichertes Ziel (Kalorien im Schnitt, optional mit Makros und Aufteilung). */
export type GoalPlan = {
  kcal: number;
  trainingKcal: number | null;
  restKcal: number | null;
  /** 1 = Montag … 7 = Sonntag. */
  trainingWeekdays: number[] | null;
  macros: Macros | null;
};

/** Wochentag 1 (Montag) bis 7 (Sonntag) eines Tages YYYY-MM-DD. */
export function isoWeekday(day: string): number {
  const d = new Date(`${day}T12:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

export type DayTarget = { kcal: number; trainingDay: boolean | null; macros: Macros | null };

/** Ziel für einen bestimmten Tag: an Trainingstagen mehr, sonst weniger; der Unterschied geht über Kohlenhydrate. */
export function dayTarget(plan: GoalPlan, day: string): DayTarget {
  const split = plan.trainingKcal !== null && plan.restKcal !== null && plan.trainingWeekdays !== null;
  if (!split) return { kcal: plan.kcal, trainingDay: null, macros: plan.macros };
  const trainingDay = plan.trainingWeekdays!.includes(isoWeekday(day));
  const kcal = trainingDay ? plan.trainingKcal! : plan.restKcal!;
  const macros = plan.macros ? { ...plan.macros, carbs: Math.max(0, Math.round(plan.macros.carbs + (kcal - plan.kcal) / 4)) } : null;
  return { kcal, trainingDay, macros };
}

/** Vollständiges Ziel aus dem Tagesschnitt (C3–C5). Ohne Aufteilung gilt jeder Tag gleich. */
export function buildPlan(
  kcal: number,
  protein: number,
  trainingWeekdays: number[],
  floor: number,
  split: boolean,
  fatShare = FAT_SHARE
): GoalPlan {
  const days = [...new Set(trainingWeekdays)].filter((d) => d >= 1 && d <= 7).sort();
  const { training, rest } = daySplit(kcal, days.length, floor);
  const withSplit = split && days.length > 0 && days.length < 7;
  return {
    kcal,
    trainingKcal: withSplit ? training : null,
    restKcal: withSplit ? rest : null,
    trainingWeekdays: withSplit ? days : null,
    macros: macrosFor(kcal, protein, FIBER_MIN_G, fatShare),
  };
}

/** Neues Kalorienziel (z. B. aus dem Check-in): Eiweiß, Ballaststoffe und Trainingstage bleiben, der Rest passt sich an. */
export function rescalePlan(plan: GoalPlan, kcal: number, floor = CALORIE_FLOOR): GoalPlan {
  if (!plan.macros) return { ...plan, kcal, trainingKcal: null, restKcal: null, trainingWeekdays: null };
  // Fettanteil des bisherigen Ziels übernehmen (z. B. „Lean“ 20 %), damit die Ausrichtung erhalten bleibt.
  const fatShare = Math.round(((plan.macros.fat * 9) / plan.kcal) * 100) / 100;
  return buildPlan(kcal, plan.macros.protein, plan.trainingWeekdays ?? [], floor, plan.trainingWeekdays !== null, fatShare);
}

/** Lohnt eine neue Berechnung? Schritte im Schnitt ±2000 oder Gym-Tage ±2 gegenüber der Einrichtung (C9). */
export function needsRecalc(setupSteps: number | null, stepsAvg: number | null, setupGym: number, gymPerWeek: number | null): boolean {
  const steps = setupSteps !== null && stepsAvg !== null && Math.abs(stepsAvg - setupSteps) >= 2000;
  const gym = gymPerWeek !== null && Math.abs(gymPerWeek - setupGym) >= 2;
  return steps || gym;
}

// ------------------------------------------------------------------------------- Tipps (C8)

export type TipContext = {
  target: DayTarget | null;
  eaten: { kcal: number; protein: number; fiber: number };
  drinksMl: number;
  drinkGoalMl: number | null;
  hour: number;
  sleepHours: number | null;
  hideNumbers: boolean;
};

export type Tip =
  | { key: 'eiweissOffen'; grams: number }
  | { key: 'ballaststoffeOffen'; grams: number }
  | { key: 'trainingstag' }
  | { key: 'ruhetag' }
  | { key: 'trinken' }
  | { key: 'schlafKurz' }
  | { key: 'ueberZiel' }
  | { key: 'allesGut' };

/** Tipps nur auf Wunsch (Entscheidung Luc): kurz, ohne Druck, nie Aufforderung zu „mehr“ nach Zielerreichung. */
export function dailyTips(ctx: TipContext): Tip[] {
  const tips: Tip[] = [];
  const macros = ctx.target?.macros ?? null;
  if (!ctx.hideNumbers && macros) {
    const protein = Math.round(macros.protein - ctx.eaten.protein);
    if (protein >= 30) tips.push({ key: 'eiweissOffen', grams: protein });
    const fiber = Math.round(macros.fiber - ctx.eaten.fiber);
    if (fiber >= 10) tips.push({ key: 'ballaststoffeOffen', grams: fiber });
  }
  if (ctx.target?.trainingDay === true) tips.push({ key: 'trainingstag' });
  if (ctx.target?.trainingDay === false) tips.push({ key: 'ruhetag' });
  if (ctx.drinkGoalMl !== null && ctx.hour >= 15 && ctx.drinksMl < ctx.drinkGoalMl / 2) tips.push({ key: 'trinken' });
  if (ctx.sleepHours !== null && ctx.sleepHours < 6) tips.push({ key: 'schlafKurz' });
  if (!ctx.hideNumbers && ctx.target && ctx.eaten.kcal > ctx.target.kcal + 200) tips.push({ key: 'ueberZiel' });
  return tips.length > 0 ? tips : [{ key: 'allesGut' }];
}
