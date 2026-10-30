// Körpermaße (Register GOAL-004). Gespeichert in cm, angezeigt in der gewählten Einheit.

export const MEASURE_SITES = ['taille', 'huefte', 'brust', 'arm', 'oberschenkel'] as const;
export type MeasureSite = (typeof MEASURE_SITES)[number];

export type Measurement = { id: string; day: string; site: MeasureSite; cm: number };

/** Letzter und vorletzter Wert je Stelle (Liste absteigend nach Tag erwartet). */
export function latestBySite(list: Measurement[]) {
  const result: Partial<Record<MeasureSite, { latest: Measurement; previous: Measurement | null }>> = {};
  for (const m of list) {
    const entry = result[m.site];
    if (!entry) result[m.site] = { latest: m, previous: null };
    else if (!entry.previous) entry.previous = m;
  }
  return result;
}
