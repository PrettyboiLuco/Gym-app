// Schritte (Register HEALTH-001–007). Quellen werden nie blind addiert: pro Tag gilt Apple Health, falls
// vorhanden, sonst der eigene Eintrag (HEALTH-005). Schritte erhöhen das Kalorienziel nicht – sie stecken
// schon in der Aktivitätsstufe (HEALTH-007).

export type StepSource = 'manuell' | 'apple_health';
export type StepEntry = { id: string; day: string; steps: number; source: StepSource; fetchedAt: string };

export const STEP_RANGE = { min: 0, max: 100000 } as const;

/** Schrittzahl eines Tages: neueste Apple-Health-Abfrage, sonst neuester eigener Eintrag. */
export function stepsForDay(entries: StepEntry[], day: string): { steps: number; source: StepSource } | null {
  const sameDay = entries.filter((e) => e.day === day);
  const pick = (source: StepSource) =>
    sameDay.filter((e) => e.source === source).sort((a, b) => (a.fetchedAt < b.fetchedAt ? 1 : -1))[0];
  const chosen = pick('apple_health') ?? pick('manuell');
  return chosen ? { steps: chosen.steps, source: chosen.source } : null;
}

/** Tage, an denen das Schrittziel erreicht wurde (für die Gewohnheit „Schritte“). */
export function stepGoalDays(entries: StepEntry[], target: number): string[] {
  const days = [...new Set(entries.map((e) => e.day))];
  return days.filter((d) => (stepsForDay(entries, d)?.steps ?? 0) >= target);
}

/** Durchschnitt über Tage mit Wert (Tage ohne Eintrag zählen nicht als 0). */
export function stepsAverage(entries: StepEntry[], days: string[]): number | null {
  const values = days.map((d) => stepsForDay(entries, d)?.steps).filter((v): v is number => v !== undefined);
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;
}

export function parseSteps(input: string): number | null {
  const text = input.trim().replace(/[.\s]/g, '');
  if (!/^\d{1,6}$/.test(text)) return null;
  const n = Number(text);
  return n >= STEP_RANGE.min && n <= STEP_RANGE.max ? n : null;
}
