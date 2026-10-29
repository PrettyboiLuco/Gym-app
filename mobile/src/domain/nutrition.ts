// Nährwertrechnung (Register FOOD-002, FOOD-011, FOOD-017; Referenztests T-001 bis T-009).
// Ein fehlender Nährwert bleibt unbekannt (null) und wird nie als 0 behandelt.

export type NutrientBasis = 'g' | 'ml';

/** Nährwert für eine Menge aus einem Wert pro 100 g bzw. 100 ml. */
export function nutrientForAmount(
  valuePer100: number | null,
  amount: number,
  basis: NutrientBasis = 'g',
  unit: NutrientBasis = 'g'
): number | null {
  if (amount < 0) throw new Error('negative amount');
  if (basis !== unit) throw new Error('density required');
  return valuePer100 === null ? null : (valuePer100 * amount) / 100;
}

/** Portion eines Rezepts: Gesamtwert × Portionsgewicht / Endgewicht nach dem Kochen. */
export function recipePortion(total: number, endWeight: number | null, portion: number): number {
  if (endWeight === null || endWeight <= 0) throw new Error('end weight required');
  return (total * portion) / endWeight;
}
