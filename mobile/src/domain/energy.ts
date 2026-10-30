// Kalorienrechner und Tagesübersicht (Register CALC-001–005, TRACK-001–003, COACH-002/003).
// Alle Zahlen sind Schätzungen. Aktivitätsfaktoren und Untergrenzen sind noch nicht fachlich
// freigegeben und werden deshalb von außen übergeben statt hier festgelegt.

export type FormulaTerm = '+5' | '-161';
export type Goal = 'halten' | 'abnehmen' | 'zunehmen';

const SEX_TERM: Record<FormulaTerm, number> = { '+5': 5, '-161': -161 };

/** Mifflin-St Jeor validiert für gesunde Erwachsene von 19 bis 78 Jahren [web:106]. */
export const POPULATION_AGE = { min: 19, max: 78 } as const;

/** Ruheenergie nach Mifflin-St Jeor in kcal. */
export function restingEnergy(kg: number, cm: number, age: number, term: FormulaTerm): number {
  if (!(term in SEX_TERM)) throw new Error('unknown formula term');
  if (kg <= 0 || cm <= 0) throw new Error('invalid body data');
  if (age < POPULATION_AGE.min || age > POPULATION_AGE.max) {
    throw new Error('outside validated population');
  }
  return 10 * kg + 6.25 * cm - 5 * age + SEX_TERM[term];
}

/** Tagesbedarf-Schätzung: Ruheenergie × Aktivitätsfaktor aus einer dokumentierten Tabelle. */
export function energyEstimate(
  resting: number,
  level: string,
  activityTable: Record<string, number>
): number {
  const factor = activityTable[level];
  if (factor === undefined) throw new Error('unknown activity level');
  return resting * factor;
}

export type TargetResult = { status: 'vorschlag'; kcal: number } | { status: 'fachpruefung' };

/** Zielvorschlag; unterhalb der Untergrenze gibt es keine Zahl, sondern einen Prüfhinweis. */
export function calorieTarget(
  estimate: number,
  goal: Goal,
  delta: number,
  floor: number
): TargetResult {
  if (goal === 'halten' && delta !== 0) throw new Error('maintain requires zero delta');
  if (goal === 'abnehmen' && delta >= 0) throw new Error('loss requires deficit');
  if (goal === 'zunehmen' && delta <= 0) throw new Error('gain requires surplus');
  const kcal = estimate + delta;
  return kcal < floor ? { status: 'fachpruefung' } : { status: 'vorschlag', kcal };
}

export type DaySummary = { eaten: number; remaining: number; incomplete: boolean };

/**
 * Tagesübersicht aus den Kalorien der Einträge. Unbekannte Werte (null) zählen nicht als 0,
 * sondern markieren den Tag als unvollständig. Training wird nicht zusätzlich gutgeschrieben.
 */
export function daySummary(entryKcal: (number | null)[], goalKcal: number): DaySummary {
  const known = entryKcal.filter((k): k is number => k !== null);
  const eaten = known.reduce((sum, k) => sum + k, 0);
  return { eaten, remaining: goalKcal - eaten, incomplete: known.length !== entryKcal.length };
}

// ---------------------------------------------------------------------------------------------
// Vorläufige Parameter (Register CALC-003–005, COACH-005, GOAL-007). Alle Werte sind Kandidaten
// bis zur fachlichen Prüfung (Fahrplan 10.1) und stehen deshalb gesammelt an dieser einen Stelle.

/**
 * Eine Tabelle: PAL-Stufen nach DGE (Mitte der Spannen 1,4–1,5 · 1,6–1,7 · 1,8–1,9 · 2,0–2,4).
 * Primärquelle in diesem Durchlauf nicht abgerufen, nur Sekundärquellen (CALC-003).
 */
export const ACTIVITY_LEVELS = {
  sitzend: 1.45,
  sitzend_bewegt: 1.65,
  stehend_gehend: 1.85,
  koerperlich_schwer: 2.2,
} as const;
export type ActivityLevel = keyof typeof ACTIVITY_LEVELS;
export const ACTIVITY_KEYS = Object.keys(ACTIVITY_LEVELS) as ActivityLevel[];

/** Zuschlag für Sport 4–5× pro Woche je 30–60 min. Teil derselben Tabelle, keine zweite Gutschrift. */
export const SPORT_PAL = 0.3;

/** Erlaubte Abstände zum geschätzten Bedarf je Ziel (CALC-004, nicht freigegeben). */
export const DELTA_OPTIONS: Record<Goal, readonly number[]> = {
  abnehmen: [-250, -500],
  halten: [0],
  zunehmen: [250, 500],
};

/** Feste Untergrenze in kcal; zusätzlich nie unter der geschätzten Ruheenergie (CALC-005). */
export const CALORIE_FLOOR = 1200;

/** WHO-Grenze für Untergewicht bei Erwachsenen (BMI). Schwelle für die App fachlich offen (GOAL-007). */
export const UNDERWEIGHT_BMI = 18.5;

/** Eiweiß in g je kg Körpergewicht: allgemein (DGE, Erwachsene) und bei regelmäßigem Sport (COACH-005). */
export const PROTEIN_PER_KG = { general: 0.8, sportMin: 1.2, sportMax: 2.0 } as const;

// ---------------------------------------------------------------------------------------------

export function bmi(kg: number, cm: number): number {
  const m = cm / 100;
  return kg / (m * m);
}

/** Gewicht, ab dem der BMI unter die Untergewichtsgrenze fällt. */
export function underweightLimitKg(cm: number): number {
  const m = cm / 100;
  return UNDERWEIGHT_BMI * m * m;
}

/** Eiweiß als Bereich, keine erfundene Komplettverteilung der Makros (COACH-005). */
export function proteinRange(kg: number, sport: boolean): { min: number; max: number } {
  return sport
    ? { min: kg * PROTEIN_PER_KG.sportMin, max: kg * PROTEIN_PER_KG.sportMax }
    : { min: kg * PROTEIN_PER_KG.general, max: kg * PROTEIN_PER_KG.general };
}

export type CalculatorInput = {
  weightKg: number | null;
  heightCm: number | null;
  age: number | null;
  term: FormulaTerm | null;
  activity: ActivityLevel | null;
  sport: boolean;
  goal: Goal;
  delta: number;
  /** Sensible Situation laut Erststart/Profil (COACH-010). */
  sensitive: boolean;
};

export type MissingInput = 'weight' | 'height' | 'age' | 'term' | 'activity';

export type CalculatorResult =
  | { status: 'fehlt'; missing: MissingInput[] }
  | { status: 'sensibel' }
  | { status: 'alter' }
  | { status: 'untergewicht' }
  | { status: 'fachpruefung'; resting: number; factor: number; estimate: number }
  | {
      status: 'vorschlag';
      resting: number;
      factor: number;
      estimate: number;
      kcal: number;
      protein: { min: number; max: number };
      /** BMI unter der Grenze bei „halten“/„zunehmen“: Zahl ja, aber mit Hinweis. */
      lowBmi: boolean;
    };

/**
 * Der ganze Rechner in einem Schritt. Gibt nur dann eine Zahl aus, wenn alle Eingaben da sind,
 * die Person in der Studienpopulation liegt, keine sensible Situation angegeben ist und das
 * Ergebnis nicht unter der Untergrenze liegt. Ergebnis auf 10 kcal gerundet (keine Scheingenauigkeit).
 */
export function calculate(input: CalculatorInput): CalculatorResult {
  if (input.sensitive) return { status: 'sensibel' };
  const missing: MissingInput[] = [];
  if (input.weightKg === null) missing.push('weight');
  if (input.heightCm === null) missing.push('height');
  if (input.age === null) missing.push('age');
  if (input.term === null) missing.push('term');
  if (input.activity === null) missing.push('activity');
  if (missing.length > 0) return { status: 'fehlt', missing };
  const kg = input.weightKg!;
  const cm = input.heightCm!;
  const age = input.age!;
  if (age < POPULATION_AGE.min || age > POPULATION_AGE.max) return { status: 'alter' };
  const lowBmi = bmi(kg, cm) < UNDERWEIGHT_BMI;
  if (lowBmi && input.goal === 'abnehmen') return { status: 'untergewicht' };
  if (!DELTA_OPTIONS[input.goal].includes(input.delta)) throw new Error('delta not allowed');

  const resting = restingEnergy(kg, cm, age, input.term!);
  const factor = ACTIVITY_LEVELS[input.activity!] + (input.sport ? SPORT_PAL : 0);
  const estimate = energyEstimate(resting, 'x', { x: factor });
  const floor = Math.max(CALORIE_FLOOR, resting);
  const target = calorieTarget(estimate, input.goal, input.delta, floor);
  if (target.status === 'fachpruefung') return { status: 'fachpruefung', resting, factor, estimate };
  // Runden darf nicht unter die Untergrenze führen.
  const rounded = Math.round(target.kcal / 10) * 10;
  return {
    status: 'vorschlag',
    resting,
    factor,
    estimate,
    kcal: rounded < floor ? Math.ceil(floor / 10) * 10 : rounded,
    protein: proteinRange(kg, input.sport),
    lowBmi,
  };
}
