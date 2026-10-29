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
